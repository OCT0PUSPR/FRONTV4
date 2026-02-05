"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Save, Loader2, AlertCircle, Plus } from "lucide-react"
import { TextField, Autocomplete, Checkbox, FormControlLabel } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import { API_CONFIG } from "../config/api"

interface FieldConfig {
  name: string
  label: string
  type: 'char' | 'integer' | 'float' | 'boolean' | 'many2one' | 'selection'
  required?: boolean
  placeholder?: string
  options?: { value: string | number; label: string }[]
  relationModel?: string // For many2one fields
  defaultValue?: any
}

interface CreateRecordModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (record: any) => void
  modelName: string
  title: string
  fields: FieldConfig[]
}

export function CreateRecordModal({
  isOpen,
  onClose,
  onCreated,
  modelName,
  title,
  fields,
}: CreateRecordModalProps) {
  const { t, i18n } = useTranslation()
  const { colors, mode } = useTheme()
  const { sessionId } = useAuth()
  const isDark = mode === 'dark'
  const isRTL = i18n.dir() === 'rtl'

  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [relationOptions, setRelationOptions] = useState<Record<string, any[]>>({})

  // Initialize form data with default values
  useEffect(() => {
    if (isOpen) {
      const initialData: Record<string, any> = {}
      fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          initialData[field.name] = field.defaultValue
        } else if (field.type === 'boolean') {
          initialData[field.name] = true
        } else if (field.type === 'float' || field.type === 'integer') {
          initialData[field.name] = field.type === 'float' ? 1.0 : 1
        } else {
          initialData[field.name] = ''
        }
      })
      setFormData(initialData)
      setErrors({})
      setGeneralError(null)
    }
  }, [isOpen, fields])

  // Get SmartFieldSelector headers
  const getSmartFieldHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const tenantId = localStorage.getItem('current_tenant_id')
    if (tenantId) headers['X-Tenant-ID'] = tenantId
    if (sessionId) headers['X-Odoo-Session'] = sessionId
    const odooBase = localStorage.getItem('odooBase')
    const odooDb = localStorage.getItem('odooDb')
    if (odooBase) headers['x-odoo-base'] = odooBase
    if (odooDb) headers['x-odoo-db'] = odooDb
    return headers
  }, [sessionId])

  // Fetch options for many2one fields
  useEffect(() => {
    if (!isOpen || !sessionId) return

    const fetchRelationOptions = async () => {
      const many2oneFields = fields.filter(f => f.type === 'many2one' && f.relationModel)

      for (const field of many2oneFields) {
        try {
          const headers = getSmartFieldHeaders()
          const res = await fetch(
            `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${field.relationModel}?limit=100&context=list`,
            { method: 'GET', headers }
          )
          const data = await res.json()
          if (data.success) {
            setRelationOptions(prev => ({
              ...prev,
              [field.name]: data.records || []
            }))
          }
        } catch (err) {
          console.error(`Failed to fetch options for ${field.name}:`, err)
        }
      }
    }

    fetchRelationOptions()
  }, [isOpen, sessionId, fields, getSmartFieldHeaders])

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    fields.forEach(field => {
      if (field.required) {
        const value = formData[field.name]
        if (value === undefined || value === null || value === '') {
          newErrors[field.name] = t('This field is required')
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return

    setSaving(true)
    setGeneralError(null)

    try {
      const headers = getSmartFieldHeaders()

      // Prepare data for Odoo
      const data: Record<string, any> = {}
      fields.forEach(field => {
        const value = formData[field.name]
        if (value !== undefined && value !== null && value !== '') {
          if (field.type === 'many2one' && typeof value === 'object') {
            data[field.name] = value.id
          } else {
            data[field.name] = value
          }
        }
      })

      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${modelName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data }),
      })

      const result = await res.json()

      if (result.success) {
        onCreated(result.record || { id: result.id, ...data })
        onClose()
      } else {
        throw new Error(result.error || t('Failed to create'))
      }
    } catch (err: any) {
      setGeneralError(err.message || t('Failed to create'))
    } finally {
      setSaving(false)
    }
  }

  // Handle field change
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Render field based on type
  const renderField = (field: FieldConfig) => {
    const hasError = !!errors[field.name]
    const errorStyle = hasError ? { borderColor: '#ef4444' } : {}

    switch (field.type) {
      case 'boolean':
        return (
          <FormControlLabel
            key={field.name}
            control={
              <Checkbox
                checked={formData[field.name] || false}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                sx={{
                  color: colors.textSecondary,
                  '&.Mui-checked': { color: colors.action },
                }}
              />
            }
            label={
              <span style={{ color: colors.textPrimary, fontSize: '0.875rem' }}>
                {field.label}
                {field.required && <span style={{ color: '#ef4444', marginInlineStart: '4px' }}>*</span>}
              </span>
            }
          />
        )

      case 'selection':
        return (
          <Autocomplete
            key={field.name}
            size="small"
            options={field.options || []}
            getOptionLabel={(option) => option.label}
            value={(field.options || []).find(o => o.value === formData[field.name]) || null}
            onChange={(_, newValue) => handleFieldChange(field.name, newValue?.value || '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label={
                  <span>
                    {field.label}
                    {field.required && <span style={{ color: '#ef4444', marginInlineStart: '4px' }}>*</span>}
                  </span>
                }
                error={hasError}
                helperText={errors[field.name]}
                placeholder={field.placeholder}
              />
            )}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                background: colors.background,
                '& fieldset': { borderColor: hasError ? '#ef4444' : colors.border },
                '&:hover fieldset': { borderColor: hasError ? '#ef4444' : colors.action },
                '&.Mui-focused fieldset': { borderColor: hasError ? '#ef4444' : colors.action },
              },
              '& .MuiInputLabel-root': { color: hasError ? '#ef4444' : colors.textSecondary },
              '& .MuiInputBase-input': { color: colors.textPrimary },
            }}
          />
        )

      case 'many2one':
        const options = relationOptions[field.name] || []
        return (
          <Autocomplete
            key={field.name}
            size="small"
            options={options}
            getOptionLabel={(option) => option.name || option.display_name || ''}
            value={options.find((o: any) => o.id === (typeof formData[field.name] === 'object' ? formData[field.name]?.id : formData[field.name])) || null}
            onChange={(_, newValue) => handleFieldChange(field.name, newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={
                  <span>
                    {field.label}
                    {field.required && <span style={{ color: '#ef4444', marginInlineStart: '4px' }}>*</span>}
                  </span>
                }
                error={hasError}
                helperText={errors[field.name]}
                placeholder={field.placeholder}
              />
            )}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                background: colors.background,
                '& fieldset': { borderColor: hasError ? '#ef4444' : colors.border },
                '&:hover fieldset': { borderColor: hasError ? '#ef4444' : colors.action },
                '&.Mui-focused fieldset': { borderColor: hasError ? '#ef4444' : colors.action },
              },
              '& .MuiInputLabel-root': { color: hasError ? '#ef4444' : colors.textSecondary },
              '& .MuiInputBase-input': { color: colors.textPrimary },
            }}
          />
        )

      case 'integer':
      case 'float':
        return (
          <TextField
            key={field.name}
            size="small"
            type="number"
            label={
              <span>
                {field.label}
                {field.required && <span style={{ color: '#ef4444', marginInlineStart: '4px' }}>*</span>}
              </span>
            }
            value={formData[field.name] ?? ''}
            onChange={(e) => handleFieldChange(field.name, field.type === 'integer' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
            placeholder={field.placeholder}
            error={hasError}
            helperText={errors[field.name]}
            fullWidth
            inputProps={{ step: field.type === 'float' ? 0.01 : 1 }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                background: colors.background,
                '& fieldset': { borderColor: hasError ? '#ef4444' : colors.border },
                '&:hover fieldset': { borderColor: hasError ? '#ef4444' : colors.action },
                '&.Mui-focused fieldset': { borderColor: hasError ? '#ef4444' : colors.action },
              },
              '& .MuiInputLabel-root': { color: hasError ? '#ef4444' : colors.textSecondary },
              '& .MuiInputBase-input': { color: colors.textPrimary },
            }}
          />
        )

      default: // char
        return (
          <TextField
            key={field.name}
            size="small"
            label={
              <span>
                {field.label}
                {field.required && <span style={{ color: '#ef4444', marginInlineStart: '4px' }}>*</span>}
              </span>
            }
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            error={hasError}
            helperText={errors[field.name]}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                background: colors.background,
                '& fieldset': { borderColor: hasError ? '#ef4444' : colors.border },
                '&:hover fieldset': { borderColor: hasError ? '#ef4444' : colors.action },
                '&.Mui-focused fieldset': { borderColor: hasError ? '#ef4444' : colors.action },
              },
              '& .MuiInputLabel-root': { color: hasError ? '#ef4444' : colors.textSecondary },
              '& .MuiInputBase-input': { color: colors.textPrimary },
            }}
          />
        )
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 2000,
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '480px',
              maxHeight: '90vh',
              background: colors.card,
              borderRadius: '16px',
              boxShadow: isDark
                ? '0 24px 48px rgba(0, 0, 0, 0.5)'
                : '0 24px 48px rgba(0, 0, 0, 0.15)',
              zIndex: 2001,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              direction: isRTL ? 'rtl' : 'ltr',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `${colors.action}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Plus size={20} color={colors.action} />
                </div>
                <h2 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: colors.textPrimary,
                  margin: 0,
                }}>
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.mutedBg
                  e.currentTarget.style.color = colors.textPrimary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = colors.textSecondary
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              {generalError && (
                <div style={{
                  padding: '12px 16px',
                  background: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)'}`,
                  borderRadius: '10px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <AlertCircle size={18} color="#ef4444" />
                  <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>{generalError}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {fields.map(field => renderField(field))}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              gap: '12px',
            }}>
              <button
                onClick={onClose}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textPrimary,
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: colors.action,
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t('Creating...')}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {t('Create')}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default CreateRecordModal
