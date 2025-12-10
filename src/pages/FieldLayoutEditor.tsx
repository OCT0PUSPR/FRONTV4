"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import { API_CONFIG } from "../config/api"
import Toast from "../components/Toast"
import {
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    ArrowLeft,
    Save,
    Loader2,
    Plus,
    X,
    GripVertical,
    ChevronDown,
    ChevronRight,
    Layers,
    Type,
    Hash,
    Calendar,
    ToggleLeft,
    Link2,
    List,
    FileText,
    Image,
    DollarSign,
    Clock,
    Mail,
    Phone,
    Globe,
    Binary,
    Table,
    Edit3,
    Trash2,
    Check,
    AlertCircle,
    LayoutTemplate,
    Search
} from "lucide-react"
import { useNavigate } from "react-router-dom"

// ... imports end

// Helper for Sortable Item
const SortableField = ({ field, sectionKey, onRemove, colors, getTypeColor, getTypeBorderColor, getFieldIcon, isDark }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ 
        id: field.id || field.name, // Use name as fallback ID
        data: {
            type: 'field',
            field,
            sectionKey
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const FieldIcon = getFieldIcon(field.type);
    const colSpan = field.col_span || 6;
    const widthClass = colSpan === 12 ? 'w-full' : 
                       colSpan === 8 ? 'w-[calc(66.66%-0.75rem)]' :
                       colSpan === 6 ? 'w-[calc(50%-0.5rem)]' :
                       colSpan === 4 ? 'w-[calc(33.33%-0.75rem)]' :
                       'w-[calc(25%-0.75rem)]';

    const borderColor = getTypeBorderColor(field.type, isDark);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group rounded-2xl border shadow-sm hover:shadow-md transition-all ${widthClass}`}
            // We apply attributes and listeners to the drag handle or the whole item
        >
             <div 
                className="flex items-start p-3 gap-3 bg-white dark:bg-zinc-900 rounded-2xl h-full border"
                style={{ borderColor: borderColor }}
             >
                {/* Drag Handle */}
                <div 
                    {...attributes} 
                    {...listeners} 
                    className="mt-1 cursor-grab active:cursor-grabbing text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 touch-none"
                >
                    <GripVertical size={20} />
                </div>

                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getTypeColor(field.type)}`}>
                    <FieldIcon size={18} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm truncate" style={{ color: colors.textPrimary }}>
                            {field.label}
                        </span>
                        
                        {/* Hover Actions - Only Remove, no Width Selection */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!field.required && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemove(sectionKey, field.id); }}
                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <code className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">
                            {field.name}
                        </code>
                        {field.required && (
                            <span className="text-[10px] font-bold text-red-500 flex items-center gap-0.5">
                                <span className="w-1 h-1 rounded-full bg-red-500"></span> Req
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Searchable Select Component
const SearchableSelect = ({ value, options, onChange, placeholder, colors, disabled }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    
    const filteredOptions = options.filter((opt: any) => 
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const selectedLabel = options.find((opt: any) => opt.value === value)?.label || placeholder;

    return (
        <div className="relative">
             <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex items-center justify-between gap-3 px-4 py-2 rounded-xl border text-sm font-medium transition-all min-w-[200px] ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}`}
                style={{ 
                    backgroundColor: colors.card, 
                    borderColor: colors.border,
                    color: colors.textPrimary 
                }}
             >
                <span className="truncate">{selectedLabel}</span>
                <ChevronDown size={16} className={`text-zinc-400 dark:text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
             </button>

             <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[40]" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full left-0 right-0 mt-2 p-2 rounded-xl shadow-2xl border z-[50] flex flex-col gap-2 max-h-[300px]"
                            style={{ backgroundColor: colors.card, borderColor: colors.border }}
                        >
                            <div className="relative px-2">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full pl-8 pr-3 py-2 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-800 outline-none focus:ring-1 focus:ring-blue-500"
                                    style={{ color: colors.textPrimary }}
                                    autoFocus
                                />
                            </div>
                            
                            <div className="overflow-y-auto flex-1 custom-scrollbar">
                                {filteredOptions.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-zinc-500 dark:text-zinc-400">No results found</div>
                                ) : (
                                    filteredOptions.map((opt: any) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                onChange(opt.value);
                                                setIsOpen(false);
                                                setSearch("");
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between group"
                                            style={{ 
                                                color: value === opt.value ? '#3b82f6' : colors.textPrimary,
                                                backgroundColor: value === opt.value ? (mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff') : 'transparent'
                                            }}
                                        >
                                            {opt.label}
                                            {value === opt.value && <Check size={14} />}
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
             </AnimatePresence>
        </div>
    )
}

// Field type icons mapping
const FIELD_TYPE_ICONS: Record<string, any> = {
    'char': Type,
    'text': FileText,
    'html': FileText,
    'integer': Hash,
    'float': Hash,
    'monetary': DollarSign,
    'boolean': ToggleLeft,
    'date': Calendar,
    'datetime': Clock,
    'selection': List,
    'many2one': Link2,
    'many2many': Link2,
    'one2many': Table,
    'binary': Image,
    'email': Mail,
    'phone': Phone,
    'url': Globe,
}

const getTypeColor = (type: string) => {
    switch (type) {
        case 'char':
        case 'text':
        case 'html': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
        case 'integer':
        case 'float':
        case 'monetary': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
        case 'boolean': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
        case 'date':
        case 'datetime': return 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
        case 'selection': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
        case 'many2one':
        case 'many2many':
        case 'one2many': return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400';
        default: return 'bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    }
}

const getTypeBorderColor = (type: string, isDark: boolean = false) => {
    switch (type) {
        case 'char':
        case 'text':
        case 'html': return isDark ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.3)'; // blue
        case 'integer':
        case 'float':
        case 'monetary': return isDark ? 'rgba(52, 211, 153, 0.4)' : 'rgba(16, 185, 129, 0.3)'; // emerald
        case 'boolean': return isDark ? 'rgba(196, 181, 253, 0.4)' : 'rgba(147, 51, 234, 0.3)'; // purple
        case 'date':
        case 'datetime': return isDark ? 'rgba(251, 146, 60, 0.4)' : 'rgba(249, 115, 22, 0.3)'; // orange
        case 'selection': return isDark ? 'rgba(251, 191, 36, 0.4)' : 'rgba(245, 158, 11, 0.3)'; // amber
        case 'many2one':
        case 'many2many':
        case 'one2many': return isDark ? 'rgba(129, 140, 248, 0.4)' : 'rgba(99, 102, 241, 0.3)'; // indigo
        default: return isDark ? 'rgba(161, 161, 170, 0.3)' : 'rgba(161, 161, 170, 0.2)'; // zinc
    }
}

const CustomSelect = ({ value, options, onChange, colors }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 rounded px-2 py-1 outline-none border border-zinc-200 dark:border-zinc-700 flex items-center gap-1 min-w-[60px] justify-between"
                style={{ backgroundColor: colors?.mutedBg, borderColor: colors?.border, color: colors?.textPrimary }}
            >
                <span>{options.find((o: any) => o.value === value)?.label || value}</span>
                <ChevronDown size={10} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        className="absolute top-full right-0 mt-1 rounded-lg shadow-xl overflow-hidden z-[100] min-w-[100px]"
                        style={{ backgroundColor: colors?.card, border: `1px solid ${colors?.border}` }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {options.map((opt: any) => (
                            <button
                                key={opt.value}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between"
                                style={{ 
                                    color: value === opt.value ? (colors?.action || '#3b82f6') : colors?.textPrimary,
                                    backgroundColor: value === opt.value ? `${colors?.action || '#3b82f6'}10` : 'transparent'
                                }}
                            >
                                {opt.label}
                                {value === opt.value && <Check size={10} />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
            
            {isOpen && (
                <div 
                    className="fixed inset-0 z-[90]" 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
                />
            )}
        </div>
    );
};

interface FieldInfo {
    id: number
    name: string
    label: string
    type: string
    widget?: string
    required?: boolean
    readonly?: boolean
    field_order?: number
    col_span?: number
    layout_id?: number
}

interface Section {
    id?: number
    section_key: string
    section_label: string
    section_order: number
    section_icon?: string
    is_collapsible?: boolean
    is_visible?: boolean
    fields: FieldInfo[]
    isExpanded?: boolean
}

const FieldLayoutEditor = () => {
    const { colors, mode } = useTheme()
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { user, sessionId } = useAuth()
    
    // State
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [loadingModels, setLoadingModels] = useState(false)
    const [models, setModels] = useState<any[]>([])
    const [selectedModel, setSelectedModel] = useState<string>('')
    const [sections, setSections] = useState<Section[]>([])
    const [unassignedFields, setUnassignedFields] = useState<FieldInfo[]>([])
    const [hasChanges, setHasChanges] = useState(false)
    const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null)
    
    // Section editing state
    const [editingSectionKey, setEditingSectionKey] = useState<string | null>(null)
    const [editingSectionLabel, setEditingSectionLabel] = useState('')
    const [isAddingSectionOpen, setIsAddingSectionOpen] = useState(false)
    const [newSectionKey, setNewSectionKey] = useState('')
    const [newSectionLabel, setNewSectionLabel] = useState('')

    // Field adding state
    const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false)
    const [newFieldData, setNewFieldData] = useState({
        name: '',
        string: '',
        type: 'char',
        required: false,
        readonly: false,
        help: '',
        relation: ''
    })
    const [addingField, setAddingField] = useState(false)

    // Dnd Kit State
    const [activeId, setActiveId] = useState<number | string | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const getTenantId = () => localStorage.getItem('current_tenant_id')

    // Fetch models on mount
    useEffect(() => {
        fetchModels()
    }, [])

    // Fetch layout when model changes
    useEffect(() => {
        if (selectedModel) {
            fetchLayout(selectedModel)
        }
    }, [selectedModel])

    const fetchModels = async () => {
        setLoadingModels(true)
        try {
            const tenantId = getTenantId()
            const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/models`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(tenantId && { 'X-Tenant-ID': tenantId }),
                },
            })
            const data = await response.json()
            if (data.success) {
                setModels(data.data)
            }
        } catch (error) {
            console.error('Error fetching models:', error)
            setToast({ text: 'Failed to fetch models', type: 'error' })
        } finally {
            setLoadingModels(false)
        }
    }

    const fetchLayout = async (modelName: string) => {
        setLoading(true)
        try {
            const tenantId = getTenantId()
            
            // Fetch layout and Odoo fields in parallel
            const [layoutResponse, odooFieldsResponse] = await Promise.all([
                fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(modelName)}/layout`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(tenantId && { 'X-Tenant-ID': tenantId }),
                        ...(sessionId && { 'X-Odoo-Session': sessionId }),
                    },
                }),
                fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(modelName)}/odoo-fields`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(tenantId && { 'X-Tenant-ID': tenantId }),
                        ...(sessionId && { 'X-Odoo-Session': sessionId }),
                    },
                })
            ])
            
            const layoutData = await layoutResponse.json()
            const odooFieldsData = await odooFieldsResponse.json()
            
            if (layoutData.success) {
                const sectionsWithExpanded = layoutData.data.sections.map((s: Section) => ({
                    ...s,
                    isExpanded: true
                }))
                setSections(sectionsWithExpanded)
                
                // Get fields that are in layout (assigned to sections) - by field name
                const assignedFieldNames = new Set(
                    sectionsWithExpanded.flatMap(s => s.fields.map(f => f.name))
                )
                
                // Build a map of field_name -> FieldInfo from layout unassigned fields
                const layoutUnassigned = (layoutData.data.unassignedFields || [])
                const layoutFieldMap = new Map<string, FieldInfo>()
                layoutUnassigned.forEach(field => {
                    layoutFieldMap.set(field.name, field)
                })
                
                // Combine with Odoo fields - use Odoo fields as source of truth
                let unassigned: FieldInfo[] = []
                
                if (odooFieldsData.success && odooFieldsData.data) {
                    // Get all synced fields from Odoo (fields that exist in smart_field_details)
                    const syncedOdooFields = odooFieldsData.data.filter((f: any) => f.is_synced)
                    
                    // For each synced Odoo field, create FieldInfo
                    // Use the layout field data if available (for ID), otherwise create new entry
                    unassigned = syncedOdooFields
                        .filter((odooField: any) => !assignedFieldNames.has(odooField.field_name))
                        .map((odooField: any) => {
                            // Try to get existing field from layout (has ID)
                            const existingField = layoutFieldMap.get(odooField.field_name)
                            
                            if (existingField) {
                                // Use existing field data (has ID from database)
                                return existingField
                            } else {
                                // Create new field info from Odoo data
                                // Note: This field won't have an ID until it's synced to smart_field_details
                                // For now, we'll use a temporary ID based on field name
                                return {
                                    id: 0, // Will need to be handled when adding to layout
                                    name: odooField.field_name,
                                    label: odooField.field_label || odooField.field_name,
                                    type: odooField.field_type,
                                    required: odooField.is_required || false,
                                    readonly: odooField.is_readonly || false,
                                }
                            }
                        })
                } else {
                    // Fallback to layout unassigned fields if Odoo fetch fails
                    unassigned = layoutUnassigned.filter(f => !assignedFieldNames.has(f.name))
                }
                
                setUnassignedFields(unassigned)
                setHasChanges(false)
            } else {
                setToast({ text: layoutData.error || 'Failed to fetch layout', type: 'error' })
            }
        } catch (error) {
            console.error('Error fetching layout:', error)
            setToast({ text: 'Failed to fetch layout', type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!selectedModel) return

        setSaving(true)
        try {
            const tenantId = getTenantId()
            
            // Collect removed field IDs (fields that were in layout but now in unassigned)
            const removedFieldIds = unassignedFields.filter(f => f.layout_id).map(f => f.id)

            const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(selectedModel)}/layout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(tenantId && { 'X-Tenant-ID': tenantId }),
                    ...(sessionId && { 'X-Odoo-Session': sessionId }),
                },
                body: JSON.stringify({
                    sections: sections.map(s => ({
                        section_key: s.section_key,
                        fields: s.fields.map(f => ({
                            id: f.id,
                            col_span: f.col_span || 6
                        }))
                    })),
                    removedFieldIds
                }),
            })
            const data = await response.json()
            if (data.success) {
                setToast({ text: 'Layout saved successfully', type: 'success' })
                setHasChanges(false)
            } else {
                setToast({ text: data.error || 'Failed to save layout', type: 'error' })
            }
        } catch (error) {
            console.error('Error saving layout:', error)
            setToast({ text: 'Failed to save layout', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    // Section management
    const toggleSection = (sectionKey: string) => {
        setSections(prev => prev.map(s => 
            s.section_key === sectionKey ? { ...s, isExpanded: !s.isExpanded } : s
        ))
    }

    const startEditingSection = (section: Section) => {
        setEditingSectionKey(section.section_key)
        setEditingSectionLabel(section.section_label)
    }

    const saveEditingSection = async () => {
        if (!editingSectionKey || !editingSectionLabel.trim()) return

        const tenantId = getTenantId()
        try {
            const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(selectedModel)}/layout/sections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(tenantId && { 'X-Tenant-ID': tenantId }),
                },
                body: JSON.stringify({
                    section_key: editingSectionKey,
                    section_label: editingSectionLabel.trim()
                }),
            })
            const data = await response.json()
            if (data.success) {
                setSections(prev => prev.map(s => 
                    s.section_key === editingSectionKey 
                        ? { ...s, section_label: editingSectionLabel.trim() } 
                        : s
                ))
                setToast({ text: 'Section renamed', type: 'success' })
            }
        } catch (error) {
            console.error('Error saving section:', error)
        }
        setEditingSectionKey(null)
        setEditingSectionLabel('')
    }

    const addNewSection = async () => {
        if (!newSectionKey.trim() || !newSectionLabel.trim()) return

        const tenantId = getTenantId()
        try {
            const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(selectedModel)}/layout/sections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(tenantId && { 'X-Tenant-ID': tenantId }),
                },
                body: JSON.stringify({
                    section_key: newSectionKey.trim().toLowerCase().replace(/\s+/g, '_'),
                    section_label: newSectionLabel.trim(),
                    section_order: sections.length + 1
                }),
            })
            const data = await response.json()
            if (data.success) {
                setSections(prev => [...prev, {
                    section_key: newSectionKey.trim().toLowerCase().replace(/\s+/g, '_'),
                    section_label: newSectionLabel.trim(),
                    section_order: sections.length + 1,
                    fields: [],
                    isExpanded: true
                }])
                setToast({ text: 'Section added', type: 'success' })
            }
        } catch (error) {
            console.error('Error adding section:', error)
        }
        setIsAddingSectionOpen(false)
        setNewSectionKey('')
        setNewSectionLabel('')
    }

    const deleteSection = async (sectionKey: string) => {
        if (sectionKey === 'main') {
            setToast({ text: 'Cannot delete main section', type: 'error' })
            return
        }

        const tenantId = getTenantId()
        try {
            const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(selectedModel)}/layout/sections/${sectionKey}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(tenantId && { 'X-Tenant-ID': tenantId }),
                },
            })
            const data = await response.json()
            if (data.success) {
                // Move fields to main section
                const sectionToDelete = sections.find(s => s.section_key === sectionKey)
                if (sectionToDelete) {
                    setSections(prev => {
                        const mainSection = prev.find(s => s.section_key === 'main')
                        return prev
                            .filter(s => s.section_key !== sectionKey)
                            .map(s => s.section_key === 'main' 
                                ? { ...s, fields: [...s.fields, ...sectionToDelete.fields] }
                                : s
                            )
                    })
                }
                setToast({ text: 'Section deleted', type: 'success' })
                setHasChanges(true)
            }
        } catch (error) {
            console.error('Error deleting section:', error)
        }
    }

    // --- Drag and Drop Logic ---

    const findContainer = (id: number | string) => {
        // Check sections
        for (const section of sections) {
            if (section.fields.find(f => f.id === id || f.name === id)) {
                return section.section_key;
            }
        }
        // Check unassigned
        if (unassignedFields.find(f => f.id === id || f.name === id)) {
            return 'unassigned';
        }
        return null;
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId || active.id === overId) return;

        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(overId) || (sections.find(s => s.section_key === overId) ? overId : null) || (overId === 'unassigned' ? 'unassigned' : null);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        // Move logic for DragOver (live update)
        setHasChanges(true);

        if (activeContainer === 'unassigned') {
            const item = unassignedFields.find(f => f.id === active.id || f.name === active.id);
            if (!item) return;

            setUnassignedFields(prev => prev.filter(f => f.id !== active.id && f.name !== active.id));
            setSections(prev => prev.map(s => {
                if (s.section_key === overContainer) {
                    return { ...s, fields: [...s.fields, { ...item, col_span: 6 }] };
                }
                return s;
            }));
        } else if (overContainer === 'unassigned') {
            const section = sections.find(s => s.section_key === activeContainer);
            const item = section?.fields.find(f => f.id === active.id || f.name === active.id);
            if (!item) return;

            setSections(prev => prev.map(s => {
                if (s.section_key === activeContainer) {
                    return { ...s, fields: s.fields.filter(f => f.id !== active.id && f.name !== active.id) };
                }
                return s;
            }));
            setUnassignedFields(prev => [...prev, item]);
        } else {
            // Section to Section
            const sourceSection = sections.find(s => s.section_key === activeContainer);
            const item = sourceSection?.fields.find(f => f.id === active.id || f.name === active.id);
            if (!item) return;

            setSections(prev => prev.map(s => {
                if (s.section_key === activeContainer) {
                    return { ...s, fields: s.fields.filter(f => f.id !== active.id && f.name !== active.id) };
                }
                if (s.section_key === overContainer) {
                    return { ...s, fields: [...s.fields, item] };
                }
                return s;
            }));
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const activeContainer = findContainer(active.id);
        const overContainer = over ? (findContainer(over.id) || (sections.find(s => s.section_key === over.id) ? over.id : null) || (over.id === 'unassigned' ? 'unassigned' : null)) : null;

        if (activeContainer && overContainer && activeContainer === overContainer) {
            if (activeContainer === 'unassigned') {
                const oldIndex = unassignedFields.findIndex(f => f.id === active.id || f.name === active.id);
                const newIndex = unassignedFields.findIndex(f => f.id === over!.id || f.name === over!.id);
                if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
                    setUnassignedFields(arrayMove(unassignedFields, oldIndex, newIndex));
                    setHasChanges(true);
                }
            } else {
                setSections(prev => prev.map(s => {
                    if (s.section_key === activeContainer) {
                        const oldIndex = s.fields.findIndex(f => f.id === active.id || f.name === active.id);
                        const newIndex = s.fields.findIndex(f => f.id === over!.id || f.name === over!.id);
                        if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
                            return { ...s, fields: arrayMove(s.fields, oldIndex, newIndex) };
                        }
                    }
                    return s;
                }));
                setHasChanges(true);
            }
        }
        
        setActiveId(null);
    };

    // Field management
    const removeFieldFromSection = (sectionKey: string, fieldId: number | string) => {
        const section = sections.find(s => s.section_key === sectionKey)
        const field = section?.fields.find(f => f.id === fieldId || f.name === fieldId)
        if (field) {
            setSections(prev => prev.map(s => 
                s.section_key === sectionKey 
                    ? { ...s, fields: s.fields.filter(f => f.id !== fieldId && f.name !== fieldId) }
                    : s
            ))
            setUnassignedFields(prev => [...prev, field])
            setHasChanges(true)
        }
    }

    const addFieldToSection = (sectionKey: string, field: FieldInfo) => {
        setSections(prev => prev.map(s => 
            s.section_key === sectionKey 
                ? { ...s, fields: [...s.fields, { ...field, col_span: 6 }] }
                : s
        ))
        setUnassignedFields(prev => prev.filter(f => f.id !== field.id))
        setHasChanges(true)
    }

    const reorderFields = (sectionKey: string, newFields: FieldInfo[]) => {
        setSections(prev => prev.map(s => 
            s.section_key === sectionKey ? { ...s, fields: newFields } : s
        ))
        setHasChanges(true)
    }

    const updateFieldColSpan = (sectionKey: string, fieldId: number, colSpan: number) => {
        setSections(prev => prev.map(s => 
            s.section_key === sectionKey 
                ? { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, col_span: colSpan } : f) }
                : s
        ))
        setHasChanges(true)
    }

    // Add field to Odoo
    const handleAddFieldToOdoo = async () => {
        if (!selectedModel || !newFieldData.name || !newFieldData.string) return

        setAddingField(true)
        try {
            const tenantId = getTenantId()
            const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${encodeURIComponent(selectedModel)}/add-field`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(tenantId && { 'X-Tenant-ID': tenantId }),
                    ...(sessionId && { 'X-Odoo-Session': sessionId }),
                },
                body: JSON.stringify({
                    name: `x_${newFieldData.name.toLowerCase().replace(/\s+/g, '_')}`,
                    string: newFieldData.string,
                    type: newFieldData.type,
                    required: newFieldData.required,
                    readonly: newFieldData.readonly,
                    help: newFieldData.help,
                    relation: newFieldData.relation || undefined
                }),
            })
            const data = await response.json()
            if (data.success) {
                setToast({ text: 'Field added successfully', type: 'success' })
                setIsAddFieldModalOpen(false)
                setNewFieldData({ name: '', string: '', type: 'char', required: false, readonly: false, help: '', relation: '' })
                // Refresh layout to get new field
                fetchLayout(selectedModel)
            } else {
                setToast({ text: data.error || 'Failed to add field', type: 'error' })
            }
        } catch (error) {
            console.error('Error adding field:', error)
            setToast({ text: 'Failed to add field', type: 'error' })
        } finally {
            setAddingField(false)
        }
    }

    const getFieldIcon = (type: string) => FIELD_TYPE_ICONS[type] || Type

    const modelOptions = models.map(m => ({
        value: m.model_name,
        label: m.model_display_name || m.model_name,
    }))

    // Find active field for overlay
    const activeField = activeId ? (
        sections.flatMap(s => s.fields).find(f => f.id === activeId || f.name === activeId) || 
        unassignedFields.find(f => f.id === activeId || f.name === activeId)
    ) : null;

    return (
        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
        <div className="h-full flex flex-col relative overflow-hidden" style={{ backgroundColor: colors.background }}>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(${colors.textPrimary} 1px, transparent 1px)`,
                    backgroundSize: '24px 24px'
                }}
            />

            {toast && <Toast text={toast.text} state={toast.type} onClose={() => setToast(null)} />}

            <header className="flex-shrink-0 z-40 border-b backdrop-blur-xl bg-opacity-80 px-6 py-4 flex items-center justify-between"
                style={{ backgroundColor: mode === 'dark' ? 'rgba(24, 24, 27, 0.8)' : 'rgba(255, 255, 255, 0.8)', borderColor: colors.border }}
            >
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        style={{ color: colors.textSecondary }}
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: colors.textPrimary }}>
                            <LayoutTemplate className="opacity-50" size={20} />
                            Layout Editor
                        </h1>
                        <p className="text-xs font-medium opacity-60">Customize your data forms visually</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-zinc-100/50 dark:bg-zinc-800/50 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
                     <span className="text-xs font-bold uppercase tracking-wider px-2" style={{ color: colors.textSecondary }}>Model</span>
                     <SearchableSelect
                        value={selectedModel}
                        options={modelOptions}
                        onChange={setSelectedModel}
                        placeholder="Select a model..."
                        colors={colors}
                        disabled={loadingModels}
                    />
                </div>

                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#fff7ed', color: '#f97316', border: '1px solid #ffedd5' }}>
                        Unsaved Changes
                    </span>
                    )}
                    <button
                        onClick={() => setIsAddFieldModalOpen(true)}
                        disabled={!selectedModel}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        style={{ backgroundColor: colors.card, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
                    >
                        <Plus size={16} />
                        New Field
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden min-h-0">
                
                {/* Canvas Area */}
                <main className="flex-1 overflow-y-auto p-8 relative custom-scrollbar min-h-0">
                    {!selectedModel ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40">
                            <LayoutTemplate size={64} className="mb-4" />
                            <p className="text-lg font-medium">Select a model to begin editing</p>
                        </div>
                    ) : loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 size={40} className="animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto space-y-6">
                            
                            {/* Toolbar */}
                            <div className="flex justify-end mb-4">
                                {isAddingSectionOpen ? (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 p-2 rounded-xl shadow-lg border"
                                        style={{ backgroundColor: colors.card, borderColor: colors.border }}
                                    >
                                        <input
                                            type="text"
                                            placeholder="key_name"
                                            value={newSectionKey}
                                            onChange={(e) => setNewSectionKey(e.target.value)}
                                            className="px-3 py-1.5 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-800 outline-none w-32 border border-transparent focus:border-blue-500 transition-colors"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Label Display"
                                            value={newSectionLabel}
                                            onChange={(e) => setNewSectionLabel(e.target.value)}
                                            className="px-3 py-1.5 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-800 outline-none w-40 border border-transparent focus:border-blue-500 transition-colors"
                                        />
                                        <button onClick={addNewSection} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"><Check size={16} /></button>
                                        <button onClick={() => { setIsAddingSectionOpen(false); }} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"><X size={16} /></button>
                                    </motion.div>
                                ) : (
                                    <button
                                        onClick={() => setIsAddingSectionOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide border-2 border-dashed transition-all hover:border-solid hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                                        style={{ borderColor: colors.border, color: colors.textSecondary }}
                                    >
                                        <Plus size={14} /> Add Section
                                    </button>
                                )}
                            </div>

                            {/* Sections Rendering */}
                            <AnimatePresence>
                                {sections.filter(s => s.is_visible !== false).map((section) => (
                                    <div
                                        key={section.section_key}
                                        className="rounded-3xl border-2 transition-all duration-300"
                                        style={{ backgroundColor: colors.card, borderColor: colors.border }}
                                    >
                                        {/* Section Header */}
                                        <div
                                            className="flex items-center justify-between px-6 py-4 cursor-pointer"
                                            onClick={() => toggleSection(section.section_key)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-xl transition-colors ${section.isExpanded ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'}`}>
                                                     <Layers size={20} />
                                                </div>
                                                
                                                {editingSectionKey === section.section_key ? (
                                                    <input
                                                        type="text"
                                                        value={editingSectionLabel}
                                                        onChange={(e) => setEditingSectionLabel(e.target.value)}
                                                        onBlur={saveEditingSection}
                                                        onKeyDown={(e) => e.key === 'Enter' && saveEditingSection()}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="px-3 py-1 rounded-lg text-lg font-bold outline-none border-2 border-blue-500 bg-transparent"
                                                        style={{ color: colors.textPrimary }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div>
                                                        <h3 className="text-lg font-bold" style={{ color: colors.textPrimary }}>{section.section_label}</h3>
                                                        <div className="text-xs font-mono opacity-50" style={{ color: colors.textSecondary }}>{section.section_key}</div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                                    {section.fields.length} Fields
                                                </span>
                                                <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-700 mx-2"></div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); startEditingSection(section); }}
                                                    className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                {section.section_key !== 'main' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteSection(section.section_key); }}
                                                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                <div className="p-2 text-zinc-400 dark:text-zinc-500">
                                                    {section.isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Field Grid */}
                                        <AnimatePresence initial={false}>
                                            {section.isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="bg-zinc-50/50 dark:bg-black/20 overflow-hidden"
                                                >
                                                    <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                                        {section.fields.length === 0 ? (
                                                        <SortableContext id={section.section_key} items={section.fields.map(f => f.id || f.name)} strategy={rectSortingStrategy}>
                                                            <div className="border-3 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-12 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500">
                                                                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                                                                    <Plus size={24} className="opacity-50" />
                                                                </div>
                                                                <p className="font-medium">Drop fields here to build your form</p>
                                                            </div>
                                                        </SortableContext>
                                                        ) : (
                                                        <SortableContext id={section.section_key} items={section.fields.map(f => f.id || f.name)} strategy={rectSortingStrategy}>
                                                            <div className="flex flex-wrap gap-4">
                                                                {section.fields.map((field) => (
                                                                    <SortableField 
                                                                        key={field.id || field.name} 
                                                                        field={field} 
                                                                        sectionKey={section.section_key}
                                                                        onRemove={removeFieldFromSection}
                                                                        colors={colors}
                                                                        getTypeColor={getTypeColor}
                                                                        getTypeBorderColor={getTypeBorderColor}
                                                                        getFieldIcon={getFieldIcon}
                                                                        isDark={mode === 'dark'}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </SortableContext>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </main>

                {/* Sticky Sidebar */}
                <aside className="w-80 flex-shrink-0 border-l bg-white/50 dark:bg-black/50 backdrop-blur-md flex flex-col z-30 shadow-2xl min-h-0"
                    style={{ borderColor: colors.border }}
                >
                    <div className="p-5 border-b flex-shrink-0" style={{ borderColor: colors.border }}>
                         <h3 className="font-bold flex items-center gap-2 mb-1" style={{ color: colors.textPrimary }}>
                            <Binary size={18} className="text-blue-500" />
                            Unassigned Fields
                         </h3>
                         <p className="text-xs text-zinc-500 dark:text-zinc-400">Drag these fields onto the canvas</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 pb-6 custom-scrollbar min-h-0">
                        <SortableContext id="unassigned" items={unassignedFields.map(f => f.id || f.name)} strategy={rectSortingStrategy}>
                            <div className="space-y-2">
                                {unassignedFields.length === 0 ? (
                                    <div className="text-center py-10 opacity-50">
                                        <Check size={40} className="mx-auto mb-2 text-emerald-500" />
                                        <p className="text-sm">All fields assigned!</p>
                                    </div>
                                ) : (
                                    unassignedFields.map((field) => (
                                        <SortableField 
                                            key={field.id || field.name} 
                                            field={{...field, col_span: 12}} // Force full width in sidebar
                                            sectionKey="unassigned"
                                            onRemove={() => {}} // Can't remove from unassigned
                                            colors={colors}
                                            getTypeColor={getTypeColor}
                                            getTypeBorderColor={getTypeBorderColor}
                                            getFieldIcon={getFieldIcon}
                                            isDark={mode === 'dark'}
                                        />
                                    ))
                                )}
                            </div>
                        </SortableContext>
                    </div>
                </aside>
            </div>

            {/* Drag Overlay */}
            <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                        active: { opacity: '0.5' },
                    },
                }),
            }}>
                {activeField ? (
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border shadow-2xl w-[250px]" style={{ borderColor: getTypeBorderColor(activeField.type, mode === 'dark') }}>
                         <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(activeField.type)}`}>
                                 {(() => {
                                     const FieldIcon = getFieldIcon(activeField.type);
                                     return <FieldIcon size={18} />;
                                 })()}
                             </div>
                             <div className="flex-1 min-w-0">
                                 <div className="font-bold text-sm truncate" style={{ color: colors.textPrimary }}>{activeField.label}</div>
                                 <code className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">{activeField.name}</code>
                             </div>
                         </div>
                    </div>
                ) : null}
            </DragOverlay>

            {/* Add Field Modal */}
            <AnimatePresence>
                {isAddFieldModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsAddFieldModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-full max-w-lg rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                            style={{ backgroundColor: colors.card }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                            
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>New Field</h2>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Create a custom property for this model</p>
                                </div>
                                <button
                                    onClick={() => setIsAddFieldModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <X size={24} className="text-zinc-400 dark:text-zinc-500" />
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>Display Label</label>
                                        <input
                                            type="text"
                                            value={newFieldData.string}
                                            onChange={(e) => setNewFieldData(prev => ({ ...prev, string: e.target.value }))}
                                            placeholder="e.g. Purchase Date"
                                            className="w-full px-4 py-3 rounded-xl text-sm outline-none border-2 focus:border-blue-500 transition-colors"
                                            style={{ backgroundColor: colors.mutedBg, borderColor: colors.border, color: colors.textPrimary }}
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>Internal Name</label>
                                        <div className="flex items-center">
                                            <span className="px-3 py-3 rounded-l-xl text-sm font-mono border-y-2 border-l-2" style={{ backgroundColor: colors.mutedBg, borderColor: colors.border, color: colors.textSecondary }}>x_</span>
                                            <input
                                                type="text"
                                                value={newFieldData.name}
                                                onChange={(e) => setNewFieldData(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="purchase_date"
                                                className="w-full px-3 py-3 rounded-r-xl text-sm font-mono outline-none border-2 focus:border-blue-500 transition-colors"
                                                style={{ backgroundColor: colors.mutedBg, borderColor: colors.border, color: colors.textPrimary }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>Data Type</label>
                                        <div className="relative">
                                            <select
                                                value={newFieldData.type}
                                                onChange={(e) => setNewFieldData(prev => ({ ...prev, type: e.target.value }))}
                                                className="w-full px-4 py-3 rounded-xl text-sm outline-none border-2 appearance-none focus:border-blue-500 transition-colors cursor-pointer"
                                                style={{ backgroundColor: colors.mutedBg, borderColor: colors.border, color: colors.textPrimary }}
                                            >
                                                <option value="char">Text String</option>
                                                <option value="text">Long Text</option>
                                                <option value="integer">Integer Number</option>
                                                <option value="float">Decimal Number</option>
                                                <option value="monetary">Currency</option>
                                                <option value="boolean">Switch / Checkbox</option>
                                                <option value="date">Date Picker</option>
                                                <option value="datetime">Date & Time</option>
                                                <option value="selection">Dropdown Selection</option>
                                                <option value="many2one">Relation (Many2One)</option>
                                                <option value="many2many">Tags (Many2Many)</option>
                                                <option value="binary">Image / File</option>
                                            </select>
                                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                                        </div>
                                    </div>
                                </div>

                                {['many2one', 'many2many', 'one2many'].includes(newFieldData.type) && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-blue-600 dark:text-blue-400">Related Model ID</label>
                                        <input
                                            type="text"
                                            value={newFieldData.relation}
                                            onChange={(e) => setNewFieldData(prev => ({ ...prev, relation: e.target.value }))}
                                            placeholder="e.g. res.partner"
                                            className="w-full px-4 py-2 rounded-lg text-sm bg-white dark:bg-zinc-900 outline-none border border-blue-200 dark:border-blue-800 focus:ring-2 focus:ring-blue-500 transition-all text-zinc-900 dark:text-zinc-100"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>Help Tooltip (Optional)</label>
                                    <input
                                        type="text"
                                        value={newFieldData.help}
                                        onChange={(e) => setNewFieldData(prev => ({ ...prev, help: e.target.value }))}
                                        placeholder="Explanation for the user..."
                                        className="w-full px-4 py-3 rounded-xl text-sm outline-none border-2 focus:border-blue-500 transition-colors"
                                        style={{ backgroundColor: colors.mutedBg, borderColor: colors.border, color: colors.textPrimary }}
                                    />
                                </div>

                                <div className="flex items-center gap-4 pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all hover:bg-zinc-50 dark:hover:bg-white/5" style={{ borderColor: colors.border }}>
                                        <input
                                            type="checkbox"
                                            checked={newFieldData.required}
                                            onChange={(e) => setNewFieldData(prev => ({ ...prev, required: e.target.checked }))}
                                            className="w-5 h-5 rounded accent-blue-500"
                                        />
                                        <span className="text-sm font-bold" style={{ color: colors.textPrimary }}>Required Field</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all hover:bg-zinc-50 dark:hover:bg-white/5" style={{ borderColor: colors.border }}>
                                        <input
                                            type="checkbox"
                                            checked={newFieldData.readonly}
                                            onChange={(e) => setNewFieldData(prev => ({ ...prev, readonly: e.target.checked }))}
                                            className="w-5 h-5 rounded accent-blue-500"
                                        />
                                        <span className="text-sm font-bold" style={{ color: colors.textPrimary }}>Read-only</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-6 border-t" style={{ borderColor: colors.border }}>
                                <button
                                    onClick={() => setIsAddFieldModalOpen(false)}
                                    className="px-6 py-3 rounded-xl text-sm font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                    style={{ color: colors.textSecondary }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddFieldToOdoo}
                                    disabled={addingField || !newFieldData.name || !newFieldData.string}
                                    className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}
                                >
                                    {addingField ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                    Create Field
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
        </DndContext>
    )
}

export default FieldLayoutEditor