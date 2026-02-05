"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import {
  Tags,
  Factory,
  Box,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  Save,
  Loader2,
  Database,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Upload,
  Trash,
  Settings,
  Layers,
  Link2,
  Hash,
  Type,
  ToggleLeft,
  Calendar,
  FileText,
  List,
} from "lucide-react"
import { Button } from "../../@/components/ui/button"
import Toast from "../components/Toast"
import { DynamicImportModal } from "../components/DynamicImportWizard/DynamicImportModal"
import { sanitizeErrorMessage } from "../utils/errorSanitizer"
import { StatCard } from "../components/StatCard"
import { ColumnsSelector } from "../components/ColumnsSelector"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3006'

// Field type icons
const FIELD_TYPE_ICONS: Record<string, any> = {
  char: Type,
  text: FileText,
  integer: Hash,
  float: Hash,
  boolean: ToggleLeft,
  date: Calendar,
  datetime: Calendar,
  many2one: Link2,
  one2many: List,
  many2many: Layers,
  selection: List,
}

// Field types for creating new fields
const FIELD_TYPES = [
  { value: 'char', label: 'Text (Single Line)', icon: Type },
  { value: 'text', label: 'Text (Multi Line)', icon: FileText },
  { value: 'integer', label: 'Integer', icon: Hash },
  { value: 'float', label: 'Decimal', icon: Hash },
  { value: 'boolean', label: 'Checkbox', icon: ToggleLeft },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'datetime', label: 'Date & Time', icon: Calendar },
  { value: 'many2one', label: 'Many to One', icon: Link2 },
  { value: 'one2many', label: 'One to Many', icon: List },
  { value: 'many2many', label: 'Many to Many', icon: Layers },
]

// Default icons for models
const MODEL_ICONS = [Tags, Factory, Box, Database, Layers, Settings]

// Gradient colors for models
const MODEL_GRADIENTS = [
  'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
  'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
  'linear-gradient(135deg, #ca8a04 0%, #a16207 100%)',
  'linear-gradient(135deg, #059669 0%, #047857 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
]

interface DynamicModel {
  id: number
  modelName: string
  displayName: string
  state?: string
}

interface ModelField {
  name: string
  string: string
  type: string
  required?: boolean
  relation?: string
  domain?: any[]
}

// Track which fields are related (for hierarchical lookups)
interface FieldRelationship {
  childField: string
  parentField: string
  parentModel: string
}

interface MasterRecord {
  id: number
  [key: string]: any
}

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  record: MasterRecord | null
  modelName: string
  modelLabel: string
  fields: ModelField[]
  allRecords: MasterRecord[]
  onSave: (data: Partial<MasterRecord>) => Promise<void>
  isLoading: boolean
  showToast: (text: string, state?: "success" | "error" | "warning" | "info") => void
}

