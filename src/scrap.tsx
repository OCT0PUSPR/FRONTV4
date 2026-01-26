"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
  Package,
  X,
  Edit,
  Filter,
  RefreshCcw,
} from "lucide-react"
import { Button } from "../@/components/ui/button"
import { useTheme } from "../context/theme"
import { useCasl } from "../context/casl"
import { ScrapCard } from "./components/ScrapCard"
import { StatCard } from "./components/StatCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Skeleton } from "@mui/material"
import { useAuth } from "../context/auth"
import Toast from "./components/Toast"
import { DataTable, ColumnDef } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import { useSmartFieldRecords } from "./hooks/useSmartFieldRecords"
import { generateColumnsFromFields } from "./utils/generateColumnsFromFields"

// Helper: map stock.scrap to UI card shape used in this page
type ScrapCardItem = {
  id: number
  reference: string
  date: string
  product: string
  quantity: number
  unitOfMeasure: string
  sourceLocation: string
  scrapLocation: string
  scrapReason: string
  owner: string
  package: string
  sourceDocument: string
  replenishQuantities: boolean
  status: string
}

function mapScrapToCard(s: any): ScrapCardItem {
  return {
    id: s.id,
    reference: s.name || `SCRAP-${s.id}`,
    date: (s.date_done || '').slice(0,10),
    product: Array.isArray(s.product_id) ? s.product_id[1] : s.product_id,
    quantity: s.scrap_qty ?? 0,
    unitOfMeasure: Array.isArray(s.product_uom_id) ? s.product_uom_id[1] : s.product_uom_id,
    sourceLocation: Array.isArray(s.location_id) ? s.location_id[1] : s.location_id,
    scrapLocation: 'Virtual Locations/Scrap',
    scrapReason: '',
    owner: Array.isArray(s.owner_id) ? s.owner_id[1] : (s.owner_id || ''),
    package: Array.isArray(s.package_id) ? s.package_id[1] : (s.package_id || ''),
    sourceDocument: Array.isArray(s.picking_id) ? s.picking_id[1] : (s.picking_id || ''),
    replenishQuantities: false,
    status: s.state || 'draft',
  }
}

