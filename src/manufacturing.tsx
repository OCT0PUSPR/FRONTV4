"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "../@/components/ui/card"
import { Button } from "../@/components/ui/button"
import { Badge } from "../@/components/ui/badge"
import { Layers, Clock, CheckCircle2, Factory, Wrench, X, FileText, RefreshCcw, Plus, Trash2, Eye } from "lucide-react"
import { useTheme } from "../context/theme"
import { StatCard } from "./components/StatCard"
import { ManufacturingOrderCard } from "./components/ManufacturingOrderCard"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Skeleton } from "@mui/material"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import { DataTable, ColumnDef } from "./components/DataTable"
import { ColumnsSelector } from "./components/ColumnsSelector"
import { Edit, Factory as FactoryIcon, XCircle, AlertCircle } from "lucide-react"
import Toast from "./components/Toast"
import Alert from "./components/Alert"
import { useSmartFieldRecords } from "./hooks/useSmartFieldRecords"
import { generateColumnsFromFields } from "./utils/generateColumnsFromFields"

// Types for manufacturing data
interface ManufacturingOperation {
  name: string
  workCenter: string
  duration: number
  status: string
}

interface ManufacturingComponent {
  product: string
  from: string
  to: string
  quantity: number
  uom: string
}

interface ManufacturingOrder {
  id: number
  name: string
  reference: string
  product: string
  quantity: number
  uom: string
  scheduledDate: string
  responsible: string
  status: string
  operations: ManufacturingOperation[]
  components: ManufacturingComponent[]
}

