"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { API_CONFIG, getTenantHeaders } from "../config/api"
import {
  Save, ArrowLeft, Upload, ChevronDown, Plus, Trash2, GripVertical,
  FileText, Settings, Eye, Image as ImageIcon,
  ZoomIn, ZoomOut, Maximize, RotateCcw
} from "lucide-react"
import Toast from "../components/Toast"
import { useNavigate, useParams } from "react-router-dom"
import { SimpleDropdown } from "../components/SimpleDropdown"

interface ModelField {
  id: number
  name: string
  label: string
  type: string
  relation?: {
    model: string
    field?: string
    domain?: any
  }
}

interface TableColumn {
  id: string
  field: string
  label: string
  align: 'left' | 'center' | 'right'
}

interface TemplateConfig {
  template_key: string
  template_name: string
  description: string
  report_type: string
  source_model: string
  page_size: string
  page_orientation: string
  accentColor: string
  logoUrl: string
  documentTitle: string
  companyFields: string[]
  infoLeftTitle: string
  infoLeftFields: string[]
  infoRightFields: { label: string; field: string }[]
  lineItemsField: string
  tableColumns: TableColumn[]
  showTotals: boolean
  subtotalField: string
  taxLabel: string
  taxField: string
  totalLabel: string
  totalField: string
  currencyField: string
  notesTitle: string
  notesField: string
  footerText: string
}

const defaultConfig: TemplateConfig = {
  template_key: '',
  template_name: '',
  description: '',
  report_type: 'receipt',
  source_model: '',
  page_size: 'A4',
  page_orientation: 'portrait',
  accentColor: '#7c3aed',
  logoUrl: '',
  documentTitle: 'RECEIPT',
  companyFields: ['name', 'street', 'city', 'zip'],
  infoLeftTitle: 'Billed To',
  infoLeftFields: [],
  infoRightFields: [
    { label: 'Receipt #', field: 'name' },
    { label: 'Date', field: 'date' }
  ],
  lineItemsField: '',
  tableColumns: [],
  showTotals: true,
  subtotalField: 'amount_untaxed',
  taxLabel: 'Tax',
  taxField: 'amount_tax',
  totalLabel: 'Total',
  totalField: 'amount_total',
  currencyField: 'currency_id.symbol',
  notesTitle: 'Notes',
  notesField: 'note',
  footerText: 'Thank you for your business!'
}

const REPORT_TYPES = [
  { value: 'receipt', label: 'Receipt', title: 'RECEIPT' },
  { value: 'invoice', label: 'Invoice', title: 'INVOICE' },
  { value: 'delivery', label: 'Delivery Note', title: 'DELIVERY NOTE' },
  { value: 'quotation', label: 'Quotation', title: 'QUOTATION' },
  { value: 'purchase', label: 'Purchase Order', title: 'PURCHASE ORDER' },
  { value: 'picking', label: 'Picking Slip', title: 'PICKING SLIP' },
  { value: 'custom', label: 'Custom', title: 'DOCUMENT' },
]

const generateId = () => `_${Math.random().toString(36).substr(2, 9)}`

