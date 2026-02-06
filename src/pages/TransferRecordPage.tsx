"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import { API_CONFIG } from "../config/api"
import Toast from "../components/Toast"
import {
    ArrowLeft,
    Loader2,
    Package,
    Truck,
    Calendar,
    User,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Play,
    RotateCcw,
    Printer,
    Zap,
    ChevronDown,
    ChevronUp,
    Plus,
    Minus,
    Check,
    RefreshCw,
    Ban,
    ArrowRight,
    Box,
    MapPin,
    Trash2,
    Save,
    Search,
    X,
    Download
} from "lucide-react"
import { Autocomplete, TextField, createTheme, ThemeProvider } from "@mui/material"
import "./TransferRecordPage.css"
import pdfIcon from "../assets/pdf.png"

// Status configuration
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: any }> = {
    draft: {
        bg: 'rgba(113, 128, 150, 0.12)',
        text: '#64748b',
        label: 'Draft',
        icon: FileText
    },
    waiting: {
        bg: 'rgba(245, 158, 11, 0.12)',
        text: '#d97706',
        label: 'Waiting',
        icon: Clock
    },
    confirmed: {
        bg: 'rgba(59, 130, 246, 0.12)',
        text: '#2563eb',
        label: 'Waiting Availability',
        icon: AlertTriangle
    },
    assigned: {
        bg: 'rgba(34, 197, 94, 0.12)',
        text: '#16a34a',
        label: 'Ready',
        icon: CheckCircle2
    },
    done: {
        bg: 'rgba(16, 185, 129, 0.15)',
        text: '#059669',
        label: 'Done',
        icon: Check
    },
    cancel: {
        bg: 'rgba(239, 68, 68, 0.12)',
        text: '#dc2626',
        label: 'Cancelled',
        icon: XCircle
    }
}

interface TransferData {
    id: number
    name: string
    state: string
    partner_id: [number, string] | false
    scheduled_date: string | false
    date_done: string | false
    location_id: [number, string] | false
    location_dest_id: [number, string] | false
    picking_type_id: [number, string] | false
    picking_type_code?: string
    origin: string | false
    carrier_id: [number, string] | false
    carrier_tracking_ref: string | false
    weight: number
    shipping_weight: number
    note: string | false
    move_ids: number[]
    move_line_ids: number[]
    backorder_id: [number, string] | false
    return_id: [number, string] | false
    user_id: [number, string] | false
    printed: boolean
    company_id: [number, string] | false
}

interface MoveData {
    id: number
    product_id: [number, string]
    product_uom_qty: number
    quantity: number
    product_uom: [number, string] | false
    state: string
    picked: boolean
    product_image?: string | false
    isNew?: boolean
    isModified?: boolean
    has_tracking?: 'serial' | 'lot' | 'none'
    move_line_ids?: number[]
}

interface MoveLineData {
    id: number
    move_id: [number, string] | number
    product_id: [number, string]
    product_uom_id: [number, string] | false
    quantity: number
    lot_id: [number, string] | false
    lot_name: string | false
    tracking: 'serial' | 'lot' | 'none'
    location_id: [number, string] | false
    location_dest_id: [number, string] | false
    isNew?: boolean
    isModified?: boolean
}

interface LotOption {
    id: number
    name: string
    product_qty?: number
    available_qty?: number
    location_id?: number
    location_name?: string
}

interface ProductOption {
    id: number
    name: string
    display_name?: string
    default_code?: string
    uom_id?: [number, string]
    product_tmpl_id?: [number, string]
}

interface TransferRecordPageProps {
    transferType: 'incoming' | 'outgoing' | 'internal'
    pageTitle?: string
    backRoute?: string
    recordId?: number | null
    isSidebar?: boolean
    onClose?: () => void
    onDataChange?: () => void
}

