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

interface ReportFooter {
  id: number
  name: string
  description?: string
  xml_content: string
  is_default: boolean
  created_at: string
  updated_at: string
}

const DEFAULT_FOOTER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<footer>
  <page-numbering>
    <current>{{page.current}}</current>
    <total>{{page.total}}</total>
  </page-numbering>
  <company-signature>{{company.name}}</company-signature>
  <notes>{{document.notes}}</notes>
</footer>`

const MOCK_COMPANY = {
  name: 'ACME Corporation'
}

const MOCK_PAGE = {
  current: '1',
  total: '3'
}

const MOCK_DOCUMENT = {
  notes: 'Thank you for your business!'
}

export default function ReportFootersPage() {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const { sessionId } = useAuth()

  const [footers, setFooters] = useState<ReportFooter[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFooter, setSelectedFooter] = useState<ReportFooter | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [footerToDelete, setFooterToDelete] = useState<number | null>(null)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    xml_content: DEFAULT_FOOTER_XML
  })

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchFooters = async () => {
    setLoading(true)
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const fetchOptions: Record<string, string> = { 'Content-Type': 'application/json' }
      if (tenantId) fetchOptions['X-Tenant-ID'] = tenantId

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/footers`, {
        method: 'GET',
        headers: fetchOptions
      })

      if (response.ok) {
        const result = await response.json()
        const data = result.data?.footers || result.footers || []
        setFooters(data)
        if (data.length > 0 && !selectedFooter) {
          setSelectedFooter(data[0])
        }
      } else {
        // Mock data for development
        const mockData: ReportFooter[] = [
          {
            id: 1,
            name: 'Standard Footer',
            description: 'Page numbering with company signature',
            xml_content: DEFAULT_FOOTER_XML,
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
        setFooters(mockData)
        if (!selectedFooter) setSelectedFooter(mockData[0])
      }
    } catch (error) {
      console.error('Error fetching footers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFooters()
  }, [sessionId])

  const handleSave = async () => {
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const fetchOptions: Record<string, string> = { 'Content-Type': 'application/json' }
      if (tenantId) fetchOptions['X-Tenant-ID'] = tenantId

      const endpoint = selectedFooter?.id ? `/reports/footers/${selectedFooter.id}` : '/reports/footers'
      const method = selectedFooter?.id ? 'PUT' : 'POST'

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}${endpoint}`, {
        method,
        headers: fetchOptions,
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        showToast(t('Footer saved'), 'success')
        setIsEditing(false)
        fetchFooters()
      } else {
        showToast(t('Failed to save footer'), 'error')
      }
    } catch (error) {
      console.error('Error saving footer:', error)
      showToast(t('Error saving footer'), 'error')
    }
  }

  const handleDelete = async (footerId: number) => {
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const fetchOptions: Record<string, string> = { 'Content-Type': 'application/json' }
      if (tenantId) fetchOptions['X-Tenant-ID'] = tenantId

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/footers/${footerId}`, {
        method: 'DELETE',
        headers: fetchOptions
      })

      if (response.ok) {
        showToast(t('Footer deleted'), 'success')
        fetchFooters()
      } else {
        showToast(t('Failed to delete footer'), 'error')
      }
    } catch (error) {
      showToast(t('Error deleting footer'), 'error')
    }
    setDeleteAlertOpen(false)
    setFooterToDelete(null)
  }

  const handleSetDefault = async (footerId: number) => {
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const fetchOptions: Record<string, string> = { 'Content-Type': 'application/json' }
      if (tenantId) fetchOptions['X-Tenant-ID'] = tenantId

      await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/footers/${footerId}/set-default`, {
        method: 'POST',
        headers: fetchOptions
      })

      fetchFooters()
      showToast(t('Default footer updated'), 'success')
    } catch (error) {
      showToast(t('Error setting default'), 'error')
    }
  }

  const startNewFooter = () => {
    const newFooter: ReportFooter = {
      id: 0,
      name: 'New Footer',
      description: '',
      xml_content: DEFAULT_FOOTER_XML,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setSelectedFooter(newFooter)
    setFormData({
      name: 'New Footer',
      description: '',
      xml_content: DEFAULT_FOOTER_XML
    })
    setIsEditing(true)
  }

  const renderPreview = (xml: string) => {
    // Parse XML and create preview HTML
    let html = xml
      .replace(/<footer>([\s\S]*?)<\/footer>/gi, (_, content) => content)
      .replace(/<current>{{(.*?)}}<\/current>/g, () => `<span class="preview-page-current">${MOCK_PAGE.current}</span>`)
      .replace(/<total>{{(.*?)}}<\/total>/g, () => `<span class="preview-page-total">${MOCK_PAGE.total}</span>`)
      .replace(/<company-signature>{{(.*?)}}<\/company-signature>/g, () => `<div class="preview-company-signature">${MOCK_COMPANY.name}</div>`)
      .replace(/<notes>{{(.*?)}}<\/notes>/g, () => `<div class="preview-notes">${MOCK_DOCUMENT.notes}</div>`)
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
            {t('Report Footers')}
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
            {t('Manage XML templates for report footers')}
          </p>
        </div>
        <Button
          onClick={startNewFooter}
          style={{ backgroundColor: colors.action, color: '#fff' }}
        >
          <Plus size={16} className={isRTL ? 'ml-2' : 'mr-2'} />
          {t('New Footer')}
        </Button>
      </div>

      {/* Main Content - Split View */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left Sidebar - Footers List & Editor */}
        <div style={{
          width: '450px',
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: colors.card
        }}>

          {/* Footers List */}
          <div style={{
            padding: '1rem',
            borderBottom: `1px solid ${colors.border}`,
            overflowY: 'auto',
            maxHeight: '40%'
          }}>
            <h3 style={{ color: colors.textSecondary, fontSize: '0.75rem', textTransform: 'uppercase', margin: '0 0 0.75rem 0' }}>
              {t('Footers')}
            </h3>
            <div className="space-y-2">
              {footers.map((footer) => (
                <div
                  key={footer.id}
                  onClick={() => {
                    setSelectedFooter(footer)
                    setFormData({
                      name: footer.name,
                      description: footer.description || '',
                      xml_content: footer.xml_content
                    })
                    setIsEditing(false)
                  }}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: selectedFooter?.id === footer.id ? `${colors.action}20` : 'transparent',
                    border: selectedFooter?.id === footer.id ? `1px solid ${colors.action}` : `1px solid transparent`,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: colors.textPrimary, fontWeight: '500', fontSize: '0.875rem' }}>
                        {footer.name}
                      </span>
                      {footer.is_default && (
                        <Check size={14} style={{ color: colors.action }} />
                      )}
                    </div>
                    {footer.description && (
                      <p style={{ color: colors.textSecondary, fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                        {footer.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {footers.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: colors.textSecondary, fontSize: '0.875rem' }}>
                  {t('No footers found')}
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
            {!selectedFooter && !isEditing ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: colors.textSecondary }}>
                <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>{t('Select a footer or create a new one')}</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: colors.textPrimary, fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                    {isEditing ? t('Edit Footer') : t('Footer Details')}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectedFooter?.id && !isEditing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(selectedFooter.id)}
                          disabled={selectedFooter.is_default}
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
                            setFooterToDelete(selectedFooter.id)
                            setDeleteAlertOpen(true)
                          }}
                          disabled={selectedFooter.is_default}
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
                            if (selectedFooter?.id) {
                              const original = footers.find(f => f.id === selectedFooter.id)
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
                        {'({' + '{page.current}}, {' + '{page.total}}, {' + '{company.name}}, {' + '{document.notes}' + '})'}
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
            alignItems: 'flex-end'
          }}>
            {showPreview && selectedFooter ? (
              <div style={{
                backgroundColor: '#fff',
                width: '100%',
                maxWidth: '600px',
                minHeight: '150px',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
                borderRadius: '4px',
                borderTop: `1px solid #ccc`,
                padding: '1rem'
              }}>
                <style>{`
                  .preview-page-current {
                    font-weight: 600;
                    color: #333;
                  }
                  .preview-page-total {
                    color: #666;
                  }
                  .preview-company-signature {
                    font-size: 14px;
                    font-weight: 500;
                    color: #333;
                    margin-top: 0.5rem;
                  }
                  .preview-notes {
                    font-size: 12px;
                    color: #666;
                    font-style: italic;
                    margin-top: 0.5rem;
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
        title={t('Delete Footer?')}
        description={t('This action cannot be undone')}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        onConfirm={() => footerToDelete && handleDelete(footerToDelete)}
        onCancel={() => {
          setDeleteAlertOpen(false)
          setFooterToDelete(null)
        }}
        colors={colors}
      />
    </div>
  )
}
