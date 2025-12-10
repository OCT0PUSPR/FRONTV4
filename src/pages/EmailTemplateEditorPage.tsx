/**
 * Email Template Editor Page
 * Create and edit email templates with smart field integration
 */

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../context/theme'
import { API_CONFIG, getTenantHeaders } from '../config/api'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Eye,
  Code,
  Layout,
  Search,
  Copy,
  Info,
  Check
} from 'lucide-react'
import { CustomDropdown } from '../components/NewCustomDropdown'
import Toast from '../components/Toast'

interface EmailTemplate {
  id?: number
  template_key: string
  name: string
  description: string
  category: string
  subject: string
  html_content: string
  source_model: string
  is_active: boolean
}

interface SmartField {
  field_name: string
  field_label: string
  field_type: string
  model_name: string
}

export default function EmailTemplateEditorPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [template, setTemplate] = useState<EmailTemplate>({
    template_key: '',
    name: '',
    description: '',
    category: 'custom',
    subject: '',
    html_content: '',
    source_model: '',
    is_active: true
  })
  
  const [models, setModels] = useState<string[]>([])
  const [fields, setFields] = useState<SmartField[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fieldSearch, setFieldSearch] = useState('')
  const [toast, setToast] = useState<{ text: string; state: 'success' | 'error' } | null>(null)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  const editorRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadModels()
    if (id) {
      loadTemplate(parseInt(id))
    }
  }, [id])

  useEffect(() => {
    if (template.source_model) {
      loadFields(template.source_model)
    }
  }, [template.source_model])

  const loadModels = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/models`, {
        headers: getTenantHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setModels(data || [])
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    }
  }

  const loadTemplate = async (templateId: number) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/mailer/templates/${templateId}`, {
        headers: getTenantHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setTemplate(data)
      } else {
        showToast('Failed to load template', 'error')
      }
    } catch (error) {
      showToast('Failed to load template', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadFields = async (modelName: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${modelName}/all`, {
        headers: getTenantHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setFields(data || [])
      }
    } catch (error) {
      console.error('Failed to load fields:', error)
    }
  }

  const handleSave = async () => {
    if (!template.name || !template.subject) {
      showToast('Name and Subject are required', 'error')
      return
    }

    setSaving(true)
    try {
      // Auto-generate key if empty
      const payload = {
        ...template,
        template_key: template.template_key || template.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
      }

      const url = id 
        ? `${API_CONFIG.BACKEND_BASE_URL}/mailer/templates/${id}`
        : `${API_CONFIG.BACKEND_BASE_URL}/mailer/templates`
      
      const method = id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        showToast('Template saved successfully', 'success')
        if (!id) {
          navigate('/email-templates')
        }
      } else {
        const error = await response.json()
        showToast(error.message || 'Failed to save template', 'error')
      }
    } catch (error) {
      showToast('Failed to save template', 'error')
    } finally {
      setSaving(false)
    }
  }

  const insertField = (fieldName: string) => {
    const tag = `{{${fieldName}}}`
    
    // Copy to clipboard
    navigator.clipboard.writeText(tag)
    showToast(`Copied ${tag} to clipboard`, 'success')

    // Try to insert at cursor position
    if (editorRef.current) {
      const start = editorRef.current.selectionStart
      const end = editorRef.current.selectionEnd
      const text = template.html_content
      const newText = text.substring(0, start) + tag + text.substring(end)
      
      setTemplate(prev => ({ ...prev, html_content: newText }))
      
      // Restore cursor position (needs timeout for react render)
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + tag.length
          editorRef.current.focus()
        }
      }, 0)
    }
  }

  const showToast = (text: string, state: 'success' | 'error') => {
    setToast({ text, state })
  }

  const filteredFields = fields.filter(f => 
    f.field_label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
    f.field_name.toLowerCase().includes(fieldSearch.toLowerCase())
  )

  const categories = ['transactional', 'marketing', 'notification', 'system', 'custom']

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen" style={{ backgroundColor: colors.background }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.action }}></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col font-space" style={{ backgroundColor: colors.background, color: colors.textPrimary }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/email-templates')}
            className="p-2 rounded-lg hover:bg-black/5 transition-colors"
          >
            <ArrowLeft size={20} style={{ color: colors.textSecondary }} />
          </button>
          <div>
            <h1 className="text-lg font-bold">{id ? 'Edit Template' : 'New Template'}</h1>
            <p className="text-xs" style={{ color: colors.textSecondary }}>
              {template.source_model ? `Linked to: ${template.source_model}` : 'No model linked'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-lg" style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }}>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'edit' ? 'bg-white shadow-sm' : ''}`}
              style={{ color: activeTab === 'edit' ? colors.textPrimary : colors.textSecondary, backgroundColor: activeTab === 'edit' ? colors.card : 'transparent' }}
            >
              <Code size={14} /> Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'bg-white shadow-sm' : ''}`}
              style={{ color: activeTab === 'preview' ? colors.textPrimary : colors.textSecondary, backgroundColor: activeTab === 'preview' ? colors.card : 'transparent' }}
            >
              <Eye size={14} /> Preview
            </button>
          </div>
          
          <div className="h-6 w-[1px]" style={{ backgroundColor: colors.border }}></div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{ backgroundColor: colors.action }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-6">
          {/* Metadata Card */}
          <div className="p-6 rounded-2xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: colors.textPrimary }}>Template Name</label>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                  placeholder="e.g., Welcome Email"
                  style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: colors.textPrimary }}>Template Key (Unique)</label>
                <input
                  type="text"
                  value={template.template_key}
                  onChange={(e) => setTemplate(prev => ({ ...prev, template_key: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 font-mono"
                  placeholder="e.g., welcome_email_v1"
                  style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: colors.textPrimary }}>Category</label>
                <CustomDropdown
                  label=""
                  values={categories}
                  type="single"
                  defaultValue={template.category}
                  onChange={(val) => setTemplate(prev => ({ ...prev, category: val as string }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: colors.textPrimary }}>Linked Model</label>
                <CustomDropdown
                  label=""
                  values={models.map(m => `${m}::${m}`)}
                  type="single"
                  defaultValue={template.source_model ? `${template.source_model}::${template.source_model}` : undefined}
                  placeholder="Select a model to enable dynamic fields"
                  onChange={(val) => setTemplate(prev => ({ ...prev, source_model: (val as string).split('::')[0] }))}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2" style={{ color: colors.textPrimary }}>Subject Line</label>
              <input
                type="text"
                value={template.subject}
                onChange={(e) => setTemplate(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                placeholder="e.g., Welcome to {{company.name}}!"
                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }}
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: colors.textPrimary }}>Description</label>
              <textarea
                value={template.description}
                onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 resize-none h-20"
                placeholder="Internal description for this template..."
                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }}
              />
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 rounded-2xl border overflow-hidden flex flex-col" style={{ backgroundColor: colors.card, borderColor: colors.border, minHeight: '500px' }}>
            <div className="px-6 py-3 border-b flex justify-between items-center" style={{ borderColor: colors.border }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>HTML Content</span>
              {activeTab === 'preview' && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Preview Mode</span>
              )}
            </div>
            
            {activeTab === 'edit' ? (
              <textarea
                ref={editorRef}
                value={template.html_content}
                onChange={(e) => setTemplate(prev => ({ ...prev, html_content: e.target.value }))}
                className="flex-1 w-full p-6 font-mono text-sm focus:outline-none resize-none"
                style={{ backgroundColor: colors.background, color: colors.textPrimary }}
                placeholder="<html><body><h1>Hello {{name}}!</h1></body></html>"
              />
            ) : (
              <div className="flex-1 w-full h-full bg-white">
                <iframe
                  srcDoc={template.html_content}
                  className="w-full h-full border-none"
                  title="Preview"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Fields */}
        <div className="w-80 border-l flex flex-col" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
          <div className="p-4 border-b" style={{ borderColor: colors.border }}>
            <h3 className="font-bold mb-1" style={{ color: colors.textPrimary }}>Dynamic Fields</h3>
            <p className="text-xs" style={{ color: colors.textSecondary }}>
              Click to copy field code
            </p>
          </div>

          {!template.source_model ? (
            <div className="p-8 text-center opacity-60">
              <Info size={32} className="mx-auto mb-2" />
              <p className="text-sm">Select a linked model to view available fields</p>
            </div>
          ) : (
            <>
              <div className="p-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="text"
                    placeholder="Filter fields..."
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2"
                    style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredFields.map((field) => (
                  <button
                    key={field.field_name}
                    onClick={() => insertField(field.field_name)}
                    className="w-full text-left p-3 rounded-lg hover:bg-black/5 transition-colors group flex items-start gap-3"
                  >
                    <div className="mt-0.5 p-1 rounded bg-blue-50 text-blue-600">
                      <Code size={12} />
                    </div>
                    <div>
                      <div className="text-xs font-medium" style={{ color: colors.textPrimary }}>
                        {field.field_label}
                      </div>
                      <div className="text-[10px] font-mono opacity-60" style={{ color: colors.textSecondary }}>
                        {`{{${field.field_name}}}`}
                      </div>
                    </div>
                    <Copy size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: colors.textSecondary }} />
                  </button>
                ))}
                
                {filteredFields.length === 0 && (
                  <div className="text-center py-8 opacity-50 text-xs">
                    No fields found
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
    </div>
  )
}
