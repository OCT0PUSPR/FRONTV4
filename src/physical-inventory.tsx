"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Package, DollarSign, BarChart3, RefreshCcw, Plus, FileText, Clock, CheckCircle2, X, TrendingUp, TrendingDown, Minus, Edit, Eye } from "lucide-react"
import { Button } from "../@/components/ui/button"
import { Card } from "../@/components/ui/card"
import { Badge } from "../@/components/ui/badge"
import { StatCard } from "./components/StatCard"
import { PhysicalInventoryCard } from "./components/PhysicalInventoryCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { useAuth } from "../context/auth.tsx"
import { useTheme } from "../context/theme"
import { SyncLoader } from "react-spinners"
import { VariantModal } from "./components/VariantModal"
import { useData } from "../context/data.tsx"
import { useCasl } from "../context/casl"
import { Skeleton } from "@mui/material"
import { DataTable } from "./components/DataTable"
import { ColumnsSelector } from "./components/ColumnsSelector"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"

interface Product {
  display_name:string
  id: number
  name: string
  default_code: string
  qty_available: number
  virtual_available: number
  list_price: number
  standard_price: number
  image_1920?: string
  categ_id: [number, string]
  weight: number
  sale_ok: boolean
  barcode: string
}

interface PhysicalInventoryItem {
  display_name: string
  id: number
  location: string
  product: string
  lotSerialNumber: string
  package: string
  owner: string
  onHandQuantity: number
  uom: string
  countedQuantity: number
  difference: number
  scheduledDate: string
  user: string
  unitPrice: number
  productData: Product
  productImage?: string
}