export default function ScrapOrdersPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const navigate = useNavigate()
  const { sessionId, uid } = useAuth()
  const { canCreatePage, canEditPage, canExportPage } = useCasl()
  
  // Fetch records using SmartFieldSelector
  const { records: smartFieldRecords, fields: smartFields, columns: availableColumns, loading: smartFieldLoading, refetch: refetchSmartFields } = useSmartFieldRecords({
    modelName: 'stock.scrap',
    enabled: !!sessionId,
  })
  
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [ownerFilter, setOwnerFilter] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isSelectAll, setIsSelectAll] = useState<boolean | "indeterminate">(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Generate columns from SmartFieldSelector fields
  const tableColumns = useMemo(() => {
    if (smartFields.length === 0) {
      // Fallback columns if no fields available
      return [
        {
          id: "id",
          header: t("Scrap ID"),
          cell: ({ row }: any) => (
            <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 600 }}>
              #{row.original.id}
            </span>
          ),
        },
        {
          id: "name",
          header: t("Reference"),
          cell: ({ row }: any) => (
            <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontFamily: "monospace" }}>
              {(row.original as any).name || "—"}
            </span>
          ),
        },
      ]
    }
    return generateColumnsFromFields(smartFields, colors, t)
  }, [smartFields, colors, t, i18n?.language || 'en'])

  // Set default visible columns
  useEffect(() => {
    if (availableColumns.length > 0 && visibleColumns.length === 0) {
      const defaultCols: string[] = []
      const nameFields = ['display_name', 'name', 'reference', 'default_code']
      const statusFields = ['status', 'state']

      // 1. Add 'id' if available
      if (availableColumns.some(col => col.id === 'id')) {
        defaultCols.push('id')
      }

      // 2. Add first available name field
      for (const nameField of nameFields) {
        if (availableColumns.some(col => col.id === nameField) && !defaultCols.includes(nameField)) {
          defaultCols.push(nameField)
          break
        }
      }

      // 3. Add other fields up to 6, excluding status/state
      availableColumns.forEach(col => {
        if (defaultCols.length < 6 && !defaultCols.includes(col.id) && !statusFields.includes(col.id)) {
          defaultCols.push(col.id)
        }
      })

      // 4. Add status/state field last if available and not already added
      for (const statusField of statusFields) {
        if (availableColumns.some(col => col.id === statusField) && !defaultCols.includes(statusField)) {
          defaultCols.push(statusField)
          break
        }
      }
      setVisibleColumns(defaultCols)
    }
  }, [availableColumns, visibleColumns.length])

  // Use records from SmartFieldSelector
  const scrapCards: ScrapCardItem[] = useMemo(() => {
    return smartFieldRecords.map((s: any) => ({
      ...mapScrapToCard(s),
      rawScrap: s,
    })) as ScrapCardItem[]
  }, [smartFieldRecords])

  const uniqueStatuses = useMemo(() => {
    const statuses = smartFieldRecords.map((s: any) => s.state || s.status || 'draft')
    return Array.from(new Set(statuses)).filter(Boolean)
  }, [smartFieldRecords])
  
  const uniqueOwners = useMemo(() => {
    const owners = smartFieldRecords.map((s: any) => {
      if (Array.isArray(s.owner_id)) return s.owner_id[1]
      return s.owner_id || ''
    })
    return Array.from(new Set(owners)).filter(Boolean)
  }, [smartFieldRecords])

  const filteredScraps = useMemo(() => {
    return scrapCards.filter((scrap: ScrapCardItem) => {
    const matchesSearch =
      scrap.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scrap.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scrap.scrapReason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scrap.sourceLocation.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(scrap.status)
      const matchesOwner = ownerFilter.length === 0 || ownerFilter.includes(scrap.owner)

    return matchesSearch && matchesStatus && matchesOwner
  })
  }, [scrapCards, searchQuery, statusFilter, ownerFilter])

  // Pagination
  const totalPages = Math.ceil(filteredScraps.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedScraps = filteredScraps.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, ownerFilter])

  const totalScraps = scrapCards.length
  const draftScraps = scrapCards.filter((s: ScrapCardItem) => s.status === "draft").length
  const todayStr = new Date().toISOString().slice(0,10)
  const completedToday = scrapCards.filter((s: ScrapCardItem) => s.status === "done" && s.date === todayStr).length
  const totalQuantityScrapped = scrapCards
    .filter((s: ScrapCardItem) => s.status === "done")
    .reduce((sum: number, s: ScrapCardItem) => sum + s.quantity, 0)

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "draft":
        return { bg: colors.card, text: colors.textSecondary, border: colors.border }
      case "done":
        return { bg: colors.success, text: "#0A0A0A", border: colors.success }
      default:
        return { bg: colors.card, text: colors.textSecondary, border: colors.border }
    }
  }

  const getStatusLabel = (status: string) => {
    const label = status.charAt(0).toUpperCase() + status.slice(1)
    return t(label)
  }

  const openModal = (scrapId: number) => {
    // Check edit permission before navigating
    if (!canEditPage("scrap")) {
      return
    }
    navigate(`/scrap/edit/${scrapId}`)
  }

  const handleAddScrap = () => {
    navigate('/scrap/create')
  }

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("scrap")) {
      return
    }
    // Determine data to export
    let dataToExport = filteredScraps
    if (options.scope === "selected") {
      dataToExport = filteredScraps.filter((r) => rowSelection[String(r.id)])
    } else if (options.scope === "page") {
      // For table view, get current page data
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      dataToExport = filteredScraps.slice(startIndex, endIndex)
    }

    // Format date helper
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '-'
      const date = new Date(dateStr)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = String(date.getFullYear()).slice(-2)
      return `${day}/${month}/${year}`
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
        isBold: true
      },
      product: {
        header: t('Product'),
        accessor: (row: any) => row.product || '-'
      },
      quantity: {
        header: t('Quantity'),
        accessor: (row: any) => `${row.quantity || 0} ${row.unitOfMeasure || ''}`
      },
      sourceLocation: {
        header: t('Source Location'),
        accessor: (row: any) => row.sourceLocation || '-'
      },
      status: {
        header: t('Status'),
        accessor: (row: any) => getStatusLabel(row.status),
        isStatus: true
      },
      date: {
        header: t('Date'),
        accessor: (row: any) => formatDate(row.date)
      },
      unitOfMeasure: {
        header: t('Unit of Measure'),
        accessor: (row: any) => row.unitOfMeasure || '-'
      },
      scrapLocation: {
        header: t('Scrap Location'),
        accessor: (row: any) => row.scrapLocation || '-'
      },
      scrapReason: {
        header: t('Scrap Reason'),
        accessor: (row: any) => row.scrapReason || '-'
      },
      owner: {
        header: t('Owner'),
        accessor: (row: any) => row.owner || '-'
      },
      package: {
        header: t('Package'),
        accessor: (row: any) => row.package || '-'
      },
      sourceDocument: {
        header: t('Source Document'),
        accessor: (row: any) => row.sourceDocument || '-'
      },
      replenishQuantities: {
        header: t('Replenish Quantities'),
        accessor: (row: any) => row.replenishQuantities ? t('Yes') : t('No')
      },
    }

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Scrap Orders Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Draft Orders'), value: data.filter((r: any) => r.status === 'draft').length },
        { label: t('Completed Orders'), value: data.filter((r: any) => r.status === 'done').length },
        { label: t('Total Quantity'), value: data.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0) }
      ]
    }

    exportData(options, dataToExport, config)
    setIsExportModalOpen(false)
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.background }}>
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
                {t("Scrap Orders")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage scrapped products and track inventory removals")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    await refetchSmartFields()
                  } catch (error) {
                    console.error("Failed to refresh scraps:", error)
                  }
                }}
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
              {canCreatePage("scrap") && (
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
                  onClick={handleAddScrap}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("New Scrap Order")}
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
              label={t("Total Scrap Orders")}
              value={totalScraps}
              icon={Trash2}
              gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
              delay={0}
            />
            <StatCard
              label={t("Draft Orders")}
              value={draftScraps}
              icon={FileText}
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              delay={1}
            />
            <StatCard
              label={t("Completed Today")}
              value={completedToday}
              icon={CheckCircle2}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Items Scrapped")}
              value={totalQuantityScrapped}
              icon={Package}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
      </div>

          <div style={{ marginTop: "-2rem", paddingTop: "2rem" }}>
            <TransferFiltersBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={t("Search scraps...")}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              statusOptions={uniqueStatuses}
              toFilter={[]}
              onToChange={() => {}}
              toOptions={[]}
              fromFilter={ownerFilter}
              onFromChange={setOwnerFilter}
              fromOptions={uniqueOwners}
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
                    <ScrapCardSkeleton key={idx} colors={colors} />
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
                  {paginatedScraps.map((scrap, idx) => (
                    <ScrapCard key={scrap.id} scrap={scrap} onClick={canEditPage("scrap") ? () => openModal(scrap.id) : undefined} index={idx} />
                  ))}
                </div>
              )
            ) : (
              <DataTable
                data={smartFieldRecords}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                onSelectAllChange={setIsSelectAll}
                onExport={canExportPage("scrap") ? () => setIsExportModalOpen(true) : undefined}
                columns={tableColumns}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
                actions={(scrap) => {
                  return [
                    ...(canEditPage("scrap") ? [{
                      key: "edit",
                      label: t("Edit"),
                      icon: Edit,
                      onClick: () => openModal((scrap as any).id),
                    }] : []),
                  ]
                }}
                actionsLabel={t("Actions")}
                isRTL={isRTL}
                isLoading={smartFieldLoading}
                getRowIcon={(scrap) => {
                  const status = (scrap as any).state || (scrap as any).status || "draft"
                  const getStatusIcon = (s: string) => {
                    switch (s.toLowerCase()) {
                      case "done":
                        return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                      case "draft":
                        return { icon: FileText, gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)" }
                      default:
                        return { icon: FileText, gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)" }
                    }
                  }
                  return getStatusIcon(status)
                }}
                showPagination={true}
                defaultItemsPerPage={10}
              />
            )}

            {!smartFieldLoading && viewMode === "cards" && (
              <>
                {filteredScraps.length === 0 && (
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
                      <Trash2 size={28} color="#FFFFFF" />
                    </div>
                    <h3
                    style={{
                        fontSize: "1.25rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("No scrap orders found")}
                    </h3>
                    <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
            </div>
                )}

                {filteredScraps.length > 0 && (
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
            )}

            {!smartFieldLoading && viewMode === "table" && filteredScraps.length === 0 && (
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
                  <Trash2 size={28} color="#FFFFFF" />
                </div>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    marginBottom: "0.5rem",
                  }}
                >
                  {t("No scrap orders found")}
                </h3>
                <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal removed - using DynamicRecordPage instead */}

        {toast && (
          <Toast
            text={toast.text}
            state={toast.state}
            onClose={() => setToast(null)}
          />
        )}

        {canExportPage("scrap") && (
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            onExport={handleExport}
            totalRecords={filteredScraps.length}
            selectedCount={Object.keys(rowSelection).length}
            isSelectAll={isSelectAll === true}
          />
        )}
      </div>
  )
}

// Skeleton component matching ScrapCard structure
function ScrapCardSkeleton({ colors }: { colors: any }) {
  const { i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

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
        <div
          style={{
            position: "absolute",
            top: 0,
            [isRTL ? 'left' : 'right']: 0,
            padding: "1rem",
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
                width="70%"
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
                [isRTL ? 'right' : 'left']: "19px",
                top: "24px",
                bottom: "24px",
                width: "2px",
                borderLeft: isRTL ? 'none' : `2px dashed ${colors.border}`,
                borderRight: isRTL ? `2px dashed ${colors.border}` : 'none',
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Source Location */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", position: "relative", paddingLeft: isRTL ? 0 : '2.5rem', paddingRight: isRTL ? '2.5rem' : 0 }}>
                <div style={{ width: "40px", display: "flex", justifyContent: "center", paddingTop: "0.25rem", zIndex: 10, position: "absolute", [isRTL ? 'right' : 'left']: '19px', transform: isRTL ? 'translateX(50%)' : 'translateX(-50%)' }}>
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

              {/* Scrap Location */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", position: "relative", paddingLeft: isRTL ? 0 : '2.5rem', paddingRight: isRTL ? '2.5rem' : 0 }}>
                <div style={{ width: "40px", display: "flex", justifyContent: "center", paddingTop: "0.25rem", zIndex: 10, position: "absolute", [isRTL ? 'right' : 'left']: '19px', transform: isRTL ? 'translateX(50%)' : 'translateX(-50%)' }}>
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
              {/* Quantity */}
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

