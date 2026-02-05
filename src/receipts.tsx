("use client")

import { useMemo, useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useLocation, useParams, matchPath } from "react-router-dom"
import { useTheme } from "../context/theme"
import { Plus, Package, Clock, CheckCircle2, FileText, AlertCircle, XCircle, RefreshCcw, Edit, Printer, RotateCcw, Trash2, Eye, ScanLine } from "lucide-react"
import { TransferSidebar } from "./components/TransferSidebar"
import { TransferRecordPage } from "./pages/TransferRecordPage"
import { Card, CardContent } from "../@/components/ui/card"
import { Button } from "../@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../@/components/ui/select"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import { DatePicker } from "./components/ui/date-picker"
import { StatCard } from "./components/StatCard"
import { ReceiptCard } from "./components/ReceiptCard"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import { Skeleton } from "@mui/material"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { TransfersTable, ColumnDef } from "./components/TransfersTable"
import Toast from "./components/Toast"
import Alert from "./components/Alert"
import { useSmartFieldRecords } from "./hooks/useSmartFieldRecords"
import { generateColumnsFromFields } from "./utils/generateColumnsFromFields"
import { OCRImportModal } from "./components/OCRImportModal"
import { BulkDeleteModal } from "./components/BulkDeleteModal"


function mapPickingToReceiptCard(p: any) {
  const statusMap: Record<string, string> = {
    draft: "draft",
    confirmed: "ready",
    assigned: "ready",
    waiting: "ready",
    done: "done",
    cancel: "cancelled",
  }

  const operationsCount = Array.isArray(p.move_line_ids)
    ? p.move_line_ids.length
    : Array.isArray(p.move_lines)
      ? p.move_lines.length
      : 0
  return {
    id: p.id,
    reference: p.name,
    from: p.location_id?.[1] || "",
    to: p.location_dest_id?.[1] || "",
    contact: p.partner_id?.[1] || "",
    scheduledDate: p.scheduled_date || p.scheduled_date_deadline || "",
    sourceDocument: p.origin || "",
    batchTransfer: p.batch_id?.[1] || "",
    status: statusMap[p.state] || p.state || "draft",
    operations: new Array(operationsCount).fill(0),
  }
}

