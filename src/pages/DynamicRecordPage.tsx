"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import { API_CONFIG } from "../config/api"
import { CustomDropdown } from "../components/NewCustomDropdown"
import { CustomInput } from "../components/CusotmInput"
import { IOSCheckbox } from "../components/IOSCheckbox"
import { PremiumDatePicker } from "../components/ui/PremiumDatePicker"
import { NewCustomButton } from "../components/NewCustomButton"
import Toast from "../components/Toast"
import { LinesEditor } from "../components/LinesEditor"
import {
    ArrowLeft,
    Save,
    Loader2,
    Upload,
    X,
    Image as ImageIcon,
    Layers,
    Box,
    FileText,
    Check,
    MoreVertical,
    Scan,
    Tag,
    Database,
    Lock,
    Info,
    Calendar,
    Hash,
    Radio
} from "lucide-react"
import Barcode from "react-barcode"
import "./DynamicRecordPage.css"

// Field type to widget mapping
const WIDGET_MAP: Record<string, string> = {
    'TextInput': 'text',
    'TextArea': 'textarea',
    'NumberInput': 'number',
    'MoneyInput': 'money',
    'Dropdown': 'dropdown',
    'RelationDropdown': 'relation',
    'MultiRelation': 'multi-relation',
    'Checkbox': 'checkbox',
    'DatePicker': 'date',
    'DateTimePicker': 'datetime',
    'ImageUpload': 'image',
    'FileUpload': 'file',
    'EmailInput': 'email',
    'PhoneInput': 'phone',
    'UrlInput': 'url',
    'HtmlEditor': 'html',
    'JsonEditor': 'json',
}

interface FieldConfig {
    name: string
    label: string
    type: string
    widget: string
    required: boolean
    readonly: boolean
    priority?: number
    display_group?: string
    width?: number
    col_span?: number
    options?: { value: string; label: string }[]
    relation?: { model: string; field?: string; domain?: string }
    can_view?: boolean
    can_edit?: boolean
}

interface GroupConfig {
    name: string
    string: string
    priority: number
}

interface DynamicRecordPageProps {
    modelName: string
    pageTitle?: string
    backRoute?: string
    pageId?: string
}