export default function ManufacturingPage() {
  const BACKEND_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { t, i18n } = useTranslation()
  const { colors, mode } = useTheme()
  const { productions, products, locations, uom, workcenters, projects, fetchData, loading } = useData()
  const { uid, sessionId } = useAuth()
  const { canCreatePage, canEditPage, canExportPage, canDeletePage } = useCasl()
  const navigate = useNavigate()
  const isRTL = i18n.dir() === "rtl"
  
  // Fetch records using SmartFieldSelector
  const { records: smartFieldRecords, fields: smartFields, columns: availableColumns, loading: smartFieldLoading, refetch: refetchSmartFields } = useSmartFieldRecords({
    modelName: 'mrp.production',
    enabled: !!sessionId,
  })
  
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [responsibleFilter, setResponsibleFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<[string | null, string | null] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isSelectAll, setIsSelectAll] = useState<boolean | "indeterminate">(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [productionToDelete, setProductionToDelete] = useState<number | null>(null)
  const hasFetchedRef = useRef(false)
  
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
      const nameFields = ['display_name', 'reference', 'default_code', 'name']
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

  // Fetch data automatically when component mounts (for cards view and stats)
  useEffect(() => {
    if (sessionId && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchData("productions")
      fetchData("products")
      fetchData("locations")
      fetchData("uom")
      fetchData("workcenters")
      fetchData("projects")
    }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "draft":
        return { bg: colors.card, text: colors.textSecondary, border: colors.border }
      case "in progress":
      case "planned":
      case "ready":
        return { bg: colors.inProgress, text: "#0A0A0A", border: colors.inProgress }
      case "done":
        return { bg: colors.success, text: "#0A0A0A", border: colors.success }
      default:
        return { bg: colors.card, text: colors.textSecondary, border: colors.border }
    }
  }

  const getStatusLabel = (status: string) =>
    t(
      status
        .split(" ")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" "),
    )

  // Build manufacturing orders from mrp.production (for cards view and stats)
  const manufacturingOrders: ManufacturingOrder[] = useMemo(() => {
    const mapStatus = (state: string): string => {
      switch (state) {
        case "to_close":
        case "progress":
          return "in progress"
        case "confirmed":
        case "planned":
          return "planned"
        case "done":
          return "done"
        case "draft":
          return "draft"
        default:
          return "draft"
      }
    }
    return (productions || []).map((p: any, idx: number) => {
      const id = typeof p.id === "number" ? p.id : idx
      const name = typeof p.name === "string" ? p.name : `MO/${id}`
      const reference = typeof p.origin === "string" ? p.origin : name
      const product = Array.isArray(p.product_id) ? p.product_id[1] : reference
      const quantity = typeof p.product_qty === "number" ? p.product_qty : 0
      const uom = Array.isArray(p.product_uom_id) ? p.product_uom_id[1] : ""
      const scheduledDate = typeof p.date_planned_start === "string" ? p.date_planned_start : ""
      const responsible = Array.isArray(p.user_id) ? p.user_id[1] : ""
      const status = mapStatus(String(p.state || "draft"))
      return {
        id,
        name,
        reference,
        product,
        quantity,
        uom,
        scheduledDate,
        responsible,
        status,
        operations: [],
        components: [],
      } as ManufacturingOrder
    })
  }, [productions])
  
  // Generate columns from SmartFieldSelector fields
  const tableColumns = useMemo(() => {
    if (smartFields.length === 0) {
      // Fallback columns if no fields available
      return [
        {
          id: "id",
          header: t("Manufacturing Order ID"),
          cell: ({ row }: any) => (
            <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 600 }}>
              #{row.original.id}
            </span>
          ),
        },
        {
          id: "name",
          header: t("Manufacturing Order Reference"),
          cell: ({ row }: any) => (
            <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontFamily: "monospace" }}>
              {row.original.name || "—"}
            </span>
          ),
        },
      ]
    }
    return generateColumnsFromFields(smartFields, colors, t)
  }, [smartFields, colors, t, i18n?.language || 'en'])

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
  }

  const handleDeleteClick = (productionId: number) => {
    setProductionToDelete(productionId)
    setDeleteAlertOpen(true)
  }

  const deleteProductionAction = async () => {
    if (!sessionId || !productionToDelete) return
    try {
      const sessionId = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
      if (!sessionId) throw new Error('No session ID')
      const resp = await fetch(`${BACKEND_BASE_URL}/productions/${productionToDelete}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Delete failed")
      showToast(t("Record deleted successfully"), "success")
      setDeleteAlertOpen(false)
      setProductionToDelete(null)
      // Refresh data to remove deleted record
      await Promise.all([
        fetchData("productions"),
        refetchSmartFields()
      ])
    } catch (error) {
      console.error("Delete failed:", error)
      showToast(t("Failed to delete record"), "error")
      setDeleteAlertOpen(false)
      setProductionToDelete(null)
    }
  }

  const filteredMOs = manufacturingOrders.filter((mo) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      mo.name.toLowerCase().includes(q) ||
      mo.product.toLowerCase().includes(q) ||
      mo.reference.toLowerCase().includes(q) ||
      mo.responsible.toLowerCase().includes(q)
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(mo.status)
    const matchesResp = responsibleFilter.length === 0 || responsibleFilter.includes(mo.responsible)

    // Date range filter
    let matchesDateRange = true
    if (dateRange && dateRange[0] && dateRange[1] && mo.scheduledDate) {
      const moDate = mo.scheduledDate.slice(0, 10) // Get YYYY-MM-DD format
      matchesDateRange = moDate >= dateRange[0] && moDate <= dateRange[1]
    }

    return matchesSearch && matchesStatus && matchesResp && matchesDateRange
  })

  // Pagination
  const totalPages = Math.ceil(filteredMOs.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedMOs = filteredMOs.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, responsibleFilter, dateRange])

  const totalMOs = manufacturingOrders.length
  const draftMOs = manufacturingOrders.filter((m) => m.status === "draft").length
  const inProgressMOs = manufacturingOrders.filter(
    (m) => m.status === "in progress" || m.status === "planned" || m.status === "ready",
  ).length
  const doneMOs = manufacturingOrders.filter((m) => m.status === "done").length

  const uniqueStatuses = Array.from(new Set(manufacturingOrders.map((m) => m.status)))
  const uniqueResponsible = Array.from(
    new Set(
      manufacturingOrders
        .map((m) => m.responsible)
        .filter((v) => typeof v === 'string' && v.trim().length > 0)
    )
  )

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("manufacturing")) {
      return
    }
    // Determine data to export - always use smartFieldRecords (actual API data)
    let dataToExport = smartFieldRecords
    if (options.scope === "selected") {
      dataToExport = smartFieldRecords.filter((record: any) => rowSelection[String(record.id)])
    } else if (options.scope === "page") {
      // For page scope, filter by the current filtered records
      const filteredIds = new Set(filteredMOs.map(mo => mo.id))
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
      title: t("Manufacturing Orders Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Draft'), value: data.filter((m: any) => m.state === 'draft').length },
        { label: t('In Progress'), value: data.filter((m: any) => m.state === 'progress' || m.state === 'confirmed' || m.state === 'to_close').length },
        { label: t('Completed'), value: data.filter((m: any) => m.state === 'done').length }
      ]
    }

    exportData(options, dataToExport, config, dateRange)
    setIsExportModalOpen(false)
  }

  const openModal = (productionId: number) => {
    // Check edit permission before opening
    if (!canEditPage("manufacturing")) {
      return
    }
    navigate(`/manufacturing/edit/${productionId}`)
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.background }}>
      {/* Header */}
      <div
        style={{
          background: colors.background,
          padding: "2rem 2rem 4rem 2rem",
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
                fontWeight: 700, 
                marginBottom: "0.5rem", 
                color: colors.textPrimary 
              }}>
                {t("Manufacturing Orders")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Plan and track your manufacturing operations")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  refetchSmartFields()
                  fetchData("productions")
                }}
                disabled={smartFieldLoading || !!loading?.productions}
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
                <RefreshCcw className={`w-4 h-4 ${(smartFieldLoading || loading?.productions) ? "animate-spin" : ""}`} />
                {(smartFieldLoading || loading?.productions) ? t("Loading...") : t("Refresh")}
              </Button>
            {canCreatePage("manufacturing") && (
              <Button
                onClick={() => navigate('/manufacturing/create')}
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
                {t("New MO")}
              </Button>
            )}
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
            <StatCard
              label={t("Total Manufacturing Orders")}
              value={totalMOs}
              icon={Factory}
              gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
              delay={0}
            />
            <StatCard
              label={t("Draft")}
              value={draftMOs}
              icon={FileText}
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              delay={1}
            />
            <StatCard
              label={t("In Progress")}
              value={inProgressMOs}
              icon={Clock}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Completed")}
              value={doneMOs}
              icon={CheckCircle2}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("Search manufacturing orders...")}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={uniqueStatuses}
          toFilter={responsibleFilter}
          onToChange={setResponsibleFilter}
          toOptions={uniqueResponsible}
          fromFilter={[]}
          onFromChange={() => {}}
          fromOptions={[]}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          isMobile={isMobile}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewToggle={true}
        />

        {viewMode === "cards" ? (
          loading?.productions ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                gap: "1.25rem",
              }}
            >
              {Array.from({ length: itemsPerPage }).map((_, idx) => (
                <ManufacturingOrderCardSkeleton key={idx} colors={colors} />
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
                {filteredMOs.map((mo, idx) => (
                  <ManufacturingOrderCard 
                    key={mo.id} 
                    order={mo} 
                    onClick={canEditPage("manufacturing") ? () => openModal(mo.id) : undefined} 
                    index={idx} 
                  />
                ))}
              </div>

            {filteredMOs.length === 0 && !loading?.productions && (
          <div
            style={{
              background: `linear-gradient(135deg, ${colors.card} 0%, ${colors.mutedBg} 100%)`,
              borderRadius: "1rem",
              padding: "4rem 2rem",
              textAlign: "center",
              border: `1px solid ${colors.border}`,
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
              <Factory size={32} color="#FFFFFF" strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: colors.textPrimary, marginBottom: "0.5rem" }}>
              {t("No manufacturing orders found")}
            </h3>
            <p style={{ color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
          </div>
        )}

            {filteredMOs.length > 0 && (
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
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors last:border-b-0 ${
                            itemsPerPage === rows ? "font-semibold" : ""
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
                    className={`px-3 py-1.5 text-sm font-medium border rounded-md transition-all ${
                      currentPage === 1 ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:shadow-sm"
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
                    className={`px-3 py-1.5 text-sm font-medium border rounded-md transition-all ${
                      currentPage === totalPages ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:shadow-sm"
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
            onSelectAllChange={setIsSelectAll}
            onExport={canExportPage("manufacturing") ? () => setIsExportModalOpen(true) : undefined}
            isLoading={smartFieldLoading}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            columns={tableColumns}
            actions={canEditPage("manufacturing") ? ((record) => {
              const recordId = (record as any).id
              return [
                {
                  key: "view",
                  label: t("View"),
                  icon: Eye,
                  onClick: () => navigate(`/manufacturing/view/${recordId}`),
                },
                {
                  key: "edit",
                  label: t("Edit"),
                  icon: Edit,
                  onClick: () => openModal(recordId),
                },
                ...(canDeletePage("manufacturing") ? [{
                  key: "delete",
                  label: t("Delete"),
                  icon: Trash2,
                  onClick: () => handleDeleteClick(recordId),
                  danger: true,
                }] : []),
              ]
            }) : undefined}
            isRTL={isRTL}
            getRowIcon={(record) => {
              const status = (record as any).state || (record as any).status || "draft"
              const getStatusIcon = (s: string) => {
                switch (s.toLowerCase()) {
                  case "done":
                    return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                  case "in progress":
                  case "planned":
                  case "ready":
                  case "progress":
                  case "confirmed":
                    return { icon: Clock, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }
                  case "draft":
                    return { icon: FileText, gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)" }
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

      {canExportPage("manufacturing") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={filteredMOs.length}
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
          setProductionToDelete(null)
        }}
        onConfirm={deleteProductionAction}
        confirmLabel={t("Delete")}
        cancelLabel={t("Cancel")}
      />
    </div>
  )
}

// Skeleton component matching ManufacturingOrderCard structure
function ManufacturingOrderCardSkeleton({ colors }: { colors: any }) {
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
              {/* Product name */}
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

          {/* Product/Quantity Visualization */}
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
              {/* Product */}
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
                    width="25%"
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

              {/* Quantity */}
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
                    width="30%"
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
              {/* Operations Count */}
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

            {/* Responsible */}
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
