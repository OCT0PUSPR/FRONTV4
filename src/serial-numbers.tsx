"use client"

import { CardContent } from "../@/components/ui/card"

import { Card } from "../@/components/ui/card"

import { useMemo, useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Plus, Package, TrendingUp, DollarSign, AlertTriangle, RefreshCcw, Edit, CheckCircle2 } from "lucide-react"
import { StatCard } from "./components/StatCard"
import { LotCard } from "./components/LotCard"
import { Input } from "../@/components/ui/input"
import { Button } from "../@/components/ui/button"
import { Label } from "../@/components/ui/label"
import { CustomDropdown as NewCustomDropdown } from "./components/NewCustomDropdown"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import Toast from "./components/Toast"
import { DatePicker } from "./components/ui/date-picker"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { DataTable, ColumnDef } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import { useSmartFieldRecords } from "./hooks/useSmartFieldRecords"
import { generateColumnsFromFields } from "./utils/generateColumnsFromFields"

interface LotSerialNumber {
  id: string
  lotNumber: string
  internalReference: string
  product: string
  productCategory: string
  onHandQuantity: number
  totalValue: number
  averageCost: number
  cost: number
  location: string
  createdOn: string
  expiryDate?: string
  status: "Active" | "Expired" | "Reserved" | "Depleted"
  description?: string
  traceabilityEvents: Array<{
    date: string
    event: string
    location: string
    quantity: number
  }>
}

// Real data composition from context
function buildLotsView(lots: any[], quants: any[], products: any[], locations: any[]): LotSerialNumber[] {
  const productMap = new Map<number, any>()
  for (const p of products || []) productMap.set(p.id, p)
  const locationName = new Map<number, string>()
  for (const l of locations || []) locationName.set(l.id, l.complete_name || l.display_name || l.name)

  // Index quants by lot id
  const quantsByLot = new Map<number, any[]>()
  for (const q of quants || []) {
    const lotId = Array.isArray(q.lot_id) ? q.lot_id[0] : q.lot_id
    if (!lotId) continue
    if (!quantsByLot.has(lotId)) quantsByLot.set(lotId, [])
    quantsByLot.get(lotId)!.push(q)
  }

  const results: LotSerialNumber[] = []
  for (const lot of lots || []) {
    const idNum = Number(lot.id)
    const quantsForLot = quantsByLot.get(idNum) || []
    const anyQuant = quantsForLot[0]
    const pid = Array.isArray(lot.product_id) ? lot.product_id[0] : lot.product_id
    const prod = productMap.get(pid) || {}
    const qty = quantsForLot.reduce((s, q) => s + Number(q.available_quantity ?? q.quantity ?? 0), 0)
    const reserved = quantsForLot.reduce((s, q) => s + Number(q.reserved_quantity ?? 0), 0)
    const stdPrice = Number(prod.standard_price ?? 0)
    const loc = anyQuant
      ? Array.isArray(anyQuant.location_id)
        ? anyQuant.location_id[0]
        : anyQuant.location_id
      : undefined
    const locName = typeof loc === "number" ? locationName.get(loc) || "" : ""
    const expiry = lot.life_date || lot.use_date || lot.removal_date || undefined
    const now = new Date()
    const status: LotSerialNumber["status"] =
      qty <= 0 ? "Depleted" : expiry && new Date(expiry) < now ? "Expired" : reserved > 0 ? "Reserved" : "Active"

    results.push({
      id: String(idNum),
      lotNumber: lot.name || `LOT-${idNum}`,
      internalReference: prod.default_code || "",
      product: Array.isArray(lot.product_id) ? lot.product_id[1] : prod.name || "",
      productCategory: Array.isArray(prod.categ_id) ? prod.categ_id[1] : "",
      onHandQuantity: qty,
      totalValue: qty * stdPrice,
      averageCost: stdPrice,
      cost: stdPrice,
      location: locName || "—",
      createdOn: lot.create_date || "",
      expiryDate: expiry,
      status,
      description: lot.description || "",
      traceabilityEvents: [],
    })
  }
  return results
}