export function DynamicRecordPage({
    modelName,
    pageTitle,
    backRoute,
    pageId
}: DynamicRecordPageProps) {
    const { t, i18n } = useTranslation()
    const { colors, mode } = useTheme()
    const { sessionId, uid } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const { id } = useParams<{ id: string }>()

    // Refs for file input
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isCreating = !id || id === 'create'
    const recordId = isCreating ? null : parseInt(id)
    const isViewMode = location.pathname.includes('/view/')
    const isDark = mode === 'dark'
    const isRTL = i18n.dir() === "rtl"

    // State
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [fields, setFields] = useState<FieldConfig[]>([])
    const [groups, setGroups] = useState<GroupConfig[]>([])

    const [formData, setFormData] = useState<Record<string, any>>({})
    const [rawRecord, setRawRecord] = useState<Record<string, any>>({}) // For display only (m2o names etc)
    const [originalData, setOriginalData] = useState<Record<string, any>>({})

    const [relationOptions, setRelationOptions] = useState<Record<string, { id: number; name: string }[]>>({})
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
    const [dirty, setDirty] = useState(false)

    const [activeTab, setActiveTab] = useState<string>("general")
    const [workflowInfo, setWorkflowInfo] = useState<{ id: number; name: string; workflowId: number } | null>(null)
    const [checkingWorkflow, setCheckingWorkflow] = useState(false)

    // Get tenant ID from localStorage
    const getTenantId = () => localStorage.getItem('current_tenant_id')

    // Normalize record data - extract IDs from relation fields
    const normalizeRecordData = useCallback((record: Record<string, any>, fieldConfigs: FieldConfig[]): Record<string, any> => {
        const normalized: Record<string, any> = {}
        const fieldMap = new Map(fieldConfigs.map(f => [f.name, f]))

        Object.entries(record).forEach(([key, value]) => {
            const field = fieldMap.get(key)

            if (!field) {
                normalized[key] = value
                return
            }

            // Handle relation fields - extract ID from [id, name] tuple
            if (field.type === 'many2one') {
                if (Array.isArray(value) && value.length >= 1) {
                    normalized[key] = value[0] || false
                } else if (value === false || value === null || value === undefined) {
                    normalized[key] = false
                } else if (typeof value === 'number') {
                    normalized[key] = value
                } else {
                    normalized[key] = false
                }
            } else if (field.type === 'many2many' || field.type === 'one2many') {
                if (Array.isArray(value)) {
                    const ids = value.map((v: any) => {
                        if (Array.isArray(v) && v.length >= 1) return v[0]
                        return typeof v === 'number' ? v : null
                    }).filter((id: any) => id !== null)
                    normalized[key] = ids
                } else {
                    normalized[key] = []
                }
            } else {
                normalized[key] = value
            }
        })
        return normalized
    }, [])

    // Format relation fields for Odoo API
    const formatRelationField = useCallback((field: FieldConfig, value: any): any => {
        if (field.type === 'many2one') {
            if (Array.isArray(value) && value.length >= 1) return value[0] || false
            if (value === null || value === undefined || value === '') return false
            if (typeof value === 'string') {
                const parsed = parseInt(value)
                return isNaN(parsed) ? false : parsed
            }
            return typeof value === 'number' ? value : false
        } else if (field.type === 'many2many') {
            if (!Array.isArray(value) || value.length === 0) return [[6, 0, []]]
            const ids = value.map((v: any) => {
                if (Array.isArray(v) && v.length >= 1) return v[0]
                if (typeof v === 'number') return v
                if (typeof v === 'string') {
                    const parsed = parseInt(v)
                    return isNaN(parsed) ? null : parsed
                }
                return null
            }).filter((id: any) => id !== null)
            return [[6, 0, ids]]
        } else if (field.type === 'one2many') {
            if (Array.isArray(value)) {
                const ids = value.map((v: any) => {
                    if (Array.isArray(v) && v.length >= 1) return v[0]
                    if (typeof v === 'number') return v
                    return null
                }).filter((id: any) => id !== null)
                return [[6, 0, ids]]
            }
            return [[6, 0, []]]
        }
        return value
    }, [])

    // Get Odoo headers
    const getHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }
        const tenantId = getTenantId()
        if (tenantId) headers['X-Tenant-ID'] = tenantId
        if (sessionId) headers['X-Odoo-Session'] = sessionId

        const odooBase = localStorage.getItem('odooBase')
        const odooDb = localStorage.getItem('odooDb')
        if (odooBase) headers['x-odoo-base'] = odooBase
        if (odooDb) headers['x-odoo-db'] = odooDb

        return headers
    }, [sessionId])

    // Fetch form data
    const fetchFormData = useCallback(async () => {
        if (!sessionId) return

        const tenantId = getTenantId()
        if (!tenantId) {
            setToast({ text: 'Tenant ID is required.', state: 'error' })
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            // Build URL with userId for permission checks
            let url = recordId
                ? `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${modelName}/form/${recordId}`
                : `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${modelName}/form`
            
            // Add userId as query param for field-level permissions
            if (uid) {
                url += `?userId=${uid}`
            }

            const response = await fetch(url, { method: 'GET', headers: getHeaders() })
            const data = await response.json()

            if (data.success) {
                const rawFieldList = data.fields?.fields || []
                // Normalize field properties - backend may send field_type, field_name, field_label
                // Also filter out fields where can_view is false and apply can_edit to readonly
                const fieldList = rawFieldList
                    .filter((f: any) => f.can_view !== false) // Filter out fields user cannot view
                    .map((f: any) => ({
                        ...f,
                        name: f.name || f.field_name,
                        label: f.label || f.field_label || f.string,
                        type: f.type || f.field_type,
                        // If can_edit is false, make the field readonly
                        readonly: f.readonly || f.can_edit === false,
                    }))
                // Process groups if available, otherwise we will generate them
                // Assuming data.fields.groups could be available or we rely on display_group
                const groupList = Array.isArray(data.fields?.groups) ? data.fields.groups : []

                setFields(fieldList)
                setGroups(groupList)

                if (data.record) {
                    setRawRecord(data.record)
                    const normalizedRecord = normalizeRecordData(data.record, fieldList)
                    setFormData(normalizedRecord)
                    setOriginalData(normalizedRecord)
                } else {
                    setRawRecord({})
                    const initialData: Record<string, any> = {}
                    fieldList.forEach((f: FieldConfig) => {
                        if (f.type === 'boolean') initialData[f.name] = false
                        else if (f.type === 'integer' || f.type === 'float' || f.type === 'monetary') initialData[f.name] = 0
                        else if (f.type === 'many2many' || f.type === 'one2many') initialData[f.name] = []
                        else initialData[f.name] = null
                    })
                    setFormData(initialData)
                    setOriginalData(initialData)
                }
            } else {
                setToast({ text: data.error || t('Failed to load form data'), state: 'error' })
            }
        } catch (error) {
            console.error('Error fetching form data:', error)
            setToast({ text: t('Failed to load form data'), state: 'error' })
        } finally {
            setLoading(false)
        }
    }, [sessionId, uid, modelName, recordId, getHeaders, t, normalizeRecordData])

    // Fetch relations options
    const fetchRelationOptions = useCallback(async (fieldName: string, relationModel: string, search = '') => {
        if (!sessionId) return
        const tenantId = getTenantId()
        if (!tenantId) return

        try {
            const url = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${modelName}/${fieldName}/relation-options?search=${encodeURIComponent(search)}&limit=100`
            const response = await fetch(url, { method: 'GET', headers: getHeaders() })
            
            // Check if response is ok before parsing
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error')
                console.error(`Error fetching options for ${fieldName}: HTTP ${response.status} - ${errorText}`)
                return
            }
            
            const data = await response.json().catch((parseError) => {
                console.error(`Error parsing JSON response for ${fieldName}:`, parseError)
                return null
            })

            if (data && data.success && data.options) {
                setRelationOptions(prev => ({
                    ...prev,
                    [fieldName]: data.options.map((opt: any) => ({
                        id: opt.value,
                        name: opt.label
                    }))
                }))
            } else if (data && !data.success) {
                console.warn(`Failed to fetch options for ${fieldName}:`, data.error || 'Unknown error')
            }
        } catch (error) {
            // Handle network errors (connection refused, etc.)
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                console.error(`Network error fetching options for ${fieldName}. Backend may be down or unreachable.`)
            } else {
                console.error(`Error fetching options for ${fieldName}:`, error)
            }
        }
    }, [sessionId, modelName, getHeaders])

    // Initial fetch of relation options
    useEffect(() => {
        if (fields.length > 0) {
            fields.forEach(field => {
                if ((field.type === 'many2one' || field.type === 'many2many') && field.relation?.model) {
                    fetchRelationOptions(field.name, field.relation.model, '')
                }
            })
        }
    }, [fields, fetchRelationOptions])

    // Check for workflow on load
    const checkWorkflow = useCallback(async () => {
        if (!sessionId || !modelName) {
            console.log('[DynamicRecordPage] Skipping workflow check: missing sessionId or modelName', { sessionId: !!sessionId, modelName })
            return
        }
        
        const tenantId = getTenantId()
        if (!tenantId) {
            console.log('[DynamicRecordPage] Skipping workflow check: missing tenantId')
            return
        }

        setCheckingWorkflow(true)
        try {
            const action = isCreating ? 'create' : 'update'
            const url = `${API_CONFIG.BACKEND_BASE_URL}/workflow/check-workflow?model=${encodeURIComponent(modelName)}&action=${action}`
            console.log('[DynamicRecordPage] Checking workflow:', { model: modelName, action, url })
            
            const response = await fetch(url, {
                method: 'GET',
                headers: getHeaders()
            })
            const result = await response.json()
            
            console.log('[DynamicRecordPage] Workflow check result:', result)
            
            if (result.success && result.hasWorkflow && result.workflow) {
                console.log('[DynamicRecordPage] Workflow found:', result.workflow)
                setWorkflowInfo(result.workflow)
            } else {
                console.log('[DynamicRecordPage] No workflow found for model:', modelName)
                setWorkflowInfo(null)
            }
        } catch (error) {
            console.error('[DynamicRecordPage] Error checking workflow:', error)
            setWorkflowInfo(null)
        } finally {
            setCheckingWorkflow(false)
        }
    }, [sessionId, modelName, isCreating, getHeaders])

    useEffect(() => {
        fetchFormData()
    }, [fetchFormData])

    // Check workflow when component loads or model changes
    useEffect(() => {
        if (sessionId && modelName && !isViewMode) {
            checkWorkflow()
        }
    }, [sessionId, modelName, isCreating, isViewMode, checkWorkflow])

    // -- COMPUTED VALUES FOR SPLIT LAYOUT --

    const { tabButtons, activeFields, imageField, detailFields, barcodeField, rfidField } = useMemo(() => {
        const safeGroups = Array.isArray(groups) ? groups : []

        // 1. Identify Image Field
        // Priority: image_1920 > image_1024 > ... > image
        const imagePriorities = ['image_1920', 'image_1024', 'image_512', 'image_256', 'image_128', 'image', 'avatar_128', 'avatar_256', 'icon']
        let selectedImageField: FieldConfig | null = null
        const allImageNames = new Set<string>()

        // Collect all binary fields that look like images
        const potentialImages = fields.filter(f => f.type === 'binary' && (f.name.includes('image') || f.name.includes('avatar') || f.name.includes('icon')))
        potentialImages.forEach(f => allImageNames.add(f.name))

        // Find best match
        for (const name of imagePriorities) {
            const found = potentialImages.find(f => f.name === name)
            if (found) {
                selectedImageField = found
                break
            }
        }
        // Fallback
        if (!selectedImageField && potentialImages.length > 0) {
            selectedImageField = potentialImages[0]
        }

        // 2. Identify Special Fields (Barcode, RFID)
        const barcodeF = fields.find(f => f.name === 'barcode')
        const rfidF = fields.find(f => f.name === 'rfid_tag' || f.name === 'rfid_code')

        // 3. Separate Fields into Main (Editable) and Details (Readonly)
        const main: FieldConfig[] = []
        const details: FieldConfig[] = []

        // Helper for field sorting
        const getFieldScore = (f: FieldConfig) => {
            if (f.name === 'name') return 10000 // Top priority
            if (f.name === 'display_name') return 9000 
            return f.priority ?? 50
        }

        fields.forEach(f => {
            // Skip image fields (handled by ImageSection)
            if (allImageNames.has(f.name)) return

            // If readonly, goes to details
            if (f.readonly) {
                details.push(f)
            } else {
                main.push(f)
            }
        })

        // Sort Main fields by priority/score
        main.sort((a, b) => getFieldScore(b) - getFieldScore(a))

        // 4. Group Main Fields for Tabs using Smart Categorization
        const groupedMain: Record<string, FieldConfig[]> = {}
        
        // Smart grouping logic based on field names, types, and common patterns
        const getSmartGroup = (f: FieldConfig): string => {
            // If backend provides a display_group, respect it
            if (f.display_group && f.display_group !== 'general') return f.display_group
            
            const name = f.name.toLowerCase()
            const label = (f.label || '').toLowerCase()
            const type = f.type
            
            // ===== SYSTEM FIELDS =====
            if (['create_date', 'write_date', 'create_uid', 'write_uid', '__last_update', 'message_follower_ids', 'message_ids', 'message_main_attachment_id', 'activity_ids', 'activity_state', 'activity_user_id', 'activity_type_id', 'activity_date_deadline', 'activity_summary', 'activity_exception_decoration', 'activity_exception_icon'].includes(name)) {
                return 'system'
            }
            
            // ===== BASIC INFO (Identity fields) =====
            if (['name', 'display_name', 'code', 'reference', 'ref', 'default_code', 'internal_reference', 'barcode', 'sequence', 'priority', 'color', 'active', 'description', 'note', 'notes', 'comment', 'description_sale', 'description_purchase', 'description_picking', 'description_pickingin', 'description_pickingout'].includes(name) ||
                name.endsWith('_name') || name.endsWith('_code') || name.endsWith('_ref') ||
                label.includes('name') || label.includes('reference') || label.includes('code')) {
                return 'basic'
            }
            
            // ===== PRICING & FINANCIAL =====
            if (['list_price', 'standard_price', 'lst_price', 'price', 'cost', 'sale_price', 'purchase_price', 'price_unit', 'amount', 'amount_total', 'amount_untaxed', 'amount_tax', 'subtotal', 'total', 'margin', 'profit', 'discount', 'tax_id', 'taxes_id', 'supplier_taxes_id', 'currency_id', 'company_currency_id', 'cost_currency_id', 'pricelist_id', 'fiscal_position_id', 'payment_term_id', 'invoice_policy', 'expense_policy'].includes(name) ||
                name.includes('price') || name.includes('cost') || name.includes('amount') || name.includes('tax') || name.includes('currency') || name.includes('margin') || name.includes('discount') ||
                label.includes('price') || label.includes('cost') || label.includes('amount') || label.includes('tax')) {
                return 'pricing'
            }
            
            // ===== INVENTORY & STOCK =====
            if (['qty', 'quantity', 'qty_available', 'qty_on_hand', 'virtual_available', 'incoming_qty', 'outgoing_qty', 'free_qty', 'reserved_quantity', 'forecast_quantity', 'reordering_min_qty', 'reordering_max_qty', 'qty_to_order', 'product_qty', 'product_uom_qty', 'location_id', 'location_src_id', 'location_dest_id', 'warehouse_id', 'lot_id', 'package_id', 'owner_id', 'tracking', 'use_expiration_date', 'expiration_date', 'use_date', 'removal_date', 'alert_date', 'life_date'].includes(name) ||
                name.includes('qty') || name.includes('quantity') || name.includes('stock') || name.includes('inventory') || name.includes('warehouse') || name.includes('location') ||
                label.includes('quantity') || label.includes('stock') || label.includes('inventory')) {
                return 'inventory'
            }
            
            // ===== UNITS & MEASUREMENTS =====
            if (['uom_id', 'uom_po_id', 'product_uom', 'uom_name', 'weight', 'volume', 'length', 'width', 'height', 'weight_uom_name', 'volume_uom_name', 'dimensional_uom_id'].includes(name) ||
                name.includes('uom') || name.includes('weight') || name.includes('volume') || name.includes('dimension') ||
                label.includes('unit') || label.includes('measure') || label.includes('weight') || label.includes('volume')) {
                return 'units'
            }
            
            // ===== CATEGORIZATION =====
            if (['categ_id', 'category_id', 'product_category', 'type', 'detailed_type', 'product_type', 'sale_ok', 'purchase_ok', 'can_be_sold', 'can_be_purchased', 'tag_ids', 'product_tag_ids', 'attribute_line_ids', 'product_template_attribute_value_ids', 'attribute_value_ids'].includes(name) ||
                name.includes('categ') || name.includes('category') || name.includes('tag') || name.includes('attribute') ||
                label.includes('category') || label.includes('type') || label.includes('tag')) {
                return 'category'
            }
            
            // ===== RELATIONS (Partners, Companies, Users) =====
            if (['partner_id', 'customer_id', 'vendor_id', 'supplier_id', 'company_id', 'user_id', 'responsible_id', 'salesperson_id', 'buyer_id', 'seller_ids', 'message_partner_ids', 'picking_type_id', 'route_ids', 'route_id', 'rule_ids'].includes(name) ||
                name.endsWith('_partner_id') || name.endsWith('_user_id') || name.endsWith('_company_id') ||
                (type === 'many2one' && (name.includes('partner') || name.includes('company') || name.includes('user') || name.includes('responsible')))) {
                return 'relations'
            }
            
            // ===== DATES & SCHEDULING =====
            if (['date', 'date_order', 'date_planned', 'date_expected', 'date_deadline', 'scheduled_date', 'date_done', 'effective_date', 'date_start', 'date_end', 'validity_date', 'commitment_date', 'date_assign', 'date_closed'].includes(name) ||
                type === 'date' || type === 'datetime' ||
                name.includes('date') || name.includes('deadline') || name.includes('schedule') ||
                label.includes('date') || label.includes('deadline')) {
                return 'dates'
            }
            
            // ===== STATUS & STATE =====
            if (['state', 'status', 'stage_id', 'kanban_state', 'invoice_status', 'delivery_status', 'picking_state', 'production_state'].includes(name) ||
                name.includes('state') || name.includes('status') || name.includes('stage') ||
                label.includes('state') || label.includes('status')) {
                return 'status'
            }
            
            // ===== LOGISTICS & SHIPPING =====
            if (['carrier_id', 'delivery_carrier_id', 'shipping_id', 'incoterm_id', 'picking_ids', 'move_ids', 'move_line_ids', 'package_ids', 'weight_bulk', 'shipping_weight', 'carrier_tracking_ref', 'carrier_tracking_url'].includes(name) ||
                name.includes('carrier') || name.includes('shipping') || name.includes('delivery') || name.includes('picking') || name.includes('incoterm') ||
                label.includes('shipping') || label.includes('delivery') || label.includes('carrier')) {
                return 'logistics'
            }
            
            // ===== MANUFACTURING & PRODUCTION =====
            if (['bom_id', 'bom_ids', 'bom_line_ids', 'production_id', 'workorder_ids', 'workcenter_id', 'routing_id', 'operation_id', 'produce_delay', 'manufacturing_lead'].includes(name) ||
                name.includes('bom') || name.includes('production') || name.includes('manufacturing') || name.includes('workcenter') || name.includes('workorder') ||
                label.includes('manufacturing') || label.includes('production') || label.includes('bom')) {
                return 'manufacturing'
            }
            
            // ===== ACCOUNTING =====
            if (['account_id', 'income_account_id', 'expense_account_id', 'property_account_income_id', 'property_account_expense_id', 'journal_id', 'analytic_account_id', 'analytic_tag_ids'].includes(name) ||
                name.includes('account') || name.includes('journal') || name.includes('analytic') ||
                label.includes('account') || label.includes('journal')) {
                return 'accounting'
            }
            
            // ===== IMAGES & MEDIA =====
            if (['image', 'image_1920', 'image_1024', 'image_512', 'image_256', 'image_128', 'image_medium', 'image_small', 'product_image_ids', 'attachment_ids'].includes(name) ||
                name.includes('image') || name.includes('attachment') || name.includes('document') ||
                type === 'binary') {
                return 'media'
            }
            
            // ===== ONE2MANY / LINES =====
            if (type === 'one2many') {
                return 'lines'
            }
            
            // ===== SETTINGS / OPTIONS (Boolean fields) =====
            if (type === 'boolean') {
                return 'options'
            }
            
            // Default: Basic info for anything else
            return 'basic'
        }
        
        // Group labels and icons for better UI
        const groupMeta: Record<string, { label: string; priority: number }> = {
            'basic': { label: 'Basic Information', priority: 1 },
            'pricing': { label: 'Pricing & Costs', priority: 2 },
            'inventory': { label: 'Inventory', priority: 3 },
            'units': { label: 'Units & Measurements', priority: 4 },
            'category': { label: 'Categorization', priority: 5 },
            'relations': { label: 'Relations', priority: 6 },
            'dates': { label: 'Dates & Scheduling', priority: 7 },
            'status': { label: 'Status', priority: 8 },
            'logistics': { label: 'Logistics & Shipping', priority: 9 },
            'manufacturing': { label: 'Manufacturing', priority: 10 },
            'accounting': { label: 'Accounting', priority: 11 },
            'media': { label: 'Images & Media', priority: 12 },
            'lines': { label: 'Lines & Details', priority: 13 },
            'options': { label: 'Options & Settings', priority: 14 },
            'system': { label: 'System', priority: 99 },
        }

        main.forEach(f => {
            const g = getSmartGroup(f)
            if (!groupedMain[g]) groupedMain[g] = []
            groupedMain[g].push(f)
        })

        // Reorder fields inside each group so boolean fields appear at the end
        Object.keys(groupedMain).forEach(groupKey => {
            const groupFields = groupedMain[groupKey]
            const nonBoolean = groupFields.filter(f => f.type !== 'boolean')
            const booleans = groupFields.filter(f => f.type === 'boolean')
            groupedMain[groupKey] = [...nonBoolean, ...booleans]
        })

        // Sort groups using our smart groupMeta priorities
        const sortedGroupKeys = Object.keys(groupedMain).sort((a, b) => {
            // First check our smart groupMeta
            const metaA = groupMeta[a]
            const metaB = groupMeta[b]
            
            if (metaA && metaB) {
                return metaA.priority - metaB.priority
            }
            
            // Check if we have backend group metadata
            const backendGroupA = safeGroups.find(g => g.name === a)
            const backendGroupB = safeGroups.find(g => g.name === b)

            if (backendGroupA && backendGroupB) return (backendGroupA.priority || 0) - (backendGroupB.priority || 0)

            // If one has priority metadata and other doesn't
            if (metaA) return -1
            if (metaB) return 1
            if (backendGroupA) return -1
            if (backendGroupB) return 1

            return a.localeCompare(b)
        })

        // Filter out empty groups and groups with only 1 field (merge them into basic)
        // But keep important groups like 'lines', 'options', 'status'
        const importantGroups = ['basic', 'lines', 'options', 'status', 'system']
        const minFieldsForTab = 2 // Groups with less than 2 fields get merged
        
        // Collect small groups to merge into basic
        const smallGroups: string[] = []
        sortedGroupKeys.forEach(key => {
            if (!importantGroups.includes(key) && groupedMain[key].length < minFieldsForTab) {
                smallGroups.push(key)
            }
        })
        
        // Merge small groups into basic
        smallGroups.forEach(smallKey => {
            if (!groupedMain['basic']) groupedMain['basic'] = []
            groupedMain['basic'].push(...groupedMain[smallKey])
            delete groupedMain[smallKey]
        })
        
        // Re-sort after merging
        const finalGroupKeys = Object.keys(groupedMain).sort((a, b) => {
            const metaA = groupMeta[a]
            const metaB = groupMeta[b]
            if (metaA && metaB) return metaA.priority - metaB.priority
            if (metaA) return -1
            if (metaB) return 1
            return a.localeCompare(b)
        })

        const tabs = finalGroupKeys.map(key => {
            // Use our smart groupMeta labels, fallback to backend or formatted key
            const smartMeta = groupMeta[key]
            const backendMeta = safeGroups.find(g => g.name === key)
            return {
                id: key,
                label: smartMeta?.label || backendMeta?.string || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                count: groupedMain[key].length
            }
        })

        return {
            tabButtons: tabs,
            activeFields: groupedMain[activeTab] || (tabs.length > 0 ? groupedMain[tabs[0].id] : []),
            imageField: selectedImageField,
            detailFields: details,
            barcodeField: barcodeF,
            rfidField: rfidF
        }
    }, [fields, groups, activeTab, isCreating])

    // Fix active tab on load
    useEffect(() => {
        if (tabButtons.length > 0 && !tabButtons.find(t => t.id === activeTab)) {
            setActiveTab(tabButtons[0].id)
        }
    }, [tabButtons, activeTab])

    // Handlers
    const handleChange = (fieldName: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }))
        setDirty(true)
        if (errors[fieldName]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[fieldName]
                return newErrors
            })
        }
    }

    const handleSave = async () => {
        let hasError = false
        const newErrors: Record<string, string> = {}

        fields.forEach(f => {
            if (f.required && !f.readonly) {
                const val = formData[f.name]
                if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
                    newErrors[f.name] = t('Required')
                    hasError = true
                }
            }
        })

        if (hasError) {
            setErrors(newErrors)
            setToast({ text: t('Please fill all required fields'), state: 'error' })
            return
        }

        setSaving(true)
        try {
            const dataToSend: Record<string, any> = {}
            
            Object.entries(formData).forEach(([key, value]) => {
                const field = fields.find(f => f.name === key)
                
                // Skip if field not found or is readonly
                if (!field) return
                if (field.readonly) return
                
                // Format and add to payload
                if (field.type === 'many2one' || field.type === 'many2many' || field.type === 'one2many') {
                    dataToSend[key] = formatRelationField(field, value)
                } else {
                    dataToSend[key] = value
                }
            })

            // If workflow exists, start workflow instead of direct save
            if (workflowInfo) {
                const action = isCreating ? 'create' : 'update'
                const url = `${API_CONFIG.BACKEND_BASE_URL}/workflow/start-workflow-for-change`
                
                const payload: any = {
                    model: modelName,
                    action: action,
                    data: dataToSend,
                    workflowId: workflowInfo.id
                }
                
                if (!isCreating && recordId) {
                    payload.recordId = recordId
                    payload.originalData = originalData
                }
                
                if (uid) {
                    payload.userId = parseInt(uid)
                }

                const res = await fetch(url, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                })
                const result = await res.json()

                if (result.success) {
                    setToast({ text: t('Workflow started successfully'), state: 'success' })
                    setDirty(false)
                    // Navigate back after a short delay
                    setTimeout(() => {
                        navigate(backRoute || location.pathname.split('/').slice(0, -2).join('/') || '/')
                    }, 1500)
                } else {
                    setToast({ text: result.error || result.message || t('Failed to start workflow'), state: 'error' })
                }
            } else {
                // Normal save without workflow
                const url = isCreating
                    ? `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${modelName}`
                    : `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${modelName}/${recordId}`

                const res = await fetch(url, {
                    method: isCreating ? 'POST' : 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ data: dataToSend, validate: true })
                })
                const result = await res.json()

                if (result.success) {
                    setToast({ text: t('Saved successfully'), state: 'success' })
                    setDirty(false)
                    if (isCreating && result.id) {
                        navigate(`${backRoute || location.pathname.replace('/create', '')}/edit/${result.id}`, { replace: true })
                    } else {
                        fetchFormData()
                    }
                } else {
                    setToast({ text: result.error || t('Save failed'), state: 'error' })
                }
            }
        } catch (err) {
            console.error(err)
            setToast({ text: t('Save failed'), state: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            const base64 = result.split(',')[1]
            handleChange(fieldName, base64)
        }
        reader.readAsDataURL(file)
    }


    // -- RENDER HELPERS --

    const renderEditableField = (field: FieldConfig, index: number) => {
        const value = formData[field.name]
        const rawVal = rawRecord[field.name]
        const error = errors[field.name]

        // Calculate Col Span - use layout col_span if available, otherwise auto-detect
        let colSpan = field.col_span || 6 // Use layout value or default

        // If no layout col_span, auto-detect based on type
        if (!field.col_span) {
            if (field.type === 'one2many') {
                colSpan = 12 // One2many tables need full width
            } else if (['text', 'html'].includes(field.type) || field.widget === 'textarea') {
                colSpan = 12 // Text areas full width for better editing experience
            }
        }

        // Ensure within bounds
        colSpan = Math.max(3, Math.min(12, colSpan))

        // VIEW MODE: Render as read-only detail item (except one2many which handles readonly itself)
        if (isViewMode && field.type !== 'one2many') {
            let displayValue: React.ReactNode = '-'
            if (value !== null && value !== undefined && value !== false && value !== '') {
                if (field.type === 'boolean') {
                    displayValue = value ? <Check size={18} className="text-green-500" /> : <X size={18} className="text-red-500" />
                } else if (field.type === 'selection') {
                    displayValue = (field.options?.find(o => o.value === value)?.label) || value
                } else if (field.type === 'many2one') {
                    if (Array.isArray(rawVal) && rawVal.length > 1) {
                         displayValue = rawVal[1]
                    } else {
                         const found = (relationOptions[field.name] || []).find(o => o.id === value)
                         displayValue = found?.name || value
                    }
                } else if (field.type === 'many2many') {
                    if (Array.isArray(value)) {
                         const names = value.map((id: any) => {
                             const found = (relationOptions[field.name] || []).find(o => o.id === id)
                             return found?.name || id
                         })
                         displayValue = names.join(', ')
                    }
                } else if (field.type === 'datetime') {
                    displayValue = typeof value === 'string' ? value.replace('T', ' ').slice(0, 16) : String(value)
                } else {
                    displayValue = String(value)
                }
            }

            return (
                <div 
                    key={field.name} 
                    className={`premium-field-wrapper animate-enter`}
                    style={{ 
                        gridColumn: `span ${colSpan}`,
                        animationDelay: `${index * 50}ms`
                    }}
                >
                     <div className="premium-detail-item h-full">
                        <span className="premium-label" style={{ color: colors.textSecondary }}>
                            {field.label}
                        </span>
                        <div className="font-medium text-sm break-words pl-1" style={{ color: colors.textPrimary }}>
                            {displayValue}
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <div 
                key={field.name} 
                className={`premium-field-wrapper animate-enter ${error ? 'has-error' : ''}`}
                style={{ 
                    gridColumn: `span ${colSpan}`,
                    animationDelay: `${index * 50}ms`,
                    position: 'relative',
                    zIndex: 'auto'
                }}
            >
                {field.type === 'boolean' ? (
                    <div className="flex items-center h-full pt-1">
                        <IOSCheckbox
                            label={field.label}
                            checked={!!value}
                            onChange={(v) => handleChange(field.name, v)}
                        />
                    </div>
                ) : field.type === 'selection' ? (
                    <CustomDropdown
                        label={field.label}
                        values={(field.options || []).map(o => `${o.value}::${o.label}`)}
                        type="single"
                        defaultValue={value ? `${value}::${(field.options || []).find(o => o.value === value)?.label || value}` : undefined}
                        onChange={(v) => handleChange(field.name, typeof v === 'string' ? v.split('::')[0] : null)}
                    />
                ) : field.type === 'many2one' ? (
                    <CustomDropdown
                        label={field.label}
                        values={(relationOptions[field.name] || []).map(o => `${o.id}::${o.name}`)}
                        type="single"
                        defaultValue={
                            value
                                ? (typeof value === 'object' && value !== null ? `${value[0]}::${value[1]}` : `${value}::${(relationOptions[field.name] || []).find(o => o.id === value)?.name || value}`)
                                : undefined
                        }
                        onChange={(v) => handleChange(field.name, typeof v === 'string' ? parseInt(v.split('::')[0]) : null)}
                    />
                ) : field.type === 'many2many' ? (
                    <CustomDropdown
                        label={field.label}
                        values={(relationOptions[field.name] || []).map(o => `${o.id}::${o.name}`)}
                        type="multi"
                        defaultValue={Array.isArray(value) ? value.map((id: any) => {
                            const found = (relationOptions[field.name] || []).find(o => o.id === id)
                            return `${id}::${found?.name || id}`
                        }) : []}
                        onChange={(v) => {
                            const ids = Array.isArray(v) ? v.map(val => parseInt(val.split('::')[0])) : []
                            handleChange(field.name, ids)
                        }}
                    />
                ) : field.type === 'date' || field.type === 'datetime' ? (
                    <PremiumDatePicker
                        label={field.label}
                        value={value || ''}
                        onChange={(d) => handleChange(field.name, d)}
                        picker={field.type === 'datetime' ? 'date' : 'date'} // Antd datepicker handles time via showTime prop but for now we default to date or we can enhance PremiumDatePicker
                        isDateTime={field.type === 'datetime'}
                    />
                ) : field.type === 'one2many' && field.relation?.model ? (
                    <LinesEditor
                        parentModel={modelName}
                        fieldName={field.name}
                        relationModel={field.relation.model}
                        relationField={field.relation.field}
                        parentId={recordId}
                        value={Array.isArray(value) ? value : []}
                        onChange={(lineIds) => handleChange(field.name, lineIds)}
                        readonly={field.readonly || isViewMode}
                        label={field.label}
                    />
                ) : field.type === 'text' || field.type === 'html' ? (
                    <div className="flex flex-col gap-1.5 h-full">
                        <label 
                            style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: colors.textPrimary,
                                marginBottom: "0.5rem",
                            }}
                        >
                            {field.label}
                        </label>
                        <textarea
                            className="premium-input min-h-[120px]"
                            rows={4}
                            value={value || ''}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            style={{
                                color: colors.textPrimary
                            }}
                        />
                    </div>
                ) : (
                    <CustomInput
                        label={field.label}
                        type={field.type === 'integer' || field.type === 'float' || field.type === 'monetary' ? 'number' : 'text'}
                        value={value || ''}
                        onChange={(v) => handleChange(field.name, field.type === 'integer' ? parseInt(v) : field.type === 'float' ? parseFloat(v) : v)}
                    />
                )}
            </div>
        )
    }

    const renderDetailItem = (field: FieldConfig, index: number) => {
        const val = formData[field.name]
        const rawVal = rawRecord[field.name]

        // Smart check for empty values to hide them
        if (val === null || val === undefined || val === '' || val === false) return null
        if (Array.isArray(val) && val.length === 0) return null
        if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return null

        let displayValue: React.ReactNode = '-'


        if (val !== null && val !== undefined && val !== false && val !== '') {
            if (field.type === 'boolean') {
                displayValue = val ? <Check size={18} className="text-green-500" /> : <X size={18} className="text-red-500" />
            } else if (field.type === 'selection') {
                displayValue = (field.options?.find(o => o.value === val)?.label) || val
            } else if (field.type === 'many2one') {
                // Try to get name from rawRecord [id, name]
                if (Array.isArray(rawVal) && rawVal.length > 1) {
                    displayValue = rawVal[1]
                } else {
                    // Fallback to finding in options or just ID
                    const found = (relationOptions[field.name] || []).find(o => o.id === val)
                    displayValue = found?.name || val
                }
            } else if (field.type === 'datetime') {
                displayValue = typeof val === 'string' ? val.replace('T', ' ').slice(0, 16) : String(val)
            } else {
                displayValue = String(val)
            }
        }

        return (
            <div 
                key={field.name} 
                className="premium-detail-item animate-enter-side mb-2"
                style={{ animationDelay: `${index * 50}ms` }}
            >
                <span className="premium-label" style={{ color: colors.textSecondary }}>
                    {field.label}
                </span>
                <div className="font-medium text-sm break-words pl-1" style={{ color: colors.textPrimary }}>
                    {displayValue}
                </div>
            </div>
        )
    }

    if (loading && !fields.length) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        )
    }

    return (
        <div className="dynamic-record-page font-sans overflow-hidden flex" style={{ backgroundColor: colors.background }}>
            <style>{`
                .premium-scroll::-webkit-scrollbar { width: 4px; }
                .premium-scroll::-webkit-scrollbar-track { background: transparent; }
                .premium-scroll::-webkit-scrollbar-thumb { 
                    background: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.2)'}; 
                    border-radius: 10px; 
                }
            `}</style>

            {/* LEFT SIDEBAR - NAVIGATION */}
            <div className="w-64 flex-none premium-sidebar flex flex-col" style={{ borderColor: colors.border }}>
                {/* Back / Title Header */}
                <div className="h-16 flex items-center gap-3 px-4 border-b flex-none" style={{ borderColor: colors.border }}>
                    <button
                        onClick={() => navigate(backRoute || -1 as any)}
                        className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        style={{ color: colors.textSecondary }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="leading-tight overflow-hidden">
                        <h2 className="font-bold truncate text-sm" style={{ color: colors.textPrimary }}>{pageTitle || modelName}</h2>
                        <div className="text-xs opacity-60 truncate" style={{ color: colors.textSecondary }}>
                            {isCreating ? t("New Record") : `#${recordId}`}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex-1 overflow-y-auto premium-scroll p-4 space-y-1">
                    <div className="text-xs font-bold uppercase tracking-widest px-2 mb-3 mt-2 opacity-50" style={{ color: colors.textSecondary }}>
                        {t("Sections")}
                    </div>
                    {tabButtons.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group relative overflow-hidden"
                            style={{
                                backgroundColor: activeTab === tab.id ? (isDark ? 'rgba(255,255,255,0.05)' : colors.mutedBg) : 'transparent',
                                color: activeTab === tab.id ? colors.textPrimary : colors.textSecondary
                            }}
                        >
                            <span className="font-medium text-sm relative z-10">{tab.label}</span>
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                                    style={{ backgroundColor: colors.action }}
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* CENTER - FORM AREA */}
            <div className="premium-content-area relative">
                {/* Top Bar */}
                <div className="premium-header">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 opacity-50">
                            <Layers size={18} />
                            <span className="font-medium text-sm uppercase tracking-wider">
                                {tabButtons.find(t => t.id === activeTab)?.label}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {dirty && (
                            <span className="text-xs font-bold text-amber-500 animate-pulse mr-2 uppercase tracking-wider">
                                {t("Unsaved Changes")}
                            </span>
                        )}
                        <NewCustomButton
                            onClick={() => navigate(backRoute || -1 as any)}
                            label={isViewMode ? t("Back") : t("Cancel")}
                            backgroundColor="transparent"
                            textColor={colors.textSecondary}
                        />
                        {!isViewMode && (
                            <NewCustomButton
                                onClick={handleSave}
                                disabled={saving || checkingWorkflow}
                                icon={saving ? Loader2 : Save}
                                label={
                                    saving 
                                        ? (workflowInfo ? t("Starting workflow...") : t("Saving..."))
                                        : (workflowInfo 
                                            ? t("Start workflow")
                                            : (isCreating ? t("Create") : t("Save")))
                                }
                                backgroundColor={colors.action}
                            />
                        )}
                    </div>
                </div>

                {/* Form Grid */}
                <div className="premium-form-container">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="premium-card"
                    >
                        {/* Grid layout for fields */}
                        <div className="fields-grid">
                            {activeFields.length > 0 ? (
                                activeFields.map((field, index) => renderEditableField(field, index))
                            ) : (
                                <div className="col-span-12 py-20 text-center opacity-50 flex flex-col items-center gap-3">
                                    <Box size={40} strokeWidth={1} />
                                    <span>{t("No editable fields in this section")}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* RIGHT SIDEBAR - DETAILS & IMAGE */}
            <div className="w-80 flex-none premium-sidebar flex flex-col border-l-0" style={{ borderColor: colors.border }}>
                <div className="flex-1 overflow-y-auto premium-scroll p-5 space-y-6">

                    {/* Image Section */}
                    {imageField && (
                        <div className="text-center space-y-3">
                            <div
                                onClick={() => !imageField.readonly && fileInputRef.current?.click()}
                                className={`relative group w-48 h-48 mx-auto rounded-2xl overflow-hidden border-2 border-dashed flex items-center justify-center transition-all ${!imageField.readonly ? 'cursor-pointer hover:border-blue-500' : ''}`}
                                style={{ borderColor: colors.border, backgroundColor: colors.card }}
                            >
                                {formData[imageField.name] ? (
                                    <>
                                        <img
                                            src={`data:image/png;base64,${formData[imageField.name]}`}
                                            className="w-full h-full object-contain p-2"
                                        />
                                        {!imageField.readonly && (
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-medium text-sm gap-2">
                                                <Upload size={16} /> Change
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 opacity-50 p-4">
                                        <ImageIcon size={32} />
                                        <span className="text-xs font-medium text-center">{t("Upload Image")}</span>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => onFileChange(e, imageField.name)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Barcode / RFID Highlight */}
                    {(barcodeField || rfidField) && (
                        <div className="grid grid-cols-1 gap-3">
                            {barcodeField && formData[barcodeField.name] && (
                                <div className="p-3 rounded-xl border bg-white flex flex-col items-center gap-2" style={{ borderColor: colors.border }}>
                                    <div className="text-xs uppercase font-bold text-gray-400 flex items-center gap-1 w-full">
                                        <Scan size={14} /> Barcode
                                    </div>
                                    <div className="flex justify-center items-center w-full">
                                        <Barcode
                                            value={String(formData[barcodeField.name])}
                                            format="CODE128"
                                            width={1}
                                            height={40}
                                            displayValue={true}
                                            fontSize={12}
                                        />
                                    </div>
                                    <div className="text-xs font-mono">{formData[barcodeField.name]}</div>
                                </div>
                            )}
                            {rfidField && formData[rfidField.name] && (
                                <div 
                                    className="p-4 rounded-xl border relative overflow-hidden" 
                                    style={{ 
                                        borderColor: colors.border, 
                                        backgroundColor: colors.card,
                                        backgroundImage: `radial-gradient(circle at 2px 2px, ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'} 1px, transparent 0)`,
                                        backgroundSize: '10px 10px',
                                    }}
                                >
                                    <div className="relative flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span
                                                className="text-[9px] uppercase font-bold tracking-widest mb-0.5 flex items-center gap-1"
                                                style={{ color: colors.textSecondary }}
                                            >
                                                <Radio size={10} style={{ color: colors.textSecondary }} /> RFID TAG
                                            </span>
                                            <span
                                                className="font-mono text-sm font-semibold tracking-wider"
                                                style={{ color: colors.textPrimary }}
                                            >
                                                {formData[rfidField.name]}
                                            </span>
                                        </div>

                                        {/* Chip Visual */}
                                        <div
                                            className="w-8 h-6 rounded border flex items-center justify-center relative"
                                            style={{
                                                borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.3)',
                                                backgroundColor: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.15)'
                                            }}
                                        >
                                            <div className="w-full h-[1px] bg-amber-500/40 absolute top-1/3"></div>
                                            <div className="w-full h-[1px] bg-amber-500/40 absolute top-2/3"></div>
                                            <div className="h-full w-[1px] bg-amber-500/40 absolute left-1/3"></div>
                                            <div className="h-full w-[1px] bg-amber-500/40 absolute left-2/3"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Readonly Details */}
                    {detailFields.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: colors.border }}>
                                <Info size={16} style={{ color: colors.textSecondary }} />
                                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>{t("Details & Info")}</h3>
                            </div>
                            <div className="space-y-1">
                                {detailFields.map((f, i) => renderDetailItem(f, i))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </div>
    )
}
