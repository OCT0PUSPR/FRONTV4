"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Save, Loader2, Package, Tag, Barcode, Image as ImageIcon,
  FileText, AlertCircle, Percent, Layers, Plus, Trash2,
  ChevronDown, ChevronUp, Settings, PlusCircle
} from "lucide-react"
import { Autocomplete, TextField, createTheme, ThemeProvider } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import { Button } from "../../@/components/ui/button"
import { API_CONFIG } from "../config/api"
import { CreateRecordModal } from "./CreateRecordModal"

// Types
interface ProductFormData {
  id?: number
  name: string
  image_1920: string | null
  barcode: string
  invoice_policy: string
  tracking: string
  trackingEnabled: boolean
  type: string
  uom_id: number | null
  taxes_id: number[]
  attribute_line_ids: AttributeLine[]
}

interface UoM {
  id: number
  name: string
  category_id: [number, string] | false
}

interface AttributeLine {
  id?: number
  attribute_id: number | [number, string]
  value_ids: number[]
  attribute_name?: string
  values?: { id: number; name: string }[]
}

interface AttributeCategory {
  id: number
  name: string
  sequence: number
}

interface ProductAttribute {
  id: number
  name: string
  display_type: string
  create_variant: string
  category_id: [number, string] | false
  value_ids: number[]
}

interface AttributeValue {
  id: number
  name: string
  attribute_id: [number, string]
  sequence: number
}

interface Tax {
  id: number
  name: string
  amount: number
  type_tax_use: string
}