export default function LotsSerialNumbersPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const navigate = useNavigate()
  const { sessionId, uid } = useAuth()
  const { canCreatePage, canEditPage, canExportPage } = useCasl()
  
  // Fetch records using SmartFieldSelector
  const { records: smartFieldRecords, fields: smartFields, columns: availableColumns, loading: smartFieldLoading, refetch: refetchSmartFields } = useSmartFieldRecords({
    modelName: 'stock.lot',
    enabled: !!sessionId,
  })
  
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  const [searchQuery, setSearchQuery] = useState("")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [locationFilter, setLocationFilter] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)

  // Update visible columns when available columns change
  useEffect(() => {
    if (availableColumns.length > 0 && visibleColumns.length === 0) {
      // Set default visible columns for stock.lot model:
      // Requested: Lot/Serial number (name) - Location - Product - On hand quantity - Internal reference - Status
      const defaultCols: string[] = []

      // Candidate field ids for each logical column, in preference order
      const lotNumberFields = ['name']
      const locationFields = ['location_id']
      const productFields = ['product_id']
      const qtyFields = ['qty_available', 'quantity', 'on_hand_quantity']
      const internalRefFields = ['default_code', 'internal_reference', 'ref']
      const statusFields = ['status', 'state']

      // Helper to push first existing field from a candidate list
      const pushFirstExisting = (candidates: string[]) => {
        for (const field of candidates) {
          if (availableColumns.some(col => col.id === field) && !defaultCols.includes(field)) {
            defaultCols.push(field)
            break
          }
        }
      }

      // Add requested logical columns in order
      pushFirstExisting(lotNumberFields)
      pushFirstExisting(locationFields)
      pushFirstExisting(productFields)
      pushFirstExisting(qtyFields)
      pushFirstExisting(internalRefFields)
      pushFirstExisting(statusFields)
      
      // If we still need more columns, add id first if not already added
      if (defaultCols.length < 6 && !defaultCols.includes('id')) {
        if (availableColumns.some(col => col.id === 'id')) {
          defaultCols.push('id')
        }
      }

      // Fill remaining slots with other available columns (excluding status/state which we already added)
      availableColumns.forEach(col => {
        if (defaultCols.length < 6 && !defaultCols.includes(col.id) && !statusFields.includes(col.id)) {
          defaultCols.push(col.id)
        }
      })

      // Ensure status/state is included if available (add at the end if not already added)
      for (const field of statusFields) {
        if (availableColumns.some(col => col.id === field) && !defaultCols.includes(field)) {
          defaultCols.push(field)
          break
        }
      }

      setVisibleColumns(defaultCols)
    }
  }, [availableColumns, visibleColumns.length])


  // Generate columns from SmartFieldSelector fields
  const tableColumns = useMemo(() => {
    if (smartFields.length === 0) {
      // Fallback columns if no fields available
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
          id: "name",
          header: t("Name"),
          cell: ({ row }: any) => (
            <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
              {row.original.name || "—"}
            </span>
          ),
        },
      ]
    }
    return generateColumnsFromFields(smartFields, colors, t)
  }, [smartFields, colors, t, i18n?.language || 'en'])

  // Filter records based on search and filters
  const filteredLots = useMemo(() => {
    return (smartFieldRecords || []).filter((lot: any) => {
      const lotName = (lot.name || "").toLowerCase()
      const productName = Array.isArray(lot.product_id) ? (lot.product_id[1] || "").toLowerCase() : ""
      const defaultCode = (lot.default_code || "").toLowerCase()
      const locationName = Array.isArray(lot.location_id) ? (lot.location_id[1] || "").toLowerCase() : ""
      
      const matchesSearch =
        lotName.includes(searchQuery.toLowerCase()) ||
        productName.includes(searchQuery.toLowerCase()) ||
        defaultCode.includes(searchQuery.toLowerCase()) ||
        locationName.includes(searchQuery.toLowerCase())

      // Note: Status, category, and location filters would need to be adapted based on actual field structure
      // For now, we'll keep basic search filtering
      return matchesSearch
    })
  }, [smartFieldRecords, searchQuery])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, categoryFilter, locationFilter])

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("lots-serial")) {
      return
    }
    // Determine data to export
    let dataToExport = smartFieldRecords
    if (options.scope === "selected") {
      dataToExport = smartFieldRecords.filter((lot: any) => rowSelection[String(lot.id)])
    } else if (options.scope === "page") {
      dataToExport = smartFieldRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
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

    // Define all possible columns based on available fields
    const allColumns: Record<string, any> = {}
    availableColumns.forEach(col => {
      allColumns[col.id] = {
        header: col.label,
        accessor: (row: any) => {
          const value = row[col.id]
          if (value === null || value === undefined) return '-'
          if (Array.isArray(value)) return value[1] || value[0] || '-'
          if (typeof value === 'object') return JSON.stringify(value)
          return String(value)
        }
      }
    })

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Serial Numbers Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
      ]
    }

    exportData(options, dataToExport, config, null)
    setIsExportModalOpen(false)
  }

  const totalLots = smartFieldRecords.length
  const activeLots = smartFieldRecords.length // Simplified - can be enhanced based on actual status field
  const totalValue = 0 // Simplified - can be calculated from actual data if needed
  const expiringLots = 0 // Simplified - can be calculated from expiry dates if available

  const getStatusStyle = (status: string): { bg: string; text: string; border?: string } => {
    switch (status) {
      case "Active":
        return { bg: colors.pillInfoBg, text: colors.pillInfoText }
      case "Reserved":
        return { bg: colors.inProgress, text: colors.textPrimary }
      case "Expired":
        return { bg: colors.cancel, text: "#FFFFFF" }
      case "Depleted":
        return { bg: colors.mutedBg, text: colors.textSecondary, border: colors.border }
      default:
        return { bg: colors.mutedBg, text: colors.textPrimary }
    }
  }

  const handleOpenModal = (lot: any) => {
    // Check edit permission before navigating
    if (!canEditPage("lots-serial")) {
      return
    }
    navigate(`/lots-serial/edit/${lot.id}`)
  }

  const handleAddLot = () => {
    navigate('/lots-serial/create')
  }

  const uniqueCategories: string[] = [] // Can be populated from smartFieldRecords if needed
  const uniqueLocations: string[] = [] // Can be populated from smartFieldRecords if needed
  const uniqueStatuses: string[] = [] // Can be populated from smartFieldRecords if needed

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
          .stat-card-hover {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .stat-card-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          }
        `}
      </style>
      <div
        style={{
          padding: isMobile ? "1rem" : "2rem",
          color: colors.textPrimary,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div 
          className="flex items-center justify-between"
          style={{ marginBottom: "2rem" }}
        >
          <div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
              {t("Lots / Serial Numbers")}
            </h1>
            <p className="mt-2 text-lg" style={{ color: colors.textSecondary }}>
              {t("Track and manage product lots and serial numbers")}
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
            {canCreatePage("lots-serial") && (
              <Button
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
                  justifyContent: "center",
                }}
                onClick={handleAddLot}
              >
                <Plus size={20} />
                {t("Add Lot/Serial Number")}
              </Button>
            )}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gap: "1.25rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            marginBottom: "2rem",
          }}
        >
          <StatCard
            label={t("Total Lots")}
            value={totalLots}
            icon={Package}
            gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
            delay={0}
          />
          <StatCard
            label={t("Active Lots")}
            value={activeLots}
            icon={TrendingUp}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            delay={1}
          />
          <StatCard
            label={t("Total Value")}
            value={`$${totalValue.toLocaleString()}`}
            icon={DollarSign}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            delay={2}
          />
          <StatCard
            label={t("Expiring Soon")}
            value={expiringLots}
            icon={AlertTriangle}
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            delay={3}
          />
        </div>

        <TransferFiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("Search by lot number, product, reference, or location...")}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={uniqueStatuses}
          statusPlaceholder={t("Status")}
          statusLabelMap={{
            "Active": t("Active"),
            "Reserved": t("Reserved"),
            "Expired": t("Expired"),
            "Depleted": t("Depleted"),
          }}
          toFilter={categoryFilter}
          onToChange={setCategoryFilter}
          toOptions={uniqueCategories}
          toPlaceholder={t("Category")}
          fromFilter={locationFilter}
          onFromChange={setLocationFilter}
          fromOptions={uniqueLocations}
          fromPlaceholder={t("Location")}
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
                <div
                  key={idx}
                  style={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "1rem",
                    padding: "1.5rem",
                    height: "300px",
                  }}
                />
              ))}
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gap: "1.25rem",
                  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                }}
              >
                {filteredLots.slice(0, itemsPerPage).map((lot: any, idx: number) => (
                  <LotCard
                    key={lot.id}
                    lot={{
                      id: String(lot.id),
                      lotNumber: lot.name || `LOT-${lot.id}`,
                      internalReference: "",
                      product: Array.isArray(lot.product_id) ? lot.product_id[1] : "",
                      productCategory: "",
                      onHandQuantity: 0,
                      totalValue: 0,
                      location: Array.isArray(lot.location_id) ? lot.location_id[1] : "",
                      createdOn: lot.create_date || "",
                      expiryDate: lot.life_date || lot.use_date || undefined,
                      status: "Active" as const,
                    }}
                    onClick={canEditPage("lots-serial") ? () => navigate(`/lots-serial/edit/${lot.id}`) : undefined}
                    index={idx}
                    onLocations={canEditPage("lots-serial") ? () => navigate(`/lots-serial/edit/${lot.id}`) : undefined}
                  />
                ))}
              </div>

              {filteredLots.length === 0 && !smartFieldLoading && (
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
                    <Package size={28} color={colors.action} />
                  </div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "0.5rem" }}>
                    {t("No lots found")}
                  </h3>
                  <p style={{ color: colors.textSecondary, fontSize: "0.9rem" }}>
                    {t("Try adjusting your filters or search term")}
                  </p>
                </div>
              )}

              {filteredLots.length > 0 && filteredLots.length > itemsPerPage && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "2rem",
                    padding: "1.25rem 1.5rem",
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "1rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ color: colors.textSecondary, fontSize: "0.9375rem", fontWeight: "500" }}>
                    {t("Showing")} {filteredLots.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredLots.length)} {t("of")} {filteredLots.length}{" "}
                    {t("lots")}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(1)}
                      style={{
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        height: "2.5rem",
                        paddingLeft: "1rem",
                        paddingRight: "1rem",
                      }}
                    >
                      {t("First")}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      style={{
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        height: "2.5rem",
                        paddingLeft: "1rem",
                        paddingRight: "1rem",
                      }}
                    >
                      {t("Previous")}
                    </Button>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0 1rem",
                        color: colors.textPrimary,
                        fontSize: "0.875rem",
                        fontWeight: "600",
                      }}
                    >
                      <span>
                        {t("Page")} {currentPage} {t("of")} {Math.ceil(filteredLots.length / itemsPerPage) || 1}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      disabled={currentPage >= Math.ceil(filteredLots.length / itemsPerPage)}
                      onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredLots.length / itemsPerPage), p + 1))}
                      style={{
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        height: "2.5rem",
                        paddingLeft: "1rem",
                        paddingRight: "1rem",
                      }}
                    >
                      {t("Next")}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={currentPage >= Math.ceil(filteredLots.length / itemsPerPage)}
                      onClick={() => setCurrentPage(Math.ceil(filteredLots.length / itemsPerPage))}
                      style={{
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        height: "2.5rem",
                        paddingLeft: "1rem",
                        paddingRight: "1rem",
                      }}
                    >
                      {t("Last")}
                    </Button>
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
            onExport={canExportPage("lots-serial") ? () => setIsExportModalOpen(true) : undefined}
            isLoading={smartFieldLoading}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            columns={tableColumns}
            actions={canEditPage("lots-serial") ? ((lot) => {
              const lotId = (lot as any).id
              return [
                {
                  key: "edit",
                  label: t("Edit"),
                  icon: Edit,
                  onClick: () => navigate(`/lots-serial/edit/${lotId}`),
                }
              ]
            }) : undefined}
            actionsLabel={t("Actions")}
            isRTL={isRTL}
            getRowIcon={() => {
              return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
            }}
            showPagination={true}
            defaultItemsPerPage={10}
          />
        )}

      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}

      {canExportPage("lots-serial") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={smartFieldRecords.length}
          selectedCount={Object.keys(rowSelection).length}
          isSelectAll={Object.keys(rowSelection).length === smartFieldRecords.length && smartFieldRecords.length > 0}
        />
      )}
        </div>
      </div>
    </div>
  )
}
