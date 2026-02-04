"use client"

import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { useNavigate, useLocation, matchPath } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Package, Hash, Radio, MapPin, Box, Calendar,
  RefreshCcw, Edit, X, Save, Loader2, Search, Grid3X3,
  List, ChevronDown, FileText, Tag, Barcode, AlertCircle,
  CheckCircle, Clock, Archive, Trash2, Eye, Factory, Cpu,
  User, FileWarning, CalendarX, StickyNote, QrCode, Upload
} from "lucide-react"

// Lookup option types
interface LookupOption {
  id: number
  name: string
  code?: string
  parent_id?: number  // Parent ID for hierarchical lookups
}

interface SelectionOption {
  value: string
  label: string
}

// Dynamic lookup model info
interface DynamicLookup {
  modelName: string
  fieldName: string
  label: string
  data: LookupOption[]
  error?: string
  hasParentField?: boolean  // Whether this model has x_parent_id field
  isChild?: boolean  // Whether this is a child model (e.g., subcategory)
  parentFieldName?: string | null  // Field name of parent (e.g., x_category_id)
}

interface SerialLookups {
  // Dynamic lookups keyed by field name (e.g., x_brand_id, x_condition_id)
  lookups: Record<string, DynamicLookup>
  // Parent-child relationships: { childFieldName: parentFieldName }
  relationships: Record<string, string>
  // Legacy fields for backward compatibility
  brands: LookupOption[]
  manufacturers: LookupOption[]
  models: LookupOption[]
  custodians: LookupOption[]
  // Selection fields (static, not from models)
  conditions: SelectionOption[]
  disposalStatuses: SelectionOption[]
}
import { Autocomplete, TextField, createTheme, ThemeProvider } from "@mui/material"
import { StatCard } from "./components/StatCard"
import { Button } from "../@/components/ui/button"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import Toast from "./components/Toast"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { TransfersTable } from "./components/TransfersTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import { useSerialNumbers, DEFAULT_VISIBLE_COLUMNS } from "./hooks/useSerialNumbers"
import { API_CONFIG } from "./config/api"
import { SerialImportModal } from "./components/SerialImportModal"

