"use client"

import { useState, useEffect, useCallback } from "react"
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
} from "lucide-react"
import { Button } from "../../@/components/ui/button"
import Toast from "../components/Toast"
import { DynamicImportModal } from "../components/DynamicImportWizard/DynamicImportModal"
import { sanitizeErrorMessage } from "../utils/errorSanitizer"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3006'

// Master types configuration
const MASTER_TYPES = [
  { key: 'brand', label: 'Brands', labelAr: 'العلامات التجارية', icon: Tags, color: '#ea580c', model: 'x_brand' },
  { key: 'manufacturer', label: 'Manufacturers', labelAr: 'الشركات المصنعة', icon: Factory, color: '#0284c7', model: 'x_manufacturer' },
  { key: 'model', label: 'Models', labelAr: 'النماذج', icon: Box, color: '#ca8a04', model: 'x_model' },
]

interface MasterRecord {
  id: number
  x_name: string
  x_name_ar?: string
  x_code?: string
  x_parent_id?: [number, string] | false
  x_source_parent_id?: string
  x_active?: boolean
}

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  record: MasterRecord | null
  masterType: typeof MASTER_TYPES[0]
  allRecords: MasterRecord[]
  onSave: (data: Partial<MasterRecord>) => Promise<void>
  isLoading: boolean
  showToast: (text: string, state?: "success" | "error" | "warning" | "info") => void
}