// Sidebar wrapper component
export function ProductSidebar({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const { colors, mode } = useTheme()
  const { i18n } = useTranslation()
  const isDark = mode === 'dark'
  const isRTL = i18n.dir() === 'rtl'

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
            initial={{ x: isRTL ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRTL ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 0,
              [isRTL ? 'left' : 'right']: 0,
              bottom: 0,
              width: '520px',
              maxWidth: '100vw',
              background: colors.background,
              boxShadow: isDark
                ? `${isRTL ? '12px' : '-12px'} 0 48px rgba(0, 0, 0, 0.5)`
                : `${isRTL ? '12px' : '-12px'} 0 48px rgba(0, 0, 0, 0.12)`,
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Product Record Panel for sidebar content
export function ProductRecordPanel({
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
  const [record, setRecord] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    image_1920: null,
    barcode: '',
    invoice_policy: 'order',
    tracking: 'none',
    trackingEnabled: false,
    type: 'consu',
    uom_id: null,
    taxes_id: [],
    attribute_line_ids: [],
  })

  // Lookup data
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [uoms, setUoms] = useState<UoM[]>([])
  const [attributes, setAttributes] = useState<ProductAttribute[]>([])
  const [attributeValues, setAttributeValues] = useState<AttributeValue[]>([])
  const [attributeCategories, setAttributeCategories] = useState<AttributeCategory[]>([])

  // Product type options
  const productTypeOptions = [
    { value: 'consu', label: t('Consumable') },
    { value: 'product', label: t('Storable') },
    { value: 'service', label: t('Service') },
  ]

  // UI state
  const [attributeSectionOpen, setAttributeSectionOpen] = useState(true)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isCreateUomModalOpen, setIsCreateUomModalOpen] = useState(false)

  // UoM fields for create modal
  const uomCreateFields = [
    { name: 'name', label: t('Unit Name'), type: 'char' as const, required: true, placeholder: t('e.g., Kilogram, Piece, Box') },
    { name: 'rounding', label: t('Rounding Precision'), type: 'float' as const, required: false, defaultValue: 0.01 },
    { name: 'active', label: t('Active'), type: 'boolean' as const, required: false, defaultValue: true },
  ]

  // Invoice policy options
  const invoicePolicyOptions = [
    { value: 'order', label: t('Ordered quantities') },
    { value: 'delivery', label: t('Delivered quantities') },
  ]

  // Tracking options
  const trackingOptions = [
    { value: 'none', label: t('No Tracking') },
    { value: 'serial', label: t('By Unique Serial Number') },
    { value: 'lot', label: t('By Lots') },
  ]

  // MUI theme for Autocomplete
  const muiTheme = useMemo(() => createTheme({
    direction: isRTL ? 'rtl' : 'ltr',
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
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.12)',
            },
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
          },
        },
      },
    },
  }), [isDark, colors, isRTL])

  // Get SmartFieldSelector headers (same pattern as serial-numbers.tsx)
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

  // Fetch product record using SmartFieldSelector
  const fetchRecord = async () => {
    if (!sessionId || !recordId) return
    setLoading(true)
    try {
      const headers = getSmartFieldHeaders()
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/product.template/${recordId}?context=form&fetchAllFields=true`, {
        method: 'GET',
        headers,
      })
      const data = await res.json()
      if (data.success && data.record) {
        const rec = data.record
        setRecord(rec)

        // Parse attribute lines
        const attrLines: AttributeLine[] = (rec.attribute_line_ids || []).map((line: any) => ({
          id: line.id,
          attribute_id: line.attribute_id,
          value_ids: Array.isArray(line.value_ids) ? line.value_ids.map((v: any) => Array.isArray(v) ? v[0] : v) : [],
          attribute_name: Array.isArray(line.attribute_id) ? line.attribute_id[1] : '',
        }))

        const trackingValue = rec.tracking || 'none'
        setFormData({
          id: rec.id,
          name: rec.name || '',
          image_1920: rec.image_1920 || null,
          barcode: rec.barcode || '',
          invoice_policy: rec.invoice_policy || 'order',
          tracking: trackingValue,
          trackingEnabled: trackingValue !== 'none',
          type: rec.type || 'consu',
          uom_id: Array.isArray(rec.uom_id) ? rec.uom_id[0] : (rec.uom_id || null),
          taxes_id: Array.isArray(rec.taxes_id) ? rec.taxes_id.map((t: any) => Array.isArray(t) ? t[0] : t) : [],
          attribute_line_ids: attrLines,
        })

        if (rec.image_1920) {
          setImagePreview(`data:image/png;base64,${rec.image_1920}`)
        }
      } else {
        throw new Error(data.error || t('Record not found'))
      }
    } catch (err: any) {
      setError(err.message || t('Failed to load record'))
    } finally {
      setLoading(false)
    }
  }

  // Fetch taxes using SmartFieldSelector
  const fetchTaxes = async () => {
    if (!sessionId) return
    try {
      const headers = getSmartFieldHeaders()
      const domain = JSON.stringify([['type_tax_use', '=', 'sale']])
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/account.tax?domain=${encodeURIComponent(domain)}&limit=100&context=list`, {
        method: 'GET',
        headers,
      })
      const data = await res.json()
      if (data.success) {
        setTaxes(data.records || [])
      }
    } catch (err) {
      console.error('Failed to fetch taxes:', err)
    }
  }

  // Fetch UoMs using SmartFieldSelector
  const fetchUoms = async () => {
    if (!sessionId) return
    try {
      const headers = getSmartFieldHeaders()
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/uom.uom?limit=200&context=list`, {
        method: 'GET',
        headers,
      })
      const data = await res.json()
      if (data.success) {
        setUoms(data.records || [])
      }
    } catch (err) {
      console.error('Failed to fetch UoMs:', err)
    }
  }

  // Fetch attributes and values using SmartFieldSelector
  const fetchAttributes = async () => {
    if (!sessionId) return
    try {
      const headers = getSmartFieldHeaders()

      // Fetch attributes
      const attrRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/product.attribute?limit=500&context=list`, {
        method: 'GET',
        headers,
      })
      const attrData = await attrRes.json()
      if (attrData.success) {
        setAttributes(attrData.records || [])
      }

      // Fetch attribute values
      const valRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/product.attribute.value?limit=1000&context=list`, {
        method: 'GET',
        headers,
      })
      const valData = await valRes.json()
      if (valData.success) {
        setAttributeValues(valData.records || [])
      }

      // Fetch attribute categories
      const catRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/product.attribute.category?limit=100&context=list`, {
        method: 'GET',
        headers,
      })
      const catData = await catRes.json()
      if (catData.success) {
        setAttributeCategories(catData.records || [])
      }
    } catch (err) {
      console.error('Failed to fetch attributes:', err)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchTaxes(), fetchUoms(), fetchAttributes()])
      if (recordId && !isCreating) {
        await fetchRecord()
      } else {
        setLoading(false)
      }
    }
    init()
  }, [recordId, isCreating, sessionId])

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1]
        setFormData(prev => ({ ...prev, image_1920: base64 }))
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Add attribute line
  const addAttributeLine = () => {
    setFormData(prev => ({
      ...prev,
      attribute_line_ids: [
        ...prev.attribute_line_ids,
        { attribute_id: 0, value_ids: [] }
      ]
    }))
  }

  // Remove attribute line
  const removeAttributeLine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attribute_line_ids: prev.attribute_line_ids.filter((_, i) => i !== index)
    }))
  }

  // Update attribute line
  const updateAttributeLine = (index: number, field: 'attribute_id' | 'value_ids', value: any) => {
    setFormData(prev => {
      const lines = [...prev.attribute_line_ids]
      if (field === 'attribute_id') {
        lines[index] = { ...lines[index], attribute_id: value, value_ids: [] }
      } else {
        lines[index] = { ...lines[index], value_ids: value }
      }
      return { ...prev, attribute_line_ids: lines }
    })
  }

  // Get values for an attribute
  const getValuesForAttribute = (attributeId: number) => {
    return attributeValues.filter(v => {
      const attrId = Array.isArray(v.attribute_id) ? v.attribute_id[0] : v.attribute_id
      return attrId === attributeId
    })
  }

  // Save handler using SmartFieldSelector
  const handleSave = async () => {
    if (!sessionId) return
    if (!formData.name.trim()) {
      setError(t('Product name is required'))
      return
    }

    setSaving(true)
    setError(null)

    try {
      const headers = getSmartFieldHeaders()

      // Prepare attribute lines for Odoo
      const attrLinesForOdoo = formData.attribute_line_ids
        .filter(line => {
          const attrId = Array.isArray(line.attribute_id) ? line.attribute_id[0] : line.attribute_id
          return attrId && line.value_ids.length > 0
        })
        .map(line => {
          const attrId = Array.isArray(line.attribute_id) ? line.attribute_id[0] : line.attribute_id
          if (line.id) {
            return [1, line.id, { attribute_id: attrId, value_ids: [[6, 0, line.value_ids]] }]
          } else {
            return [0, 0, { attribute_id: attrId, value_ids: [[6, 0, line.value_ids]] }]
          }
        })

      const data: Record<string, any> = {
        name: formData.name,
        barcode: formData.barcode || false,
        invoice_policy: formData.invoice_policy,
        tracking: formData.trackingEnabled ? formData.tracking : 'none',
        type: formData.type,
        taxes_id: [[6, 0, formData.taxes_id]],
      }

      // Set UoM from form or preserve from record
      if (formData.uom_id) {
        data.uom_id = formData.uom_id
        data.uom_po_id = formData.uom_id // Use same for purchase UoM
      } else if (!isCreating && record?.uom_id) {
        const uomId = Array.isArray(record.uom_id) ? record.uom_id[0] : record.uom_id
        data.uom_id = uomId
        if (record.uom_po_id) {
          const uomPoId = Array.isArray(record.uom_po_id) ? record.uom_po_id[0] : record.uom_po_id
          data.uom_po_id = uomPoId
        } else {
          data.uom_po_id = uomId
        }
      } else {
        // Default unit for new products
        data.uom_id = 1
        data.uom_po_id = 1
      }

      // For updates, include other required fields from the original record
      if (!isCreating && record) {
        if (record.base_unit_count !== undefined) data.base_unit_count = record.base_unit_count || 1
        if (record.service_tracking) data.service_tracking = record.service_tracking
        // product_variant_ids should not be updated directly - Odoo manages it
      }

      // For creating, set default required fields
      if (isCreating) {
        data.base_unit_count = 1
      }

      // Only include image if it was changed
      if (formData.image_1920 && formData.image_1920 !== record?.image_1920) {
        data.image_1920 = formData.image_1920
      }

      // Only include attribute lines if there are any
      if (attrLinesForOdoo.length > 0 || (record?.attribute_line_ids?.length > 0)) {
        data.attribute_line_ids = attrLinesForOdoo
      }

      let res
      if (isCreating) {
        res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/product.template`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ data }),
        })
      } else {
        res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/product.template/${recordId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data }),
        })
      }

      const result = await res.json()
      if (result.success) {
        onSave()
        onClose()
      } else {
        throw new Error(result.error || t('Failed to save product'))
      }
    } catch (err: any) {
      setError(err.message || t('Failed to save product'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <Loader2 size={32} className="animate-spin" style={{ color: colors.action }} />
      </div>
    )
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', direction: isRTL ? 'rtl' : 'ltr' }}>
        {/* Header with title and close button */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.border}`,
          background: colors.card,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <Package size={24} color={colors.action} strokeWidth={2} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: colors.textPrimary,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {isCreating ? t('New Product') : formData.name || t('Product')}
              </h2>
              {record && (
                <p style={{
                  fontSize: '0.8125rem',
                  color: colors.textSecondary,
                  margin: '2px 0 0 0',
                }}>
                  ID: {record.id}
                </p>
              )}
            </div>
          </div>
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
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.mutedBg
              e.currentTarget.style.color = colors.textPrimary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = colors.textSecondary
            }}
            title={t('Close (Esc)')}
          >
            <X size={20} />
          </button>
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
            {/* Image Upload */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '12px',
                background: colors.mutedBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: `1px solid ${colors.border}`,
                flexShrink: 0,
              }}>
                {imagePreview ? (
                  <img src={imagePreview} alt={t('Product')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageIcon size={32} color={colors.textSecondary} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: '500', color: colors.textPrimary, marginBottom: '8px' }}>
                  {t('Product Image')}
                </p>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: colors.action,
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}>
                  <ImageIcon size={14} />
                  {t('Upload Image')}
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {/* Name Field */}
            <TextField
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={14} color={colors.action} />
                  {t('Product Name')}
                  <span style={{ color: '#ef4444' }}>*</span>
                </span>
              }
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('Enter product name...')}
              size="small"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  background: colors.background,
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: colors.action },
                  '&.Mui-focused fieldset': { borderColor: colors.action },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                '& .MuiInputBase-input': { color: colors.textPrimary },
              }}
            />

            {/* Barcode Field */}
            <TextField
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Barcode size={14} color="#f59e0b" />
                  {t('Barcode')}
                </span>
              }
              value={formData.barcode}
              onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
              placeholder={t('Scan or enter barcode...')}
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

            {/* Product Type */}
            <Autocomplete
              size="small"
              options={productTypeOptions}
              getOptionLabel={(option) => option.label}
              value={productTypeOptions.find(o => o.value === formData.type) || productTypeOptions[0]}
              onChange={(_, newValue) => {
                setFormData(prev => ({ ...prev, type: newValue?.value || 'consu' }))
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={14} color="#6366f1" />
                      {t('Product Type')}
                      <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                  }
                />
              )}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  background: colors.background,
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: '#6366f1' },
                  '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                '& .MuiInputBase-input': { color: colors.textPrimary },
              }}
            />

            {/* Unit of Measure with Create New option */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <Autocomplete
                size="small"
                options={uoms}
                groupBy={(option) => {
                  if (option.category_id && Array.isArray(option.category_id)) {
                    return option.category_id[1]
                  }
                  return t('Uncategorized')
                }}
                getOptionLabel={(option) => option.name}
                value={uoms.find(u => u.id === formData.uom_id) || null}
                onChange={(_, newValue) => {
                  setFormData(prev => ({ ...prev, uom_id: newValue?.id || null }))
                }}
                noOptionsText={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ color: colors.textSecondary }}>{t('No options found')}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsCreateUomModalOpen(true)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        background: `${colors.action}15`,
                        border: `1px dashed ${colors.action}`,
                        borderRadius: '8px',
                        color: colors.action,
                        fontSize: '0.8125rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      <PlusCircle size={14} />
                      {t('Create New')}
                    </button>
                  </div>
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Settings size={14} color="#f59e0b" />
                        {t('Unit of Measure')}
                        <span style={{ color: '#ef4444' }}>*</span>
                      </span>
                    }
                    placeholder={t('Select unit...')}
                  />
                )}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    background: colors.background,
                    '& fieldset': { borderColor: colors.border },
                    '&:hover fieldset': { borderColor: '#f59e0b' },
                    '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
                  },
                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                  '& .MuiInputBase-input': { color: colors.textPrimary },
                }}
              />
              <button
                onClick={() => setIsCreateUomModalOpen(true)}
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${colors.action}15`,
                  border: `1px solid ${colors.action}30`,
                  borderRadius: '10px',
                  color: colors.action,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${colors.action}25`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${colors.action}15`
                }}
                title={t('Create New')}
              >
                <PlusCircle size={18} />
              </button>
            </div>

            {/* Invoice Policy */}
            <Autocomplete
              size="small"
              options={invoicePolicyOptions}
              getOptionLabel={(option) => option.label}
              value={invoicePolicyOptions.find(o => o.value === formData.invoice_policy) || null}
              onChange={(_, newValue) => {
                setFormData(prev => ({ ...prev, invoice_policy: newValue?.value || 'order' }))
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} color="#10b981" />
                      {t('Invoicing Policy')}
                    </span>
                  }
                />
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
              }}
            />

            {/* Enable Tracking Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  trackingEnabled: !prev.trackingEnabled,
                  tracking: !prev.trackingEnabled ? (prev.tracking === 'none' ? 'serial' : prev.tracking) : 'none'
                }))
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <Settings size={18} color={formData.trackingEnabled ? '#8b5cf6' : colors.textSecondary} />
                <div>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: colors.textPrimary,
                    margin: 0,
                  }}>
                    {t('Enable Tracking')}
                  </p>
                  <p style={{
                    fontSize: '0.75rem',
                    color: colors.textSecondary,
                    margin: '2px 0 0 0',
                  }}>
                    {formData.trackingEnabled ? t('By Unique Serial Number') : t('No Tracking')}
                  </p>
                </div>
              </div>
              {/* Custom Toggle Switch */}
              <div
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  background: formData.trackingEnabled
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                    : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'),
                  padding: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '10px',
                    background: '#fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s ease',
                    transform: formData.trackingEnabled ? 'translateX(20px)' : 'translateX(0)',
                  }}
                />
              </div>
            </div>

            {/* Tracking Type - only shown when tracking is enabled */}
            {formData.trackingEnabled && (
              <Autocomplete
                size="small"
                options={trackingOptions.filter(o => o.value !== 'none')}
                getOptionLabel={(option) => option.label}
                value={trackingOptions.find(o => o.value === formData.tracking) || trackingOptions[1]}
                onChange={(_, newValue) => {
                  setFormData(prev => ({ ...prev, tracking: newValue?.value || 'serial' }))
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Settings size={14} color="#8b5cf6" />
                        {t('Track By')}
                      </span>
                    }
                  />
                )}
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
            )}

            {/* Sales Taxes */}
            <Autocomplete
              multiple
              size="small"
              options={taxes}
              getOptionLabel={(option) => `${option.name} (${option.amount}%)`}
              value={taxes.filter(t => formData.taxes_id.includes(t.id))}
              onChange={(_, newValue) => {
                setFormData(prev => ({ ...prev, taxes_id: newValue.map(t => t.id) }))
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Percent size={14} color="#ec4899" />
                      {t('Sales Taxes')}
                    </span>
                  }
                  placeholder={t('Select taxes...')}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <span style={{ color: colors.textPrimary }}>{option.name}</span>
                  <span style={{ fontSize: '0.75rem', color: colors.textSecondary, marginInlineStart: '8px' }}>
                    {option.amount}%
                  </span>
                </li>
              )}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  background: colors.background,
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: '#ec4899' },
                  '&.Mui-focused fieldset': { borderColor: '#ec4899' },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                '& .MuiInputBase-input': { color: colors.textPrimary },
              }}
            />

            {/* Attributes Section */}
            <div style={{
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '16px',
              marginTop: '8px',
            }}>
              <button
                onClick={() => setAttributeSectionOpen(!attributeSectionOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '8px 0',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: colors.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Layers size={16} color="#6366f1" />
                  {t('Product Attributes')}
                  <span style={{
                    fontSize: '0.75rem',
                    color: colors.textSecondary,
                    fontWeight: 'normal',
                  }}>
                    ({formData.attribute_line_ids.length})
                  </span>
                </span>
                {attributeSectionOpen ? (
                  <ChevronUp size={18} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={18} color={colors.textSecondary} />
                )}
              </button>

              {attributeSectionOpen && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {formData.attribute_line_ids.map((line, index) => {
                    const selectedAttrId = Array.isArray(line.attribute_id) ? line.attribute_id[0] : line.attribute_id
                    const valuesForAttr = getValuesForAttribute(selectedAttrId)

                    return (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                          borderRadius: '10px',
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                          <Autocomplete
                            size="small"
                            options={attributes}
                            groupBy={(option) => {
                              if (option.category_id && Array.isArray(option.category_id)) {
                                return option.category_id[1]
                              }
                              return t('Uncategorized')
                            }}
                            getOptionLabel={(option) => option.name}
                            value={attributes.find(a => a.id === selectedAttrId) || null}
                            onChange={(_, newValue) => {
                              updateAttributeLine(index, 'attribute_id', newValue?.id || 0)
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label={t('Attribute')} placeholder={t('Select attribute...')} />
                            )}
                            sx={{
                              flex: 1,
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                                background: colors.background,
                                '& fieldset': { borderColor: colors.border },
                              },
                              '& .MuiInputLabel-root': { color: colors.textSecondary },
                              '& .MuiInputBase-input': { color: colors.textPrimary },
                            }}
                          />
                          <button
                            onClick={() => removeAttributeLine(index)}
                            style={{
                              width: '36px',
                              height: '36px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              color: '#ef4444',
                              flexShrink: 0,
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {selectedAttrId > 0 && (
                          <Autocomplete
                            multiple
                            size="small"
                            options={valuesForAttr}
                            getOptionLabel={(option) => option.name}
                            value={valuesForAttr.filter(v => line.value_ids.includes(v.id))}
                            onChange={(_, newValue) => {
                              updateAttributeLine(index, 'value_ids', newValue.map(v => v.id))
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label={t('Values')} placeholder={t('Select values...')} />
                            )}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                                background: colors.background,
                                '& fieldset': { borderColor: colors.border },
                              },
                              '& .MuiInputLabel-root': { color: colors.textSecondary },
                              '& .MuiInputBase-input': { color: colors.textPrimary },
                            }}
                          />
                        )}
                      </div>
                    )
                  })}

                  <button
                    onClick={addAttributeLine}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                      border: `1px dashed ${colors.action}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      color: colors.action,
                      fontSize: '0.875rem',
                      fontWeight: '500',
                    }}
                  >
                    <Plus size={16} />
                    {t('Add Attribute')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Save Button */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          background: colors.card,
          display: 'flex',
          gap: '12px',
        }}>
          <Button
            variant="outline"
            onClick={onClose}
            style={{
              flex: 1,
              borderColor: colors.border,
              color: colors.textPrimary,
            }}
          >
            {t('Cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              background: colors.action,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {saving ? t('Saving...') : t('Save')}
          </Button>
        </div>
      </div>

      {/* Create UoM Modal */}
      <CreateRecordModal
        isOpen={isCreateUomModalOpen}
        onClose={() => setIsCreateUomModalOpen(false)}
        onCreated={(newUom) => {
          // Add the new UoM to the list and select it
          setUoms(prev => [...prev, newUom])
          setFormData(prev => ({ ...prev, uom_id: newUom.id }))
        }}
        modelName="uom.uom"
        title={t('Create Unit of Measure')}
        fields={uomCreateFields}
      />
    </ThemeProvider>
  )
}
