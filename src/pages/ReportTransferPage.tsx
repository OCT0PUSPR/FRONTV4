"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { Truck, ArrowRightLeft, Package, Download, RefreshCcw, FileText, Eye, EyeOff } from "lucide-react"
import { Button } from "../../@/components/ui/button"
import { Input } from "../../@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../@/components/ui/select"
import { useAuth } from "../../context/auth"
import { API_CONFIG } from "../config/api"
import Toast from "../components/Toast"

type TransferType = 'internal' | 'incoming' | 'outgoing'

interface TransferLine {
  id: number
  product_id: number
  product_name: string
  product_uom_id: number
  uom_name: string
  location_id: number
  location_name: string
  location_dest_id: number
  location_dest_name: string
  quantity: number
}

interface Transfer {
  id: number
  name: string
  origin: string
  partner_id?: number
  partner_name?: string
  scheduled_date: string
  state: 'draft' | 'confirmed' | 'assigned' | 'done' | 'cancel'
  picking_type_code: TransferType
  move_line_ids: number[]
  lines?: TransferLine[]
}

interface HeaderFooter {
  id: number
  name: string
  xml_content: string
}

const TRANSFER_TYPES = [
  { value: 'internal' as TransferType, label: 'Internal Transfer', icon: ArrowRightLeft, color: '#8b5cf6' },
  { value: 'incoming' as TransferType, label: 'Receipt', icon: Package, color: '#10b981' },
  { value: 'outgoing' as TransferType, label: 'Delivery', icon: Truck, color: '#f59e0b' },
]

const STATE_CONFIG = {
  draft: { color: '#6b7280', label: 'Draft' },
  confirmed: { color: '#3b82f6', label: 'Confirmed' },
  assigned: { color: '#8b5cf6', label: 'Ready' },
  done: { color: '#10b981', label: 'Done' },
  cancel: { color: '#ef4444', label: 'Cancelled' },
}

