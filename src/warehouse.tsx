"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useTheme } from "../context/theme"
import { useTranslation } from "react-i18next"
import { Warehouse, Package, TrendingUp, MapPin, Plus, DollarSign, Box, RefreshCcw, X, Edit, Trash2 } from "lucide-react"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import Toast from "./components/Toast"
import { CustomDropdown } from "./components/NewCustomDropdown"
import { CustomInput } from "./components/CusotmInput"
import { StatCard } from "./components/StatCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Button } from "../@/components/ui/button"
import { Skeleton } from "@mui/material"
import { Card } from "../@/components/ui/card"
import { NewCustomButton } from "./components/NewCustomButton"
import { IOSCheckbox } from "./components/IOSCheckbox"
import { DataTable } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"


export default function WarehousesPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { warehouses, quants, products, locations, fetchData, loading } = useData() as any
  const { sessionId, partnerId } = useAuth()
  const { canCreatePage } = useCasl()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [locationFilter, setLocationFilter] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "code",
    "items",
    "value",
    "status"
  ])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<any | null>(null)
  const [originalForm, setOriginalForm] = useState<any | null>(null)
  const [saveError, setSaveError] = useState<string>("")
  const [toast, setToast] = useState<{ text: string; state: 'success' | 'error' } | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
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

  // Fetch data only once on mount if missing
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (hasFetchedRef.current) return
    const sessionId = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
    if (!sessionId) return
    
    hasFetchedRef.current = true
    if (!Array.isArray(warehouses) || !warehouses.length) fetchData("warehouses")
    if (!Array.isArray(quants) || !quants.length) fetchData("quants")
    if (!Array.isArray(products) || !products.length) fetchData("products")
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [])

  // Get Odoo headers from localStorage
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase ="https://egy.thetalenter.net"
    const db = localStorage.getItem("odooDb") || localStorage.getItem("odoo_db") || "odoodb1"
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

  const warehousesData = useMemo(() => {
    // Precompute totals per warehouse from quants (stock.quant)
    // Build product price map from products (prefer standard_price, fallback list_price)
    const priceByProduct: Record<string | number, number> = {}
    for (const p of products || []) {
      const id = p.id
      const std = typeof p.standard_price === "number" ? p.standard_price : undefined
      const lst =
        typeof p.list_price === "number" ? p.list_price : typeof p.lst_price === "number" ? p.lst_price : undefined
      const price = std ?? lst ?? 0
      if (id != null) priceByProduct[id] = price
    }
    const sumByWarehouse: Record<string | number, { items: number; value: number }> = {}
    const getWhKey = (w: any) => w.id ?? w.code ?? w.name
    const getLocationNamesForWarehouse = (w: any) => {
      const names: string[] = []
      if (w.code) names.push(String(w.code))
      const lotName = w.lot_stock_id?.[1]
      if (lotName) names.push(String(lotName))
      const viewName = w.view_location_id?.[1]
      if (viewName) names.push(String(viewName))
      return names
    }
    // Build quick matcher list for each warehouse
    const matchers = (warehouses || []).map((w: any) => ({
      key: getWhKey(w),
      names: getLocationNamesForWarehouse(w),
    }))
    // Aggregate quants into warehouses by fuzzy matching location name
    for (const q of quants || []) {
      const locName: string = q.location_id?.[1] || ""
      if (!locName) continue
      for (const m of matchers) {
        if (m.names.some((n: string) => locName.includes(n))) {
          const prev = sumByWarehouse[m.key] || { items: 0, value: 0 }
          const qty = typeof q.quantity === "number" ? q.quantity : q.qty || 0
          const invValRaw =
            typeof q.inventory_value === "number"
              ? q.inventory_value
              : typeof q.value === "number"
                ? q.value
                : undefined
          const prodId = q.product_id?.[0]
          const price = prodId != null ? (priceByProduct[prodId] ?? 0) : 0
          const computedVal = invValRaw != null ? invValRaw : qty * price
          const invVal = isFinite(computedVal) ? computedVal : 0
          sumByWarehouse[m.key] = { items: prev.items + qty, value: prev.value + invVal }
          break
        }
      }
    }

    return (warehouses || []).map((w: any, idx: number) => {
      const id = w.id ?? idx
      const name = w.code || w.name || ""
      const fullName = w.name || w.code || ""
      const code = w.code || ""
      // Address info might on related partner; fallback to empty strings
      const partnerName = w.partner_id?.[1] || ""
      const address = partnerName
      const city = ""
      const country = ""
      const locationName = w.view_location_id?.[1] || w.lot_stock_id?.[1] || ""
      // Pull totals from quants aggregation if available
      const totals = sumByWarehouse[getWhKey(w)] || { items: 0, value: 0 }
      const items = totals.items
      const value = totals.value
      const capacity = 0
      const status = w.active === false ? "inactive" : "active"
      const manager = ""
      const phone = ""
      const email = ""
      const receptionSteps = w.reception_steps || ""
      const deliverySteps = w.delivery_steps || ""
      const manufactureSteps = w.manufacture_steps || ""
      const buyToResupply = !!w.buy_to_resupply
      const subcontractingDropshippingToResupply = !!w.subcontracting_dropshipping_to_resupply
      const subcontractingToResupply = !!w.subcontracting_to_resupply
      const manufactureToResupply = !!w.manufacture_to_resupply
      return { 
        id, 
        name, 
        code,
        fullName, 
        address, 
        city, 
        country, 
        locationName,
        items, 
        value, 
        capacity, 
        status, 
        manager, 
        phone, 
        email,
        receptionSteps,
        deliverySteps,
        manufactureSteps,
        buyToResupply,
        subcontractingDropshippingToResupply,
        subcontractingToResupply,
        manufactureToResupply,
        rawWarehouse: w
      }
    })
  }, [warehouses, quants, products])

  const totalWarehouses = warehousesData.length
  const totalCapacity = warehousesData.reduce((sum: number, wh: any) => sum + (wh.capacity || 0), 0)
  const totalItems = warehousesData.reduce((sum: number, wh: any) => sum + (wh.items || 0), 0)
  const avgUtilization = totalCapacity > 0 ? (totalItems / totalCapacity) * 100 : 0

  const filteredWarehouses = warehousesData.filter((wh: any) => {
    const matchesSearch =
      wh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wh.city || "").toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(wh.status)
    const matchesLocation = locationFilter.length === 0 || locationFilter.includes(wh.locationName || "")
    
    return matchesSearch && matchesStatus && matchesLocation
  })

  // Pagination
  const totalPages = Math.ceil(filteredWarehouses.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedWarehouses = filteredWarehouses.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, locationFilter])

  const uniqueStatuses = Array.from(new Set(warehousesData.map((wh: any) => wh.status))) as string[]
  const uniqueLocations = Array.from(new Set(warehousesData.map((wh: any) => wh.locationName || "").filter(Boolean))) as string[]

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Determine data to export
    let dataToExport = filteredWarehouses
    if (options.scope === "selected") {
      dataToExport = filteredWarehouses.filter((r) => rowSelection[String(r.id)])
    } else if (options.scope === "page") {
      dataToExport = paginatedWarehouses
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
      name: {
        header: t('Warehouse Name'),
        accessor: (row: any) => row.fullName || row.name || '-',
        isBold: true
      },
      code: {
        header: t('Code'),
        accessor: (row: any) => row.code || '-',
        isMonospace: true
      },
      items: {
        header: t('Items'),
        accessor: (row: any) => row.items || 0
      },
      value: {
        header: t('Value'),
        accessor: (row: any) => row.value?.toLocaleString() || '0',
        isBold: true
      },
      status: {
        header: t('Status'),
        accessor: (row: any) => row.status || '-',
        isStatus: true
      },
      locationName: {
        header: t('Location'),
        accessor: (row: any) => row.locationName || '-'
      },
    }

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Warehouses Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Total Items'), value: data.reduce((sum: number, r: any) => sum + (r.items || 0), 0) },
        { label: t('Total Value'), value: data.reduce((sum: number, r: any) => sum + (r.value || 0), 0).toLocaleString() },
        { label: t('Active Warehouses'), value: data.filter((r: any) => r.status === 'Active').length }
      ]
    }

    exportData(options, dataToExport, config)
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
            {t("Warehouses")}
          </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
            {t("Manage your warehouse locations and facilities")}
          </p>
        </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  fetchData("warehouses")
                  fetchData("quants")
                  fetchData("products")
                }}
                disabled={!!loading?.warehouses}
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
                <RefreshCcw className={`w-4 h-4 ${loading?.warehouses ? "animate-spin" : ""}`} />
                {loading?.warehouses ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("warehouse-management") && (
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
                  onClick={() => {
                    if (!locations || locations.length === 0) fetchData('locations')
                    const newForm = {
                      id: null,
                      name: '',
                      code: '',
                      view_location_id: null,
                      reception_steps: 'one_step',
                      delivery_steps: 'ship_only',
                      buy_to_resupply: false,
                      subcontracting_dropshipping_to_resupply: false,
                      subcontracting_to_resupply: false,
                      manufacture_to_resupply: false,
                      manufacture_steps: 'mrp_one_step',
                    }
                    setForm(newForm)
                    setOriginalForm(newForm)
                    setDirty(false)
                    setSaveError("")
                    setIsModalOpen(true)
                  }}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("Add Warehouse")}
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
              label={t("Total Warehouses")}
              value={totalWarehouses}
              icon={Warehouse}
              gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
              delay={0}
            />
            <StatCard
              label={t("Total Capacity")}
              value={totalCapacity.toLocaleString()}
              icon={Box}
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              delay={1}
            />
            <StatCard
              label={t("Total Items")}
              value={totalItems.toLocaleString()}
              icon={Package}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Avg Utilization")}
              value={`${avgUtilization.toFixed(1)}%`}
              icon={TrendingUp}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search warehouses by name, code, or city...")}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={uniqueStatuses}
            statusPlaceholder={t("Status")}
            toFilter={locationFilter}
            onToChange={setLocationFilter}
            toOptions={uniqueLocations}
            toPlaceholder={t("Location")}
            fromFilter={[]}
            onFromChange={() => {}}
            fromOptions={[]}
            showDateRange={false}
            isMobile={isMobile}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {viewMode === "cards" ? (
            loading?.warehouses ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <WarehouseCardSkeleton key={idx} colors={colors} />
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
                  {paginatedWarehouses.map((warehouse: any, idx: number) => {
                    const raw = (warehouses || []).find((w: any) => w.id === warehouse.id)
                    return (
                      <WarehouseCard
                        key={warehouse.id}
                        warehouse={warehouse}
                        rawWarehouse={raw}
                        warehouses={warehouses}
                        onClick={() => {
                          if (!locations || locations.length === 0) fetchData('locations')
                          const editForm = {
                            id: raw.id,
                            name: raw.name || '',
                            code: raw.code || '',
                            view_location_id: Array.isArray(raw.view_location_id) ? raw.view_location_id[0] : (raw.view_location_id || null),
                            reception_steps: raw.reception_steps || 'one_step',
                            delivery_steps: raw.delivery_steps || 'ship_only',
                            buy_to_resupply: !!raw.buy_to_resupply,
                            subcontracting_dropshipping_to_resupply: !!raw.subcontracting_dropshipping_to_resupply,
                            subcontracting_to_resupply: !!raw.subcontracting_to_resupply,
                            manufacture_to_resupply: !!raw.manufacture_to_resupply,
                            manufacture_steps: raw.manufacture_steps || 'mrp_one_step',
                          }
                          setForm(editForm)
                          setOriginalForm(JSON.parse(JSON.stringify(editForm))) // Deep copy
                          setDirty(false)
                          setSaveError("")
                          setIsModalOpen(true)
                        }}
                        index={idx}
                        onEdit={(raw: any) => {
                          if (!locations || locations.length === 0) fetchData('locations')
                          const editForm = {
                            id: raw.id,
                            name: raw.name || '',
                            code: raw.code || '',
                            view_location_id: Array.isArray(raw.view_location_id) ? raw.view_location_id[0] : (raw.view_location_id || null),
                            reception_steps: raw.reception_steps || 'one_step',
                            delivery_steps: raw.delivery_steps || 'ship_only',
                            buy_to_resupply: !!raw.buy_to_resupply,
                            subcontracting_dropshipping_to_resupply: !!raw.subcontracting_dropshipping_to_resupply,
                            subcontracting_to_resupply: !!raw.subcontracting_to_resupply,
                            manufacture_to_resupply: !!raw.manufacture_to_resupply,
                            manufacture_steps: raw.manufacture_steps || 'mrp_one_step',
                          }
                          setForm(editForm)
                          setOriginalForm(JSON.parse(JSON.stringify(editForm))) // Deep copy
                          setDirty(false)
                          setSaveError("")
                          setIsModalOpen(true)
                        }}
                      />
                    )
                  })}
                </div>

                {filteredWarehouses.length === 0 && !loading?.warehouses && (
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
                      <Warehouse size={28} color="#FFFFFF" />
                    </div>
                    <h3
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("No warehouses found")}
                    </h3>
                    <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                  </div>
                )}

                {filteredWarehouses.length > 0 && viewMode === "cards" && (
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
              data={filteredWarehouses}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              onSelectAllChange={setIsSelectAll}
              onExport={() => setIsExportModalOpen(true)}
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
                      id: "name",
                      header: t("Warehouse Name"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textPrimary, fontSize: "0.9375rem", fontWeight: 600 }}>
                          {(row.original as any).fullName || (row.original as any).name}
                        </span>
                      ),
                    },
                    {
                      id: "code",
                      header: t("Short Name"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                          {(row.original as any).code || "—"}
                        </span>
                      ),
                    },
                    {
                      id: "locationName",
                      header: t("Location"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                          {(row.original as any).locationName || "—"}
                        </span>
                      ),
                    },
                    {
                      id: "items",
                      header: t("Items"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                          {(row.original as any).items.toLocaleString()}
                        </span>
                      ),
                    },
                    {
                      id: "value",
                      header: t("Value"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                          {((row.original as any).value / 1000).toFixed(0)}K LE
                        </span>
                      ),
                    },
                    {
                      id: "status",
                      header: t("Status"),
                      cell: ({ row }) => {
                        const status = (row.original as any).status
                        const isActive = status === "active"
                        // Align pill colors & typography with receipts table pills
                        const statusColor = isActive
                          ? { bg: colors.tableDoneBg, text: colors.tableDoneText }
                          : { bg: colors.tableDraftBg, text: colors.tableDraftText }
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
                            {isActive ? t("Active") : t("Inactive")}
                          </span>
                        )
                      },
                    },
                    {
                      id: "receptionSteps",
                      header: t("Incoming Shipments"),
                      cell: ({ row }) => {
                        const steps = (row.original as any).receptionSteps
                        const stepMap: Record<string, string> = {
                          'one_step': t('Receive and Store (1 step)'),
                          'two_steps': t('Receive then Store (2 steps)'),
                          'three_steps': t('Receive, Quality Control, then Store (3 steps)'),
                        }
                        return (
                          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                            {stepMap[steps] || steps || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "deliverySteps",
                      header: t("Outgoing Shipments"),
                      cell: ({ row }) => {
                        const steps = (row.original as any).deliverySteps
                        const stepMap: Record<string, string> = {
                          'ship_only': t('Deliver (1 step)'),
                          'pick_ship': t('Pick then Deliver (2 steps)'),
                          'pick_pack_ship': t('Pick, Pack, then Deliver (3 steps)'),
                        }
                        return (
                          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                            {stepMap[steps] || steps || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "manufactureSteps",
                      header: t("Manufacture"),
                      cell: ({ row }) => {
                        const steps = (row.original as any).manufactureSteps
                        const stepMap: Record<string, string> = {
                          'mrp_one_step': t('Manufacture (1 step)'),
                          'pbm': t('Pick components then manufacture (2 steps)'),
                          'pbm_sam': t('Pick components, manufacture, then store products (3 steps)'),
                        }
                        return (
                          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                            {stepMap[steps] || steps || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "buyToResupply",
                      header: t("Buy to Resupply"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                          {(row.original as any).buyToResupply ? t("Yes") : t("No")}
                        </span>
                      ),
                    },
                  ]}
                  visibleColumns={visibleColumns}
                  onVisibleColumnsChange={setVisibleColumns}
                  actions={(warehouse) => {
                    const wh = warehouse as any
                    const raw = wh.rawWarehouse || (warehouses || []).find((w: any) => w.id === warehouse.id)
                    return [
                      {
                        key: "edit",
                        label: t("Edit"),
                        icon: Edit,
                        onClick: () => {
                          if (!locations || locations.length === 0) fetchData('locations')
                          const editForm = {
                            id: raw.id,
                            name: raw.name || '',
                            code: raw.code || '',
                            view_location_id: Array.isArray(raw.view_location_id) ? raw.view_location_id[0] : (raw.view_location_id || null),
                            reception_steps: raw.reception_steps || 'one_step',
                            delivery_steps: raw.delivery_steps || 'ship_only',
                            buy_to_resupply: !!raw.buy_to_resupply,
                            subcontracting_dropshipping_to_resupply: !!raw.subcontracting_dropshipping_to_resupply,
                            subcontracting_to_resupply: !!raw.subcontracting_to_resupply,
                            manufacture_to_resupply: !!raw.manufacture_to_resupply,
                            manufacture_steps: raw.manufacture_steps || 'mrp_one_step',
                          }
                          setForm(editForm)
                          setOriginalForm(JSON.parse(JSON.stringify(editForm))) // Deep copy
                          setDirty(false)
                          setSaveError("")
                          setIsModalOpen(true)
                        },
                      },
                    ]
                  }}
                  actionsLabel={t("Actions")}
                  isRTL={isRTL}
                  getRowIcon={(warehouse: any) => {
                    const status = warehouse.status || "active"
                    const isActive = status === "active"
                    return {
                      icon: Warehouse,
                      gradient: isActive
                        ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                        : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    }
                  }}
                  isLoading={loading?.warehouses}
                  showPagination={true}
                  defaultItemsPerPage={10}
                />
          )}

          {filteredWarehouses.length === 0 && !loading?.warehouses && viewMode === "table" && (
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
                <Warehouse size={28} color="#FFFFFF" />
              </div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  color: colors.textPrimary,
                  marginBottom: "0.5rem",
                }}
              >
                {t("No warehouses found")}
              </h3>
              <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
            </div>
          )}

      {isModalOpen && (
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
          onClick={() => {
            if (!dirty || window.confirm(t("Discard unsaved changes?"))) {
              setIsModalOpen(false)
              setDirty(false)
              setSaveError("")
              setOriginalForm(null)
            }
          }}
        >
          <Card
            style={{
              width: "min(100%, 800px)",
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
            <div
              style={{
                padding: "1rem 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary }}>
                  {form?.id ? t('Edit Warehouse') : t('Add Warehouse')}
                </h2>
                <p style={{ fontSize: 13, color: colors.textSecondary }}>
                  {t('Configure key operations and details')}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!dirty || window.confirm(t("Discard unsaved changes?"))) {
                    setIsModalOpen(false)
                    setDirty(false)
                    setSaveError("")
                    setOriginalForm(null)
                  }
                }}
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.card,
                  color: colors.textSecondary,
                  borderRadius: 8,
                  padding: "0.5rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
              <style>{`
                input:focus, textarea:focus, select:focus, button[role="combobox"]:focus {
                  outline: none !important;
                  border-color: #667eea !important;
                  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
                }
              `}</style>
              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
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
                    }}
                  >
                    {t("Basic Information")}
                  </h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <CustomInput
                      label={t('Warehouse name')}
                      type="text"
                      value={form?.name || ''}
                      onChange={(v) => {
                        setForm((p: any) => ({ ...p, name: v }))
                        setDirty(true)
                      }}
                      placeholder={t('Enter name')}
                    />
                  </div>
                  <div>
                    <CustomInput
                      label={t('Short name')}
                      type="text"
                      value={form?.code || ''}
                      onChange={(v) => {
                        setForm((p: any) => ({ ...p, code: v }))
                        setDirty(true)
                      }}
                      placeholder={t('Enter code')}
                    />
                  </div>
                  <div>
                    {(() => {
                      const locOptions: { id: number; label: string }[] = (locations || []).map((lc: any) => ({
                        id: lc.id as number,
                        label: lc.complete_name || lc.display_name || lc.name || `#${lc.id}`,
                      }))
                      const currentId = form?.view_location_id || ''
                      const currentLabel = locOptions.find(o => o.id === currentId)?.label || ''
                      return (
                        <CustomDropdown
                          label={t('Address')}
                          values={[t('Select'), ...locOptions.map(o => o.label)]}
                          type="single"
                          defaultValue={currentLabel || t('Select')}
                          onChange={(val) => {
                            if (val === t('Select')) {
                              setForm((p: any) => ({ ...p, view_location_id: null }))
                              setDirty(true)
                              return
                            }
                            const sel = locOptions.find(o => o.label === val)
                            setForm((p: any) => ({ ...p, view_location_id: sel ? sel.id : null }))
                            setDirty(true)
                          }}
                          placeholder={t('Select')}
                        />
                      )
                    })()}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "4px",
                      height: "20px",
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
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
                    }}
                  >
                    {t("Operations & Settings")}
                  </h3>
                </div>
                <div
                  style={{
                    background: colors.background,
                    padding: "1rem",
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      {(() => {
                        const inboundOptions = [
                          { code: 'one_step', label: t('Receive and Store (1 step)') },
                          { code: 'two_steps', label: t('Receive then Store (2 steps)') },
                          { code: 'three_steps', label: t('Receive, Quality Control, then Store (3 steps)') },
                        ] as const
                        const currentCode = form?.reception_steps || 'one_step'
                        const currentLabel = inboundOptions.find(o => o.code === currentCode)?.label || inboundOptions[0].label
                        return (
                          <CustomDropdown
                            label={t('Incoming shipments')}
                            values={inboundOptions.map(o => o.label)}
                            type="single"
                            defaultValue={currentLabel}
                            onChange={(val) => {
                              const selected = inboundOptions.find(o => o.label === val)
                              setForm((p: any) => ({ ...p, reception_steps: selected?.code || 'one_step' }))
                              setDirty(true)
                            }}
                            placeholder={t('Select')}
                          />
                        )
                      })()}
                    </div>
                    <div>
                      {(() => {
                        const outboundOptions = [
                          { code: 'ship_only', label: t('Deliver (1 step)') },
                          { code: 'pick_ship', label: t('Pick then Deliver (2 steps)') },
                          { code: 'pick_pack_ship', label: t('Pick, Pack, then Deliver (3 steps)') },
                        ] as const
                        const cur = form?.delivery_steps || 'ship_only'
                        const curLabel = outboundOptions.find(o => o.code === cur)?.label || outboundOptions[0].label
                        return (
                          <CustomDropdown
                            label={t('Outgoing Shipments')}
                            values={outboundOptions.map(o => o.label)}
                            type="single"
                            defaultValue={curLabel}
                            onChange={(val) => {
                              const sel = outboundOptions.find(o => o.label === val)
                              setForm((p: any) => ({ ...p, delivery_steps: sel?.code || 'ship_only' }))
                              setDirty(true)
                            }}
                            placeholder={t('Select')}
                          />
                        )
                      })()}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      {(() => {
                        const mfOptions = [
                          { code: 'mrp_one_step', label: t('Manufacture (1 step)') },
                          { code: 'pbm', label: t('Pick components then manufacture (2 steps)') },
                          { code: 'pbm_sam', label: t('Pick components, manufacture, then store products (3 steps)') },
                        ] as const
                        const cur = form?.manufacture_steps || 'mrp_one_step'
                        const curLabel = mfOptions.find(o => o.code === cur)?.label || mfOptions[0].label
                        return (
                          <CustomDropdown
                            label={t('Manufacture')}
                            values={mfOptions.map(o => o.label)}
                            type="single"
                            defaultValue={curLabel}
                            onChange={(val) => {
                              const sel = mfOptions.find(o => o.label === val)
                              setForm((p: any) => ({ ...p, manufacture_steps: sel?.code || 'mrp_one_step' }))
                              setDirty(true)
                            }}
                            placeholder={t('Select')}
                          />
                        )
                      })()}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <IOSCheckbox
                      checked={!!form?.buy_to_resupply}
                      onChange={(checked) => {
                        setForm((p: any) => ({ ...p, buy_to_resupply: checked }))
                        setDirty(true)
                      }}
                      label={t('Buy to Resupply')}
                    />
                    <IOSCheckbox
                      checked={!!form?.subcontracting_dropshipping_to_resupply}
                      onChange={(checked) => {
                        setForm((p: any) => ({ ...p, subcontracting_dropshipping_to_resupply: checked }))
                        setDirty(true)
                      }}
                      label={t('Dropship Subcontractors')}
                    />
                    <IOSCheckbox
                      checked={!!form?.subcontracting_to_resupply}
                      onChange={(checked) => {
                        setForm((p: any) => ({ ...p, subcontracting_to_resupply: checked }))
                        setDirty(true)
                      }}
                      label={t('Resupply Subcontractors')}
                    />
                    <IOSCheckbox
                      checked={!!form?.manufacture_to_resupply}
                      onChange={(checked) => {
                        setForm((p: any) => ({ ...p, manufacture_to_resupply: checked }))
                        setDirty(true)
                      }}
                      label={t('Manufacture to Resupply')}
                    />
                  </div>
                </div>
              </div>
            </div>
            {saveError && (
              <div
                style={{
                  margin: "0 1.25rem",
                  padding: "0.75rem",
                  borderRadius: 8,
                  background: "#FEE2E2",
                  color: "#991B1B",
                  border: "1px solid #FCA5A5",
                  fontSize: 13,
                }}
              >
                {saveError}
              </div>
            )}

            <div
              style={{
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                background: colors.card,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {dirty && (
                  <NewCustomButton
                    label={form?.id ? t("Save Changes") : t("Create")}
                    backgroundColor="#25D0FE"
                    onClick={async () => {
                      setSaveError("")
                      try {
                        setSaving(true)
                        if (!sessionId) return
                        
                        // Build payload with only changed fields (for updates) or all fields (for creates)
                        const payload: any = {}
                        
                        if (form?.id && originalForm) {
                          // Update mode: only include changed fields
                          if (form.name !== originalForm.name) {
                            payload.name = form.name || undefined
                          }
                          if (form.code !== originalForm.code) {
                            payload.code = form.code || undefined
                          }
                          if (form.view_location_id !== originalForm.view_location_id) {
                            payload.view_location_id = form.view_location_id !== null && form.view_location_id !== undefined ? form.view_location_id : false
                          }
                          if (form.reception_steps !== originalForm.reception_steps) {
                            payload.reception_steps = form.reception_steps
                          }
                          if (form.delivery_steps !== originalForm.delivery_steps) {
                            payload.delivery_steps = form.delivery_steps
                          }
                          if (form.buy_to_resupply !== originalForm.buy_to_resupply) {
                            payload.buy_to_resupply = !!form.buy_to_resupply
                          }
                          if (form.subcontracting_dropshipping_to_resupply !== originalForm.subcontracting_dropshipping_to_resupply) {
                            payload.subcontracting_dropshipping_to_resupply = !!form.subcontracting_dropshipping_to_resupply
                          }
                          if (form.subcontracting_to_resupply !== originalForm.subcontracting_to_resupply) {
                            payload.subcontracting_to_resupply = !!form.subcontracting_to_resupply
                          }
                          if (form.manufacture_to_resupply !== originalForm.manufacture_to_resupply) {
                            payload.manufacture_to_resupply = !!form.manufacture_to_resupply
                          }
                          if (form.manufacture_steps !== originalForm.manufacture_steps) {
                            payload.manufacture_steps = form.manufacture_steps
                          }
                        } else {
                          // Create mode: include all fields
                          payload.name = form.name || undefined
                          payload.code = form.code || undefined
                          payload.view_location_id = form.view_location_id !== null && form.view_location_id !== undefined ? form.view_location_id : false
                          payload.reception_steps = form.reception_steps
                          payload.delivery_steps = form.delivery_steps
                          payload.buy_to_resupply = !!form.buy_to_resupply
                          payload.subcontracting_dropshipping_to_resupply = !!form.subcontracting_dropshipping_to_resupply
                          payload.subcontracting_to_resupply = !!form.subcontracting_to_resupply
                          payload.manufacture_to_resupply = !!form.manufacture_to_resupply
                          payload.manufacture_steps = form.manufacture_steps
                        }
                        
                        const userId = partnerId ? Number(partnerId) : undefined
                        let res
                        if (form?.id) {
                          res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/warehouses/${form.id}`, {
                            method: 'PUT', headers: { 'Content-Type': 'application/json', ...getOdooHeaders() }, body: JSON.stringify({ sessionId, values: payload, userId })
                          })
                        } else {
                          res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/warehouses/create`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json', ...getOdooHeaders() }, body: JSON.stringify({ sessionId, values: payload, userId })
                          })
                        }
                        const j = await res.json().catch(async () => { try { return { message: await res.text() } } catch { return {} as any } })
                        if (res.ok && j?.success) {
                          await fetchData('warehouses')
                          setDirty(false)
                          setToast({ text: form?.id ? t('Warehouse updated successfully') : t('Warehouse created successfully'), state: 'success' })
                          setTimeout(() => {
                            setIsModalOpen(false)
                            setToast(null)
                            setOriginalForm(null)
                          }, 1200)
                        } else {
                          const errMsg = j?.message || (form?.id ? t('Failed to update warehouse') : t('Failed to create warehouse'))
                          setSaveError(errMsg)
                          setToast({ text: errMsg, state: 'error' })
                          setTimeout(() => setToast(null), 3000)
                        }
                      } catch (e: any) {
                        const errorMsg = e?.message || t('Unknown error')
                        setSaveError(errorMsg)
                        setToast({ text: errorMsg, state: 'error' })
                        setTimeout(() => setToast(null), 3000)
                      } finally {
                        setSaving(false)
                      }
                    }}
                    disabled={saving}
                  />
                )}
                <NewCustomButton
                  label={t("Close")}
                  backgroundColor="#FFFFFF"
                  onClick={() => {
                    if (!dirty || window.confirm(t("Discard unsaved changes?"))) {
                      setIsModalOpen(false)
                      setDirty(false)
                      setSaveError("")
                      setOriginalForm(null)
                    }
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      )}
      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
      
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        totalRecords={filteredWarehouses.length}
        selectedCount={Object.keys(rowSelection).length}
        isSelectAll={isSelectAll === true}
      />
        </div>
      </div>
    </div>
  )
}

// WarehouseCard component matching MoveCard style
function WarehouseCard({ warehouse, rawWarehouse, warehouses, onClick, index, onEdit }: {
  warehouse: any
  rawWarehouse: any
  warehouses: any[]
  onClick: () => void
  index: number
  onEdit: (raw: any) => void
}) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const isRTL = i18n?.dir() === "rtl"

  const getStatusTheme = (status: string) => {
    const normalizedStatus = status.toLowerCase()
    switch (normalizedStatus) {
      case "active":
        return {
          gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
          bg: "bg-emerald-500/10",
          text: "text-emerald-600 dark:text-emerald-400",
          label: t("Active"),
        }
      case "inactive":
      default:
        return {
          gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          bg: "bg-rose-500/10",
          text: "text-rose-600 dark:text-rose-400",
          label: t("Inactive"),
        }
    }
  }

  const statusTheme = getStatusTheme(warehouse.status)
  const utilization = warehouse.capacity > 0 ? ((warehouse.items / warehouse.capacity) * 100).toFixed(1) : "0.0"

  return (
    <div
      className="group relative w-full rounded-[24px] p-[2px] cursor-pointer transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
      onClick={onClick}
      style={{
        animationDelay: `${index * 50}ms`,
        background: colors.card,
      }}
    >
      <div
        className="absolute inset-0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: statusTheme.gradient }}
      />

      <div
        className="relative h-full rounded-[22px] overflow-hidden group-hover:border-transparent transition-colors"
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div
          className="absolute top-0 p-4"
          style={{
            [isRTL ? 'left' : 'right']: 0,
          }}
        >
          <div
            className={`
            inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
            ${statusTheme.bg} ${statusTheme.text}
          `}
          >
            {statusTheme.label}
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300"
              style={{ background: statusTheme.gradient }}
            >
              <Warehouse className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>
                  {rawWarehouse?.code || `WH-${warehouse.id}`}
                </span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {warehouse.fullName}
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                {warehouse.address || t("No address")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex justify-center pt-1">
                <div
                  className="w-2.5 h-2.5 rounded-full ring-4"
                  style={{
                    background: statusTheme.gradient,
                    boxShadow: `0 0 0 4px ${colors.border}`,
                  }}
                ></div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                  {t("Items")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{warehouse.items.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex justify-center pt-1">
                <div
                  className="w-2.5 h-2.5 rounded-full ring-4"
                  style={{
                    background: statusTheme.gradient,
                    boxShadow: `0 0 0 4px ${colors.border}`,
                  }}
                ></div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                  {t("Value")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{(warehouse.value / 1000).toFixed(0)}K LE</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex justify-center pt-1">
                <div
                  className="w-2.5 h-2.5 rounded-full ring-4"
                  style={{
                    background: statusTheme.gradient,
                    boxShadow: `0 0 0 4px ${colors.border}`,
                  }}
                ></div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                  {t("Capacity")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{warehouse.capacity.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex justify-center pt-1">
                <div
                  className="w-2.5 h-2.5 rounded-full ring-4"
                  style={{
                    background: statusTheme.gradient,
                    boxShadow: `0 0 0 4px ${colors.border}`,
                  }}
                ></div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                  {t("Utilization")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{utilization}%</p>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between pt-4 border-t"
            style={{ borderColor: colors.border }}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {rawWarehouse?.lot_stock_id?.[1] || t("No location")}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(rawWarehouse)
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
              style={{
                background: colors.mutedBg,
                color: colors.textSecondary,
              }}
            >
              {t("Edit")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Skeleton component matching WarehouseCard structure
function WarehouseCardSkeleton({ colors }: { colors: any }) {
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
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem" }}>
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
              <Skeleton
                variant="text"
                width="30%"
                height={14}
                sx={{
                  marginBottom: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              <Skeleton
                variant="text"
                width="60%"
                height={24}
                sx={{
                  marginBottom: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
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
              <Skeleton
                variant="rectangular"
                width={60}
                height={16}
                sx={{
                  borderRadius: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
            </div>

            <Skeleton
              variant="rectangular"
              width={60}
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