function EditModal({ isOpen, onClose, record, modelName, modelLabel, fields, allRecords, onSave, isLoading, showToast }: EditModalProps) {
  const { t, i18n } = useTranslation()
  const { mode, colors } = useTheme()
  const { sessionId } = useAuth()
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('current_tenant_id') : null
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [relationOptions, setRelationOptions] = useState<Record<string, { id: number; name: string }[]>>({})
  const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({})

  // Identify many2one fields and their relationships
  const many2oneFields = useMemo(() => {
    return fields.filter(f => f.type === 'many2one' && f.relation)
  }, [fields])

  // Detect parent-child relationships between fields
  // E.g., if x_subcategory_id has relation to x_subcategory model which has x_category_id field
  const fieldRelationships = useMemo((): FieldRelationship[] => {
    const relationships: FieldRelationship[] = []

    // Look for fields that might depend on other fields in this same form
    // Common patterns:
    // - x_subcategory has a field pointing to x_category (the parent)
    // - The field name often contains "_id" and matches another field's relation model

    for (const field of many2oneFields) {
      // Check if this field's model is the same as the current model (self-reference)
      if (field.relation === modelName) {
        // Self-reference (like x_parent_id) - already handled
        continue
      }

      // Check if there's a potential parent field for this one
      // E.g., if field is x_subgroup_id (relation: x_subgroup),
      // look for x_group_id (relation: x_group) where x_subgroup has x_group_id
      const fieldBaseName = field.name.replace('_id', '').replace('x_', '')

      // Look for fields that might be parents (e.g., x_category_id for x_subcategory_id)
      for (const potentialParent of many2oneFields) {
        if (potentialParent.name === field.name) continue

        const parentBaseName = potentialParent.name.replace('_id', '').replace('x_', '')

        // Check if field name suggests a parent-child relationship
        // Common patterns: category/subcategory, group/subgroup
        if (
          fieldBaseName.includes(parentBaseName) ||
          fieldBaseName.startsWith('sub' + parentBaseName)
        ) {
          relationships.push({
            childField: field.name,
            parentField: potentialParent.name,
            parentModel: potentialParent.relation || ''
          })
        }
      }
    }

    return relationships
  }, [many2oneFields, modelName])

  // Get parent field for a given child field
  const getParentFieldName = useCallback((childFieldName: string): string | null => {
    const rel = fieldRelationships.find(r => r.childField === childFieldName)
    return rel?.parentField || null
  }, [fieldRelationships])

  // Check if a field is a child field (has a parent dependency)
  const isChildField = useCallback((fieldName: string): boolean => {
    return fieldRelationships.some(r => r.childField === fieldName)
  }, [fieldRelationships])

  // Check if parent is selected for a child field
  const isParentSelected = useCallback((childFieldName: string): boolean => {
    const parentFieldName = getParentFieldName(childFieldName)
    if (!parentFieldName) return true
    const parentValue = formData[parentFieldName]
    return parentValue !== null && parentValue !== undefined && parentValue !== 0 && parentValue !== ''
  }, [getParentFieldName, formData])

  // Initialize form data
  useEffect(() => {
    if (record) {
      const data: Record<string, any> = {}
      fields.forEach(field => {
        if (field.type === 'many2one' && Array.isArray(record[field.name])) {
          data[field.name] = record[field.name][0] || 0
        } else {
          data[field.name] = record[field.name] ?? ''
        }
      })
      setFormData(data)
    } else {
      const data: Record<string, any> = {}
      fields.forEach(field => {
        data[field.name] = field.type === 'boolean' ? false : (field.type === 'integer' || field.type === 'float' ? 0 : '')
      })
      setFormData(data)
    }
  }, [record, fields])

  // Fetch options for a many2one field
  const fetchRelationOptions = useCallback(async (field: ModelField, parentId?: number) => {
    if (!field.relation || !sessionId) return

    // For self-referencing fields (like x_parent_id), use allRecords
    if (field.relation === modelName) {
      const options = allRecords
        .filter(r => !record || r.id !== record.id)
        .map(r => ({
          id: r.id,
          name: r.x_name || r.name || r.display_name || `#${r.id}`
        }))
      setRelationOptions(prev => ({ ...prev, [field.name]: options }))
      return
    }

    setLoadingOptions(prev => ({ ...prev, [field.name]: true }))

    try {
      // Check if this field is a child field that needs filtering
      const parentFieldName = getParentFieldName(field.name)
      let url = `${API_BASE_URL}/master-lookups/${field.relation}`

      // If there's a parent dependency and a parent is selected, use filtered endpoint
      if (parentFieldName && parentId) {
        // The parent field name in the child model is typically x_{parentModelName}_id
        const parentModel = fields.find(f => f.name === parentFieldName)?.relation
        if (parentModel) {
          const parentFieldInChildModel = `x_${parentModel.replace('x_', '')}_id`
          url = `${API_BASE_URL}/master-lookups/${field.relation}/filtered?parentField=${parentFieldInChildModel}&parentId=${parentId}`
        }
      }

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || '',
          'X-Tenant-ID': tenantId || '',
        },
      })

      const data = await response.json()
      if (data.success) {
        const options = (data.data || []).map((r: any) => ({
          id: r.id,
          name: r.x_name || r.name || r.display_name || `#${r.id}`
        }))
        setRelationOptions(prev => ({ ...prev, [field.name]: options }))
      }
    } catch (error) {
      console.error(`Error fetching options for ${field.name}:`, error)
      setRelationOptions(prev => ({ ...prev, [field.name]: [] }))
    } finally {
      setLoadingOptions(prev => ({ ...prev, [field.name]: false }))
    }
  }, [sessionId, tenantId, modelName, allRecords, record, getParentFieldName, fields])

  // Fetch initial options for all many2one fields
  useEffect(() => {
    if (!isOpen) return

    for (const field of many2oneFields) {
      // For child fields, only fetch if parent is selected
      if (isChildField(field.name)) {
        if (isParentSelected(field.name)) {
          const parentFieldName = getParentFieldName(field.name)
          const parentValue = parentFieldName ? formData[parentFieldName] : null
          fetchRelationOptions(field, parentValue || undefined)
        } else {
          // Clear options for child fields when parent not selected
          setRelationOptions(prev => ({ ...prev, [field.name]: [] }))
        }
      } else {
        // Non-child fields: fetch all options
        fetchRelationOptions(field)
      }
    }
  }, [isOpen, many2oneFields, fetchRelationOptions, isChildField, isParentSelected, formData, getParentFieldName])

  // Handle field value change
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [fieldName]: value }

      // If this field is a parent, clear all its dependent children
      const dependentChildren = fieldRelationships.filter(r => r.parentField === fieldName)
      for (const child of dependentChildren) {
        newData[child.childField] = 0
      }

      return newData
    })

    // If this field is a parent, refetch options for dependent children
    const dependentChildren = fieldRelationships.filter(r => r.parentField === fieldName)
    for (const child of dependentChildren) {
      const childField = fields.find(f => f.name === child.childField)
      if (childField && value) {
        fetchRelationOptions(childField, value)
      } else if (childField) {
        setRelationOptions(prev => ({ ...prev, [child.childField]: [] }))
      }
    }
  }, [fieldRelationships, fields, fetchRelationOptions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nameField = fields.find(f => f.name === 'x_name' || f.name === 'name')
    if (nameField && !formData[nameField.name]?.toString().trim()) {
      showToast(t('Name is required'), 'error')
      return
    }

    const saveData: Record<string, any> = {}
    fields.forEach(field => {
      if (field.type === 'many2one') {
        saveData[field.name] = formData[field.name] || false
      } else if (field.type === 'boolean') {
        saveData[field.name] = !!formData[field.name]
      } else if (field.type === 'integer') {
        saveData[field.name] = parseInt(formData[field.name]) || 0
      } else if (field.type === 'float') {
        saveData[field.name] = parseFloat(formData[field.name]) || 0
      } else if (field.type === 'datetime') {
        // Convert datetime-local format (2026-02-05T06:21) to Odoo format (2026-02-05 06:21)
        const val = formData[field.name]
        saveData[field.name] = val ? String(val).replace('T', ' ') : val
      } else {
        saveData[field.name] = formData[field.name]
      }
    })

    await onSave(saveData)
  }

  if (!isOpen) return null

  // Group fields for better layout
  const textFields = fields.filter(f =>
    f.type === 'char' || f.type === 'text' ||
    f.name === 'x_name' || f.name.includes('name') || f.name.includes('code')
  )
  const relationFieldsList = fields.filter(f => f.type === 'many2one')
  const numberFields = fields.filter(f => f.type === 'integer' || f.type === 'float')
  const booleanFields = fields.filter(f => f.type === 'boolean')
  const dateFields = fields.filter(f => f.type === 'date' || f.type === 'datetime')
  const otherFields = fields.filter(f =>
    !textFields.includes(f) &&
    !relationFieldsList.includes(f) &&
    !numberFields.includes(f) &&
    !booleanFields.includes(f) &&
    !dateFields.includes(f)
  )

  const renderField = (field: ModelField) => {
    const FieldIcon = FIELD_TYPE_ICONS[field.type] || Type
    const isChild = isChildField(field.name)
    const parentSelected = isParentSelected(field.name)
    const parentFieldName = getParentFieldName(field.name)
    const parentField = parentFieldName ? fields.find(f => f.name === parentFieldName) : null

    if (field.type === 'boolean') {
      return (
        <div key={field.name} className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            id={field.name}
            checked={!!formData[field.name]}
            onChange={e => handleFieldChange(field.name, e.target.checked)}
            className="w-5 h-5 rounded"
          />
          <label htmlFor={field.name} className="text-sm font-medium" style={{ color: colors.textPrimary }}>
            {field.string || field.name}
          </label>
        </div>
      )
    }

    if (field.type === 'many2one') {
      const options = relationOptions[field.name] || []
      const isDisabled = isChild && !parentSelected
      const isLoadingField = loadingOptions[field.name]

      return (
        <div key={field.name} className="relative">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            <span className="flex items-center gap-2">
              <FieldIcon size={14} />
              {field.string || field.name}
              {field.required && <span className="text-red-500">*</span>}
            </span>
          </label>
          <div className="relative">
            <select
              value={formData[field.name] || 0}
              onChange={e => handleFieldChange(field.name, Number(e.target.value))}
              disabled={isDisabled || isLoadingField}
              className="w-full px-4 py-2.5 rounded-xl text-sm transition-colors appearance-none"
              style={{
                backgroundColor: mode === 'dark' ? '#27272a' : '#f4f4f5',
                border: `1px solid ${colors.border}`,
                color: isDisabled ? colors.textSecondary : colors.textPrimary,
                opacity: isDisabled ? 0.6 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              <option value={0}>
                {isDisabled
                  ? t('Select {{parent}} first', { parent: parentField?.string || 'parent' })
                  : isLoadingField
                  ? t('Loading...')
                  : t('Select...')
                }
              </option>
              {options.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {isLoadingField ? (
                <Loader2 size={16} className="animate-spin" style={{ color: colors.textSecondary }} />
              ) : (
                <ChevronDown size={16} style={{ color: colors.textSecondary }} />
              )}
            </div>
          </div>
          {isChild && !parentSelected && (
            <p className="mt-1 text-xs flex items-center gap-1" style={{ color: colors.textSecondary }}>
              <AlertCircle size={12} />
              {t('Depends on')} {parentField?.string || parentFieldName}
            </p>
          )}
        </div>
      )
    }

    if (field.type === 'text') {
      return (
        <div key={field.name}>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            <span className="flex items-center gap-2">
              <FieldIcon size={14} />
              {field.string || field.name}
              {field.required && <span className="text-red-500">*</span>}
            </span>
          </label>
          <textarea
            value={formData[field.name] || ''}
            onChange={e => handleFieldChange(field.name, e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm transition-colors"
            rows={3}
            style={{
              backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
            }}
          />
        </div>
      )
    }

    return (
      <div key={field.name}>
        <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
          <span className="flex items-center gap-2">
            <FieldIcon size={14} />
            {field.string || field.name}
            {field.required && <span className="text-red-500">*</span>}
          </span>
        </label>
        <input
          type={field.type === 'integer' || field.type === 'float' ? 'number' : field.type === 'date' ? 'date' : field.type === 'datetime' ? 'datetime-local' : 'text'}
          value={formData[field.name] ?? ''}
          onChange={e => handleFieldChange(field.name, e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl text-sm transition-colors"
          style={{
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${colors.border}`,
            color: colors.textPrimary,
          }}
          dir={field.name.includes('_ar') ? 'rtl' : 'ltr'}
        />
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: colors.action }}
            >
              <Database size={20} color="#fff" />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                {record ? t('Edit Record') : t('New Record')}
              </h3>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {modelLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X size={20} color={colors.textSecondary} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          {/* Text Fields - Full Width */}
          {textFields.length > 0 && (
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                {t('Basic Information')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {textFields.map(field => renderField(field))}
              </div>
            </div>
          )}

          {/* Relation Fields - Grid Layout */}
          {relationFieldsList.length > 0 && (
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: colors.textSecondary }}>
                <Link2 size={14} />
                {t('Relationships')}
              </h4>
              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relationFieldsList.map(field => renderField(field))}
                </div>
              </div>
            </div>
          )}

          {/* Number Fields */}
          {numberFields.length > 0 && (
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                {t('Numbers')}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {numberFields.map(field => renderField(field))}
              </div>
            </div>
          )}

          {/* Date Fields */}
          {dateFields.length > 0 && (
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                {t('Dates')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dateFields.map(field => renderField(field))}
              </div>
            </div>
          )}

          {/* Boolean Fields */}
          {booleanFields.length > 0 && (
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                {t('Options')}
              </h4>
              <div
                className="p-4 rounded-xl flex flex-wrap gap-4"
                style={{
                  backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${colors.border}`,
                }}
              >
                {booleanFields.map(field => renderField(field))}
              </div>
            </div>
          )}

          {/* Other Fields */}
          {otherFields.length > 0 && (
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                {t('Other')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherFields.map(field => renderField(field))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              style={{
                borderColor: colors.border,
                color: colors.textPrimary,
              }}
            >
              {t('Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2"
              style={{
                background: colors.action,
                color: '#fff',
              }}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} color="#fff" />
              )}
              {t('Save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface AddModelModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  showToast: (text: string, state?: "success" | "error" | "warning" | "info") => void
  sessionId: string | null
  tenantId: string | null
  existingModels: DynamicModel[]
}

function AddModelModal({ isOpen, onClose, onSuccess, showToast, sessionId, tenantId, existingModels }: AddModelModalProps) {
  const { t } = useTranslation()
  const { mode, colors } = useTheme()
  const [modelName, setModelName] = useState('')
  const [modelLabel, setModelLabel] = useState('')
  const [fields, setFields] = useState<{ name: string; label: string; type: string; required: boolean; relation?: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [systemModels, setSystemModels] = useState<{ model: string; name: string }[]>([])

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchSystemModels()
    }
  }, [isOpen, sessionId])

  const fetchSystemModels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-import/system-models`, {
        headers: {
          'X-Session-ID': sessionId || '',
          'X-Tenant-ID': tenantId || '',
        },
      })
      const data = await response.json()
      if (data.success) {
        setSystemModels(data.models || [])
      }
    } catch (error) {
      console.error('Error fetching system models:', error)
    }
  }

  const addField = () => {
    setFields(prev => [...prev, { name: '', label: '', type: 'char', required: false }])
  }

  const removeField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index))
  }

  const updateField = (index: number, updates: Partial<typeof fields[0]>) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!modelName.trim()) {
      showToast(t('Model name is required'), 'error')
      return
    }

    const cleanName = modelName.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    const fullModelName = cleanName.startsWith('x_') ? cleanName : `x_${cleanName}`

    if (existingModels.some(m => m.modelName === fullModelName)) {
      showToast(t('A model with this name already exists'), 'error')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-import/create-lookup-model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || '',
          'X-Tenant-ID': tenantId || '',
        },
        body: JSON.stringify({
          modelName: fullModelName,
          modelLabel: modelLabel || modelName,
          fields: fields.filter(f => f.name.trim()).map(f => ({
            name: f.name.startsWith('x_') ? f.name : `x_${f.name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`,
            label: f.label || f.name,
            type: f.type,
            required: f.required,
            relation: f.relation,
          })),
        }),
      })

      const result = await response.json()
      if (result.success) {
        showToast(t('Model created successfully'), 'success')
        onSuccess()
        onClose()
        setModelName('')
        setModelLabel('')
        setFields([])
      } else {
        showToast(sanitizeErrorMessage(result.message || t('Failed to create model')), 'error')
      }
    } catch (error) {
      console.error('Error creating model:', error)
      showToast(sanitizeErrorMessage(t('Failed to create model')), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: colors.action }}
            >
              <Plus size={20} color="#fff" />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                {t('Add Lookup Master')}
              </h3>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {t('Create a new lookup model with custom fields')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X size={20} color={colors.textSecondary} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Model Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                {t('Model Name')} <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono" style={{ color: colors.textSecondary }}>x_</span>
                <input
                  type="text"
                  value={modelName}
                  onChange={e => setModelName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm transition-colors"
                  style={{
                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  }}
                  placeholder="model_name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                {t('Display Label')}
              </label>
              <input
                type="text"
                value={modelLabel}
                onChange={e => setModelLabel(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm transition-colors"
                style={{
                  backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                }}
                placeholder="My Lookup Model"
              />
            </div>
          </div>

          {/* Fields Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                {t('Custom Fields')}
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addField}
                className="flex items-center gap-1 text-xs"
                style={{ borderColor: colors.border, color: colors.textPrimary }}
              >
                <Plus size={14} />
                {t('Add Field')}
              </Button>
            </div>

            <p className="text-xs mb-3" style={{ color: colors.textSecondary }}>
              {t('A "Name" field (x_name) is automatically created. Add additional fields below.')}
            </p>

            {fields.length > 0 && (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl"
                    style={{
                      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div className="grid grid-cols-12 gap-3">
                      {/* Field Name */}
                      <div className="col-span-3">
                        <label className="text-xs mb-1 block" style={{ color: colors.textSecondary }}>{t('Field Name')}</label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono" style={{ color: colors.textSecondary }}>x_</span>
                          <input
                            type="text"
                            value={field.name.replace(/^x_/, '')}
                            onChange={e => updateField(index, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                            className="w-full px-2 py-1.5 rounded-lg text-xs"
                            style={{
                              backgroundColor: colors.card,
                              border: `1px solid ${colors.border}`,
                              color: colors.textPrimary,
                            }}
                            placeholder="field_name"
                          />
                        </div>
                      </div>

                      {/* Field Label */}
                      <div className="col-span-3">
                        <label className="text-xs mb-1 block" style={{ color: colors.textSecondary }}>{t('Label')}</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={e => updateField(index, { label: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg text-xs"
                          style={{
                            backgroundColor: colors.card,
                            border: `1px solid ${colors.border}`,
                            color: colors.textPrimary,
                          }}
                          placeholder="Field Label"
                        />
                      </div>

                      {/* Field Type */}
                      <div className="col-span-3">
                        <label className="text-xs mb-1 block" style={{ color: colors.textSecondary }}>{t('Type')}</label>
                        <select
                          value={field.type}
                          onChange={e => updateField(index, { type: e.target.value, relation: undefined })}
                          className="w-full px-2 py-1.5 rounded-lg text-xs"
                          style={{
                            backgroundColor: mode === 'dark' ? '#27272a' : '#f4f4f5',
                            border: `1px solid ${colors.border}`,
                            color: colors.textPrimary,
                          }}
                        >
                          {FIELD_TYPES.map(ft => (
                            <option key={ft.value} value={ft.value}>{ft.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Relation (for many2one/one2many/many2many) */}
                      <div className="col-span-2">
                        {['many2one', 'one2many', 'many2many'].includes(field.type) ? (
                          <>
                            <label className="text-xs mb-1 block" style={{ color: colors.textSecondary }}>{t('Related To')}</label>
                            <select
                              value={field.relation || ''}
                              onChange={e => updateField(index, { relation: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-lg text-xs"
                              style={{
                                backgroundColor: mode === 'dark' ? '#27272a' : '#f4f4f5',
                                border: `1px solid ${colors.border}`,
                                color: colors.textPrimary,
                              }}
                            >
                              <option value="">{t('Select...')}</option>
                              <option value="__self__">{t('Self (Parent-Child)')}</option>
                              {systemModels.map(m => (
                                <option key={m.model} value={m.model}>{m.name}</option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <>
                            <label className="text-xs mb-1 block" style={{ color: colors.textSecondary }}>{t('Required')}</label>
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={e => updateField(index, { required: e.target.checked })}
                                className="w-4 h-4 rounded"
                              />
                              <span className="text-xs" style={{ color: colors.textSecondary }}>{t('Required')}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-1 flex items-end justify-end pb-1">
                        <button
                          type="button"
                          onClick={() => removeField(index)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={14} color="#dc2626" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              style={{ borderColor: colors.border, color: colors.textPrimary }}
              disabled={isLoading}
            >
              {t('Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2"
              style={{
                background: colors.action,
                color: '#fff',
              }}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Plus size={18} color="#fff" />
              )}
              {t('Create Model')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MasterLookupsPage() {
  const { t, i18n } = useTranslation()
  const { mode, colors } = useTheme()
  const { sessionId } = useAuth()
  const isRTL = i18n.dir() === 'rtl'
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('current_tenant_id') : null

  const [dynamicModels, setDynamicModels] = useState<DynamicModel[]>([])
  const [selectedModel, setSelectedModel] = useState<DynamicModel | null>(null)
  const [modelFields, setModelFields] = useState<ModelField[]>([])
  const [records, setRecords] = useState<MasterRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [fieldsLoading, setFieldsLoading] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editModal, setEditModal] = useState<{ open: boolean; record: MasterRecord | null }>({ open: false, record: null })
  const [saving, setSaving] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false)
  const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [selectedModelsForCleanup, setSelectedModelsForCleanup] = useState<string[]>([])
  const [toastData, setToastData] = useState<{ text: string; state: "success" | "error" | "warning" | "info" } | null>(null)
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])

  const showToast = (text: string, state: "success" | "error" | "warning" | "info" = "success") => {
    setToastData({ text, state })
  }

  // Fetch all dynamic models
  const fetchDynamicModels = useCallback(async () => {
    if (!sessionId) return
    setModelsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-import/models`, {
        headers: {
          'X-Session-ID': sessionId,
          'X-Tenant-ID': tenantId || '',
        },
      })
      const data = await response.json()
      if (data.success) {
        setDynamicModels(data.models || [])
        // Auto-select first model if none selected
        if (!selectedModel && data.models?.length > 0) {
          setSelectedModel(data.models[0])
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error)
    } finally {
      setModelsLoading(false)
    }
  }, [sessionId, tenantId, selectedModel])

  // Fetch fields for selected model
  const fetchModelFields = useCallback(async (modelName: string) => {
    if (!sessionId) return
    setFieldsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-import/model-fields/${modelName}`, {
        headers: {
          'X-Session-ID': sessionId,
          'X-Tenant-ID': tenantId || '',
        },
      })
      const data = await response.json()
      if (data.success) {
        // Filter out internal fields
        const filteredFields = (data.fields || []).filter((f: ModelField) =>
          !['id', '__last_update', 'display_name', 'create_uid', 'create_date', 'write_uid', 'write_date'].includes(f.name)
        )
        setModelFields(filteredFields)
        // Initialize visible columns to all fields + id
        setVisibleColumns(['id', ...filteredFields.map((f: ModelField) => f.name)])
      }
    } catch (error) {
      console.error('Error fetching model fields:', error)
      setModelFields([])
    } finally {
      setFieldsLoading(false)
    }
  }, [sessionId, tenantId])

  // Fetch records for selected model
  const fetchRecords = useCallback(async () => {
    if (!sessionId || !selectedModel) return
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/master-lookups/${selectedModel.modelName}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
          'X-Tenant-ID': tenantId || '',
        },
      })
      const data = await response.json()
      if (data.success) {
        setRecords(data.data || [])
      } else {
        // Try generic endpoint
        const genericResponse = await fetch(`${API_BASE_URL}/odoo/search-read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId,
            'X-Tenant-ID': tenantId || '',
          },
          body: JSON.stringify({
            model: selectedModel.modelName,
            sessionId,
            args: [],
            kwargs: {},
          }),
        })
        const genericData = await genericResponse.json()
        if (genericData.success || Array.isArray(genericData)) {
          setRecords(Array.isArray(genericData) ? genericData : genericData.data || [])
        }
      }
    } catch (error) {
      console.error('Error fetching records:', error)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [sessionId, tenantId, selectedModel])

  // Initial load
  useEffect(() => {
    fetchDynamicModels()
  }, [fetchDynamicModels])

  // Load fields and records when model changes
  useEffect(() => {
    if (selectedModel) {
      fetchModelFields(selectedModel.modelName)
      fetchRecords()
    }
  }, [selectedModel, fetchModelFields, fetchRecords])

  // Filter records by search
  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records
    const query = searchQuery.toLowerCase()
    return records.filter(record => {
      return Object.values(record).some(val => {
        if (val === null || val === undefined) return false
        if (Array.isArray(val)) {
          return val.some(v => String(v).toLowerCase().includes(query))
        }
        return String(val).toLowerCase().includes(query)
      })
    })
  }, [records, searchQuery])

  // Build hierarchy for parent-child relationships
  const hierarchicalRecords = useMemo(() => {
    const parentField = modelFields.find(f => f.name === 'x_parent_id' && f.type === 'many2one')
    if (!parentField) return filteredRecords.map(r => ({ ...r, children: [] }))

    const itemMap = new Map<number, MasterRecord & { children: MasterRecord[] }>()
    const roots: (MasterRecord & { children: MasterRecord[] })[] = []

    filteredRecords.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] })
    })

    filteredRecords.forEach(item => {
      const node = itemMap.get(item.id)!
      const parentId = Array.isArray(item.x_parent_id) ? item.x_parent_id[0] : null
      if (parentId && itemMap.has(parentId)) {
        itemMap.get(parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }, [filteredRecords, modelFields])

  // Available columns for selector
  const availableColumns = useMemo(() => {
    const cols = [{ id: 'id', label: 'ID' }]
    modelFields.forEach(field => {
      cols.push({ id: field.name, label: field.string || field.name })
    })
    return cols
  }, [modelFields])

  // Save record
  const handleSave = async (data: Partial<MasterRecord>) => {
    if (!selectedModel) return
    setSaving(true)
    try {
      const url = editModal.record
        ? `${API_BASE_URL}/master-lookups/${selectedModel.modelName}/${editModal.record.id}`
        : `${API_BASE_URL}/master-lookups/${selectedModel.modelName}`

      const response = await fetch(url, {
        method: editModal.record ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || '',
          'X-Tenant-ID': tenantId || '',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (result.success) {
        showToast(editModal.record ? t('Record updated successfully') : t('Record created successfully'), 'success')
        setEditModal({ open: false, record: null })
        fetchRecords()
      } else {
        showToast(sanitizeErrorMessage(result.message || t('Failed to save record')), 'error')
      }
    } catch (error) {
      console.error('Error saving record:', error)
      showToast(sanitizeErrorMessage(t('Failed to save record')), 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete record
  const handleDelete = async (record: MasterRecord) => {
    if (!selectedModel) return
    if (!confirm(t('Are you sure you want to delete this record?'))) return

    try {
      const response = await fetch(`${API_BASE_URL}/master-lookups/${selectedModel.modelName}/${record.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || '',
          'X-Tenant-ID': tenantId || '',
        },
      })

      const result = await response.json()
      if (result.success) {
        showToast(t('Record deleted successfully'), 'success')
        fetchRecords()
      } else {
        showToast(sanitizeErrorMessage(result.message || t('Failed to delete record')), 'error')
      }
    } catch (error) {
      console.error('Error deleting record:', error)
      showToast(sanitizeErrorMessage(t('Failed to delete record')), 'error')
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Handle cleanup
  const handleCleanup = async (deleteModels: boolean = false) => {
    if (selectedModelsForCleanup.length === 0) {
      showToast(t('Please select at least one model'), 'error')
      return
    }

    setCleanupLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-import/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || '',
          'X-Tenant-ID': tenantId || '',
        },
        body: JSON.stringify({
          sessionId,
          modelNames: selectedModelsForCleanup,
          deleteModels,
        }),
      })

      const result = await response.json()
      if (result.success) {
        if (result.results?.modelsProcessed > 0 || result.results?.recordsDeleted > 0) {
          showToast(result.message || t('Data cleaned successfully'), 'success')
        } else {
          showToast(result.message || t('No data found to clean'), 'warning')
        }
        setIsCleanupModalOpen(false)
        setSelectedModelsForCleanup([])
        fetchDynamicModels()
        if (selectedModel) fetchRecords()
      } else {
        const errorDetails = result.results?.errors?.length > 0
          ? `: ${result.results.errors.map((e: { model: string; error: string }) => `${e.model}: ${sanitizeErrorMessage(e.error)}`).join(', ')}`
          : ''
        showToast(sanitizeErrorMessage((result.message || t('Cleanup failed')) + errorDetails), 'error')
      }
    } catch (error) {
      console.error('Error during cleanup:', error)
      showToast(sanitizeErrorMessage(t('Cleanup failed')), 'error')
    } finally {
      setCleanupLoading(false)
    }
  }

  // Handle import complete
  const handleImportComplete = () => {
    setIsImportModalOpen(false)
    fetchDynamicModels()
    if (selectedModel) fetchRecords()
    showToast(t('Import completed! Refreshing data...'), 'success')
  }

  // Get display value for a field
  const getDisplayValue = (record: MasterRecord, fieldName: string) => {
    const value = record[fieldName]
    if (value === null || value === undefined) return '-'
    if (Array.isArray(value)) {
      // Many2one field returns [id, name]
      return value[1] || value[0] || '-'
    }
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗'
    }
    return String(value)
  }

  // Render record row
  const renderRow = (record: MasterRecord & { children?: MasterRecord[] }, level = 0) => {
    const hasChildren = record.children && record.children.length > 0
    const isExpanded = expandedRows.has(record.id)

    return (
      <div key={record.id}>
        <div
          className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          style={{
            paddingLeft: `${16 + level * 24}px`,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          {/* Expand/Collapse */}
          <div className="w-6 flex-shrink-0">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(record.id)}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
              >
                {isExpanded ? (
                  <ChevronDown size={16} color={colors.textSecondary} />
                ) : (
                  <ChevronRight size={16} color={colors.textSecondary} />
                )}
              </button>
            ) : null}
          </div>

          {/* ID */}
          {visibleColumns.includes('id') && (
            <div className="w-16 text-sm font-mono flex-shrink-0" style={{ color: colors.textSecondary }}>
              #{record.id}
            </div>
          )}

          {/* Dynamic Fields */}
          {modelFields.filter(f => visibleColumns.includes(f.name)).map((field, idx) => (
            <div
              key={field.name}
              className={`${idx === 0 ? 'flex-1 min-w-0' : 'w-32'} text-sm ${idx === 0 ? 'font-medium' : ''}`}
              style={{ color: idx === 0 ? colors.textPrimary : colors.textSecondary }}
            >
              <span className="truncate block">{getDisplayValue(record, field.name)}</span>
            </div>
          ))}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setEditModal({ open: true, record })}
              className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              title={t('Edit')}
            >
              <Edit2 size={16} color={colors.textSecondary} />
            </button>
            <button
              onClick={() => handleDelete(record)}
              className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
              title={t('Delete')}
            >
              <Trash2 size={16} color="#dc2626" />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {record.children!.map(child => renderRow(child as any, level + 1))}
          </div>
        )}
      </div>
    )
  }

  // Stats
  const totalModels = dynamicModels.length
  const totalRecords = records.length
  const totalFields = modelFields.length

  return (
    <div
      className="p-6 space-y-6 min-h-screen"
      style={{ backgroundColor: colors.background }}
    >
      {/* CSS for animations and dark mode fixes */}
      <style>
        {`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }

          /* Dark mode select/option styling */
          ${mode === 'dark' ? `
            select option {
              background-color: #27272a !important;
              color: #f4f4f5 !important;
            }
            select:focus {
              outline-color: #3b82f6;
            }
          ` : ''}
        `}
      </style>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            {t('Master Lookups')}
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            {t('Manage lookup models and master data')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsCleanupModalOpen(true)}
            className="flex items-center gap-2"
            style={{
              borderColor: colors.border,
              color: colors.textPrimary,
              background: mode === 'dark' ? 'rgba(255,255,255,0.03)' : colors.card,
            }}
          >
            <Trash size={16} />
            {t('Cleanup')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2"
            style={{
              borderColor: colors.border,
              color: colors.textPrimary,
              background: mode === 'dark' ? 'rgba(255,255,255,0.03)' : colors.card,
            }}
          >
            <Upload size={16} />
            {t('Import')}
          </Button>
          <Button
            onClick={() => setIsAddModelModalOpen(true)}
            className="flex items-center gap-2"
            style={{ background: colors.action, color: '#fff' }}
          >
            <Plus size={18} color="#fff" />
            {t('Add Lookup Master')}
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("Total Models")}
          value={totalModels}
          icon={Layers}
          gradient="linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)"
          delay={0}
        />
        <StatCard
          label={selectedModel ? selectedModel.displayName : t("Records")}
          value={totalRecords}
          icon={Database}
          gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
          delay={1}
        />
        <StatCard
          label={t("Fields")}
          value={totalFields}
          icon={Settings}
          gradient="linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
          delay={2}
        />
        <StatCard
          label={t("Active Model")}
          value={selectedModel?.displayName || '-'}
          icon={CheckCircle}
          gradient="linear-gradient(135deg, #ea580c 0%, #dc2626 100%)"
          delay={3}
        />
      </div>

      {/* Model Selector */}
      <div
        className="p-4 rounded-xl"
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Database size={18} color={colors.textSecondary} />
            <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
              {t('Select Model')}:
            </span>
          </div>

          {/* Model Dropdown */}
          <div className="relative flex-1 max-w-md">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm transition-colors"
              style={{
                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              }}
            >
              <span className="flex items-center gap-2 truncate">
                {selectedModel ? (
                  <>
                    <span className="font-medium">{selectedModel.displayName}</span>
                    <span className="text-xs opacity-60 font-mono">{selectedModel.modelName}</span>
                  </>
                ) : (
                  <span style={{ color: colors.textSecondary }}>{t('Select a model...')}</span>
                )}
              </span>
              <ChevronDown size={16} color={colors.textSecondary} className={`transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isModelDropdownOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
                style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}
              >
                {modelsLoading ? (
                  <div className="p-4 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin" color={colors.textSecondary} />
                  </div>
                ) : dynamicModels.length === 0 ? (
                  <div className="p-4 text-center text-sm" style={{ color: colors.textSecondary }}>
                    {t('No models found')}
                  </div>
                ) : (
                  dynamicModels.map((model, idx) => {
                    const Icon = MODEL_ICONS[idx % MODEL_ICONS.length]
                    const gradient = MODEL_GRADIENTS[idx % MODEL_GRADIENTS.length]
                    const isSelected = selectedModel?.modelName === model.modelName

                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model)
                          setIsModelDropdownOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{
                          backgroundColor: isSelected ? (mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') : 'transparent',
                          borderBottom: idx < dynamicModels.length - 1 ? `1px solid ${colors.border}` : 'none',
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: gradient }}
                        >
                          <Icon size={16} color="#fff" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-medium text-sm truncate" style={{ color: colors.textPrimary }}>
                            {model.displayName}
                          </div>
                          <div className="text-xs font-mono truncate" style={{ color: colors.textSecondary }}>
                            {model.modelName}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle size={16} color="#059669" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => {
              fetchDynamicModels()
              if (selectedModel) {
                fetchModelFields(selectedModel.modelName)
                fetchRecords()
              }
            }}
            className="flex items-center gap-2"
            style={{ borderColor: colors.border, color: colors.textPrimary }}
          >
            <RefreshCw size={16} className={modelsLoading || loading ? 'animate-spin' : ''} />
            {t('Refresh')}
          </Button>
        </div>
      </div>

      {/* Search & Column Selector */}
      {selectedModel && (
        <div
          className="p-4 rounded-xl"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{
                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${colors.border}`,
              }}
            >
              <Search size={18} color={colors.textSecondary} />
              <input
                type="text"
                placeholder={t('Search records...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: colors.textPrimary }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5">
                  <X size={16} color={colors.textSecondary} />
                </button>
              )}
            </div>

            {/* Column Selector */}
            <ColumnsSelector
              columns={availableColumns}
              selectedColumns={visibleColumns}
              onSelectionChange={setVisibleColumns}
              label={t('Columns')}
            />

            <Button
              onClick={() => setEditModal({ open: true, record: null })}
              className="flex items-center gap-2"
              style={{ background: colors.action, color: '#fff' }}
            >
              <Plus size={18} color="#fff" />
              {t('Add New')}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {selectedModel && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
          }}
        >
          {/* Table Header */}
          <div
            className="flex items-center gap-4 px-4 py-3 text-sm font-medium"
            style={{
              backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderBottom: `1px solid ${colors.border}`,
              color: colors.textSecondary,
            }}
          >
            <div className="w-6"></div>
            {visibleColumns.includes('id') && <div className="w-16">{t('ID')}</div>}
            {modelFields.filter(f => visibleColumns.includes(f.name)).map((field, idx) => (
              <div key={field.name} className={idx === 0 ? 'flex-1' : 'w-32'}>
                {field.string || field.name}
              </div>
            ))}
            <div className="w-24">{t('Actions')}</div>
          </div>

          {/* Table Body */}
          {loading || fieldsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin" color={colors.textSecondary} />
            </div>
          ) : hierarchicalRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Database size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <p style={{ color: colors.textSecondary }}>{t('No records found')}</p>
              <Button
                onClick={() => setEditModal({ open: true, record: null })}
                variant="outline"
                className="flex items-center gap-2 mt-2"
                style={{ borderColor: colors.border, color: colors.textPrimary }}
              >
                <Plus size={16} />
                {t('Add First Record')}
              </Button>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-500px)] overflow-y-auto">
              {hierarchicalRecords.map(record => renderRow(record))}
            </div>
          )}
        </div>
      )}

      {/* No Model Selected */}
      {!selectedModel && !modelsLoading && (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
          }}
        >
          <Database size={64} color={colors.textSecondary} style={{ opacity: 0.3, margin: '0 auto' }} />
          <h3 className="text-lg font-semibold mt-4" style={{ color: colors.textPrimary }}>
            {dynamicModels.length === 0 ? t('No Lookup Models Found') : t('Select a Model')}
          </h3>
          <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
            {dynamicModels.length === 0
              ? t('Create a new lookup model or import data to get started.')
              : t('Choose a model from the dropdown above to view and manage its records.')
            }
          </p>
          {dynamicModels.length === 0 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button
                onClick={() => setIsAddModelModalOpen(true)}
                className="flex items-center gap-2"
                style={{ background: colors.action, color: '#fff' }}
              >
                <Plus size={18} color="#fff" />
                {t('Add Lookup Master')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2"
                style={{ borderColor: colors.border, color: colors.textPrimary }}
              >
                <Upload size={18} />
                {t('Import Data')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {selectedModel && (
        <EditModal
          isOpen={editModal.open}
          onClose={() => setEditModal({ open: false, record: null })}
          record={editModal.record}
          modelName={selectedModel.modelName}
          modelLabel={selectedModel.displayName}
          fields={modelFields}
          allRecords={records}
          onSave={handleSave}
          isLoading={saving}
          showToast={showToast}
        />
      )}

      {/* Add Model Modal */}
      <AddModelModal
        isOpen={isAddModelModalOpen}
        onClose={() => setIsAddModelModalOpen(false)}
        onSuccess={() => fetchDynamicModels()}
        showToast={showToast}
        sessionId={sessionId}
        tenantId={tenantId}
        existingModels={dynamicModels}
      />

      {/* Import Modal */}
      <DynamicImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onComplete={handleImportComplete}
      />

      {/* Cleanup Modal */}
      {isCleanupModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setIsCleanupModalOpen(false)}
        >
          <div
            className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              boxShadow: mode === 'dark'
                ? '0 25px 50px -12px rgba(0,0,0,0.5)'
                : '0 25px 50px -12px rgba(0,0,0,0.15)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${colors.border}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(220,38,38,0.1)' }}
                >
                  <Trash size={20} color="#dc2626" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                    {t('Cleanup Imported Data')}
                  </h3>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    {t('Select models to clean up or delete')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCleanupModalOpen(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              >
                <X size={20} color={colors.textSecondary} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                {t('Select the custom models you want to clean. You can either delete all data from the models or completely remove the models from the system.')}
              </p>

              {/* Model List */}
              <div
                className="rounded-xl overflow-hidden mb-4"
                style={{ border: `1px solid ${colors.border}`, maxHeight: '300px', overflowY: 'auto' }}
              >
                {dynamicModels.length === 0 ? (
                  <div className="py-8 text-center">
                    <Database size={32} color={colors.textSecondary} style={{ opacity: 0.5, margin: '0 auto 0.75rem' }} />
                    <p style={{ color: colors.textSecondary, fontSize: '0.875rem' }}>
                      {t('No custom models found')}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Select All */}
                    <div
                      className="flex items-center gap-3 px-4 py-3"
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        background: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedModelsForCleanup.length === dynamicModels.length && dynamicModels.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedModelsForCleanup(dynamicModels.map(m => m.modelName))
                          } else {
                            setSelectedModelsForCleanup([])
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                        {t('Select All')} ({dynamicModels.length})
                      </span>
                    </div>

                    {/* Models */}
                    {dynamicModels.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center gap-3 px-4 py-3"
                        style={{ borderBottom: `1px solid ${colors.border}` }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedModelsForCleanup.includes(model.modelName)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedModelsForCleanup(prev => [...prev, model.modelName])
                            } else {
                              setSelectedModelsForCleanup(prev => prev.filter(m => m !== model.modelName))
                            }
                          }}
                          className="w-4 h-4 rounded"
                        />
                        <div className="flex-1">
                          <span
                            className="text-sm font-mono"
                            style={{ color: colors.textPrimary }}
                          >
                            {model.modelName}
                          </span>
                          <span
                            className="text-xs ml-2"
                            style={{ color: colors.textSecondary }}
                          >
                            ({model.displayName})
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Warning */}
              {selectedModelsForCleanup.length > 0 && (
                <div
                  className="flex items-start gap-3 p-4 rounded-xl mb-4"
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)',
                  }}
                >
                  <AlertCircle size={20} color="#f59e0b" className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm" style={{ color: colors.textPrimary }}>
                    {t('Warning: This action cannot be undone. Make sure you have a backup if needed.')}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsCleanupModalOpen(false)}
                  className="flex-1"
                  style={{ borderColor: colors.border, color: colors.textPrimary }}
                  disabled={cleanupLoading}
                >
                  {t('Cancel')}
                </Button>
                <Button
                  onClick={() => handleCleanup(false)}
                  className="flex-1 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: '#f59e0b',
                    color: '#fff',
                  }}
                  disabled={cleanupLoading || selectedModelsForCleanup.length === 0}
                >
                  {cleanupLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash size={16} />
                  )}
                  {t('Clear Data Only')}
                </Button>
                <Button
                  onClick={() => handleCleanup(true)}
                  className="flex-1 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#fff',
                  }}
                  disabled={cleanupLoading || selectedModelsForCleanup.length === 0}
                >
                  {cleanupLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash size={16} />
                  )}
                  {t('Delete Models')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toastData && (
        <Toast
          text={toastData.text}
          state={toastData.state}
          onClose={() => setToastData(null)}
        />
      )}
    </div>
  )
}
