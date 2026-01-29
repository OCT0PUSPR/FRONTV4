"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { FileSpreadsheet, Plus, Filter, Trash2, Download, FileText, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "../../@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../@/components/ui/select"
import { Input } from "../../@/components/ui/input"
import { Checkbox } from "../../@/components/ui/checkbox"
import { useAuth } from "../../context/auth"
import { API_CONFIG } from "../config/api"
import Toast from "../components/Toast"

interface OdooModel {
  name: string
  model: string
  fields?: ModelField[]
}

interface ModelField {
  name: string
  field_label: string
  field_type: string
  relation?: string
}

interface FilterCondition {
  id: string
  field: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'ilike' | 'in'
  value: string
}

interface HeaderFooter {
  id: number
  name: string
  xml_content: string
}

const ODOO_MODELS: OdooModel[] = [
  { name: 'Products', model: 'product.product' },
  { name: 'Product Templates', model: 'product.template' },
  { name: 'Stock Moves', model: 'stock.move' },
  { name: 'Stock Move Lines', model: 'stock.move.line' },
  { name: 'Stock Picking', model: 'stock.picking' },
  { name: 'Stock Quantities', model: 'stock.quant' },
  { name: 'Purchase Orders', model: 'purchase.order' },
  { name: 'Sale Orders', model: 'sale.order' },
  { name: 'Account Moves', model: 'account.move' },
  { name: 'Partners/Customers', model: 'res.partner' },
  { name: 'Locations', model: 'stock.location' },
  { name: 'Warehouses', model: 'stock.warehouse' },
]

const OPERATORS = [
  { value: '=', label: 'Equals' },
  { value: '!=', label: 'Not Equals' },
  { value: '>', label: 'Greater Than' },
  { value: '<', label: 'Less Than' },
  { value: '>=', label: 'Greater or Equal' },
  { value: '<=', label: 'Less or Equal' },
  { value: 'like', label: 'Contains' },
  { value: 'ilike', label: 'Contains (case insensitive)' },
  { value: 'in', label: 'In List' },
]

// Mock data for preview
const MOCK_PREVIEW_DATA = [
  { id: 1, name: 'Product A', default_code: 'PROD-A', qty_available: 100, list_price: 50.00 },
  { id: 2, name: 'Product B', default_code: 'PROD-B', qty_available: 50, list_price: 75.00 },
  { id: 3, name: 'Product C', default_code: 'PROD-C', qty_available: 200, list_price: 25.00 },
]

