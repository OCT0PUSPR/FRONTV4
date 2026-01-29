"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import { API_CONFIG } from "../config/api"
import {
    Save,
    Loader2,
    Plus,
    X,
    Database,
    Search,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Circle,
    ChevronDown
} from "lucide-react"

const getTenantId = () => localStorage.getItem('current_tenant_id')

interface ModelInfo {
    model_name: string
    model_display_name: string | null
    total_fields: number
    synced_at: string | null
    sync_error: string | null
}

interface FieldInfo {
    field_name: string
    field_label: string
    field_type: string
    is_required: boolean
    is_readonly: boolean
    is_stored: boolean
    is_searchable: boolean
    is_sortable: boolean
    is_groupable: boolean
    relation_model: string | null
    selection_options: any[] | null
    help: string | null
    is_synced: boolean
    is_selected: boolean
}

// Field type options for the add field modal
const FIELD_TYPES = [
    { value: 'char', label: 'Text (char)' },
    { value: 'text', label: 'Long Text (text)' },
    { value: 'integer', label: 'Integer' },
    { value: 'float', label: 'Decimal (float)' },
    { value: 'boolean', label: 'Checkbox (boolean)' },
    { value: 'date', label: 'Date' },
    { value: 'datetime', label: 'Date & Time' },
    { value: 'selection', label: 'Selection' },
    { value: 'many2one', label: 'Many2One (Relation)' },
    { value: 'one2many', label: 'One2Many (Lines)' },
    { value: 'many2many', label: 'Many2Many (Tags)' },
    { value: 'html', label: 'HTML' },
    { value: 'binary', label: 'Binary (File)' },
    { value: 'monetary', label: 'Monetary' },
]

