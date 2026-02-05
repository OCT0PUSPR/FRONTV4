
"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useLocation, matchPath } from "react-router-dom"
import {
  Plus,
  Package,
  Clock,
  CheckCircle2,
  FileText,
  X,
  Edit,
  Layers,
  RefreshCcw,
  XCircle,
  AlertCircle,
  Eye,
} from "lucide-react"
import { Card } from "../@/components/ui/card"
import { Button } from "../@/components/ui/button"
import { Badge } from "../@/components/ui/badge"
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import { StatCard } from "./components/StatCard"
import { BatchCard } from "./components/BatchCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { TransferSidebar } from "./components/TransferSidebar"
import { BatchRecordPage } from "./pages/BatchRecordPage"
import { Skeleton } from "@mui/material"
import { DataTable, ColumnDef } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import Toast from "./components/Toast"

function mapBatches(raw: any[]): any[] {
  return (raw || []).map((r: any, idx: number) => {
    const name = r.name || r.display_name || `BATCH-${idx + 1}`
    const responsible = Array.isArray(r.user_id) ? r.user_id[1] : (r.user_id || '—')
    const scheduledDate = r.scheduled_date || '—'
    const operationType = Array.isArray(r.picking_type_id) ? r.picking_type_id[1] : (r.picking_type_id || '—')
    const dockLocation = Array.isArray(r.dock_id) ? r.dock_id[1] : (r.dock_id || '—')
    const vehicle = Array.isArray(r.vehicle_id) ? r.vehicle_id[1] : (r.vehicle_id || '—')
    const vehicleCategory = Array.isArray(r.vehicle_category_id) ? r.vehicle_category_id[1] : (r.vehicle_category_id || '—')
    const status = r.state || 'draft'
    const pickingIds = Array.isArray(r.picking_ids) ? r.picking_ids : []
    
    return {
      id: r.id || idx,
      batchTransfer: name,
      description: r.description || '—',
      scheduledDate,
      responsible,
      operationType,
      dockLocation,
      vehicle,
      vehicleCategory,
      status,
      transfers: pickingIds.map((id: number) => ({
        id,
        reference: `PICK-${id}`,
        from: '—',
        to: '—',
        contact: '—',
        sourceDocument: '—',
        status: 'draft',
      })),
      _raw: r,
    }
  })
}