export function TransferRecordPage({
    transferType,
    pageTitle,
    backRoute,
    recordId: propRecordId,
    isSidebar = false,
    onClose,
    onDataChange
}: TransferRecordPageProps) {
    const { t, i18n } = useTranslation()
    const { colors, mode } = useTheme()
    const { sessionId, uid } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const { id } = useParams<{ id: string }>()

    const isDark = mode === 'dark'
    const recordId = propRecordId ?? (id ? parseInt(id) : null)
    const isViewMode = location.pathname.includes('/view/')
    const isCreating = !recordId

    // State
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [transferData, setTransferData] = useState<TransferData | null>(null)
    const [moves, setMoves] = useState<MoveData[]>([])
    const [moveLines, setMoveLines] = useState<MoveLineData[]>([])
    const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
    const [executingAction, setExecutingAction] = useState<string | null>(null)
    const [linesExpanded, setLinesExpanded] = useState(true)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    // Lot/Serial tracking state
    const [expandedMoveId, setExpandedMoveId] = useState<number | null>(null)
    const [lotOptions, setLotOptions] = useState<Record<number, LotOption[]>>({}) // productId -> lots
    const [lotSearchLoading, setLotSearchLoading] = useState(false)
    const [newLotName, setNewLotName] = useState('')
    const [selectedLotId, setSelectedLotId] = useState<number | null>(null)
    const [selectedLotQty, setSelectedLotQty] = useState<number>(1)

    // Generate Serials modal state
    const [generateSerialsModalOpen, setGenerateSerialsModalOpen] = useState(false)
    const [generateSerialsForMoveId, setGenerateSerialsForMoveId] = useState<number | null>(null)
    const [firstSerialNumber, setFirstSerialNumber] = useState('')
    const [numberOfSerials, setNumberOfSerials] = useState(1)
    const [keepCurrentLines, setKeepCurrentLines] = useState(false)

    // Inline add line state
    const [isAddingLine, setIsAddingLine] = useState(false)
    const [newLineProductId, setNewLineProductId] = useState<number | null>(null)
    const [newLineProductName, setNewLineProductName] = useState('')
    const [newLineQuantity, setNewLineQuantity] = useState(1)
    const [newLineUomId, setNewLineUomId] = useState<number | null>(null)
    const [newLineUomName, setNewLineUomName] = useState('')

    // Product search state
    const [productSearchQuery, setProductSearchQuery] = useState('')
    const [productSearchResults, setProductSearchResults] = useState<ProductOption[]>([])
    const [productSearchLoading, setProductSearchLoading] = useState(false)
    const [showProductDropdown, setShowProductDropdown] = useState(false)
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)
    const productSearchRef = useRef<HTMLDivElement>(null)
    const productInputRef = useRef<HTMLInputElement>(null)

    // Product images cache
    const [productImages, setProductImages] = useState<Record<number, string>>({})

    // Existing reports state
    const [existingReportId, setExistingReportId] = useState<number | null>(null)
    const [existingReports, setExistingReports] = useState<any[]>([])

    // Creation mode state
    const [pickingTypeId, setPickingTypeId] = useState<number | null>(null)
    const [pickingTypes, setPickingTypes] = useState<Array<{ id: number; name: string; code: string; default_location_src_id: any; default_location_dest_id: any }>>([])
    const [locationOptions, setLocationOptions] = useState<Array<{ id: number; name: string }>>([])
    const [partnerOptions, setPartnerOptions] = useState<Array<{ id: number; name: string }>>([])
    const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)
    const [selectedLocationDestId, setSelectedLocationDestId] = useState<number | null>(null)
    const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null)
    const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().slice(0, 16))
    const [creatingRecord, setCreatingRecord] = useState(false)

    // Get tenant ID
    const getTenantId = () => localStorage.getItem('current_tenant_id')

    // Get headers - include both session headers for compatibility
    const getHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        const tenantId = getTenantId()
        if (tenantId) headers['X-Tenant-ID'] = tenantId
        if (sessionId) {
            headers['X-Odoo-Session'] = sessionId
            headers['x-session-id'] = sessionId  // For reports API
        }
        if (uid) headers['x-user-id'] = uid
        const odooBase = localStorage.getItem('odooBase')
        const odooDb = localStorage.getItem('odooDb')
        if (odooBase) headers['x-odoo-base'] = odooBase
        if (odooDb) headers['x-odoo-db'] = odooDb
        return headers
    }, [sessionId, uid])

    // Check if editing is allowed based on state
    const canEditQuantities = (state: string) => {
        return state === 'assigned'
    }

    const canEditDemand = (state: string) => {
        return ['draft', 'confirmed', 'waiting', 'assigned'].includes(state)
    }

    const canAddLines = (state: string) => {
        // Can't add lines when creating - need to create the picking first
        if (isCreating) return false
        return ['draft', 'confirmed', 'waiting', 'assigned'].includes(state)
    }

    // Check if lot/serial assignment is allowed - for receipts in 'assigned' state
    const canAssignLots = (state: string) => {
        // Can assign lots when picking is in assigned (Ready) state
        // This is when Odoo shows the "Detailed Operations" dialog
        return state === 'assigned'
    }

    // Fetch product images from product.template with cascade fallback
    const fetchProductImages = useCallback(async (productIds: number[]) => {
        if (!sessionId || productIds.length === 0) return

        try {
            // Use execute endpoint to get product_tmpl_id from product.product
            const executeUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/product.product/execute`
            const productsRes = await fetch(executeUrl, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'search_read',
                    args: [[['id', 'in', productIds]]],
                    kwargs: { fields: ['id', 'product_tmpl_id'], limit: 1000 }
                })
            })
            const productsData = await productsRes.json()

            if (!productsData.success || !productsData.result) return

            // Get unique template IDs
            const templateIds = [...new Set(productsData.result
                .map((p: any) => p.product_tmpl_id?.[0])
                .filter(Boolean))] as number[]

            if (templateIds.length === 0) return

            // Fetch images from product.template with cascade fallback
            const templatesUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/product.template/execute`
            const templatesRes = await fetch(templatesUrl, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'search_read',
                    args: [[['id', 'in', templateIds]]],
                    kwargs: {
                        fields: ['id', 'image_1920', 'image_1024', 'image_512', 'image_256', 'image_128'],
                        limit: 1000
                    }
                })
            })
            const templatesData = await templatesRes.json()

            if (!templatesData.success || !templatesData.result) return

            // Create mapping: template_id -> image (with cascade fallback)
            const templateImages: Record<number, string> = {}
            templatesData.result.forEach((t: any) => {
                // Cascade: try larger images first, fall back to smaller
                const image = t.image_1920 || t.image_1024 || t.image_512 || t.image_256 || t.image_128
                if (image) {
                    templateImages[t.id] = image
                }
            })

            // Create mapping: product_id -> image
            const newProductImages: Record<number, string> = {}
            productsData.result.forEach((p: any) => {
                const tmplId = p.product_tmpl_id?.[0]
                if (tmplId && templateImages[tmplId]) {
                    newProductImages[p.id] = templateImages[tmplId]
                }
            })

            setProductImages(prev => ({ ...prev, ...newProductImages }))
        } catch (error) {
            console.error('Error fetching product images:', error)
        }
    }, [sessionId, getHeaders])

    // Fetch transfer data using execute endpoint
    const fetchTransferData = useCallback(async () => {
        if (!sessionId || !recordId) return
        setLoading(true)

        try {
            // Fetch picking data using execute endpoint
            const executeUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking/execute`
            const pickingRes = await fetch(executeUrl, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'search_read',
                    args: [[['id', '=', recordId]]],
                    kwargs: {
                        fields: [
                            'id', 'name', 'state', 'partner_id', 'scheduled_date', 'date_done',
                            'location_id', 'location_dest_id', 'picking_type_id', 'origin',
                            'carrier_id', 'carrier_tracking_ref', 'weight', 'shipping_weight',
                            'note', 'move_ids', 'move_line_ids', 'backorder_id', 'return_id',
                            'user_id', 'printed', 'company_id'
                        ],
                        limit: 1
                    }
                })
            })
            const pickingData = await pickingRes.json()

            if (pickingData.success && pickingData.result && pickingData.result.length > 0) {
                setTransferData(pickingData.result[0])

                // Fetch moves using execute endpoint (include has_tracking and move_line_ids)
                const movesUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.move/execute`
                const movesRes = await fetch(movesUrl, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        method: 'search_read',
                        args: [[['picking_id', '=', recordId]]],
                        kwargs: {
                            fields: ['id', 'product_id', 'product_uom_qty', 'quantity', 'product_uom', 'state', 'picked', 'has_tracking', 'move_line_ids'],
                            limit: 1000
                        }
                    })
                })
                const movesData = await movesRes.json()

                if (movesData.success && movesData.result) {
                    setMoves(movesData.result)
                    // Fetch images for all products
                    const productIds = movesData.result.map((m: any) => m.product_id[0])
                    if (productIds.length > 0) {
                        fetchProductImages(productIds)
                    }

                    // Fetch move lines for tracked products
                    const allMoveLineIds = movesData.result.flatMap((m: any) => m.move_line_ids || [])
                    if (allMoveLineIds.length > 0) {
                        const moveLinesUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.move.line/execute`
                        const moveLinesRes = await fetch(moveLinesUrl, {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify({
                                method: 'search_read',
                                args: [[['id', 'in', allMoveLineIds]]],
                                kwargs: {
                                    fields: ['id', 'move_id', 'product_id', 'product_uom_id', 'quantity', 'lot_id', 'lot_name', 'tracking', 'location_id', 'location_dest_id'],
                                    limit: 1000
                                }
                            })
                        })
                        const moveLinesData = await moveLinesRes.json()
                        if (moveLinesData.success && moveLinesData.result) {
                            setMoveLines(moveLinesData.result)
                        }
                    } else {
                        setMoveLines([])
                    }
                } else {
                    setMoves([])
                    setMoveLines([])
                }
            } else {
                setToast({ text: t('Failed to load transfer data'), state: 'error' })
            }
        } catch (error) {
            console.error('Error fetching transfer:', error)
            setToast({ text: t('Failed to load transfer data'), state: 'error' })
        } finally {
            setLoading(false)
        }
    }, [sessionId, recordId, getHeaders, t, fetchProductImages])

    useEffect(() => {
        if (recordId) {
            fetchTransferData()
        } else {
            setLoading(false)
        }
    }, [fetchTransferData, recordId])

    // Fetch options for creation mode
    const fetchCreationOptions = useCallback(async () => {
        if (!sessionId || !isCreating) return

        try {
            // Map transfer type to picking type code
            const codeMap: Record<string, string> = {
                'incoming': 'incoming',
                'outgoing': 'outgoing',
                'internal': 'internal'
            }
            const pickingCode = codeMap[transferType] || 'incoming'

            // Fetch picking types
            const pickingTypesRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking.type/execute`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'search_read',
                    args: [[['code', '=', pickingCode]]],
                    kwargs: {
                        fields: ['id', 'name', 'code', 'default_location_src_id', 'default_location_dest_id'],
                        limit: 100
                    }
                })
            })
            const pickingTypesData = await pickingTypesRes.json()
            if (pickingTypesData.success && pickingTypesData.result) {
                setPickingTypes(pickingTypesData.result)
                // Auto-select first picking type
                if (pickingTypesData.result.length > 0) {
                    const firstType = pickingTypesData.result[0]
                    setPickingTypeId(firstType.id)
                    if (firstType.default_location_src_id) {
                        setSelectedLocationId(firstType.default_location_src_id[0])
                    }
                    if (firstType.default_location_dest_id) {
                        setSelectedLocationDestId(firstType.default_location_dest_id[0])
                    }
                }
            }

            // Fetch locations
            const locationsRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.location/execute`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'search_read',
                    args: [[['usage', 'in', ['internal', 'transit', 'customer', 'supplier']]]],
                    kwargs: {
                        fields: ['id', 'display_name'],
                        limit: 500
                    }
                })
            })
            const locationsData = await locationsRes.json()
            if (locationsData.success && locationsData.result) {
                setLocationOptions(locationsData.result.map((l: any) => ({ id: l.id, name: l.display_name })))
            }

            // Fetch partners
            const partnersRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/res.partner/execute`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'search_read',
                    args: [[]],
                    kwargs: {
                        fields: ['id', 'display_name'],
                        limit: 200
                    }
                })
            })
            const partnersData = await partnersRes.json()
            if (partnersData.success && partnersData.result) {
                setPartnerOptions(partnersData.result.map((p: any) => ({ id: p.id, name: p.display_name })))
            }
        } catch (error) {
            console.error('Error fetching creation options:', error)
        }
    }, [sessionId, isCreating, transferType, getHeaders])

    useEffect(() => {
        if (isCreating) {
            fetchCreationOptions()
        }
    }, [isCreating, fetchCreationOptions])

    // Create new transfer
    const handleCreateTransfer = useCallback(async () => {
        if (!sessionId || !pickingTypeId) {
            setToast({ text: t('Please select a picking type'), state: 'error' })
            return
        }

        setCreatingRecord(true)
        try {
            const createData: Record<string, any> = {
                picking_type_id: pickingTypeId,
                scheduled_date: scheduledDate ? scheduledDate.replace('T', ' ') : scheduledDate,
            }

            if (selectedLocationId) createData.location_id = selectedLocationId
            if (selectedLocationDestId) createData.location_dest_id = selectedLocationDestId
            if (selectedPartnerId) createData.partner_id = selectedPartnerId

            // Add move lines if any
            if (moves.length > 0) {
                createData.move_ids_without_package = moves.map(move => [0, 0, {
                    product_id: move.product_id[0],
                    product_uom_qty: move.product_uom_qty,
                    product_uom: move.product_uom[0],
                    name: move.product_id[1],
                    location_id: selectedLocationId,
                    location_dest_id: selectedLocationDestId,
                }])
            }

            const createRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking/execute`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'create',
                    args: [createData],
                    kwargs: {}
                })
            })
            const createResult = await createRes.json()

            if (createResult.success && createResult.result) {
                const newId = createResult.result
                setToast({ text: t('Transfer created successfully'), state: 'success' })
                // Notify parent to refresh data
                if (onDataChange) onDataChange()
                // Navigate to edit the new record
                setTimeout(() => {
                    navigate(`${backRoute}/edit/${newId}`)
                }, 500)
            } else {
                setToast({ text: createResult.error || t('Failed to create transfer'), state: 'error' })
            }
        } catch (error) {
            console.error('Error creating transfer:', error)
            setToast({ text: t('Failed to create transfer'), state: 'error' })
        } finally {
            setCreatingRecord(false)
        }
    }, [sessionId, pickingTypeId, scheduledDate, selectedLocationId, selectedLocationDestId, selectedPartnerId, moves, getHeaders, t, navigate, backRoute, onDataChange])

    // Search products using execute endpoint
    const searchProducts = useCallback(async (query: string) => {
        if (!sessionId) return
        setProductSearchLoading(true)

        try {
            const domain = query && query.trim().length > 0
                ? ['|', ['name', 'ilike', query], ['default_code', 'ilike', query]]
                : []

            const executeUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/product.product/execute`
            const res = await fetch(executeUrl, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'search_read',
                    args: [domain],
                    kwargs: {
                        fields: ['id', 'name', 'display_name', 'default_code', 'uom_id', 'product_tmpl_id'],
                        limit: 30
                    }
                })
            })
            const data = await res.json()

            if (data.success && data.result) {
                setProductSearchResults(data.result)
                // Fetch images for search results to show in dropdown
                const productIds = data.result.map((p: any) => p.id)
                if (productIds.length > 0) {
                    fetchProductImages(productIds)
                }
            } else {
                setProductSearchResults([])
            }
        } catch (error) {
            console.error('Error searching products:', error)
            setProductSearchResults([])
        } finally {
            setProductSearchLoading(false)
        }
    }, [sessionId, getHeaders, fetchProductImages])

    // Search lots by product ID (for deliveries/outgoing - select existing lots with available qty)
    // For outgoing/internal: queries stock.quant to get lots with available inventory in source location
    // For incoming: queries stock.lot directly (any lot for the product)
    const searchLotsByProduct = useCallback(async (productId: number, sourceLocationId?: number) => {
        if (!sessionId || !productId) return

        setLotSearchLoading(true)
        try {
            // For outgoing/internal transfers: query stock.quant to get available lots in source location
            if (sourceLocationId && (transferType === 'outgoing' || transferType === 'internal')) {
                const executeUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.quant/execute`
                const res = await fetch(executeUrl, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        method: 'search_read',
                        args: [[
                            ['product_id', '=', productId],
                            ['lot_id', '!=', false],
                            ['quantity', '>', 0],
                            // Filter by source location or child locations
                            '|',
                            ['location_id', '=', sourceLocationId],
                            ['location_id', 'child_of', sourceLocationId]
                        ]],
                        kwargs: {
                            fields: ['lot_id', 'quantity', 'reserved_quantity', 'available_quantity', 'location_id'],
                            limit: 200
                        }
                    })
                })
                const data = await res.json()

                if (data.success && data.result) {
                    // Group by lot_id and sum available quantities
                    const lotMap: Record<number, LotOption> = {}
                    data.result.forEach((quant: any) => {
                        if (!quant.lot_id) return
                        const lotId = quant.lot_id[0]
                        const lotName = quant.lot_id[1]
                        const availableQty = quant.available_quantity || (quant.quantity - (quant.reserved_quantity || 0))

                        if (availableQty <= 0) return // Skip if no available qty

                        if (lotMap[lotId]) {
                            // Add to existing lot's available qty
                            lotMap[lotId].available_qty = (lotMap[lotId].available_qty || 0) + availableQty
                        } else {
                            lotMap[lotId] = {
                                id: lotId,
                                name: lotName,
                                available_qty: availableQty,
                                location_id: quant.location_id?.[0],
                                location_name: quant.location_id?.[1]
                            }
                        }
                    })

                    // Convert to array and sort by name
                    const lots = Object.values(lotMap).sort((a, b) => a.name.localeCompare(b.name))
                    setLotOptions(prev => ({
                        ...prev,
                        [productId]: lots
                    }))
                }
            } else {
                // For incoming (receipts): query stock.lot directly
                const executeUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.lot/execute`
                const res = await fetch(executeUrl, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        method: 'search_read',
                        args: [[['product_id', '=', productId]]],
                        kwargs: {
                            fields: ['id', 'name', 'product_qty'],
                            limit: 100
                        }
                    })
                })
                const data = await res.json()

                if (data.success && data.result) {
                    setLotOptions(prev => ({
                        ...prev,
                        [productId]: data.result.map((lot: any) => ({
                            id: lot.id,
                            name: lot.name,
                            product_qty: lot.product_qty
                        }))
                    }))
                }
            }
        } catch (error) {
            console.error('Error searching lots:', error)
        } finally {
            setLotSearchLoading(false)
        }
    }, [sessionId, getHeaders, transferType])

    // Create new lot (for receipts/incoming)
    const createNewLot = useCallback(async (productId: number, lotName: string): Promise<number | null> => {
        if (!sessionId || !productId || !lotName.trim()) return null

        try {
            const executeUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.lot/execute`
            const res = await fetch(executeUrl, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'create',
                    args: [[{
                        name: lotName.trim(),
                        product_id: productId,
                    }]],
                    kwargs: {}
                })
            })
            const data = await res.json()

            if (data.success && data.result) {
                const newLotId = Array.isArray(data.result) ? data.result[0] : data.result
                // Add to lot options
                setLotOptions(prev => ({
                    ...prev,
                    [productId]: [...(prev[productId] || []), { id: newLotId, name: lotName.trim() }]
                }))
                return newLotId
            }
            return null
        } catch (error) {
            console.error('Error creating lot:', error)
            return null
        }
    }, [sessionId, getHeaders])

    // Generate serial numbers automatically based on pattern
    const handleGenerateSerials = useCallback(() => {
        if (!generateSerialsForMoveId || !firstSerialNumber.trim()) return

        const move = moves.find(m => m.id === generateSerialsForMoveId)
        if (!move) return

        // Parse the first serial number to extract prefix and number
        const match = firstSerialNumber.match(/^(.*?)(\d+)$/)
        let prefix = ''
        let startNum = 1
        let numDigits = 1

        if (match) {
            prefix = match[1]
            startNum = parseInt(match[2], 10)
            numDigits = match[2].length
        } else {
            // If no number pattern found, use the whole string as prefix
            prefix = firstSerialNumber.trim()
            startNum = 1
            numDigits = 4
        }

        // Generate the serial numbers
        const newLines: MoveLineData[] = []
        const count = Math.min(numberOfSerials, Math.ceil(move.product_uom_qty)) // Don't generate more than demand

        for (let i = 0; i < count; i++) {
            const serialNum = (startNum + i).toString().padStart(numDigits, '0')
            const lotName = `${prefix}${serialNum}`

            newLines.push({
                id: -(Date.now() + i),
                move_id: move.id,
                product_id: move.product_id,
                product_uom_id: move.product_uom || false,
                quantity: 1, // Each serial = 1 unit
                lot_id: false,
                lot_name: lotName,
                tracking: move.has_tracking || 'serial',
                location_id: transferData?.location_id || false,
                location_dest_id: transferData?.location_dest_id || false,
                isNew: true,
            })
        }

        // Add or replace move lines
        if (keepCurrentLines) {
            setMoveLines(prev => [...prev, ...newLines])
        } else {
            // Remove existing lines for this move and add new ones
            setMoveLines(prev => [
                ...prev.filter(ml => {
                    const mlMoveId = typeof ml.move_id === 'number' ? ml.move_id : ml.move_id[0]
                    return mlMoveId !== generateSerialsForMoveId
                }),
                ...newLines
            ])
        }

        setHasUnsavedChanges(true)
        setGenerateSerialsModalOpen(false)
        setFirstSerialNumber('')
        setNumberOfSerials(1)
        setKeepCurrentLines(false)
        setGenerateSerialsForMoveId(null)
    }, [generateSerialsForMoveId, firstSerialNumber, numberOfSerials, keepCurrentLines, moves, transferData])

    // Reset lot selection state when expanding a different move
    useEffect(() => {
        setSelectedLotId(null)
        setSelectedLotQty(1)
    }, [expandedMoveId])

    // Debounced product search
    useEffect(() => {
        if (!showProductDropdown) return

        const timer = setTimeout(() => {
            searchProducts(productSearchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [productSearchQuery, showProductDropdown, searchProducts])

    // Update dropdown position when opened
    useEffect(() => {
        if (showProductDropdown && productInputRef.current) {
            const updatePosition = () => {
                const rect = productInputRef.current?.getBoundingClientRect()
                if (rect) {
                    setDropdownPosition({
                        top: rect.bottom + window.scrollY + 4,
                        left: rect.left + window.scrollX,
                        width: rect.width,
                    })
                }
            }
            updatePosition()
            window.addEventListener('scroll', updatePosition, true)
            window.addEventListener('resize', updatePosition)
            return () => {
                window.removeEventListener('scroll', updatePosition, true)
                window.removeEventListener('resize', updatePosition)
            }
        }
    }, [showProductDropdown])

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            const dropdownPortal = document.getElementById('product-dropdown-portal')
            if (productSearchRef.current &&
                !productSearchRef.current.contains(target) &&
                (!dropdownPortal || !dropdownPortal.contains(target))) {
                setShowProductDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Get meaningful message based on method
    const getMethodSuccessMessage = (method: string): string => {
        const messages: Record<string, string> = {
            'action_confirm': t('Transfer confirmed successfully'),
            'action_assign': t('Stock availability checked'),
            'button_validate': t('Transfer validated and completed'),
            'action_cancel': t('Transfer cancelled'),
            'action_set_draft': t('Transfer reset to draft'),
            'do_unreserve': t('Stock reservation removed'),
            'force_assign': t('Availability forced'),
        }
        return messages[method] || t('Operation completed')
    }

    // Execute Odoo method
    const executeOdooMethod = useCallback(async (method: string, args: any[] = []) => {
        if (!sessionId || !recordId) return false
        setExecutingAction(method)

        try {
            const url = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking/execute`
            const res = await fetch(url, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method,
                    args: [[recordId], ...args],
                    kwargs: {}
                })
            })
            const result = await res.json()

            if (result.success) {
                setToast({ text: getMethodSuccessMessage(method), state: 'success' })
                await fetchTransferData()
                return true
            } else {
                setToast({ text: result.error || t('Operation failed'), state: 'error' })
                return false
            }
        } catch (error) {
            console.error('Error executing method:', error)
            setToast({ text: t('Operation failed'), state: 'error' })
            return false
        } finally {
            setExecutingAction(null)
        }
    }, [sessionId, recordId, getHeaders, t, fetchTransferData])

    // Update done quantity on stock.move
    const updateMoveQuantity = useCallback((moveId: number, field: 'quantity' | 'product_uom_qty', newQty: number) => {
        setMoves(prev => prev.map(m =>
            m.id === moveId ? { ...m, [field]: newQty, isModified: true } : m
        ))
        setHasUnsavedChanges(true)
    }, [])

    // Select product for new line
    const selectProduct = (product: ProductOption) => {
        setNewLineProductId(product.id)
        setNewLineProductName(product.display_name || product.name)
        setNewLineUomId(product.uom_id?.[0] || null)
        setNewLineUomName(product.uom_id?.[1] || '')
        setShowProductDropdown(false)
        setProductSearchQuery('')
    }

    // Add new line (inline, mark for saving)
    const handleAddNewLine = () => {
        if (!newLineProductId || !transferData) return

        const newMove: MoveData = {
            id: -Date.now(), // Temporary negative ID for new lines
            product_id: [newLineProductId, newLineProductName],
            product_uom_qty: newLineQuantity,
            quantity: 0,
            product_uom: newLineUomId ? [newLineUomId, newLineUomName] : false,
            state: 'draft',
            picked: false,
            isNew: true
        }

        setMoves(prev => [...prev, newMove])
        setHasUnsavedChanges(true)

        // Reset new line form
        setIsAddingLine(false)
        setNewLineProductId(null)
        setNewLineProductName('')
        setNewLineQuantity(1)
        setNewLineUomId(null)
        setNewLineUomName('')

        // Fetch image for new product
        fetchProductImages([newLineProductId])
    }

    // Cancel adding new line
    const cancelAddLine = () => {
        setIsAddingLine(false)
        setNewLineProductId(null)
        setNewLineProductName('')
        setNewLineQuantity(1)
        setProductSearchQuery('')
        setShowProductDropdown(false)
    }

    // Delete line (mark for deletion or remove if new)
    const handleDeleteLine = useCallback((moveId: number) => {
        setMoves(prev => prev.filter(m => m.id !== moveId))
        setHasUnsavedChanges(true)
    }, [])

    // Save all changes - uses execute endpoint to bypass smart fields filtering
    const handleSaveChanges = async () => {
        if (!sessionId || !recordId || !transferData) return
        setSaving(true)

        try {
            let hasErrors = false
            const moveExecuteUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.move/execute`
            const moveLineExecuteUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.move.line/execute`

            // Process each move
            for (const move of moves) {
                if (move.isNew && move.id < 0) {
                    // Create new stock.move using execute endpoint (bypasses smart fields filtering)
                    // Note: 'name' field is computed in Odoo 17+ and cannot be set directly
                    // Note: location_id and location_dest_id are inherited from the picking
                    // We must pass them explicitly as they are required fields
                    // Use the picking's picking_type_id to get proper company-specific locations
                    const moveData: Record<string, any> = {
                        picking_id: recordId,
                        product_id: move.product_id[0],
                        product_uom_qty: move.product_uom_qty,
                    }

                    // Only set locations if they match the picking's company context
                    // The picking already has the correct company-specific locations
                    if (transferData.location_id) {
                        moveData.location_id = transferData.location_id[0]
                    }
                    if (transferData.location_dest_id) {
                        moveData.location_dest_id = transferData.location_dest_id[0]
                    }

                    if (move.product_uom && move.product_uom[0]) {
                        moveData.product_uom = move.product_uom[0]
                    }

                    // Also pass company_id from the picking to ensure company consistency
                    if (transferData.company_id) {
                        moveData.company_id = transferData.company_id[0]
                    }

                    const res = await fetch(moveExecuteUrl, {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify({
                            method: 'create',
                            args: [[moveData]],
                            kwargs: {}
                        })
                    })
                    const result = await res.json()

                    if (!result.success) {
                        console.error('Failed to create move:', result.error || result)
                        hasErrors = true
                    }
                } else if (move.isModified && move.id > 0) {
                    // Update existing stock.move using execute endpoint
                    const updateData: Record<string, any> = {}

                    // Only update quantity if state is assigned
                    if (canEditQuantities(transferData.state)) {
                        updateData.quantity = move.quantity
                    }

                    // Update demand if allowed
                    if (canEditDemand(transferData.state)) {
                        updateData.product_uom_qty = move.product_uom_qty
                    }

                    if (Object.keys(updateData).length > 0) {
                        const res = await fetch(moveExecuteUrl, {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify({
                                method: 'write',
                                args: [[move.id], updateData],
                                kwargs: {}
                            })
                        })
                        const result = await res.json()

                        if (!result.success) {
                            console.error('Failed to update move:', result.error || result)
                            hasErrors = true
                        }
                    }
                }
            }

            // Process new move lines (for lot/serial tracking)
            const newMoveLines = moveLines.filter(ml => ml.isNew && ml.id < 0)
            for (const moveLine of newMoveLines) {
                const moveId = typeof moveLine.move_id === 'number' ? moveLine.move_id : moveLine.move_id[0]

                // For incoming transfers with lot_name, the lot will be created automatically by Odoo
                // when we set lot_name on the move line
                const moveLineData: Record<string, any> = {
                    move_id: moveId,
                    picking_id: recordId,
                    product_id: moveLine.product_id[0],
                    quantity: moveLine.quantity,
                    location_id: transferData.location_id ? transferData.location_id[0] : false,
                    location_dest_id: transferData.location_dest_id ? transferData.location_dest_id[0] : false,
                }

                if (moveLine.product_uom_id && moveLine.product_uom_id[0]) {
                    moveLineData.product_uom_id = moveLine.product_uom_id[0]
                }

                // If lot_id is set (for outgoing/selecting existing lot)
                if (moveLine.lot_id && moveLine.lot_id[0]) {
                    moveLineData.lot_id = moveLine.lot_id[0]
                }

                // If lot_name is set (for incoming/creating new lot)
                if (moveLine.lot_name) {
                    moveLineData.lot_name = moveLine.lot_name
                }

                const res = await fetch(moveLineExecuteUrl, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        method: 'create',
                        args: [[moveLineData]],
                        kwargs: {}
                    })
                })
                const result = await res.json()

                if (!result.success) {
                    console.error('Failed to create move line:', result.error || result)
                    hasErrors = true
                }
            }

            if (hasErrors) {
                setToast({ text: t('Some items could not be saved'), state: 'error' })
            } else {
                const newMoveCount = moves.filter(m => m.isNew && m.id < 0).length
                const modifiedMoveCount = moves.filter(m => m.isModified && m.id > 0).length
                const newMoveLineCount = newMoveLines.length
                let message = t('Items saved')
                if (newMoveCount > 0 || modifiedMoveCount > 0 || newMoveLineCount > 0) {
                    const parts = []
                    if (newMoveCount > 0) parts.push(t('{{count}} item(s) added', { count: newMoveCount }))
                    if (modifiedMoveCount > 0) parts.push(t('{{count}} updated', { count: modifiedMoveCount }))
                    if (newMoveLineCount > 0) parts.push(t('{{count}} lot(s) assigned', { count: newMoveLineCount }))
                    message = parts.join(', ')
                }
                setToast({ text: message, state: 'success' })
                setHasUnsavedChanges(false)

                // Notify parent to refresh data
                if (onDataChange) onDataChange()

                // If in confirmed/waiting/assigned state, call action_assign
                if (['confirmed', 'waiting', 'assigned'].includes(transferData.state)) {
                    await executeOdooMethod('action_assign')
                } else {
                    await fetchTransferData()
                }
            }
        } catch (error) {
            console.error('Error saving changes:', error)
            setToast({ text: t('Failed to save items'), state: 'error' })
        } finally {
            setSaving(false)
        }
    }

    // Get template key for transfer type
    const getTemplateKey = useCallback(() => {
        return transferType === 'incoming' ? 'goods_receipt_note' :
               transferType === 'outgoing' ? 'delivery_note' :
               'stock_internal_transfer'
    }, [transferType])

    // Check for existing reports for this record
    const checkExistingReports = useCallback(async () => {
        if (!recordId || !sessionId) return

        try {
            // Get all completed reports for this stock.picking
            const url = `${API_CONFIG.BACKEND_BASE_URL}/reports/generated?sourceModel=stock.picking&sourceRecordId=${recordId}&status=completed&limit=10`
            const res = await fetch(url, { headers: getHeaders() })
            const result = await res.json()

            if (result.success && result.reports && result.reports.length > 0) {
                setExistingReports(result.reports)
                // Find the one matching our template key
                const templateKey = getTemplateKey()
                const matchingReport = result.reports.find((r: any) => r.template_key === templateKey)
                setExistingReportId(matchingReport ? matchingReport.id : null)
            } else {
                setExistingReports([])
                setExistingReportId(null)
            }
        } catch (error) {
            console.error('Error checking existing reports:', error)
            setExistingReports([])
            setExistingReportId(null)
        }
    }, [recordId, sessionId, getTemplateKey, getHeaders])

    // Check for existing reports when transfer data loads
    useEffect(() => {
        if (transferData) {
            checkExistingReports()
        }
    }, [transferData, checkExistingReports])

    // Download document using fetch with headers
    const downloadDocument = useCallback(async (reportId: number, filename?: string) => {
        try {
            const url = `${API_CONFIG.BACKEND_BASE_URL}/reports/generated/${reportId}/download`
            const res = await fetch(url, { headers: getHeaders() })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Download failed' }))
                setToast({ text: errorData.error || t('Failed to download document'), state: 'error' })
                return
            }

            const blob = await res.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = filename || `document_${reportId}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(downloadUrl)
        } catch (error) {
            console.error('Download error:', error)
            setToast({ text: t('Failed to download document'), state: 'error' })
        }
    }, [getHeaders, t])

    // Print/Download document handler
    const handlePrintDocument = async () => {
        if (!recordId || !sessionId) {
            setToast({ text: t('Please log in to generate documents'), state: 'error' })
            return
        }

        // If report already exists, just download it - don't regenerate
        if (existingReportId) {
            const docName = transferType === 'incoming' ? 'receipt' :
                           transferType === 'outgoing' ? 'delivery_note' :
                           'transfer'
            await downloadDocument(existingReportId, `${docName}_${transferData?.name || recordId}.pdf`)
            return
        }

        setExecutingAction('print')

        try {
            const templateKey = getTemplateKey()

            // Use custom-reports endpoint which has the correct templates
            const url = `${API_CONFIG.BACKEND_BASE_URL}/reports/custom-reports/generate`
            const res = await fetch(url, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    report_key: templateKey,
                    record_id: recordId,
                    return_base64: false
                })
            })

            // Check if response is PDF (direct download) or JSON
            const contentType = res.headers.get('content-type')

            if (contentType?.includes('application/pdf')) {
                // Response is the PDF itself - download it
                const blob = await res.blob()
                const docName = transferType === 'incoming' ? 'receipt' :
                               transferType === 'outgoing' ? 'delivery_note' :
                               'transfer'
                const filename = `${docName}_${transferData?.name || recordId}.pdf`

                // Create download link
                const downloadUrl = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = downloadUrl
                link.download = filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(downloadUrl)

                // Refresh reports list
                await checkExistingReports()

                const docLabel = transferType === 'incoming' ? t('Receipt') :
                               transferType === 'outgoing' ? t('Delivery Note') :
                               t('Transfer Document')
                setToast({ text: `${docLabel} ${t('generated successfully')}`, state: 'success' })
            } else {
                // Response is JSON - check for error or success
                const result = await res.json()

                if (res.status === 409 && result.existingReport) {
                    // Report already exists - download it instead
                    setExistingReportId(result.existingReport.id)
                    await checkExistingReports()
                    window.open(`${API_CONFIG.BACKEND_BASE_URL}/reports/generated/${result.existingReport.id}/download`, '_blank')
                    setToast({ text: t('Document already exists - downloading'), state: 'success' })
                } else if (result.success && result.reportUuid) {
                    // Success with base64 - refresh and notify
                    await checkExistingReports()
                    const docLabel = transferType === 'incoming' ? t('Receipt') :
                                   transferType === 'outgoing' ? t('Delivery Note') :
                                   t('Transfer Document')
                    setToast({ text: `${docLabel} ${t('generated successfully')}`, state: 'success' })
                } else {
                    setToast({ text: result.error || t('Failed to generate document'), state: 'error' })
                }
            }
        } catch (error) {
            console.error('Print error:', error)
            setToast({ text: t('Failed to generate document'), state: 'error' })
        } finally {
            setExecutingAction(null)
        }
    }

    // Set all done
    const handleSetAllDone = () => {
        if (!canEditQuantities(transferData?.state || '')) return
        setMoves(prev => prev.map(m => ({
            ...m,
            quantity: m.product_uom_qty,
            isModified: true
        })))
        setHasUnsavedChanges(true)
    }

    // Format short date
    const formatShortDate = (dateStr: string | false) => {
        if (!dateStr) return '-'
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString(i18n.language, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return String(dateStr)
        }
    }

    // Handle close/back
    const handleClose = () => {
        if (onClose) {
            onClose()
        } else if (backRoute) {
            navigate(backRoute)
        } else {
            navigate(-1)
        }
    }

    // Render product image
    const renderProductImage = (productId: number, size: number = 40) => {
        const image = productImages[productId]
        if (image) {
            return (
                <img
                    src={`data:image/png;base64,${image}`}
                    alt=""
                    style={{
                        width: size,
                        height: size,
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        flexShrink: 0,
                    }}
                />
            )
        }
        return (
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: '6px',
                    background: colors.background,
                    border: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <Package size={size * 0.5} style={{ color: colors.textSecondary, opacity: 0.5 }} />
            </div>
        )
    }

    // Get status config
    const statusConfig = transferData ? STATUS_CONFIG[transferData.state] || STATUS_CONFIG.draft : STATUS_CONFIG.draft

    if (loading) {
        return (
            <div className={`transfer-record-page ${isSidebar ? 'sidebar' : ''} ${isDark ? 'dark' : ''}`} style={{ background: colors.background }}>
                <div className="transfer-page-loading" style={{ minHeight: isSidebar ? '100%' : undefined }}>
                    <div className="loading-spinner">
                        <Package size={32} style={{ color: colors.action }} />
                    </div>
                    <span style={{ color: colors.textSecondary, fontSize: '0.9rem' }}>{t('Loading...')}</span>
                </div>
            </div>
        )
    }

    if (!transferData && !isCreating) {
        return (
            <div className={`transfer-record-page ${isSidebar ? 'sidebar' : ''} ${isDark ? 'dark' : ''}`} style={{ background: colors.background }}>
                <div className="transfer-page-error" style={{ minHeight: isSidebar ? '100%' : undefined }}>
                    <XCircle size={40} style={{ color: colors.textSecondary }} />
                    <span style={{ color: colors.textSecondary }}>{t('Transfer not found')}</span>
                    <button onClick={handleClose} className="back-btn" style={{ background: colors.action }}>
                        <ArrowLeft size={16} />
                        {t('Go Back')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div
            className={`transfer-record-page ${isSidebar ? 'sidebar' : ''} ${isDark ? 'dark' : ''}`}
            style={{
                background: colors.background,
                '--transfer-bg': colors.background,
                '--transfer-surface': colors.card,
                '--transfer-border': colors.border,
                '--transfer-text-primary': colors.textPrimary,
                '--transfer-text-secondary': colors.textSecondary,
                '--transfer-accent': colors.action
            } as React.CSSProperties}
        >
            <div className="transfer-content">
                {/* Header */}
                <header className="transfer-header" style={{ background: colors.card, borderColor: colors.border }}>
                    <div className="header-top-row">
                        <div className="header-left-group">
                            {!isSidebar && (
                                <button
                                    className="back-button"
                                    onClick={handleClose}
                                    style={{ background: colors.background, borderColor: colors.border, color: colors.textSecondary }}
                                >
                                    <ArrowLeft size={20} />
                                </button>
                            )}

                            <div className="transfer-ref-group">
                                <h1 className="transfer-name" style={{ color: colors.textPrimary, fontSize: isSidebar ? '1.1rem' : '1.25rem' }}>
                                    {transferData?.name || t('New Transfer')}
                                </h1>
                                {transferData?.partner_id && (
                                    <span className="transfer-partner" style={{ color: colors.textSecondary }}>
                                        <User size={14} />
                                        {transferData.partner_id[1]}
                                    </span>
                                )}
                            </div>

                            <div
                                className="status-badge"
                                style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}
                            >
                                <statusConfig.icon size={14} />
                                <span>{t(statusConfig.label)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="header-actions" style={{ gap: isSidebar ? '0.375rem' : '0.5rem' }}>
                            {/* Create button when in create mode */}
                            {isCreating && (
                                <button
                                    className="action-btn primary"
                                    onClick={handleCreateTransfer}
                                    disabled={creatingRecord || !pickingTypeId}
                                    style={{ background: colors.action, padding: isSidebar ? '0.4rem 0.75rem' : undefined }}
                                >
                                    {creatingRecord ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                                    {t('Create')}
                                </button>
                            )}

                            {/* Save button when there are unsaved changes */}
                            {hasUnsavedChanges && !isCreating && (
                                <button
                                    className="action-btn primary"
                                    onClick={handleSaveChanges}
                                    disabled={saving}
                                    style={{ background: '#16a34a', padding: isSidebar ? '0.4rem 0.75rem' : undefined }}
                                >
                                    {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                                    {!isSidebar && t('Save')}
                                </button>
                            )}

                            {transferData?.state === 'draft' && (
                                <button
                                    className="action-btn primary"
                                    onClick={() => executeOdooMethod('action_confirm')}
                                    disabled={!!executingAction || hasUnsavedChanges}
                                    style={{ background: colors.action, padding: isSidebar ? '0.4rem 0.75rem' : undefined }}
                                >
                                    {executingAction === 'action_confirm' ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
                                    {!isSidebar && t('Confirm')}
                                </button>
                            )}

                            {(transferData?.state === 'confirmed' || transferData?.state === 'waiting') && (
                                <button
                                    className="action-btn primary"
                                    onClick={() => executeOdooMethod('action_assign')}
                                    disabled={!!executingAction || hasUnsavedChanges}
                                    style={{ background: colors.action, padding: isSidebar ? '0.4rem 0.75rem' : undefined }}
                                >
                                    {executingAction === 'action_assign' ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                                    {!isSidebar && t('Check Availability')}
                                </button>
                            )}

                            {transferData?.state === 'assigned' && (
                                <button
                                    className="action-btn success-outline"
                                    onClick={() => executeOdooMethod('button_validate')}
                                    disabled={!!executingAction || hasUnsavedChanges}
                                    style={{ padding: isSidebar ? '0.4rem 0.75rem' : undefined }}
                                >
                                    {executingAction === 'button_validate' ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                                    {t('Validate')}
                                </button>
                            )}

                            {transferData?.state === 'cancel' && (
                                <button
                                    className="action-btn primary"
                                    onClick={() => executeOdooMethod('action_set_draft')}
                                    disabled={!!executingAction}
                                    style={{ background: colors.action, padding: isSidebar ? '0.4rem 0.75rem' : undefined }}
                                >
                                    {executingAction === 'action_set_draft' ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}
                                    {!isSidebar && t('Set to Draft')}
                                </button>
                            )}

                            {!isCreating && transferData?.state !== 'done' && transferData?.state !== 'cancel' && (
                                <button
                                    className="action-btn danger-outline"
                                    onClick={() => executeOdooMethod('action_cancel')}
                                    disabled={!!executingAction}
                                    style={{ padding: isSidebar ? '0.4rem 0.75rem' : undefined }}
                                >
                                    {executingAction === 'action_cancel' ? <Loader2 size={14} className="spin" /> : <Ban size={14} />}
                                </button>
                            )}

                            {/* Only show print button if not creating and no document exists yet */}
                            {!isCreating && !existingReportId && (
                                <button
                                    className="action-btn secondary"
                                    onClick={handlePrintDocument}
                                    disabled={!!executingAction}
                                    style={{
                                        padding: isSidebar ? '0.4rem 0.75rem' : undefined
                                    }}
                                    title={t('Generate document')}
                                >
                                    {executingAction === 'print' ? (
                                        <Loader2 size={14} className="spin" />
                                    ) : (
                                        <Printer size={14} />
                                    )}
                                </button>
                            )}

                            {/* Close button for sidebar mode */}
                            {isSidebar && onClose && (
                                <button
                                    className="action-btn secondary"
                                    onClick={onClose}
                                    style={{
                                        padding: '0.4rem',
                                        marginInlineStart: '0.25rem',
                                    }}
                                    title={t('Close (Esc)')}
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Info Bar - Show form fields when creating, otherwise show read-only info */}
                    {isCreating ? (
                        <div
                            className="creation-form-container"
                            style={{
                                background: colors.card,
                                borderTop: `1px solid ${colors.border}`,
                                padding: '1.5rem',
                            }}
                        >
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '1.5rem',
                            }}>
                                {/* Picking Type */}
                                {pickingTypes.length > 1 && (
                                    <Autocomplete
                                        size="small"
                                        options={pickingTypes}
                                        getOptionLabel={(option) => option.name}
                                        value={pickingTypes.find(pt => pt.id === pickingTypeId) || null}
                                        onChange={(_, newValue) => {
                                            if (newValue) {
                                                setPickingTypeId(newValue.id)
                                                if (newValue.default_location_src_id) setSelectedLocationId(newValue.default_location_src_id[0])
                                                if (newValue.default_location_dest_id) setSelectedLocationDestId(newValue.default_location_dest_id[0])
                                            }
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label={t('Operation Type')}
                                                placeholder={t('Select operation type...')}
                                            />
                                        )}
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
                                )}

                                {/* Source Location */}
                                <Autocomplete
                                    size="small"
                                    options={locationOptions}
                                    getOptionLabel={(option) => option.name}
                                    value={locationOptions.find(loc => loc.id === selectedLocationId) || null}
                                    onChange={(_, newValue) => setSelectedLocationId(newValue?.id || null)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={t('Source Location')}
                                            placeholder={t('Select source location...')}
                                        />
                                    )}
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

                                {/* Destination Location */}
                                <Autocomplete
                                    size="small"
                                    options={locationOptions}
                                    getOptionLabel={(option) => option.name}
                                    value={locationOptions.find(loc => loc.id === selectedLocationDestId) || null}
                                    onChange={(_, newValue) => setSelectedLocationDestId(newValue?.id || null)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={t('Destination Location')}
                                            placeholder={t('Select destination location...')}
                                        />
                                    )}
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

                                {/* Contact */}
                                <Autocomplete
                                    size="small"
                                    options={partnerOptions}
                                    getOptionLabel={(option) => option.name}
                                    value={partnerOptions.find(p => p.id === selectedPartnerId) || null}
                                    onChange={(_, newValue) => setSelectedPartnerId(newValue?.id || null)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={t('Contact (Optional)')}
                                            placeholder={t('Select contact...')}
                                        />
                                    )}
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

                                {/* Scheduled Date */}
                                <TextField
                                    size="small"
                                    type="datetime-local"
                                    label={t('Scheduled Date')}
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
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
                            </div>
                        </div>
                    ) : (
                        <div className="header-info-bar" style={{ borderColor: colors.border, padding: isSidebar ? '0.5rem 1rem' : undefined }}>
                            <div className="info-chip location-chip">
                                <MapPin size={14} style={{ color: colors.textSecondary }} />
                                <span className="location-from" style={{ color: colors.textPrimary }}>
                                    {transferData?.location_id ? transferData.location_id[1].split('/').pop() : '-'}
                                </span>
                                <ArrowRight size={14} style={{ color: colors.action }} />
                                <span className="location-to" style={{ color: colors.textPrimary }}>
                                    {transferData?.location_dest_id ? transferData.location_dest_id[1].split('/').pop() : '-'}
                                </span>
                            </div>

                            <div className="info-chip">
                                <Calendar size={14} style={{ color: colors.textSecondary }} />
                                <span style={{ color: colors.textPrimary }}>{formatShortDate(transferData?.scheduled_date || false)}</span>
                            </div>

                            {transferData?.origin && (
                                <div className="info-chip">
                                    <FileText size={14} style={{ color: colors.textSecondary }} />
                                    <span className="mono" style={{ color: colors.textPrimary }}>{transferData.origin}</span>
                                </div>
                            )}
                        </div>
                    )}
                </header>

                {/* Main Area */}
                <div className="transfer-main-area">
                    {/* Transfer Lines */}
                    <div className="transfer-lines-section" style={{ background: colors.card, borderColor: colors.border }}>
                        <div
                            className="lines-header"
                            onClick={() => setLinesExpanded(!linesExpanded)}
                            style={{ background: colors.background, borderColor: colors.border }}
                        >
                            <div className="lines-title">
                                <Package size={18} style={{ color: colors.action }} />
                                <h3 style={{ color: colors.textPrimary }}>{t('Transferred Items')}</h3>
                                <span className="lines-count" style={{ background: colors.card, color: colors.textSecondary }}>
                                    {moves.length}
                                </span>
                            </div>
                            <div className="lines-actions">
                                {!isViewMode && !isCreating && canEditQuantities(transferData?.state || '') && (
                                    <button
                                        className="set-all-done-btn"
                                        onClick={(e) => { e.stopPropagation(); handleSetAllDone() }}
                                        disabled={saving}
                                    >
                                        <Check size={14} />
                                        {t('Set All Done')}
                                    </button>
                                )}
                                {!isViewMode && !isCreating && canAddLines(transferData?.state || '') && !isAddingLine && (
                                    <button
                                        className="add-line-btn"
                                        onClick={(e) => { e.stopPropagation(); setIsAddingLine(true) }}
                                    >
                                        <Plus size={14} />
                                        {t('Add')}
                                    </button>
                                )}
                                <span style={{ color: colors.textSecondary }}>
                                    {linesExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </span>
                            </div>
                        </div>

                        <AnimatePresence>
                            {linesExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="lines-content"
                                >
                                    {moves.length === 0 && !isAddingLine ? (
                                        <div className="lines-empty">
                                            <Box size={36} strokeWidth={1} style={{ color: colors.textSecondary }} />
                                            <span style={{ color: colors.textSecondary }}>
                                                {isCreating ? t('Create the transfer first to add items') : t('No items')}
                                            </span>
                                            {!isCreating && canAddLines(transferData?.state || '') && !isViewMode && (
                                                <button
                                                    className="add-first-line-btn"
                                                    onClick={() => setIsAddingLine(true)}
                                                >
                                                    <Plus size={16} />
                                                    {t('Add First Line')}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="lines-table">
                                            <div className="lines-table-header" style={{ background: colors.background, borderColor: colors.border }}>
                                                <div className="col-product" style={{ color: colors.textSecondary }}>{t('Product')}</div>
                                                <div className="col-expected" style={{ color: colors.textSecondary }}>{t('Demand')}</div>
                                                <div className="col-done" style={{ color: colors.textSecondary }}>{t('Done')}</div>
                                                {!isViewMode && canAddLines(transferData?.state || '') && (
                                                    <div className="col-actions" style={{ color: colors.textSecondary }}></div>
                                                )}
                                            </div>

                                            {/* Existing lines */}
                                            {moves.map((move) => {
                                                const hasTracking = move.has_tracking && move.has_tracking !== 'none'
                                                const isExpanded = expandedMoveId === move.id
                                                const relatedMoveLines = moveLines.filter(ml =>
                                                    (typeof ml.move_id === 'number' ? ml.move_id : ml.move_id[0]) === move.id
                                                )

                                                return (
                                                    <div key={move.id}>
                                                        <div
                                                            className="line-row"
                                                            style={{
                                                                borderColor: colors.border,
                                                                cursor: hasTracking ? 'pointer' : 'default',
                                                                background: isExpanded ? (isDark ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.02)') : 'transparent',
                                                            }}
                                                            onClick={() => {
                                                                if (hasTracking) {
                                                                    if (isExpanded) {
                                                                        setExpandedMoveId(null)
                                                                    } else {
                                                                        setExpandedMoveId(move.id)
                                                                        // Load lots for this product if not already loaded
                                                                        // Pass source location for outgoing/internal to filter by available stock
                                                                        if (!lotOptions[move.product_id[0]]) {
                                                                            const sourceLocationId = transferData?.location_id?.[0]
                                                                            searchLotsByProduct(move.product_id[0], sourceLocationId)
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <div className="col-product">
                                                                <div className="product-with-image">
                                                                    {renderProductImage(move.product_id[0], 40)}
                                                                    <div className="product-info">
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                            <span className="product-name" style={{ color: colors.textPrimary }}>
                                                                                {move.product_id[1]}
                                                                            </span>
                                                                            {/* Tracking Badge */}
                                                                            {hasTracking && (
                                                                                <span style={{
                                                                                    fontSize: '0.65rem',
                                                                                    fontWeight: 600,
                                                                                    padding: '2px 6px',
                                                                                    borderRadius: '4px',
                                                                                    background: move.has_tracking === 'serial'
                                                                                        ? 'rgba(168, 85, 247, 0.15)'
                                                                                        : 'rgba(245, 158, 11, 0.15)',
                                                                                    color: move.has_tracking === 'serial'
                                                                                        ? '#a855f7'
                                                                                        : '#f59e0b',
                                                                                    textTransform: 'uppercase',
                                                                                }}>
                                                                                    {move.has_tracking === 'serial' ? t('Serial') : t('Lot')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            {move.product_uom && (
                                                                                <span className="product-uom" style={{ color: colors.textSecondary }}>
                                                                                    {move.product_uom[1]}
                                                                                </span>
                                                                            )}
                                                                            {hasTracking && (
                                                                                <span style={{
                                                                                    fontSize: '0.7rem',
                                                                                    color: colors.textSecondary,
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '4px',
                                                                                }}>
                                                                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                                                    {relatedMoveLines.length > 0
                                                                                        ? t('{{count}} assigned', { count: relatedMoveLines.length })
                                                                                        : t('Click to assign')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="col-expected" onClick={(e) => e.stopPropagation()}>
                                                                {isViewMode || !canEditDemand(transferData?.state || '') ? (
                                                                    <span className="qty-expected" style={{ color: colors.textSecondary }}>
                                                                        {move.product_uom_qty.toFixed(2)}
                                                                    </span>
                                                                ) : (
                                                                    <input
                                                                        type="number"
                                                                        className="qty-inline-input"
                                                                        value={move.product_uom_qty}
                                                                        onChange={(e) => updateMoveQuantity(move.id, 'product_uom_qty', parseFloat(e.target.value) || 0)}
                                                                        min={0}
                                                                        step={1}
                                                                        style={{
                                                                            width: '70px',
                                                                            padding: '0.375rem',
                                                                            textAlign: 'center',
                                                                            border: `1px solid ${colors.border}`,
                                                                            borderRadius: '6px',
                                                                            background: colors.background,
                                                                            color: colors.textPrimary,
                                                                            fontSize: '0.875rem',
                                                                            fontWeight: 600,
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="col-done" onClick={(e) => e.stopPropagation()}>
                                                                {isViewMode || !canEditQuantities(transferData?.state || '') ? (
                                                                    <span
                                                                        className="qty-done"
                                                                        style={{ color: move.quantity >= move.product_uom_qty ? '#16a34a' : colors.textPrimary }}
                                                                    >
                                                                        {move.quantity.toFixed(2)}
                                                                    </span>
                                                                ) : (
                                                                    <div className="qty-input-group" style={{ background: colors.background, borderColor: colors.border }}>
                                                                        <button
                                                                            className="qty-btn minus"
                                                                            onClick={() => updateMoveQuantity(move.id, 'quantity', Math.max(0, move.quantity - 1))}
                                                                            disabled={saving || move.quantity <= 0}
                                                                            style={{ color: colors.textSecondary }}
                                                                        >
                                                                            <Minus size={14} />
                                                                        </button>
                                                                        <input
                                                                            type="number"
                                                                            className="qty-input"
                                                                            value={move.quantity}
                                                                            onChange={(e) => updateMoveQuantity(move.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                                            min={0}
                                                                            step={1}
                                                                            style={{ color: colors.textPrimary }}
                                                                        />
                                                                        <button
                                                                            className="qty-btn plus"
                                                                            onClick={() => updateMoveQuantity(move.id, 'quantity', move.quantity + 1)}
                                                                            disabled={saving}
                                                                            style={{ color: colors.textSecondary }}
                                                                        >
                                                                            <Plus size={14} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {!isViewMode && canAddLines(transferData?.state || '') && (
                                                                <div className="col-actions" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        className="line-delete-btn"
                                                                        onClick={() => handleDeleteLine(move.id)}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Expanded Lot/Serial Assignment Section */}
                                                        <AnimatePresence>
                                                            {isExpanded && hasTracking && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    style={{
                                                                        overflow: 'hidden',
                                                                        background: isDark ? 'rgba(99,102,241,0.03)' : 'rgba(99,102,241,0.02)',
                                                                        borderBottom: `1px solid ${colors.border}`,
                                                                    }}
                                                                >
                                                                    <div style={{
                                                                        padding: '12px 16px 16px',
                                                                        marginInlineStart: '52px',
                                                                    }}>
                                                                        <div style={{
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 600,
                                                                            color: colors.textSecondary,
                                                                            marginBottom: '10px',
                                                                            textTransform: 'uppercase',
                                                                            letterSpacing: '0.5px',
                                                                        }}>
                                                                            {move.has_tracking === 'serial'
                                                                                ? t('Serial Numbers')
                                                                                : t('Lot Numbers')}
                                                                        </div>

                                                                        {/* Existing move lines with lots */}
                                                                        {relatedMoveLines.length > 0 && (
                                                                            <div style={{ marginBottom: '12px' }}>
                                                                                {relatedMoveLines.map((ml) => (
                                                                                    <div
                                                                                        key={ml.id}
                                                                                        style={{
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '10px',
                                                                                            padding: '8px 12px',
                                                                                            background: colors.card,
                                                                                            border: `1px solid ${colors.border}`,
                                                                                            borderRadius: '8px',
                                                                                            marginBottom: '6px',
                                                                                        }}
                                                                                    >
                                                                                        <div style={{
                                                                                            width: '24px',
                                                                                            height: '24px',
                                                                                            borderRadius: '6px',
                                                                                            background: move.has_tracking === 'serial'
                                                                                                ? 'rgba(168, 85, 247, 0.15)'
                                                                                                : 'rgba(245, 158, 11, 0.15)',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                        }}>
                                                                                            <Package size={12} style={{
                                                                                                color: move.has_tracking === 'serial' ? '#a855f7' : '#f59e0b'
                                                                                            }} />
                                                                                        </div>
                                                                                        <div style={{ flex: 1 }}>
                                                                                            <div style={{
                                                                                                fontSize: '0.85rem',
                                                                                                fontWeight: 600,
                                                                                                color: colors.textPrimary,
                                                                                                fontFamily: 'monospace',
                                                                                            }}>
                                                                                                {ml.lot_id ? ml.lot_id[1] : ml.lot_name || '-'}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div style={{
                                                                                            fontSize: '0.8rem',
                                                                                            color: colors.textSecondary,
                                                                                            fontWeight: 500,
                                                                                        }}>
                                                                                            {t('Qty')}: {ml.quantity}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        {/* Add new lot/serial - only in edit mode and when state allows */}
                                                                        {!isViewMode && canAssignLots(transferData?.state || '') && (
                                                                            <div style={{
                                                                                display: 'flex',
                                                                                alignItems: 'flex-end',
                                                                                gap: '10px',
                                                                                flexWrap: 'wrap',
                                                                            }}>
                                                                                {/* For outgoing (deliveries): Select existing lot */}
                                                                                {transferType === 'outgoing' && (
                                                                                    <>
                                                                                        <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
                                                                                            <label style={{
                                                                                                display: 'block',
                                                                                                fontSize: '0.7rem',
                                                                                                color: colors.textSecondary,
                                                                                                marginBottom: '4px',
                                                                                                fontWeight: 500,
                                                                                            }}>
                                                                                                {t('Select')} {move.has_tracking === 'serial' ? t('Serial') : t('Lot')}
                                                                                            </label>
                                                                                            <select
                                                                                                style={{
                                                                                                    width: '100%',
                                                                                                    padding: '8px 10px',
                                                                                                    borderRadius: '6px',
                                                                                                    border: `1px solid ${colors.border}`,
                                                                                                    background: colors.background,
                                                                                                    color: colors.textPrimary,
                                                                                                    fontSize: '0.85rem',
                                                                                                }}
                                                                                                value={expandedMoveId === move.id ? (selectedLotId || '') : ''}
                                                                                                onChange={(e) => {
                                                                                                    const lotId = parseInt(e.target.value)
                                                                                                    if (!lotId) {
                                                                                                        setSelectedLotId(null)
                                                                                                        return
                                                                                                    }
                                                                                                    setSelectedLotId(lotId)
                                                                                                    // For serial tracking, auto-add immediately
                                                                                                    if (move.has_tracking === 'serial') {
                                                                                                        const selectedLot = lotOptions[move.product_id[0]]?.find(l => l.id === lotId)
                                                                                                        if (!selectedLot) return
                                                                                                        const newMoveLine: MoveLineData = {
                                                                                                            id: -Date.now(),
                                                                                                            move_id: move.id,
                                                                                                            product_id: move.product_id,
                                                                                                            product_uom_id: move.product_uom || false,
                                                                                                            quantity: 1,
                                                                                                            lot_id: [lotId, selectedLot.name],
                                                                                                            lot_name: false,
                                                                                                            tracking: 'serial',
                                                                                                            location_id: transferData?.location_id || false,
                                                                                                            location_dest_id: transferData?.location_dest_id || false,
                                                                                                            isNew: true,
                                                                                                        }
                                                                                                        setMoveLines(prev => [...prev, newMoveLine])
                                                                                                        setHasUnsavedChanges(true)
                                                                                                        setSelectedLotId(null)
                                                                                                    } else {
                                                                                                        // For lot tracking, set default qty to 1
                                                                                                        setSelectedLotQty(1)
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                <option value="">{lotSearchLoading ? t('Loading...') : t('Select...')}</option>
                                                                                                {(lotOptions[move.product_id[0]] || []).map((lot) => {
                                                                                                    const availableQty = lot.available_qty ?? lot.product_qty
                                                                                                    return (
                                                                                                        <option key={lot.id} value={lot.id}>
                                                                                                            {lot.name} {availableQty !== undefined ? `(${availableQty} ${t('available')})` : ''}
                                                                                                        </option>
                                                                                                    )
                                                                                                })}
                                                                                            </select>
                                                                                            {/* No lots available warning */}
                                                                                            {!lotSearchLoading && (lotOptions[move.product_id[0]] || []).length === 0 && (
                                                                                                <div style={{
                                                                                                    fontSize: '0.7rem',
                                                                                                    color: '#f59e0b',
                                                                                                    marginTop: '4px',
                                                                                                    display: 'flex',
                                                                                                    alignItems: 'center',
                                                                                                    gap: '4px',
                                                                                                }}>
                                                                                                    <AlertTriangle size={12} />
                                                                                                    {t('No lots available in source location')}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        {/* Quantity input for lot tracking (not serial) */}
                                                                                        {move.has_tracking === 'lot' && selectedLotId && expandedMoveId === move.id && (
                                                                                            <>
                                                                                                <div style={{ width: '100px' }}>
                                                                                                    <label style={{
                                                                                                        display: 'block',
                                                                                                        fontSize: '0.7rem',
                                                                                                        color: colors.textSecondary,
                                                                                                        marginBottom: '4px',
                                                                                                        fontWeight: 500,
                                                                                                    }}>
                                                                                                        {t('Qty')}
                                                                                                    </label>
                                                                                                    <input
                                                                                                        type="number"
                                                                                                        min={1}
                                                                                                        max={lotOptions[move.product_id[0]]?.find(l => l.id === selectedLotId)?.available_qty || 999}
                                                                                                        value={selectedLotQty}
                                                                                                        onChange={(e) => setSelectedLotQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                                                                        style={{
                                                                                                            width: '100%',
                                                                                                            padding: '8px 10px',
                                                                                                            borderRadius: '6px',
                                                                                                            border: `1px solid ${colors.border}`,
                                                                                                            background: colors.background,
                                                                                                            color: colors.textPrimary,
                                                                                                            fontSize: '0.85rem',
                                                                                                        }}
                                                                                                    />
                                                                                                </div>
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        const selectedLot = lotOptions[move.product_id[0]]?.find(l => l.id === selectedLotId)
                                                                                                        if (!selectedLot) return
                                                                                                        const maxQty = selectedLot.available_qty || 999
                                                                                                        const qty = Math.min(selectedLotQty, maxQty)
                                                                                                        const newMoveLine: MoveLineData = {
                                                                                                            id: -Date.now(),
                                                                                                            move_id: move.id,
                                                                                                            product_id: move.product_id,
                                                                                                            product_uom_id: move.product_uom || false,
                                                                                                            quantity: qty,
                                                                                                            lot_id: [selectedLotId, selectedLot.name],
                                                                                                            lot_name: false,
                                                                                                            tracking: 'lot',
                                                                                                            location_id: transferData?.location_id || false,
                                                                                                            location_dest_id: transferData?.location_dest_id || false,
                                                                                                            isNew: true,
                                                                                                        }
                                                                                                        setMoveLines(prev => [...prev, newMoveLine])
                                                                                                        setHasUnsavedChanges(true)
                                                                                                        setSelectedLotId(null)
                                                                                                        setSelectedLotQty(1)
                                                                                                    }}
                                                                                                    style={{
                                                                                                        padding: '8px 14px',
                                                                                                        borderRadius: '6px',
                                                                                                        border: 'none',
                                                                                                        background: colors.action,
                                                                                                        color: '#fff',
                                                                                                        fontSize: '0.85rem',
                                                                                                        fontWeight: 500,
                                                                                                        cursor: 'pointer',
                                                                                                        display: 'flex',
                                                                                                        alignItems: 'center',
                                                                                                        gap: '6px',
                                                                                                        alignSelf: 'flex-end',
                                                                                                    }}
                                                                                                >
                                                                                                    <Plus size={14} />
                                                                                                    {t('Add')}
                                                                                                </button>
                                                                                            </>
                                                                                        )}
                                                                                        {/* Refresh button */}
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                const sourceLocationId = transferData?.location_id?.[0]
                                                                                                searchLotsByProduct(move.product_id[0], sourceLocationId)
                                                                                            }}
                                                                                            disabled={lotSearchLoading}
                                                                                            title={t('Refresh available lots')}
                                                                                            style={{
                                                                                                padding: '8px',
                                                                                                borderRadius: '6px',
                                                                                                border: `1px solid ${colors.border}`,
                                                                                                background: 'transparent',
                                                                                                color: colors.textSecondary,
                                                                                                cursor: lotSearchLoading ? 'not-allowed' : 'pointer',
                                                                                                display: 'flex',
                                                                                                alignItems: 'center',
                                                                                                alignSelf: 'flex-end',
                                                                                            }}
                                                                                        >
                                                                                            <RefreshCw size={14} className={lotSearchLoading ? 'animate-spin' : ''} />
                                                                                        </button>
                                                                                    </>
                                                                                )}

                                                                                {/* For incoming (receipts): Enter new lot name */}
                                                                                {transferType === 'incoming' && (
                                                                                    <>
                                                                                        <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
                                                                                            <label style={{
                                                                                                display: 'block',
                                                                                                fontSize: '0.7rem',
                                                                                                color: colors.textSecondary,
                                                                                                marginBottom: '4px',
                                                                                                fontWeight: 500,
                                                                                            }}>
                                                                                                {t('New')} {move.has_tracking === 'serial' ? t('Serial Number') : t('Lot Number')}
                                                                                            </label>
                                                                                            <input
                                                                                                type="text"
                                                                                                placeholder={move.has_tracking === 'serial' ? 'SN-001' : 'LOT-001'}
                                                                                                value={newLotName}
                                                                                                onChange={(e) => setNewLotName(e.target.value)}
                                                                                                style={{
                                                                                                    width: '100%',
                                                                                                    padding: '8px 10px',
                                                                                                    borderRadius: '6px',
                                                                                                    border: `1px solid ${colors.border}`,
                                                                                                    background: colors.background,
                                                                                                    color: colors.textPrimary,
                                                                                                    fontSize: '0.85rem',
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={async () => {
                                                                                                if (!newLotName.trim()) return
                                                                                                // Create new move line with lot_name (will create lot on save)
                                                                                                const newMoveLine: MoveLineData = {
                                                                                                    id: -Date.now(),
                                                                                                    move_id: move.id,
                                                                                                    product_id: move.product_id,
                                                                                                    product_uom_id: move.product_uom || false,
                                                                                                    quantity: move.has_tracking === 'serial' ? 1 : 1,
                                                                                                    lot_id: false,
                                                                                                    lot_name: newLotName.trim(),
                                                                                                    tracking: move.has_tracking || 'none',
                                                                                                    location_id: transferData?.location_id || false,
                                                                                                    location_dest_id: transferData?.location_dest_id || false,
                                                                                                    isNew: true,
                                                                                                }
                                                                                                setMoveLines(prev => [...prev, newMoveLine])
                                                                                                setHasUnsavedChanges(true)
                                                                                                setNewLotName('')
                                                                                            }}
                                                                                            disabled={!newLotName.trim()}
                                                                                            style={{
                                                                                                padding: '8px 14px',
                                                                                                borderRadius: '6px',
                                                                                                border: 'none',
                                                                                                background: newLotName.trim() ? colors.action : colors.border,
                                                                                                color: newLotName.trim() ? '#fff' : colors.textSecondary,
                                                                                                fontSize: '0.85rem',
                                                                                                fontWeight: 500,
                                                                                                cursor: newLotName.trim() ? 'pointer' : 'not-allowed',
                                                                                                display: 'flex',
                                                                                                alignItems: 'center',
                                                                                                gap: '6px',
                                                                                            }}
                                                                                        >
                                                                                            <Plus size={14} />
                                                                                            {t('Add')}
                                                                                        </button>
                                                                                        {/* Generate Serials/Lots Button - for serial tracked products */}
                                                                                        {move.has_tracking === 'serial' && (
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    setGenerateSerialsForMoveId(move.id)
                                                                                                    setNumberOfSerials(Math.ceil(move.product_uom_qty - relatedMoveLines.length))
                                                                                                    setGenerateSerialsModalOpen(true)
                                                                                                }}
                                                                                                style={{
                                                                                                    padding: '8px 14px',
                                                                                                    borderRadius: '6px',
                                                                                                    border: `1px solid ${colors.action}`,
                                                                                                    background: 'transparent',
                                                                                                    color: colors.action,
                                                                                                    fontSize: '0.85rem',
                                                                                                    fontWeight: 500,
                                                                                                    cursor: 'pointer',
                                                                                                    display: 'flex',
                                                                                                    alignItems: 'center',
                                                                                                    gap: '6px',
                                                                                                }}
                                                                                            >
                                                                                                <Zap size={14} />
                                                                                                {t('Generate Serials')}
                                                                                            </button>
                                                                                        )}
                                                                                    </>
                                                                                )}

                                                                                {/* For internal: Select existing lot from source location */}
                                                                                {transferType === 'internal' && (
                                                                                    <>
                                                                                        <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
                                                                                            <label style={{
                                                                                                display: 'block',
                                                                                                fontSize: '0.7rem',
                                                                                                color: colors.textSecondary,
                                                                                                marginBottom: '4px',
                                                                                                fontWeight: 500,
                                                                                            }}>
                                                                                                {t('Select')} {move.has_tracking === 'serial' ? t('Serial') : t('Lot')}
                                                                                            </label>
                                                                                            <select
                                                                                                style={{
                                                                                                    width: '100%',
                                                                                                    padding: '8px 10px',
                                                                                                    borderRadius: '6px',
                                                                                                    border: `1px solid ${colors.border}`,
                                                                                                    background: colors.background,
                                                                                                    color: colors.textPrimary,
                                                                                                    fontSize: '0.85rem',
                                                                                                }}
                                                                                                value={expandedMoveId === move.id ? (selectedLotId || '') : ''}
                                                                                                onChange={(e) => {
                                                                                                    const lotId = parseInt(e.target.value)
                                                                                                    if (!lotId) {
                                                                                                        setSelectedLotId(null)
                                                                                                        return
                                                                                                    }
                                                                                                    setSelectedLotId(lotId)
                                                                                                    // For serial tracking, auto-add immediately
                                                                                                    if (move.has_tracking === 'serial') {
                                                                                                        const selectedLot = lotOptions[move.product_id[0]]?.find(l => l.id === lotId)
                                                                                                        if (!selectedLot) return
                                                                                                        const newMoveLine: MoveLineData = {
                                                                                                            id: -Date.now(),
                                                                                                            move_id: move.id,
                                                                                                            product_id: move.product_id,
                                                                                                            product_uom_id: move.product_uom || false,
                                                                                                            quantity: 1,
                                                                                                            lot_id: [lotId, selectedLot.name],
                                                                                                            lot_name: false,
                                                                                                            tracking: 'serial',
                                                                                                            location_id: transferData?.location_id || false,
                                                                                                            location_dest_id: transferData?.location_dest_id || false,
                                                                                                            isNew: true,
                                                                                                        }
                                                                                                        setMoveLines(prev => [...prev, newMoveLine])
                                                                                                        setHasUnsavedChanges(true)
                                                                                                        setSelectedLotId(null)
                                                                                                    } else {
                                                                                                        setSelectedLotQty(1)
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                <option value="">{lotSearchLoading ? t('Loading...') : t('Select...')}</option>
                                                                                                {(lotOptions[move.product_id[0]] || []).map((lot) => {
                                                                                                    const availableQty = lot.available_qty ?? lot.product_qty
                                                                                                    return (
                                                                                                        <option key={lot.id} value={lot.id}>
                                                                                                            {lot.name} {availableQty !== undefined ? `(${availableQty} ${t('available')})` : ''}
                                                                                                        </option>
                                                                                                    )
                                                                                                })}
                                                                                            </select>
                                                                                            {/* No lots available warning */}
                                                                                            {!lotSearchLoading && (lotOptions[move.product_id[0]] || []).length === 0 && (
                                                                                                <div style={{
                                                                                                    fontSize: '0.7rem',
                                                                                                    color: '#f59e0b',
                                                                                                    marginTop: '4px',
                                                                                                    display: 'flex',
                                                                                                    alignItems: 'center',
                                                                                                    gap: '4px',
                                                                                                }}>
                                                                                                    <AlertTriangle size={12} />
                                                                                                    {t('No lots available in source location')}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        {/* Quantity input for lot tracking */}
                                                                                        {move.has_tracking === 'lot' && selectedLotId && expandedMoveId === move.id && (
                                                                                            <>
                                                                                                <div style={{ width: '100px' }}>
                                                                                                    <label style={{
                                                                                                        display: 'block',
                                                                                                        fontSize: '0.7rem',
                                                                                                        color: colors.textSecondary,
                                                                                                        marginBottom: '4px',
                                                                                                        fontWeight: 500,
                                                                                                    }}>
                                                                                                        {t('Qty')}
                                                                                                    </label>
                                                                                                    <input
                                                                                                        type="number"
                                                                                                        min={1}
                                                                                                        max={lotOptions[move.product_id[0]]?.find(l => l.id === selectedLotId)?.available_qty || 999}
                                                                                                        value={selectedLotQty}
                                                                                                        onChange={(e) => setSelectedLotQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                                                                        style={{
                                                                                                            width: '100%',
                                                                                                            padding: '8px 10px',
                                                                                                            borderRadius: '6px',
                                                                                                            border: `1px solid ${colors.border}`,
                                                                                                            background: colors.background,
                                                                                                            color: colors.textPrimary,
                                                                                                            fontSize: '0.85rem',
                                                                                                        }}
                                                                                                    />
                                                                                                </div>
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        const selectedLot = lotOptions[move.product_id[0]]?.find(l => l.id === selectedLotId)
                                                                                                        if (!selectedLot) return
                                                                                                        const maxQty = selectedLot.available_qty || 999
                                                                                                        const qty = Math.min(selectedLotQty, maxQty)
                                                                                                        const newMoveLine: MoveLineData = {
                                                                                                            id: -Date.now(),
                                                                                                            move_id: move.id,
                                                                                                            product_id: move.product_id,
                                                                                                            product_uom_id: move.product_uom || false,
                                                                                                            quantity: qty,
                                                                                                            lot_id: [selectedLotId, selectedLot.name],
                                                                                                            lot_name: false,
                                                                                                            tracking: 'lot',
                                                                                                            location_id: transferData?.location_id || false,
                                                                                                            location_dest_id: transferData?.location_dest_id || false,
                                                                                                            isNew: true,
                                                                                                        }
                                                                                                        setMoveLines(prev => [...prev, newMoveLine])
                                                                                                        setHasUnsavedChanges(true)
                                                                                                        setSelectedLotId(null)
                                                                                                        setSelectedLotQty(1)
                                                                                                    }}
                                                                                                    style={{
                                                                                                        padding: '8px 14px',
                                                                                                        borderRadius: '6px',
                                                                                                        border: 'none',
                                                                                                        background: colors.action,
                                                                                                        color: '#fff',
                                                                                                        fontSize: '0.85rem',
                                                                                                        fontWeight: 500,
                                                                                                        cursor: 'pointer',
                                                                                                        display: 'flex',
                                                                                                        alignItems: 'center',
                                                                                                        gap: '6px',
                                                                                                        alignSelf: 'flex-end',
                                                                                                    }}
                                                                                                >
                                                                                                    <Plus size={14} />
                                                                                                    {t('Add')}
                                                                                                </button>
                                                                                            </>
                                                                                        )}
                                                                                        {/* Refresh button */}
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                const sourceLocationId = transferData?.location_id?.[0]
                                                                                                searchLotsByProduct(move.product_id[0], sourceLocationId)
                                                                                            }}
                                                                                            disabled={lotSearchLoading}
                                                                                            title={t('Refresh available lots')}
                                                                                            style={{
                                                                                                padding: '8px',
                                                                                                borderRadius: '6px',
                                                                                                border: `1px solid ${colors.border}`,
                                                                                                background: 'transparent',
                                                                                                color: colors.textSecondary,
                                                                                                cursor: lotSearchLoading ? 'not-allowed' : 'pointer',
                                                                                                display: 'flex',
                                                                                                alignItems: 'center',
                                                                                                alignSelf: 'flex-end',
                                                                                            }}
                                                                                        >
                                                                                            <RefreshCw size={14} className={lotSearchLoading ? 'animate-spin' : ''} />
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* View mode - just show existing lots */}
                                                                        {isViewMode && relatedMoveLines.length === 0 && (
                                                                            <div style={{
                                                                                padding: '12px',
                                                                                textAlign: 'center',
                                                                                color: colors.textSecondary,
                                                                                fontSize: '0.8rem',
                                                                                fontStyle: 'italic',
                                                                            }}>
                                                                                {t('No lot/serial numbers assigned')}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )
                                            })}

                                            {/* Enhanced Inline Add Line Row */}
                                            {isAddingLine && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="add-line-container"
                                                    style={{
                                                        padding: '16px',
                                                        background: isDark ? `${colors.action}08` : `${colors.action}05`,
                                                        borderTop: `2px solid ${colors.action}`,
                                                        borderBottom: `1px solid ${colors.border}`,
                                                    }}
                                                >
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        marginBottom: '12px',
                                                    }}>
                                                        <Plus size={16} style={{ color: colors.action }} />
                                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.textPrimary }}>
                                                            {t('Add New Item')}
                                                        </span>
                                                    </div>

                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'flex-end',
                                                        gap: '12px',
                                                        flexWrap: 'wrap',
                                                    }}>
                                                        {/* Product Selection */}
                                                        <div ref={productSearchRef} style={{ flex: '1 1 250px', minWidth: '200px', position: 'relative' }}>
                                                            <label style={{ display: 'block', fontSize: '0.75rem', color: colors.textSecondary, marginBottom: '4px', fontWeight: 500 }}>
                                                                {t('Product')}
                                                            </label>
                                                            {newLineProductId ? (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '10px',
                                                                    padding: '8px 12px',
                                                                    background: colors.card,
                                                                    border: `1px solid ${colors.action}`,
                                                                    borderRadius: '8px',
                                                                }}>
                                                                    {renderProductImage(newLineProductId, 36)}
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                            {newLineProductName}
                                                                        </div>
                                                                        {newLineUomName && (
                                                                            <div style={{ fontSize: '0.7rem', color: colors.textSecondary }}>
                                                                                {newLineUomName}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            setNewLineProductId(null)
                                                                            setNewLineProductName('')
                                                                            setShowProductDropdown(true)
                                                                        }}
                                                                        style={{
                                                                            width: '24px',
                                                                            height: '24px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            background: colors.background,
                                                                            border: `1px solid ${colors.border}`,
                                                                            borderRadius: '6px',
                                                                            color: colors.textSecondary,
                                                                            cursor: 'pointer',
                                                                        }}
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div style={{ position: 'relative' }}>
                                                                        <Search
                                                                            size={16}
                                                                            style={{
                                                                                position: 'absolute',
                                                                                left: '12px',
                                                                                top: '50%',
                                                                                transform: 'translateY(-50%)',
                                                                                color: colors.textSecondary,
                                                                                zIndex: 1,
                                                                            }}
                                                                        />
                                                                        <input
                                                                            ref={productInputRef}
                                                                            type="text"
                                                                            placeholder={t('Search products...')}
                                                                            value={productSearchQuery}
                                                                            onChange={(e) => setProductSearchQuery(e.target.value)}
                                                                            onFocus={() => {
                                                                                setShowProductDropdown(true)
                                                                                if (productSearchResults.length === 0) {
                                                                                    searchProducts('')
                                                                                }
                                                                            }}
                                                                            autoFocus
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '10px 12px 10px 38px',
                                                                                border: `1px solid ${showProductDropdown ? colors.action : colors.border}`,
                                                                                borderRadius: '8px',
                                                                                background: colors.card,
                                                                                color: colors.textPrimary,
                                                                                fontSize: '0.875rem',
                                                                                outline: 'none',
                                                                                transition: 'border-color 0.2s',
                                                                            }}
                                                                        />
                                                                    </div>

                                                                    {/* Product Dropdown - Portal */}
                                                                    {showProductDropdown && dropdownPosition && createPortal(
                                                                        <div
                                                                            id="product-dropdown-portal"
                                                                            style={{
                                                                                position: 'fixed',
                                                                                top: dropdownPosition.top,
                                                                                left: dropdownPosition.left,
                                                                                width: dropdownPosition.width,
                                                                                maxHeight: '280px',
                                                                                overflow: 'auto',
                                                                                background: colors.card,
                                                                                border: `1px solid ${colors.border}`,
                                                                                borderRadius: '10px',
                                                                                boxShadow: isDark ? '0 12px 40px rgba(0,0,0,0.5)' : '0 12px 40px rgba(0,0,0,0.15)',
                                                                                zIndex: 99999,
                                                                            }}
                                                                        >
                                                                            {productSearchLoading ? (
                                                                                <div style={{ padding: '20px', textAlign: 'center', color: colors.textSecondary }}>
                                                                                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                                                                                    <div style={{ marginTop: '8px', fontSize: '0.8rem' }}>{t('Loading products...')}</div>
                                                                                </div>
                                                                            ) : productSearchResults.length > 0 ? (
                                                                                productSearchResults.map((product, idx) => (
                                                                                    <div
                                                                                        key={product.id}
                                                                                        onClick={() => selectProduct(product)}
                                                                                        style={{
                                                                                            padding: '10px 14px',
                                                                                            cursor: 'pointer',
                                                                                            borderBottom: idx < productSearchResults.length - 1 ? `1px solid ${colors.border}` : 'none',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '10px',
                                                                                            transition: 'background 0.15s',
                                                                                        }}
                                                                                        onMouseEnter={(e) => e.currentTarget.style.background = colors.background}
                                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                                    >
                                                                                        {renderProductImage(product.id, 36)}
                                                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                                {product.display_name || product.name}
                                                                                            </div>
                                                                                            {product.default_code && (
                                                                                                <div style={{ fontSize: '0.7rem', color: colors.textSecondary, fontFamily: 'monospace' }}>
                                                                                                    {product.default_code}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        {product.uom_id && (
                                                                                            <span style={{
                                                                                                fontSize: '0.7rem',
                                                                                                color: colors.textSecondary,
                                                                                                background: colors.background,
                                                                                                padding: '3px 8px',
                                                                                                borderRadius: '4px',
                                                                                                fontWeight: 500,
                                                                                            }}>
                                                                                                {product.uom_id[1]}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                ))
                                                                            ) : (
                                                                                <div style={{ padding: '20px', textAlign: 'center', color: colors.textSecondary }}>
                                                                                    <Box size={32} strokeWidth={1} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                                                                    <div style={{ fontSize: '0.85rem' }}>{t('No products found')}</div>
                                                                                </div>
                                                                            )}
                                                                        </div>,
                                                                        document.body
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Quantity Input */}
                                                        <div style={{ flex: '0 0 auto', minWidth: '100px' }}>
                                                            <label style={{ display: 'block', fontSize: '0.75rem', color: colors.textSecondary, marginBottom: '4px', fontWeight: 500 }}>
                                                                {t('Quantity')}
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={newLineQuantity}
                                                                onChange={(e) => setNewLineQuantity(Math.max(0.01, parseFloat(e.target.value) || 0))}
                                                                min={0.01}
                                                                step={1}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '10px 12px',
                                                                    textAlign: 'center',
                                                                    border: `1px solid ${colors.border}`,
                                                                    borderRadius: '8px',
                                                                    background: colors.card,
                                                                    color: colors.textPrimary,
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: 600,
                                                                    outline: 'none',
                                                                }}
                                                            />
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div style={{ flex: '0 0 auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <button
                                                                onClick={handleAddNewLine}
                                                                disabled={!newLineProductId}
                                                                style={{
                                                                    height: '40px',
                                                                    padding: '0 16px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    background: newLineProductId ? '#16a34a' : colors.border,
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    color: newLineProductId ? 'white' : colors.textSecondary,
                                                                    cursor: newLineProductId ? 'pointer' : 'not-allowed',
                                                                    fontSize: '0.85rem',
                                                                    fontWeight: 600,
                                                                    transition: 'all 0.2s',
                                                                }}
                                                            >
                                                                <Plus size={16} />
                                                                {t('Add')}
                                                            </button>
                                                            <button
                                                                onClick={cancelAddLine}
                                                                style={{
                                                                    height: '40px',
                                                                    padding: '0 12px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    background: 'transparent',
                                                                    border: `1px solid ${colors.border}`,
                                                                    borderRadius: '8px',
                                                                    color: colors.textSecondary,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                }}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Notes */}
                    {transferData?.note && (
                        <div className="transfer-notes" style={{ background: colors.card, borderColor: colors.border }}>
                            <div className="notes-header" style={{ background: colors.background, borderColor: colors.border }}>
                                <FileText size={16} style={{ color: colors.textSecondary }} />
                                <h3 style={{ color: colors.textSecondary }}>{t('Notes')}</h3>
                            </div>
                            <div
                                className="notes-content"
                                style={{ color: colors.textPrimary }}
                                dangerouslySetInnerHTML={{ __html: transferData.note }}
                            />
                        </div>
                    )}

                    {/* Documents Section */}
                    <div className="transfer-documents" style={{
                        background: colors.card,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '12px',
                        overflow: 'hidden',
                        marginTop: '12px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '14px 18px',
                            background: colors.background,
                            borderBottom: `1px solid ${colors.border}`,
                        }}>
                            <FileText size={18} style={{ color: colors.action }} />
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: colors.textPrimary }}>
                                {t('Documents')}
                            </h3>
                            <span style={{
                                fontSize: '0.8rem',
                                color: colors.textSecondary,
                                background: colors.mutedBg,
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontWeight: 500,
                            }}>
                                {existingReports.length}
                            </span>
                        </div>

                        <div style={{ padding: '16px 18px' }}>
                            {existingReports.length === 0 ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '32px 20px',
                                    color: colors.textSecondary,
                                }}>
                                    <img src={pdfIcon} alt="PDF" style={{ width: 48, height: 48, opacity: 0.3, marginBottom: '12px' }} />
                                    <span style={{ fontSize: '0.9rem' }}>{t('No documents')}</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {existingReports.map((report: any) => {
                                        const filename = `${report.template_key || 'document'}_${transferData?.name || recordId}.pdf`
                                        const fileSize = report.pdf_size ? (report.pdf_size / 1024).toFixed(1) + ' KB' : ''
                                        return (
                                            <div
                                                key={report.id}
                                                onClick={() => downloadDocument(report.id, filename)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '16px',
                                                    padding: '16px 18px',
                                                    background: colors.background,
                                                    border: `1px solid ${colors.border}`,
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor = colors.action
                                                    e.currentTarget.style.background = `${colors.action}08`
                                                    e.currentTarget.style.transform = 'translateY(-1px)'
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.borderColor = colors.border
                                                    e.currentTarget.style.background = colors.background
                                                    e.currentTarget.style.transform = 'translateY(0)'
                                                    e.currentTarget.style.boxShadow = 'none'
                                                }}
                                            >
                                                {/* PDF Icon */}
                                                <div style={{
                                                    width: 52,
                                                    height: 52,
                                                    borderRadius: '10px',
                                                    background: '#FEF2F2',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <img src={pdfIcon} alt="PDF" style={{ width: 32, height: 32 }} />
                                                </div>

                                                {/* Document Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: '0.95rem',
                                                        fontWeight: 600,
                                                        color: colors.textPrimary,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        marginBottom: '4px',
                                                    }}>
                                                        {report.template_name || report.template_key || t('Document')}
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        fontSize: '0.8rem',
                                                        color: colors.textSecondary,
                                                    }}>
                                                        <span>
                                                            {report.created_at ? new Date(report.created_at).toLocaleDateString(i18n.language, {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) : '-'}
                                                        </span>
                                                        {fileSize && (
                                                            <>
                                                                <span style={{ opacity: 0.4 }}>•</span>
                                                                <span>{fileSize}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Download Button */}
                                                <div style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '10px',
                                                    background: `${colors.action}15`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <Download size={18} style={{ color: colors.action }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Generate Serials Modal */}
            <AnimatePresence>
                {generateSerialsModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999,
                            padding: '20px',
                        }}
                        onClick={() => setGenerateSerialsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: colors.card,
                                borderRadius: '16px',
                                padding: '24px',
                                maxWidth: '450px',
                                width: '100%',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '20px',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'rgba(168, 85, 247, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Zap size={20} style={{ color: '#a855f7' }} />
                                    </div>
                                    <div>
                                        <h3 style={{
                                            fontSize: '1.1rem',
                                            fontWeight: 600,
                                            color: colors.textPrimary,
                                            margin: 0,
                                        }}>
                                            {t('Generate Serial Numbers')}
                                        </h3>
                                        <p style={{
                                            fontSize: '0.8rem',
                                            color: colors.textSecondary,
                                            margin: 0,
                                        }}>
                                            {t('Auto-generate based on pattern')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setGenerateSerialsModalOpen(false)}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: colors.background,
                                        color: colors.textSecondary,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* First Serial Number */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        color: colors.textSecondary,
                                        marginBottom: '6px',
                                    }}>
                                        {t('First Serial Number')}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="SN-0001"
                                        value={firstSerialNumber}
                                        onChange={(e) => setFirstSerialNumber(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: `1px solid ${colors.border}`,
                                            background: colors.background,
                                            color: colors.textPrimary,
                                            fontSize: '0.9rem',
                                            fontFamily: 'monospace',
                                        }}
                                    />
                                    <p style={{
                                        fontSize: '0.75rem',
                                        color: colors.textSecondary,
                                        margin: '6px 0 0',
                                    }}>
                                        {t('Pattern: prefix + number (e.g., SN-0001 generates SN-0001, SN-0002...)')}
                                    </p>
                                </div>

                                {/* Number of Serials */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        color: colors.textSecondary,
                                        marginBottom: '6px',
                                    }}>
                                        {t('Number of Serial Numbers')}
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={numberOfSerials}
                                        onChange={(e) => setNumberOfSerials(Math.max(1, parseInt(e.target.value) || 1))}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: `1px solid ${colors.border}`,
                                            background: colors.background,
                                            color: colors.textPrimary,
                                            fontSize: '0.9rem',
                                        }}
                                    />
                                </div>

                                {/* Keep Current Lines Checkbox */}
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    background: colors.background,
                                    cursor: 'pointer',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={keepCurrentLines}
                                        onChange={(e) => setKeepCurrentLines(e.target.checked)}
                                        style={{
                                            width: '18px',
                                            height: '18px',
                                            accentColor: colors.action,
                                        }}
                                    />
                                    <div>
                                        <span style={{
                                            fontSize: '0.85rem',
                                            color: colors.textPrimary,
                                            fontWeight: 500,
                                        }}>
                                            {t('Keep existing serial numbers')}
                                        </span>
                                        <p style={{
                                            fontSize: '0.75rem',
                                            color: colors.textSecondary,
                                            margin: '2px 0 0',
                                        }}>
                                            {t('Add new serials without removing existing ones')}
                                        </p>
                                    </div>
                                </label>

                                {/* Preview */}
                                {firstSerialNumber.trim() && (
                                    <div style={{
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        background: isDark ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.05)',
                                        border: `1px solid rgba(168, 85, 247, 0.2)`,
                                    }}>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: '#a855f7',
                                            marginBottom: '8px',
                                            textTransform: 'uppercase',
                                        }}>
                                            {t('Preview')}
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '6px',
                                        }}>
                                            {(() => {
                                                const match = firstSerialNumber.match(/^(.*?)(\d+)$/)
                                                let prefix = ''
                                                let startNum = 1
                                                let numDigits = 4
                                                if (match) {
                                                    prefix = match[1]
                                                    startNum = parseInt(match[2], 10)
                                                    numDigits = match[2].length
                                                } else {
                                                    prefix = firstSerialNumber.trim()
                                                }
                                                const previews = []
                                                for (let i = 0; i < Math.min(numberOfSerials, 5); i++) {
                                                    const serialNum = (startNum + i).toString().padStart(numDigits, '0')
                                                    previews.push(`${prefix}${match ? serialNum : (i + 1).toString().padStart(4, '0')}`)
                                                }
                                                if (numberOfSerials > 5) {
                                                    previews.push('...')
                                                }
                                                return previews.map((sn, i) => (
                                                    <span
                                                        key={i}
                                                        style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            background: colors.card,
                                                            fontSize: '0.8rem',
                                                            fontFamily: 'monospace',
                                                            color: colors.textPrimary,
                                                        }}
                                                    >
                                                        {sn}
                                                    </span>
                                                ))
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                marginTop: '24px',
                            }}>
                                <button
                                    onClick={() => setGenerateSerialsModalOpen(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px 20px',
                                        borderRadius: '10px',
                                        border: `1px solid ${colors.border}`,
                                        background: 'transparent',
                                        color: colors.textPrimary,
                                        fontSize: '0.9rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {t('Cancel')}
                                </button>
                                <button
                                    onClick={handleGenerateSerials}
                                    disabled={!firstSerialNumber.trim()}
                                    style={{
                                        flex: 1,
                                        padding: '12px 20px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: firstSerialNumber.trim() ? '#a855f7' : colors.border,
                                        color: firstSerialNumber.trim() ? '#fff' : colors.textSecondary,
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        cursor: firstSerialNumber.trim() ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <Zap size={16} />
                                    {t('Generate')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast */}
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </div>
    )
}

export default TransferRecordPage