// Custom Select Component
const CustomSelect = ({ 
    value, 
    onChange, 
    options, 
    placeholder, 
    loading = false,
    colors 
}: {
    value: string
    onChange: (value: string) => void
    options: { value: string; label: string }[]
    placeholder?: string
    loading?: boolean
    colors: any
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredOptions = options.filter(o => 
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.value.toLowerCase().includes(search.toLowerCase())
    )

    const selectedOption = options.find(o => o.value === value)

    return (
        <div ref={ref} className="relative">
            <div
                onClick={() => !loading && setIsOpen(!isOpen)}
                className="w-full px-4 py-3 rounded-xl text-sm cursor-pointer flex items-center justify-between"
                style={{
                    backgroundColor: colors.mutedBg,
                    border: `1px solid ${isOpen ? colors.action : colors.border}`,
                    color: selectedOption ? colors.textPrimary : colors.textSecondary,
                }}
            >
                <span>{loading ? 'Loading...' : (selectedOption?.label || placeholder || 'Select...')}</span>
                {loading ? (
                    <Loader2 size={16} className="animate-spin" style={{ color: colors.textSecondary }} />
                ) : (
                    <ChevronDown size={16} style={{ color: colors.textSecondary }} />
                )}
            </div>
            {isOpen && !loading && (
                <div 
                    className="absolute z-50 w-full mt-1 rounded-xl shadow-lg max-h-60 overflow-hidden"
                    style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                >
                    <div className="p-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{
                                backgroundColor: colors.mutedBg,
                                border: `1px solid ${colors.border}`,
                                color: colors.textPrimary,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-sm" style={{ color: colors.textSecondary }}>
                                No options found
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value)
                                        setIsOpen(false)
                                        setSearch('')
                                    }}
                                    className="px-4 py-2 text-sm cursor-pointer"
                                    style={{
                                        backgroundColor: value === option.value ? colors.mutedBg : 'transparent',
                                        color: colors.textPrimary,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.mutedBg
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = value === option.value ? colors.mutedBg : 'transparent'
                                    }}
                                >
                                    {option.label}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export function FieldManagement() {
    const { colors, mode } = useTheme()
    const { sessionId } = useAuth()

    // State
    const [models, setModels] = useState<ModelInfo[]>([])
    const [selectedModel, setSelectedModel] = useState<string>('')
    const [fields, setFields] = useState<FieldInfo[]>([])
    const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
    const [searchTerm, setSearchTerm] = useState('')
    const [filterSynced, setFilterSynced] = useState<'all' | 'synced' | 'unsynced'>('all')
    
    const [loadingModels, setLoadingModels] = useState(false)
    const [loadingFields, setLoadingFields] = useState(false)
    const [saving, setSaving] = useState(false)
    
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
    const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false)

    // Fetch models on mount
    useEffect(() => {
        fetchModels()
    }, [])

    // Fetch fields when model changes
    useEffect(() => {
        if (selectedModel) {
            fetchFields(selectedModel)
        } else {
            setFields([])
            setSelectedFields(new Set())
        }
    }, [selectedModel])

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchModels = async () => {
        setLoadingModels(true)
        try {
            const tenantId = getTenantId()
            const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/models`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(tenantId && { 'X-Tenant-ID': tenantId }),
                    ...(sessionId && { 'X-Odoo-Session': sessionId }),
                },
            })
            const data = await response.json()
            if (data.success) {
                setModels(data.data)
            } else {
                setToast({ text: data.error || 'Failed to fetch models', type: 'error' })
            }
        } catch (error) {
            console.error('Error fetching models:', error)
            setToast({ text: 'Failed to fetch models', type: 'error' })
        } finally {
            setLoadingModels(false)
        }
    }

    const fetchFields = async (modelName: string) => {
        setLoadingFields(true)
        try {
            const tenantId = getTenantId()
            const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(modelName)}/odoo-fields`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(tenantId && { 'X-Tenant-ID': tenantId }),
                    ...(sessionId && { 'X-Odoo-Session': sessionId }),
                },
            })
            const data = await response.json()
            if (data.success) {
                // Only show synced fields (fields that exist in smart_field_details)
                const syncedFields = data.data.filter((f: FieldInfo) => f.is_synced)
                setFields(syncedFields)
                // Initialize selected fields from is_selected flag
                const selected = new Set<string>(syncedFields.filter((f: FieldInfo) => f.is_selected).map((f: FieldInfo) => f.field_name))
                setSelectedFields(selected)
            } else {
                setToast({ text: data.error || 'Failed to fetch fields', type: 'error' })
            }
        } catch (error) {
            console.error('Error fetching fields:', error)
            setToast({ text: 'Failed to fetch fields', type: 'error' })
        } finally {
            setLoadingFields(false)
        }
    }

    const handleSaveSelection = async () => {
        if (!selectedModel) return
        
        setSaving(true)
        try {
            const tenantId = getTenantId()
            const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(selectedModel)}/sync-selection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(tenantId && { 'X-Tenant-ID': tenantId }),
                    ...(sessionId && { 'X-Odoo-Session': sessionId }),
                },
                body: JSON.stringify({
                    selectedFields: Array.from(selectedFields)
                }),
            })
            const data = await response.json()
            if (data.success) {
                setToast({ text: data.message || 'Fields synced successfully', type: 'success' })
                fetchFields(selectedModel)
            } else {
                setToast({ text: data.error || 'Failed to sync fields', type: 'error' })
            }
        } catch (error) {
            console.error('Error syncing fields:', error)
            setToast({ text: 'Failed to sync fields', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const toggleField = (fieldName: string) => {
        setSelectedFields(prev => {
            const newSet = new Set(prev)
            if (newSet.has(fieldName)) {
                newSet.delete(fieldName)
            } else {
                newSet.add(fieldName)
            }
            return newSet
        })
    }

    const selectAll = () => {
        setSelectedFields(new Set(filteredFields.map(f => f.field_name)))
    }

    const deselectAll = () => {
        setSelectedFields(new Set())
    }

    // Filter fields
    const filteredFields = useMemo(() => {
        return fields.filter(field => {
            const matchesSearch = !searchTerm || 
                field.field_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                field.field_label.toLowerCase().includes(searchTerm.toLowerCase())
            
            const matchesFilter = filterSynced === 'all' ||
                (filterSynced === 'synced' && field.is_selected) ||
                (filterSynced === 'unsynced' && !field.is_selected)
            
            return matchesSearch && matchesFilter
        })
    }, [fields, searchTerm, filterSynced])

    // Check if there are changes
    const hasChanges = useMemo(() => {
        const originalSelected = new Set(fields.filter(f => f.is_selected).map(f => f.field_name))
        if (originalSelected.size !== selectedFields.size) return true
        for (const field of selectedFields) {
            if (!originalSelected.has(field)) return true
        }
        return false
    }, [fields, selectedFields])

    const modelOptions = models.map(m => ({
        value: m.model_name,
        label: m.model_display_name || m.model_name,
    }))

    return (
        <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: colors.background }}>
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2"
                        style={{
                            backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
                            color: 'white',
                        }}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span className="text-sm font-medium">{toast.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold font-display" style={{ color: colors.textPrimary }}>
                            Field Management
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {hasChanges && (
                            <button
                                onClick={handleSaveSelection}
                                disabled={saving || !selectedModel}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                                style={{ backgroundColor: colors.action, color: 'white' }}
                            >
                                {saving ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Save size={16} />
                                )}
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Model Selection */}
                <div 
                    className="rounded-2xl p-6 mb-6"
                    style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                >
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                                Select Model
                            </label>
                            <CustomSelect
                                value={selectedModel}
                                onChange={setSelectedModel}
                                options={modelOptions}
                                placeholder="Choose a model..."
                                loading={loadingModels}
                                colors={colors}
                            />
                        </div>
                        <button
                            onClick={() => fetchModels()}
                            disabled={loadingModels}
                            className="p-3 rounded-xl transition-colors"
                            style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}
                        >
                            <RefreshCw size={16} className={loadingModels ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Fields Section */}
                {selectedModel && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl overflow-hidden"
                        style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                    >
                        {/* Fields Header */}
                        <div 
                            className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                            style={{ borderBottom: `1px solid ${colors.border}` }}
                        >
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                                    Fields ({filteredFields.length})
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={selectAll}
                                        className="text-xs px-2 py-1 rounded"
                                        style={{ color: colors.action, backgroundColor: `${colors.action}15` }}
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={deselectAll}
                                        className="text-xs px-2 py-1 rounded"
                                        style={{ color: colors.textSecondary, backgroundColor: colors.mutedBg }}
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {/* Search */}
                                <div className="relative">
                                    <Search 
                                        size={16} 
                                        className="absolute left-3 top-1/2 -translate-y-1/2"
                                        style={{ color: colors.textSecondary }}
                                    />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search fields..."
                                        className="pl-9 pr-4 py-2 rounded-lg text-sm w-48"
                                        style={{
                                            backgroundColor: colors.mutedBg,
                                            border: `1px solid ${colors.border}`,
                                            color: colors.textPrimary,
                                        }}
                                    />
                                </div>
                                
                                {/* Filter */}
                                <select
                                    value={filterSynced}
                                    onChange={(e) => setFilterSynced(e.target.value as any)}
                                    className="px-3 py-2 rounded-lg text-sm"
                                    style={{
                                        backgroundColor: colors.mutedBg,
                                        border: `1px solid ${colors.border}`,
                                        color: colors.textPrimary,
                                    }}
                                >
                                    <option value="all">All Fields</option>
                                    <option value="synced">Selected Only</option>
                                    <option value="unsynced">Unselected</option>
                                </select>

                                {/* Add Field Button */}
                                <button
                                    onClick={() => setIsAddFieldModalOpen(true)}
                                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium"
                                    style={{ backgroundColor: colors.action, color: 'white' }}
                                >
                                    <Plus size={16} />
                                    Add Field
                                </button>
                            </div>
                        </div>

                        {/* Fields List */}
                        <div className="max-h-[600px] overflow-y-auto">
                            {loadingFields ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 size={24} className="animate-spin" style={{ color: colors.action }} />
                                    <span className="ml-2" style={{ color: colors.textSecondary }}>Loading fields...</span>
                                </div>
                            ) : filteredFields.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Database size={48} style={{ color: colors.textSecondary, opacity: 0.5 }} />
                                    <p className="mt-4" style={{ color: colors.textSecondary }}>
                                        {searchTerm ? 'No fields match your search' : 'No fields found'}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y" style={{ borderColor: colors.border }}>
                                    {filteredFields.map((field) => (
                                        <div
                                            key={field.field_name}
                                            className="flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors"
                                            style={{ 
                                                backgroundColor: selectedFields.has(field.field_name) ? `${colors.action}08` : 'transparent',
                                            }}
                                            onClick={() => toggleField(field.field_name)}
                                        >
                                            {/* Checkbox */}
                                            <div className="flex-shrink-0">
                                                {selectedFields.has(field.field_name) ? (
                                                    <CheckCircle2 size={20} style={{ color: colors.action }} />
                                                ) : (
                                                    <Circle size={20} style={{ color: colors.border }} />
                                                )}
                                            </div>

                                            {/* Field Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium" style={{ color: colors.textPrimary }}>
                                                        {field.field_label}
                                                    </span>
                                                    <code 
                                                        className="text-xs px-1.5 py-0.5 rounded"
                                                        style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}
                                                    >
                                                        {field.field_name}
                                                    </code>
                                                </div>
                                                {field.help && (
                                                    <p className="text-xs mt-0.5 truncate" style={{ color: colors.textSecondary }}>
                                                        {field.help}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Field Type */}
                                            <div className="flex-shrink-0 flex items-center gap-2">
                                                <span 
                                                    className="text-xs px-2 py-1 rounded"
                                                    style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}
                                                >
                                                    {field.field_type}
                                                </span>
                                                {field.is_required && (
                                                    <span 
                                                        className="text-xs px-1.5 py-0.5 rounded"
                                                        style={{ backgroundColor: '#ef444415', color: '#ef4444' }}
                                                    >
                                                        Required
                                                    </span>
                                                )}
                                                {field.relation_model && (
                                                    <span 
                                                        className="text-xs px-1.5 py-0.5 rounded"
                                                        style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6' }}
                                                    >
                                                        → {field.relation_model}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer with stats */}
                        <div 
                            className="px-4 py-3 flex items-center justify-between text-sm"
                            style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.mutedBg }}
                        >
                            <span style={{ color: colors.textSecondary }}>
                                {selectedFields.size} of {fields.length} fields selected
                            </span>
                            {hasChanges && (
                                <span style={{ color: colors.action }}>
                                    You have unsaved changes
                                </span>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Add Field Modal */}
            <AddFieldModal
                isOpen={isAddFieldModalOpen}
                onClose={() => setIsAddFieldModalOpen(false)}
                modelName={selectedModel}
                onSuccess={() => {
                    setIsAddFieldModalOpen(false)
                    if (selectedModel) {
                        fetchFields(selectedModel)
                    }
                }}
                colors={colors}
                sessionId={sessionId}
            />
        </div>
    )
}

// Add Field Modal Component
interface AddFieldModalProps {
    isOpen: boolean
    onClose: () => void
    modelName: string
    onSuccess: () => void
    colors: any
    sessionId: string | null
}

function AddFieldModal({ isOpen, onClose, modelName, onSuccess, colors, sessionId }: AddFieldModalProps) {
    const [fieldName, setFieldName] = useState('')
    const [fieldLabel, setFieldLabel] = useState('')
    const [fieldType, setFieldType] = useState('char')
    const [isRequired, setIsRequired] = useState(false)
    const [isReadonly, setIsReadonly] = useState(false)
    const [helpText, setHelpText] = useState('')
    const [relationModel, setRelationModel] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFieldName('')
            setFieldLabel('')
            setFieldType('char')
            setIsRequired(false)
            setIsReadonly(false)
            setHelpText('')
            setRelationModel('')
            setError('')
        }
    }, [isOpen])

    const handleSubmit = async () => {
        if (!fieldName.trim()) {
            setError('Field name is required')
            return
        }
        if (!fieldLabel.trim()) {
            setError('Field label is required')
            return
        }
        if (['many2one', 'one2many', 'many2many'].includes(fieldType) && !relationModel.trim()) {
            setError('Related model is required for relation fields')
            return
        }

        setSaving(true)
        setError('')

        try {
            const tenantId = getTenantId()
            const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(modelName)}/add-field`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(tenantId && { 'X-Tenant-ID': tenantId }),
                    ...(sessionId && { 'X-Odoo-Session': sessionId }),
                },
                body: JSON.stringify({
                    name: fieldName,
                    string: fieldLabel,
                    type: fieldType,
                    required: isRequired,
                    readonly: isReadonly,
                    help: helpText,
                    relation: relationModel || undefined,
                }),
            })
            const data = await response.json()
            if (data.success) {
                onSuccess()
            } else {
                setError(data.error || 'Failed to create field')
            }
        } catch (err) {
            console.error('Error creating field:', err)
            setError('Failed to create field')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    const isRelationType = ['many2one', 'one2many', 'many2many'].includes(fieldType)

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
                    style={{ backgroundColor: colors.card }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div 
                        className="px-6 py-4 flex items-center justify-between"
                        style={{ borderBottom: `1px solid ${colors.border}` }}
                    >
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                                Add New Field
                            </h2>
                            <p className="text-sm" style={{ color: colors.textSecondary }}>
                                Create a custom field for {modelName}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: colors.textSecondary }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                        {error && (
                            <div 
                                className="flex items-center gap-2 p-3 rounded-lg"
                                style={{ backgroundColor: '#ef444415', color: '#ef4444' }}
                            >
                                <AlertCircle size={16} />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Field Name */}
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                                Field Name (Technical) *
                            </label>
                            <input
                                type="text"
                                value={fieldName}
                                onChange={(e) => setFieldName(e.target.value)}
                                placeholder="e.g., custom_field"
                                className="w-full px-4 py-3 rounded-xl text-sm"
                                style={{
                                    backgroundColor: colors.mutedBg,
                                    border: `1px solid ${colors.border}`,
                                    color: colors.textPrimary,
                                }}
                            />
                            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                                Will be prefixed with "x_" automatically
                            </p>
                        </div>

                        {/* Field Label */}
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                                Field Label (Display Name) *
                            </label>
                            <input
                                type="text"
                                value={fieldLabel}
                                onChange={(e) => setFieldLabel(e.target.value)}
                                placeholder="e.g., Custom Field"
                                className="w-full px-4 py-3 rounded-xl text-sm"
                                style={{
                                    backgroundColor: colors.mutedBg,
                                    border: `1px solid ${colors.border}`,
                                    color: colors.textPrimary,
                                }}
                            />
                        </div>

                        {/* Field Type */}
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                                Field Type *
                            </label>
                            <CustomSelect
                                value={fieldType}
                                onChange={setFieldType}
                                options={FIELD_TYPES}
                                placeholder="Select field type"
                                colors={colors}
                            />
                        </div>

                        {/* Related Model (for relation types) */}
                        {isRelationType && (
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                                    Related Model *
                                </label>
                                <input
                                    type="text"
                                    value={relationModel}
                                    onChange={(e) => setRelationModel(e.target.value)}
                                    placeholder="e.g., res.partner"
                                    className="w-full px-4 py-3 rounded-xl text-sm"
                                    style={{
                                        backgroundColor: colors.mutedBg,
                                        border: `1px solid ${colors.border}`,
                                        color: colors.textPrimary,
                                    }}
                                />
                            </div>
                        )}

                        {/* Help Text */}
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                                Help Text
                            </label>
                            <textarea
                                value={helpText}
                                onChange={(e) => setHelpText(e.target.value)}
                                placeholder="Optional description for this field"
                                rows={2}
                                className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                                style={{
                                    backgroundColor: colors.mutedBg,
                                    border: `1px solid ${colors.border}`,
                                    color: colors.textPrimary,
                                }}
                            />
                        </div>

                        {/* Checkboxes */}
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isRequired}
                                    onChange={(e) => setIsRequired(e.target.checked)}
                                    className="w-4 h-4 rounded"
                                />
                                <span className="text-sm" style={{ color: colors.textPrimary }}>Required</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isReadonly}
                                    onChange={(e) => setIsReadonly(e.target.checked)}
                                    className="w-4 h-4 rounded"
                                />
                                <span className="text-sm" style={{ color: colors.textPrimary }}>Readonly</span>
                            </label>
                        </div>
                    </div>

                    {/* Footer */}
                    <div 
                        className="px-6 py-4 flex justify-end gap-3"
                        style={{ borderTop: `1px solid ${colors.border}` }}
                    >
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-medium"
                            style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                            style={{ backgroundColor: colors.action, color: 'white' }}
                        >
                            {saving ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Plus size={16} />
                            )}
                            {saving ? 'Creating...' : 'Create Field'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export default FieldManagement
