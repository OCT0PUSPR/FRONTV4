"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/theme"
import {
  Plus,
  Package,
  Truck as TruckIcon,
  Clock,
  FileText,
  RefreshCcw,
  Edit,
  CheckCircle2,
  Printer,
  RotateCcw,
  XCircle,
  AlertCircle,
  Trash2,
  Eye,
} from "lucide-react"
import { Card, CardContent } from "../@/components/ui/card"
import { Button } from "../@/components/ui/button"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import { StatCard } from "./components/StatCard"
import { DropshipCard } from "./components/DropshipCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Skeleton } from "@mui/material"

import { DataTable, ColumnDef } from "./components/DataTable"
import Toast from "./components/Toast"
import Alert from "./components/Alert"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import { useSmartFieldRecords } from "./hooks/useSmartFieldRecords"
import { generateColumnsFromFields } from "./utils/generateColumnsFromFields"

function mapPickingToDropship(p: any) {
  const stateMap: Record<string, string> = {
    draft: 'Draft',
    confirmed: 'Ready',
    assigned: 'Ready',
    waiting: 'Ready',
    done: 'Done',
    cancel: 'Cancelled',
  }
  const ops = Array.isArray(p.move_line_ids) ? p.move_line_ids.length : (Array.isArray(p.move_lines) ? p.move_lines.length : 0)
  return {
    id: p.id,
    reference: p.name,
    vendor: p.partner_id?.[1] || '',
    from: p.location_id?.[1] || '',
    to: p.location_dest_id?.[1] || '',
    sourceLocation: p.location_id?.[1] || '',
    destinationLocation: p.location_dest_id?.[1] || '',
    scheduledDate: p.scheduled_date || p.scheduled_date_deadline || '',
    sourceDocument: p.origin || '',
    operationType: p.picking_type_id?.[1] || 'Dropship Order',
    batchTransfer: p.batch_id?.[1] || '',
    status: stateMap[p.state] || p.state || 'Draft',
    operations: new Array(ops).fill(0),
  }
}

