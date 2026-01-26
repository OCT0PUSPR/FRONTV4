"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { Button } from "../@/components/ui/button"
import {
  Package,
  AlertCircle,
  Plus,
  RefreshCcw,
  DollarSign,
  TrendingUp,
  Trash2,
  Edit,
  CheckCircle2,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { StatCard } from "./components/StatCard"
import { StockCard } from "./components/StockCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Skeleton } from "@mui/material"
import { API_CONFIG } from "./config/api"
import { DataTable } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import { useSmartFieldRecords } from "./hooks/useSmartFieldRecords"
import { generateColumnsFromFields } from "./utils/generateColumnsFromFields"
import { useNavigate } from "react-router-dom"

// Derived from real data (quants + products)
interface StockCardItem {
  quantId: number
  productId: number
  name: string
  defaultCode?: string
  barcode?: string
  category: string
  locationName?: string
  unitCost: number
  listPrice?: number
  totalValue: number
  onHand: number
  freeToUse: number
  reserved: number
  incoming: number
  outgoing: number
  uom: string
  weight?: number
  image?: string
  currency?: string
  rawProduct?: any
  rawQuant?: any
}

export default function Stocks() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { quants, products, fetchData, loading } = useData()
  const { sessionId } = useAuth()
  const { canCreatePage, canEditPage, canExportPage } = useCasl()
  const navigate = useNavigate()
  const [currencies, setCurrencies] = useState<any[]>([])
  const [defaultCurrency, setDefaultCurrency] = useState<string>('LE')
  
  // Fetch records using SmartFieldSelector for stock.quant
  const { records: smartFieldRecords, fields: smartFields, columns: availableColumns, loading: smartFieldLoading, refetch: refetchSmartFields } = useSmartFieldRecords({
    modelName: 'stock.quant',
    enabled: !!sessionId,
  })

  // Get Odoo headers from localStorage
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem("odooBase") || "https://egy.thetalenter.net"
    const db = localStorage.getItem("odooDb") || "odoodb1"
    const headers: Record<string, string> = {}
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [locationFilter, setLocationFilter] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  
  // Update visible columns when available columns change
  useEffect(() => {
    if (availableColumns.length > 0 && visibleColumns.length === 0) {
      // Set default visible columns with proper ordering:
      // 1. id first
      // 2. display_name or name second
      // 3. Other columns in between
      // 4. quantity/on_hand last (if available)
      const defaultCols: string[] = []
      
      // 1. Add id first if available
      if (availableColumns.some(col => col.id === 'id')) {
        defaultCols.push('id')
      }
      
      // 2. Add display_name or name second (in priority order)
      const nameFields = ['display_name', 'name', 'product_id']
      for (const field of nameFields) {
        if (availableColumns.some(col => col.id === field) && !defaultCols.includes(field)) {
          defaultCols.push(field)
          break // Only add the first available one
        }
      }
      
      // 3. Add other columns (excluding quantity/on_hand)
      const quantityFields = ['quantity', 'on_hand', 'available_quantity']
      availableColumns.forEach(col => {
        if (!defaultCols.includes(col.id) && !quantityFields.includes(col.id) && defaultCols.length < 6) {
          defaultCols.push(col.id)
        }
      })
      
      // 4. Add quantity/on_hand last if available
      for (const field of quantityFields) {
        if (availableColumns.some(col => col.id === field) && !defaultCols.includes(field)) {
          defaultCols.push(field)
          break // Only add the first available one
        }
      }
      
      setVisibleColumns(defaultCols)
    }
  }, [availableColumns, visibleColumns.length])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch currencies on mount
  useEffect(() => {
    const sessionIdFromStorage = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
    if (!sessionIdFromStorage) return

    const fetchCurrencies = async () => {
      try {
        const tenantId = localStorage.getItem('current_tenant_id')
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
        if (tenantId) {
          headers['X-Tenant-ID'] = tenantId
        }
        
        const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/currencies`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionIdFromStorage })
        })
        const data = await response.json()
        if (data.success && Array.isArray(data.currencies)) {
          setCurrencies(data.currencies)
          // Set default currency (usually the first one or company currency)
          if (data.currencies.length > 0) {
            const defaultCur = data.currencies.find((c: any) => c.id === 1) || data.currencies[0]
            setDefaultCurrency(defaultCur.symbol || defaultCur.name || 'LE')
          }
        }
      } catch (error) {
        console.error('Error fetching currencies:', error)
      }
    }
    fetchCurrencies()
  }, [])

  // Fetch data only once on mount if missing
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (hasFetchedRef.current) return
    const sessionIdFromStorage = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
    if (!sessionIdFromStorage) return
    
    hasFetchedRef.current = true
    // Only fetch if data is missing
    if (!Array.isArray(quants) || !quants.length) fetchData("quants")
    if (!Array.isArray(products) || !products.length) fetchData("products")
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [])

  const productMap = useMemo(() => {
    const map = new Map<number, any>()
    for (const p of products || []) map.set(p.id, p)
    return map
  }, [products])

  // Helper function to get currency symbol from currency_id
  const getCurrencySymbol = useMemo(() => {
    return (currencyId: any): string => {
      if (!currencyId) return defaultCurrency
      
      // currency_id can be [id, name] or {id, name} or just id
      let currencyIdNum: number | null = null
      if (Array.isArray(currencyId)) {
        currencyIdNum = currencyId[0]
      } else if (typeof currencyId === 'object' && currencyId !== null) {
        currencyIdNum = currencyId.id
      } else if (typeof currencyId === 'number') {
        currencyIdNum = currencyId
      }
      
      if (currencyIdNum) {
        const currency = currencies.find((c: any) => c.id === currencyIdNum)
        if (currency) {
          return currency.symbol || currency.name || defaultCurrency
        }
      }
      
      return defaultCurrency
    }
  }, [currencies, defaultCurrency])

  const stocks: StockCardItem[] = useMemo(() => {
    const list: StockCardItem[] = []
    for (const q of quants || []) {
      const quantId = Number(q.id)
      const pid = Array.isArray(q.product_id) ? q.product_id[0] : q.product_id
      if (!pid) continue
      const prod = productMap.get(pid) || {}
      const name = prod.name || (Array.isArray(q.product_id) ? q.product_id[1] : `#${pid}`)
      const unitCost = Number(prod.standard_price) || 0
      const category = Array.isArray(prod.categ_id)
        ? prod.categ_id[1]
        : Array.isArray(q.product_categ_id)
          ? q.product_categ_id[1]
          : ""
      const uom = Array.isArray(q.product_uom_id)
        ? q.product_uom_id[1]
        : Array.isArray(prod.uom_id)
          ? prod.uom_id[1]
          : "Units"
      // Get image_512, fallback to image_1920 if image_512 is not available
      const image = prod.image_512 || prod.image_1920 || null
      const onHand = Number(q.on_hand ?? q.quantity ?? 0)
      const reserved = Number(q.reserved_quantity ?? 0)
      const freeToUse = Number(q.available_quantity ?? onHand - reserved)
      const totalValue = Number(q.value ?? onHand * unitCost)
      const locationName = Array.isArray(q.location_id) ? q.location_id[1] : ""
      const defaultCode = prod.default_code || ""
      const barcode = prod.barcode || ""
      const listPrice = Number(prod.list_price) || 0
      const weight = Number(prod.weight) || 0
      const currency = getCurrencySymbol(prod.currency_id)
      list.push({
        quantId,
        productId: pid,
        name,
        defaultCode,
        barcode,
        category,
        locationName,
        unitCost,
        listPrice,
        totalValue,
        onHand,
        freeToUse,
        reserved,
        incoming: 0,
        outgoing: 0,
        uom,
        weight,
        image,
        currency,
        rawProduct: prod,
        rawQuant: q,
      })
    }
    return list
  }, [quants, productMap, getCurrencySymbol])

  const categories = useMemo(() => {
    return Array.from(
      new Set((products || []).map((p: any) => (Array.isArray(p.categ_id) ? p.categ_id[1] : "")).filter(Boolean)),
    )
  }, [products])

  const uniqueLocations = useMemo(() => {
    return Array.from(
      new Set(stocks.map((item) => item.locationName || "").filter(Boolean))
    ) as string[]
  }, [stocks])

  const filteredData = useMemo(() => {
    return stocks.filter((item) => {
      const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(item.category)
      const matchesLocation = locationFilter.length === 0 || (item.locationName && locationFilter.includes(item.locationName))
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(item.productId).includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.defaultCode && item.defaultCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCategory && matchesLocation && matchesSearch
    })
  }, [stocks, categoryFilter, locationFilter, searchQuery])
  
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
          id: "product_id",
          header: t("Product"),
          cell: ({ row }: any) => (
            <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
              {Array.isArray(row.original.product_id) ? row.original.product_id[1] : row.original.product_id || "—"}
            </span>
          ),
        },
      ]
    }
    return generateColumnsFromFields(smartFields, colors, t)
  }, [smartFields, colors, t, i18n?.language || 'en'])
  
  // Filter smartFieldRecords based on search and filters
  const filteredSmartRecords = useMemo(() => {
    return (smartFieldRecords || []).filter((quant: any) => {
      const productId = Array.isArray(quant.product_id) ? quant.product_id[0] : quant.product_id
      const product = productMap.get(productId)
      const productName = product?.name || (Array.isArray(quant.product_id) ? quant.product_id[1] : "") || ""
      const locationName = Array.isArray(quant.location_id) ? quant.location_id[1] : ""
      const category = product ? (Array.isArray(product.categ_id) ? product.categ_id[1] : "") : ""
      
      const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(category)
      const matchesLocation = locationFilter.length === 0 || (locationName && locationFilter.includes(locationName))
      const matchesSearch =
        productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(productId).includes(searchQuery.toLowerCase()) ||
        category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product?.default_code && product.default_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product?.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
      
      return matchesCategory && matchesLocation && matchesSearch
    })
  }, [smartFieldRecords, searchQuery, categoryFilter, locationFilter, productMap])

  const totalValue = filteredData.reduce((sum, item) => sum + (item.totalValue || 0), 0)
  const totalUnits = filteredData.reduce((sum, item) => sum + (item.onHand || 0), 0)
  const lowStockItems = filteredData.filter((item) => item.onHand < 100).length
  const inStockItems = filteredData.filter((item) => item.onHand > 0).length

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredData.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter, locationFilter])

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("stocks")) {
      return
    }
    // Determine data to export
    let dataToExport = filteredData
    if (options.scope === "selected") {
      dataToExport = filteredData.filter((item) => rowSelection[String(item.productId)])
    } else if (options.scope === "page") {
      dataToExport = paginatedData
    }

    // Define all possible columns
    const allColumns = {
      productId: {
        header: t('Product ID'),
        accessor: (row: any) => `#${row.productId}`,
        isMonospace: true
      },
      name: {
        header: t('Product Name'),
        accessor: (row: any) => row.name,
        isBold: true
      },
      defaultCode: {
        header: t('SKU'),
        accessor: (row: any) => row.defaultCode || '-',
        isMonospace: true
      },
      barcode: {
        header: t('Barcode'),
        accessor: (row: any) => row.barcode || '-',
        isMonospace: true
      },
      category: {
        header: t('Category'),
        accessor: (row: any) => row.category || '-'
      },
      locationName: {
        header: t('Location'),
        accessor: (row: any) => row.locationName || '-'
      },
      onHand: {
        header: t('On Hand'),
        accessor: (row: any) => {
          const onHand = row.onHand || 0
          return `${onHand.toLocaleString()} ${row.uom || ''}`
        }
      },
      freeToUse: {
        header: t('Free To Use'),
        accessor: (row: any) => {
          const free = row.freeToUse || 0
          return `${free.toLocaleString()} ${row.uom || ''}`
        }
      },
      reserved: {
        header: t('Reserved'),
        accessor: (row: any) => {
          const reserved = row.reserved || 0
          return `${reserved.toLocaleString()} ${row.uom || ''}`
        }
      },
      incoming: {
        header: t('Incoming'),
        accessor: (row: any) => {
          const incoming = row.incoming || 0
          return `${incoming.toLocaleString()} ${row.uom || ''}`
        }
      },
      outgoing: {
        header: t('Outgoing'),
        accessor: (row: any) => {
          const outgoing = row.outgoing || 0
          return `${outgoing.toLocaleString()} ${row.uom || ''}`
        }
      },
      unitCost: {
        header: t('Unit Cost'),
        accessor: (row: any) => `$${(row.unitCost || 0).toFixed(2)}`
      },
      totalValue: {
        header: t('Total Value'),
        accessor: (row: any) => `$${(row.totalValue || 0).toLocaleString()}`,
        isBold: true
      },
      weight: {
        header: t('Weight'),
        accessor: (row: any) => row.weight ? `${row.weight} kg` : '-'
      },
    }

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Stocks Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Total Units'), value: data.reduce((sum: number, item: any) => sum + (item.onHand || 0), 0).toLocaleString() },
        { label: t('Total Value'), value: `$${data.reduce((sum: number, item: any) => sum + (item.totalValue || 0), 0).toLocaleString()}` },
        { label: t('In Stock Items'), value: data.filter((item: any) => (item.onHand || 0) > 0).length },
        { label: t('Low Stock Items'), value: data.filter((item: any) => (item.onHand || 0) < 100 && (item.onHand || 0) > 0).length }
      ]
    }

    exportData(options, dataToExport, config, null)
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
            {t("Stocks")}
          </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
            {t("Monitor and manage your product inventory")}
          </p>
        </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  fetchData("quants")
                  fetchData("products")
                }}
                disabled={!!loading?.quants || !!loading?.products}
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
                <RefreshCcw className={`w-4 h-4 ${(loading?.quants || loading?.products) ? "animate-spin" : ""}`} />
                {(loading?.quants || loading?.products) ? t("Loading...") : t("Refresh")}
              </Button>
            {canCreatePage("stocks") && (
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
                    navigate('/products/create')
                  }}
                >
                  <Plus size={isMobile ? 18 : 20} />
                {t("Add Product")}
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
              label={t("Total Value")}
              value={`${defaultCurrency}${totalValue.toLocaleString()}`}
              icon={DollarSign}
              gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
              delay={0}
            />
            <StatCard
              label={t("Total Units")}
              value={totalUnits.toLocaleString()}
              icon={Package}
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              delay={1}
            />
            <StatCard
              label={t("In Stock Items")}
              value={inStockItems}
              icon={TrendingUp}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Low Stock Items")}
              value={lowStockItems}
              icon={AlertCircle}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
              />
            </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search products...")}
            statusFilter={locationFilter}
            onStatusChange={setLocationFilter}
            statusOptions={uniqueLocations}
            statusPlaceholder={t("Location")}
            toFilter={categoryFilter}
            onToChange={setCategoryFilter}
            toOptions={categories}
            toPlaceholder={t("Category")}
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
            loading?.quants || loading?.products ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <StockCardSkeleton key={idx} colors={colors} />
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
                  {paginatedData.map((item, index) => {
                    const prod = productMap.get(item.productId)
                    return (
                      <StockCard
                        key={`${item.quantId}-${index}`}
                        stock={item}
                        currency={item.currency || defaultCurrency}
                        onClick={canEditPage("stocks") ? () => {
                          if (prod) {
                            navigate(`/products/edit/${prod.id}`)
                          }
                        } : undefined}
                        index={index}
                      />
                    )
                  })}
                </div>
              )
          ) : (
            <DataTable
                  data={smartFieldRecords}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                  onSelectAllChange={() => {}}
                  onExport={canExportPage("stocks") ? () => setIsExportModalOpen(true) : undefined}
                  isLoading={smartFieldLoading}
                  visibleColumns={visibleColumns}
                  onVisibleColumnsChange={setVisibleColumns}
                  columns={tableColumns}
                  actions={canEditPage("stocks") ? ((quant) => {
                    const quantId = (quant as any).id
                    const productId = Array.isArray((quant as any).product_id) 
                      ? (quant as any).product_id[0] 
                      : (quant as any).product_id
                    
                    return [
                      {
                        key: "edit",
                        label: t("Edit"),
                        icon: Edit,
                        onClick: () => {
                          if (productId) {
                            navigate(`/products/edit/${productId}`)
                          }
                        },
                      }
                    ]
                  }) : undefined}
                  actionsLabel={t("Actions")}
                  isRTL={isRTL}
                  getRowIcon={(quant) => {
                    const quantity = (quant as any).quantity || (quant as any).on_hand || 0
                    const status = quantity === 0 ? "out" : quantity < 100 ? "low" : "in"
                    // Match receipts-style status icon gradients
                    if (status === "out") {
                      // Out of stock -> cancelled (red)
                      return { icon: AlertCircle, gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }
                    }
                    if (status === "low") {
                      // Low stock -> warning-ish (blue)
                      return { icon: TrendingUp, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }
                    }
                    // In stock -> done (green)
                    return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                  }}
                  showPagination={true}
                  defaultItemsPerPage={10}
                />
              )}

              {filteredData.length === 0 && !loading?.quants && !loading?.products && (
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
                    {t("No stocks found")}
                      </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                    </div>
              )}

              {filteredData.length > 0 && viewMode === "cards" && (
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

      {/* Modal removed - using DynamicRecordPage instead */}

      {canExportPage("stocks") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={filteredData.length}
          selectedCount={Object.keys(rowSelection).length}
          isSelectAll={Object.keys(rowSelection).length === filteredData.length && filteredData.length > 0}
        />
      )}
    </div>
  )
}

