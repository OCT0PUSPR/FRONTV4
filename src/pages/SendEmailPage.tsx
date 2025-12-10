/**
 * Send Email Page
 * Allows users to send custom emails with HTML editor, attachments, and SMTP configuration
 */

import React, { useState, useEffect } from 'react'
import { useTheme } from '../../context/theme'
import { useTranslation } from 'react-i18next'
import { API_CONFIG, getTenantHeaders } from '../config/api'
import { CustomInput } from '../components/CusotmInput'
import { CustomDropdown } from '../components/NewCustomDropdown'
import { NewCustomButton } from '../components/NewCustomButton'
import Toast from '../components/Toast'
import {
  Mail,
  Send,
  Paperclip,
  X,
  Loader2,
  Eye,
  Code,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface Attachment {
  id: string
  file: File
  name: string
  size: number
  type: string
}

interface SmtpConfig {
  id: string
  name: string
  from_email: string
  from_name: string
  is_default: boolean
}

export default function SendEmailPage() {
  const { colors, mode } = useTheme()
  const { t } = useTranslation()
  
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [textBody, setTextBody] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfig[]>([])
  const [selectedSmtpId, setSelectedSmtpId] = useState<string>('')
  const [isSending, setIsSending] = useState(false)
  const [toast, setToast] = useState<{ text: string; state: 'success' | 'error' } | null>(null)
  const [editorMode, setEditorMode] = useState<'html' | 'preview'>('html')
  const [showTextEditor, setShowTextEditor] = useState(false)

  // Load SMTP configs
  useEffect(() => {
    loadSmtpConfigs()
  }, [])

  const loadSmtpConfigs = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/mailer/smtp`, {
        headers: getTenantHeaders()
      })
      if (response.ok) {
        const configs = await response.json()
        setSmtpConfigs(configs)
        const defaultConfig = configs.find((c: SmtpConfig) => c.is_default)
        if (defaultConfig) {
          setSelectedSmtpId(defaultConfig.id)
        } else if (configs.length > 0) {
          setSelectedSmtpId(configs[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load SMTP configs:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newAttachments: Attachment[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }))
    setAttachments(prev => [...prev, ...newAttachments])
    e.target.value = '' // Reset input
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const convertHtmlToText = (html: string): string => {
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const sendEmail = async () => {
    // Validation
    if (!to.trim()) {
      setToast({ text: 'Please enter a recipient email address', state: 'error' })
      return
    }
    if (!subject.trim()) {
      setToast({ text: 'Please enter a subject', state: 'error' })
      return
    }
    if (!htmlBody.trim() && !textBody.trim()) {
      setToast({ text: 'Please enter email body content', state: 'error' })
      return
    }

    setIsSending(true)
    setToast(null)

    try {
      // Prepare attachments
      const attachmentData = await Promise.all(
        attachments.map(async (att) => {
          const arrayBuffer = await att.file.arrayBuffer()
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          )
          return {
            filename: att.name,
            content: base64,
            contentType: att.type,
            encoding: 'base64'
          }
        })
      )

      // Parse CC emails
      const ccEmails = cc
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0)

      // Prepare email payload
      const payload: any = {
        to: to.trim(),
        subject: subject.trim(),
        html: htmlBody.trim() || `<p>${textBody.trim()}</p>`,
        text: textBody.trim() || convertHtmlToText(htmlBody),
        attachments: attachmentData.length > 0 ? attachmentData : undefined
      }

      if (ccEmails.length > 0) {
        payload.cc = ccEmails.join(', ')
      }

      if (selectedSmtpId) {
        payload.smtpConfigId = selectedSmtpId
      }

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/mailer/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        setToast({ text: 'Email sent successfully!', state: 'success' })
        // Reset form
        setTo('')
        setCc('')
        setSubject('')
        setHtmlBody('')
        setTextBody('')
        setAttachments([])
      } else {
        setToast({ text: result.message || 'Failed to send email', state: 'error' })
      }
    } catch (error: any) {
      console.error('Error sending email:', error)
      setToast({ text: error.message || 'Failed to send email', state: 'error' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      className="min-h-screen p-8"
      style={{ backgroundColor: colors.background }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: colors.textPrimary }}>
            Send Email
          </h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Compose and send custom emails using your SMTP configuration
          </p>
        </div>

        {/* Main Form Card */}
        <div
          className="rounded-2xl border p-8"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border
          }}
        >
          <div className="space-y-6">
            {/* SMTP Configuration */}
            {smtpConfigs.length > 0 && (
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    marginBottom: "0.5rem",
                  }}
                >
                  SMTP Configuration
                </label>
                <CustomDropdown
                  label=""
                  values={smtpConfigs.map(c => `${c.id}::${c.name}${c.is_default ? ' (Default)' : ''}`)}
                  type="single"
                  defaultValue={selectedSmtpId ? `${selectedSmtpId}::${smtpConfigs.find(c => c.id === selectedSmtpId)?.name || ''}` : undefined}
                  onChange={(v) => {
                    const id = typeof v === 'string' ? v.split('::')[0] : ''
                    setSelectedSmtpId(id)
                  }}
                />
              </div>
            )}

            {/* To */}
            <div>
              <CustomInput
                label="To"
                type="email"
                value={to}
                onChange={setTo}
                placeholder="recipient@example.com"
              />
            </div>

            {/* CC */}
            <div>
              <CustomInput
                label="CC (Optional)"
                type="text"
                value={cc}
                onChange={setCc}
                placeholder="cc1@example.com, cc2@example.com"
              />
            </div>

            {/* Subject */}
            <div>
              <CustomInput
                label="Subject"
                type="text"
                value={subject}
                onChange={setSubject}
                placeholder="Email subject"
              />
            </div>

            {/* Attachments */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: colors.textPrimary,
                  marginBottom: "0.5rem",
                }}
              >
                Attachments
              </label>
              <div className="flex items-center gap-4">
                <label
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors hover:opacity-80"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    color: colors.textPrimary
                  }}
                >
                  <Paperclip size={16} />
                  <span className="text-sm font-medium">Add Files</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
                {attachments.length > 0 && (
                  <span className="text-xs" style={{ color: colors.textSecondary }}>
                    {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
                  </span>
                )}
              </div>
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map(att => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      style={{
                        borderColor: colors.border,
                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {att.type.startsWith('image/') ? (
                          <ImageIcon size={18} style={{ color: colors.textSecondary }} />
                        ) : (
                          <FileText size={18} style={{ color: colors.textSecondary }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: colors.textPrimary }}>
                            {att.name}
                          </p>
                          <p className="text-xs" style={{ color: colors.textSecondary }}>
                            {formatFileSize(att.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="p-1 rounded hover:bg-black/5 transition-colors"
                        style={{ color: colors.textSecondary }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email Body */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: colors.textPrimary,
                  }}
                >
                  Email Body
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTextEditor(!showTextEditor)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: showTextEditor ? colors.action : 'transparent',
                      color: showTextEditor ? '#fff' : colors.textPrimary
                    }}
                  >
                    {showTextEditor ? 'HTML Editor' : 'Text Editor'}
                  </button>
                  {!showTextEditor && (
                    <button
                      onClick={() => setEditorMode(editorMode === 'html' ? 'preview' : 'html')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5"
                      style={{
                        borderColor: colors.border,
                        backgroundColor: editorMode === 'preview' ? colors.action : 'transparent',
                        color: editorMode === 'preview' ? '#fff' : colors.textPrimary
                      }}
                    >
                      {editorMode === 'html' ? (
                        <>
                          <Eye size={14} />
                          Preview
                        </>
                      ) : (
                        <>
                          <Code size={14} />
                          HTML
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {showTextEditor ? (
                <textarea
                  value={textBody}
                  onChange={(e) => {
                    setTextBody(e.target.value)
                    setHtmlBody('')
                  }}
                  placeholder="Enter plain text email content..."
                  rows={12}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "0.75rem",
                    fontSize: "14px",
                    color: colors.textPrimary,
                    outline: "none",
                    transition: "all 0.2s ease",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#ec4899'
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(236, 72, 153, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              ) : editorMode === 'html' ? (
                <textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  placeholder="Enter HTML email content... (e.g., &lt;p&gt;Hello World&lt;/p&gt;)"
                  rows={12}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "0.75rem",
                    fontSize: "14px",
                    color: colors.textPrimary,
                    outline: "none",
                    transition: "all 0.2s ease",
                    fontFamily: "monospace",
                    resize: "vertical",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#ec4899'
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(236, 72, 153, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              ) : (
                <div
                  className="border rounded-lg p-6 min-h-[300px] overflow-auto"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff',
                    color: colors.textPrimary
                  }}
                  dangerouslySetInnerHTML={{ __html: htmlBody || '<p style="color: #999;">Preview will appear here...</p>' }}
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
              <NewCustomButton
                onClick={() => {
                  setTo('')
                  setCc('')
                  setSubject('')
                  setHtmlBody('')
                  setTextBody('')
                  setAttachments([])
                  setToast(null)
                }}
                label="Clear"
                backgroundColor="transparent"
                textColor={colors.textSecondary}
                disabled={isSending}
              />
              <NewCustomButton
                onClick={sendEmail}
                disabled={isSending || !to.trim() || !subject.trim() || (!htmlBody.trim() && !textBody.trim())}
                icon={isSending ? Loader2 : Send}
                label={isSending ? 'Sending...' : 'Send Email'}
                backgroundColor={colors.action}
              />
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}