// Sidebar component for Serial Number view/edit/create
function SerialNumberSidebar({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const { colors, mode } = useTheme()
  const isDark = mode === 'dark'

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) onClose()
  }, [isOpen, onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
            }}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '480px',
              maxWidth: '100vw',
              background: colors.background,
              boxShadow: isDark
                ? '-12px 0 48px rgba(0, 0, 0, 0.5)'
                : '-12px 0 48px rgba(0, 0, 0, 0.12)',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '12px 16px',
              background: colors.card,
              borderBottom: `1px solid ${colors.border}`,
              flexShrink: 0,
            }}>
              <button
                onClick={onClose}
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '10px',
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
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Serial Number Record Panel for sidebar content
function SerialNumberRecordPanel({
  recordId,
  isCreating,
  onClose,
  onSave,
}: {
  recordId?: number
  isCreating?: boolean
  onClose: () => void
  onSave: () => void
}) {
  const { t, i18n } = useTranslation()
  const { colors, mode } = useTheme()
  const { sessionId } = useAuth()
  const isRTL = i18n.dir() === 'rtl'
  const isDark = mode === 'dark'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fieldsReady, setFieldsReady] = useState(false)
  const [record, setRecord] = useState<any>(null)
  // Dynamic form data - will be populated with all lookup field IDs
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    x_rfid: '',
    product_id: null,
    product_name: '',
    ref: '',
    // Selection fields (static)
    x_condition: '',
    x_disposal_status: '',
    // Other fields
    x_description: '',
    x_original_barcode: '',
    x_ams_item_id: '',
    x_disposal_date: '',
  })
  const [products, setProducts] = useState<any[]>([])
  const [lookups, setLookups] = useState<SerialLookups>({
    lookups: {},
    relationships: {},
    brands: [],
    manufacturers: [],
    models: [],
    custodians: [],
    conditions: [],
    disposalStatuses: [],
  })
  // List of discovered dynamic lookup field names
  const [dynamicLookupFields, setDynamicLookupFields] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // MUI theme for Autocomplete
  const muiTheme = useMemo(() => createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
    },
    components: {
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.12)',
          },
          listbox: {
            backgroundColor: colors.card,
          },
          option: {
            '&[aria-selected="true"]': {
              backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : 'rgba(14, 165, 233, 0.12)',
            },
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
          },
        },
      },
    },
  }), [isDark, colors])

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

  // Ensure all serial number fields exist on stock.lot model (dynamic version)
  const ensureSerialFields = async () => {
    try {
      const headers = getSmartFieldHeaders()
      // Use the new dynamic endpoint that discovers all x_ lookup models
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/import/serial-fields/ensure-dynamic`, {
        method: 'POST',
        headers,
      })
      const data = await res.json()
      if (data.success) {
        console.log('[SerialNumbers] Dynamic fields ensured:', data.message)
        console.log('[SerialNumbers] Fields created:', data.data?.fieldsCreated, 'Models found:', data.data?.modelsFound)
        setFieldsReady(true)
      } else {
        console.warn('[SerialNumbers] Could not ensure dynamic fields:', data.message)
        // Fall back to the original endpoint
        const fallbackRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/import/serial-fields/ensure`, {
          method: 'POST',
          headers,
        })
        const fallbackData = await fallbackRes.json()
        if (fallbackData.success) {
          console.log('[SerialNumbers] Fallback fields ensured:', fallbackData.message)
        }
        setFieldsReady(true)
      }
    } catch (err) {
      console.warn('[SerialNumbers] Error ensuring fields:', err)
      setFieldsReady(true) // Allow basic functionality even if this fails
    }
  }

  // Fetch lookup data dynamically from all discovered x_ models
  const fetchLookups = async () => {
    try {
      const headers = getSmartFieldHeaders()
      // Use the new dynamic lookups endpoint
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/import/serial-lookups-dynamic`, {
        method: 'GET',
        headers,
      })
      const data = await res.json()
      if (data.success && data.data) {
        const lookupsData = data.data

        // Set all lookups including dynamic ones and relationships
        setLookups({
          lookups: lookupsData.lookups || {},
          relationships: lookupsData.relationships || {},
          brands: lookupsData.brands || [],
          manufacturers: lookupsData.manufacturers || [],
          models: lookupsData.models || [],
          custodians: lookupsData.custodians || [],
          conditions: lookupsData.conditions || [],
          disposalStatuses: lookupsData.disposalStatuses || [],
        })

        // Extract dynamic lookup field names for rendering
        const dynamicFields = Object.keys(lookupsData.lookups || {})
        setDynamicLookupFields(dynamicFields)

        // Initialize form data with null values for all dynamic lookup fields
        setFormData(prev => {
          const updated = { ...prev }
          dynamicFields.forEach(fieldName => {
            if (!(fieldName in updated)) {
              updated[fieldName] = null
            }
          })
          return updated
        })

        // Log what was loaded
        const totalModels = Object.keys(lookupsData.lookups || {}).length
        const totalRecords = Object.values(lookupsData.lookups || {}).reduce((sum: number, l: any) => sum + (l.data?.length || 0), 0)
        const totalRelationships = Object.keys(lookupsData.relationships || {}).length
        console.log(`[SerialNumbers] Dynamic lookups loaded: ${totalModels} models, ${totalRecords} total records, ${totalRelationships} relationships`)
        Object.entries(lookupsData.lookups || {}).forEach(([fieldName, lookup]: [string, any]) => {
          console.log(`[SerialNumbers]   - ${fieldName} (${lookup.label}): ${lookup.data?.length || 0} records, isChild: ${lookup.isChild}, parent: ${lookup.parentFieldName}`)
        })
        if (totalRelationships > 0) {
          console.log(`[SerialNumbers] Relationships:`, lookupsData.relationships)
        }
      } else {
        // Fall back to original endpoint
        const fallbackRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/import/serial-lookups`, {
          method: 'GET',
          headers,
        })
        const fallbackData = await fallbackRes.json()
        if (fallbackData.success && fallbackData.data) {
          setLookups({
            lookups: {},
            relationships: {},
            brands: fallbackData.data.brands || [],
            manufacturers: fallbackData.data.manufacturers || [],
            models: fallbackData.data.models || [],
            custodians: fallbackData.data.custodians || [],
            conditions: fallbackData.data.conditions || [],
            disposalStatuses: fallbackData.data.disposalStatuses || [],
          })
          console.log('[SerialNumbers] Fallback lookups loaded')
        }
      }
    } catch (err) {
      console.warn('[SerialNumbers] Error fetching lookups:', err)
    }
  }

  // Fetch record data using SmartFieldSelector route
  const fetchRecord = async () => {
    if (!sessionId || !recordId) return
    setLoading(true)
    try {
      const headers = getSmartFieldHeaders()
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.lot/${recordId}?context=view`, {
        method: 'GET',
        headers,
      })
      const data = await res.json()
      if (data.success && data.record) {
        const rec = data.record
        setRecord(rec)

        // Build form data with static fields
        const newFormData: Record<string, any> = {
          name: rec.name || '',
          x_rfid: rec.x_rfid || '',
          product_id: Array.isArray(rec.product_id) ? rec.product_id[0] : rec.product_id,
          product_name: Array.isArray(rec.product_id) ? rec.product_id[1] : '',
          ref: rec.ref || '',
          // Selection fields
          x_condition: rec.x_condition || '',
          x_disposal_status: rec.x_disposal_status || '',
          // Other fields
          x_description: rec.x_description || '',
          x_original_barcode: rec.x_original_barcode || '',
          x_ams_item_id: rec.x_ams_item_id || '',
          x_disposal_date: rec.x_disposal_date || '',
        }

        // Add all dynamic lookup fields from the record
        // These are many2one fields ending with _id that link to x_ models
        Object.keys(rec).forEach(key => {
          if (key.startsWith('x_') && key.endsWith('_id')) {
            const value = rec[key]
            // Extract ID from [id, name] tuple or use value directly
            newFormData[key] = Array.isArray(value) ? value[0] : (value || null)
          }
        })

        // Also add any dynamic lookup fields that aren't in the record yet
        dynamicLookupFields.forEach(fieldName => {
          if (!(fieldName in newFormData)) {
            const value = rec[fieldName]
            newFormData[fieldName] = Array.isArray(value) ? value[0] : (value || null)
          }
        })

        setFormData(newFormData)
      } else if (!data.success) {
        throw new Error(data.error || 'Record not found')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load record')
    } finally {
      setLoading(false)
    }
  }

  // Fetch products for dropdown using SmartFieldSelector route
  const fetchProducts = async () => {
    if (!sessionId) return
    try {
      const headers = getSmartFieldHeaders()
      const domain = JSON.stringify([['type', 'in', ['product', 'consu']]])
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/product.product?domain=${encodeURIComponent(domain)}&limit=500&context=list`, {
        method: 'GET',
        headers,
      })
      const data = await res.json()
      if (data.success) {
        setProducts(data.records || [])
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      // Ensure all serial number fields exist on stock.lot
      await ensureSerialFields()
      // Fetch lookup data for dropdowns (brands, manufacturers, models)
      await fetchLookups()
      // Fetch products for the product dropdown
      await fetchProducts()
      // Fetch record if editing
      if (recordId && !isCreating) {
        await fetchRecord()
      } else {
        setLoading(false)
      }
    }
    init()
  }, [recordId, isCreating, sessionId])

  // Save handler using SmartFieldSelector routes
  const handleSave = async () => {
    if (!sessionId) return
    if (!formData.name.trim()) {
      setError(t('Serial number is required'))
      return
    }
    if (!formData.product_id && isCreating) {
      setError(t('Product is required'))
      return
    }

    setSaving(true)
    setError(null)

    try {
      const headers = getSmartFieldHeaders()
      const values: any = {
        name: formData.name.trim(),
      }

      // Basic fields
      if (formData.x_rfid?.trim()) values.x_rfid = formData.x_rfid.trim()
      if (formData.ref?.trim()) values.ref = formData.ref.trim()
      if (formData.product_id) values.product_id = formData.product_id

      // Add ALL dynamic lookup fields (many2one fields ending with _id)
      dynamicLookupFields.forEach(fieldName => {
        values[fieldName] = formData[fieldName] || false
      })

      // Selection fields - only set if there's a value, use false to clear
      values.x_condition = formData.x_condition || false
      values.x_disposal_status = formData.x_disposal_status || false

      // Text fields
      if (formData.x_description?.trim()) values.x_description = formData.x_description.trim()
      if (formData.x_original_barcode?.trim()) values.x_original_barcode = formData.x_original_barcode.trim()
      if (formData.x_ams_item_id?.trim()) values.x_ams_item_id = formData.x_ams_item_id.trim()

      // Date field
      if (formData.x_disposal_date) values.x_disposal_date = formData.x_disposal_date

      if (isCreating) {
        // Create new record using SmartFieldSelector route
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.lot`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            data: values,
            validate: true,
          })
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || data.message || 'Failed to create')
      } else if (recordId) {
        // Update existing record using SmartFieldSelector route
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.lot/${recordId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            data: values,
            validate: true,
          })
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || data.message || 'Failed to update')
      }

      onSave()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    return date.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <Loader2 size={28} color={colors.textSecondary} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ color: colors.textSecondary, fontSize: '0.875rem' }}>{t('Loading...')}</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header - Clean and minimal */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
          background: colors.card,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Hash size={24} color="#0ea5e9" strokeWidth={2} />
            <div>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: colors.textPrimary,
                margin: 0,
              }}>
                {isCreating ? t('New Serial Number') : record?.name || t('Serial Number')}
              </h2>
              {record && (
                <p style={{
                  fontSize: '0.8125rem',
                  color: colors.textSecondary,
                  margin: '2px 0 0 0',
                }}>
                  {t('Created')} {formatDate(record.create_date)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              background: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)'}`,
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <AlertCircle size={18} color="#ef4444" />
              <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Serial Number Field */}
            <TextField
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Barcode size={14} color="#0ea5e9" />
                  {t('Serial Number')}
                  <span style={{ color: '#ef4444' }}>*</span>
                </span>
              }
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('Enter serial number...')}
              size="small"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  background: colors.background,
                  fontFamily: 'monospace',
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: '#0ea5e9' },
                  '&.Mui-focused fieldset': { borderColor: '#0ea5e9' },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                '& .MuiInputBase-input': { color: colors.textPrimary },
              }}
            />

            {/* RFID Tag Field */}
            {fieldsReady && (
              <TextField
                label={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Radio size={14} color="#f59e0b" />
                    {t('RFID Tag')}
                  </span>
                }
                value={formData.x_rfid}
                onChange={(e) => setFormData(prev => ({ ...prev, x_rfid: e.target.value }))}
                placeholder={t('Scan or enter RFID...')}
                size="small"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    background: colors.background,
                    fontFamily: 'monospace',
                    '& fieldset': { borderColor: colors.border },
                    '&:hover fieldset': { borderColor: '#f59e0b' },
                    '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
                  },
                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                  '& .MuiInputBase-input': { color: colors.textPrimary },
                }}
              />
            )}

            {/* Product Field - MUI Autocomplete */}
            <Autocomplete
              size="small"
              options={products}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option
                return option.default_code ? `[${option.default_code}] ${option.name}` : option.name
              }}
              value={products.find(p => p.id === formData.product_id) || null}
              onChange={(_, newValue) => {
                setFormData(prev => ({
                  ...prev,
                  product_id: newValue?.id || null,
                  product_name: newValue ? (newValue.default_code ? `[${newValue.default_code}] ${newValue.name}` : newValue.name) : '',
                }))
              }}
              disabled={!isCreating && record?.product_id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Box size={14} color="#10b981" />
                      {t('Product')}
                      {isCreating && <span style={{ color: '#ef4444' }}>*</span>}
                    </span>
                  }
                  placeholder={t('Select product...')}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500, color: colors.textPrimary }}>
                      {option.name}
                    </span>
                    {option.default_code && (
                      <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                        {option.default_code}
                      </span>
                    )}
                  </div>
                </li>
              )}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  background: colors.background,
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: '#10b981' },
                  '&.Mui-focused fieldset': { borderColor: '#10b981' },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                '& .MuiInputBase-input': { color: colors.textPrimary },
                '& .Mui-disabled': {
                  opacity: 0.7,
                },
              }}
            />
            {!isCreating && record?.product_id && (
              <p style={{ fontSize: '0.75rem', color: colors.textSecondary, marginTop: '-12px' }}>
                {t('Product cannot be changed after creation')}
              </p>
            )}

            {/* Internal Reference Field */}
            <TextField
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={14} color="#8b5cf6" />
                  {t('Internal Reference')}
                </span>
              }
              value={formData.ref}
              onChange={(e) => setFormData(prev => ({ ...prev, ref: e.target.value }))}
              placeholder={t('Optional reference...')}
              size="small"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  background: colors.background,
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: '#8b5cf6' },
                  '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                '& .MuiInputBase-input': { color: colors.textPrimary },
              }}
            />

            {/* Divider for Asset Details */}
            <div style={{
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '8px',
              marginTop: '8px',
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {t('Asset Details')} {dynamicLookupFields.length > 0 && `(${dynamicLookupFields.length} lookups)`}
              </span>
            </div>

            {/* Dynamic Lookup Fields - Render with parent-child relationships and grid layout */}
            {(() => {
              // Organize lookups: separate parents from children, and pair them
              const allLookups = Object.entries(lookups.lookups || {})
              const relationships = lookups.relationships || {}

              // Get parent fields (fields that are NOT children of other fields)
              const childFields = new Set(Object.keys(relationships))
              const parentFields = allLookups.filter(([fieldName]) => !childFields.has(fieldName))
              const childFieldsArray = allLookups.filter(([fieldName]) => childFields.has(fieldName))

              // Group fields: pair parents with their children
              type LookupPair = {
                parent: { fieldName: string; lookup: DynamicLookup } | null
                child: { fieldName: string; lookup: DynamicLookup } | null
              }
              const pairedFields: LookupPair[] = []
              const usedParents = new Set<string>()

              // First, create pairs for parent-child relationships
              childFieldsArray.forEach(([childFieldName, childLookup]) => {
                const parentFieldName = relationships[childFieldName]
                const parentEntry = parentFields.find(([fn]) => fn === parentFieldName)
                if (parentEntry) {
                  pairedFields.push({
                    parent: { fieldName: parentEntry[0], lookup: parentEntry[1] as DynamicLookup },
                    child: { fieldName: childFieldName, lookup: childLookup as DynamicLookup }
                  })
                  usedParents.add(parentFieldName)
                } else {
                  // Child without a matched parent - render alone
                  pairedFields.push({
                    parent: null,
                    child: { fieldName: childFieldName, lookup: childLookup as DynamicLookup }
                  })
                }
              })

              // Add remaining parent fields that weren't paired
              parentFields.forEach(([fieldName, lookup]) => {
                if (!usedParents.has(fieldName)) {
                  pairedFields.push({
                    parent: { fieldName, lookup: lookup as DynamicLookup },
                    child: null
                  })
                }
              })

              // Color palette for visual variety
              const colorPalette = ['#ec4899', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#0ea5e9']

              // Helper function to get filtered options for child fields
              const getFilteredOptions = (childLookup: DynamicLookup, parentFieldName: string | null) => {
                if (!parentFieldName || !formData[parentFieldName]) {
                  return childLookup.data // Return all if no parent selected
                }
                const selectedParentId = formData[parentFieldName]
                // Filter child options by parent_id
                return childLookup.data.filter(item =>
                  item.parent_id === selectedParentId || !item.parent_id
                )
              }

              // Helper to check if child should be disabled
              const isChildDisabled = (parentFieldName: string | null) => {
                if (!parentFieldName) return false
                return !formData[parentFieldName]
              }

              // Render a single lookup field
              const renderLookupField = (
                fieldName: string,
                lookupData: DynamicLookup,
                colorIndex: number,
                isChild: boolean = false,
                parentFieldName: string | null = null,
                halfWidth: boolean = false
              ) => {
                if (!lookupData.data || lookupData.data.length === 0) return null

                const fieldColor = colorPalette[colorIndex % colorPalette.length]
                const disabled = isChild && isChildDisabled(parentFieldName)
                const options = isChild ? getFilteredOptions(lookupData, parentFieldName) : lookupData.data

                return (
                  <Autocomplete
                    key={fieldName}
                    size="small"
                    options={options}
                    disabled={disabled}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option
                      return option.code ? `[${option.code}] ${option.name}` : option.name
                    }}
                    value={lookupData.data.find(item => item.id === formData[fieldName]) || null}
                    onChange={(_, newValue) => {
                      const updates: Record<string, any> = { [fieldName]: newValue?.id || null }
                      // If this is a parent field and value changed, clear related children
                      if (!isChild) {
                        // Find children that depend on this parent
                        Object.entries(relationships).forEach(([childField, parentField]) => {
                          if (parentField === fieldName) {
                            updates[childField] = null
                          }
                        })
                      }
                      setFormData(prev => ({ ...prev, ...updates }))
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Tag size={14} color={disabled ? colors.textSecondary : fieldColor} />
                            {lookupData.label}
                            {isChild && disabled && (
                              <span style={{ fontSize: '0.7rem', color: colors.textSecondary, fontWeight: 'normal' }}>
                                ({t('select parent first')})
                              </span>
                            )}
                          </span>
                        }
                        placeholder={disabled ? t('Select parent first...') : t(`Select ${lookupData.label.toLowerCase()}...`)}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        <span style={{ color: colors.textPrimary }}>{option.name}</span>
                        {option.code && (
                          <span style={{ fontSize: '0.75rem', color: colors.textSecondary, marginLeft: '8px' }}>
                            {option.code}
                          </span>
                        )}
                      </li>
                    )}
                    sx={{
                      flex: halfWidth ? '1 1 calc(50% - 8px)' : '1 1 100%',
                      minWidth: halfWidth ? '200px' : 'auto',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        background: disabled ? colors.mutedBg : colors.background,
                        '& fieldset': { borderColor: colors.border },
                        '&:hover fieldset': { borderColor: disabled ? colors.border : fieldColor },
                        '&.Mui-focused fieldset': { borderColor: fieldColor },
                      },
                      '& .MuiInputLabel-root': { color: colors.textSecondary },
                      '& .MuiInputBase-input': { color: disabled ? colors.textSecondary : colors.textPrimary },
                      '& .Mui-disabled': {
                        opacity: 0.7,
                      },
                    }}
                  />
                )
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {pairedFields.map((pair, pairIndex) => {
                    const hasChild = pair.child !== null
                    const hasParent = pair.parent !== null

                    // If we have both parent and child, render side by side
                    if (hasParent && hasChild) {
                      return (
                        <div
                          key={`pair-${pairIndex}`}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '16px',
                            padding: '16px',
                            background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                            borderRadius: '12px',
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          {renderLookupField(
                            pair.parent!.fieldName,
                            pair.parent!.lookup,
                            pairIndex * 2,
                            false,
                            null,
                            true
                          )}
                          {renderLookupField(
                            pair.child!.fieldName,
                            pair.child!.lookup,
                            pairIndex * 2 + 1,
                            true,
                            pair.parent!.fieldName,
                            true
                          )}
                        </div>
                      )
                    }

                    // Single field (either orphaned child or standalone parent)
                    const field = hasParent ? pair.parent! : pair.child!
                    const isOrphanChild = !hasParent && hasChild
                    const parentForOrphan = isOrphanChild ? relationships[field.fieldName] : null

                    return (
                      <div key={`single-${pairIndex}`}>
                        {renderLookupField(
                          field.fieldName,
                          field.lookup,
                          pairIndex * 2,
                          isOrphanChild,
                          parentForOrphan,
                          false
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* Condition Field - Selection (static, not from dynamic model) */}
            {lookups.conditions.length > 0 && (
              <Autocomplete
                size="small"
                options={lookups.conditions}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option
                  return option.label
                }}
                value={lookups.conditions.find(c => c.value === formData.x_condition) || null}
                onChange={(_, newValue) => {
                  setFormData(prev => ({ ...prev, x_condition: newValue?.value || '' }))
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={14} color="#22c55e" />
                        {t('Condition')}
                      </span>
                    }
                    placeholder={t('Select condition...')}
                  />
                )}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    background: colors.background,
                    '& fieldset': { borderColor: colors.border },
                    '&:hover fieldset': { borderColor: '#22c55e' },
                    '&.Mui-focused fieldset': { borderColor: '#22c55e' },
                  },
                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                  '& .MuiInputBase-input': { color: colors.textPrimary },
                }}
              />
            )}

            {/* Original Barcode Field */}
            <TextField
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <QrCode size={14} color="#64748b" />
                  {t('Original Barcode')}
                </span>
              }
              value={formData.x_original_barcode}
              onChange={(e) => setFormData(prev => ({ ...prev, x_original_barcode: e.target.value }))}
              placeholder={t('Original barcode from source system...')}
              size="small"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  background: colors.background,
                  fontFamily: 'monospace',
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: '#64748b' },
                  '&.Mui-focused fieldset': { borderColor: '#64748b' },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                '& .MuiInputBase-input': { color: colors.textPrimary },
              }}
            />

            {/* AMS Item ID Field */}
            <TextField
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} color="#64748b" />
                  {t('AMS Item ID')}
                </span>
              }
              value={formData.x_ams_item_id}
              onChange={(e) => setFormData(prev => ({ ...prev, x_ams_item_id: e.target.value }))}
              placeholder={t('ID from Asset Management System...')}
              size="small"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  background: colors.background,
                  fontFamily: 'monospace',
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: '#64748b' },
                  '&.Mui-focused fieldset': { borderColor: '#64748b' },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                '& .MuiInputBase-input': { color: colors.textPrimary },
              }}
            />

            {/* Description Field */}
            <TextField
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <StickyNote size={14} color="#64748b" />
                  {t('Description')}
                </span>
              }
              value={formData.x_description}
              onChange={(e) => setFormData(prev => ({ ...prev, x_description: e.target.value }))}
              placeholder={t('Additional notes or description...')}
              size="small"
              fullWidth
              multiline
              rows={3}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  background: colors.background,
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: '#64748b' },
                  '&.Mui-focused fieldset': { borderColor: '#64748b' },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                '& .MuiInputBase-input': { color: colors.textPrimary },
              }}
            />

            {/* Disposal Section */}
            <div style={{
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '8px',
              marginTop: '8px',
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {t('Disposal Information')}
              </span>
            </div>

            {/* Disposal Status Field - Selection */}
            {lookups.disposalStatuses.length > 0 && (
              <Autocomplete
                size="small"
                options={lookups.disposalStatuses}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option
                  return option.label
                }}
                value={lookups.disposalStatuses.find(s => s.value === formData.x_disposal_status) || null}
                onChange={(_, newValue) => {
                  setFormData(prev => ({ ...prev, x_disposal_status: newValue?.value || '' }))
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileWarning size={14} color="#ef4444" />
                        {t('Disposal Status')}
                      </span>
                    }
                    placeholder={t('Select disposal status...')}
                  />
                )}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    background: colors.background,
                    '& fieldset': { borderColor: colors.border },
                    '&:hover fieldset': { borderColor: '#ef4444' },
                    '&.Mui-focused fieldset': { borderColor: '#ef4444' },
                  },
                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                  '& .MuiInputBase-input': { color: colors.textPrimary },
                }}
              />
            )}

            {/* Disposal Date Field */}
            <TextField
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarX size={14} color="#ef4444" />
                  {t('Disposal Date')}
                </span>
              }
              type="datetime-local"
              value={formData.x_disposal_date ? formData.x_disposal_date.replace(' ', 'T').slice(0, 16) : ''}
              onChange={(e) => setFormData(prev => ({ ...prev, x_disposal_date: e.target.value ? e.target.value.replace('T', ' ') + ':00' : '' }))}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  background: colors.background,
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: '#ef4444' },
                  '&.Mui-focused fieldset': { borderColor: '#ef4444' },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                '& .MuiInputBase-input': { color: colors.textPrimary },
              }}
            />

            {/* Read-only Info Section (for edit mode) */}
            {!isCreating && record && (
              <div style={{
                marginTop: '8px',
                padding: '16px',
                background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '4px',
                    }}>
                      <Package size={14} color="#64748b" />
                      <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>{t('Quantity')}</span>
                    </div>
                    <span style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: colors.textPrimary,
                    }}>
                      {record.product_qty ?? 0}
                    </span>
                  </div>

                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '4px',
                    }}>
                      <MapPin size={14} color="#64748b" />
                      <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>{t('Location')}</span>
                    </div>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: colors.textPrimary,
                    }}>
                      {Array.isArray(record.location_id) ? record.location_id[1] : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          background: colors.card,
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '0.875rem',
              fontWeight: '500',
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              color: colors.textPrimary,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.mutedBg
              e.currentTarget.style.borderColor = colors.textSecondary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = colors.border
            }}
          >
            {t('Cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px',
              fontSize: '0.875rem',
              fontWeight: '500',
              background: '#0ea5e9',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: saving ? 'wait' : 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: saving ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.background = '#0284c7'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0ea5e9'
            }}
          >
            {saving ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                {t('Saving...')}
              </>
            ) : (
              <>
                <Save size={16} />
                {isCreating ? t('Create') : t('Save')}
              </>
            )}
          </button>
        </div>
      </div>
    </ThemeProvider>
  )
}