export default function ReportTransferPage() {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const { sessionId } = useAuth()

  const [selectedType, setSelectedType] = useState<TransferType>('incoming')
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [headers, setHeaders] = useState<HeaderFooter[]>([])
  const [footers, setFooters] = useState<HeaderFooter[]>([])
  const [selectedHeader, setSelectedHeader] = useState<string>('')
  const [selectedFooter, setSelectedFooter] = useState<string>('')
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

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

  // Fetch transfers by type
  const fetchTransfers = async (type: TransferType) => {
    if (!sessionId) {
      console.log('[TransferReport] No sessionId, skipping fetch')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const headers: Record<string, string> = {}
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/transfers?type=${type}`, {
        method: 'GET',
        headers: {
          ...headers,
          'x-odoo-session': sessionId
        }
      })

      console.log('[TransferReport] Response status:', response.status)
      const result = await response.json()
      console.log('[TransferReport] Response data:', result)

      const transfersList = result.data?.transfers || result.transfers || []

      if (response.ok && transfersList.length > 0) {
        setTransfers(transfersList)
      } else {
        console.log('[TransferReport] Using mock data - response.ok:', response.ok, 'transfers count:', transfersList.length)
        // Mock data for development
        setTransfers([
          {
            id: 1,
            name: 'WH/IN/00001',
            origin: 'PO0001',
            partner_name: 'Vendor Inc',
            scheduled_date: new Date().toISOString().split('T')[0],
            state: 'assigned',
            picking_type_code: type,
            move_line_ids: [1, 2, 3],
            lines: [
              {
                id: 1,
                product_id: 1,
                product_name: 'Product A',
                product_uom_id: 1,
                uom_name: 'Units',
                location_id: 1,
                location_name: 'Vendor',
                location_dest_id: 2,
                location_dest_name: 'Stock',
                quantity: 100
              },
              {
                id: 2,
                product_id: 2,
                product_name: 'Product B',
                product_uom_id: 1,
                uom_name: 'Units',
                location_id: 1,
                location_name: 'Vendor',
                location_dest_id: 2,
                location_dest_name: 'Stock',
                quantity: 50
              }
            ]
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching transfers:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch transfer details with lines
  const fetchTransferDetails = async (transferId: number) => {
    if (!sessionId) return

    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const headers: Record<string, string> = {}
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/transfers/${transferId}`, {
        method: 'GET',
        headers: {
          ...headers,
          'x-odoo-session': sessionId
        }
      })

      if (response.ok) {
        const result = await response.json()
        setSelectedTransfer(result.data?.transfer || result.transfer)
      } else {
        // Use mock data from transfers list
        const transfer = transfers.find(t => t.id === transferId)
        if (transfer) {
          setSelectedTransfer(transfer)
        }
      }
    } catch (error) {
      console.error('Error fetching transfer details:', error)
    }
  }

  useEffect(() => {
    fetchTransfers(selectedType)
  }, [selectedType, sessionId])

  const handleTypeChange = (type: TransferType) => {
    setSelectedType(type)
    setSelectedTransfer(null)
    fetchTransfers(type)
  }

  const generateReport = async () => {
    if (!selectedTransfer) {
      showToast(t('Please select a transfer'), 'error')
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

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/generate-transfer`, {
        method: 'POST',
        headers: headers_obj,
        body: JSON.stringify({
          transfer_id: selectedTransfer.id,
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

  const renderHeaderPreview = () => {
    const header = headers.find(h => h.id.toString() === selectedHeader)
    if (!header) return null

    let html = header.xml_content
      .replace(/<header>([\s\S]*?)<\/header>/gi, (_, content) => content)
      .replace(/<report-title>{{(.*?)}}<\/report-title>/g, () => `<div class="preview-report-title">${selectedTransfer?.name || 'Transfer'}</div>`)
      .replace(/<name>{{(.*?)}}<\/name>/g, () => `<div class="preview-company-name">ACME Corporation</div>`)
      .replace(/<address>{{(.*?)}}<\/address>/g, () => `<div class="preview-company-info">123 Business Street</div>`)
      .replace(/<phone>{{(.*?)}}<\/phone>/g, () => `<div class="preview-company-info">+1 234 567 890</div>`)
      .replace(/<email>{{(.*?)}}<\/email>/g, () => `<div class="preview-company-info">info@acme.com</div>`)
      .replace(/<date>{{(.*?)}}<\/date>/g, () => `<div class="preview-doc-info">${t('Date')}: ${selectedTransfer?.scheduled_date || new Date().toISOString().split('T')[0]}</div>`)
      .replace(/<ref>{{(.*?)}}<\/ref>/g, () => `<div class="preview-doc-info">${t('Reference')}: ${selectedTransfer?.origin || '-'}</div>`)
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

  const renderPreview = () => {
    if (!selectedTransfer) return null

    return (
      <div style={{ width: '100%', backgroundColor: '#fff', borderRadius: '4px', overflow: 'hidden' }}>
        {/* Header */}
        {selectedHeader && (
          <div style={{ padding: '1.5rem', borderBottom: '2px solid #333', backgroundColor: '#fafafa' }}>
            <style>{`
              .preview-report-title {
                font-size: 20px;
                font-weight: 700;
                color: #1a1a1a;
                text-align: center;
                padding-bottom: 0.5rem;
                margin-bottom: 1rem;
              }
              .preview-company-name {
                font-size: 14px;
                font-weight: 600;
                color: #333;
              }
              .preview-company-info {
                font-size: 12px;
                color: #666;
                line-height: 1.4;
              }
              .preview-doc-info {
                font-size: 12px;
                color: #666;
              }
            `}</style>
            <div dangerouslySetInnerHTML={{ __html: renderHeaderPreview() || '' }} />
          </div>
        )}

        {/* Transfer Info */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #ddd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 0.5rem 0' }}>
                {selectedTransfer.name}
              </h3>
              {selectedTransfer.origin && (
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>{selectedTransfer.origin}</p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              {selectedTransfer.partner_name && (
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{t('Partner')}</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>{selectedTransfer.partner_name}</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {t('Date')}: {selectedTransfer.scheduled_date ? new Date(selectedTransfer.scheduled_date).toLocaleDateString() : '-'}
            </span>
            <span style={{ fontSize: '12px', color: STATE_CONFIG[selectedTransfer.state]?.color || '#666' }}>
              {STATE_CONFIG[selectedTransfer.state]?.label || selectedTransfer.state}
            </span>
          </div>
        </div>

        {/* Lines Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd', backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#333' }}>{t('Product')}</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#333' }}>{t('UoM')}</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#333' }}>{t('Source')}</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#333' }}>{t('Destination')}</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#333' }}>{t('Quantity')}</th>
            </tr>
          </thead>
          <tbody>
            {(selectedTransfer.lines || []).map((line) => (
              <tr key={line.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem', color: '#333' }}>{line.product_name}</td>
                <td style={{ padding: '0.75rem', color: '#666' }}>{line.uom_name}</td>
                <td style={{ padding: '0.75rem', color: '#666' }}>{line.location_name}</td>
                <td style={{ padding: '0.75rem', color: '#666' }}>{line.location_dest_name}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', color: '#333', fontWeight: '500' }}>{line.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        {selectedFooter && (
          <div style={{ padding: '1rem', borderTop: '1px solid #ccc', backgroundColor: '#fafafa' }}>
            <style>{`
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
            <div dangerouslySetInnerHTML={{ __html: renderFooterPreview() || '' }} />
          </div>
        )}
      </div>
    )
  }

  const filteredTransfers = transfers.filter(transfer =>
    !searchQuery ||
    transfer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transfer.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transfer.partner_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const currentTypeConfig = TRANSFER_TYPES.find(t => t.value === selectedType)
  const CurrentIcon = currentTypeConfig?.icon || Package

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
            {t('Transfer Reports')}
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
            {t('Generate PDF reports for transfers')}
          </p>
        </div>
        <Button
          onClick={generateReport}
          disabled={!selectedTransfer || isGenerating}
          style={{ backgroundColor: colors.action, color: '#fff' }}
        >
          <Download size={16} className={isRTL ? 'ml-2' : 'mr-2'} />
          {isGenerating ? t('Generating...') : t('Generate PDF')}
        </Button>
      </div>

      {/* Main Content - Split View */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left Sidebar - Configuration */}
        <div style={{
          width: '380px',
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: colors.card
        }}>

          {/* Type Selector */}
          <div style={{ padding: '1rem', borderBottom: `1px solid ${colors.border}` }}>
            <h3 style={{ color: colors.textSecondary, fontSize: '0.75rem', textTransform: 'uppercase', margin: '0 0 0.75rem 0' }}>
              {t('Transfer Type')}
            </h3>
            <div className="flex gap-2">
              {TRANSFER_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = selectedType === type.value
                return (
                  <button
                    key={type.value}
                    onClick={() => handleTypeChange(type.value)}
                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all"
                    style={{
                      backgroundColor: isSelected ? type.color : colors.background,
                      color: isSelected ? '#fff' : colors.textPrimary,
                      border: `1px solid ${isSelected ? type.color : colors.border}`,
                      flex: 1,
                      minHeight: '40px',
                    }}
                    title={type.label}
                  >
                    <Icon size={16} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Transfers List */}
          <div style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            borderBottom: `1px solid ${colors.border}`
          }}>
            <div className="flex items-center gap-2 mb-3">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('Search...')}
                style={{
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                  flex: 1,
                  fontSize: '0.875rem'
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTransfers(selectedType)}
                style={{ borderColor: colors.border, color: colors.textPrimary, padding: '0.5rem' }}
              >
                <RefreshCcw size={14} />
              </Button>
            </div>

            <h3 style={{ color: colors.textSecondary, fontSize: '0.75rem', textTransform: 'uppercase', margin: '0 0 0.75rem 0' }}>
              {t('Transfers')}
            </h3>

            {loading ? (
              <div className="text-center p-4" style={{ color: colors.textSecondary, fontSize: '0.875rem' }}>
                {t('Loading...')}
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="text-center p-4" style={{ color: colors.textSecondary, fontSize: '0.875rem' }}>
                {t('No transfers found')}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransfers.map((transfer) => {
                  const stateConfig = STATE_CONFIG[transfer.state] || STATE_CONFIG.draft
                  return (
                    <div
                      key={transfer.id}
                      onClick={() => fetchTransferDetails(transfer.id)}
                      className="p-3 cursor-pointer transition-all"
                      style={{
                        backgroundColor: selectedTransfer?.id === transfer.id ? `${colors.action}20` : 'transparent',
                        border: selectedTransfer?.id === transfer.id ? `1px solid ${colors.action}` : `1px solid ${colors.border}`,
                        borderRadius: '8px',
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div style={{ color: colors.textPrimary, fontWeight: '600', fontSize: '0.875rem' }}>{transfer.name}</div>
                          {transfer.origin && (
                            <div style={{ color: colors.textSecondary, fontSize: '0.75rem' }}>{transfer.origin}</div>
                          )}
                        </div>
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${stateConfig.color}20`, color: stateConfig.color }}
                        >
                          {stateConfig.label}
                        </span>
                      </div>
                      {transfer.partner_name && (
                        <div style={{ color: colors.textSecondary, fontSize: '0.75rem' }}>
                          {transfer.partner_name}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Options */}
          <div style={{ padding: '1rem', overflowY: 'auto' }}>
            <h3 style={{ color: colors.textSecondary, fontSize: '0.75rem', textTransform: 'uppercase', margin: '0 0 0.75rem 0' }}>
              {t('Options')}
            </h3>
            <div className="space-y-3">
              <div>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                  {t('Header')}
                </label>
                <Select value={selectedHeader || "none"} onValueChange={(v) => setSelectedHeader(v === "none" ? "" : v)}>
                  <SelectTrigger style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, color: colors.textPrimary }}>
                    <SelectValue placeholder={t('Default header')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('Default header')}</SelectItem>
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
                    <SelectValue placeholder={t('Default footer')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('Default footer')}</SelectItem>
                    {footers.map((footer) => (
                      <SelectItem key={footer.id} value={footer.id.toString()}>
                        {footer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
              selectedTransfer ? (
                <div style={{ width: '100%', maxWidth: '700px' }}>
                  {renderPreview()}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: colors.textSecondary }}>
                  <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>{t('Select a transfer to preview')}</p>
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