function BatchCardSkeleton({ colors }: { colors: any }) {
  const { i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  return (
    <div
      className="group relative w-full rounded-[24px] p-[2px] overflow-hidden"
      style={{
        background: colors.card,
        borderRadius: "24px",
      }}
    >
      <div
        className="relative h-full rounded-[22px] overflow-hidden"
        style={{
          background: colors.card,
          borderRadius: "22px",
          border: `1px solid ${colors.border}`,
        }}
      >
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

          {/* Details Visualization */}
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
              {/* Responsible */}
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
              {/* Operation Type */}
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

export default function BatchTransfersPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const navigate = useNavigate()
  const location = useLocation()
  const { colors, mode } = useTheme()
  const { sessionId } = useAuth()
  const { canCreatePage, canEditPage, canExportPage } = useCasl()

  // Detect if we're on a view/edit/create subroute for sidebar display
  const viewMatch = matchPath('/batch/view/:id', location.pathname)
  const editMatch = matchPath('/batch/edit/:id', location.pathname)
  const createMatch = matchPath('/batch/create', location.pathname)
  const sidebarRecordId = viewMatch?.params?.id || editMatch?.params?.id
  const isCreating = !!createMatch
  const isSidebarOpen = !!sidebarRecordId || isCreating

  // Batch data state
  const [batchRecords, setBatchRecords] = useState<any[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [dockFilter, setDockFilter] = useState<string[]>([])
  const [responsibleFilter, setResponsibleFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<[string | null, string | null] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "batchTransfer",
    "responsible",
    "operationType",
    "scheduledDate",
    "status",
  ])

  // Get headers for API calls
  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const tenantId = localStorage.getItem('current_tenant_id')
    if (tenantId) headers['X-Tenant-ID'] = tenantId
    if (sessionId) headers['X-Odoo-Session'] = sessionId
    const odooBase = localStorage.getItem('odooBase')
    const odooDb = localStorage.getItem('odooDb')
    if (odooBase) headers['x-odoo-base'] = odooBase
    if (odooDb) headers['x-odoo-db'] = odooDb
    return headers
  }, [sessionId])

  // Fetch batch data from stock.picking.batch
  const fetchBatchData = useCallback(async () => {
    if (!sessionId) return

    setBatchLoading(true)
    try {
      const executeUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking.batch/execute`
      const res = await fetch(executeUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          method: 'search_read',
          args: [[['is_wave', '=', false]]],
          kwargs: {
            fields: ['id', 'name', 'state', 'description', 'user_id', 'company_id', 'picking_type_id', 'scheduled_date', 'is_wave', 'picking_ids', 'vehicle_id', 'vehicle_category_id', 'dock_id'],
            limit: 500,
            order: 'id desc'
          }
        })
      })
      const data = await res.json()

      if (data.success && data.result) {
        setBatchRecords(data.result)
      } else {
        console.error('Error fetching batches:', data.error)
      }
    } catch (error) {
      console.error('Error fetching batches:', error)
    } finally {
      setBatchLoading(false)
    }
  }, [sessionId, getHeaders])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch batch data on mount
  useEffect(() => {
    fetchBatchData()
  }, [fetchBatchData])

  // Close sidebar handler
  const handleCloseSidebar = () => {
    navigate('/batch')
  }

  const batches = useMemo(() => mapBatches(batchRecords), [batchRecords])
  const loading = { pickingTransfers: batchLoading }
  
  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
    const matchesSearch =
      batch.batchTransfer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.responsible.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.operationType.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(batch.status)
      const matchesDock = dockFilter.length === 0 || dockFilter.includes(batch.dockLocation)
      const matchesResponsible = responsibleFilter.length === 0 || responsibleFilter.includes(batch.responsible)

      // Date range filter
      let matchesDateRange = true
      if (dateRange && dateRange[0] && dateRange[1] && batch.scheduledDate) {
        const batchDate = batch.scheduledDate.slice(0, 10) // Get YYYY-MM-DD format
        matchesDateRange = batchDate >= dateRange[0] && batchDate <= dateRange[1]
      }

      return matchesSearch && matchesStatus && matchesDock && matchesResponsible && matchesDateRange
    })
  }, [batches, searchQuery, statusFilter, dockFilter, responsibleFilter, dateRange])

  // Pagination
  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBatches = filteredBatches.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, dockFilter, responsibleFilter, dateRange])

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("batch")) {
      return
    }
    // Determine data to export
    let dataToExport = filteredBatches
    if (options.scope === "selected") {
      dataToExport = filteredBatches.filter((b) => rowSelection[String(b.id)])
    } else if (options.scope === "page") {
      dataToExport = paginatedBatches
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

    // Define all possible columns
    const allColumns = {
      id: {
        header: t('ID'),
        accessor: (row: any) => `#${row.id}`,
        isMonospace: true,
        isBold: true,
        align: "left" as const
      },
      batchTransfer: {
        header: t('Batch Name'),
        accessor: (row: any) => row.batchTransfer,
        isBold: true
      },
      description: {
        header: t('Description'),
        accessor: (row: any) => row.description || '-'
      },
      responsible: {
        header: t('Responsible'),
        accessor: (row: any) => row.responsible
      },
      operationType: {
        header: t('Operation Type'),
        accessor: (row: any) => row.operationType
      },
      dockLocation: {
        header: t('Dock Location'),
        accessor: (row: any) => row.dockLocation || '-'
      },
      vehicle: {
        header: t('Vehicle'),
        accessor: (row: any) => row.vehicle || '-'
      },
      vehicleCategory: {
        header: t('Vehicle Category'),
        accessor: (row: any) => row.vehicleCategory || '-'
      },
      scheduledDate: {
        header: t('Scheduled Date'),
        accessor: (row: any) => formatDate(row.scheduledDate)
      },
      transfersCount: {
        header: t('Transfers Count'),
        accessor: (row: any) => (row.transfers || []).length
      },
      status: {
        header: t('Status'),
        accessor: (row: any) => row.status,
        isStatus: true
      },
    }

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Batches Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Total Transfers'), value: data.reduce((sum: number, b: any) => sum + ((b.transfers || []).length || 0), 0) },
        { label: t('In Progress'), value: data.filter((b: any) => {
          const status = (b.status || '').toLowerCase()
          return status.includes("progress") || status.includes('ready') || status.includes('in progress')
        }).length },
        { label: t('Completed'), value: data.filter((b: any) => (b.status || '').toLowerCase().includes("done")).length }
      ]
    }

    exportData(options, dataToExport, config, dateRange)
    setIsExportModalOpen(false)
  }

  const totalBatches = batches.length
  const draftBatches = batches.filter((b) => (b.status || '').toLowerCase().includes("draft")).length
  const inProgressBatches = batches.filter((b) => {
    const status = (b.status || '').toLowerCase()
    return status.includes("progress") || status.includes('ready') || status.includes('in progress')
  }).length
  const completedBatches = batches.filter((b) => (b.status || '').toLowerCase().includes("done")).length

  const uniqueStatuses = Array.from(new Set(batches.map((b) => b.status))).filter(Boolean) as string[]
  const uniqueDocks = Array.from(new Set(batches.map((b) => b.dockLocation))).filter(Boolean) as string[]
  const uniqueResponsible = Array.from(new Set(batches.map((b) => b.responsible))).filter(Boolean) as string[]

  const getStatusStyle = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/_/g, ' ')
    switch (normalizedStatus) {
      case "draft":
        return { bg: colors.card, text: colors.textSecondary, border: colors.border }
      case "in progress":
      case "ready":
        return { bg: colors.inProgress, text: "#0A0A0A", border: colors.inProgress }
      case "done":
        return { bg: colors.success, text: "#0A0A0A", border: colors.success }
      default:
        return { bg: colors.card, text: colors.textSecondary, border: colors.border }
    }
  }

  const getStatusLabel = (status: string) => {
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const openModal = (batch: any) => {
    if (isModalOpen) return
    // Check edit permission before opening modal
    if (!canEditPage("batch")) {
      return
    }
    setSelectedBatch(batch)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedBatch(null)
  }

  const openEditModal = (batch: any) => {
    // Check edit permission before opening modal
    if (!canEditPage("batch")) {
      return
    }
    navigate(`/batch/edit/${batch.id}`)
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
                {t("Batch Transfers")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage wave, batch, and cluster transfer operations")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchBatchData()}
                disabled={batchLoading}
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
                <RefreshCcw className={`w-4 h-4 ${batchLoading ? "animate-spin" : ""}`} />
                {batchLoading ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("batch") && (
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
                onClick={() => navigate("/batch/create")}
              >
                <Plus size={isMobile ? 18 : 20} />
                {t("New Batch")}
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
              label={t("Total Batches")}
              value={totalBatches}
              icon={Layers}
              gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
              delay={0}
            />
            <StatCard
              label={t("Draft Batches")}
              value={draftBatches}
              icon={FileText}
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              delay={1}
            />
            <StatCard
              label={t("In Progress")}
              value={inProgressBatches}
              icon={Clock}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Completed")}
              value={completedBatches}
              icon={CheckCircle2}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
                  </div>

        <div style={{ marginTop: "-2rem", paddingTop: "2rem" }}>
          <TransferFiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("Search batches...")}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={uniqueStatuses}
          toFilter={dockFilter}
          onToChange={setDockFilter}
          toOptions={uniqueDocks}
          fromFilter={responsibleFilter}
          onFromChange={setResponsibleFilter}
          fromOptions={uniqueResponsible}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          isMobile={isMobile}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewToggle={true}
        />

        {viewMode === "cards" ? (
          loading?.pickingTransfers ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
              gap: "1.25rem",
            }}
          >
            {Array.from({ length: itemsPerPage }).map((_, idx) => (
              <BatchCardSkeleton key={idx} colors={colors} />
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
              {paginatedBatches.map((batch, idx) => (
                <BatchCard key={batch.id} batch={batch} onClick={canEditPage("batch") ? () => openModal(batch) : undefined} index={idx} />
              ))}
              </div>

            {filteredBatches.length === 0 && !loading?.pickingTransfers && (
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
                  <Layers size={28} color="#FFFFFF" />
                </div>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    marginBottom: "0.5rem",
                  }}
                >
                  {t("No batches found")}
                    </h3>
                <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
              </div>
            )}

            {filteredBatches.length > 0 && (
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
            data={filteredBatches}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            onExport={canExportPage("batch") ? () => setIsExportModalOpen(true) : undefined}
            columns={[
              {
                id: "id",
                header: t("Batch ID"),
                cell: ({ row }) => (
                  <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 600 }}>
                    #{row.original.id}
                  </span>
                ),
              },
              {
                id: "batchTransfer",
                header: t("Batch Name"),
                cell: ({ row }) => (
                  <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 600 }}>
                    {row.original.batchTransfer || "—"}
                  </span>
                ),
              },
              {
                id: "description",
                header: t("Description"),
                cell: ({ row }) => (
                  <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                    {row.original.description || "—"}
                  </span>
                ),
              },
              {
                id: "responsible",
                header: t("Responsible"),
                cell: ({ row }) => (
                  <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                    {row.original.responsible || "—"}
                  </span>
                ),
              },
              {
                id: "operationType",
                header: t("Operation Type"),
                cell: ({ row }) => (
                  <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                    {row.original.operationType || "—"}
                  </span>
                ),
              },
              {
                id: "dockLocation",
                header: t("Dock Location"),
                cell: ({ row }) => (
                  <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                    {row.original.dockLocation || "—"}
                  </span>
                ),
              },
              {
                id: "vehicle",
                header: t("Vehicle"),
                cell: ({ row }) => (
                  <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                    {row.original.vehicle || "—"}
                  </span>
                ),
              },
              {
                id: "vehicleCategory",
                header: t("Vehicle Category"),
                cell: ({ row }) => (
                  <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                    {row.original.vehicleCategory || "—"}
                  </span>
                ),
              },
              {
                id: "scheduledDate",
                header: t("Scheduled Date"),
                cell: ({ row }) => {
                  const date = row.original.scheduledDate
                  return (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {date && date !== "—" ? (date === "2025-10-18" ? t("Today") : date) : "—"}
                    </span>
                  )
                },
              },
              {
                id: "transfersCount",
                header: t("Transfers Count"),
                cell: ({ row }) => {
                  const transfers = row.original.transfers || []
                  return (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {transfers.length} {transfers.length === 1 ? t("Transfer") : t("Transfers")}
                    </span>
                  )
                },
              },
              {
                id: "status",
                header: t("Status"),
                cell: ({ row }) => {
                  const status = row.original.status || "draft"
                  const getStatusColor = (stat: string) => {
                    const normalized = stat.toLowerCase().replace(/_/g, ' ')
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
                    if (normalized === "in progress") {
                      return { bg: colors.tableReadyBg, text: colors.tableReadyText }
                    }
                    return { bg: colors.tableDraftBg, text: colors.tableDraftText }
                  }
                  const statusColor = getStatusColor(status)
                  const getStatusLabel = (status: string) => {
                    return status
                      .replace(/_/g, ' ')
                      .toLowerCase()
                      .split(" ")
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")
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
                      {t(getStatusLabel(status))}
                    </span>
                  )
                },
              },
            ]}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            actions={(batch) => {
              const batchId = (batch as any).id
              return [
                {
                  key: "view",
                  label: t("View"),
                  icon: Eye,
                  onClick: () => navigate(`/batch/view/${batchId}`),
                },
                ...(canEditPage("batch") ? [{
                  key: "edit",
                  label: t("Edit"),
                  icon: Edit,
                  onClick: () => openEditModal(batch),
                }] : []),
              ]
            }}
            actionsLabel={t("Actions")}
            isRTL={isRTL}
            isLoading={loading?.pickingTransfers}
            getRowIcon={(batch) => {
              const status = (batch as any).status || "draft"
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
                    return { icon: XCircle, gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }
                  case "draft":
                    return { icon: FileText, gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)" }
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

        {!loading?.pickingTransfers && filteredBatches.length === 0 && viewMode === "table" && (
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
              <Layers size={28} color="#FFFFFF" />
        </div>
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                color: colors.textPrimary,
                marginBottom: "0.5rem",
              }}
            >
              {t("No batches found")}
            </h3>
            <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
          </div>
        )}
        </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedBatch && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "1rem",
          }}
          onClick={closeModal}
        >
          <Card
            style={{
              width: "min(100%, 900px)",
              maxHeight: "95vh",
              display: "flex",
              flexDirection: "column",
              background: colors.card,
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              overflow: "hidden",
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "1rem 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexDirection: isRTL ? "row-reverse" : "row",
              }}
            >
              <div style={{ textAlign: isRTL ? "right" : "left" }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary }}>
                  {t("Batch Transfer Details")}
                </h2>
                <p style={{ fontSize: 13, color: colors.textSecondary }}>
                  {selectedBatch.batchTransfer}
                </p>
              </div>
              <Button
                style={{
                  background: "transparent",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.5rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={closeModal}
              >
                <X size={20} color={colors.textPrimary} />
              </Button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
              {/* Batch Information Section */}
              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                    flexDirection: isRTL ? "row-reverse" : "row",
                  }}
                >
                  <div
                    style={{
                      width: "4px",
                      height: "20px",
                      background: "linear-gradient(135deg, #13E0FE 0%, #47B3FE 100%)",
                      borderRadius: "2px",
                    }}
                  />
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: colors.textPrimary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      margin: 0,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {t("Batch Information")}
                  </h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        color: colors.textSecondary,
                        fontWeight: "600",
                        display: "block",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t('Description')}
                    </label>
                    <p style={{ fontSize: "1rem", color: colors.textPrimary }}>{selectedBatch.description}</p>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        color: colors.textSecondary,
                        fontWeight: "600",
                        display: "block",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t('Responsible')}
                    </label>
                    <p style={{ fontSize: "1rem", color: colors.textPrimary }}>{selectedBatch.responsible}</p>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        color: colors.textSecondary,
                        fontWeight: "600",
                        display: "block",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t('Operation Type')}
                    </label>
                    <p style={{ fontSize: "1rem", color: colors.textPrimary }}>{selectedBatch.operationType}</p>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        color: colors.textSecondary,
                        fontWeight: "600",
                        display: "block",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t('Scheduled Date')}
                    </label>
                    <p style={{ fontSize: "1rem", color: colors.textPrimary }}>{selectedBatch.scheduledDate}</p>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        color: colors.textSecondary,
                        fontWeight: "600",
                        display: "block",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t('Dock Location')}
                    </label>
                    <p style={{ fontSize: "1rem", color: colors.textPrimary }}>{selectedBatch.dockLocation}</p>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        color: colors.textSecondary,
                        fontWeight: "600",
                        display: "block",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t('Vehicle')}
                    </label>
                    <p style={{ fontSize: "1rem", color: colors.textPrimary }}>
                      {selectedBatch.vehicle} ({selectedBatch.vehicleCategory})
                    </p>
                  </div>
                </div>
              </div>

              {/* Transfers Section */}
              <div style={{ marginTop: "1.25rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                    flexDirection: isRTL ? "row-reverse" : "row",
                  }}
                >
                  <div
                    style={{
                      width: "4px",
                      height: "20px",
                      background: "linear-gradient(135deg, #13E0FE 0%, #47B3FE 100%)",
                      borderRadius: "2px",
                    }}
                  />
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: colors.textPrimary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      margin: 0,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {t("Transfers ({{count}})", { count: selectedBatch.transfersCount || 0 })}
                  </h3>
                </div>
                <div style={{ border: `1px solid ${colors.border}`, borderRadius: "8px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", direction: isRTL ? "rtl" : "ltr" }}>
                    <thead>
                      <tr style={{ background: colors.background }}>
                        <th
                          style={{
                            padding: "1rem",
                            textAlign: isRTL ? "right" : "left",
                            fontSize: "0.875rem",
                            fontWeight: "600",
                            color: colors.textSecondary,
                          }}
                        >
                          {t('Reference')}
                        </th>
                        <th
                          style={{
                            padding: "1rem",
                            textAlign: isRTL ? "right" : "left",
                            fontSize: "0.875rem",
                            fontWeight: "600",
                            color: colors.textSecondary,
                          }}
                        >
                          {t('From')}
                        </th>
                        <th
                          style={{
                            padding: "1rem",
                            textAlign: isRTL ? "right" : "left",
                            fontSize: "0.875rem",
                            fontWeight: "600",
                            color: colors.textSecondary,
                          }}
                        >
                          {t('To')}
                        </th>
                        <th
                          style={{
                            padding: "1rem",
                            textAlign: isRTL ? "right" : "left",
                            fontSize: "0.875rem",
                            fontWeight: "600",
                            color: colors.textSecondary,
                          }}
                        >
                          {t('Contact')}
                        </th>
                        <th
                          style={{
                            padding: "1rem",
                            textAlign: isRTL ? "right" : "left",
                            fontSize: "0.875rem",
                            fontWeight: "600",
                            color: colors.textSecondary,
                          }}
                        >
                          {t('Source Doc')}
                        </th>
                        <th
                          style={{
                            padding: "1rem",
                            textAlign: isRTL ? "right" : "left",
                            fontSize: "0.875rem",
                            fontWeight: "600",
                            color: colors.textSecondary,
                          }}
                        >
                          {t('Status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBatch.transfers && selectedBatch.transfers.length > 0 ? (
                        selectedBatch.transfers.map((transfer: any, index: number) => (
                        <tr
                          key={index}
                          style={{
                            borderTop: `1px solid ${colors.border}`,
                            background: index % 2 === 0 ? colors.card : colors.mutedBg,
                          }}
                        >
                          <td style={{ padding: "1rem", fontSize: "0.875rem", color: colors.textPrimary, fontWeight: "600" }}>
                            {transfer.reference}
                          </td>
                          <td style={{ padding: "1rem", fontSize: "0.875rem", color: colors.textPrimary }}>{transfer.from}</td>
                          <td style={{ padding: "1rem", fontSize: "0.875rem", color: colors.textPrimary }}>{transfer.to}</td>
                          <td style={{ padding: "1rem", fontSize: "0.875rem", color: colors.textPrimary }}>
                            {transfer.contact}
                          </td>
                          <td style={{ padding: "1rem", fontSize: "0.875rem", color: colors.textPrimary }}>
                            {transfer.sourceDocument}
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <Badge
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.25rem 0.5rem",
                                background: getStatusStyle(transfer.status).bg,
                                border: `1px solid ${getStatusStyle(transfer.status).border}`,
                                color: getStatusStyle(transfer.status).text,
                              }}
                            >
                              {getStatusLabel(transfer.status)}
                            </Badge>
                          </td>
                        </tr>
                      ))
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: colors.textSecondary }}>
                            {t("No transfers found")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {canExportPage("batch") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={filteredBatches.length}
          selectedCount={Object.keys(rowSelection).length}
          isSelectAll={Object.keys(rowSelection).length === filteredBatches.length && filteredBatches.length > 0}
        />
      )}

      {/* Batch Record Sidebar */}
      <TransferSidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        backRoute="/batch"
      >
        {(sidebarRecordId || isCreating) && (
          <BatchRecordPage
            pageTitle={isCreating ? t("New Batch") : t("Batch")}
            backRoute="/batch"
            recordId={sidebarRecordId ? parseInt(sidebarRecordId) : undefined}
            isSidebar={true}
            onClose={handleCloseSidebar}
            onDataChange={fetchBatchData}
            isWave={false}
          />
        )}
      </TransferSidebar>

      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