export default function DropshipsPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const navigate = useNavigate()
  const { colors, mode } = useTheme()
  const { stockPickingTypes, partners, locations, products, uom, productPackaging, fetchData, loading } = useData()
  const { sessionId } = useAuth()
  
  // Fetch records using SmartFieldSelector
  const { records: smartFieldRecords, fields: smartFields, columns: availableColumns, loading: smartFieldLoading, refetch: refetchSmartFields } = useSmartFieldRecords({
    modelName: 'stock.picking',
    pickingTypeCode: 'dropship',
    enabled: !!sessionId,
  })
  const { canCreatePage, canEditPage, canExportPage, canDeletePage } = useCasl()

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [toFilter, setToFilter] = useState<string[]>([])
  const [fromFilter, setFromFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<[string | null, string | null] | null>(null)
  const [selectedPickingId, setSelectedPickingId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  // Column visibility state - initialize with first 6 available columns or defaults
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  
  // Update visible columns when available columns change
  useEffect(() => {
    if (availableColumns.length > 0 && visibleColumns.length === 0) {
      // Set default visible columns with proper ordering:
      // 1. id first
      // 2. display_name or reference or default_code second
      // 3. status/state last (if available)
      // 4. Other columns in between
      const defaultCols: string[] = []
      
      // 1. Add id first if available
      if (availableColumns.some(col => col.id === 'id')) {
        defaultCols.push('id')
      }
      
      // 2. Add display_name, reference, or default_code second (in priority order)
      const nameFields = ['display_name', 'reference', 'default_code']
      for (const field of nameFields) {
        if (availableColumns.some(col => col.id === field) && !defaultCols.includes(field)) {
          defaultCols.push(field)
          break // Only add the first available one
        }
      }
      
      // 3. Add other columns (excluding status/state)
      const statusFields = ['status', 'state']
      availableColumns.forEach(col => {
        if (!defaultCols.includes(col.id) && !statusFields.includes(col.id) && defaultCols.length < 6) {
          defaultCols.push(col.id)
        }
      })
      
      // 4. Add status/state last if available
      for (const field of statusFields) {
        if (availableColumns.some(col => col.id === field) && !defaultCols.includes(field)) {
          defaultCols.push(field)
          break // Only add the first available one
        }
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

  // Fetch data only once on mount if missing
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (hasFetchedRef.current) return
    const sessionId = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
    if (!sessionId) return

    hasFetchedRef.current = true
    // Only fetch stockPickingTypes if missing (for filters)
    if (!Array.isArray(stockPickingTypes) || !stockPickingTypes.length) fetchData("stockPickingTypes")
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [])

  // Use records from SmartFieldSelector (already filtered by picking_type_code=dropship)
  const dropships = useMemo(() => {
    return smartFieldRecords.map(mapPickingToDropship)
  }, [smartFieldRecords])
  
  // Generate columns from SmartFieldSelector fields
  const tableColumns = useMemo(() => {
    if (smartFields.length === 0) {
      return [
        {
          id: "id",
          header: t("ID"),
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

  const filteredDropships = dropships.filter((d) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      d.reference.toLowerCase().includes(q) ||
      d.vendor.toLowerCase().includes(q) ||
      d.from.toLowerCase().includes(q) ||
      d.to.toLowerCase().includes(q) ||
      d.sourceDocument.toLowerCase().includes(q)

    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(d.status)
    const matchesTo = toFilter.length === 0 || toFilter.includes(d.to)
    const matchesFrom = fromFilter.length === 0 || fromFilter.includes(d.from)

    // Date range filter
    let matchesDateRange = true
    if (dateRange && dateRange[0] && dateRange[1] && d.scheduledDate) {
      const dropshipDate = d.scheduledDate.slice(0, 10) // Get YYYY-MM-DD format
      matchesDateRange = dropshipDate >= dateRange[0] && dropshipDate <= dateRange[1]
    }

    return matchesSearch && matchesStatus && matchesTo && matchesFrom && matchesDateRange
  })

  // Pagination
  const totalPages = Math.ceil(filteredDropships.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDropships = filteredDropships.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, toFilter, fromFilter, dateRange])

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("dropship")) {
      return
    }
    // Determine data to export - use smartFieldRecords (actual API data)
    let dataToExport = smartFieldRecords
    if (options.scope === "selected") {
      dataToExport = smartFieldRecords.filter((r: any) => rowSelection[String(r.id)])
    } else if (options.scope === "page") {
      // For page scope, we need to filter by the current filtered and paginated records
      const filteredIds = new Set(filteredDropships.map(d => d.id))
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
      title: t("Dropships Export"),
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

  const uniqueStatuses = Array.from(new Set(dropships.map((d) => d.status)))
  const uniqueToLocations = Array.from(new Set(dropships.map((d) => d.to).filter(Boolean)))
  const uniqueFromLocations = Array.from(new Set(dropships.map((d) => d.from).filter(Boolean)))

  const total = dropships.length
  const drafts = dropships.filter((d) => d.status === "Draft").length
  const todayStr = new Date().toISOString().slice(0, 10)
  const scheduledToday = dropships.filter((d) => (d.scheduledDate || '').slice(0, 10) === todayStr).length
  const completed = dropships.filter((d) => d.status === "Done").length

  // Get Odoo headers from localStorage
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem("odooBase") || "https://egy.thetalenter.net"
    const db = localStorage.getItem("odooDb") || "odoodb1"
    const headers: Record<string, string> = {}
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
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
    if (!pickingId) return
    try {
      // Get tenant Odoo URL from localStorage
      const odooBaseUrl = localStorage.getItem('odoo_base_url') || 'https://egy.thetalenter.net'
      const baseUrl = odooBaseUrl.replace(/\/$/, '') // Remove trailing slash
      
      // Construct the PDF report URL
      const pdfUrl = `${baseUrl}/report/pdf/stock.report_picking/${pickingId}`
      
      // Open PDF in new window
      window.open(pdfUrl, '_blank')
    } catch { }
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

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
  }

  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [pickingToDelete, setPickingToDelete] = useState<number | null>(null)

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

  const openModal = (dropshipId: number) => {
    // Check edit permission before opening modal
    if (!canEditPage("dropship")) {
      return
    }
    if (dropshipId) navigate(`/dropship/edit/${dropshipId}`)
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
                {t("Transfer Dropships")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage dropship operations and vendor-to-customer deliveries")}
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
              {canCreatePage("dropship") && (
                <Button
                  onClick={() => navigate('/dropship/create')}
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
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("New Dropship")}
                </Button>
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
              label={t("Total Dropships")}
              value={total}
              icon={Package}
              gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
              delay={0}
            />
            <StatCard
              label={t("Draft Dropships")}
              value={drafts}
              icon={TruckIcon}
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
              value={completed}
              icon={FileText}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search dropships...")}
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
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <DropshipCardSkeleton key={idx} colors={colors} />
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
                  {filteredDropships.map((dropship, idx) => (
                    <DropshipCard key={dropship.id} dropship={dropship} onClick={canEditPage("dropship") ? () => openModal(dropship.id) : undefined} index={idx} />
                  ))}
                </div>

                {filteredDropships.length === 0 && (
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
                      <TruckIcon size={28} color="#FFFFFF" />
                    </div>
                    <h3
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("No dropships found")}
                    </h3>
                    <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria or create a new dropship")}</p>
                  </div>
                )}

                {filteredDropships.length > 0 && (
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
            <DataTable
              data={smartFieldRecords}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              onExport={canExportPage("dropship") ? () => setIsExportModalOpen(true) : undefined}
              isLoading={smartFieldLoading}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              columns={tableColumns.length > 0 ? tableColumns : ([
                {
                  id: "id",
                  header: t("Dropship ID"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 600 }}>
                      #{row.original.id}
                    </span>
                  ),
                },
                {
                  id: "reference",
                  header: t("Reference"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                      {(row.original as any).reference || "—"}
                    </span>
                  ),
                },
                {
                  id: "vendor",
                  header: t("Vendor"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                      {(row.original as any).vendor || "—"}
                    </span>
                  ),
                },
                {
                  id: "from",
                  header: t("From"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {(row.original as any).from || "—"}
                    </span>
                  ),
                },
                {
                  id: "to",
                  header: t("To"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {(row.original as any).to || "—"}
                    </span>
                  ),
                },
                {
                  id: "scheduledDate",
                  header: t("Scheduled Date"),
                  cell: ({ row }) => {
                    const date = (row.original as any).scheduledDate
                    return (
                      <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                        {date ? new Date(date).toLocaleDateString() : "—"}
                      </span>
                    )
                  },
                },
                {
                  id: "sourceDocument",
                  header: t("Source Document"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                      {(row.original as any).sourceDocument || "—"}
                    </span>
                  ),
                },
                {
                  id: "batchTransfer",
                  header: t("Batch Transfer"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {(row.original as any).batchTransfer || "—"}
                    </span>
                  ),
                },
                {
                  id: "operations",
                  header: t("Operations"),
                  cell: ({ row }) => {
                    const ops = (row.original as any).operations || []
                    return (
                      <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                        {ops.length} {ops.length === 1 ? t("Item") : t("Items")}
                      </span>
                    )
                  },
                },
                {
                  id: "status",
                  header: t("Status"),
                  cell: ({ row }) => {
                    const dropship = row.original as any
                    const status = dropship.status || "draft"
                    const getStatusColor = (stat: string) => {
                      const normalized = stat.toLowerCase()
                      if (normalized === "done") {
                        return { bg: colors.tableDoneBg, text: colors.tableDoneText }
                      }
                      if (normalized === "cancelled" || normalized === "cancel") {
                        return { bg: colors.tableCancelledBg, text: colors.tableCancelledText }
                      }
                      if (normalized === "draft") {
                        return { bg: colors.tableDraftBg, text: colors.tableDraftText }
                      }
                      if (normalized === "ready") {
                        return { bg: colors.tableReadyBg, text: colors.tableReadyText }
                      }
                      if (normalized === "waiting") {
                        return { bg: colors.tableWaitingBg, text: colors.tableWaitingText }
                      }
                      return { bg: colors.tableDraftBg, text: colors.tableDraftText }
                    }
                    const statusColor = getStatusColor(status)
                    const getStatusLabel = (status: string) => {
                      const label = status.charAt(0).toUpperCase() + status.slice(1)
                      return t(label)
                    }
                    return (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "999px",
                          background: statusColor.bg,
                          color: statusColor.text,
                          fontSize: "0.875rem",
                          fontWeight: 600,
                        }}
                      >
                        {getStatusLabel(status)}
                      </span>
                    )
                  },
                },
              ])}
              actions={canEditPage("dropship") ? ((dropship) => {
                const dropshipId = (dropship as any).id
                // Get current status from pickings data
                const currentPicking = smartFieldRecords.find((p: any) => p.id === dropshipId)
                const currentStatus = currentPicking?.state || "draft"
                const isDone = currentStatus === "done"

                const actions = [
                  {
                    key: "view",
                    label: t("View"),
                    icon: Eye,
                    onClick: () => navigate(`/dropships/view/${dropshipId}`),
                  },
                  {
                    key: "edit",
                    label: t("Edit"),
                    icon: Edit,
                    onClick: () => openModal(dropshipId),
                  },
                  ...(!isDone ? [
                    {
                      key: "validate",
                      label: t("Validate"),
                      icon: CheckCircle2,
                      onClick: () => validatePickingAction(dropshipId),
                    },
                  ] : []),
                  {
                    key: "print",
                    label: t("Print"),
                    icon: Printer,
                    onClick: () => printPickingAction(dropshipId),
                  },
                  {
                    key: "return",
                    label: t("Return"),
                    icon: RotateCcw,
                    onClick: () => returnPickingAction(dropshipId),
                  },
                  ...(!isDone ? [
                    {
                      key: "cancel",
                      label: t("Cancel"),
                      icon: XCircle,
                      onClick: () => cancelPickingAction(dropshipId),
                      danger: true,
                    },
                  ] : []),
                  ...(canDeletePage("dropship") ? [{
                    key: "delete",
                    label: t("Delete"),
                    icon: Trash2,
                    onClick: () => handleDeleteClick(dropshipId),
                    danger: true,
                  }] : []),
                ]
                return actions
              }) : undefined}
              actionsLabel={t("Actions")}
              isRTL={isRTL}
              getRowIcon={(dropship) => {
                const status = (dropship as any).status || "draft"
                const getStatusIcon = (s: string) => {
                  const normalized = s.toLowerCase().replace(/_/g, ' ')
                  switch (normalized) {
                    case "done":
                      return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                    case "ready":
                    case "in progress":
                      return { icon: Clock, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }
                    case "cancelled":
                    case "cancel":
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

          {!smartFieldLoading && filteredDropships.length === 0 && viewMode === "table" && (
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
                <TruckIcon size={28} color="#FFFFFF" />
              </div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  color: colors.textPrimary,
                  marginBottom: "0.5rem",
                }}
              >
                {t("No dropships found")}
              </h3>
              <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria or create a new dropship")}</p>
            </div>
          )}
        </div>
      </div>



      {canExportPage("dropship") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={filteredDropships.length}
          selectedCount={Object.keys(rowSelection).length}
          isSelectAll={Object.keys(rowSelection).length === filteredDropships.length && filteredDropships.length > 0}
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
    </div>
  )
}

// Skeleton component matching DropshipCard structure
function DropshipCardSkeleton({ colors }: { colors: any }) {
  const { i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  return (
    <div
      className="group relative w-full rounded-[24px] p-[2px] overflow-hidden"
      style={{
        background: colors.card,
      }}
    >
      <div className="relative h-full rounded-[22px] overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
        {/* Status Tab (Top Right) */}
        <div
          className="absolute top-0 p-4"
          style={{
            [isRTL ? 'left' : 'right']: 0,
          }}
        >
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

        <div className="p-6">
          {/* Header Section */}
          <div className="flex items-start gap-4 mb-6">
            <Skeleton
              variant="rectangular"
              width={48}
              height={48}
              sx={{
                borderRadius: "16px",
                bgcolor: colors.mutedBg,
                transform: "none",
              }}
            />
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <Skeleton variant="text" width="40%" height={20} sx={{ bgcolor: colors.mutedBg }} />
              </div>
              <Skeleton variant="text" width="60%" height={28} sx={{ bgcolor: colors.mutedBg }} />
            </div>
          </div>

          {/* Route Visualization */}
          <div className="relative py-4 mb-6">
            <div
              className="absolute top-6 bottom-6 w-0.5 border-l-2 border-dashed"
              style={{
                [isRTL ? 'right' : 'left']: '19px',
                borderColor: colors.border,
                borderLeft: isRTL ? 'none' : `2px dashed ${colors.border}`,
                borderRight: isRTL ? `2px dashed ${colors.border}` : 'none',
              }}
            ></div>
            <div className="flex flex-col gap-4">
              {/* From */}
              <div className="flex items-start relative" style={{ paddingLeft: isRTL ? 0 : '2.5rem', paddingRight: isRTL ? '2.5rem' : 0 }}>
                <div
                  className="absolute flex justify-center pt-1 z-10"
                  style={{
                    width: '2.5rem',
                    [isRTL ? 'right' : 'left']: '19px',
                    transform: isRTL ? 'translateX(50%)' : 'translateX(-50%)',
                  }}
                >
                  <Skeleton variant="circular" width={10} height={10} sx={{ bgcolor: colors.mutedBg }} />
                </div>
                <div className="flex-1">
                  <Skeleton variant="text" width="25%" height={16} sx={{ bgcolor: colors.mutedBg, marginBottom: "0.5rem" }} />
                  <Skeleton variant="text" width="80%" height={20} sx={{ bgcolor: colors.mutedBg }} />
                </div>
              </div>
              {/* To */}
              <div className="flex items-start relative" style={{ paddingLeft: isRTL ? 0 : '2.5rem', paddingRight: isRTL ? '2.5rem' : 0 }}>
                <div
                  className="absolute flex justify-center pt-1 z-10"
                  style={{
                    width: '2.5rem',
                    [isRTL ? 'right' : 'left']: '19px',
                    transform: isRTL ? 'translateX(50%)' : 'translateX(-50%)',
                  }}
                >
                  <Skeleton variant="circular" width={10} height={10} sx={{ bgcolor: colors.mutedBg }} />
                </div>
                <div className="flex-1">
                  <Skeleton variant="text" width="25%" height={16} sx={{ bgcolor: colors.mutedBg, marginBottom: "0.5rem" }} />
                  <Skeleton variant="text" width="80%" height={20} sx={{ bgcolor: colors.mutedBg }} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: colors.border }}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Skeleton variant="rectangular" width={16} height={16} sx={{ bgcolor: colors.mutedBg }} />
                <Skeleton variant="text" width={60} height={16} sx={{ bgcolor: colors.mutedBg }} />
              </div>
              <div className="flex items-center gap-1.5">
                <Skeleton variant="rectangular" width={16} height={16} sx={{ bgcolor: colors.mutedBg }} />
                <Skeleton variant="text" width={50} height={16} sx={{ bgcolor: colors.mutedBg }} />
              </div>
            </div>
            <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: "8px", bgcolor: colors.mutedBg }} />
          </div>
        </div>
      </div>
    </div>
  )
}
