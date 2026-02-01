"use client"

import { useState, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react"
import { useTheme } from "../../../../context/theme"
import { useAuth } from "../../../../context/auth"
import type { FileAnalysis } from "../types/import.types"
import { IMPORT_COLORS } from "../types/import.types"
import { sanitizeErrorMessage } from "../../../utils/errorSanitizer"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3006'

interface UploadStepProps {
  onFileAnalyzed: (file: File, filePath: string, analysis: FileAnalysis) => void
  error: string | null
  setError: (error: string | null) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export function UploadStep({ onFileAnalyzed, error, setError, isLoading, setIsLoading }: UploadStepProps) {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const { sessionId } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('current_tenant_id') : null

  const handleFileSelect = useCallback(async (file: File) => {
    if (!sessionId) {
      setError(t('No session found. Please log in again.'))
      return
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    const validExtensions = ['.xlsx', '.xls']
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      setError(t('Invalid file type. Please upload an Excel file (.xlsx or .xls)'))
      return
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError(t('File too large. Maximum size is 50MB.'))
      return
    }

    setError(null)
    setIsLoading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Create XHR for progress tracking
      const xhr = new XMLHttpRequest()

      const response = await new Promise<any>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(progress)
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText))
            } catch {
              reject(new Error('Invalid response from server'))
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText)
              reject(new Error(err.message || 'Upload failed'))
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          }
        }

        xhr.onerror = () => reject(new Error('Network error'))
        xhr.ontimeout = () => reject(new Error('Upload timed out'))

        xhr.open('POST', `${API_BASE_URL}/dynamic-import/analyze`)
        xhr.setRequestHeader('x-session-id', sessionId)
        if (tenantId) {
          xhr.setRequestHeader('x-tenant-id', tenantId)
        }
        xhr.timeout = 120000 // 2 minutes
        xhr.send(formData)
      })

      if (response.success) {
        onFileAnalyzed(file, response.filePath, response.analysis)
      } else {
        setError(sanitizeErrorMessage(response.message || t('Failed to analyze file')))
      }
    } catch (err: any) {
      console.error('[UploadStep] Error:', err)
      setError(sanitizeErrorMessage(err.message || t('Failed to upload file')))
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }, [sessionId, tenantId, onFileAnalyzed, setError, setIsLoading, t])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFileSelect])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Upload Area */}
      <div
        onClick={!isLoading ? handleClick : undefined}
        onDrop={!isLoading ? handleDrop : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          width: '100%',
          padding: '3rem 2rem',
          borderRadius: '16px',
          border: `2px dashed ${isDragOver ? IMPORT_COLORS.primary : colors.border}`,
          background: isDragOver
            ? (mode === 'dark' ? 'rgba(220,38,38,0.1)' : 'rgba(220,38,38,0.05)')
            : (mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          textAlign: 'center',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={isLoading}
        />

        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '18px',
            background: `linear-gradient(135deg, ${IMPORT_COLORS.primary}15, ${IMPORT_COLORS.primary}05)`,
            border: `1px solid ${IMPORT_COLORS.primary}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          {isLoading ? (
            <div
              style={{
                width: '32px',
                height: '32px',
                border: `3px solid ${IMPORT_COLORS.primary}30`,
                borderTopColor: IMPORT_COLORS.primary,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          ) : (
            <Upload size={32} color={IMPORT_COLORS.primary} />
          )}
        </div>

        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: colors.textPrimary,
          margin: '0 0 0.5rem',
        }}>
          {isLoading
            ? t('Analyzing file...')
            : isDragOver
              ? t('Drop your file here')
              : t('Upload Excel File')
          }
        </h3>

        <p style={{
          fontSize: '0.875rem',
          color: colors.textSecondary,
          margin: 0,
        }}>
          {isLoading
            ? uploadProgress > 0
              ? `${uploadProgress}% ${t('uploaded')}`
              : t('Please wait...')
            : t('Drag and drop or click to browse')
          }
        </p>

        {isLoading && uploadProgress > 0 && (
          <div style={{
            marginTop: '1rem',
            height: '4px',
            background: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div
              style={{
                height: '100%',
                width: `${uploadProgress}%`,
                background: IMPORT_COLORS.primary,
                borderRadius: '2px',
                transition: 'width 0.3s',
              }}
            />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: `${IMPORT_COLORS.error}10`,
            border: `1px solid ${IMPORT_COLORS.error}30`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertCircle size={20} color={IMPORT_COLORS.error} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem', color: IMPORT_COLORS.error }}>{error}</span>
        </div>
      )}

      {/* Info Section - Formats & Features Combined */}
      <div style={{
        width: '100%',
        padding: '1.5rem',
        borderRadius: '12px',
        background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
      }}>
        {/* Supported Formats Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: '500',
            color: colors.textSecondary,
          }}>
            {t('Supported Formats')}:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['.xlsx', '.xls'].map(ext => (
              <div
                key={ext}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                  background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  color: colors.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <FileSpreadsheet size={14} />
                {ext}
              </div>
            ))}
          </div>
          <span style={{
            fontSize: '0.75rem',
            color: colors.textSecondary,
            opacity: 0.7,
          }}>
            ({t('Max 50MB')})
          </span>
        </div>

        {/* Divider */}
        <div style={{
          width: '80%',
          maxWidth: '400px',
          height: '1px',
          background: colors.border,
        }} />

        {/* Features Grid - Centered */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0.75rem 1.5rem',
        }}>
          {[
            { icon: CheckCircle2, text: t('Auto-detect sheet patterns') },
            { icon: CheckCircle2, text: t('Configurable field mapping') },
            { icon: CheckCircle2, text: t('Parent-child relationships') },
            { icon: CheckCircle2, text: t('Real-time progress tracking') },
          ].map((feature, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: colors.textSecondary,
              }}
            >
              <feature.icon size={16} color={IMPORT_COLORS.success} />
              {feature.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default UploadStep