function EditModal({ isOpen, onClose, record, masterType, allRecords, onSave, isLoading, showToast }: EditModalProps) {
  const { t, i18n } = useTranslation()
  const { mode, colors } = useTheme()
  const isRTL = i18n.dir() === 'rtl'
  const [formData, setFormData] = useState({
    x_name: '',
    x_name_ar: '',
    x_code: '',
    x_parent_id: 0,
    x_active: true,
  })

  useEffect(() => {
    if (record) {
      setFormData({
        x_name: record.x_name || '',
        x_name_ar: record.x_name_ar || '',
        x_code: record.x_code || '',
        x_parent_id: Array.isArray(record.x_parent_id) ? record.x_parent_id[0] : 0,
        x_active: record.x_active !== false,
      })
    } else {
      setFormData({
        x_name: '',
        x_name_ar: '',
        x_code: '',
        x_parent_id: 0,
        x_active: true,
      })
    }
  }, [record])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.x_name.trim()) {
      showToast(t('Name is required'), 'error')
      return
    }
    await onSave({
      x_name: formData.x_name.trim(),
      x_name_ar: formData.x_name_ar.trim() || undefined,
      x_code: formData.x_code.trim() || undefined,
      x_parent_id: formData.x_parent_id || false,
      x_active: formData.x_active,
    } as any)
  }

  if (!isOpen) return null

  const parentOptions = allRecords.filter(r => !record || r.id !== record.id)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
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
              style={{ backgroundColor: `${masterType.color}15` }}
            >
              <masterType.icon size={20} color={masterType.color} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                {record ? t('Edit Record') : t('New Record')}
              </h3>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {t(masterType.label)}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name (English) */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
              {t('Name (English)')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.x_name}
              onChange={e => setFormData(prev => ({ ...prev, x_name: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm transition-colors"
              style={{
                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              }}
              placeholder={t('Enter name in English')}
              dir="ltr"
            />
          </div>

          {/* Name (Arabic) */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
              {t('Name (Arabic)')}
            </label>
            <input
              type="text"
              value={formData.x_name_ar}
              onChange={e => setFormData(prev => ({ ...prev, x_name_ar: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm transition-colors"
              style={{
                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              }}
              placeholder={t('Enter name in Arabic')}
              dir="rtl"
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
              {t('Code')}
            </label>
            <input
              type="text"
              value={formData.x_code}
              onChange={e => setFormData(prev => ({ ...prev, x_code: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm transition-colors"
              style={{
                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              }}
              placeholder={t('Enter code (optional)')}
            />
          </div>

          {/* Parent */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
              {t('Parent')}
            </label>
            <select
              value={formData.x_parent_id}
              onChange={e => setFormData(prev => ({ ...prev, x_parent_id: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm transition-colors"
              style={{
                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              }}
            >
              <option value={0}>{t('No Parent')}</option>
              {parentOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.x_name} {opt.x_name_ar ? `(${opt.x_name_ar})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="x_active"
              checked={formData.x_active}
              onChange={e => setFormData(prev => ({ ...prev, x_active: e.target.checked }))}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="x_active" className="text-sm font-medium" style={{ color: colors.textPrimary }}>
              {t('Active')}
            </label>
          </div>

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
                backgroundColor: masterType.color,
                color: '#fff',
              }}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {t('Save')}
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

  const [activeTab, setActiveTab] = useState(MASTER_TYPES[0].key)
  const [records, setRecords] = useState<Record<string, MasterRecord[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [editModal, setEditModal] = useState<{ open: boolean; record: MasterRecord | null }>({ open: false, record: null })
  const [saving, setSaving] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [customModels, setCustomModels] = useState<{ id: number; modelName: string; displayName: string }[]>([])
  const [selectedModelsForCleanup, setSelectedModelsForCleanup] = useState<string[]>([])
  const [toastData, setToastData] = useState<{ text: string; state: "success" | "error" | "warning" | "info" } | null>(null)

  const activeMasterType = MASTER_TYPES.find(m => m.key === activeTab) || MASTER_TYPES[0]

  const showToast = (text: string, state: "success" | "error" | "warning" | "info" = "success") => {
    setToastData({ text, state })
  }

  // Fetch records for a master type
  const fetchRecords = useCallback(async (masterKey: string) => {
    const masterType = MASTER_TYPES.find(m => m.key === masterKey)
    if (!masterType || !sessionId) return

    setLoading(prev => ({ ...prev, [masterKey]: true }))
    try {
      const response = await fetch(`${API_BASE_URL}/master-lookups/${masterType.model}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
          'X-Tenant-ID': tenantId || '',
        },
      })
      const data = await response.json()
      if (data.success) {
        setRecords(prev => ({ ...prev, [masterKey]: data.data || [] }))
      } else {
        showToast(sanitizeErrorMessage(data.message || t('Failed to load records')), 'error')
      }
    } catch (error) {
      console.error('Error fetching records:', error)
      showToast(sanitizeErrorMessage(t('Failed to load records')), 'error')
    } finally {
      setLoading(prev => ({ ...prev, [masterKey]: false }))
    }
  }, [sessionId, tenantId, t])

  // Load records when tab changes
  useEffect(() => {
    if (!records[activeTab]) {
      fetchRecords(activeTab)
    }
  }, [activeTab, fetchRecords, records])

  // Filter records by search
  const filteredRecords = (records[activeTab] || []).filter(record => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      record.x_name?.toLowerCase().includes(query) ||
      record.x_name_ar?.toLowerCase().includes(query) ||
      record.x_code?.toLowerCase().includes(query)
    )
  })

  // Build hierarchy
  const buildHierarchy = (items: MasterRecord[]): (MasterRecord & { children: MasterRecord[] })[] => {
    const itemMap = new Map<number, MasterRecord & { children: MasterRecord[] }>()
    const roots: (MasterRecord & { children: MasterRecord[] })[] = []

    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] })
    })

    items.forEach(item => {
      const node = itemMap.get(item.id)!
      const parentId = Array.isArray(item.x_parent_id) ? item.x_parent_id[0] : null
      if (parentId && itemMap.has(parentId)) {
        itemMap.get(parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  const hierarchicalRecords = buildHierarchy(filteredRecords)

  // Save record
  const handleSave = async (data: Partial<MasterRecord>) => {
    setSaving(true)
    try {
      const url = editModal.record
        ? `${API_BASE_URL}/master-lookups/${activeMasterType.model}/${editModal.record.id}`
        : `${API_BASE_URL}/master-lookups/${activeMasterType.model}`

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
        fetchRecords(activeTab)
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
    if (!confirm(t('Are you sure you want to delete this record?'))) return

    try {
      const response = await fetch(`${API_BASE_URL}/master-lookups/${activeMasterType.model}/${record.id}`, {
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
        fetchRecords(activeTab)
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

  // Fetch custom models for cleanup
  const fetchCustomModels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-import/models`, {
        headers: {
          'X-Session-ID': sessionId || '',
          'X-Tenant-ID': tenantId || '',
        },
      })
      const data = await response.json()
      console.log('[MasterLookups] Fetch models response:', data)
      if (data.success) {
        setCustomModels(data.models || [])
      } else {
        console.error('[MasterLookups] API error:', data.message)
        showToast(sanitizeErrorMessage(data.message || t('Failed to fetch models')), 'error')
        setCustomModels([])
      }
    } catch (error) {
      console.error('Error fetching custom models:', error)
      showToast(sanitizeErrorMessage(t('Failed to fetch models')), 'error')
      setCustomModels([])
    }
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
      console.log('[MasterLookups] Cleanup result:', result)
      if (result.success) {
        // Check if any models were actually processed
        if (result.results?.modelsProcessed > 0 || result.results?.recordsDeleted > 0) {
          showToast(result.message || t('Data cleaned successfully'), 'success')
        } else {
          showToast(result.message || t('No data found to clean'), 'warning')
        }
        setIsCleanupModalOpen(false)
        setSelectedModelsForCleanup([])
        // Refresh all records
        MASTER_TYPES.forEach(type => fetchRecords(type.key))
      } else {
        // Show detailed error info
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
    // Refresh all records
    MASTER_TYPES.forEach(type => fetchRecords(type.key))
    showToast(t('Import completed! Refreshing data...'), 'success')
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
          <div className="w-6">
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

          {/* Name */}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate" style={{ color: colors.textPrimary }}>
              {record.x_name}
            </div>
            {record.x_name_ar && (
              <div className="text-sm truncate" style={{ color: colors.textSecondary }} dir="rtl">
                {record.x_name_ar}
              </div>
            )}
          </div>

          {/* Code */}
          <div className="w-32 text-sm" style={{ color: colors.textSecondary }}>
            {record.x_code || '-'}
          </div>

          {/* Status */}
          <div className="w-20">
            {record.x_active !== false ? (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: '#16a34a15', color: '#16a34a' }}
              >
                <CheckCircle size={12} />
                {t('Active')}
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: '#dc262615', color: '#dc2626' }}
              >
                <AlertCircle size={12} />
                {t('Inactive')}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            {t('Master Lookups')}
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            {t('Manage brands, manufacturers, models and other master data')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              fetchCustomModels()
              setIsCleanupModalOpen(true)
            }}
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
            onClick={() => setEditModal({ open: true, record: null })}
            className="flex items-center gap-2"
            style={{ backgroundColor: activeMasterType.color, color: '#fff' }}
          >
            <Plus size={18} />
            {t('Add New')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
      >
        {MASTER_TYPES.map(type => {
          const isActive = activeTab === type.key
          const count = records[type.key]?.length || 0
          return (
            <button
              key={type.key}
              onClick={() => setActiveTab(type.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                isActive ? 'shadow-sm' : ''
              }`}
              style={{
                backgroundColor: isActive ? colors.card : 'transparent',
                color: isActive ? type.color : colors.textSecondary,
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <type.icon size={18} />
              <span>{t(type.label)}</span>
              {count > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: isActive ? `${type.color}15` : 'rgba(0,0,0,0.1)',
                    color: isActive ? type.color : colors.textSecondary,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search & Actions */}
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
            placeholder={t('Search by name or code...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: colors.textPrimary }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={16} color={colors.textSecondary} />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => fetchRecords(activeTab)}
          className="flex items-center gap-2"
          style={{ borderColor: colors.border, color: colors.textPrimary }}
        >
          <RefreshCw size={16} className={loading[activeTab] ? 'animate-spin' : ''} />
          {t('Refresh')}
        </Button>
      </div>

      {/* Table */}
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
          <div className="flex-1">{t('Name')}</div>
          <div className="w-32">{t('Code')}</div>
          <div className="w-20">{t('Status')}</div>
          <div className="w-24">{t('Actions')}</div>
        </div>

        {/* Table Body */}
        {loading[activeTab] ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin" color={activeMasterType.color} />
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
          <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
            {hierarchicalRecords.map(record => renderRow(record))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditModal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, record: null })}
        record={editModal.record}
        masterType={activeMasterType}
        allRecords={records[activeTab] || []}
        onSave={handleSave}
        isLoading={saving}
        showToast={showToast}
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
                {customModels.length === 0 ? (
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
                        checked={selectedModelsForCleanup.length === customModels.length && customModels.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedModelsForCleanup(customModels.map(m => m.modelName))
                          } else {
                            setSelectedModelsForCleanup([])
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                        {t('Select All')} ({customModels.length})
                      </span>
                    </div>

                    {/* Models */}
                    {customModels.map((model) => (
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
