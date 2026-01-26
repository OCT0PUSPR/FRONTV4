"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useData } from "../context/data"
import { useTheme } from "../context/theme"
import { useCasl } from "../context/casl"
import { Plus, Package, RefreshCcw, ArrowRight, CheckCircle2, Clock, Edit, Trash2, Eye } from "lucide-react"
import { Button } from "../@/components/ui/button"
import { StatCard } from "./components/StatCard"
import { MoveCard } from "./components/MoveCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Skeleton } from "@mui/material"
import { DataTable } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"

export default function MovesHistoryPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isRTL = i18n.dir() === "rtl"
  const { stockMoves, fetchData, loading } = useData()
  const { colors } = useTheme()
  const { canCreatePage, canEditPage, canExportPage } = useCasl()
  const [searchQuery, setSearchQuery] = useState("")
  const [productFilter, setProductFilter] = useState<string[]>([])
  const [toFilter, setToFilter] = useState<string[]>([])
  const [fromFilter, setFromFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<[string | null, string | null] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [selectedMove, setSelectedMove] = useState<any | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isSelectAll, setIsSelectAll] = useState<boolean | "indeterminate">(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "reference",
    "product",
    "from",
    "to",
    "quantity",
  ])

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
    // Only fetch if data is missing - this page only needs stockMoves
    if (!Array.isArray(stockMoves) || !stockMoves.length) fetchData("stockMoves")
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [])

  const moves = useMemo(() => {
    const mapStatus = (state?: string) => {
      const s = (state || '').toLowerCase()
      if (s === 'done') return 'Done'
      if (s === 'cancel') return 'Cancelled'
      if (s === 'assigned' || s === 'waiting' || s === 'confirmed') return 'Pending'
      return 'Pending'
    }
    return (stockMoves || []).map((m: any) => ({
      id: m.id,
      date: m.date || m.date_deadline || m.create_date || '',
      reference: m.reference || m.name || m.origin || '',
      product: m.product_id?.[1] || '',
      productId: Array.isArray(m.product_id) ? m.product_id[0] : m.product_id,
      lotSerial: m.lot_ids?.[0]?.[1] || '',
      from: m.location_id?.[1] || '',
      fromId: Array.isArray(m.location_id) ? m.location_id[0] : m.location_id,
      to: m.location_dest_id?.[1] || '',
      toId: Array.isArray(m.location_dest_id) ? m.location_dest_id[0] : m.location_dest_id,
      quantity: typeof m.quantity_done === 'number' && m.quantity_done > 0 ? m.quantity_done : (m.product_uom_qty || 0),
      quantityDone: m.quantity_done || 0,
      quantityReserved: m.reserved_availability || 0,
      unit: m.product_uom?.[1] || 'Units',
      unitId: Array.isArray(m.product_uom) ? m.product_uom[0] : m.product_uom,
      status: mapStatus(m.state),
      state: m.state || '',
      pickingId: Array.isArray(m.picking_id) ? m.picking_id[0] : m.picking_id,
      pickingName: Array.isArray(m.picking_id) ? m.picking_id[1] : '',
      origin: m.origin || '',
      createDate: m.create_date || '',
      writeDate: m.write_date || '',
      raw: m,
    }))
  }, [stockMoves])

  const totalQuantity = moves.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
  const totalMoves = moves.length
  const completedMoves = moves.filter((m: any) => m.status === 'Done').length
  const pendingMoves = moves.filter((m: any) => m.status === 'Pending').length

  const filteredMoves = moves.filter((move: any) => {
    const matchesSearch =
      move.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      move.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      move.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      move.to.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesProduct = productFilter.length === 0 || productFilter.includes(move.product)
    const matchesFrom = fromFilter.length === 0 || fromFilter.includes(move.from)
    const matchesTo = toFilter.length === 0 || toFilter.includes(move.to)

    // Date range filter
    let matchesDateRange = true
    if (dateRange && dateRange[0] && dateRange[1] && move.date) {
      const moveDate = move.date.slice(0, 10) // Get YYYY-MM-DD format
      matchesDateRange = moveDate >= dateRange[0] && moveDate <= dateRange[1]
    }

    return matchesSearch && matchesProduct && matchesFrom && matchesTo && matchesDateRange
  })

  // Pagination
  const totalPages = Math.ceil(filteredMoves.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedMoves = filteredMoves.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, productFilter, toFilter, fromFilter, dateRange])

  const uniqueProducts = Array.from(new Set(moves.map((m: any) => m.product).filter(Boolean)))
  const uniqueTo = Array.from(new Set(moves.map((m: any) => m.to).filter(Boolean)))
  const uniqueFrom = Array.from(new Set(moves.map((m: any) => m.from).filter(Boolean)))

  const handleMoveClick = (move: any) => {
    // Check edit permission before opening modal
    if (!canEditPage("moves-history")) {
      return
    }
    setSelectedMove(move)
  }

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("moves-history")) {
      return
    }
    // Determine data to export
    let dataToExport = filteredMoves
    if (options.scope === "selected") {
      dataToExport = filteredMoves.filter((r) => rowSelection[String(r.id)])
    } else if (options.scope === "page") {
      dataToExport = paginatedMoves
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
      reference: {
        header: t('Reference'),
        accessor: (row: any) => row.reference || '-',
        isMonospace: true
      },
      product: {
        header: t('Product'),
        accessor: (row: any) => row.product || '-'
      },
      from: {
        header: t('From'),
        accessor: (row: any) => row.from || '-'
      },
      to: {
        header: t('To'),
        accessor: (row: any) => row.to || '-'
      },
      quantity: {
        header: t('Quantity'),
        accessor: (row: any) => `${row.quantity || 0} ${row.unit || ''}`
      },
      status: {
        header: t('Status'),
        accessor: (row: any) => row.status || '-',
        isStatus: true
      },
      date: {
        header: t('Date'),
        accessor: (row: any) => formatDate(row.date)
      },
    }

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Moves History Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Total Quantity'), value: data.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0) },
        { label: t('Completed Moves'), value: data.filter((r: any) => r.status === 'Done').length },
        { label: t('Pending Moves'), value: data.filter((r: any) => r.status === 'Pending').length }
      ]
    }

    exportData(options, dataToExport, config, dateRange)
    setIsExportModalOpen(false)
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
            {t("Warehouse Moves History")}
          </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
            {t("Real-time inventory movement tracking and analytics")}
          </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchData("stockMoves")}
                disabled={!!loading?.stockMoves}
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
                <RefreshCcw className={`w-4 h-4 ${loading?.stockMoves ? "animate-spin" : ""}`} />
                {loading?.stockMoves ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("moves-history") && (
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
                  onClick={() => {}}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("New Move")}
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
              label={t("Total Moves")}
              value={totalMoves}
              icon={Package}
              gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
              delay={0}
            />
            <StatCard
              label={t("Completed")}
              value={completedMoves}
              icon={CheckCircle2}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={1}
            />
            <StatCard
              label={t("Pending")}
              value={pendingMoves}
              icon={Clock}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Total Quantity")}
              value={totalQuantity.toLocaleString()}
              icon={ArrowRight}
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search moves...")}
            statusFilter={productFilter}
            onStatusChange={setProductFilter}
            statusOptions={uniqueProducts}
            statusPlaceholder={t("Product")}
            toFilter={toFilter}
            onToChange={setToFilter}
            toOptions={uniqueTo}
            toPlaceholder={t("Destination")}
            fromFilter={fromFilter}
            onFromChange={setFromFilter}
            fromOptions={uniqueFrom}
            fromPlaceholder={t("Source")}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            isMobile={isMobile}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {viewMode === "cards" ? (
            loading?.stockMoves ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <MoveCardSkeleton key={idx} colors={colors} />
                ))}
              </div>
            ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                    gap: "1.25rem",
                  }}
                >
                  {paginatedMoves.map((move, idx) => (
                    <MoveCard key={move.id} move={move} onClick={canEditPage("moves-history") ? () => handleMoveClick(move) : undefined} index={idx} />
                  ))}
                </div>
              )
          ) : (
            <DataTable
                  data={filteredMoves}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                  onSelectAllChange={setIsSelectAll}
                  onExport={canExportPage("moves-history") ? () => setIsExportModalOpen(true) : undefined}
                  columns={[
                    {
                      id: "id",
                      header: t("ID"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                          #{(row.original as any).id}
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
                      id: "product",
                      header: t("Product"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textPrimary, fontSize: "0.9375rem", fontWeight: 600 }}>
                          {(row.original as any).product || "—"}
                        </span>
                      ),
                    },
                    {
                      id: "from",
                      header: t("From"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                          {(row.original as any).from || "—"}
                        </span>
                      ),
                    },
                    {
                      id: "to",
                      header: t("To"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                          {(row.original as any).to || "—"}
                        </span>
                      ),
                    },
                    {
                      id: "quantity",
                      header: t("Quantity"),
                      cell: ({ row }) => {
                        const move = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                            {move.quantity.toFixed(2)} {move.unit}
                          </span>
                        )
                      },
                    },
                    {
                      id: "date",
                      header: t("Date"),
                      cell: ({ row }) => {
                        const move = row.original as any
                        if (!move.date) return <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>—</span>
                        try {
                          const date = new Date(move.date)
                          if (!isNaN(date.getTime())) {
                            const formattedDate = date.toLocaleDateString(i18n.language, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                            return (
                              <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                                {formattedDate}
                              </span>
                            )
                          }
                        } catch (e) {
                          // Keep original if parsing fails
                        }
                        return (
                          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                            {move.date}
                          </span>
                        )
                      },
                    },
                    {
                      id: "status",
                      header: t("Status"),
                      cell: ({ row }) => {
                        const move = row.original as any
                        const status = move.status
                        const statusTheme = {
                          Done: { bg: "rgba(67, 233, 123, 0.1)", text: "#43e97b" },
                          Cancelled: { bg: "rgba(245, 158, 11, 0.1)", text: "#f5576c" },
                          Pending: { bg: "rgba(79, 172, 254, 0.1)", text: "#4facfe" },
                        }
                        const theme = statusTheme[status as keyof typeof statusTheme] || statusTheme.Pending
                        return (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.25rem 0.75rem",
                              borderRadius: "999px",
                              background: theme.bg,
                              color: theme.text,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {t(status)}
                          </span>
                        )
                      },
                    },
                    {
                      id: "lotSerial",
                      header: t("Lot/Serial"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                          {(row.original as any).lotSerial || "—"}
                        </span>
                      ),
                    },
                    {
                      id: "quantityDone",
                      header: t("Quantity Done"),
                      cell: ({ row }) => {
                        const move = row.original as any
                        return (
                          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                            {move.quantityDone ? `${move.quantityDone.toFixed(2)} ${move.unit}` : "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "origin",
                      header: t("Origin"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                          {(row.original as any).origin || "—"}
                        </span>
                      ),
                    },
                    {
                      id: "pickingName",
                      header: t("Picking"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                          {(row.original as any).pickingName || "—"}
                        </span>
                      ),
                    },
                  ]}
                  visibleColumns={visibleColumns}
                  onVisibleColumnsChange={setVisibleColumns}
                  actions={(move) => {
                    const moveId = (move as any).id
                    return [
                      {
                        key: "view",
                        label: t("View"),
                        icon: Eye,
                        onClick: () => navigate(`/moves-history/view/${moveId}`),
                      },
                    ]
                  }}
                  actionsLabel={t("Actions")}
                  isRTL={isRTL}
                  isLoading={loading?.stockMoves}
                  getRowIcon={() => {
                    return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                  }}
                  showPagination={true}
                  defaultItemsPerPage={10}
                />
              )}

              {filteredMoves.length === 0 && !loading?.stockMoves && (
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
                    <ArrowRight size={28} color="#FFFFFF" />
                  </div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {t("No moves found")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                </div>
              )}

              {filteredMoves.length > 0 && viewMode === "cards" && (
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
        </div>
      </div>

      {canExportPage("moves-history") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={filteredMoves.length}
          selectedCount={Object.keys(rowSelection).length}
          isSelectAll={isSelectAll === true}
        />
      )}
    </div>
  )
}

// Skeleton component matching MoveCard structure
function MoveCardSkeleton({ colors }: { colors: any }) {
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
                  marginBottom: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              {/* Date */}
              <Skeleton
                variant="text"
                width="50%"
                height={14}
                sx={{
                  bgcolor: colors.mutedBg,
                }}
              />
            </div>
        </div>

          {/* Details Visualization */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0" }}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                }}
          >
            <div
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    justifyContent: "center",
                    paddingTop: "0.25rem",
                  }}
                >
                  <Skeleton variant="circular" width={10} height={10} sx={{ bgcolor: colors.mutedBg }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Skeleton
                    variant="text"
                    width="40%"
                    height={16}
                    sx={{
                      bgcolor: colors.mutedBg,
                      marginBottom: "0.5rem",
                    }}
                  />
                  <Skeleton
                    variant="text"
                    width="80%"
                    height={20}
                    sx={{
                      bgcolor: colors.mutedBg,
                    }}
                  />
                </div>
              </div>
            ))}
              </div>
        </div>
      </div>
    </div>
  )
}