// Skeleton component matching StockCard structure
function StockCardSkeleton({ colors }: { colors: any }) {
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
              {/* Product ID */}
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
                width="80%"
                height={24}
                sx={{
                  marginBottom: "0.5rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              {/* Category */}
              <Skeleton
                variant="text"
                width="50%"
                height={16}
                sx={{
                  bgcolor: colors.mutedBg,
                }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div
              style={{
                background: `linear-gradient(135deg, ${colors.mutedBg}, ${colors.background})`,
          borderRadius: "0.75rem",
                padding: "1rem",
                border: `1px solid ${colors.border}`,
              }}
            >
              <Skeleton
                variant="text"
                width="50%"
                height={12}
                sx={{
                  marginBottom: "0.5rem",
                  bgcolor: colors.border,
                }}
              />
              <Skeleton
                variant="text"
                width="70%"
                height={24}
                sx={{
                  bgcolor: colors.border,
                }}
              />
            </div>
            <div
              style={{
                background: `linear-gradient(135deg, ${colors.mutedBg}, ${colors.background})`,
                borderRadius: "0.75rem",
                padding: "1rem",
                border: `1px solid ${colors.border}`,
              }}
            >
              <Skeleton
                variant="text"
                width="50%"
                height={12}
                sx={{
                  marginBottom: "0.5rem",
                  bgcolor: colors.border,
                }}
              />
              <Skeleton
                variant="text"
                width="60%"
                height={24}
                sx={{
                  bgcolor: colors.border,
                }}
              />
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
              <Skeleton
                variant="rectangular"
                width={80}
                height={16}
                sx={{
                  borderRadius: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              <Skeleton
                variant="rectangular"
                width={80}
                height={16}
                sx={{
                  borderRadius: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
          </div>

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
