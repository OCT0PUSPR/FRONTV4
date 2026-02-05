"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
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
    Layers,
    Calendar,
    User,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    Play,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    Plus,
    Check,
    Ban,
    Truck,
    MapPin,
    Save,
    Search,
    X,
    Package,
    RefreshCw,
    Trash2,
    AlertTriangle
} from "lucide-react"
import "./TransferRecordPage.css"

// Status configuration for batch transfers
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: any }> = {
    draft: {
        bg: 'rgba(113, 128, 150, 0.12)',
        text: '#64748b',
        label: 'Draft',
        icon: FileText
    },
    in_progress: {
        bg: 'rgba(59, 130, 246, 0.12)',
        text: '#2563eb',
        label: 'In Progress',
        icon: Clock
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

interface BatchData {
    id: number
    name: string
    state: string
    description: string | false
    user_id: [number, string] | false
    company_id: [number, string] | false
    picking_type_id: [number, string] | false
    picking_type_code?: string
    scheduled_date: string | false
    is_wave: boolean
    picking_ids: number[]
    move_ids: number[]
    move_line_ids: number[]
    vehicle_id: [number, string] | false
    vehicle_category_id: [number, string] | false
    dock_id: [number, string] | false
}

interface PickingData {
    id: number
    name: string
    state: string
    partner_id: [number, string] | false
    location_id: [number, string] | false
    location_dest_id: [number, string] | false
    scheduled_date: string | false
    origin: string | false
    move_ids: number[]
}

interface BatchRecordPageProps {
    pageTitle?: string
    backRoute?: string
    recordId?: number | null
    isSidebar?: boolean
    onClose?: () => void
    onDataChange?: () => void
    isWave?: boolean
}

export function BatchRecordPage({
    pageTitle,
    backRoute,
    recordId: propRecordId,
    isSidebar = false,
    onClose,
    onDataChange,
    isWave = false
}: BatchRecordPageProps) {
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
    const [batchData, setBatchData] = useState<BatchData | null>(null)
    const [pickings, setPickings] = useState<PickingData[]>([])
    const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
    const [executingAction, setExecutingAction] = useState<string | null>(null)
    const [pickingsExpanded, setPickingsExpanded] = useState(true)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    // Form state for creation/editing
    const [description, setDescription] = useState('')
    const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().slice(0, 16))
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
    const [selectedPickingTypeId, setSelectedPickingTypeId] = useState<number | null>(null)
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null)
    const [selectedDockId, setSelectedDockId] = useState<number | null>(null)

    // Options for dropdowns
    const [userOptions, setUserOptions] = useState<Array<{ id: number; name: string }>>([])
    const [pickingTypeOptions, setPickingTypeOptions] = useState<Array<{ id: number; name: string; code: string }>>([])
    const [vehicleOptions, setVehicleOptions] = useState<Array<{ id: number; name: string }>>([])
    const [dockOptions, setDockOptions] = useState<Array<{ id: number; name: string }>>([])
    const [availablePickings, setAvailablePickings] = useState<PickingData[]>([])

    // Search state for adding transfers
    const [pickingSearchQuery, setPickingSearchQuery] = useState('')
    const [showPickingDropdown, setShowPickingDropdown] = useState(false)
    const [pickingSearchLoading, setPickingSearchLoading] = useState(false)

    // Get tenant ID
    const getTenantId = () => localStorage.getItem('current_tenant_id')

    // Get headers
    const getHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        const tenantId = getTenantId()
        if (tenantId) headers['X-Tenant-ID'] = tenantId
        if (sessionId) {
            headers['X-Odoo-Session'] = sessionId
            headers['x-session-id'] = sessionId
        }
        if (uid) headers['x-user-id'] = uid
        const odooBase = localStorage.getItem('odooBase')
        const odooDb = localStorage.getItem('odooDb')
        if (odooBase) headers['x-odoo-base'] = odooBase
        if (odooDb) headers['x-odoo-db'] = odooDb
        return headers
    }, [sessionId, uid])

    // Check if editing is allowed based on state
    const canEdit = (state: string) => {
        return ['draft', 'in_progress'].includes(state)
    }

    const canAddPickings = (state: string) => {
        return ['draft', 'in_progress'].includes(state)
    }

    // Fetch batch data
    const fetchBatchData = useCallback(async () => {
        if (!sessionId || !recordId) {
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const executeUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking.batch/execute`
            const res = await fetch(executeUrl, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'read',
                    args: [[recordId]],
                    kwargs: {
                        fields: [
                            'name', 'state', 'description', 'user_id', 'company_id',
                            'picking_type_id', 'scheduled_date', 'is_wave', 'picking_ids',
                            'move_ids', 'move_line_ids', 'vehicle_id', 'vehicle_category_id', 'dock_id'
                        ]
                    }
                })
            })
            const data = await res.json()

            if (data.success && data.result && data.result.length > 0) {
                const batch = data.result[0]
                setBatchData(batch)
                setDescription(batch.description || '')
                setScheduledDate(batch.scheduled_date ? batch.scheduled_date.slice(0, 16) : '')
                setSelectedUserId(batch.user_id ? batch.user_id[0] : null)
                setSelectedPickingTypeId(batch.picking_type_id ? batch.picking_type_id[0] : null)
                setSelectedVehicleId(batch.vehicle_id ? batch.vehicle_id[0] : null)
                setSelectedDockId(batch.dock_id ? batch.dock_id[0] : null)

                // Fetch associated pickings
                if (batch.picking_ids && batch.picking_ids.length > 0) {
                    await fetchPickings(batch.picking_ids)
                }
            } else {
                setToast({ text: t('Batch not found'), state: 'error' })
            }
        } catch (error) {
            console.error('Error fetching batch:', error)
            setToast({ text: t('Error loading batch'), state: 'error' })
        } finally {
            setLoading(false)
        }
    }, [sessionId, recordId, getHeaders, t])

    // Fetch pickings by IDs
    const fetchPickings = async (pickingIds: number[]) => {
        if (!sessionId || pickingIds.length === 0) return

        try {
            const executeUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking/execute`
            const res = await fetch(executeUrl, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'read',
                    args: [pickingIds],
                    kwargs: {
                        fields: ['id', 'name', 'state', 'partner_id', 'location_id', 'location_dest_id', 'scheduled_date', 'origin', 'move_ids']
                    }
                })
            })
            const data = await res.json()

            if (data.success && data.result) {
                setPickings(data.result)
            }
        } catch (error) {
            console.error('Error fetching pickings:', error)
        }
    }

    // Fetch dropdown options
    const fetchOptions = useCallback(async () => {
        if (!sessionId) return

        try {
            // Fetch users
            const usersRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/res.users/execute`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'search_read',
                    args: [[['active', '=', true]]],
                    kwargs: { fields: ['id', 'name'], limit: 100 }
                })
            })
            const usersData = await usersRes.json()
            if (usersData.success && usersData.result) {
                setUserOptions(usersData.result)
            }

            // Fetch picking types
            const typesRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking.type/execute`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'search_read',
                    args: [[]],
                    kwargs: { fields: ['id', 'name', 'code'], limit: 100 }
                })
            })
            const typesData = await typesRes.json()
            if (typesData.success && typesData.result) {
                setPickingTypeOptions(typesData.result)
            }

            // Fetch vehicles (optional - may not be installed)
            try {
                const vehiclesRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/fleet.vehicle/execute`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        method: 'search_read',
                        args: [[['active', '=', true]]],
                        kwargs: { fields: ['id', 'name'], limit: 100 }
                    })
                })
                const vehiclesData = await vehiclesRes.json()
                if (vehiclesData.success && vehiclesData.result) {
                    setVehicleOptions(vehiclesData.result)
                }
            } catch (e) {
                // Fleet module may not be installed
            }

            // Fetch dock locations
            const docksRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.location/execute`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'search_read',
                    args: [[['usage', '=', 'internal']]],
                    kwargs: { fields: ['id', 'complete_name'], limit: 200 }
                })
            })
            const docksData = await docksRes.json()
            if (docksData.success && docksData.result) {
                setDockOptions(docksData.result.map((d: any) => ({ id: d.id, name: d.complete_name || d.name })))
            }
        } catch (error) {
            console.error('Error fetching options:', error)
        }
    }, [sessionId, getHeaders])

    // Search available pickings to add
    const searchAvailablePickings = useCallback(async (query: string) => {
        if (!sessionId) return

        setPickingSearchLoading(true)
        try {
            // Get pickings that are not in a batch and match the picking type
            const domain: any[] = [
                ['batch_id', '=', false],
                ['state', 'not in', ['done', 'cancel']]
            ]
            if (selectedPickingTypeId) {
                domain.push(['picking_type_id', '=', selectedPickingTypeId])
            }
            if (query) {
                domain.push('|')
                domain.push(['name', 'ilike', query])
                domain.push(['origin', 'ilike', query])
            }

            const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking/execute`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'search_read',
                    args: [domain],
                    kwargs: {
                        fields: ['id', 'name', 'state', 'partner_id', 'location_id', 'location_dest_id', 'scheduled_date', 'origin'],
                        limit: 50
                    }
                })
            })
            const data = await res.json()

            if (data.success && data.result) {
                setAvailablePickings(data.result)
            }
        } catch (error) {
            console.error('Error searching pickings:', error)
        } finally {
            setPickingSearchLoading(false)
        }
    }, [sessionId, getHeaders, selectedPickingTypeId])

    // Add picking to batch
    const addPickingToBatch = async (pickingId: number) => {
        if (!recordId || !sessionId) return

        try {
            const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking/execute`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'write',
                    args: [[pickingId], { batch_id: recordId }],
                    kwargs: {}
                })
            })
            const data = await res.json()

            if (data.success) {
                setToast({ text: t('Transfer added to batch'), state: 'success' })
                // Refresh batch data
                await fetchBatchData()
                onDataChange?.()
            } else {
                setToast({ text: t('Error adding transfer'), state: 'error' })
            }
        } catch (error) {
            console.error('Error adding picking:', error)
            setToast({ text: t('Error adding transfer'), state: 'error' })
        }
    }

    // Remove picking from batch
    const removePickingFromBatch = async (pickingId: number) => {
        if (!sessionId) return

        try {
            const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking/execute`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method: 'write',
                    args: [[pickingId], { batch_id: false }],
                    kwargs: {}
                })
            })
            const data = await res.json()

            if (data.success) {
                setToast({ text: t('Transfer removed from batch'), state: 'success' })
                setPickings(prev => prev.filter(p => p.id !== pickingId))
                onDataChange?.()
            } else {
                setToast({ text: t('Error removing transfer'), state: 'error' })
            }
        } catch (error) {
            console.error('Error removing picking:', error)
            setToast({ text: t('Error removing transfer'), state: 'error' })
        }
    }

    // Execute batch action (confirm, done, cancel)
    const executeBatchAction = async (action: string) => {
        if (!recordId || !sessionId) return

        setExecutingAction(action)
        try {
            let method = ''
            switch (action) {
                case 'confirm':
                    method = 'action_confirm'
                    break
                case 'done':
                    method = 'action_done'
                    break
                case 'cancel':
                    method = 'action_cancel'
                    break
                case 'draft':
                    method = 'action_set_draft'
                    break
                default:
                    return
            }

            const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking.batch/execute`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    method,
                    args: [[recordId]],
                    kwargs: {}
                })
            })
            const data = await res.json()

            if (data.success) {
                setToast({ text: t(`Batch ${action} successful`), state: 'success' })
                await fetchBatchData()
                onDataChange?.()
            } else {
                setToast({ text: data.error || t('Action failed'), state: 'error' })
            }
        } catch (error) {
            console.error('Error executing action:', error)
            setToast({ text: t('Action failed'), state: 'error' })
        } finally {
            setExecutingAction(null)
        }
    }

    // Save batch changes
    const handleSaveChanges = async () => {
        if (!recordId || !sessionId) return

        setSaving(true)
        try {
            const updateData: any = {}
            if (description !== (batchData?.description || '')) {
                updateData.description = description || false
            }
            if (scheduledDate && scheduledDate !== (typeof batchData?.scheduled_date === 'string' ? batchData.scheduled_date.slice(0, 16) : '')) {
                updateData.scheduled_date = scheduledDate
            }
            if (selectedUserId !== (batchData?.user_id ? batchData.user_id[0] : null)) {
                updateData.user_id = selectedUserId || false
            }
            if (selectedVehicleId !== (batchData?.vehicle_id ? batchData.vehicle_id[0] : null)) {
                updateData.vehicle_id = selectedVehicleId || false
            }
            if (selectedDockId !== (batchData?.dock_id ? batchData.dock_id[0] : null)) {
                updateData.dock_id = selectedDockId || false
            }

            if (Object.keys(updateData).length === 0) {
                setToast({ text: t('No changes to save'), state: 'error' })
                setSaving(false)
                return
            }

            const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking.batch/${recordId}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(updateData)
            })
            const data = await res.json()

            if (data.success) {
                setToast({ text: t('Batch updated successfully'), state: 'success' })
                setHasUnsavedChanges(false)
                await fetchBatchData()
                onDataChange?.()
            } else {
                setToast({ text: data.error || t('Error saving batch'), state: 'error' })
            }
        } catch (error) {
            console.error('Error saving batch:', error)
            setToast({ text: t('Error saving batch'), state: 'error' })
        } finally {
            setSaving(false)
        }
    }

    // Create new batch
    const handleCreateBatch = async () => {
        if (!sessionId) return

        setSaving(true)
        try {
            const createData: any = {
                is_wave: isWave,
            }
            if (description) createData.description = description
            if (scheduledDate) createData.scheduled_date = scheduledDate
            if (selectedUserId) createData.user_id = selectedUserId
            if (selectedPickingTypeId) createData.picking_type_id = selectedPickingTypeId
            if (selectedVehicleId) createData.vehicle_id = selectedVehicleId
            if (selectedDockId) createData.dock_id = selectedDockId

            const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking.batch`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(createData)
            })
            const data = await res.json()

            if (data.success && data.id) {
                setToast({ text: t('Batch created successfully'), state: 'success' })
                onDataChange?.()
                // Navigate to the new batch
                const basePath = isWave ? '/wave' : '/batch'
                navigate(`${basePath}/edit/${data.id}`)
            } else {
                setToast({ text: data.error || t('Error creating batch'), state: 'error' })
            }
        } catch (error) {
            console.error('Error creating batch:', error)
            setToast({ text: t('Error creating batch'), state: 'error' })
        } finally {
            setSaving(false)
        }
    }

    // Load data on mount
    useEffect(() => {
        if (recordId) {
            fetchBatchData()
        } else {
            setLoading(false)
        }
        fetchOptions()
    }, [recordId, fetchBatchData, fetchOptions])

    // Get status config
    const statusConfig = STATUS_CONFIG[batchData?.state || 'draft'] || STATUS_CONFIG.draft
    const StatusIcon = statusConfig.icon

    // Format date for display
    const formatDate = (dateStr: string | false) => {
        if (!dateStr) return '—'
        const date = new Date(dateStr)
        return date.toLocaleDateString(i18n.language, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Get picking state style
    const getPickingStateStyle = (state: string) => {
        switch (state) {
            case 'done':
                return { bg: 'rgba(16, 185, 129, 0.15)', text: '#059669' }
            case 'assigned':
                return { bg: 'rgba(34, 197, 94, 0.12)', text: '#16a34a' }
            case 'confirmed':
            case 'waiting':
                return { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb' }
            case 'draft':
                return { bg: 'rgba(113, 128, 150, 0.12)', text: '#64748b' }
            case 'cancel':
                return { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626' }
            default:
                return { bg: 'rgba(113, 128, 150, 0.12)', text: '#64748b' }
        }
    }

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: isSidebar ? '100%' : '100vh',
                background: colors.background,
            }}>
                <Loader2 size={32} className="animate-spin" style={{ color: colors.action }} />
            </div>
        )
    }

    return (
        <div
            className="transfer-record-page"
            style={{
                background: colors.background,
                minHeight: isSidebar ? '100%' : '100vh',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <div
                className="record-header"
                style={{
                    background: colors.card,
                    borderBottom: `1px solid ${colors.border}`,
                    padding: '16px 24px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {!isSidebar && (
                            <button
                                onClick={() => navigate(backRoute || (isWave ? '/wave' : '/batch'))}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: colors.textSecondary,
                                }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h1 style={{
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                color: colors.textPrimary,
                                margin: 0,
                            }}>
                                {isCreating
                                    ? t(isWave ? 'New Wave Transfer' : 'New Batch Transfer')
                                    : batchData?.name || t('Batch')}
                            </h1>
                            {!isCreating && batchData && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 12px',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: statusConfig.bg,
                                            color: statusConfig.text,
                                        }}
                                    >
                                        <StatusIcon size={12} />
                                        {t(statusConfig.label)}
                                    </span>
                                    {batchData.is_wave && (
                                        <span
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: 'rgba(168, 85, 247, 0.15)',
                                                color: '#a855f7',
                                            }}
                                        >
                                            {t('Wave')}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isCreating ? (
                            <button
                                onClick={handleCreateBatch}
                                disabled={saving}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: colors.action,
                                    color: '#fff',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.7 : 1,
                                }}
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                {t('Create')}
                            </button>
                        ) : (
                            <>
                                {/* State-specific action buttons */}
                                {batchData?.state === 'draft' && (
                                    <button
                                        onClick={() => executeBatchAction('confirm')}
                                        disabled={!!executingAction}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 16px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                            color: '#fff',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            cursor: executingAction ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {executingAction === 'confirm' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                        {t('Confirm')}
                                    </button>
                                )}
                                {batchData?.state === 'in_progress' && (
                                    <button
                                        onClick={() => executeBatchAction('done')}
                                        disabled={!!executingAction}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 16px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: '#fff',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            cursor: executingAction ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {executingAction === 'done' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        {t('Validate')}
                                    </button>
                                )}
                                {['draft', 'in_progress'].includes(batchData?.state || '') && (
                                    <button
                                        onClick={() => executeBatchAction('cancel')}
                                        disabled={!!executingAction}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 16px',
                                            borderRadius: '10px',
                                            border: `1px solid ${colors.border}`,
                                            background: 'transparent',
                                            color: colors.textSecondary,
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            cursor: executingAction ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {executingAction === 'cancel' ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                                        {t('Cancel')}
                                    </button>
                                )}
                                {batchData?.state === 'cancel' && (
                                    <button
                                        onClick={() => executeBatchAction('draft')}
                                        disabled={!!executingAction}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 16px',
                                            borderRadius: '10px',
                                            border: `1px solid ${colors.border}`,
                                            background: 'transparent',
                                            color: colors.textSecondary,
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            cursor: executingAction ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {executingAction === 'draft' ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                                        {t('Set to Draft')}
                                    </button>
                                )}

                                {/* Save button */}
                                {!isViewMode && canEdit(batchData?.state || '') && hasUnsavedChanges && (
                                    <button
                                        onClick={handleSaveChanges}
                                        disabled={saving}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 16px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: colors.action,
                                            color: '#fff',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            cursor: saving ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        {t('Save')}
                                    </button>
                                )}
                            </>
                        )}

                        {isSidebar && onClose && (
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: colors.textSecondary,
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                {/* Batch Information Section */}
                <div
                    style={{
                        background: colors.card,
                        borderRadius: '16px',
                        padding: '24px',
                        marginBottom: '24px',
                        border: `1px solid ${colors.border}`,
                    }}
                >
                    <h2 style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: colors.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '20px',
                    }}>
                        {t('Batch Information')}
                    </h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '20px',
                    }}>
                        {/* Description */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: colors.textSecondary,
                                marginBottom: '8px',
                            }}>
                                {t('Description')}
                            </label>
                            {isViewMode ? (
                                <p style={{ fontSize: '0.9rem', color: colors.textPrimary }}>
                                    {batchData?.description || '—'}
                                </p>
                            ) : (
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => {
                                        setDescription(e.target.value)
                                        setHasUnsavedChanges(true)
                                    }}
                                    placeholder={t('Enter description...')}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: `1px solid ${colors.border}`,
                                        background: colors.background,
                                        color: colors.textPrimary,
                                        fontSize: '0.9rem',
                                    }}
                                />
                            )}
                        </div>

                        {/* Scheduled Date */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: colors.textSecondary,
                                marginBottom: '8px',
                            }}>
                                {t('Scheduled Date')}
                            </label>
                            {isViewMode ? (
                                <p style={{ fontSize: '0.9rem', color: colors.textPrimary }}>
                                    {formatDate(batchData?.scheduled_date || false)}
                                </p>
                            ) : (
                                <input
                                    type="datetime-local"
                                    value={scheduledDate}
                                    onChange={(e) => {
                                        setScheduledDate(e.target.value)
                                        setHasUnsavedChanges(true)
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: `1px solid ${colors.border}`,
                                        background: colors.background,
                                        color: colors.textPrimary,
                                        fontSize: '0.9rem',
                                    }}
                                />
                            )}
                        </div>

                        {/* Responsible */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: colors.textSecondary,
                                marginBottom: '8px',
                            }}>
                                {t('Responsible')}
                            </label>
                            {isViewMode ? (
                                <p style={{ fontSize: '0.9rem', color: colors.textPrimary }}>
                                    {batchData?.user_id ? batchData.user_id[1] : '—'}
                                </p>
                            ) : (
                                <select
                                    value={selectedUserId || ''}
                                    onChange={(e) => {
                                        setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)
                                        setHasUnsavedChanges(true)
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: `1px solid ${colors.border}`,
                                        background: colors.background,
                                        color: colors.textPrimary,
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    <option value="">{t('Select...')}</option>
                                    {userOptions.map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Operation Type (only for creation) */}
                        {isCreating && (
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    color: colors.textSecondary,
                                    marginBottom: '8px',
                                }}>
                                    {t('Operation Type')}
                                </label>
                                <select
                                    value={selectedPickingTypeId || ''}
                                    onChange={(e) => setSelectedPickingTypeId(e.target.value ? parseInt(e.target.value) : null)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: `1px solid ${colors.border}`,
                                        background: colors.background,
                                        color: colors.textPrimary,
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    <option value="">{t('Select...')}</option>
                                    {pickingTypeOptions.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Operation Type (display for view/edit) */}
                        {!isCreating && batchData?.picking_type_id && (
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    color: colors.textSecondary,
                                    marginBottom: '8px',
                                }}>
                                    {t('Operation Type')}
                                </label>
                                <p style={{ fontSize: '0.9rem', color: colors.textPrimary }}>
                                    {batchData.picking_type_id[1]}
                                </p>
                            </div>
                        )}

                        {/* Vehicle */}
                        {vehicleOptions.length > 0 && (
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    color: colors.textSecondary,
                                    marginBottom: '8px',
                                }}>
                                    {t('Vehicle')}
                                </label>
                                {isViewMode ? (
                                    <p style={{ fontSize: '0.9rem', color: colors.textPrimary }}>
                                        {batchData?.vehicle_id ? batchData.vehicle_id[1] : '—'}
                                    </p>
                                ) : (
                                    <select
                                        value={selectedVehicleId || ''}
                                        onChange={(e) => {
                                            setSelectedVehicleId(e.target.value ? parseInt(e.target.value) : null)
                                            setHasUnsavedChanges(true)
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: `1px solid ${colors.border}`,
                                            background: colors.background,
                                            color: colors.textPrimary,
                                            fontSize: '0.9rem',
                                        }}
                                    >
                                        <option value="">{t('Select...')}</option>
                                        {vehicleOptions.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {/* Dock Location */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: colors.textSecondary,
                                marginBottom: '8px',
                            }}>
                                {t('Dock Location')}
                            </label>
                            {isViewMode ? (
                                <p style={{ fontSize: '0.9rem', color: colors.textPrimary }}>
                                    {batchData?.dock_id ? batchData.dock_id[1] : '—'}
                                </p>
                            ) : (
                                <select
                                    value={selectedDockId || ''}
                                    onChange={(e) => {
                                        setSelectedDockId(e.target.value ? parseInt(e.target.value) : null)
                                        setHasUnsavedChanges(true)
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: `1px solid ${colors.border}`,
                                        background: colors.background,
                                        color: colors.textPrimary,
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    <option value="">{t('Select...')}</option>
                                    {dockOptions.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                {/* Transfers Section */}
                {!isCreating && (
                    <div
                        style={{
                            background: colors.card,
                            borderRadius: '16px',
                            border: `1px solid ${colors.border}`,
                            overflow: 'hidden',
                        }}
                    >
                        {/* Section Header */}
                        <div
                            style={{
                                padding: '16px 24px',
                                borderBottom: `1px solid ${colors.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                            }}
                            onClick={() => setPickingsExpanded(!pickingsExpanded)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Package size={16} color="#fff" />
                                </div>
                                <div>
                                    <h3 style={{
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        color: colors.textPrimary,
                                        margin: 0,
                                    }}>
                                        {t('Transfers')}
                                    </h3>
                                    <p style={{
                                        fontSize: '0.75rem',
                                        color: colors.textSecondary,
                                        margin: 0,
                                    }}>
                                        {pickings.length} {t('transfer(s)')}
                                    </p>
                                </div>
                            </div>
                            {pickingsExpanded ? <ChevronUp size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
                        </div>

                        {/* Transfers List */}
                        <AnimatePresence>
                            {pickingsExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div style={{ padding: '16px 24px' }}>
                                        {/* Add Transfer Search */}
                                        {!isViewMode && canAddPickings(batchData?.state || '') && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '10px 14px',
                                                        borderRadius: '10px',
                                                        border: `1px solid ${showPickingDropdown ? colors.action : colors.border}`,
                                                        background: colors.background,
                                                    }}>
                                                        <Search size={16} color={colors.textSecondary} />
                                                        <input
                                                            type="text"
                                                            placeholder={t('Search transfers to add...')}
                                                            value={pickingSearchQuery}
                                                            onChange={(e) => setPickingSearchQuery(e.target.value)}
                                                            onFocus={() => {
                                                                setShowPickingDropdown(true)
                                                                searchAvailablePickings('')
                                                            }}
                                                            style={{
                                                                flex: 1,
                                                                border: 'none',
                                                                background: 'transparent',
                                                                color: colors.textPrimary,
                                                                fontSize: '0.875rem',
                                                                outline: 'none',
                                                            }}
                                                        />
                                                        {pickingSearchLoading && <Loader2 size={16} className="animate-spin" style={{ color: colors.textSecondary }} />}
                                                    </div>

                                                    {/* Dropdown */}
                                                    {showPickingDropdown && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                top: '100%',
                                                                left: 0,
                                                                right: 0,
                                                                marginTop: '4px',
                                                                background: colors.card,
                                                                border: `1px solid ${colors.border}`,
                                                                borderRadius: '10px',
                                                                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                                                maxHeight: '300px',
                                                                overflow: 'auto',
                                                                zIndex: 100,
                                                            }}
                                                        >
                                                            {availablePickings.length === 0 ? (
                                                                <div style={{
                                                                    padding: '16px',
                                                                    textAlign: 'center',
                                                                    color: colors.textSecondary,
                                                                    fontSize: '0.875rem',
                                                                }}>
                                                                    {pickingSearchLoading ? t('Loading...') : t('No available transfers found')}
                                                                </div>
                                                            ) : (
                                                                availablePickings.map(picking => (
                                                                    <div
                                                                        key={picking.id}
                                                                        onClick={() => {
                                                                            addPickingToBatch(picking.id)
                                                                            setShowPickingDropdown(false)
                                                                            setPickingSearchQuery('')
                                                                        }}
                                                                        style={{
                                                                            padding: '12px 16px',
                                                                            borderBottom: `1px solid ${colors.border}`,
                                                                            cursor: 'pointer',
                                                                            transition: 'background 0.2s',
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = colors.background}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                    >
                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                            <div>
                                                                                <div style={{
                                                                                    fontSize: '0.875rem',
                                                                                    fontWeight: 600,
                                                                                    color: colors.textPrimary,
                                                                                }}>
                                                                                    {picking.name}
                                                                                </div>
                                                                                <div style={{
                                                                                    fontSize: '0.75rem',
                                                                                    color: colors.textSecondary,
                                                                                }}>
                                                                                    {picking.partner_id ? picking.partner_id[1] : ''} • {picking.origin || ''}
                                                                                </div>
                                                                            </div>
                                                                            <Plus size={16} color={colors.action} />
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Pickings List */}
                                        {pickings.length === 0 ? (
                                            <div style={{
                                                padding: '40px',
                                                textAlign: 'center',
                                                color: colors.textSecondary,
                                            }}>
                                                <Package size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                                <p style={{ fontSize: '0.9rem' }}>{t('No transfers in this batch')}</p>
                                                {!isViewMode && canAddPickings(batchData?.state || '') && (
                                                    <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>
                                                        {t('Search and add transfers above')}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {pickings.map(picking => {
                                                    const stateStyle = getPickingStateStyle(picking.state)
                                                    return (
                                                        <div
                                                            key={picking.id}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                padding: '12px 16px',
                                                                background: colors.background,
                                                                borderRadius: '10px',
                                                                border: `1px solid ${colors.border}`,
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{
                                                                    width: '36px',
                                                                    height: '36px',
                                                                    borderRadius: '8px',
                                                                    background: stateStyle.bg,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}>
                                                                    <Truck size={16} style={{ color: stateStyle.text }} />
                                                                </div>
                                                                <div>
                                                                    <div style={{
                                                                        fontSize: '0.875rem',
                                                                        fontWeight: 600,
                                                                        color: colors.textPrimary,
                                                                    }}>
                                                                        {picking.name}
                                                                    </div>
                                                                    <div style={{
                                                                        fontSize: '0.75rem',
                                                                        color: colors.textSecondary,
                                                                    }}>
                                                                        {picking.location_id?.[1]} → {picking.location_dest_id?.[1]}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <span style={{
                                                                    padding: '4px 10px',
                                                                    borderRadius: '999px',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 600,
                                                                    background: stateStyle.bg,
                                                                    color: stateStyle.text,
                                                                    textTransform: 'capitalize',
                                                                }}>
                                                                    {picking.state.replace('_', ' ')}
                                                                </span>
                                                                {!isViewMode && canAddPickings(batchData?.state || '') && (
                                                                    <button
                                                                        onClick={() => removePickingFromBatch(picking.id)}
                                                                        style={{
                                                                            padding: '6px',
                                                                            borderRadius: '6px',
                                                                            border: 'none',
                                                                            background: 'transparent',
                                                                            color: colors.textSecondary,
                                                                            cursor: 'pointer',
                                                                        }}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </div>
    )
}

export default BatchRecordPage
