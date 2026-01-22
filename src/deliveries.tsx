"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useLocation, matchPath } from "react-router-dom"
import { useTheme } from "../context/theme"
import { Plus, Truck, Clock, CheckCircle2, FileText, AlertCircle, XCircle, RefreshCcw, Edit, Printer, RotateCcw, Trash2, Eye, type LucideIcon } from "lucide-react"
import { TransferSidebar } from "./components/TransferSidebar"
import { TransferRecordPage } from "./pages/TransferRecordPage"
import { Button } from "../@/components/ui/button"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import { Skeleton } from "@mui/material"

import { StatCard } from "./components/StatCard"
import { DeliveryCard } from "./components/DeliveryCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { TransfersTable, ColumnDef, type ActionItem } from "./components/TransfersTable"
import Toast from "./components/Toast"
import Alert from "./components/Alert"
import { useSmartFieldRecords } from "./hooks/useSmartFieldRecords"
import { generateColumnsFromFields } from "./utils/generateColumnsFromFields"

function mapPickingToDeliveryCard(p: any) {
  const stateMap: Record<string, string> = {
    done: "Done",
    assigned: "Ready",
    confirmed: "Waiting",
    waiting: "Waiting",
    draft: "Draft",
    cancel: "Cancelled",
  }
  const operationsCount = Array.isArray(p.move_line_ids)
    ? p.move_line_ids.length
    : Array.isArray(p.move_lines)
      ? p.move_lines.length
      : 0
  return {
    id: p.id,
    reference: p.name,
    deliveryAddress: p.partner_id?.[1] || "Customer",
    sourceLocation: p.location_id?.[1] || "",
    scheduledDate: p.scheduled_date || p.scheduled_date_deadline || "",
    sourceDocument: p.origin || "",
    batchTransfer: p.batch_id?.[1] || "",
    status: stateMap[p.state] || p.state || "Draft",
    operations: new Array(operationsCount).fill(0),
  }
}