export default function ReportTemplateEditorPage() {
  const { colors, mode } = useTheme()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [activeTab, setActiveTab] = useState<'design' | 'fields' | 'settings'>('design')
  const [zoom, setZoom] = useState(0.6)

  const [availableModels, setAvailableModels] = useState<{ model_name: string; model_display_name?: string; label?: string; name?: string }[]>([])
  const [modelFields, setModelFields] = useState<ModelField[]>([])
  const [relationFields, setRelationFields] = useState<Record<string, ModelField[]>>({})
  const [loadingFields, setLoadingFields] = useState(false)

  const [config, setConfig] = useState<TemplateConfig>(defaultConfig)

  useEffect(() => {
    loadAvailableModels()
    if (isEditing) loadTemplate()
  }, [id])

  useEffect(() => {
    if (config.source_model) loadModelFields(config.source_model)
  }, [config.source_model])

  const getHeaders = () => getTenantHeaders()
  const showToast = (text: string, state: "success" | "error") => setToast({ text, state })

  const loadTemplate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/templates/${id}`, { headers: getHeaders() })
      const data = await res.json()
      if (data.success && data.template) {
        const t = data.template
        let layoutConfig = {}
        if (t.layout_config) {
          layoutConfig = t.layout_config
        } else if (t.source_domain) {
          try {
            const domain = typeof t.source_domain === 'string' ? JSON.parse(t.source_domain) : t.source_domain
            if (domain.layout_config) layoutConfig = domain.layout_config
          } catch {}
        }
        setConfig({
          ...defaultConfig,
          template_key: t.template_key || '',
          template_name: t.template_name || '',
          description: t.description || '',
          report_type: t.report_type || 'receipt',
          source_model: t.source_model || '',
          page_size: t.page_size || 'A4',
          page_orientation: t.page_orientation || 'portrait',
          ...layoutConfig
        })
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
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/models`, { headers: getHeaders() })
      const data = await res.json()
      if (data.success && data.data) {
        const modelsWithNames = data.data.map((model: { model_name: string; model_display_name?: string }) => {
          const displayName = model.model_display_name || 
            model.model_name
              .split('.')
              .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(' ')
          return {
            ...model,
            label: displayName
          }
        })
        setAvailableModels(modelsWithNames)
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    }
  }

  const loadModelFields = async (modelName: string) => {
    console.log('[ReportTemplateEditor] loadModelFields called for model:', modelName)
    setLoadingFields(true)
    try {
      const url = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(modelName)}/all`
      const res = await fetch(url, { headers: getHeaders() })
      const data = await res.json()
      
      if (data.success && data.data && data.data.fields) {
        const fields = data.data.fields || []
        setModelFields(fields)
        const o2m = fields.filter((f: ModelField) => f.type === 'one2many' && f.relation && f.relation.model)
        for (const field of o2m) {
          await loadRelationFields(field.relation!.model, field.name)
        }
      } else {
        setModelFields([])
      }
    } catch (error) {
      console.error('[ReportTemplateEditor] Failed to load model fields:', error)
      setModelFields([])
    }
    setLoadingFields(false)
  }

  const loadRelationFields = async (relationModel: string, fieldName: string) => {
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(relationModel)}/all`, { headers: getHeaders() })
      const data = await res.json()
      if (data.success && data.data && data.data.fields) {
        setRelationFields(prev => ({ ...prev, [fieldName]: data.data.fields }))
      }
    } catch (error) {
      console.error('[ReportTemplateEditor] Failed to load relation fields for', relationModel, ':', error)
    }
  }

  const handleSave = async () => {
    if (!config.template_key || !config.template_name) {
      showToast("Template key and name are required", "error")
      return
    }
    if (!config.source_model) {
      showToast("Please select a source model", "error")
      return
    }
    
    setSaving(true)
    try {
      const html = generateTemplateHtml()
      const url = isEditing
        ? `${API_CONFIG.BACKEND_BASE_URL}/reports/templates/${id}`
        : `${API_CONFIG.BACKEND_BASE_URL}/reports/templates`
      
      const payload = {
        template_key: config.template_key,
        template_name: config.template_name,
        description: config.description,
        report_type: config.report_type,
        source_model: config.source_model,
        page_size: config.page_size,
        page_orientation: config.page_orientation,
        template_html: html,
        layout_config: {
          accentColor: config.accentColor,
          logoUrl: config.logoUrl,
          documentTitle: config.documentTitle,
          companyFields: config.companyFields,
          infoLeftTitle: config.infoLeftTitle,
          infoLeftFields: config.infoLeftFields,
          infoRightFields: config.infoRightFields,
          lineItemsField: config.lineItemsField,
          tableColumns: config.tableColumns,
          showTotals: config.showTotals,
          subtotalField: config.subtotalField,
          taxLabel: config.taxLabel,
          taxField: config.taxField,
          totalLabel: config.totalLabel,
          totalField: config.totalField,
          currencyField: config.currencyField,
          notesTitle: config.notesTitle,
          notesField: config.notesField,
          footerText: config.footerText
        }
      }
      
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.success) {
        showToast(isEditing ? "Template updated" : "Template created", "success")
        if (!isEditing && data.templateId) navigate(`/report-template-editor/${data.templateId}`)
      } else {
        showToast(data.error || "Failed to save", "error")
      }
    } catch {
      showToast("Failed to save template", "error")
    }
    setSaving(false)
  }

  const regularFields = useMemo(() => {
    return modelFields.filter(f => !['one2many', 'many2many'].includes(f.type))
  }, [modelFields])
  
  const o2mFields = useMemo(() => {
    return modelFields.filter(f => f.type === 'one2many' && f.relation && f.relation.model)
  }, [modelFields])
  
  const lineFields = useMemo(() => {
    return config.lineItemsField ? (relationFields[config.lineItemsField] || []) : []
  }, [config.lineItemsField, relationFields])

  const generateTemplateHtml = useCallback((): string => {
    const c = config
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Space Grotesk', -apple-system, sans-serif; font-size: 11px; line-height: 1.5; color: #1f2937; padding: 40px; background: #fff; }
.container { max-width: 800px; margin: 0 auto; }

/* Header */
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
.company-info h1 { font-size: 20px; font-weight: 700; color: #111; margin-bottom: 4px; }
.company-info p { font-size: 11px; color: #6b7280; line-height: 1.4; }
.logo-box { width: 120px; height: 60px; border: 2px dashed #e5e7eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 10px; }
.logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }

/* Document Title */
.doc-title { text-align: right; margin-bottom: 24px; }
.doc-title h2 { font-size: 32px; font-weight: 700; color: ${c.accentColor}; letter-spacing: 2px; line-height: 1.2; }

/* Info Section */
.info-section { display: flex; justify-content: space-between; margin-bottom: 32px; }
.info-left { flex: 1; }
.info-left h3 { font-size: 10px; font-weight: 600; color: ${c.accentColor}; text-transform: uppercase; margin-bottom: 8px; }
.info-left p { font-size: 12px; color: #374151; line-height: 1.5; }
.info-right { text-align: right; }
.info-right-row { display: flex; justify-content: flex-end; gap: 24px; margin-bottom: 6px; }
.info-right-row .label { font-size: 11px; font-weight: 600; color: ${c.accentColor}; }
.info-right-row .value { font-size: 11px; color: #111; min-width: 80px; }

/* Table */
.items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
.items-table thead tr { background: ${c.accentColor}; }
.items-table th { color: #fff; font-size: 10px; font-weight: 600; text-transform: uppercase; padding: 12px 16px; text-align: left; }
.items-table th.center { text-align: center; }
.items-table th.right { text-align: right; }
.items-table tbody tr { border-bottom: 1px solid #f3f4f6; }
.items-table tbody tr:hover { background: #fafafa; }
.items-table td { padding: 14px 16px; font-size: 11px; color: #374151; }
.items-table td.center { text-align: center; }
.items-table td.right { text-align: right; }

/* Totals */
.totals-section { display: flex; justify-content: flex-end; margin-bottom: 32px; }
.totals-box { width: 280px; }
.totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 11px; border-bottom: 1px solid #f3f4f6; }
.totals-row.total { border-top: 2px solid ${c.accentColor}; border-bottom: none; padding-top: 12px; margin-top: 4px; }
.totals-row.total .label, .totals-row.total .value { font-size: 14px; font-weight: 700; color: ${c.accentColor}; }

/* Notes */
.notes-section { background: #f9fafb; border-radius: 8px; padding: 20px; margin-top: 32px; }
.notes-section h3 { font-size: 11px; font-weight: 700; color: #111; margin-bottom: 8px; }
.notes-section p { font-size: 11px; color: #6b7280; line-height: 1.6; }

/* Footer */
.footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="company-info">
      <h1>{{company.name}}</h1>
      <p>{{company.street}}<br/>{{company.city}}, {{company.zip}}</p>
    </div>
    <div class="logo-box">${c.logoUrl ? `<img src="${c.logoUrl}" alt="Logo"/>` : '<span style="font-size: 12px; color: #9ca3af;">Upload Logo</span>'}</div>
  </div>

  <div class="doc-title">
    <h2>${c.documentTitle.split(' ').join('<br/>')}</h2>
  </div>

  <div class="info-section">
    <div class="info-left">
      <h3>${c.infoLeftTitle}</h3>
      ${c.infoLeftFields.map(f => `<p>{{record.${f}}}</p>`).join('')}
    </div>
    <div class="info-right">
      ${c.infoRightFields.map(f => `
        <div class="info-right-row">
          <span class="label">${f.label}</span>
          <span class="value">{{record.${f.field}}}</span>
        </div>
      `).join('')}
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        ${c.tableColumns.map(col => `<th class="${col.align}">${col.label}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      {{#each record.${c.lineItemsField}}}
      <tr>
        ${c.tableColumns.map(col => `<td class="${col.align}">{{this.${col.field}}}</td>`).join('')}
      </tr>
      {{/each}}
    </tbody>
  </table>

  ${c.showTotals ? `
  <div class="totals-section">
    <div class="totals-box">
      <div class="totals-row">
        <span class="label">Subtotal</span>
        <span class="value">{{record.${c.subtotalField}}}</span>
      </div>
      <div class="totals-row">
        <span class="label">${c.taxLabel}</span>
        <span class="value">{{record.${c.taxField}}}</span>
      </div>
      <div class="totals-row total">
        <span class="label">${c.totalLabel}</span>
        <span class="value">{{record.${c.totalField}}}</span>
      </div>
    </div>
  </div>
  ` : ''}

  ${c.notesField || c.footerText ? `
  <div class="notes-section">
    <h3>${c.notesTitle}</h3>
    <p>${c.footerText}</p>
    ${c.notesField ? `<p>{{record.${c.notesField}}}</p>` : ''}
  </div>
  ` : ''}

  <div class="footer">
    Generated on {{generated_at}} | Page {{page}} of {{pages}}
  </div>
</div>
</body>
</html>`
  }, [config])

  const FieldSelect = ({ value, onChange, fields, placeholder = "Select field..." }: {
    value: string
    onChange: (v: string) => void
    fields: ModelField[]
    placeholder?: string
  }) => {
    const options = fields
      .filter(f => f && f.name)
      .map(f => ({
        value: f.name,
        label: f.label || f.name
      }))
    
    return (
      <div style={{ position: 'relative', zIndex: 1 }}>
        <SimpleDropdown
          value={value}
          onChange={onChange}
          options={options}
          placeholder={options.length === 0 ? 'No fields available' : placeholder}
          disabled={options.length === 0}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: colors.background }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: colors.action }} />
      </div>
    )
  }

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border bg-transparent transition-all focus:ring-2 outline-none"
  const labelClass = "block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70"

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden" style={{ backgroundColor: colors.background, color: colors.textPrimary }}>
      
      {/* Left Panel - Configuration */}
      <div className="w-[380px] flex flex-col border-r shadow-lg z-10" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-4 shrink-0 bg-opacity-50 backdrop-blur-sm" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/report-templates')} 
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-base font-bold tracking-tight">{isEditing ? 'Edit Template' : 'New Template'}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-95"
            style={{ backgroundColor: colors.action }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0 p-1 gap-1" style={{ borderColor: colors.border, backgroundColor: colors.mutedBg }}>
          {(['design', 'fields', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-md flex items-center justify-center gap-2 ${
                activeTab === tab 
                  ? 'bg-white dark:bg-zinc-800 shadow-sm' 
                  : 'hover:bg-white/50 dark:hover:bg-zinc-800/50 opacity-60 hover:opacity-100'
              }`}
              style={activeTab === tab ? { color: colors.action } : { color: colors.textSecondary }}
            >
              {tab === 'design' && <FileText size={14} />}
              {tab === 'fields' && <Settings size={14} />}
              {tab === 'settings' && <Eye size={14} />}
              {tab}
            </button>
          ))}
        </div>

        {/* Scrollable Config Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          {activeTab === 'design' && (
            <>
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold opacity-50 uppercase tracking-widest">Basic Info</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Key *</label>
                    <input
                      type="text"
                      value={config.template_key}
                      onChange={e => setConfig(p => ({ ...p, template_key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                      className={inputClass}
                      style={{ borderColor: colors.border, '--ring-color': colors.action } as any}
                      placeholder="my_receipt"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Name *</label>
                    <input
                      type="text"
                      value={config.template_name}
                      onChange={e => setConfig(p => ({ ...p, template_name: e.target.value }))}
                      className={inputClass}
                      style={{ borderColor: colors.border, '--ring-color': colors.action } as any}
                      placeholder="My Receipt"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Type</label>
                    <SimpleDropdown
                      value={config.report_type}
                      onChange={(v) => {
                        const type = REPORT_TYPES.find(t => t.value === v)
                        setConfig(p => ({ ...p, report_type: v, documentTitle: type?.title || 'DOCUMENT' }))
                      }}
                      options={REPORT_TYPES.map(t => ({ value: t.value, label: t.label }))}
                      placeholder="Select type..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Model *</label>
                    <SimpleDropdown
                      value={config.source_model}
                      onChange={(v) => {
                        setConfig(p => ({ ...p, source_model: v, lineItemsField: '', tableColumns: [], infoLeftFields: [] }))
                      }}
                      options={availableModels.map(m => ({ 
                        value: m.model_name, 
                        label: m.label || m.model_display_name || m.model_name 
                      }))}
                      placeholder="Select model..."
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-border opacity-20" style={{ backgroundColor: colors.border }} />

              {/* Branding */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold opacity-50 uppercase tracking-widest">Branding</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Accent Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.accentColor}
                        onChange={e => setConfig(p => ({ ...p, accentColor: e.target.value }))}
                        className="w-10 h-10 rounded-lg border cursor-pointer p-1"
                        style={{ borderColor: colors.border, backgroundColor: colors.card }}
                      />
                      <input
                        type="text"
                        value={config.accentColor}
                        onChange={e => setConfig(p => ({ ...p, accentColor: e.target.value }))}
                        className={`${inputClass} flex-1`}
                        style={{ borderColor: colors.border, '--ring-color': colors.action } as any}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Document Title</label>
                    <input
                      type="text"
                      value={config.documentTitle}
                      onChange={e => setConfig(p => ({ ...p, documentTitle: e.target.value }))}
                      className={inputClass}
                      style={{ borderColor: colors.border, '--ring-color': colors.action } as any}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Logo URL</label>
                  <input
                    type="text"
                    value={config.logoUrl}
                    onChange={e => setConfig(p => ({ ...p, logoUrl: e.target.value }))}
                    className={inputClass}
                    style={{ borderColor: colors.border, '--ring-color': colors.action } as any}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              <div className="h-px bg-border opacity-20" style={{ backgroundColor: colors.border }} />

              {/* Layout Sections */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold opacity-50 uppercase tracking-widest">Layout</h3>
                
                {/* Left Info */}
                <div className="p-4 rounded-xl border bg-opacity-50" style={{ borderColor: colors.border, backgroundColor: colors.mutedBg }}>
                  <label className={`${labelClass} mb-2`}>Header Left Section</label>
                  <input
                    type="text"
                    value={config.infoLeftTitle}
                    onChange={e => setConfig(p => ({ ...p, infoLeftTitle: e.target.value }))}
                    className={`${inputClass} mb-3 font-semibold`}
                    style={{ borderColor: colors.border, backgroundColor: colors.card, '--ring-color': colors.action } as any}
                    placeholder="Section Title (e.g. Billed To)"
                  />
                  <div className="space-y-2">
                    {config.infoLeftFields.map((f, i) => (
                      <div key={i} className="flex gap-2 items-center group">
                        <div className="flex-1">
                          <FieldSelect
                            value={f}
                            onChange={v => {
                              const newFields = [...config.infoLeftFields]
                              newFields[i] = v
                              setConfig(p => ({ ...p, infoLeftFields: newFields }))
                            }}
                            fields={regularFields}
                            placeholder="Select field..."
                          />
                        </div>
                        <button
                          onClick={() => setConfig(p => ({ ...p, infoLeftFields: p.infoLeftFields.filter((_, idx) => idx !== i) }))}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setConfig(p => ({ ...p, infoLeftFields: [...p.infoLeftFields, ''] }))}
                      className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 w-full justify-center border border-dashed transition-colors"
                      style={{ color: colors.action, borderColor: colors.border }}
                    >
                      <Plus size={14} /> Add Field
                    </button>
                  </div>
                </div>

                {/* Right Info */}
                <div className="p-4 rounded-xl border bg-opacity-50" style={{ borderColor: colors.border, backgroundColor: colors.mutedBg }}>
                  <label className={`${labelClass} mb-2`}>Header Right Section</label>
                  <div className="space-y-2">
                    {config.infoRightFields.map((f, i) => (
                      <div key={i} className="flex gap-2 items-center group">
                        <input
                          type="text"
                          value={f.label}
                          onChange={e => {
                            const newFields = [...config.infoRightFields]
                            newFields[i] = { ...newFields[i], label: e.target.value }
                            setConfig(p => ({ ...p, infoRightFields: newFields }))
                          }}
                          className={`${inputClass} w-24`}
                          style={{ borderColor: colors.border, backgroundColor: colors.card, '--ring-color': colors.action } as any}
                          placeholder="Label"
                        />
                        <div className="flex-1">
                          <FieldSelect
                            value={f.field}
                            onChange={v => {
                              const newFields = [...config.infoRightFields]
                              newFields[i] = { ...newFields[i], field: v }
                              setConfig(p => ({ ...p, infoRightFields: newFields }))
                            }}
                            fields={regularFields}
                            placeholder="Select field..."
                          />
                        </div>
                        <button
                          onClick={() => setConfig(p => ({ ...p, infoRightFields: p.infoRightFields.filter((_, idx) => idx !== i) }))}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setConfig(p => ({ ...p, infoRightFields: [...p.infoRightFields, { label: '', field: '' }] }))}
                      className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 w-full justify-center border border-dashed transition-colors"
                      style={{ color: colors.action, borderColor: colors.border }}
                    >
                      <Plus size={14} /> Add Row
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'fields' && (
            <div className="space-y-6">
              {/* Line Items Table */}
              <div className="p-4 rounded-xl border bg-opacity-50" style={{ borderColor: colors.border, backgroundColor: colors.mutedBg }}>
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Line Items Table</h3>
                
                {loadingFields ? (
                  <div className="flex items-center gap-2 text-xs opacity-60">
                    <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" />
                    Loading fields...
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className={labelClass}>Source Field (One2Many)</label>
                      <FieldSelect
                        value={config.lineItemsField}
                        onChange={v => setConfig(p => ({ ...p, lineItemsField: v, tableColumns: [] }))}
                        fields={o2mFields}
                        placeholder="Select line items field..."
                      />
                    </div>
                
                    {config.lineItemsField && (
                      <div className="space-y-3">
                        <label className={labelClass}>Columns</label>
                        <div className="space-y-2">
                          {config.tableColumns.map((col, i) => (
                            <div key={col.id} className="flex items-center gap-2 p-3 rounded-lg border shadow-sm group" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                              <GripVertical size={14} className="opacity-30 cursor-grab" />
                              <div className="flex-1 space-y-2">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={col.label}
                                    onChange={e => {
                                      const newCols = [...config.tableColumns]
                                      newCols[i] = { ...newCols[i], label: e.target.value }
                                      setConfig(p => ({ ...p, tableColumns: newCols }))
                                    }}
                                    className={`${inputClass} w-1/3`}
                                    style={{ borderColor: colors.border, '--ring-color': colors.action } as any}
                                    placeholder="Header"
                                  />
                                  <div className="flex-1">
                                    <FieldSelect
                                      value={col.field}
                                      onChange={v => {
                                        const newCols = [...config.tableColumns]
                                        newCols[i] = { ...newCols[i], field: v }
                                        setConfig(p => ({ ...p, tableColumns: newCols }))
                                      }}
                                      fields={lineFields}
                                      placeholder="Field"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="w-32">
                                    <SimpleDropdown
                                      value={col.align}
                                      onChange={(v) => {
                                        const newCols = [...config.tableColumns]
                                        newCols[i] = { ...newCols[i], align: v as 'left' | 'center' | 'right' }
                                        setConfig(p => ({ ...p, tableColumns: newCols }))
                                      }}
                                      options={[
                                        { value: 'left', label: 'Align Left' },
                                        { value: 'center', label: 'Align Center' },
                                        { value: 'right', label: 'Align Right' }
                                      ]}
                                      placeholder="Align"
                                    />
                                  </div>
                                  <button
                                    onClick={() => setConfig(p => ({ ...p, tableColumns: p.tableColumns.filter((_, idx) => idx !== i) }))}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => setConfig(p => ({ ...p, tableColumns: [...p.tableColumns, { id: generateId(), field: '', label: '', align: 'left' }] }))}
                            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 w-full justify-center border border-dashed transition-colors"
                            style={{ color: colors.action, borderColor: colors.border }}
                          >
                            <Plus size={14} /> Add Column
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Totals Configuration */}
              <div className="p-4 rounded-xl border bg-opacity-50" style={{ borderColor: colors.border, backgroundColor: colors.mutedBg }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest">Totals Section</h3>
                  <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-1.5 rounded-lg border bg-card hover:bg-opacity-80 transition-all" style={{ borderColor: colors.border }}>
                    <input
                      type="checkbox"
                      checked={config.showTotals}
                      onChange={e => setConfig(p => ({ ...p, showTotals: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium">Enable</span>
                  </label>
                </div>
                
                {config.showTotals && (
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Subtotal Field</label>
                      <FieldSelect value={config.subtotalField} onChange={v => setConfig(p => ({ ...p, subtotalField: v }))} fields={regularFields} placeholder="Select field..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Tax Label</label>
                        <input
                          type="text"
                          value={config.taxLabel}
                          onChange={e => setConfig(p => ({ ...p, taxLabel: e.target.value }))}
                          className={inputClass}
                          style={{ borderColor: colors.border, backgroundColor: colors.card, '--ring-color': colors.action } as any}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Tax Field</label>
                        <FieldSelect value={config.taxField} onChange={v => setConfig(p => ({ ...p, taxField: v }))} fields={regularFields} placeholder="Select field..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Total Label</label>
                        <input
                          type="text"
                          value={config.totalLabel}
                          onChange={e => setConfig(p => ({ ...p, totalLabel: e.target.value }))}
                          className={inputClass}
                          style={{ borderColor: colors.border, backgroundColor: colors.card, '--ring-color': colors.action } as any}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Total Field</label>
                        <FieldSelect value={config.totalField} onChange={v => setConfig(p => ({ ...p, totalField: v }))} fields={regularFields} placeholder="Select field..." />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes Configuration */}
              <div className="p-4 rounded-xl border bg-opacity-50" style={{ borderColor: colors.border, backgroundColor: colors.mutedBg }}>
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Footer & Notes</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Section Title</label>
                    <input
                      type="text"
                      value={config.notesTitle}
                      onChange={e => setConfig(p => ({ ...p, notesTitle: e.target.value }))}
                      className={inputClass}
                      style={{ borderColor: colors.border, backgroundColor: colors.card, '--ring-color': colors.action } as any}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Static Text</label>
                    <textarea
                      value={config.footerText}
                      onChange={e => setConfig(p => ({ ...p, footerText: e.target.value }))}
                      className={`${inputClass} resize-none min-h-[80px]`}
                      style={{ borderColor: colors.border, backgroundColor: colors.card, '--ring-color': colors.action } as any}
                      placeholder="Thank you for your business..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Dynamic Notes Field (Optional)</label>
                    <FieldSelect value={config.notesField} onChange={v => setConfig(p => ({ ...p, notesField: v }))} fields={regularFields} placeholder="Select field..." />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border bg-opacity-50" style={{ borderColor: colors.border, backgroundColor: colors.mutedBg }}>
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Page Settings</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Size</label>
                    <SimpleDropdown
                      value={config.page_size}
                      onChange={(v) => setConfig(p => ({ ...p, page_size: v }))}
                      options={['A4', 'A5', 'Letter', 'Legal'].map(s => ({ value: s, label: s }))}
                      placeholder="Select size..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Orientation</label>
                    <SimpleDropdown
                      value={config.page_orientation}
                      onChange={(v) => setConfig(p => ({ ...p, page_orientation: v }))}
                      options={[
                        { value: 'portrait', label: 'Portrait' },
                        { value: 'landscape', label: 'Landscape' }
                      ]}
                      placeholder="Select orientation..."
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border bg-opacity-50" style={{ borderColor: colors.border, backgroundColor: colors.mutedBg }}>
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Meta Information</h3>
                <label className={labelClass}>Description</label>
                <textarea
                  value={config.description}
                  onChange={e => setConfig(p => ({ ...p, description: e.target.value }))}
                  className={`${inputClass} resize-none min-h-[100px]`}
                  style={{ borderColor: colors.border, backgroundColor: colors.card, '--ring-color': colors.action } as any}
                  placeholder="Template description..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Live Preview */}
      <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ backgroundColor: mode === 'dark' ? '#09090b' : '#f3f4f6' }}>
        {/* Toolbar */}
        <div className="h-16 flex items-center justify-between px-6 shrink-0 border-b bg-white dark:bg-black/20" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold opacity-50 uppercase tracking-widest">Live Preview</span>
          </div>
          <div className="flex items-center gap-2 bg-card rounded-lg border p-1 shadow-sm" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors" title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors" title="Zoom In">
              <ZoomIn size={16} />
            </button>
            <div className="w-px h-4 bg-border mx-1" style={{ backgroundColor: colors.border }} />
            <button onClick={() => setZoom(0.6)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors" title="Reset Zoom">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-auto p-8 flex items-start justify-center custom-scrollbar">
          <div
            className="bg-white shadow-2xl origin-top transition-transform duration-200 ease-out border"
            style={{
              width: config.page_orientation === 'portrait' ? '210mm' : '297mm',
              minHeight: config.page_orientation === 'portrait' ? '297mm' : '210mm',
              transform: `scale(${zoom})`,
              marginBottom: `${(zoom - 1) * 100}mm`, // Compensate for scale margin
              borderColor: mode === 'dark' ? '#333' : '#e5e7eb'
            }}
          >
            {/* Preview Content */}
            <div style={{ padding: '40px', fontFamily: "'Inter', sans-serif", fontSize: '11px', color: '#1f2937' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Your Company Inc.</h1>
                  <p style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.4 }}>
                    1234 Company St,<br/>Company Town, ST 12345
                  </p>
                </div>
                <div style={{ width: '120px', height: '60px', border: '2px dashed #e5e7eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '10px', flexDirection: 'column', gap: '4px' }}>
                  {config.logoUrl ? <img src={config.logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : (
                    <>
                      <Upload size={16} />
                      <span>Upload Logo</span>
                    </>
                  )}
                </div>
              </div>

              {/* Title */}
              <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '32px', fontWeight: 700, color: config.accentColor, letterSpacing: '2px', lineHeight: 1.2 }}>
                  {config.documentTitle.split(' ').map((word, i) => <div key={i}>{word}</div>)}
                </h2>
              </div>

              {/* Info Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div>
                  <h3 style={{ fontSize: '10px', fontWeight: 600, color: config.accentColor, textTransform: 'uppercase', marginBottom: '8px' }}>{config.infoLeftTitle}</h3>
                  <p style={{ fontSize: '12px', color: '#374151' }}>Customer Name<br/>1234 Customer St,<br/>Customer Town, ST 12345</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {config.infoRightFields.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: config.accentColor }}>{f.label || 'Label'}</span>
                      <span style={{ fontSize: '11px', minWidth: '80px' }}>{f.field ? `{{${f.field}}}` : '0000457'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                <thead>
                  <tr style={{ background: config.accentColor }}>
                    {config.tableColumns.length > 0 ? (
                      config.tableColumns.map((col, i) => (
                        <th key={i} style={{ color: '#fff', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', padding: '12px 16px', textAlign: col.align as any }}>{col.label || 'Column'}</th>
                      ))
                    ) : (
                      <>
                        <th style={{ color: '#fff', fontSize: '10px', fontWeight: 600, padding: '12px 16px', textAlign: 'left' }}>QTY</th>
                        <th style={{ color: '#fff', fontSize: '10px', fontWeight: 600, padding: '12px 16px', textAlign: 'left' }}>Description</th>
                        <th style={{ color: '#fff', fontSize: '10px', fontWeight: 600, padding: '12px 16px', textAlign: 'right' }}>Unit Price</th>
                        <th style={{ color: '#fff', fontSize: '10px', fontWeight: 600, padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { qty: 10, desc: 'Storage bins (large)', price: '18.00', amount: '$180.00' },
                    { qty: 5, desc: 'Barcode scanners', price: '75.00', amount: '$375.00' },
                    { qty: 3, desc: 'Metal shelving units', price: '120.00', amount: '$360.00' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      {config.tableColumns.length > 0 ? (
                        config.tableColumns.map((col, j) => (
                          <td key={j} style={{ padding: '14px 16px', fontSize: '11px', textAlign: col.align as any }}>Sample</td>
                        ))
                      ) : (
                        <>
                          <td style={{ padding: '14px 16px', fontSize: '11px' }}>{row.qty}</td>
                          <td style={{ padding: '14px 16px', fontSize: '11px' }}>{row.desc}</td>
                          <td style={{ padding: '14px 16px', fontSize: '11px', textAlign: 'right' }}>{row.price}</td>
                          <td style={{ padding: '14px 16px', fontSize: '11px', textAlign: 'right' }}>{row.amount}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              {config.showTotals && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
                  <div style={{ width: '280px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '11px', borderBottom: '1px solid #f3f4f6' }}>
                      <span>Subtotal</span><span>$915.00</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '11px', borderBottom: '1px solid #f3f4f6' }}>
                      <span>{config.taxLabel}</span><span>$50.75</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '14px', fontWeight: 700, color: config.accentColor, borderTop: `2px solid ${config.accentColor}`, marginTop: '4px' }}>
                      <span>{config.totalLabel}</span><span>$965.75</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {(config.footerText || config.notesField) && (
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '20px', marginTop: '32px' }}>
                  <h3 style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>{config.notesTitle}</h3>
                  <p style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.6 }}>{config.footerText}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
    </div>
  )
}
