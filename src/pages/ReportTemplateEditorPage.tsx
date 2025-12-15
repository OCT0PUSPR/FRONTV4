"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { API_CONFIG, getTenantHeaders } from "../config/api"
import {
  Save, ArrowLeft, Eye, Plus, Trash2, ChevronDown, ChevronRight, ChevronUp,
  Layout, Type, Image as ImageIcon, Table as TableIcon,
  Building2, FileText, Settings, ZoomIn, ZoomOut, X, Check,
  MoveUp, MoveDown, ArrowLeftRight, Database
} from "lucide-react"
import Toast from "../components/Toast"
import { useNavigate, useParams } from "react-router-dom"
import "./DynamicRecordPage.css"

// Types
interface ModelField {
  id: number
  field_name: string
  field_label: string
  field_type: string
  model_name: string
  relation?: string
  relation_field?: string
}

interface TemplateData {
  template_key: string
  template_name: string
  description: string
  category_id: number | null
  report_type: string
  source_model: string
  template_html: string
  page_size: string
  page_orientation: string
  margin_top: number
  margin_right: number
  margin_bottom: number
  margin_left: number
  is_default: boolean
  layout_config: LayoutConfig
}

interface LayoutConfig {
  companyInfoPosition: 'left' | 'right'
  headerLeftFields: string[]
  headerRightFields: string[]
  lineTables: LineTableConfig[]
  reportTable?: ReportTableConfig
}

interface LineTableConfig {
  id: string
  fieldName: string
  fieldLabel: string
  relationModel: string
  columns: TableColumn[]
}

interface ReportTableConfig {
  columns: TableColumn[]
}

interface TableColumn {
  id: string
  fieldName: string
  fieldLabel: string
  width?: string
}

interface AvailableModel {
  model_name: string
  label?: string
}

const REPORT_TYPES = [
  { value: 'receipt', label: 'Receipt' },
  { value: 'delivery', label: 'Delivery Note' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'picking', label: 'Picking Slip' },
  { value: 'custom', label: 'Custom' },
]

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

const defaultLayoutConfig: LayoutConfig = {
  companyInfoPosition: 'left',
  headerLeftFields: [],
  headerRightFields: [],
  lineTables: [],
  reportTable: undefined
}