export default function PhysicalInventory() {
  const { t } = useTranslation()
  const { sessionId, isAuthenticated } = useAuth()
  const { colors } = useTheme()
  const { canEditPage, canExportPage } = useCasl()
  const navigate = useNavigate()
  const {
    quants,
    products,
    locations: ctxLocations,
    lots: ctxLots,
    uom: ctxUom,
    partners,
    loading,
    fetchData,
  } = useData()
  const { i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const [inventoryItems, setInventoryItems] = useState<PhysicalInventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [locationFilter, setLocationFilter] = useState<string[]>([])
  const [ownerFilter, setOwnerFilter] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [selectedItem, setSelectedItem] = useState<PhysicalInventoryItem | null>(null)
  const [countedById, setCountedById] = useState<Record<number, number>>({})
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  
  // Column visibility state - default: 7 most important columns (including image)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "productImage",
    "product",
    "location",
    "onHandQuantity",
    "countedQuantity",
    "difference",
  ])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  const isLoading =
    loading.quants || loading.products || loading.locations || loading.lots || loading.uom || loading.partners

  // Helpers to normalize Odoo many2one values that might be an array [id, name] or a number
  const getId = (val: any): number | undefined =>
    Array.isArray(val) ? val[0] : typeof val === "number" ? val : undefined
  const getTupleName = (val: any): string | undefined => (Array.isArray(val) ? val[1] : undefined)

  // Map IDs to names from context datasets
  const nameById = <T,>(arr: T[], id: number | undefined, nameField = "name"): string => {
    if (!id) return ""
    const rec: any = arr.find(
      (r: any) => (typeof r.id === "number" ? r.id : Array.isArray(r.id) ? r.id[0] : r.id) === id,
    )
    return rec ? (rec[nameField] ?? rec.name ?? "") : ""
  }

  const productById = (id: number | undefined): Product | null => {
    if (!id) return null
    const p: any = products.find((r: any) => r.id === id || (Array.isArray(r.id) && r.id[0] === id))
    return p || null
  }

  useEffect(() => {
    if (sessionId && isAuthenticated) {
      // Ensure required datasets are loaded
      fetchData("quants")
      fetchData("products")
      fetchData("locations")
      fetchData("lots")
      fetchData("uom")
      fetchData("partners")
    }
  }, [sessionId, isAuthenticated])

  // Build inventory rows from quants when data changes
  useEffect(() => {
    const items: PhysicalInventoryItem[] = (quants || []).map((q: any) => {
      const productId = getId(q.product_id)
      const locationId = getId(q.location_id)
      const lotId = getId(q.lot_id)
      const packageId = getId(q.package_id)
      const ownerId = getId(q.owner_id)
      const uomId = getId(q.uom_id ?? q.product_uom_id)

      const productRec = productById(productId)
      const productName = getTupleName(q.product_id) || productRec?.name || ""
      const locationName = getTupleName(q.location_id) || nameById(ctxLocations, locationId, "complete_name") || ""
      const lotName = getTupleName(q.lot_id) || nameById(ctxLots, lotId, "name") || ""
      const ownerName = getTupleName(q.owner_id) || nameById(partners, ownerId, "name") || ""
      const uomName = getTupleName(q.uom_id ?? q.product_uom_id) || nameById(ctxUom, uomId, "name") || ""

      const quantity = Number(q.quantity ?? q.available_quantity ?? 0)
      const counted = countedById[q.id] ?? quantity

      return {
        display_name: productRec?.display_name || productName,
        id: q.id,
        location: locationName,
        product: productName,
        lotSerialNumber: lotName,
        package: packageId ? String(packageId) : "",
        owner: ownerName,
        onHandQuantity: quantity,
        uom: uomName,
        countedQuantity: counted,
        difference: counted - quantity,
        scheduledDate: new Date().toISOString().split("T")[0],
        user: "",
        unitPrice: productRec?.list_price ?? productRec?.standard_price ?? 0,
        productData: productRec as any,
        productImage: productRec?.image_1920,
      }
    })

    setInventoryItems(items)
  }, [quants, products, ctxLocations, ctxLots, ctxUom, partners, countedById])

  const uniqueLocations = useMemo(() => Array.from(new Set(inventoryItems.map((item) => item.location))).filter(Boolean), [inventoryItems])
  const uniqueOwners = useMemo(() => Array.from(new Set(inventoryItems.map((item) => item.owner))).filter(Boolean), [inventoryItems])
  const uniqueStatuses = useMemo(() => ["Surplus", "Shortage", "Exact Match"], [])

  const filteredItems = useMemo(() => {
    const filtered = inventoryItems.filter((item) => {
    const matchesSearch =
        item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lotSerialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesLocation = locationFilter.length === 0 || locationFilter.includes(item.location)
      const matchesOwner = ownerFilter.length === 0 || ownerFilter.includes(item.owner)

    let matchesStatus = true
      if (statusFilter.length > 0) {
        matchesStatus = statusFilter.some((status) => {
          if (status === "Surplus") return item.difference > 0
          if (status === "Shortage") return item.difference < 0
          if (status === "Exact Match") return item.difference === 0
          return false
        })
      }

    return matchesSearch && matchesLocation && matchesOwner && matchesStatus
  })

    // Sort: items with images first, then items without images
    return filtered.sort((a, b) => {
      const aHasImage = !!(a.productImage && a.productImage.trim())
      const bHasImage = !!(b.productImage && b.productImage.trim())
      if (aHasImage && !bHasImage) return -1
      if (!aHasImage && bHasImage) return 1
      return 0
  })
  }, [inventoryItems, searchQuery, locationFilter, ownerFilter, statusFilter])

  // Pagination for cards view
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1
  const paginatedItems = useMemo(() => {
    if (viewMode === "cards") {
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      return filteredItems.slice(startIndex, endIndex)
    }
    return filteredItems
  }, [filteredItems, currentPage, itemsPerPage, viewMode])

  // Calculate stats
  const totalItems = useMemo(() => filteredItems.reduce((sum, item) => sum + item.onHandQuantity, 0), [filteredItems])
  const totalProducts = useMemo(() => filteredItems.length, [filteredItems])
  const totalValue = useMemo(() => filteredItems.reduce((sum, item) => sum + item.onHandQuantity * item.unitPrice, 0), [filteredItems])
  const surplusItems = useMemo(() => filteredItems.filter((item) => item.difference > 0).length, [filteredItems])
  const shortageItems = useMemo(() => filteredItems.filter((item) => item.difference < 0).length, [filteredItems])
  const exactMatchItems = useMemo(() => filteredItems.filter((item) => item.difference === 0).length, [filteredItems])
  const scheduledToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return filteredItems.filter((item) => (item.scheduledDate || "").slice(0, 10) === todayStr).length
  }, [filteredItems])

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("physical-inventory")) {
      return
    }
    // Determine data to export
    let dataToExport = filteredItems
    if (options.scope === "selected") {
      dataToExport = filteredItems.filter((item) => rowSelection[String(item.id)])
    } else if (options.scope === "page") {
      dataToExport = paginatedItems
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
      product: {
        header: t('Product'),
        accessor: (row: any) => row.product,
        isBold: true
      },
      location: {
        header: t('Location'),
        accessor: (row: any) => row.location
      },
      lotSerialNumber: {
        header: t('Lot/Serial Number'),
        accessor: (row: any) => row.lotSerialNumber || '-'
      },
      package: {
        header: t('Package'),
        accessor: (row: any) => row.package || '-'
      },
      owner: {
        header: t('Owner'),
        accessor: (row: any) => row.owner || '-'
      },
      onHandQuantity: {
        header: t('On Hand Quantity'),
        accessor: (row: any) => `${row.onHandQuantity} ${row.uom || ''}`
      },
      countedQuantity: {
        header: t('Counted Quantity'),
        accessor: (row: any) => `${row.countedQuantity} ${row.uom || ''}`
      },
      difference: {
        header: t('Difference'),
        accessor: (row: any) => {
          const diff = row.difference || 0
          return diff > 0 ? `+${diff}` : String(diff)
        }
      },
      unitPrice: {
        header: t('Unit Price'),
        accessor: (row: any) => `$${row.unitPrice?.toFixed(2) || '0.00'}`
      },
      scheduledDate: {
        header: t('Scheduled Date'),
        accessor: (row: any) => formatDate(row.scheduledDate)
      },
      user: {
        header: t('User'),
        accessor: (row: any) => row.user || '-'
      },
    }

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Physical Inventory Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Total Items'), value: data.reduce((sum: number, item: any) => sum + (item.onHandQuantity || 0), 0) },
        { label: t('Surplus Items'), value: data.filter((item: any) => (item.difference || 0) > 0).length },
        { label: t('Shortage Items'), value: data.filter((item: any) => (item.difference || 0) < 0).length },
        { label: t('Exact Match'), value: data.filter((item: any) => (item.difference || 0) === 0).length }
      ]
    }

    exportData(options, dataToExport, config, null)
    setIsExportModalOpen(false)
  }


  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, locationFilter, ownerFilter])


  const handleRefresh = async () => {
    if (sessionId) {
      await Promise.all([
        fetchData("quants"),
        fetchData("products"),
        fetchData("locations"),
        fetchData("lots"),
        fetchData("uom"),
        fetchData("partners"),
      ])
    }
  }

  const getDifferenceStyle = (difference: number) => {
    if (difference > 0) return { bg: colors.success, border: colors.success, text: "#0A0A0A" }
    if (difference < 0) return { bg: colors.inProgress, border: colors.inProgress, text: "#0A0A0A" }
    return { bg: colors.card, border: colors.border, text: colors.textSecondary }
  }

  const getDifferenceText = (difference: number) => {
    if (difference > 0) return `+${difference}`
    return difference.toString()
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
                {t("Physical Inventory")}
              </h1>
            <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Track and manage your inventory counts")}
              </p>
            </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
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
              <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? t("Loading...") : t("Refresh")}
            </Button>
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
            label={t("Total Items")}
            value={totalItems.toLocaleString()}
            icon={Package}
            gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
            delay={0}
          />
          <StatCard
            label={t("Surplus")}
            value={surplusItems}
            icon={FileText}
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            delay={1}
          />
          <StatCard
            label={t("Shortage")}
            value={shortageItems}
            icon={Clock}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            delay={2}
          />
          <StatCard
            label={t("Exact Match")}
            value={exactMatchItems}
            icon={CheckCircle2}
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            delay={3}
          />
        </div>

        <TransferFiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("Search products, lot numbers...")}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={uniqueStatuses}
          toFilter={locationFilter}
          onToChange={setLocationFilter}
          toOptions={uniqueLocations}
          fromFilter={ownerFilter}
          onFromChange={setOwnerFilter}
          fromOptions={uniqueOwners}
          showDateRange={false}
          isMobile={isMobile}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewToggle={true}
        />

        {viewMode === "cards" ? (
          isLoading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                gap: "1.25rem",
              }}
            >
              {Array.from({ length: itemsPerPage }).map((_, idx) => (
                <PhysicalInventoryCardSkeleton key={idx} colors={colors} />
              ))}
            </div>
          ) : (
            <>
              {paginatedItems.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
            }}
          >
            {paginatedItems.map((item, idx) => (
              <PhysicalInventoryCard
                key={item.id}
                item={item}
                onClick={canEditPage("physical-inventory") ? () => {
                  setSelectedItem(item)
                  setIsEditModalOpen(true)
                } : undefined}
                onCountChange={(id, value) => {
                  setCountedById((prev) => ({ ...prev, [id]: value }))
                }}
                index={idx}
              />
            ))}
          </div>
        ) : (
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
              {t("No inventory data found")}
            </h3>
            <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>
              {t("Try adjusting your search criteria")}
            </p>
          </div>
        )}

                {/* Cards Pagination */}
                {filteredItems.length > 0 && viewMode === "cards" && (
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
                data={filteredItems}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                onExport={canExportPage("physical-inventory") ? () => setIsExportModalOpen(true) : undefined}
                columns={[
                  {
                    id: "id",
                    header: t("ID"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 600 }}>
                        #{row.original.id}
                      </span>
                    ),
                  },
                  {
                    id: "productImage",
                    header: t("Image"),
                    cell: ({ row }) => {
                      if (row.original.productImage) {
                        return (
                          <div style={{ width: "40px", height: "40px", borderRadius: "0.75rem", overflow: "hidden" }}>
                            <img
                              src={
                                row.original.productImage.startsWith('data:')
                                  ? row.original.productImage
                                  : `data:image/webp;base64,${row.original.productImage}`
                              }
                              alt={row.original.product}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          </div>
                        )
                      }
                      return <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>—</span>
                    },
                  },
                  {
                    id: "product",
                    header: t("Product"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.product}
                      </span>
                    ),
                  },
                  {
                    id: "location",
                    header: t("Location"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.location}
                      </span>
                    ),
                  },
                  {
                    id: "lotSerialNumber",
                    header: t("Lot/Serial Number"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                        {row.original.lotSerialNumber || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "owner",
                    header: t("Owner"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.owner || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "onHandQuantity",
                    header: t("On Hand"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.onHandQuantity} {row.original.uom}
                      </span>
                    ),
                  },
                  {
                    id: "countedQuantity",
                    header: t("Counted"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        {row.original.countedQuantity} {row.original.uom}
                      </span>
                    ),
                  },
                  {
                    id: "unitPrice",
                    header: t("Unit Price"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                        LE {row.original.unitPrice.toLocaleString()}
                      </span>
                    ),
                  },
                  {
                    id: "difference",
                    header: t("Difference"),
                    cell: ({ row }) => {
                      const diff = row.original.difference
                      const isPositive = diff > 0
                      const isNegative = diff < 0
                      const getDifferenceColor = () => {
                        if (isPositive) {
                          return { bg: colors.tableDoneBg, text: colors.tableDoneText }
                        }
                        if (isNegative) {
                          return { bg: colors.tableReadyBg, text: colors.tableReadyText }
                        }
                        return { bg: colors.tableDraftBg, text: colors.tableDraftText }
                      }
                      const statusColor = getDifferenceColor()
                      return (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "999px",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            background: statusColor.bg,
                            color: statusColor.text,
                          }}
                        >
                          {isPositive ? "+" : ""}{diff} {row.original.uom}
                        </span>
                      )
                    },
                  },
                ]}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
                actions={(item) => {
                  const inventoryItem = item as PhysicalInventoryItem
                  const itemId = inventoryItem.id
                  const actions = [
                    {
                      key: "view",
                      label: t("View"),
                      icon: Eye,
                      onClick: () => navigate(`/physical-inventory/view/${itemId}`),
                    },
                    ...(canEditPage("physical-inventory") ? [{
                      key: "edit",
                      label: t("Edit"),
                      icon: Edit,
                      onClick: () => {
                        setSelectedItem(inventoryItem)
                        setIsEditModalOpen(true)
                      },
                    }] : []),
                  ]
                  return actions
                }}
                actionsLabel={t("Actions")}
                isRTL={isRTL}
                isLoading={isLoading}
                showPagination={true}
                defaultItemsPerPage={10}
              />
        )}

        {!isLoading && filteredItems.length === 0 && viewMode === "table" && (
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
              {t("No inventory data found")}
            </h3>
            <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>
              {t("Try adjusting your search criteria")}
            </p>
          </div>
        )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedItem && (
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
          onClick={() => setIsEditModalOpen(false)}
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
              }}
            >
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary, marginBottom: "0.25rem" }}>
                  {selectedItem.product}
                </h2>
                <p style={{ fontSize: 13, color: colors.textSecondary }}>{t("Physical Inventory Details")}</p>
              </div>
              <Button
                style={{
                  background: colors.background,
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.5rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={24} color={colors.textPrimary} />
              </Button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
              {/* Status Badge */}
              <div style={{ marginBottom: "1.25rem" }}>
                <Badge
                  style={{
                    fontSize: "0.875rem",
                    padding: "0.5rem 1rem",
                    background: selectedItem.difference > 0 
                      ? "rgba(67, 233, 123, 0.1)" 
                      : selectedItem.difference < 0 
                      ? "rgba(79, 172, 254, 0.1)" 
                      : "rgba(156, 163, 175, 0.1)",
                    border: `1px solid ${selectedItem.difference > 0 
                      ? "rgba(67, 233, 123, 0.2)" 
                      : selectedItem.difference < 0 
                      ? "rgba(79, 172, 254, 0.2)" 
                      : "rgba(156, 163, 175, 0.2)"}`,
                    color: selectedItem.difference > 0 
                      ? "#43e97b" 
                      : selectedItem.difference < 0 
                      ? "#4facfe" 
                      : colors.textSecondary,
                  }}
                >
                  {selectedItem.difference > 0 
                    ? t("Surplus") 
                    : selectedItem.difference < 0 
                    ? t("Shortage") 
                    : t("Match")}
                </Badge>
              </div>

              {/* Basic Information Section */}
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
                  <div>
                    <label style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: 600, display: "block", marginBottom: "0.375rem" }}>
                      {t("Product")}
                    </label>
                    <p style={{ fontSize: "0.875rem", color: colors.textPrimary, fontWeight: 500 }}>{selectedItem.product}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: 600, display: "block", marginBottom: "0.375rem" }}>
                      {t("Location")}
                    </label>
                    <p style={{ fontSize: "0.875rem", color: colors.textPrimary, fontWeight: 500 }}>{selectedItem.location}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: 600, display: "block", marginBottom: "0.375rem" }}>
                      {t("On Hand Quantity")}
                    </label>
                    <p style={{ fontSize: "0.875rem", color: colors.textPrimary, fontWeight: 500 }}>{selectedItem.onHandQuantity} {selectedItem.uom}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: 600, display: "block", marginBottom: "0.375rem" }}>
                      {t("Counted Quantity")}
                    </label>
                    <input
                      type="number"
                      value={countedById[selectedItem.id] ?? selectedItem.countedQuantity}
                      onChange={(e) => {
                        const val = Number(e.target.value || 0)
                        setCountedById((prev) => ({ ...prev, [selectedItem.id]: val }))
                      }}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                        background: colors.card,
                        color: colors.textPrimary,
                        fontSize: "0.875rem",
                      }}
                    />
                  </div>
                  {selectedItem.lotSerialNumber && (
                    <div>
                      <label style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: 600, display: "block", marginBottom: "0.375rem" }}>
                        {t("Lot/Serial Number")}
                      </label>
                      <p style={{ fontSize: "0.875rem", color: colors.textPrimary, fontWeight: 500 }}>{selectedItem.lotSerialNumber}</p>
                    </div>
                  )}
                  {selectedItem.owner && (
                    <div>
                      <label style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: 600, display: "block", marginBottom: "0.375rem" }}>
                        {t("Owner")}
                      </label>
                      <p style={{ fontSize: "0.875rem", color: colors.textPrimary, fontWeight: 500 }}>{selectedItem.owner}</p>
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: 600, display: "block", marginBottom: "0.375rem" }}>
                      {t("Difference")}
                    </label>
                    <p style={{ 
                      fontSize: "0.875rem", 
                      color: selectedItem.difference > 0 
                        ? "#43e97b" 
                        : selectedItem.difference < 0 
                        ? "#4facfe" 
                        : colors.textPrimary, 
                      fontWeight: 600 
                    }}>
                      {selectedItem.difference > 0 ? "+" : ""}{countedById[selectedItem.id] !== undefined 
                        ? (countedById[selectedItem.id] - selectedItem.onHandQuantity) 
                        : selectedItem.difference} {selectedItem.uom}
                    </p>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: 600, display: "block", marginBottom: "0.375rem" }}>
                      {t("Unit Price")}
                    </label>
                    <p style={{ fontSize: "0.875rem", color: colors.textPrimary, fontWeight: 500 }}>LE {selectedItem.unitPrice.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Variant Modal */}
      {isVariantModalOpen && selectedProduct && (
        <VariantModal
          isOpen={isVariantModalOpen}
          onClose={() => {
            setIsVariantModalOpen(false)
            setSelectedProduct(null)
          }}
          product={selectedProduct}
        />
      )}

      {canExportPage("physical-inventory") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={filteredItems.length}
          selectedCount={Object.keys(rowSelection).length}
          isSelectAll={Object.keys(rowSelection).length === filteredItems.length && filteredItems.length > 0}
        />
      )}
        </div>
      </div>
    </div>
  )
}

// Skeleton component matching PhysicalInventoryCard structure
function PhysicalInventoryCardSkeleton({ colors }: { colors: any }) {
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
              {/* Lot/Serial Number */}
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

          {/* Details Visualization */}
          <div style={{ position: "relative", padding: "1rem 0", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* On Hand */}
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

              {/* Counted */}
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
                    width="25%"
                    height={10}
                    sx={{
                      marginBottom: "0.125rem",
                      bgcolor: colors.border,
                    }}
                  />
                  <Skeleton
                    variant="rectangular"
                    width={100}
                    height={32}
                    sx={{
                      borderRadius: "0.375rem",
                      bgcolor: colors.mutedBg,
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
              {/* Location */}
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
                  width={60}
                  height={12}
                  sx={{
                    bgcolor: colors.mutedBg,
                  }}
                />
              </div>
              {/* Owner */}
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
            </div>

            {/* Value */}
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
