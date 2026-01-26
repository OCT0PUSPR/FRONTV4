"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "../@/components/ui/button"
import { Search, Plus, DollarSign, FileText, CheckCircle2, RefreshCcw, X, Edit } from "lucide-react"
import { StatCard } from "./components/StatCard"
import { LandingCostCard } from "./components/LandingCostCard"
import { useTheme } from "../context/theme"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import Toast from "./components/Toast"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Skeleton } from "@mui/material"
import { DataTable, ColumnDef } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import { useSmartFieldRecords } from "./hooks/useSmartFieldRecords"
import { generateColumnsFromFields } from "./utils/generateColumnsFromFields"

// Skeleton component matching LandingCostCard structure
function LandingCostCardSkeleton({ colors }: { colors: any }) {
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
              {/* Name */}
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

          {/* Cost Visualization */}
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
              {/* Total Cost */}
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
                    width="60%"
                    height={14}
                    sx={{
                      bgcolor: colors.border,
                    }}
                  />
                </div>
              </div>

              {/* Apply On */}
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
                    width="20%"
                    height={10}
                    sx={{
                      marginBottom: "0.125rem",
                      bgcolor: colors.border,
                    }}
                  />
                  <Skeleton
                    variant="text"
                    width="50%"
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
              {/* Vendor Bill */}
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

            {/* Apply On Badge */}
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

export default function LandedCostsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { colors, mode } = useTheme()
  const { sessionId, uid } = useAuth()
  const { canCreatePage, canEditPage, canExportPage } = useCasl()
  const isRTL = i18n.dir() === "rtl"
  
  // Fetch records using SmartFieldSelector
  const { records: smartFieldRecords, fields: smartFields, columns: availableColumns, loading: smartFieldLoading, refetch: refetchSmartFields } = useSmartFieldRecords({
    modelName: 'stock.landed.cost',
    enabled: !!sessionId,
  })
  
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [applyOnFilter, setApplyOnFilter] = useState<string[]>([])
  const [vendorBillFilter, setVendorBillFilter] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [toast, setToast] = useState<null | { text: string; state: "success" | "error" }>(null)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isSelectAll, setIsSelectAll] = useState<boolean | "indeterminate">(false)

  // Generate columns from SmartFieldSelector fields
  const tableColumns = useMemo(() => {
    if (smartFields.length === 0) {
      // Fallback columns if no fields available
      return [
        {
          id: "id",
          header: t("Landed Cost ID"),
          cell: ({ row }: any) => (
            <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 600 }}>
              #{row.original.id}
            </span>
          ),
        },
        {
          id: "name",
          header: t("Name"),
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
  const landedCosts = useMemo(() => smartFieldRecords, [smartFieldRecords])

  const totalCosts = useMemo(
    () =>
      landedCosts.reduce((acc: number, cost: any) => acc + (cost.amount_total || cost.totalCost || 0), 0),
    [landedCosts],
  )
  const draftCosts = useMemo(
    () => landedCosts.filter((cost: any) => cost.state === "draft").length,
    [landedCosts],
  )
  const postedThisMonth = useMemo(
    () =>
      landedCosts.filter(
        (cost: any) => cost.state === "posted" && new Date(cost.date || '').getMonth() === new Date().getMonth(),
      ).length,
    [landedCosts],
  )
  const totalAmount = useMemo(
    () =>
      landedCosts.reduce((acc: number, cost: any) => acc + (cost.amount_total || cost.totalCost || 0), 0),
    [landedCosts],
  )
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const uniqueStatuses = useMemo(() => {
    const statuses = landedCosts.map((cost: any) => cost.state || 'draft')
    return Array.from(new Set(statuses)).filter(Boolean)
  }, [landedCosts])
  
  const uniqueApplyOn = useMemo(() => ["Transfers", "Manufacturing Orders"], [])
  const uniqueVendorBill = useMemo(() => ["with-bill", "without-bill"], [])

  const filteredCosts = useMemo(() => {
    return landedCosts.filter((cost: any) => {
      const nameMatch = (cost.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      const statusMatch = statusFilter.length === 0 || statusFilter.includes(cost.state || 'draft')
      const applyOnMatch =
        applyOnFilter.length === 0 ||
        applyOnFilter.some(filter => {
          if (filter === "Transfers") {
            return cost.target_model === 'picking' || cost.picking_ids?.length
          }
          if (filter === "Manufacturing Orders") {
            return cost.target_model === 'manufacturing' || (cost.picking_ids && cost.picking_ids.length === 0)
          }
          return false
        })
      const vendorBillMatch =
        vendorBillFilter.length === 0 ||
        vendorBillFilter.some(filter => {
          if (filter === "with-bill") return cost.vendor_bill_id || cost.account_move_id
          if (filter === "without-bill") return !cost.vendor_bill_id && !cost.account_move_id
          return false
        })
      return nameMatch && statusMatch && applyOnMatch && vendorBillMatch
    })
  }, [landedCosts, searchQuery, statusFilter, applyOnFilter, vendorBillFilter])

  // Pagination
  const totalPages = Math.ceil(filteredCosts.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCosts = filteredCosts.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, applyOnFilter, vendorBillFilter])

  const handleViewDetails = (costId: number) => {
    // Check edit permission before navigating
    if (!canEditPage("landed-costs")) {
      return
    }
    navigate(`/landed-costs/edit/${costId}`)
  }

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("landed-costs")) {
      return
    }
    // Determine data to export
    let dataToExport = filteredCosts
    if (options.scope === "selected") {
      dataToExport = filteredCosts.filter((r) => rowSelection[String(r.id)])
    } else if (options.scope === "page") {
      // For table view, get current page data
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      dataToExport = filteredCosts.slice(startIndex, endIndex)
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

    // Build export columns from smart fields
    const exportColumns = visibleColumns
      .map(colId => {
        const field = smartFields.find(f => (f.name || f.field_name) === colId)
        if (!field) return null
        
        return {
          header: t(colId) !== colId ? t(colId) : (field.label || field.field_label || colId),
        accessor: (row: any) => {
            const value = row[colId]
            if (value === null || value === undefined || value === '' || value === false) {
              return t('N/A')
            }
            if (field.type === 'many2one' && Array.isArray(value)) {
              return value[1] || value[0]?.toString() || t('N/A')
            }
            if (field.type === 'boolean') {
              return value ? t('Yes') : t('No')
            }
            if (field.type === 'date' || field.type === 'datetime') {
              return formatDate(value)
            }
            if (field.type === 'monetary' || field.type === 'float') {
              return typeof value === 'number' ? value.toFixed(2) : value?.toString() || t('N/A')
            }
            return value?.toString() || t('N/A')
          }
        }
      })
      .filter(Boolean)

    const config = {
      title: t("Landed Costs Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Draft Costs'), value: data.filter((r: any) => r.state === 'draft').length },
        { label: t('Posted Costs'), value: data.filter((r: any) => r.state === 'posted' || r.state === 'done').length },
        { label: t('Total Amount'), value: `${data.reduce((sum: number, r: any) => sum + (r.totalCost || r.amount_total || 0), 0).toLocaleString()} ${data[0]?.currency || 'LE'}` }
      ]
    }

    exportData(options, dataToExport, config)
    setIsExportModalOpen(false)
  }

  const handleRefresh = async () => {
    if (sessionId) {
      try {
        await refetchSmartFields()
      } catch (error) {
        console.error("Failed to refresh landed costs:", error)
      }
    }
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
              {t("Landed Costs")}
            </h1>
            <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
              {t("Manage additional costs for inventory valuation")}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
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
            {canCreatePage("landed-costs") && (
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
                onClick={() => navigate('/landed-costs/create')}
              >
                <Plus size={isMobile ? 18 : 20} />
                {t("New Landed Cost")}
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
            label={t("Total Costs")}
            value={totalCosts}
            icon={FileText}
            gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
            delay={0}
          />
          <StatCard
            label={t("Draft")}
            value={draftCosts}
            icon={FileText}
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            delay={1}
          />
          <StatCard
            label={t("Posted This Month")}
            value={postedThisMonth}
            icon={CheckCircle2}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            delay={2}
          />
          <StatCard
            label={t("Total Amount")}
            value={`${totalAmount.toLocaleString()} LE`}
            icon={DollarSign}
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            delay={3}
          />
        </div>

        <TransferFiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("Search by name, vendor bill...")}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={uniqueStatuses}
          statusLabelMap={{
            "draft": t("Draft"),
            "posted": t("Posted"),
          }}
          toFilter={applyOnFilter}
          onToChange={setApplyOnFilter}
          toOptions={uniqueApplyOn}
          toPlaceholder={t("Apply On")}
          fromFilter={vendorBillFilter}
          onFromChange={setVendorBillFilter}
          fromOptions={uniqueVendorBill}
          fromPlaceholder={t("Vendor Bill")}
          fromLabelMap={{
            "with-bill": t("With Bill"),
            "without-bill": t("Without Bill"),
          }}
          showDateRange={false}
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
                <LandingCostCardSkeleton key={idx} colors={colors} />
              ))}
            </div>
          ) : (
            <>
              {paginatedCosts.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                    gap: "1.25rem",
                  }}
                >
                  {paginatedCosts.map((cost: any, idx: number) => (
                    <LandingCostCard key={cost.id} cost={cost} onClick={canEditPage("landed-costs") ? () => handleViewDetails(cost.id) : undefined} index={idx} />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    background: colors.card,
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
                      background: `${colors.action}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1.5rem",
                    }}
                  >
                    <FileText size={28} color={colors.action} />
                  </div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "0.5rem" }}>
                    {t("No landed costs found")}
                  </h3>
                  <p style={{ color: colors.textSecondary, fontSize: "0.9rem" }}>
                    {t("Try adjusting your filters or search term")}
                  </p>
                </div>
              )}

              {filteredCosts.length > 0 && (
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
            onExport={canExportPage("landed-costs") ? () => setIsExportModalOpen(true) : undefined}
            isLoading={smartFieldLoading}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            columns={tableColumns}
            actions={(cost) => [
              ...(canEditPage("landed-costs") ? [{
                key: "edit",
                label: t("Edit"),
                icon: Edit,
                onClick: () => handleViewDetails((cost as any).id),
              }] : []),
            ]}
            isRTL={isRTL}
            getRowIcon={(cost) => {
              const state = (cost as any).state || "draft"
              const getStatusIcon = (s: string) => {
                switch (s.toLowerCase()) {
                  case "done":
                  case "posted":
                    return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                  case "draft":
                    return { icon: FileText, gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)" }
                  case "cancelled":
                  case "cancel":
                    return { icon: X, gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }
                  default:
                    return { icon: FileText, gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)" }
                }
              }
              return getStatusIcon(state)
            }}
            showPagination={true}
            defaultItemsPerPage={10}
          />
        )}
        </div>
      </div>

      {/* Modal removed - using DynamicRecordPage instead */}
      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
      
      {canExportPage("landed-costs") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={filteredCosts.length}
          selectedCount={Object.keys(rowSelection).length}
          isSelectAll={isSelectAll === true}
        />
      )}
    </div>
  )
}