export default function ReportTemplateEditorPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'design' | 'preview' | 'settings'>('design')
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [zoom, setZoom] = useState(1)

  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelFields, setModelFields] = useState<ModelField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [relationFields, setRelationFields] = useState<Record<string, ModelField[]>>({})

  const [template, setTemplate] = useState<TemplateData>({
    template_key: '',
    template_name: '',
    description: '',
    category_id: null,
    report_type: 'custom',
    source_model: '',
    template_html: '',
    page_size: 'A4',
    page_orientation: 'portrait',
    margin_top: 20,
    margin_right: 15,
    margin_bottom: 20,
    margin_left: 15,
    is_default: false,
    layout_config: defaultLayoutConfig
  })

  useEffect(() => {
    loadAvailableModels()
    if (isEditing) {
      loadTemplate()
    }
  }, [id])

  useEffect(() => {
    if (template.source_model) {
      loadModelFields(template.source_model)
    }
  }, [template.source_model])

  const getHeaders = () => getTenantHeaders()
  const showToast = (text: string, state: "success" | "error") => setToast({ text, state })

  const loadTemplate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/templates/${id}`, { headers: getHeaders() })
      const data = await res.json()
      if (data.success && data.template) {
        const templateData = data.template
        // Ensure layout_config exists, merge with defaults if partial
        const layoutConfig = templateData.layout_config || defaultLayoutConfig
        setTemplate({
          ...templateData,
          layout_config: {
            companyInfoPosition: layoutConfig.companyInfoPosition || 'left',
            headerLeftFields: layoutConfig.headerLeftFields || [],
            headerRightFields: layoutConfig.headerRightFields || [],
            lineTables: layoutConfig.lineTables || [],
            reportTable: layoutConfig.reportTable
          }
        })
        if (templateData.source_model) {
          await loadModelFields(templateData.source_model)
        }
      } else {
        showToast("Template not found", "error")
        navigate('/report-templates')
      }
    } catch {
      showToast("Failed to load template", "error")
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableModels = async () => {
    setLoadingModels(true)
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/models`, { headers: getHeaders() })
      const data = await res.json()
      if (data.success && data.data) {
        setAvailableModels(data.data)
      }
    } catch {
      console.error("Failed to load models")
    } finally {
      setLoadingModels(false)
    }
  }

  const loadModelFields = async (modelName: string) => {
    setLoadingFields(true)
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(modelName)}/all`, { headers: getHeaders() })
      const data = await res.json()
      if (data.success && data.fields) {
        setModelFields(data.fields)
        // Load relation fields for one2many fields
        const one2manyFields = data.fields.filter((f: ModelField) => f.field_type === 'one2many')
        for (const field of one2manyFields) {
          if (field.relation) {
            await loadRelationFields(field.relation, field.field_name)
          }
        }
      }
    } catch {
      console.error("Failed to load fields")
    } finally {
      setLoadingFields(false)
    }
  }

  const loadRelationFields = async (relationModel: string, fieldName: string) => {
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(relationModel)}/all`, { headers: getHeaders() })
      const data = await res.json()
      if (data.success && data.fields) {
        setRelationFields(prev => ({
          ...prev,
          [fieldName]: data.fields
        }))
      }
    } catch {
      console.error(`Failed to load relation fields for ${relationModel}`)
    }
  }

  // Generate HTML from layout config
  const generateHtml = useCallback((): string => {
    const config = template.layout_config
    const margins = `padding: ${template.margin_top || 20}mm ${template.margin_right || 15}mm ${template.margin_bottom || 20}mm ${template.margin_left || 15}mm`
    
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      ${margins}
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e5e7eb;
    }
    .company-info {
      flex: 1;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .info-left, .info-right {
      flex: 1;
    }
    .info-right {
      text-align: right;
    }
    .info-item {
      margin-bottom: 8px;
    }
    .info-label {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .info-value {
      font-size: 12px;
      font-weight: 500;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    table th {
      background: #f5f5f5;
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
    }
    table td {
      border: 1px solid #ddd;
      padding: 8px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info" style="order: ${config.companyInfoPosition === 'left' ? '1' : '2'}">
      <div class="company-name">{{company.name}}</div>
      <div>{{company.street}}</div>
      <div>{{company.city}}, {{company.zip}}</div>
      <div>{{company.country}}</div>
    </div>
    <div style="order: ${config.companyInfoPosition === 'left' ? '2' : '1'}; text-align: right;">
      <div style="font-size: 18px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">${template.report_type.toUpperCase()}</div>
      <div class="info-item">
        <div class="info-label">Number</div>
        <div class="info-value">{{record.name}}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Date</div>
        <div class="info-value">{{record.date}}</div>
      </div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-left">
      ${config.headerLeftFields.map(field => `
        <div class="info-item">
          <div class="info-label">${getFieldLabel(field)}</div>
          <div class="info-value">{{record.${field}}}</div>
        </div>
      `).join('')}
    </div>
    <div class="info-right">
      ${config.headerRightFields.map(field => `
        <div class="info-item">
          <div class="info-label">${getFieldLabel(field)}</div>
          <div class="info-value">{{record.${field}}}</div>
        </div>
      `).join('')}
    </div>
  </div>

  ${config.lineTables.map(table => `
    <table>
      <thead>
        <tr>
          ${table.columns.map(col => `<th>${col.fieldLabel}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        {{#each record.${table.fieldName}}}
        <tr>
          ${table.columns.map(col => `<td>{{this.${col.fieldName}}}</td>`).join('')}
        </tr>
        {{/each}}
      </tbody>
    </table>
  `).join('')}

  ${config.reportTable ? `
    <table>
      <thead>
        <tr>
          ${config.reportTable.columns.map(col => `<th>${col.fieldLabel}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          ${config.reportTable.columns.map(col => `<td>{{record.${col.fieldName}}}</td>`).join('')}
        </tr>
      </tbody>
    </table>
  ` : ''}
</body>
</html>`

    return html
  }, [template])

  const getFieldLabel = (fieldName: string): string => {
    const field = modelFields.find(f => f.field_name === fieldName)
    return field?.field_label || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const handleSave = async () => {
    if (!template.template_key || !template.template_name) {
      showToast("Template key and name are required", "error")
      return
    }
    if (!template.source_model) {
      showToast("Please select a source model", "error")
      return
    }
    const html = generateHtml()
    setSaving(true)
    try {
      const url = isEditing
        ? `${API_CONFIG.BACKEND_BASE_URL}/reports/templates/${id}`
        : `${API_CONFIG.BACKEND_BASE_URL}/reports/templates`
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          template_html: html
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast(isEditing ? "Template updated" : "Template created", "success")
        if (!isEditing && data.templateId) {
          navigate(`/report-template-editor/${data.templateId}`)
        }
      } else {
        showToast(data.error || "Failed to save", "error")
      }
    } catch {
      showToast("Failed to save template", "error")
    } finally {
      setSaving(false)
    }
  }

  const updateLayoutConfig = (updates: Partial<LayoutConfig>) => {
    setTemplate({
      ...template,
      layout_config: {
        ...template.layout_config,
        ...updates
      }
    })
  }

  const addLineTable = (field: ModelField) => {
    if (!field.relation) return
    const newTable: LineTableConfig = {
      id: generateId(),
      fieldName: field.field_name,
      fieldLabel: field.field_label || field.field_name,
      relationModel: field.relation,
      columns: []
    }
    updateLayoutConfig({
      lineTables: [...template.layout_config.lineTables, newTable]
    })
    if (!relationFields[field.field_name]) {
      loadRelationFields(field.relation, field.field_name)
    }
  }

  const removeLineTable = (tableId: string) => {
    updateLayoutConfig({
      lineTables: template.layout_config.lineTables.filter(t => t.id !== tableId)
    })
  }

  const updateLineTableColumns = (tableId: string, columns: TableColumn[]) => {
    updateLayoutConfig({
      lineTables: template.layout_config.lineTables.map(t =>
        t.id === tableId ? { ...t, columns } : t
      )
    })
  }

  const toggleReportTable = () => {
    if (template.layout_config.reportTable) {
      updateLayoutConfig({ reportTable: undefined })
    } else {
      updateLayoutConfig({
        reportTable: { columns: [] }
      })
    }
  }

  const updateReportTableColumns = (columns: TableColumn[]) => {
    updateLayoutConfig({
      reportTable: { columns }
    })
  }

  const one2manyFields = modelFields.filter(f => f.field_type === 'one2many')
  const regularFields = modelFields.filter(f => f.field_type !== 'one2many' && !f.field_name.includes('_ids'))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: colors.action, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 56px)', backgroundColor: colors.background, color: colors.textPrimary }}>
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 shrink-0 z-20" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/report-templates')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold">{isEditing ? 'Edit Template' : 'Create Template'}</h1>
            {template.template_name && <p className="text-xs opacity-50">{template.template_name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-lg mr-2" style={{ backgroundColor: colors.mutedBg }}>
            <button
              onClick={() => setActiveTab('design')}
              className={`px-3 py-1.5 rounded text-xs font-bold ${activeTab === 'design' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'opacity-60'}`}
            >
              Design
            </button>
            <button
              onClick={() => { setPreviewHtml(generateHtml()); setActiveTab('preview') }}
              className={`px-3 py-1.5 rounded text-xs font-bold ${activeTab === 'preview' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'opacity-60'}`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded text-xs font-bold ${activeTab === 'settings' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'opacity-60'}`}
            >
              Settings
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: colors.action }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'design' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Model Selection */}
              <div className="rounded-xl p-6" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Select Model
                </h2>
                {loadingModels ? (
                  <div className="text-sm opacity-50">Loading models...</div>
                ) : (
                  <select
                    value={template.source_model}
                    onChange={(e) => {
                      setTemplate({ ...template, source_model: e.target.value })
                      loadModelFields(e.target.value)
                    }}
                    className="premium-input w-full"
                    style={{ color: colors.textPrimary }}
                  >
                    <option value="">-- Select a model --</option>
                    {availableModels.map(m => (
                      <option key={m.model_name} value={m.model_name}>
                        {m.label || m.model_name}
                      </option>
                    ))}
                  </select>
                )}
                {!template.source_model && (
                  <p className="text-sm text-red-500 mt-2">Please select a model to continue</p>
                )}
              </div>

              {template.source_model && (
                <>
                  {/* Company Info Position */}
                  <div className="rounded-xl p-6" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Company Information
                    </h2>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">Position:</span>
                      <button
                        onClick={() => updateLayoutConfig({ companyInfoPosition: 'left' })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          template.layout_config.companyInfoPosition === 'left'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        Left
                      </button>
                      <button
                        onClick={() => updateLayoutConfig({ companyInfoPosition: 'right' })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          template.layout_config.companyInfoPosition === 'right'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        Right
                      </button>
                    </div>
                  </div>

                  {/* Header Fields */}
                  <div className="rounded-xl p-6" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Header Information
                    </h2>
                    <div className="grid grid-cols-2 gap-6">
                      {/* Left Fields */}
                      <div>
                        <h3 className="text-sm font-medium mb-3">Left Section</h3>
                        {loadingFields ? (
                          <div className="text-sm opacity-50">Loading fields...</div>
                        ) : (
                          <div className="space-y-2">
                            {regularFields.slice(0, 10).map(field => {
                              const isSelected = template.layout_config.headerLeftFields.includes(field.field_name)
                              return (
                                <label
                                  key={field.id}
                                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        updateLayoutConfig({
                                          headerLeftFields: [...template.layout_config.headerLeftFields, field.field_name]
                                        })
                                      } else {
                                        updateLayoutConfig({
                                          headerLeftFields: template.layout_config.headerLeftFields.filter(f => f !== field.field_name)
                                        })
                                      }
                                    }}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm">{field.field_label || field.field_name}</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right Fields */}
                      <div>
                        <h3 className="text-sm font-medium mb-3">Right Section</h3>
                        {loadingFields ? (
                          <div className="text-sm opacity-50">Loading fields...</div>
                        ) : (
                          <div className="space-y-2">
                            {regularFields.slice(0, 10).map(field => {
                              const isSelected = template.layout_config.headerRightFields.includes(field.field_name)
                              return (
                                <label
                                  key={field.id}
                                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        updateLayoutConfig({
                                          headerRightFields: [...template.layout_config.headerRightFields, field.field_name]
                                        })
                                      } else {
                                        updateLayoutConfig({
                                          headerRightFields: template.layout_config.headerRightFields.filter(f => f !== field.field_name)
                                        })
                                      }
                                    }}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm">{field.field_label || field.field_name}</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
            </div>
            </div>
          </div>

                  {/* Line Tables */}
                  <div className="rounded-xl p-6" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <TableIcon className="w-5 h-5" />
                        Line Tables
                      </h2>
                    </div>
                    {loadingFields ? (
                      <div className="text-sm opacity-50">Loading fields...</div>
                    ) : (
                      <div className="space-y-4">
                        {one2manyFields.map(field => {
                          const table = template.layout_config.lineTables.find(t => t.fieldName === field.field_name)
                          const relationFieldsList = relationFields[field.field_name] || []
                          return (
                            <div key={field.id} className="border rounded-lg p-4" style={{ borderColor: colors.border }}>
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h3 className="font-medium">{field.field_label || field.field_name}</h3>
                                  <p className="text-xs opacity-50 mt-1">Related to: {field.relation}</p>
                                </div>
                                {!table ? (
              <button
                                    onClick={() => addLineTable(field)}
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                                    Add Table
              </button>
                                ) : (
              <button
                                    onClick={() => removeLineTable(table.id)}
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                                    Remove
              </button>
                                )}
                              </div>
                              {table && (
                                <div className="mt-4 space-y-2">
                                  <label className="block text-sm font-medium mb-2">Select Columns:</label>
                                  {loadingFields ? (
                                    <div className="text-sm opacity-50">Loading columns...</div>
                                  ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                      {relationFieldsList.map(relField => {
                                        const isSelected = table.columns.some(c => c.fieldName === relField.field_name)
                                        return (
                                          <label
                                            key={relField.id}
                                            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  updateLineTableColumns(table.id, [
                                                    ...table.columns,
                                                    {
                                                      id: generateId(),
                                                      fieldName: relField.field_name,
                                                      fieldLabel: relField.field_label || relField.field_name
                                                    }
                                                  ])
                                                } else {
                                                  updateLineTableColumns(
                                                    table.id,
                                                    table.columns.filter(c => c.fieldName !== relField.field_name)
                                                  )
                                                }
                                              }}
                                              className="w-4 h-4"
                                            />
                                            <span className="text-sm">{relField.field_label || relField.field_name}</span>
                                          </label>
                                        )
                                      })}
                                    </div>
                                  )}
                                  {table.columns.length > 0 && (
                                    <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                                      <p className="text-xs font-medium mb-2">Selected Columns:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {table.columns.map(col => (
                                          <span
                                            key={col.id}
                                            className="px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                          >
                                            {col.fieldLabel}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {one2manyFields.length === 0 && (
                          <p className="text-sm opacity-50">No line fields (one2many) found in this model</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Report Table */}
                  <div className="rounded-xl p-6" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <TableIcon className="w-5 h-5" />
                        Report Table
                      </h2>
              <button
                        onClick={toggleReportTable}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          template.layout_config.reportTable
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {template.layout_config.reportTable ? 'Remove Table' : 'Add Table'}
              </button>
            </div>
                    {template.layout_config.reportTable && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium mb-2">Select Columns:</label>
                        {loadingFields ? (
                          <div className="text-sm opacity-50">Loading columns...</div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {regularFields.map(field => {
                              const isSelected = template.layout_config.reportTable?.columns.some(c => c.fieldName === field.field_name)
                              return (
                                <label
                                  key={field.id}
                                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!isSelected}
                                    onChange={(e) => {
                                      const currentColumns = template.layout_config.reportTable?.columns || []
                                      if (e.target.checked) {
                                        updateReportTableColumns([
                                          ...currentColumns,
                                          {
                                            id: generateId(),
                                            fieldName: field.field_name,
                                            fieldLabel: field.field_label || field.field_name
                                          }
                                        ])
                                      } else {
                                        updateReportTableColumns(
                                          currentColumns.filter(c => c.fieldName !== field.field_name)
                                        )
                                      }
                                    }}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm">{field.field_label || field.field_name}</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                        {template.layout_config.reportTable.columns.length > 0 && (
                          <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <p className="text-xs font-medium mb-2">Selected Columns:</p>
                            <div className="flex flex-wrap gap-2">
                              {template.layout_config.reportTable.columns.map(col => (
                                <span
                                  key={col.id}
                                  className="px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                >
                                  {col.fieldLabel}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-auto flex flex-col items-center p-6 relative">
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1">
              <button
                onClick={() => setZoom(prev => Math.max(0.25, prev - 0.1))}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="px-3 py-1 text-sm font-medium min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
              <button
                onClick={() => setZoom(1)}
                className="px-3 py-1 text-xs font-medium rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            </div>
            <div className="flex items-center justify-center flex-1" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
              <div className="bg-white shadow-xl" style={{ width: '210mm', minHeight: '297mm' }}>
                <iframe srcDoc={previewHtml} className="w-full h-full min-h-[297mm] border-none" title="Preview" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-xl mx-auto space-y-6">
              <div className="rounded-xl p-5" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5 opacity-70">Template Key *</label>
                      <input
                        type="text"
                        value={template.template_key}
                        onChange={(e) => setTemplate({ ...template, template_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        className="premium-input w-full"
                        style={{ color: colors.textPrimary }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 opacity-70">Template Name *</label>
                      <input
                        type="text"
                        value={template.template_name}
                        onChange={(e) => setTemplate({ ...template, template_name: e.target.value })}
                        className="premium-input w-full"
                        style={{ color: colors.textPrimary }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Description</label>
                    <textarea
                      value={template.description}
                      onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                      rows={2}
                      className="premium-input w-full resize-none"
                      style={{ color: colors.textPrimary }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5 opacity-70">Report Type</label>
                      <select
                        value={template.report_type}
                        onChange={(e) => setTemplate({ ...template, report_type: e.target.value })}
                        className="premium-input w-full"
                        style={{ color: colors.textPrimary }}
                      >
                        {REPORT_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl p-5" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
                <h3 className="text-lg font-semibold mb-4">Page Settings</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Page Size</label>
                    <select
                      value={template.page_size}
                      onChange={(e) => setTemplate({ ...template, page_size: e.target.value })}
                      className="premium-input w-full"
                      style={{ color: colors.textPrimary }}
                    >
                      {['A4', 'A5', 'Letter', 'Legal'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Orientation</label>
                    <select
                      value={template.page_orientation}
                      onChange={(e) => setTemplate({ ...template, page_orientation: e.target.value })}
                      className="premium-input w-full"
                      style={{ color: colors.textPrimary }}
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Top</label>
                    <input
                      type="number"
                      value={template.margin_top}
                      onChange={(e) => setTemplate({ ...template, margin_top: Number(e.target.value) })}
                      className="premium-input w-full"
                      style={{ color: colors.textPrimary }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Right</label>
                    <input
                      type="number"
                      value={template.margin_right}
                      onChange={(e) => setTemplate({ ...template, margin_right: Number(e.target.value) })}
                      className="premium-input w-full"
                      style={{ color: colors.textPrimary }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Bottom</label>
                    <input
                      type="number"
                      value={template.margin_bottom}
                      onChange={(e) => setTemplate({ ...template, margin_bottom: Number(e.target.value) })}
                      className="premium-input w-full"
                      style={{ color: colors.textPrimary }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Left</label>
                    <input
                      type="number"
                      value={template.margin_left}
                      onChange={(e) => setTemplate({ ...template, margin_left: Number(e.target.value) })}
                      className="premium-input w-full"
                      style={{ color: colors.textPrimary }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
    </div>
  )
}