// Serial Number Card Component
function SerialNumberCard({
  lot,
  onClick,
  index,
}: {
  lot: any
  onClick?: () => void
  index: number
}) {
  const { t, i18n } = useTranslation()
  const { colors, mode } = useTheme()
  const isDark = mode === 'dark'

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    return date.toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onClick={onClick}
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: '20px',
        padding: '24px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
      }}
      whileHover={onClick ? {
        y: -4,
        boxShadow: isDark
          ? '0 12px 32px rgba(0, 0, 0, 0.4)'
          : '0 12px 32px rgba(0, 0, 0, 0.08)',
      } : undefined}
    >
      {/* Decorative gradient accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'linear-gradient(90deg, #0ea5e9 0%, #06b6d4 50%, #10b981 100%)',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Hash size={20} color="#0ea5e9" strokeWidth={2.5} />
          <span style={{
            fontSize: '1.125rem',
            fontWeight: '700',
            color: colors.textPrimary,
            letterSpacing: '-0.01em',
            fontFamily: 'monospace',
          }}>
            {lot.name}
          </span>
        </div>
        {lot.product_qty > 0 && (
          <div style={{
            padding: '4px 10px',
            background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
          }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#10b981',
            }}>
              {lot.product_qty} {t('in stock')}
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}>
        <Box size={14} color="#64748b" />
        <span style={{
          fontSize: '0.875rem',
          color: colors.textSecondary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {Array.isArray(lot.product_id) ? lot.product_id[1] : '—'}
        </span>
      </div>

      {/* RFID and Location Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '12px',
        borderTop: `1px solid ${colors.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Radio size={14} color="#f59e0b" />
          <span style={{
            fontSize: '0.8125rem',
            color: lot.x_rfid ? colors.textPrimary : colors.textSecondary,
            fontFamily: 'monospace',
          }}>
            {lot.x_rfid || t('No RFID')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={14} color="#64748b" />
          <span style={{
            fontSize: '0.8125rem',
            color: colors.textSecondary,
          }}>
            {Array.isArray(lot.location_id) ? lot.location_id[1] : '—'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default function LotsSerialNumbersPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors, mode } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const { sessionId } = useAuth()
  const { canCreatePage, canEditPage, canExportPage } = useCasl()
  const isDark = mode === 'dark'

  // Detect sidebar routes
  const viewMatch = matchPath('/lots-serial/view/:id', location.pathname)
  const editMatch = matchPath('/lots-serial/edit/:id', location.pathname)
  const createMatch = matchPath('/lots-serial/create', location.pathname)
  const sidebarRecordId = viewMatch?.params?.id || editMatch?.params?.id
  const isCreating = !!createMatch
  const isSidebarOpen = !!sidebarRecordId || isCreating

  // Fetch records using dedicated serial numbers hook (direct Odoo fetch, no SmartFieldSelector)
  const { records: serialRecords, columns: availableColumns, loading: serialLoading, refetch: refetchSerials } = useSerialNumbers()

  const [isMobile, setIsMobile] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isSerialImportModalOpen, setIsSerialImportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)

  // Simple filter state (like receipts.tsx)
  const [productFilter, setProductFilter] = useState<string[]>([])
  const [locationFilter, setLocationFilter] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [subgroupFilter, setSubgroupFilter] = useState<string[]>([])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Set default visible columns
  useEffect(() => {
    if (availableColumns.length > 0 && visibleColumns.length === 0) {
      // Use predefined default columns from the hook
      const defaultCols = DEFAULT_VISIBLE_COLUMNS.filter(field =>
        availableColumns.some(col => col.id === field)
      )
      setVisibleColumns(defaultCols.length > 0 ? defaultCols : ['product_id', 'name', 'location_id'])
    }
  }, [availableColumns, visibleColumns.length])

  // Generate table columns from available columns
  const tableColumns = useMemo(() => {
    return availableColumns.map(col => ({
      id: col.id,
      header: col.label,
      cell: ({ row }: any) => {
        const value = row.original[col.id]

        // Handle many2one fields (arrays like [id, name])
        if (Array.isArray(value)) {
          return (
            <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
              {value[1] || "—"}
            </span>
          )
        }

        // Handle false/null/undefined
        if (value === false || value === null || value === undefined || value === '') {
          return <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>—</span>
        }

        // Handle dates
        if (col.id.includes('date') && typeof value === 'string') {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            return (
              <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                {date.toLocaleDateString(i18n.language)}
              </span>
            )
          }
        }

        // Default: show value as string
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {String(value)}
          </span>
        )
      },
    }))
  }, [availableColumns, colors, i18n.language])

  // Generate unique filter options from data
  const uniqueProducts = useMemo(() => {
    return Array.from(new Set(
      serialRecords
        .map((lot: any) => Array.isArray(lot.product_id) ? lot.product_id[1] : '')
        .filter(Boolean)
    ))
  }, [serialRecords])

  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(
      serialRecords
        .map((lot: any) => Array.isArray(lot.location_id) ? lot.location_id[1] : '')
        .filter(Boolean)
    ))
  }, [serialRecords])

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(
      serialRecords
        .map((lot: any) => Array.isArray(lot.x_category_id) ? lot.x_category_id[1] : '')
        .filter(Boolean)
    ))
  }, [serialRecords])

  const uniqueSubgroups = useMemo(() => {
    return Array.from(new Set(
      serialRecords
        .map((lot: any) => Array.isArray(lot.x_subgroup_id) ? lot.x_subgroup_id[1] : '')
        .filter(Boolean)
    ))
  }, [serialRecords])

  // Filter records
  const filteredLots = useMemo(() => {
    return (serialRecords || []).filter((lot: any) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const name = (lot.name || "").toLowerCase()
      const rfid = (lot.x_rfid || "").toLowerCase()
      const product = Array.isArray(lot.product_id) ? (lot.product_id[1] || "").toLowerCase() : ""
      const location = Array.isArray(lot.location_id) ? (lot.location_id[1] || "").toLowerCase() : ""

      const matchesSearch = name.includes(searchLower) ||
             rfid.includes(searchLower) ||
             product.includes(searchLower) ||
             location.includes(searchLower)

      // Dropdown filters
      const matchesProduct = productFilter.length === 0 ||
        productFilter.includes(Array.isArray(lot.product_id) ? lot.product_id[1] : '')
      const matchesLocation = locationFilter.length === 0 ||
        locationFilter.includes(Array.isArray(lot.location_id) ? lot.location_id[1] : '')
      const matchesCategory = categoryFilter.length === 0 ||
        categoryFilter.includes(Array.isArray(lot.x_category_id) ? lot.x_category_id[1] : '')
      const matchesSubgroup = subgroupFilter.length === 0 ||
        subgroupFilter.includes(Array.isArray(lot.x_subgroup_id) ? lot.x_subgroup_id[1] : '')

      return matchesSearch && matchesProduct && matchesLocation && matchesCategory && matchesSubgroup
    })
  }, [serialRecords, searchQuery, productFilter, locationFilter, categoryFilter, subgroupFilter])

  // Pagination for cards
  const paginatedLots = useMemo(() => {
    if (viewMode === "cards") {
      const start = (currentPage - 1) * itemsPerPage
      return filteredLots.slice(start, start + itemsPerPage)
    }
    return filteredLots
  }, [filteredLots, currentPage, itemsPerPage, viewMode])

  const totalPages = Math.ceil(filteredLots.length / itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, productFilter, locationFilter, categoryFilter, subgroupFilter])

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    if (!canExportPage("lots-serial")) return

    let dataToExport = serialRecords
    if (options.scope === "selected") {
      dataToExport = serialRecords.filter((lot: any) => rowSelection[String(lot.id)])
    } else if (options.scope === "page") {
      dataToExport = paginatedLots
    }

    const allColumns: Record<string, any> = {}
    availableColumns.forEach(col => {
      allColumns[col.id] = {
        header: col.label,
        accessor: (row: any) => {
          const value = row[col.id]
          if (value === null || value === undefined) return '-'
          if (Array.isArray(value)) return value[1] || value[0] || '-'
          if (typeof value === 'object') return JSON.stringify(value)
          return String(value)
        }
      }
    })

    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Serial Numbers Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
      ]
    }

    exportData(options, dataToExport, config, null)
    setIsExportModalOpen(false)
  }

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
  }

  const openRecord = (id: number) => {
    if (!canEditPage("lots-serial")) return
    navigate(`/lots-serial/edit/${id}`)
  }

  const handleCloseSidebar = () => {
    navigate('/lots-serial')
  }

  const handleSave = () => {
    showToast(t(isCreating ? 'Serial number created successfully' : 'Serial number updated successfully'), 'success')
    refetchSerials()
  }

  // Stats
  const totalLots = serialRecords.length
  const withRfid = serialRecords.filter((l: any) => l.x_rfid).length
  const inStock = serialRecords.filter((l: any) => (l.product_qty || 0) > 0).length

  return (
    <div style={{ minHeight: "100vh", background: colors.background }}>
      <style>
        {`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.6s ease-out forwards;
          }
        `}
      </style>

      <div style={{
        padding: isMobile ? "1rem" : "2rem",
        color: colors.textPrimary,
      }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? "1rem" : "0",
            marginBottom: "2rem"
          }}>
            <div>
              <h1 style={{
                fontSize: isMobile ? "1.5rem" : "2.25rem",
                fontWeight: "800",
                marginBottom: "0.5rem",
                color: colors.textPrimary,
                letterSpacing: "-0.025em",
              }}>
                {t("Serial Numbers")}
              </h1>
              <p style={{
                fontSize: isMobile ? "0.875rem" : "1rem",
                color: colors.textSecondary
              }}>
                {t("Track and manage product serial numbers and RFID tags")}
              </p>
            </div>
            <div style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              width: isMobile ? "100%" : "auto",
            }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => refetchSerials()}
                disabled={serialLoading}
                style={{
                  background: colors.card,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  borderRadius: "12px",
                  padding: "10px 16px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <RefreshCcw className={`w-4 h-4 ${serialLoading ? "animate-spin" : ""}`} />
                {serialLoading ? t("Loading...") : t("Refresh")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSerialImportModalOpen(true)}
                style={{
                  background: colors.card,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  borderRadius: "12px",
                  padding: "10px 16px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Upload size={18} />
                {t("Import")}
              </Button>
              {canCreatePage("lots-serial") && (
                <Button
                  onClick={() => navigate('/lots-serial/create')}
                  style={{
                    background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
                    color: "#fff",
                    padding: "10px 20px",
                    borderRadius: "12px",
                    border: "none",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 16px rgba(14, 165, 233, 0.3)",
                  }}
                >
                  <Plus size={20} />
                  {t("New Serial Number")}
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
            marginBottom: "2rem",
          }}>
            <StatCard
              label={t("Total Serial Numbers")}
              value={totalLots}
              icon={Hash}
              gradient="linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)"
              delay={0}
            />
            <StatCard
              label={t("With RFID Tags")}
              value={withRfid}
              icon={Radio}
              gradient="linear-gradient(135deg, #f59e0b 0%, #f97316 100%)"
              delay={1}
            />
            <StatCard
              label={t("In Stock")}
              value={inStock}
              icon={Package}
              gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              delay={2}
            />
            <StatCard
              label={t("Without RFID")}
              value={totalLots - withRfid}
              icon={AlertCircle}
              gradient="linear-gradient(135deg, #64748b 0%, #475569 100%)"
              delay={3}
            />
          </div>

          {/* Filters */}
          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search by serial number, RFID, product, or location...")}
            statusFilter={productFilter}
            onStatusChange={setProductFilter}
            statusOptions={uniqueProducts}
            statusPlaceholder={t("Product")}
            toFilter={locationFilter}
            onToChange={setLocationFilter}
            toOptions={uniqueLocations}
            toPlaceholder={t("Location")}
            fromFilter={categoryFilter}
            onFromChange={setCategoryFilter}
            fromOptions={uniqueCategories}
            fromPlaceholder={t("Category")}
            showDateRange={false}
            isMobile={isMobile}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
            rulesCountFilter={subgroupFilter}
            onRulesCountChange={setSubgroupFilter}
            rulesCountOptions={uniqueSubgroups}
            rulesCountPlaceholder={t("Subgroup")}
            showRulesCountFilter={uniqueSubgroups.length > 0}
          />

          {/* Content */}
          {viewMode === "cards" ? (
            serialLoading ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "1.25rem",
              }}>
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "20px",
                      padding: "24px",
                      height: "160px",
                    }}
                  />
                ))}
              </div>
            ) : (
              <>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: "1.25rem",
                }}>
                  {paginatedLots.map((lot: any, idx: number) => (
                    <SerialNumberCard
                      key={lot.id}
                      lot={lot}
                      onClick={canEditPage("lots-serial") ? () => openRecord(lot.id) : undefined}
                      index={idx}
                    />
                  ))}
                </div>

                {filteredLots.length === 0 && !serialLoading && (
                  <div style={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "20px",
                    padding: "4rem 2rem",
                    textAlign: "center",
                  }}>
                    <Hash size={48} color={colors.textSecondary} style={{ margin: "0 auto 1rem" }} />
                    <h3 style={{
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem"
                    }}>
                      {t("No serial numbers found")}
                    </h3>
                    <p style={{ color: colors.textSecondary }}>
                      {t("Try adjusting your search criteria")}
                    </p>
                  </div>
                )}

                {/* Cards Pagination */}
                {filteredLots.length > itemsPerPage && (
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "2rem",
                    padding: "16px 24px",
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "16px",
                  }}>
                    <span style={{
                      fontSize: "0.875rem",
                      color: colors.textSecondary,
                      fontWeight: "500",
                    }}>
                      {t("Showing")} {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredLots.length)} {t("of")} {filteredLots.length}
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                          padding: "8px 16px",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          background: currentPage === 1 ? colors.mutedBg : colors.card,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "10px",
                          color: colors.textPrimary,
                          cursor: currentPage === 1 ? "not-allowed" : "pointer",
                          opacity: currentPage === 1 ? 0.5 : 1,
                        }}
                      >
                        {t("Previous")}
                      </button>
                      <div style={{
                        padding: "8px 16px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: colors.textSecondary,
                      }}>
                        {currentPage} / {totalPages}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: "8px 16px",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          background: currentPage === totalPages ? colors.mutedBg : colors.card,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "10px",
                          color: colors.textPrimary,
                          cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                          opacity: currentPage === totalPages ? 0.5 : 1,
                        }}
                      >
                        {t("Next")}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <TransfersTable
              data={filteredLots}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              onExport={canExportPage("lots-serial") ? () => setIsExportModalOpen(true) : undefined}
              isLoading={serialLoading}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              columns={tableColumns}
              actions={canEditPage("lots-serial") ? ((lot) => {
                const lotId = (lot as any).id
                return [
                  {
                    key: "view",
                    label: t("View"),
                    icon: Eye,
                    onClick: () => navigate(`/lots-serial/view/${lotId}`),
                  },
                  {
                    key: "edit",
                    label: t("Edit"),
                    icon: Edit,
                    onClick: () => openRecord(lotId),
                  }
                ]
              }) : undefined}
              actionsLabel={t("Actions")}
              isRTL={isRTL}
              showPagination={true}
              defaultItemsPerPage={10}
            />
          )}

          {/* Export Modal */}
          {canExportPage("lots-serial") && (
            <ExportModal
              isOpen={isExportModalOpen}
              onClose={() => setIsExportModalOpen(false)}
              onExport={handleExport}
              totalRecords={serialRecords.length}
              selectedCount={Object.keys(rowSelection).length}
              isSelectAll={Object.keys(rowSelection).length === serialRecords.length && serialRecords.length > 0}
            />
          )}

          {/* Serial Import Modal */}
          <SerialImportModal
            isOpen={isSerialImportModalOpen}
            onClose={() => setIsSerialImportModalOpen(false)}
            onComplete={() => {
              refetchSerials()
              showToast(t("Import completed! Refreshing data..."), "success")
            }}
          />

          {/* Toast */}
          {toast && (
            <Toast
              text={toast.text}
              state={toast.state}
              onClose={() => setToast(null)}
            />
          )}

          {/* Sidebar */}
          <SerialNumberSidebar
            isOpen={isSidebarOpen}
            onClose={handleCloseSidebar}
          >
            <SerialNumberRecordPanel
              recordId={sidebarRecordId ? parseInt(sidebarRecordId) : undefined}
              isCreating={isCreating}
              onClose={handleCloseSidebar}
              onSave={handleSave}
            />
          </SerialNumberSidebar>
        </div>
      </div>
    </div>
  )
}
