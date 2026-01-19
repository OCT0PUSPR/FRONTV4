"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { FileText, Plus, Edit, Trash2, Save, Eye, Code, EyeOff, Check } from "lucide-react"
import { Button } from "../../@/components/ui/button"
import { Input } from "../../@/components/ui/input"
import { Textarea } from "../../@/components/ui/textarea"
import { useAuth } from "../../context/auth"
import { API_CONFIG } from "../config/api"
import Toast from "../components/Toast"
import Alert from "../components/Alert"

interface ReportHeader {
  id: number
  name: string
  description?: string
  xml_content: string
  is_default: boolean
  created_at: string
  updated_at: string
}

const DEFAULT_HEADER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<header>
  <report-title>{{document.title}}</report-title>
  <company-info>
    <name>{{company.name}}</name>
    <logo>{{company.logo}}</logo>
    <address>{{company.address}}</address>
    <phone>{{company.phone}}</phone>
    <email>{{company.email}}</email>
  </company-info>
  <document-info>
    <date>{{document.date}}</date>
    <ref>{{document.ref}}</ref>
  </document-info>
</header>`

const MOCK_COMPANY = {
  name: 'ACME Corporation',
  logo: '',
  address: '123 Business Street, City, Country',
  phone: '+1 234 567 890',
  email: 'info@acme.com'
}

const MOCK_DOCUMENT = {
  title: 'SALES ORDER',
  date: '2025-01-18',
  ref: 'SO00123'
}

export default function ReportHeadersPage() {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const { sessionId } = useAuth()

  const [headers, setHeaders] = useState<ReportHeader[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedHeader, setSelectedHeader] = useState<ReportHeader | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [headerToDelete, setHeaderToDelete] = useState<number | null>(null)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    xml_content: DEFAULT_HEADER_XML
  })

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchHeaders = async () => {
    setLoading(true)
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const fetchOptions: Record<string, string> = { 'Content-Type': 'application/json' }
      if (tenantId) fetchOptions['X-Tenant-ID'] = tenantId

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/headers`, {
        method: 'GET',
        headers: fetchOptions
      })

      if (response.ok) {
        const result = await response.json()
        const data = result.data?.headers || result.headers || []
        setHeaders(data)
        if (data.length > 0 && !selectedHeader) {
          setSelectedHeader(data[0])
        }
      } else {
        // Mock data for development
        const mockData: ReportHeader[] = [
          {
            id: 1,
            name: 'Standard Header',
            description: 'Company info with report title',
            xml_content: DEFAULT_HEADER_XML,
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
        setHeaders(mockData)
        if (!selectedHeader) setSelectedHeader(mockData[0])
      }
    } catch (error) {
      console.error('Error fetching headers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHeaders()
  }, [sessionId])

  const handleSave = async () => {
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const fetchOptions: Record<string, string> = { 'Content-Type': 'application/json' }
      if (tenantId) fetchOptions['X-Tenant-ID'] = tenantId

      const endpoint = selectedHeader?.id ? `/reports/headers/${selectedHeader.id}` : '/reports/headers'
      const method = selectedHeader?.id ? 'PUT' : 'POST'

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}${endpoint}`, {
        method,
        headers: fetchOptions,
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        showToast(t('Header saved'), 'success')
        setIsEditing(false)
        fetchHeaders()
      } else {
        showToast(t('Failed to save header'), 'error')
      }
    } catch (error) {
      console.error('Error saving header:', error)
      showToast(t('Error saving header'), 'error')
    }
  }

  const handleDelete = async (headerId: number) => {
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const fetchOptions: Record<string, string> = { 'Content-Type': 'application/json' }
      if (tenantId) fetchOptions['X-Tenant-ID'] = tenantId

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/headers/${headerId}`, {
        method: 'DELETE',
        headers: fetchOptions
      })

      if (response.ok) {
        showToast(t('Header deleted'), 'success')
        fetchHeaders()
      } else {
        showToast(t('Failed to delete header'), 'error')
      }
    } catch (error) {
      showToast(t('Error deleting header'), 'error')
    }
    setDeleteAlertOpen(false)
    setHeaderToDelete(null)
  }

  const handleSetDefault = async (headerId: number) => {
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const fetchOptions: Record<string, string> = { 'Content-Type': 'application/json' }
      if (tenantId) fetchOptions['X-Tenant-ID'] = tenantId

      await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/headers/${headerId}/set-default`, {
        method: 'POST',
        headers: fetchOptions
      })

      fetchHeaders()
      showToast(t('Default header updated'), 'success')
    } catch (error) {
      showToast(t('Error setting default'), 'error')
    }
  }

  const startNewHeader = () => {
    const newHeader: ReportHeader = {
      id: 0,
      name: 'New Header',
      description: '',
      xml_content: DEFAULT_HEADER_XML,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setSelectedHeader(newHeader)
    setFormData({
      name: 'New Header',
      description: '',
      xml_content: DEFAULT_HEADER_XML
    })
    setIsEditing(true)
  }

  const renderPreview = (xml: string) => {
    // Parse XML and create preview HTML
    let html = xml
      .replace(/<header>([\s\S]*?)<\/header>/gi, (_, content) => content)
      .replace(/<report-title>{{(.*?)}}<\/report-title>/g, (_, varPath) => {
        const val = varPath.split('.').reduce((obj: any, key: string) => obj?.[key], { document: MOCK_DOCUMENT }) || ''
        return `<div class="preview-report-title">${val}</div>`
      })
      .replace(/<name>{{(.*?)}}<\/name>/g, () => `<div class="preview-company-name">${MOCK_COMPANY.name}</div>`)
      .replace(/<address>{{(.*?)}}<\/address>/g, () => `<div class="preview-company-info">${MOCK_COMPANY.address}</div>`)
      .replace(/<phone>{{(.*?)}}<\/phone>/g, () => `<div class="preview-company-info">${MOCK_COMPANY.phone}</div>`)
      .replace(/<email>{{(.*?)}}<\/email>/g, () => `<div class="preview-company-info">${MOCK_COMPANY.email}</div>`)
      .replace(/<date>{{(.*?)}}<\/date>/g, () => `<div class="preview-doc-info">${t('Date')}: ${MOCK_DOCUMENT.date}</div>`)
      .replace(/<ref>{{(.*?)}}<\/ref>/g, () => `<div class="preview-doc-info">${t('Reference')}: ${MOCK_DOCUMENT.ref}</div>`)
      .replace(/<[^>]+>/g, '')

    return html
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
            {t('Report Headers')}
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
            {t('Manage XML templates for report headers')}
          </p>
        </div>
        <Button
          onClick={startNewHeader}
          style={{ backgroundColor: colors.action, color: '#fff' }}
        >
          <Plus size={16} className={isRTL ? 'ml-2' : 'mr-2'} />
          {t('New Header')}
        </Button>
      </div>

      {/* Main Content - Split View */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left Sidebar - Headers List & Editor */}
        <div style={{
          width: '450px',
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: colors.card
        }}>

          {/* Headers List */}
          <div style={{
            padding: '1rem',
            borderBottom: `1px solid ${colors.border}`,
            overflowY: 'auto',
            maxHeight: '40%'
          }}>
            <h3 style={{ color: colors.textSecondary, fontSize: '0.75rem', textTransform: 'uppercase', margin: '0 0 0.75rem 0' }}>
              {t('Headers')}
            </h3>
            <div className="space-y-2">
              {headers.map((header) => (
                <div
                  key={header.id}
                  onClick={() => {
                    setSelectedHeader(header)
                    setFormData({
                      name: header.name,
                      description: header.description || '',
                      xml_content: header.xml_content
                    })
                    setIsEditing(false)
                  }}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: selectedHeader?.id === header.id ? `${colors.action}20` : 'transparent',
                    border: selectedHeader?.id === header.id ? `1px solid ${colors.action}` : `1px solid transparent`,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: colors.textPrimary, fontWeight: '500', fontSize: '0.875rem' }}>
                        {header.name}
                      </span>
                      {header.is_default && (
                        <Check size={14} style={{ color: colors.action }} />
                      )}
                    </div>
                    {header.description && (
                      <p style={{ color: colors.textSecondary, fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                        {header.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {headers.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: colors.textSecondary, fontSize: '0.875rem' }}>
                  {t('No headers found')}
                </div>
              )}
            </div>
          </div>

          {/* Editor Section */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem'
          }}>
            {!selectedHeader && !isEditing ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: colors.textSecondary }}>
                <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>{t('Select a header or create a new one')}</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: colors.textPrimary, fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                    {isEditing ? t('Edit Header') : t('Header Details')}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectedHeader?.id && !isEditing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(selectedHeader.id)}
                          disabled={selectedHeader.is_default}
                          style={{ borderColor: colors.border, color: colors.textPrimary, padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          {t('Set Default')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          style={{ borderColor: colors.border, color: colors.textPrimary, padding: '0.25rem 0.5rem' }}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setHeaderToDelete(selectedHeader.id)
                            setDeleteAlertOpen(true)
                          }}
                          disabled={selectedHeader.is_default}
                          style={{ borderColor: colors.border, color: '#ef4444', padding: '0.25rem 0.5rem' }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}
                    {isEditing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditing(false)
                            if (selectedHeader?.id) {
                              const original = headers.find(h => h.id === selectedHeader.id)
                              if (original) {
                                setFormData({
                                  name: original.name,
                                  description: original.description || '',
                                  xml_content: original.xml_content
                                })
                              }
                            }
                          }}
                          style={{ borderColor: colors.border, color: colors.textPrimary, padding: '0.25rem 0.5rem' }}
                        >
                          {t('Cancel')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={!formData.name}
                          style={{ backgroundColor: colors.action, color: '#fff', padding: '0.25rem 0.75rem' }}
                        >
                          <Save size={14} className={isRTL ? 'ml-1' : 'mr-1'} />
                          {t('Save')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                      {t('Name')} *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!isEditing}
                      style={{
                        backgroundColor: isEditing ? colors.background : 'transparent',
                        border: isEditing ? `1px solid ${colors.border}` : 'none',
                        color: colors.textPrimary,
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                      {t('Description')}
                    </label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      disabled={!isEditing}
                      placeholder={t('Enter description')}
                      style={{
                        backgroundColor: isEditing ? colors.background : 'transparent',
                        border: isEditing ? `1px solid ${colors.border}` : 'none',
                        color: colors.textPrimary,
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: colors.textSecondary, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                      {t('XML Template')}
                      <span style={{ color: colors.textSecondary, opacity: 0.7, marginLeft: '0.5rem' }}>
                        {'({' + '{company.name}}, {' + '{company.address}}, {' + '{document.title}}, {' + '{document.date}}, {' + '{document.ref}' + '})'}
                      </span>
                    </label>
                    <Textarea
                      value={formData.xml_content}
                      onChange={(e) => setFormData({ ...formData, xml_content: e.target.value })}
                      disabled={!isEditing}
                      style={{
                        backgroundColor: isEditing ? colors.background : 'transparent',
                        border: isEditing ? `1px solid ${colors.border}` : `1px solid ${colors.border}`,
                        color: colors.textPrimary,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        minHeight: '200px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </>
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
            {showPreview && selectedHeader ? (
              <div style={{
                backgroundColor: '#fff',
                width: '100%',
                maxWidth: '600px',
                minHeight: '200px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                borderRadius: '4px'
              }}>
                <style>{`
                  .preview-report-title {
                    font-size: 24px;
                    font-weight: 700;
                    color: #1a1a1a;
                    text-align: center;
                    padding-bottom: 0.5rem;
                    margin-bottom: 1rem;
                    border-bottom: 2px solid #333;
                  }
                  .preview-company-name {
                    font-size: 16px;
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
                {renderPreview(formData.xml_content)}
              </div>
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

      {/* Delete Alert */}
      <Alert
        isOpen={deleteAlertOpen}
        title={t('Delete Header?')}
        description={t('This action cannot be undone')}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        onConfirm={() => headerToDelete && handleDelete(headerToDelete)}
        onCancel={() => {
          setDeleteAlertOpen(false)
          setHeaderToDelete(null)
        }}
        colors={colors}
      />
    </div>
  )
}