export default function ReportExportPage() {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const { sessionId } = useAuth()

  const [selectedModel, setSelectedModel] = useState<string>('')
  const [modelFields, setModelFields] = useState<ModelField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [filters, setFilters] = useState<FilterCondition[]>([])
  const [headers, setHeaders] = useState<HeaderFooter[]>([])
  const [footers, setFooters] = useState<HeaderFooter[]>([])
  const [selectedHeader, setSelectedHeader] = useState<string>('')
  const [selectedFooter, setSelectedFooter] = useState<string>('')
  const [reportName, setReportName] = useState<string>('')
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [expandedSections, setExpandedSections] = useState({
    model: true,
    fields: true,
    filters: false,
    options: true,
  })

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
    setTimeout(() => setToast(null), 3000)
  }

  // Fetch headers and footers
  useEffect(() => {
    const fetchHeadersAndFooters = async () => {
      try {
        const tenantId = localStorage.getItem('current_tenant_id')
        const headers_obj: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (tenantId) {
          headers_obj['X-Tenant-ID'] = tenantId
        }

        const [headersRes, footersRes] = await Promise.all([
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/headers`, { headers: headers_obj }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/footers`, { headers: headers_obj }),
        ])

        // Check if tables need migration (500 errors)
        if (!headersRes.ok && headersRes.status === 500) {
          console.log('Tables might be missing, running migration...')
          const migrateRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/migrate`, {
            method: 'POST',
            headers: headers_obj
          })
          if (migrateRes.ok) {
            console.log('Migration successful, retrying fetch...')
            const [retryHeadersRes, retryFootersRes] = await Promise.all([
              fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/headers`, { headers: headers_obj }),
              fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/footers`, { headers: headers_obj }),
            ])
            if (retryHeadersRes.ok) {
              const result = await retryHeadersRes.json()
              setHeaders(result.data?.headers || result.headers || [])
            }
            if (retryFootersRes.ok) {
              const result = await retryFootersRes.json()
              setFooters(result.data?.footers || result.footers || [])
            }
          }
        } else {
          if (headersRes.ok) {
            const result = await headersRes.json()
            setHeaders(result.data?.headers || result.headers || [])
          }
          if (footersRes.ok) {
            const result = await footersRes.json()
            setFooters(result.data?.footers || result.footers || [])
          }
        }
      } catch (error) {
        console.error('Error fetching headers/footers:', error)
      }
    }
    fetchHeadersAndFooters()
  }, [])

  // Fetch model fields when model is selected
  useEffect(() => {
    if (!selectedModel || !sessionId) return

    const fetchFields = async () => {
      setLoadingFields(true)
      try {
        const tenantId = localStorage.getItem('current_tenant_id')
        const headers: Record<string, string> = {}
        if (tenantId) {
          headers['X-Tenant-ID'] = tenantId
        }

        const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${selectedModel}/all`, {
          method: 'GET',
          headers
        })

        if (response.ok) {
          const result = await response.json()
          setModelFields(result.data?.fields || result.fields || [])
        }
      } catch (error) {
        console.error('Error fetching fields:', error)
      } finally {
        setLoadingFields(false)
      }
    }

    fetchFields()
  }, [selectedModel, sessionId])

  const toggleField = (fieldName: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldName)
        ? prev.filter(f => f !== fieldName)
        : [...prev, fieldName]
    )
  }

  const addFilter = () => {
    if (!modelFields.length) return
    setFilters([...filters, {
      id: Date.now().toString(),
      field: modelFields[0].name,
      operator: '=',
      value: ''
    }])
  }

  const updateFilter = (id: string, key: keyof FilterCondition, value: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, [key]: value } : f))
  }

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id))
  }

  const generateReport = async () => {
    if (!selectedModel || selectedFields.length === 0) {
      showToast(t('Please select a model and at least one field'), 'error')
      return
    }

    setIsGenerating(true)
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const headers_obj: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (tenantId) {
        headers_obj['X-Tenant-ID'] = tenantId
      }
      if (sessionId) {
        headers_obj['x-session-id'] = sessionId
      }

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/generate-export`, {
        method: 'POST',
        headers: headers_obj,
        body: JSON.stringify({
          name: reportName || `${selectedModel}_export`,
          model: selectedModel,
          fields: selectedFields,
          filters: filters,
          header_id: selectedHeader ? parseInt(selectedHeader) : undefined,
          footer_id: selectedFooter ? parseInt(selectedFooter) : undefined,
        })
      })

      if (response.ok) {
        const result = await response.json()
        showToast(t('Report generated successfully'), 'success')
        if (result.data?.pdf_url) {
          window.open(result.data.pdf_url, '_blank')
        }
      } else {
        showToast(t('Failed to generate report'), 'error')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      showToast(t('Error generating report'), 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const saveAsTemplate = async () => {
    if (!selectedModel || selectedFields.length === 0 || !reportName) {
      showToast(t('Please fill all required fields'), 'error')
      return
    }

    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/export-templates`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: reportName,
          model: selectedModel,
          fields: selectedFields,
          filters: filters,
          header_id: selectedHeader ? parseInt(selectedHeader) : undefined,
          footer_id: selectedFooter ? parseInt(selectedFooter) : undefined,
        })
      })

      if (response.ok) {
        showToast(t('Template saved successfully'), 'success')
      } else {
        showToast(t('Failed to save template'), 'error')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      showToast(t('Error saving template'), 'error')
    }
  }

  const renderHeaderPreview = () => {
    const header = headers.find(h => h.id.toString() === selectedHeader)
    if (!header) return null

    let html = header.xml_content
      .replace(/<header>([\s\S]*?)<\/header>/gi, (_, content) => content)
      .replace(/<report-title>{{(.*?)}}<\/report-title>/g, () => `<div class="preview-report-title">${reportName || 'Export Report'}</div>`)
      .replace(/<name>{{(.*?)}}<\/name>/g, () => `<div class="preview-company-name">ACME Corporation</div>`)
      .replace(/<address>{{(.*?)}}<\/address>/g, () => `<div class="preview-company-info">123 Business Street</div>`)
      .replace(/<[^>]+>/g, '')

    return html
  }

  const renderFooterPreview = () => {
    const footer = footers.find(f => f.id.toString() === selectedFooter)
    if (!footer) return null

    let html = footer.xml_content
      .replace(/<footer>([\s\S]*?)<\/footer>/gi, (_, content) => content)
      .replace(/<current>{{(.*?)}}<\/current>/g, () => `1`)
      .replace(/<total>{{(.*?)}}<\/total>/g, () => `1`)
      .replace(/<company-signature>{{(.*?)}}<\/company-signature>/g, () => `<div class="preview-company-signature">ACME Corporation</div>`)
      .replace(/<notes>{{(.*?)}}<\/notes>/g, () => `<div class="preview-notes"></div>`)
      .replace(/<[^>]+>/g, '')

    return html
  }

  const renderPreviewTable = () => {
    // Get the selected field names for display
    const fieldLabels = selectedFields.map(fieldName => {
      const field = modelFields.find(f => f.name === fieldName)
      return field?.field_label || field?.name || fieldName
    })

    return (
      <div style={{ width: '100%', backgroundColor: '#fff', borderRadius: '4px', overflow: 'hidden' }}>
        {/* Header */}
        {selectedHeader && (
          <div style={{ padding: '1.5rem', borderBottom: '2px solid #333', backgroundColor: '#fafafa' }}>
            <div dangerouslySetInnerHTML={{ __html: renderHeaderPreview() || '' }} />
          </div>
        )}

        {/* Data Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>
              {fieldLabels.map((label, idx) => (
                <th key={idx} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#333' }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_PREVIEW_DATA.map((row, rowIdx) => (
              <tr key={rowIdx} style={{ borderBottom: '1px solid #eee' }}>
                {selectedFields.map((fieldName, colIdx) => (
                  <td key={colIdx} style={{ padding: '0.75rem', color: '#666' }}>
                    {(row as any)[fieldName] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        {selectedFooter && (
          <div style={{ padding: '1rem', borderTop: '1px solid #ccc', backgroundColor: '#fafafa' }}>
            <div dangerouslySetInnerHTML={{ __html: renderFooterPreview() || '' }} />
          </div>
        )}
      </div>
    )
  }

  const isRTL = i18n.dir() === "rtl"

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: colors.background }}>
      {/* Top Header Bar */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.card,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: colors.textPrimary, margin: 0 }}>
            {t('Export Reports')}
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
            {t('Create custom exports from any model')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="outline"
            onClick={saveAsTemplate}
            disabled={!selectedModel || selectedFields.length === 0}
            style={{ borderColor: colors.border, color: colors.textPrimary }}
          >
            <FileText size={16} className={isRTL ? 'ml-2' : 'mr-2'} />
            {t('Save Template')}
          </Button>
          <Button
            onClick={generateReport}
            disabled={!selectedModel || selectedFields.length === 0 || isGenerating}
            style={{ backgroundColor: colors.action, color: '#fff' }}
          >
            <Download size={16} className={isRTL ? 'ml-2' : 'mr-2'} />
            {isGenerating ? t('Generating...') : t('Generate PDF')}
          </Button>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left Sidebar - Configuration */}
        <div style={{
          width: '400px',
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: colors.card,
          overflowY: 'auto'
        }}>

          {/* Model Selection */}
          <div style={{ padding: '1rem', borderBottom: `1px solid ${colors.border}` }}>
            <div
              className="flex items-center justify-between cursor-pointer mb-3"
              onClick={() => setExpandedSections({ ...expandedSections, model: !expandedSections.model })}
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} style={{ color: colors.textSecondary }} />
                <h3 style={{ color: colors.textPrimary, fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                  {t('Model')}
                </h3>
              </div>
              {expandedSections.model ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>

            {expandedSections.model && (
              <div className="space-y-3">
                <div>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    {t('Select Model')}
                  </label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, color: colors.textPrimary }}>
                      <SelectValue placeholder={t('Choose a model...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {ODOO_MODELS.map((model) => (
                        <SelectItem key={model.model} value={model.model}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    {t('Report Name')}
                  </label>
                  <Input
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder={t('Enter report name...')}
                    style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Fields Selection */}
          <div style={{ padding: '1rem', borderBottom: `1px solid ${colors.border}` }}>
            <div
              className="flex items-center justify-between cursor-pointer mb-3"
              onClick={() => setExpandedSections({ ...expandedSections, fields: !expandedSections.fields })}
            >
              <div className="flex items-center gap-2">
                <FileText size={16} style={{ color: colors.textSecondary }} />
                <h3 style={{ color: colors.textPrimary, fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                  {t('Fields')} ({selectedFields.length})
                </h3>
              </div>
              {expandedSections.fields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>

            {expandedSections.fields && (
              <>
                {!selectedModel ? (
                  <p style={{ color: colors.textSecondary, textAlign: 'center', padding: '1rem', fontSize: '0.8rem' }}>
                    {t('Select a model first')}
                  </p>
                ) : loadingFields ? (
                  <p style={{ color: colors.textSecondary, textAlign: 'center', padding: '1rem', fontSize: '0.8rem' }}>
                    {t('Loading...')}
                  </p>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="space-y-2">
                    {modelFields.map((field) => (
                      <div
                        key={field.name}
                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
                        style={{
                          backgroundColor: selectedFields.includes(field.name) ? `${colors.action}20` : colors.background,
                          border: `1px solid ${selectedFields.includes(field.name) ? colors.action : colors.border}`,
                        }}
                        onClick={() => toggleField(field.name)}
                      >
                        <Checkbox
                          checked={selectedFields.includes(field.name)}
                          onChange={() => toggleField(field.name)}
                        />
                        <div className="flex-1" style={{ minWidth: 0 }}>
                          <div style={{ color: colors.textPrimary, fontWeight: '500', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {field.field_label || field.name}
                          </div>
                          <div style={{ color: colors.textSecondary, fontSize: '0.7rem' }}>
                            {field.name}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Filters */}
          <div style={{ padding: '1rem', borderBottom: `1px solid ${colors.border}` }}>
            <div
              className="flex items-center justify-between cursor-pointer mb-3"
              onClick={() => setExpandedSections({ ...expandedSections, filters: !expandedSections.filters })}
            >
              <div className="flex items-center gap-2">
                <Filter size={16} style={{ color: colors.textSecondary }} />
                <h3 style={{ color: colors.textPrimary, fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                  {t('Filters')} ({filters.length})
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); addFilter() }}
                  disabled={!selectedModel}
                  style={{ borderColor: colors.border, color: colors.textPrimary, padding: '0.25rem 0.5rem' }}
                >
                  <Plus size={14} />
                </Button>
                {expandedSections.filters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {expandedSections.filters && (
              <div className="space-y-2">
                {filters.length === 0 ? (
                  <p style={{ color: colors.textSecondary, textAlign: 'center', padding: '1rem', fontSize: '0.8rem' }}>
                    {t('No filters')}
                  </p>
                ) : (
                  filters.map((filter) => (
                    <div
                      key={filter.id}
                      className="flex items-center gap-2 p-2 rounded-lg"
                      style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
                    >
                      <Select
                        value={filter.field}
                        onValueChange={(value) => updateFilter(filter.id, 'field', value)}
                      >
                        <SelectTrigger style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, color: colors.textPrimary, flex: 1 }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {modelFields.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.field_label || field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={filter.operator}
                        onValueChange={(value: any) => updateFilter(filter.id, 'operator', value)}
                      >
                        <SelectTrigger style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, color: colors.textPrimary, width: '70px' }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                        placeholder={t('Value')}
                        style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, color: colors.textPrimary, flex: 1 }}
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFilter(filter.id)}
                        style={{ color: '#ef4444', padding: '0.25rem' }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Options */}
          <div style={{ padding: '1rem' }}>
            <div
              className="flex items-center justify-between cursor-pointer mb-3"
              onClick={() => setExpandedSections({ ...expandedSections, options: !expandedSections.options })}
            >
              <h3 style={{ color: colors.textPrimary, fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                {t('Options')}
              </h3>
              {expandedSections.options ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>

            {expandedSections.options && (
              <div className="space-y-3">
                <div>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    {t('Header')}
                  </label>
                  <Select value={selectedHeader || "none"} onValueChange={(v) => setSelectedHeader(v === "none" ? "" : v)}>
                    <SelectTrigger style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, color: colors.textPrimary }}>
                      <SelectValue placeholder={t('No header')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('No header')}</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header.id} value={header.id.toString()}>
                          {header.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    {t('Footer')}
                  </label>
                  <Select value={selectedFooter || "none"} onValueChange={(v) => setSelectedFooter(v === "none" ? "" : v)}>
                    <SelectTrigger style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, color: colors.textPrimary }}>
                      <SelectValue placeholder={t('No footer')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('No footer')}</SelectItem>
                      {footers.map((footer) => (
                        <SelectItem key={footer.id} value={footer.id.toString()}>
                          {footer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Preview */}
        <div style={{
          flex: 1,
          backgroundColor: colors.background,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
              {t('Preview')}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              style={{ borderColor: colors.border, color: colors.textPrimary }}
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            </Button>
          </div>

          <div style={{
            flex: 1,
            padding: '2rem',
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}>
            {showPreview ? (
              selectedFields.length > 0 ? (
                <div style={{ width: '100%', maxWidth: '800px' }}>
                  <style>{`
                    .preview-report-title {
                      font-size: 20px;
                      font-weight: 700;
                      color: #1a1a1a;
                      text-align: center;
                      padding-bottom: 0.5rem;
                    }
                    .preview-company-name {
                      font-size: 14px;
                      font-weight: 600;
                      color: #333;
                    }
                    .preview-company-info {
                      font-size: 12px;
                      color: #666;
                    }
                    .preview-company-signature {
                      font-size: 12px;
                      font-weight: 500;
                      color: #333;
                    }
                    .preview-notes {
                      font-size: 11px;
                      color: #666;
                      font-style: italic;
                    }
                  `}</style>
                  {renderPreviewTable()}
                  <p style={{ color: colors.textSecondary, fontSize: '0.75rem', marginTop: '1rem', textAlign: 'center' }}>
                    {t('Preview uses mock data for demonstration')}
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: colors.textSecondary }}>
                  <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>{t('Select fields to see preview')}</p>
                </div>
              )
            ) : (
              <div style={{ color: colors.textSecondary }}>
                {t('Preview hidden')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