export default function TransferDeliveriesPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const navigate = useNavigate()
  const location = useLocation()
  const { colors, mode } = useTheme()
  const {
    stockPickingTypes,
    partners,
    locations,
    products,
    uom,
    productPackaging,
    refreshAllData,
    fetchData,
    loading,
  } = useData()
  const { sessionId } = useAuth()

  // Detect if we're on a view/edit subroute for sidebar display
  const viewMatch = matchPath('/deliveries/view/:id', location.pathname)
  const editMatch = matchPath('/deliveries/edit/:id', location.pathname)
  const createMatch = matchPath('/deliveries/create', location.pathname)
  const sidebarRecordId = viewMatch?.params?.id || editMatch?.params?.id
  const isSidebarCreateMode = !!createMatch
  const isSidebarOpen = !!sidebarRecordId || isSidebarCreateMode

  // Fetch records using SmartFieldSelector
  const { records: smartFieldRecords, fields: smartFields, columns: availableColumns, loading: smartFieldLoading, refetch: refetchSmartFields } = useSmartFieldRecords({
    modelName: 'stock.picking',
    pickingTypeCode: 'outgoing',
    enabled: !!sessionId,
  })
  const { canCreatePage, canEditPage, canExportPage, canDeletePage } = useCasl()
  const [isMobile, setIsMobile] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [toFilter, setToFilter] = useState<string[]>([])
  const [fromFilter, setFromFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<[string | null, string | null] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isSelectAll, setIsSelectAll] = useState<boolean | "indeterminate">(false)
  const [selectedPickingId, setSelectedPickingId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [pickingToDelete, setPickingToDelete] = useState<number | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  
  // Update visible columns when available columns change
  useEffect(() => {
    if (availableColumns.length > 0 && visibleColumns.length === 0) {
      // Set sensible default columns for stock.picking
      // Order: id, name (reference), location_id (from), location_dest_id (to), scheduled_date, state (status)
      const stockPickingPriorityFields = [
        'id',
        'name',
        'location_id',
        'location_dest_id',
        'scheduled_date',
        'state'
      ]

      const defaultCols: string[] = []

      // Add priority fields in order if they exist
      for (const field of stockPickingPriorityFields) {
        if (availableColumns.some(col => col.id === field)) {
          defaultCols.push(field)
        }
      }

      // If we have fewer than 6 columns, add more from available columns
      if (defaultCols.length < 6) {
        availableColumns.forEach(col => {
          if (!defaultCols.includes(col.id) && defaultCols.length < 6) {
            defaultCols.push(col.id)
          }
        })
      }

      setVisibleColumns(defaultCols)
    }
  }, [availableColumns, visibleColumns.length])
  const [dirty, setDirty] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [ops, setOps] = useState<
    Array<{ productId: number | null; packagingId: number | null; qty: string; uomId: number | null }>
  >([])
  const [form, setForm] = useState({
    partnerId: null as number | null,
    locationId: null as number | null,
    scheduledDate: "",
    pickingTypeId: null as number | null,
    origin: "",
    trackingRef: "",
    weightKg: "",
    note: "",
  })

  // Use records from SmartFieldSelector (already filtered by picking_type_code=outgoing)
  const deliveries = useMemo(() => {
    return smartFieldRecords.map(mapPickingToDeliveryCard)
  }, [smartFieldRecords])
  
  // Generate columns from SmartFieldSelector fields
  const tableColumns = useMemo(() => {
    if (smartFields.length === 0) {
      return [
        {
          id: "id",
          header: t("Delivery ID"),
          cell: ({ row }: any) => (
            <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 600 }}>
              #{row.original.id}
            </span>
          ),
        },
        {
          id: "reference",
          header: t("Reference"),
          cell: ({ row }: any) => (
            <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontFamily: "monospace" }}>
              {(row.original as any).reference || "—"}
            </span>
          ),
        },
      ]
    }
    return generateColumnsFromFields(smartFields, colors, t)
  }, [smartFields, colors, t, i18n?.language || 'en'])

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((delivery) => {
      const matchesSearch =
        delivery.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        delivery.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        delivery.sourceLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        delivery.sourceDocument.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(delivery.status)
      const matchesTo =
        toFilter.length === 0 || (delivery.deliveryAddress && toFilter.includes(delivery.deliveryAddress))
      const matchesFrom =
        fromFilter.length === 0 || (delivery.sourceLocation && fromFilter.includes(delivery.sourceLocation))

      // Date range filter
      let matchesDateRange = true
      if (dateRange && dateRange[0] && dateRange[1] && delivery.scheduledDate) {
        const deliveryDate = delivery.scheduledDate.slice(0, 10) // Get YYYY-MM-DD format
        matchesDateRange = deliveryDate >= dateRange[0] && deliveryDate <= dateRange[1]
      }

      return matchesSearch && matchesStatus && matchesTo && matchesFrom && matchesDateRange
    })
  }, [deliveries, searchQuery, statusFilter, toFilter, fromFilter, dateRange])

  // Filter smartFieldRecords to match filteredDeliveries for DataTable
  const filteredSmartFieldRecords = useMemo(() => {
    const filteredIds = new Set(filteredDeliveries.map(d => d.id))
    return smartFieldRecords.filter((r: any) => filteredIds.has(r.id))
  }, [smartFieldRecords, filteredDeliveries])

  // Pagination
  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDeliveries = filteredDeliveries.slice(startIndex, endIndex)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch data only once on mount if missing
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (hasFetchedRef.current) return
    if (!sessionId) return

    hasFetchedRef.current = true
    // Only fetch stockPickingTypes if missing (for filters)
    if (!Array.isArray(stockPickingTypes) || !stockPickingTypes.length) fetchData("stockPickingTypes")
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, toFilter, fromFilter, dateRange])

  const uniqueStatuses = Array.from(new Set(deliveries.map((d) => d.status)))
  const uniqueToLocations = Array.from(new Set(deliveries.map((d) => d.deliveryAddress).filter(Boolean)))
  const uniqueFromLocations = Array.from(new Set(deliveries.map((d) => d.sourceLocation).filter(Boolean)))

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("deliveries")) {
      return
    }
    // Determine data to export - use smartFieldRecords (actual API data)
    let dataToExport = smartFieldRecords
    if (options.scope === "selected") {
      dataToExport = smartFieldRecords.filter((r: any) => rowSelection[String(r.id)])
    } else if (options.scope === "page") {
      // For page scope, we need to filter by the current filtered and paginated records
      const filteredIds = new Set(filteredDeliveries.map(d => d.id))
      dataToExport = smartFieldRecords.filter((r: any) => filteredIds.has(r.id))
    }

    // Format date helper
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '-'
      const date = new Date(dateStr)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = String(date.getFullYear()).slice(-2)
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${day}/${month}/${year} ${hours}:${minutes}`
    }

    // Format value helper for different field types
    const formatValue = (value: any, fieldName: string): string => {
      if (value === null || value === undefined) return '-'
      
      // Handle state/status mapping to display labels
      if (fieldName === 'state' || fieldName === 'status') {
        const stateMap: Record<string, string> = {
          'draft': 'Draft',
          'waiting': 'Waiting Another Operation',
          'confirmed': 'Waiting',
          'assigned': 'Ready',
          'done': 'Done',
          'cancel': 'Cancelled',
        }
        const normalizedState = String(value).toLowerCase().trim()
        return stateMap[normalizedState] || String(value)
      }
      
      // Handle relation fields (many2one) - they come as [id, name] tuples
      if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number') {
        return String(value[1] || '-')
      }
      
      // Handle arrays (many2many)
      if (Array.isArray(value)) {
        return value.map(v => Array.isArray(v) ? v[1] : v).join(', ') || '-'
      }
      
      // Handle date fields
      if (fieldName.includes('date') || fieldName.includes('_at')) {
        return formatDate(String(value))
      }
      
      // Handle boolean
      if (typeof value === 'boolean') {
        return value ? t('Yes') : t('No')
      }
      
      return String(value)
    }

    // Ensure 'id' is first in visibleColumns for export
    const orderedVisibleColumns = visibleColumns.includes('id')
      ? ['id', ...visibleColumns.filter(col => col !== 'id')]
      : ['id', ...visibleColumns]

    // Generate export columns dynamically from visibleColumns and smartFields
    const exportColumns = orderedVisibleColumns.map(colId => {
      // Find the field definition from smartFields
      const field = smartFields.find((f: any) => (f.name || f.field_name) === colId)
      const label = field?.label || field?.field_label || availableColumns.find(c => c.id === colId)?.label || colId
      
      return {
        header: t(label),
        accessor: (row: any) => {
          const value = row[colId]
          if (colId === 'id') return `#${value}`
          return formatValue(value, colId)
        },
        isMonospace: colId === 'id',
        isBold: colId === 'id' || colId === 'name' || colId === 'display_name',
        isStatus: colId === 'status' || colId === 'state',
        align: "left" as const
      }
    }).filter(Boolean)

    const config = {
      title: t("Deliveries Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Total Items'), value: data.reduce((sum: number, r: any) => sum + (Array.isArray(r.move_line_ids) ? r.move_line_ids.length : 0), 0) },
        { label: t('Active Items'), value: data.filter((r: any) => r.state === 'assigned' || r.state === 'waiting' || r.state === 'confirmed').length },
        { label: t('Completed'), value: data.filter((r: any) => r.state === 'done').length }
      ]
    }

    exportData(options, dataToExport, config, dateRange)
    setIsExportModalOpen(false)
  }

  const totalDeliveries = deliveries.length
  const draftDeliveries = deliveries.filter((d) => d.status === "Draft").length
  const todayStr = new Date().toISOString().slice(0, 10)
  const scheduledToday = deliveries.filter((d) => (d.scheduledDate || "").slice(0, 10) === todayStr).length

  // Corrected variable name for completed count
  const completedTransfers = deliveries.filter((d) => d.status === "Done").length

  const openModal = (deliveryId: number) => {
    // Check edit permission before opening modal
    if (!canEditPage("deliveries")) {
      return
    }
    navigate(`/deliveries/edit/${deliveryId}`)
  }

  const handleNewDelivery = () => {
    navigate('/deliveries/create')
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedPickingId(null)
    setIsCreating(false)
    setDirty(false)
  }

  const handleCloseSidebar = () => {
    navigate('/deliveries')
    // Refresh data when sidebar closes
    refetchSmartFields()
  }

  const onChange = (updates: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...updates }))
    setDirty(true)
  }

  const uniqueStockPickingTypes = useMemo(() => {
    const seen = new Set<string>()
    const out: any[] = []
    for (const pt of stockPickingTypes || []) {
      const comp = Array.isArray(pt?.company_id) ? pt.company_id?.[1] : pt?.company_id
      const code = pt?.code
      const key = `${String(comp || "").trim()}::${String(code || "").trim()}`.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        out.push(pt)
      }
    }
    return out
  }, [stockPickingTypes])

  const onSave = async () => {
    const values: any = {
      partner_id: form.partnerId,
      scheduled_date: form.scheduledDate,
      picking_type_id: form.pickingTypeId,
      location_id: form.locationId,
      origin: form.origin,
      carrier_tracking_ref: form.trackingRef || null,
      weight: form.weightKg ? Number.parseFloat(form.weightKg) : null,
      note: form.note || null,
    }
    if (ops.length > 0) {
      values.move_ids_without_package = ops.map((op) => {
        const prod = (products || []).find((p: any) => p.id === op.productId)
        return {
          product_id: op.productId,
          product_uom_qty: Number.parseFloat(op.qty) || 0,
          product_uom: op.uomId,
          name: prod?.display_name || prod?.name || `Product ${op.productId}`,
        }
      })
    }
    const url = isCreating
      ? `${API_CONFIG.BACKEND_BASE_URL}/pickings/create`
      : `${API_CONFIG.BACKEND_BASE_URL}/pickings/${selectedPickingId}`
    const method = isCreating ? "POST" : "PUT"
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": sessionId || "",
      },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (res.ok && data?.success) {
      // Refresh SmartFieldSelector data after create/update
      await refetchSmartFields()
      if (isCreating) {
        setIsModalOpen(false)
        setShowSuccess(true)
      } else {
        closeModal()
      }
    }
  }

  // Get Odoo headers from localStorage
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem("odooBase") || "https://egy.thetalenter.net"
    const db = localStorage.getItem("odooDb") || "odoodb1"
    const headers: Record<string, string> = {}
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    // Include tenant ID for multi-tenant support
    const tenantId = localStorage.getItem('current_tenant_id')
    if (tenantId) headers['X-Tenant-ID'] = tenantId
    return headers
  }

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
  }


  const downloadBase64File = (base64: string, filename: string) => {
    try {
      const byteCharacters = atob(base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i)
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename || "document.pdf"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch { }
  }

  const validatePickingAction = async (pickingId: number) => {
    if (!sessionId || !pickingId) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/${pickingId}/validate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || "Validate failed")
      refetchSmartFields()
    } catch { }
  }

  const printPickingAction = async (pickingId: number) => {
    if (!pickingId || !sessionId) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      
      // Fetch PDF from backend proxy (which uses the direct Odoo URL)
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/${pickingId}/print`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch PDF')
      }
      
      // Get PDF blob
      const blob = await response.blob()
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `picking_${pickingId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Print failed:", error)
    }
  }

  const returnPickingAction = async (pickingId: number) => {
    if (!sessionId || !pickingId) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/${pickingId}/return`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, kwargs: {} }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || "Return failed")
      refetchSmartFields()
    } catch { }
  }

  const cancelPickingAction = async (pickingId: number) => {
    if (!sessionId || !pickingId) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/${pickingId}/cancel`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || "Cancel failed")
      refetchSmartFields()
    } catch { }
  }

  const handleDeleteClick = (pickingId: number) => {
    setPickingToDelete(pickingId)
    setDeleteAlertOpen(true)
  }

  const deletePickingAction = async () => {
    if (!sessionId || !pickingToDelete) return
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/${pickingToDelete}`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || "Delete failed")
      showToast(t("Record deleted successfully"), "success")
      setDeleteAlertOpen(false)
      setPickingToDelete(null)
      // Refresh data to remove deleted record
      await fetchData("pickings")
    } catch (error) {
      console.error("Delete failed:", error)
      showToast(t("Failed to delete record"), "error")
      setDeleteAlertOpen(false)
      setPickingToDelete(null)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.background }}>
      <div
        style={{
          background: colors.background,
          padding: "2rem 2rem 4rem 2rem",
          color: colors.textPrimary,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <div>
              <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem", color: colors.textPrimary }}>
                {t("Transfer Deliveries")}
              </h1>
              <p style={{ fontSize: "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage and track outbound transfer deliveries")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => refetchSmartFields()}
                disabled={smartFieldLoading}
                className="gap-2 font-semibold border"
                style={{
                  background: colors.card,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                }}
              >
                <RefreshCcw className={`w-4 h-4 ${smartFieldLoading ? "animate-spin" : ""}`} />
                {smartFieldLoading ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("deliveries") && (
                <Button
                  onClick={handleNewDelivery}
                  style={{
                    background: colors.action,
                    color: "#FFFFFF",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  }}
                >
                  <Plus size={20} />
                  {t("New Delivery")}
                </Button>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
            <StatCard
              label={t("Total Deliveries")}
              value={totalDeliveries}
              icon={Truck}
              gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
              delay={0}
            />
            <StatCard
              label={t("Draft Deliveries")}
              value={draftDeliveries}
              icon={FileText}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              delay={1}
            />
            <StatCard
              label={t("Scheduled Today")}
              value={scheduledToday}
              icon={Clock}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Completed")}
              value={completedTransfers}
              icon={CheckCircle2}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search deliveries...")}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={uniqueStatuses}
            toFilter={toFilter}
            onToChange={setToFilter}
            toOptions={uniqueToLocations}
            fromFilter={fromFilter}
            onFromChange={setFromFilter}
            fromOptions={uniqueFromLocations}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            isMobile={isMobile}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {viewMode === "cards" ? (
            smartFieldLoading ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.5rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <DeliveryCardSkeleton key={idx} colors={colors} />
                ))}
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                    gap: "1.5rem",
                  }}
                >
                  {paginatedDeliveries.map((delivery, idx) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      onClick={canEditPage("deliveries") ? () => openModal(delivery.id) : undefined}
                      index={idx}
                    />
                  ))}
                </div>

                {filteredDeliveries.length === 0 && !smartFieldLoading && (
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${colors.card} 0%, ${colors.mutedBg} 100%)`,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "1rem",
                      padding: "4rem 2rem",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "4rem",
                        height: "4rem",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 1.5rem",
                      }}
                    >
                      <Truck size={28} color="#FFFFFF" />
                    </div>
                    <h3
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("No deliveries found")}
                    </h3>
                    <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                  </div>
                )}

                {filteredDeliveries.length > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-2 py-3 mt-4">
                    <div className="relative flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                        {t("Rows per page:")}
                      </span>
                      <button
                        onClick={() => setIsRowModalOpen(!isRowModalOpen)}
                        className="flex items-center gap-2 px-2.5 py-1.5 border rounded-md text-sm transition-all min-w-[60px] justify-between font-medium"
                        style={{ borderColor: colors.border, background: colors.card, color: colors.textPrimary }}
                      >
                        {itemsPerPage}
                      </button>

                      {isRowModalOpen && (
                        <div
                          className="absolute bottom-full left-24 mb-2 border rounded-lg shadow-lg z-50 min-w-[70px]"
                          style={{ background: colors.card, borderColor: colors.border }}
                        >
                          {[9, 18, 36].map((rows) => (
                            <div
                              key={rows}
                              onClick={() => {
                                setItemsPerPage(rows)
                                setCurrentPage(1)
                                setIsRowModalOpen(false)
                              }}
                              className={`px-3 py-2 text-sm cursor-pointer transition-colors last:border-b-0 ${itemsPerPage === rows ? "font-semibold" : ""
                                }`}
                              style={{
                                borderColor: colors.border,
                                background: itemsPerPage === rows ? colors.action : colors.card,
                                color: itemsPerPage === rows ? "#FFFFFF" : colors.textPrimary,
                              }}
                            >
                              {rows}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-1.5 text-sm font-medium border rounded-md transition-all ${currentPage === 1 ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:shadow-sm"
                          }`}
                        style={{
                          background: currentPage === 1 ? colors.background : colors.card,
                          color: colors.textPrimary,
                          borderColor: colors.border,
                        }}
                      >
                        {t("Previous")}
                      </button>
                      <div className="px-3 py-1.5 text-xs font-medium" style={{ color: colors.textSecondary }}>
                        {t("Page")} {currentPage} {t("of")} {totalPages}
                      </div>
                      <button
                        onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1.5 text-sm font-medium border rounded-md transition-all ${currentPage === totalPages ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:shadow-sm"
                          }`}
                        style={{
                          background: currentPage === totalPages ? colors.background : colors.card,
                          color: colors.textPrimary,
                          borderColor: colors.border,
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
              data={filteredSmartFieldRecords}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              onSelectAllChange={setIsSelectAll}
              onExport={canExportPage("deliveries") ? () => setIsExportModalOpen(true) : undefined}
              isLoading={smartFieldLoading}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              columns={tableColumns}
              actions={canEditPage("deliveries") ? ((delivery) => {
                const deliveryId = (delivery as any).id
                const rawPicking = smartFieldRecords.find((p: any) => p.id === deliveryId)
                const currentStatus = rawPicking?.state || "draft"
                const isDone = currentStatus === "done"

                const actions: ActionItem[] = [
                  {
                    key: "view",
                    label: t("View"),
                    icon: Eye,
                    onClick: () => navigate(`/deliveries/view/${deliveryId}`),
                  },
                  {
                    key: "edit",
                    label: t("Edit"),
                    icon: Edit,
                    onClick: () => openModal(deliveryId),
                  },
                ]

                // Add actions from pickingEditModal
                if (!isDone) {
                  actions.push({
                    key: "validate",
                    label: t("Validate"),
                    icon: CheckCircle2,
                    onClick: () => validatePickingAction(deliveryId),
                  })
                }

                actions.push({
                  key: "print",
                  label: t("Print"),
                  icon: Printer,
                  onClick: () => printPickingAction(deliveryId),
                })

                actions.push({
                  key: "return",
                  label: t("Return"),
                  icon: RotateCcw,
                  onClick: () => returnPickingAction(deliveryId),
                })

                if (!isDone) {
                  actions.push({
                    key: "cancel",
                    label: t("Cancel"),
                    icon: XCircle,
                    onClick: () => cancelPickingAction(deliveryId),
                    danger: true,
                  })
                }

                if (canDeletePage("deliveries")) {
                  actions.push({
                    key: "delete",
                    label: t("Delete"),
                    icon: Trash2,
                    onClick: () => handleDeleteClick(deliveryId),
                    danger: true,
                  })
                }

                return actions
              }) : undefined}
              isRTL={isRTL}
              getRowIcon={(delivery) => {
                const status = (delivery as any).state || (delivery as any).status || "draft"
                const getStatusIcon = (s: string) => {
                  switch (s.toLowerCase()) {
                    case "done":
                      return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                    case "ready":
                      return { icon: Clock, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }
                    case "cancelled":
                      return { icon: XCircle, gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }
                    case "draft":
                      return { icon: FileText, gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" }
                    case "waiting":
                      return { icon: Clock, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }
                    default:
                      return { icon: AlertCircle, gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" }
                  }
                }
                return getStatusIcon(status)
              }}
              showPagination={true}
              defaultItemsPerPage={10}
            />
          )}
        </div>
      </div>



      {/* Success Modal */}
      {showSuccess && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
          }}
          onClick={() => setShowSuccess(false)}
        >
          <div
            style={{
              background: colors.card,
              borderRadius: 16,
              width: "min(100%, 420px)",
              padding: "1.5rem",
              textAlign: "center",
              boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary, marginBottom: 8 }}>
              {t("Delivery Created")}
            </h3>
            <p style={{ color: colors.textSecondary, marginBottom: 16 }}>
              {t("Your new delivery has been created successfully.")}
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => setShowSuccess(false)}
                style={{
                  background: colors.action,
                  color: "#FFFFFF",
                  border: "none",
                  padding: "0.6rem 1.25rem",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {t("Close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {canExportPage("deliveries") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={filteredDeliveries.length}
          selectedCount={Object.keys(rowSelection).length}
          isSelectAll={isSelectAll === true}
        />
      )}

      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}

      <Alert
        isOpen={deleteAlertOpen}
        type="delete"
        title={t("Delete this record?")}
        message={t("This record will be permanently deleted and cannot be recovered.")}
        onClose={() => {
          setDeleteAlertOpen(false)
          setPickingToDelete(null)
        }}
        onConfirm={deletePickingAction}
        confirmLabel={t("Delete")}
        cancelLabel={t("Cancel")}
      />

      {/* Transfer Record Sidebar */}
      <TransferSidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        backRoute="/deliveries"
      >
        {(sidebarRecordId || isSidebarCreateMode) && (
          <TransferRecordPage
            transferType="outgoing"
            pageTitle="Delivery"
            backRoute="/deliveries"
            recordId={sidebarRecordId ? parseInt(sidebarRecordId) : undefined}
            isSidebar={true}
            onClose={handleCloseSidebar}
          />
        )}
      </TransferSidebar>
    </div>
  )
}

// Skeleton component matching DeliveryCard structure
function DeliveryCardSkeleton({ colors }: { colors: any }) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: "24px",
        width: "100%",
        padding: "2px",
      }}
    >
      <div
        style={{
          position: "relative",
          height: "100%",
          background: colors.card,
          borderRadius: "22px",
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Status Tab (Top Right) */}
        <div style={{ position: "absolute", top: 0, right: 0, padding: "1rem" }}>
          <Skeleton
            variant="rectangular"
            width={80}
            height={24}
            sx={{
              borderRadius: "999px",
              bgcolor: colors.mutedBg,
            }}
          />
        </div>

        <div style={{ padding: "1.5rem" }}>
          {/* Header Section */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem" }}>
            {/* Gradient Icon Container */}
            <Skeleton
              variant="rectangular"
              width={48}
              height={48}
              sx={{
                borderRadius: "1rem",
                bgcolor: colors.mutedBg,
              }}
            />

            <div style={{ flex: 1, paddingTop: "0.25rem" }}>
              {/* Reference */}
              <Skeleton
                variant="text"
                width="30%"
                height={14}
                sx={{
                  marginBottom: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              {/* Contact name */}
              <Skeleton
                variant="text"
                width="60%"
                height={24}
                sx={{
                  bgcolor: colors.mutedBg,
                }}
              />
            </div>
          </div>

          {/* Route Visualization */}
          <div style={{ position: "relative", padding: "1rem 0", marginBottom: "1.5rem" }}>
            {/* Dashed vertical line */}
            <div
              style={{
                position: "absolute",
                left: "19px",
                top: "24px",
                bottom: "24px",
                width: "2px",
                borderLeft: `2px dashed ${colors.border}`,
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* From */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", position: "relative" }}>
                <div style={{ width: "40px", display: "flex", justifyContent: "center", paddingTop: "0.25rem", zIndex: 10 }}>
                  <Skeleton
                    variant="circular"
                    width={10}
                    height={10}
                    sx={{
                      bgcolor: colors.border,
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Skeleton
                    variant="text"
                    width="20%"
                    height={10}
                    sx={{
                      marginBottom: "0.125rem",
                      bgcolor: colors.border,
                    }}
                  />
                  <Skeleton
                    variant="text"
                    width="70%"
                    height={14}
                    sx={{
                      bgcolor: colors.border,
                    }}
                  />
                </div>
              </div>

              {/* To */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", position: "relative" }}>
                <div style={{ width: "40px", display: "flex", justifyContent: "center", paddingTop: "0.25rem", zIndex: 10 }}>
                  <Skeleton
                    variant="circular"
                    width={10}
                    height={10}
                    sx={{
                      bgcolor: colors.mutedBg,
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Skeleton
                    variant="text"
                    width="15%"
                    height={10}
                    sx={{
                      marginBottom: "0.125rem",
                      bgcolor: colors.border,
                    }}
                  />
                  <Skeleton
                    variant="text"
                    width="70%"
                    height={14}
                    sx={{
                      bgcolor: colors.border,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "1rem",
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {/* Calendar/Date */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <Skeleton
                  variant="rectangular"
                  width={16}
                  height={16}
                  sx={{
                    borderRadius: "0.25rem",
                    bgcolor: colors.mutedBg,
                  }}
                />
                <Skeleton
                  variant="text"
                  width={50}
                  height={12}
                  sx={{
                    bgcolor: colors.mutedBg,
                  }}
                />
              </div>
              {/* Items Count */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <Skeleton
                  variant="rectangular"
                  width={16}
                  height={16}
                  sx={{
                    borderRadius: "0.25rem",
                    bgcolor: colors.mutedBg,
                  }}
                />
                <Skeleton
                  variant="text"
                  width={40}
                  height={12}
                  sx={{
                    bgcolor: colors.mutedBg,
                  }}
                />
              </div>
            </div>

            {/* Source Document */}
            <Skeleton
              variant="rectangular"
              width={80}
              height={24}
              sx={{
                borderRadius: "0.5rem",
                bgcolor: colors.mutedBg,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