export default function TransferReceiptsPage() {
  const { t, i18n } = useTranslation()
  const { colors, mode } = useTheme()
  const location = useLocation()
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
  const { sessionId, uid } = useAuth()
  const { canCreatePage, canEditPage, canExportPage, canDeletePage } = useCasl()

  // Detect if we're on a view/edit/create subroute for sidebar display
  const viewMatch = matchPath('/receipts/view/:id', location.pathname)
  const editMatch = matchPath('/receipts/edit/:id', location.pathname)
  const createMatch = matchPath('/receipts/create', location.pathname)
  const sidebarRecordId = viewMatch?.params?.id || editMatch?.params?.id
  const isCreating = !!createMatch
  const isSidebarOpen = !!sidebarRecordId || isCreating

  // Fetch records using SmartFieldSelector
  const { records: smartFieldRecords, fields: smartFields, columns: availableColumns, loading: smartFieldLoading, refetch: refetchSmartFields } = useSmartFieldRecords({
    modelName: 'stock.picking',
    pickingTypeCode: 'incoming',
    enabled: !!sessionId,
  })
  
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [toFilter, setToFilter] = useState<string[]>([])
  const [fromFilter, setFromFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<[string | null, string | null] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPickingId, setSelectedPickingId] = useState<number | null>(null)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isSelectAll, setIsSelectAll] = useState<boolean | "indeterminate">(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [pickingToDelete, setPickingToDelete] = useState<number | null>(null)
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const isRTL = i18n.dir() === "rtl"
  const navigate = useNavigate()

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
  }

  // Column visibility state - initialize with first 6 available columns or defaults
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch stockPickingTypes if needed (for filters/stats)
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (hasFetchedRef.current) return
    if (!sessionId) return

    hasFetchedRef.current = true
    // Only fetch stockPickingTypes if missing (for filters)
    if (!Array.isArray(stockPickingTypes) || !stockPickingTypes.length) fetchData("stockPickingTypes")
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [sessionId])



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

  const unitUoms = useMemo(() => {
    return (uom || []).filter((u: any) => {
      const cat = Array.isArray(u?.category_id) ? u.category_id?.[1] : u?.category_id
      return String(cat || "")
        .toLowerCase()
        .includes("unit")
    })
  }, [uom])

  // Use records from SmartFieldSelector (already filtered by picking_type_code=incoming)
  const receipts = useMemo(() => {
    return smartFieldRecords.map(mapPickingToReceiptCard)
  }, [smartFieldRecords])
  
  // Generate columns from SmartFieldSelector fields
  const tableColumns = useMemo(() => {
    if (smartFields.length === 0) {
      // Fallback columns if no fields available
      return [
        {
          id: "id",
          header: t("Receipt ID"),
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

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const matchesSearch =
        receipt.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.sourceDocument.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(receipt.status)
      const matchesTo = toFilter.length === 0 || toFilter.includes(receipt.to)
      const matchesFrom = fromFilter.length === 0 || fromFilter.includes(receipt.from)

      // Date range filter
      let matchesDateRange = true
      if (dateRange && dateRange[0] && dateRange[1] && receipt.scheduledDate) {
        const receiptDate = receipt.scheduledDate.slice(0, 10) // Get YYYY-MM-DD format
        matchesDateRange = receiptDate >= dateRange[0] && receiptDate <= dateRange[1]
      }

      return matchesSearch && matchesStatus && matchesTo && matchesFrom && matchesDateRange
    })
  }, [receipts, searchQuery, statusFilter, toFilter, fromFilter, dateRange])

  // Filter smartFieldRecords to match filteredReceipts for DataTable
  const filteredSmartFieldRecords = useMemo(() => {
    const filteredIds = new Set(filteredReceipts.map(r => r.id))
    return smartFieldRecords.filter((r: any) => filteredIds.has(r.id))
  }, [smartFieldRecords, filteredReceipts])

  // Pagination for cards view
  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage)
  const paginatedReceipts = useMemo(() => {
    if (viewMode === "cards") {
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      return filteredReceipts.slice(startIndex, endIndex)
    }
    return filteredReceipts
  }, [filteredReceipts, currentPage, itemsPerPage, viewMode])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, toFilter, fromFilter, dateRange])


  const totalReceipts = receipts.length
  const draftReceipts = receipts.filter((r) => r.status === "draft").length
  const completedReceipts = receipts.filter((r) => r.status === "done").length
  const todayStr = new Date().toISOString().slice(0, 10)
  const scheduledToday = receipts.filter((r) => (r.scheduledDate || "").slice(0, 10) === todayStr).length

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "draft":
        return { bg: colors.card, text: colors.textSecondary, border: colors.border }
      case "ready":
        return { bg: colors.inProgress, text: "#0A0A0A", border: colors.inProgress }
      case "done":
        return { bg: colors.success, text: "#0A0A0A", border: colors.success }
      case "cancelled":
        return { bg: colors.cancel, text: "#FFFFFF", border: colors.cancel }
      default:
        return { bg: colors.card, text: colors.textSecondary, border: colors.border }
    }
  }

  const uniqueStatuses = Array.from(new Set(receipts.map((r) => r.status)))
  const uniqueTo = Array.from(new Set(receipts.map((r) => r.to).filter(Boolean)))
  const uniqueFrom = Array.from(new Set(receipts.map((r) => r.from).filter(Boolean)))

  const openModal = (receiptId: number) => {
    // Check edit permission before opening modal
    if (!canEditPage("receipts")) {
      return
    }
    navigate(`/receipts/edit/${receiptId}`)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedPickingId(null)
    // Refresh pickings data after modal closes
    fetchData("pickings")
  }

  const handleCloseSidebar = () => {
    navigate('/receipts')
    // Refresh data when sidebar closes
    refetchSmartFields()
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

  const validatePickingAction = async (pickingId: number) => {
    if (!sessionId) return
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
      fetchData("pickings")
    } catch (error) {
      console.error("Validate failed:", error)
    }
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
    if (!sessionId) return
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
      fetchData("pickings")
    } catch (error) {
      console.error("Return failed:", error)
    }
  }

  const cancelPickingAction = async (pickingId: number) => {
    if (!sessionId) return
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
      fetchData("pickings")
    } catch (error) {
      console.error("Cancel failed:", error)
    }
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

  // Bulk delete selected records (current page selection)
  const handleBulkDeleteSelected = async () => {
    if (!sessionId) return
    const selectedIds = Object.keys(rowSelection).map(id => parseInt(id))
    if (selectedIds.length === 0) return

    const headers = {
      "Content-Type": "application/json",
      ...getOdooHeaders(),
    }

    let successCount = 0
    let failCount = 0

    for (const pickingId of selectedIds) {
      try {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/${pickingId}`, {
          method: "DELETE",
          headers,
          body: JSON.stringify({ sessionId }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.success) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        console.error(`Failed to delete picking ${pickingId}:`, error)
        failCount++
      }
    }

    // Clear selection and refresh data
    setRowSelection({})
    setIsSelectAll(false)
    await refetchSmartFields()

    if (failCount === 0) {
      showToast(t("{{count}} records deleted successfully", { count: successCount }), "success")
    } else {
      showToast(t("Deleted {{success}} records, {{fail}} failed", { success: successCount, fail: failCount }), "error")
    }
  }

  // Bulk delete all filtered records
  const handleBulkDeleteAll = async () => {
    if (!sessionId) return
    const allFilteredIds = filteredSmartFieldRecords.map((r: any) => r.id)
    if (allFilteredIds.length === 0) return

    const headers = {
      "Content-Type": "application/json",
      ...getOdooHeaders(),
    }

    let successCount = 0
    let failCount = 0

    for (const pickingId of allFilteredIds) {
      try {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/pickings/${pickingId}`, {
          method: "DELETE",
          headers,
          body: JSON.stringify({ sessionId }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.success) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        console.error(`Failed to delete picking ${pickingId}:`, error)
        failCount++
      }
    }

    // Clear selection and refresh data
    setRowSelection({})
    setIsSelectAll(false)
    await refetchSmartFields()

    if (failCount === 0) {
      showToast(t("{{count}} records deleted successfully", { count: successCount }), "success")
    } else {
      showToast(t("Deleted {{success}} records, {{fail}} failed", { success: successCount, fail: failCount }), "error")
    }
  }



  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Determine data to export - use smartFieldRecords (actual API data)
    let dataToExport = smartFieldRecords
    if (options.scope === "selected") {
      dataToExport = smartFieldRecords.filter((r: any) => rowSelection[String(r.id)])
    } else if (options.scope === "page") {
      // For page scope, we need to filter by the current filtered and paginated records
      const filteredIds = new Set(filteredReceipts.map(r => r.id))
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
      title: t("Receipts Export"),
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

  const handleNewReceipt = () => {
    navigate('/receipts/create')
  }




  return (
    <div style={{ minHeight: "100vh", background: colors.background }}>
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.6s ease-out forwards;
          }
        `}
      </style>

      <div
        style={{
          background: colors.background,
          padding: isMobile ? "1rem" : "2rem",
          color: colors.textPrimary,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
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
                fontSize: isMobile ? "1.5rem" : "2rem",
                fontWeight: "700",
                marginBottom: "0.5rem",
                color: colors.textPrimary
              }}>
                {t("Transfer Receipts")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage incoming transfers and receipts")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
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
                  width: isMobile ? "100%" : "auto",
                }}
              >
                <RefreshCcw className={`w-4 h-4 ${smartFieldLoading ? "animate-spin" : ""}`} />
                {smartFieldLoading ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("receipts") && (
                <>
                  <Button
                    style={{
                      background: colors.card,
                      color: colors.textPrimary,
                      padding: isMobile ? "0.625rem 1rem" : "0.75rem 1.5rem",
                      borderRadius: "8px",
                      border: `1px solid ${colors.border}`,
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      width: isMobile ? "100%" : "auto",
                      justifyContent: "center",
                    }}
                    onClick={() => setIsOCRModalOpen(true)}
                  >
                    <ScanLine size={isMobile ? 18 : 20} />
                    {t("Import from Invoice")}
                  </Button>
                  <Button
                    style={{
                      background: colors.action,
                      color: "#FFFFFF",
                      padding: isMobile ? "0.625rem 1rem" : "0.75rem 1.5rem",
                      borderRadius: "8px",
                      border: "none",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      width: isMobile ? "100%" : "auto",
                      justifyContent: "center",
                    }}
                    onClick={handleNewReceipt}
                  >
                    <Plus size={isMobile ? 18 : 20} />
                    {t("New Receipt")}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            <StatCard
              label={t("Total Receipts")}
              value={totalReceipts}
              icon={Package}
              gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
              delay={0}
            />
            <StatCard
              label={t("Draft Receipts")}
              value={draftReceipts}
              icon={FileText}
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              delay={1}
            />
            <StatCard
              label={t("Scheduled Today")}
              value={scheduledToday}
              icon={Clock}
              gradient="linear-gradient(135deg, #2563eb 0%, #0891b2 100%)"
              delay={2}
            />
            <StatCard
              label={t("Completed")}
              value={completedReceipts}
              icon={CheckCircle2}
              gradient="linear-gradient(135deg, #059669 0%, #0d9488 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search receipts...")}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={uniqueStatuses}
            toFilter={toFilter}
            onToChange={setToFilter}
            toOptions={uniqueTo}
            fromFilter={fromFilter}
            onFromChange={setFromFilter}
            fromOptions={uniqueFrom}
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
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <ReceiptCardSkeleton key={idx} colors={colors} />
                ))}
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                    gap: "1.25rem",
                  }}
                >
                  {paginatedReceipts.map((receipt, idx) => (
                    <ReceiptCard
                      key={receipt.id}
                      receipt={receipt}
                      onClick={canEditPage("receipts") ? () => openModal(receipt.id) : undefined}
                      index={idx}
                    />
                  ))}
                </div>

                {/* Cards Pagination */}
                {filteredReceipts.length > 0 && (
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
              onExport={canExportPage("receipts") ? () => setIsExportModalOpen(true) : undefined}
              onBulkDelete={canDeletePage("receipts") ? () => setIsBulkDeleteModalOpen(true) : undefined}
              totalRecords={filteredSmartFieldRecords.length}
              isLoading={smartFieldLoading}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              columns={tableColumns}
              actions={canEditPage("receipts") ? ((receipt) => {
                const receiptId = (receipt as any).id
                // Get current status from raw data (use original state, not mapped status)
                const currentStatus = (receipt as any).state || "draft"
                const isDone = currentStatus === "done"

                const actions = [
                  {
                    key: "view",
                    label: t("View"),
                    icon: Eye,
                    onClick: () => navigate(`/receipts/view/${receiptId}`),
                  },
                  {
                    key: "edit",
                    label: t("Edit"),
                    icon: Edit,
                    onClick: () => openModal(receiptId),
                  },
                  ...(!isDone ? [
                    {
                      key: "validate",
                      label: t("Validate"),
                      icon: CheckCircle2,
                      onClick: () => validatePickingAction(receiptId),
                    },
                  ] : []),
                  {
                    key: "print",
                    label: t("Print"),
                    icon: Printer,
                    onClick: () => printPickingAction(receiptId),
                  },
                  {
                    key: "return",
                    label: t("Return"),
                    icon: RotateCcw,
                    onClick: () => returnPickingAction(receiptId),
                  },
                  ...(!isDone ? [
                    {
                      key: "cancel",
                      label: t("Cancel"),
                      icon: XCircle,
                      onClick: () => cancelPickingAction(receiptId),
                      danger: true,
                    },
                  ] : []),
                  ...(canDeletePage("receipts") ? [{
                    key: "delete",
                    label: t("Delete"),
                    icon: Trash2,
                    onClick: () => handleDeleteClick(receiptId),
                    danger: true,
                  }] : []),
                ]
                return actions
              }) : undefined}
              actionsLabel={t("Actions")}
              isRTL={isRTL}
              getRowIcon={(receipt) => {
                // Use state field from raw data (not mapped status)
                const state = (receipt as any).state || "draft"
                const getStatusIcon = (s: string) => {
                  switch (s.toLowerCase()) {
                    case "done":
                      return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }
                    case "assigned":
                    case "ready":
                      return { icon: Clock, gradient: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }
                    case "cancel":
                    case "cancelled":
                      return { icon: XCircle, gradient: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)" }
                    case "draft":
                      return { icon: FileText, gradient: "linear-gradient(135deg, #e91e63 0%, #fbbf24 100%)" }
                    case "waiting":
                    case "confirmed":
                      return { icon: Clock, gradient: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }
                    default:
                      return { icon: AlertCircle, gradient: "linear-gradient(135deg, #fbbf24 0%, #a8a29e 100%)" }
                  }
                }
                return getStatusIcon(state)
              }}
              showPagination={true}
              defaultItemsPerPage={10}
            />
          )}

          {!smartFieldLoading && (
            <>

              {filteredReceipts.length === 0 && (
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
                    <Package size={28} color="#FFFFFF" />
                  </div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {t("No receipts found")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                </div>
              )}

            </>
          )}



          {canExportPage("receipts") && (
            <ExportModal
              isOpen={isExportModalOpen}
              onClose={() => setIsExportModalOpen(false)}
              onExport={handleExport}
              totalRecords={filteredReceipts.length}
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

          {/* Bulk Delete Modal */}
          {canDeletePage("receipts") && (
            <BulkDeleteModal
              isOpen={isBulkDeleteModalOpen}
              onClose={() => setIsBulkDeleteModalOpen(false)}
              selectedCount={Object.keys(rowSelection).length}
              totalCount={filteredSmartFieldRecords.length}
              isSelectAll={isSelectAll === true}
              onDeleteSelected={handleBulkDeleteSelected}
              onDeleteAll={handleBulkDeleteAll}
              modelLabel={t("receipts")}
            />
          )}

          {/* Transfer Record Sidebar */}
          <TransferSidebar
            isOpen={isSidebarOpen}
            onClose={handleCloseSidebar}
            backRoute="/receipts"
          >
            {(sidebarRecordId || isCreating) && (
              <TransferRecordPage
                transferType="incoming"
                pageTitle="Receipt"
                backRoute="/receipts"
                recordId={sidebarRecordId ? parseInt(sidebarRecordId) : undefined}
                isSidebar={true}
                onClose={handleCloseSidebar}
                onDataChange={refetchSmartFields}
              />
            )}
          </TransferSidebar>

          {/* OCR Import Modal */}
          <OCRImportModal
            isOpen={isOCRModalOpen}
            onClose={() => setIsOCRModalOpen(false)}
            onSuccess={(pickingId) => {
              showToast(t("Receipt created successfully"), "success")
              refetchSmartFields()
              navigate(`/receipts/view/${pickingId}`)
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Skeleton component matching ReceiptCard structure
function ReceiptCardSkeleton({ colors }: { colors: any }) {
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
