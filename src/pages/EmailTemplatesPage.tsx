/**
 * Email Templates Page
 * Manage email templates for campaigns and transactional emails
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../context/theme'
import { API_CONFIG, getTenantHeaders } from '../config/api'
import { useNavigate } from 'react-router-dom'
import {
  Mail,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  FileText,
  Filter
} from 'lucide-react'
import Toast from '../components/Toast'

interface EmailTemplate {
  id: number
  template_key: string
  name: string
  description?: string
  category: 'transactional' | 'marketing' | 'notification' | 'system' | 'custom'
  subject: string
  source_model?: string
  is_active: boolean
  is_system: boolean
  version: number
  created_at: string
  updated_at: string
}

export default function EmailTemplatesPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const navigate = useNavigate()
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [menuOpen, setMenuOpen] = useState<number | null>(null)
  const [toast, setToast] = useState<{ text: string; state: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/mailer/templates`, {
        headers: getTenantHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setTemplates(data || [])
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
      showToast('Failed to load templates', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm(t('Are you sure you want to delete this template?'))) return
    
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/mailer/templates/${id}`, {
        method: 'DELETE',
        headers: getTenantHeaders()
      })
      
      if (response.ok) {
        showToast('Template deleted successfully', 'success')
        loadTemplates()
      } else {
        showToast('Failed to delete template', 'error')
      }
    } catch (error) {
      showToast('Failed to delete template', 'error')
    }
    setMenuOpen(null)
  }

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/mailer/templates/${template.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify({
          template_key: `${template.template_key}_copy_${Date.now()}`
        })
      })
      
      if (response.ok) {
        showToast('Template duplicated successfully', 'success')
        loadTemplates()
      } else {
        showToast('Failed to duplicate template', 'error')
      }
    } catch (error) {
      showToast('Failed to duplicate template', 'error')
    }
    setMenuOpen(null)
  }

  const showToast = (text: string, state: 'success' | 'error') => {
    setToast({ text, state })
  }

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.template_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.subject.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }, [templates, searchQuery, selectedCategory])

  const categories = ['transactional', 'marketing', 'notification', 'system', 'custom']

  return (
    <div className="min-h-screen p-8 font-space" style={{ backgroundColor: colors.background, color: colors.textPrimary }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">Email Templates</h1>
            <p className="text-lg opacity-80" style={{ color: colors.textSecondary }}>
              Create and manage email templates for your campaigns and notifications
            </p>
          </div>
          
          <button
            onClick={() => navigate('/email-templates/create')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: colors.action }}
          >
            <Plus size={20} />
            Create Template
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all"
              style={{ 
                backgroundColor: colors.card, 
                borderColor: colors.border,
                color: colors.textPrimary 
              }}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap border ${selectedCategory === 'all' ? 'bg-opacity-10' : 'bg-transparent'}`}
              style={{ 
                borderColor: selectedCategory === 'all' ? colors.action : colors.border,
                color: selectedCategory === 'all' ? colors.action : colors.textSecondary,
                backgroundColor: selectedCategory === 'all' ? `${colors.action}15` : 'transparent'
              }}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap border ${selectedCategory === cat ? 'bg-opacity-10' : 'bg-transparent'}`}
                style={{ 
                  borderColor: selectedCategory === cat ? colors.action : colors.border,
                  color: selectedCategory === cat ? colors.action : colors.textSecondary,
                  backgroundColor: selectedCategory === cat ? `${colors.action}15` : 'transparent'
                }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: colors.action, borderTopColor: 'transparent' }} />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20 opacity-60">
            <Mail size={48} className="mx-auto mb-4" />
            <p className="text-lg">No templates found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="group relative rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                style={{ 
                  backgroundColor: colors.card,
                  borderColor: colors.border
                }}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${colors.action}15` }}
                    >
                      <Mail size={24} style={{ color: colors.action }} />
                    </div>
                    
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === template.id ? null : template.id)}
                        className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                      >
                        <MoreVertical size={20} style={{ color: colors.textSecondary }} />
                      </button>
                      
                      {menuOpen === template.id && (
                        <div 
                          className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl z-10 overflow-hidden border"
                          style={{ backgroundColor: colors.card, borderColor: colors.border }}
                        >
                          <button
                            onClick={() => navigate(`/email-templates/${template.id}`)}
                            className="w-full text-left px-4 py-3 text-sm flex items-center gap-2 hover:bg-black/5"
                            style={{ color: colors.textPrimary }}
                          >
                            <Edit size={16} /> Edit
                          </button>
                          <button
                            onClick={() => handleDuplicateTemplate(template)}
                            className="w-full text-left px-4 py-3 text-sm flex items-center gap-2 hover:bg-black/5"
                            style={{ color: colors.textPrimary }}
                          >
                            <Copy size={16} /> Duplicate
                          </button>
                          {!template.is_system && (
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="w-full text-left px-4 py-3 text-sm flex items-center gap-2 hover:bg-red-50 text-red-500"
                            >
                              <Trash2 size={16} /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold mb-1 truncate" style={{ color: colors.textPrimary }}>
                    {template.name}
                  </h3>
                  <p className="text-sm opacity-70 mb-4 truncate" style={{ color: colors.textSecondary }}>
                    {template.subject}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800" style={{ color: colors.textSecondary }}>
                      {template.category}
                    </span>
                    {template.source_model && (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                        {template.source_model}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t text-xs" style={{ borderColor: colors.border }}>
                    <div className="flex items-center gap-1.5">
                      {template.is_active ? (
                        <>
                          <CheckCircle2 size={14} className="text-green-500" />
                          <span className="text-green-600 font-medium">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={14} className="text-red-500" />
                          <span className="text-red-600 font-medium">Inactive</span>
                        </>
                      )}
                    </div>
                    <span style={{ color: colors.textSecondary }}>v{template.version}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Click outside handler for menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />
      )}

      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
    </div>
  )
}
