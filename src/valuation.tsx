"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/theme"
import { useCasl } from "../context/casl"
import { Plus, DollarSign, Package, TrendingUp, Award, RefreshCcw, Edit, CheckCircle2, Eye } from "lucide-react"
import { Button } from "../@/components/ui/button"
import { StatCard } from "./components/StatCard"
import { ValuationCard } from "./components/ValuationCard"
import { useData } from "../context/data"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Skeleton } from "@mui/material"
import { DataTable, ColumnDef } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import { API_CONFIG } from "./config/api"

const API_BASE_URL = API_CONFIG.BACKEND_BASE_URL

export default function ValuationPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { canCreatePage, canEditPage, canExportPage } = useCasl()
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [valueRangeFilter, setValueRangeFilter] = useState<string[]>([]) // High/Low value filter
  const [dateRange, setDateRange] = useState<[string | null, string | null] | null>(null)

  // Log filter state on mount
  useEffect(() => {
    console.log('[Valuation] ========== FILTER STATE ==========')
    console.log('[Valuation] Initial filter values:', {
      searchQuery,
      categoryFilter,
      valueRangeFilter,
      dateRange,
      hasActiveFilters: searchQuery.length > 0 || categoryFilter.length > 0 || valueRangeFilter.length > 0 || (dateRange !== null && dateRange[0] !== null),
    })
  }, [])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isSelectAll, setIsSelectAll] = useState<boolean | "indeterminate">(false)
  
  // Column visibility state - default: 6 most important columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "product",
    "category",
    "quantity",
    "unitValue",
    "totalValue",
    "date",
  ])

  const { products, quants, fetchData, loading } = useData()
  const [currencies, setCurrencies] = useState<any[]>([])
  const [defaultCurrency, setDefaultCurrency] = useState<string>('LE')

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
    const sessionId = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
    if (!sessionId) return

    const fetchCurrencies = async () => {
      try {
        const tenantId = localStorage.getItem('current_tenant_id')
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
        if (tenantId) {
          headers['X-Tenant-ID'] = tenantId
        }
        
        const response = await fetch(`${API_BASE_URL}/currencies`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
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

  // Helper function to get currency symbol from currency_id
  const getCurrencySymbol = (currencyId: any): string => {
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

  // Fetch data only once on mount if missing
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (hasFetchedRef.current) return
    const sessionId = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
    if (!sessionId) {
      console.warn('[Valuation] No session ID found, skipping data fetch')
      return
    }
    
    hasFetchedRef.current = true
    // Only fetch if data is missing - this page needs products (product.product) and quants
    console.log('[Valuation] ========== INITIAL FETCH CHECK ==========')
    console.log('[Valuation] Initial state:', {
      productsIsArray: Array.isArray(products),
      productsLength: products?.length || 0,
      quantsIsArray: Array.isArray(quants),
      quantsLength: quants?.length || 0,
      hasSessionId: !!sessionId,
    })
    if (!Array.isArray(products) || !products.length) {
      console.log('[Valuation] Fetching products...')
      fetchData("products")
    } else {
      console.log('[Valuation] Products already loaded, skipping fetch')
    }
    if (!Array.isArray(quants) || !quants.length) {
      console.log('[Valuation] Fetching quants...')
      fetchData("quants")
    } else {
      console.log('[Valuation] Quants already loaded, skipping fetch')
    }
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [])

  const items = useMemo(() => {
    console.log('[Valuation] ========== COMPUTING ITEMS ==========')
    console.log('[Valuation] Input data:', {
      productsIsArray: Array.isArray(products),
      productsLength: products?.length || 0,
      productsType: typeof products,
      quantsIsArray: Array.isArray(quants),
      quantsLength: quants?.length || 0,
      quantsType: typeof quants,
      loadingProducts: loading?.products,
      loadingQuants: loading?.quants,
    })

    // Return empty if data hasn't been loaded yet
    if (!Array.isArray(products) || !Array.isArray(quants)) {
      console.log('[Valuation] Returning empty - data not arrays:', {
        productsIsArray: Array.isArray(products),
        quantsIsArray: Array.isArray(quants),
      })
      return []
    }

    if (products.length === 0) {
      console.warn('[Valuation] ⚠️ Products array is EMPTY!')
    }
    if (quants.length === 0) {
      console.warn('[Valuation] ⚠️ Quants array is EMPTY!')
    }

    const qtyByProduct: Record<number, number> = {}
    let quantProcessed = 0
    let quantSkipped = 0
    let quantWithQty = 0
    
    for (const q of (quants || [])) {
      const pid = Array.isArray(q.product_id) ? Number(q.product_id[0]) : Number(q.product_id)
      if (!pid) {
        quantSkipped++
        continue
      }
      quantProcessed++
      const qty = Number(q.available_quantity ?? q.quantity ?? 0)
      if (qty > 0) quantWithQty++
      if (!qtyByProduct[pid]) qtyByProduct[pid] = 0
      qtyByProduct[pid] += qty
    }

    console.log('[Valuation] Quant processing results:', {
      totalQuants: quants?.length || 0,
      quantProcessed,
      quantSkipped,
      quantWithQty,
      uniqueProductIds: Object.keys(qtyByProduct).length,
      productsWithQty: Object.values(qtyByProduct).filter(q => q > 0).length,
      sampleQuantMappings: Object.entries(qtyByProduct)
        .filter(([_, qty]) => qty > 0)
        .slice(0, 5)
        .map(([pid, qty]) => ({ productId: Number(pid), quantity: qty })),
    })

    const result: Array<{ date: string; reference: string; product: string; quantity: number; totalValue: number; category: string; unitValue: number; imageBase64?: string; currency: string; }> = []
    let productProcessed = 0
    let productSkippedNoId = 0
    let productSkippedNoQty = 0
    let productAdded = 0
    let productSkippedNoPrice = 0
    
    for (const p of (products || [])) {
      productProcessed++
      const pid = typeof p.id === 'number' ? p.id : (Array.isArray(p.id) ? p.id[0] : Number(p.id))
      if (!pid) {
        productSkippedNoId++
        if (productSkippedNoId <= 3) {
          console.log('[Valuation] Product skipped - no valid ID:', { product: p })
        }
        continue
      }
      const qty = Number(qtyByProduct[pid] || 0)
      // Only show items with quantity > 0 for valuation
      if (qty <= 0) {
        productSkippedNoQty++
        if (productSkippedNoQty <= 5) {
          console.log('[Valuation] Product skipped - no quantity:', { 
            productId: pid, 
            productName: p.name || p.display_name,
            qty,
            hasQuantMapping: pid in qtyByProduct,
          })
        }
        continue
      }
      const unit = Number(p.standard_price ?? p.cost ?? 0)
      if (!unit || unit === 0) {
        productSkippedNoPrice++
        // Still add it with 0 value
      }
      const total = unit * qty
      const productLabel = String(p.display_name || p.name || '')
      const categ = Array.isArray(p.categ_id) ? (p.categ_id[1] || '') : (p.categ_id?.name || p.categ_id || '')
      const dateStr = String(p.write_date || p.create_date || '')
      const imageBase64 = typeof p.image_1920 === 'string' ? p.image_1920 : undefined
      const currency = getCurrencySymbol(p.currency_id)
      result.push({ date: dateStr, reference: 'On Hand', product: productLabel, quantity: qty, totalValue: total, category: categ || 'Uncategorized', unitValue: unit, imageBase64, currency })
      productAdded++
      if (productAdded <= 3) {
        console.log('[Valuation] ✅ Product added:', {
          productId: pid,
          productName: productLabel,
          quantity: qty,
          unitValue: unit,
          totalValue: total,
          category: categ,
        })
      }
    }

    console.log('[Valuation] Product processing SUMMARY:', {
      totalProducts: products?.length || 0,
      productProcessed,
      productSkippedNoId,
      productSkippedNoQty,
      productSkippedNoPrice,
      productAdded,
      resultLength: result.length,
    })

    // Sort by totalValue desc by default for nicer UI
    const sorted = result.sort((a, b) => b.totalValue - a.totalValue)
    console.log('[Valuation] ========== FINAL ITEMS ==========')
    console.log('[Valuation] Final items count:', sorted.length)
    if (sorted.length > 0) {
      console.log('[Valuation] Sample items:', sorted.slice(0, 5).map((i) => ({
        product: i.product,
        quantity: i.quantity,
        unitValue: i.unitValue,
        totalValue: i.totalValue,
        category: i.category,
      })))
    } else {
      console.warn('[Valuation] ⚠️ NO ITEMS GENERATED! Check why products/quants are not matching.')
    }
    return sorted
  }, [products, quants, loading, getCurrencySymbol])

  const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0)
  const totalItems = items.length
  const avgValue = totalItems > 0 ? totalValue / totalItems : 0
  const highestValueItem = items.length > 0 ? items.reduce((max, it) => (it.totalValue > max.totalValue ? it : max), items[0]) : null

  const filteredData = useMemo(() => {
    console.log('[Valuation] ========== FILTERING ITEMS ==========')
    console.log('[Valuation] Filter inputs:', {
      itemsLength: items.length,
      searchQuery,
      categoryFilter,
      valueRangeFilter,
      dateRange,
      filtersActive: {
        hasSearch: searchQuery.length > 0,
        hasCategoryFilter: categoryFilter.length > 0,
        hasValueRangeFilter: valueRangeFilter.length > 0,
        hasDateRange: dateRange !== null && dateRange[0] !== null && dateRange[1] !== null,
      },
    })

    if (items.length === 0) {
      console.warn('[Valuation] ⚠️ No items to filter! Items array is empty.')
      return []
    }

    // Calculate median value for high/low filter
    const sortedValues = [...items].map(i => i.totalValue).sort((a, b) => a - b)
    const medianValue = sortedValues.length > 0 ? sortedValues[Math.floor(sortedValues.length / 2)] : 0

    const filtered = items.filter((item, index) => {
      const matchesSearch = item.product.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(item.category)
      
      // Value range filter (high/low)
      const matchesValueRange = valueRangeFilter.length === 0 || valueRangeFilter.some((range) => {
        if (range === "high") return item.totalValue >= medianValue
        if (range === "low") return item.totalValue < medianValue
        return true
      })

      // Date range filter
      let matchesDateRange = true
      if (dateRange && dateRange[0] && dateRange[1] && item.date) {
        const itemDate = item.date.slice(0, 10) // Get YYYY-MM-DD format
        matchesDateRange = itemDate >= dateRange[0] && itemDate <= dateRange[1]
      }

      const matches = matchesSearch && matchesCategory && matchesValueRange && matchesDateRange
      
      // Log first few items that don't match
      if (index < 5 && !matches) {
        console.log('[Valuation] Item filtered out:', {
          product: item.product,
          matchesSearch,
          matchesCategory,
          matchesValueRange,
          matchesDateRange,
          searchQuery,
          categoryFilter,
          valueRangeFilter,
          itemCategory: item.category,
          itemValue: item.totalValue,
          medianValue,
          dateRange,
          itemDate: item.date,
        })
      }
      
      return matches
    })

    console.log('[Valuation] Filtering results:', {
      itemsLength: items.length,
      filteredDataLength: filtered.length,
      itemsFilteredOut: items.length - filtered.length,
      searchQuery,
      categoryFilter,
      valueRangeFilter,
      dateRange,
    })
    if (filtered.length > 0) {
      console.log('[Valuation] Sample filtered items:', filtered.slice(0, 3).map(i => ({
        product: i.product,
        category: i.category,
        quantity: i.quantity,
        totalValue: i.totalValue,
      })))
    } else if (items.length > 0) {
      console.warn('[Valuation] ⚠️ All items were filtered out! Check filters.')
    }

    return filtered
  }, [items, searchQuery, categoryFilter, valueRangeFilter, dateRange])

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredData.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter, valueRangeFilter, dateRange])

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("valuation")) {
      return
    }
    // Determine data to export
    let dataToExport = filteredData
    if (options.scope === "selected") {
      dataToExport = filteredData.filter((r) => rowSelection[String(r.product?.split(']')[0]?.replace('[', '') || r.product)])
    } else if (options.scope === "page") {
      dataToExport = paginatedData
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
      product: {
        header: t('Product'),
        accessor: (row: any) => {
          const productName = row.product?.split("]")[1]?.trim() || row.product || "—"
          return productName
        },
        isBold: true
      },
      category: {
        header: t('Category'),
        accessor: (row: any) => row.category || '-'
      },
      quantity: {
        header: t('Quantity'),
        accessor: (row: any) => row.quantity || 0
      },
      unitValue: {
        header: t('Unit Value'),
        accessor: (row: any) => row.unitValue?.toLocaleString() || '0'
      },
      totalValue: {
        header: t('Total Value'),
        accessor: (row: any) => row.totalValue?.toLocaleString() || '0',
        isBold: true
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
      title: t("Valuation Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Total Items'), value: data.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0) },
        { label: t('Total Value'), value: data.reduce((sum: number, r: any) => sum + (r.totalValue || 0), 0).toLocaleString() },
        { label: t('Average Value'), value: data.length > 0 ? (data.reduce((sum: number, r: any) => sum + (r.totalValue || 0), 0) / data.length).toLocaleString() : '0' }
      ]
    }

    exportData(options, dataToExport, config, dateRange)
    setIsExportModalOpen(false)
  }

  const uniqueCategories = Array.from(new Set(items.map((item) => item.category).filter(Boolean)))
  const valueRangeOptions = ["high", "low"]
  const valueRangeLabels: Record<string, string> = {
    'high': t('High Value'),
    'low': t('Low Value'),
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
                {t("Inventory Valuation")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Comprehensive overview of your warehouse inventory value and analytics")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    await fetchData("products")
                  } catch (error) {
                    console.error("[Valuation] Error fetching products:", error)
                  }
                  try {
                    await fetchData("quants")
                  } catch (error) {
                    console.error("[Valuation] Error fetching quants:", error)
                  }
                }}
                disabled={!!(loading?.products || loading?.quants)}
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
                <RefreshCcw className={`w-4 h-4 ${(loading?.products || loading?.quants) ? "animate-spin" : ""}`} />
                {(loading?.products || loading?.quants) ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("valuation") && (
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
                  {t("New Item")}
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
              label={t("Total Inventory Value")}
              value={`${defaultCurrency}${(totalValue / 1000).toFixed(1)}K`}
              icon={DollarSign}
              gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
              delay={0}
            />
            <StatCard
              label={t("Total Items")}
              value={totalItems}
              icon={Package}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              delay={1}
            />
            <StatCard
              label={t("Average Value")}
              value={`${(avgValue / 1000).toFixed(1)}K ${defaultCurrency}`}
              icon={TrendingUp}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Highest Value Item")}
              value={highestValueItem ? `${(highestValueItem.totalValue / 1000).toFixed(1)}K ${highestValueItem.currency || defaultCurrency}` : t("N/A")}
              icon={Award}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search products...")}
            statusFilter={valueRangeFilter}
            onStatusChange={setValueRangeFilter}
            statusOptions={valueRangeOptions}
            statusPlaceholder={t("Value Range")}
            statusLabelMap={valueRangeLabels}
            toFilter={categoryFilter}
            onToChange={setCategoryFilter}
            toOptions={uniqueCategories}
            toPlaceholder={t("Category")}
            fromFilter={[]}
            onFromChange={() => {}}
            fromOptions={[]}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            isMobile={isMobile}
            showDateRange={true}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {viewMode === "cards" ? (
            loading?.products || loading?.quants ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <ValuationCardSkeleton key={idx} colors={colors} />
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
                  {paginatedData.map((item, idx) => (
                    <ValuationCard
                      key={`${item.product}-${idx}`}
                      date={item.date}
                      reference={item.reference}
                      product={item.product}
                      quantity={item.quantity}
                      totalValue={item.totalValue}
                      category={item.category}
                      unitValue={item.unitValue}
                      imageBase64={item.imageBase64}
                      currency={item.currency || defaultCurrency}
                      index={idx}
                    />
                  ))}
                </div>
              )
          ) : (
            <DataTable
                  data={filteredData}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                  onSelectAllChange={setIsSelectAll}
                  onExport={() => setIsExportModalOpen(true)}
                  columns={[
                    {
                      id: "product",
                      header: t("Product"),
                      cell: ({ row }) => {
                        const item = row.original as any
                        const sku = item.product?.match(/\[(.*?)\]/)?.[1] || ""
                        const productName = item.product?.split("]")[1]?.trim() || item.product || "—"
                        return (
                          <div>
                            <span style={{ color: colors.textPrimary, fontSize: "0.9375rem", fontWeight: 600 }}>
                              {productName}
                            </span>
                            {sku && (
                              <div style={{ color: colors.textSecondary, fontSize: "0.75rem", fontFamily: "monospace", marginTop: "2px" }}>
                                {sku}
                              </div>
                            )}
                          </div>
                        )
                      },
                    },
                    {
                      id: "category",
                      header: t("Category"),
                      cell: ({ row }) => {
                        const item = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {item.category || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "quantity",
                      header: t("Quantity"),
                      cell: ({ row }) => {
                        const item = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                            {item.quantity?.toFixed(2) || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "unitValue",
                      header: t("Unit Value"),
                      cell: ({ row }) => {
                        const item = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                            {item.unitValue ? `${item.unitValue.toLocaleString()} ${item.currency || defaultCurrency}` : "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "totalValue",
                      header: t("Total Value"),
                      cell: ({ row }) => {
                        const item = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.9375rem", fontWeight: 700 }}>
                            {item.totalValue ? `${item.totalValue.toLocaleString()} ${item.currency || defaultCurrency}` : "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "reference",
                      header: t("Reference"),
                      cell: ({ row }) => {
                        const item = row.original as any
                        return (
                          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                            {item.reference || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "date",
                      header: t("Date"),
                      cell: ({ row }) => {
                        const item = row.original as any
                        return (
                          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                            {item.date ? new Date(item.date).toLocaleDateString() : "—"}
                          </span>
                        )
                      },
                    },
                  ]}
                  visibleColumns={visibleColumns}
                  onVisibleColumnsChange={setVisibleColumns}
                  actions={(item) => {
                    const itemId = (item as any).id
                    return [
                      {
                        key: "view",
                        label: t("View"),
                        icon: Eye,
                        onClick: () => navigate(`/valuation/view/${itemId}`),
                      },
                    ]
                  }}
                  actionsLabel={t("Actions")}
                  isRTL={isRTL}
                  isLoading={loading?.products || loading?.quants}
                  getRowIcon={() => {
                    return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                  }}
                  showPagination={true}
                  defaultItemsPerPage={10}
                />
              )}

              {(() => {
                const shouldShow = filteredData.length === 0 && !(loading?.products || loading?.quants) && Array.isArray(products) && Array.isArray(quants)
                console.log('[Valuation] ========== RENDER CHECK ==========')
                console.log('[Valuation] Should show "No items found":', shouldShow)
                console.log('[Valuation] Render check details:', {
                  filteredDataLength: filteredData.length,
                  itemsLength: items.length,
                  loadingProducts: loading?.products,
                  loadingQuants: loading?.quants,
                  productsExists: !!products,
                  quantsExists: !!quants,
                  productsLength: products?.length || 0,
                  quantsLength: quants?.length || 0,
                  productsIsArray: Array.isArray(products),
                  quantsIsArray: Array.isArray(quants),
                  reason: shouldShow ? (
                    items.length === 0 ? 'No items computed from products/quants' :
                    filteredData.length === 0 && items.length > 0 ? 'All items filtered out by search/filters' :
                    'Unknown'
                  ) : 'Not showing (still loading or no data)',
                })
                return shouldShow
              })() && (
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
                    <DollarSign size={28} color="#FFFFFF" />
                  </div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {t("No items found")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                </div>
              )}
        </div>
      </div>

      {canExportPage("valuation") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={filteredData.length}
          selectedCount={Object.keys(rowSelection).length}
          isSelectAll={isSelectAll === true}
        />
      )}
    </div>
  )
}

// Skeleton component matching ValuationCard structure
function ValuationCardSkeleton({ colors }: { colors: any }) {
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
              {/* SKU */}
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
              {/* Reference */}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  gridColumn: idx === 2 ? "1 / -1" : "auto",
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
                    width={idx === 2 ? "60%" : "80%"}
                    height={idx === 2 ? 24 : 20}
                    sx={{
                      bgcolor: colors.mutedBg,
                    }}
                  />
                </div>
              </div>
            ))}
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
