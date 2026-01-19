"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Package, DollarSign, Layers, TrendingUp, RefreshCcw, Plus, Banknote } from "lucide-react"
import { StatCard } from "./StatCard"
import { ProductRecordCard } from "./ProductRecordCard"
import { Skeleton } from "@mui/material"
import { useTheme } from "../../context/theme"
import { useCasl } from "../../context/casl"
import { TransferFiltersBar } from "./TransferFiltersBar"
import { Button } from "../../@/components/ui/button"
import { useAuth } from "../../context/auth"

interface Product {
  id: number
  name: string
  default_code: string
  qty_available: number
  virtual_available: number
  list_price: number
  standard_price: number
  image_512?: string
  categ_id: [number, string]
  weight: number
  sale_ok: boolean
  barcode: string
}

interface ProductRecordsProps {
  products: Product[]
  onAddProduct?: () => void
  onEditProduct?: (productId: number) => void
  onRefresh?: () => void
  isLoading?: boolean
  error?: string | null
}

export function ProductRecords({ products, onAddProduct, onEditProduct, onRefresh, isLoading = false, error = null }: ProductRecordsProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { canCreatePage, canEditPage } = useCasl()
  const { currencySymbol } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priceRangeFilter, setPriceRangeFilter] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const categories = Array.from(new Set(products.map((p) => p.categ_id[1])))
  const statusOptions = ["available", "out-of-stock", "for-sale"]
  const priceRangeOptions = ["0-50", "50-100", "100-500", "500+"]
  
  // Format price range options for display
  const formattedPriceRangeOptions = priceRangeOptions.map((range) => {
    if (range === "0-50") return `${currencySymbol}0 - ${currencySymbol}50`
    if (range === "50-100") return `${currencySymbol}50 - ${currencySymbol}100`
    if (range === "100-500") return `${currencySymbol}100 - ${currencySymbol}500`
    if (range === "500+") return `${currencySymbol}500+`
    return range
  })
  
  // Helper function to convert formatted price range back to value format
  const getPriceRangeValue = (formatted: string): string => {
    if (formatted === "$0 - $50") return "0-50"
    if (formatted === "$50 - $100") return "50-100"
    if (formatted === "$100 - $500") return "100-500"
    if (formatted === "$500+") return "500+"
    return formatted
  }
  
  // Convert formatted price range filter back to values for filtering
  const priceRangeFilterValues = priceRangeFilter.map(getPriceRangeValue)

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase()
    const nameMatch = (product.name || "").toLowerCase().includes(query)
    const defaultCodeMatch = product.default_code
      ? String(product.default_code).toLowerCase().includes(query)
      : false
    const barcodeMatch = product.barcode
      ? String(product.barcode).toLowerCase().includes(query)
      : false

    const matchesSearch = nameMatch || defaultCodeMatch || barcodeMatch

    const matchesCategory =
      categoryFilter.length === 0 || categoryFilter.includes(product.categ_id[1])

    const matchesStatus =
      statusFilter.length === 0 ||
      statusFilter.some((status) => {
        if (status === "available") return product.qty_available > 0
        if (status === "out-of-stock") return product.qty_available === 0
        if (status === "for-sale") return product.sale_ok
        return false
      })

    const matchesPriceRange =
      priceRangeFilterValues.length === 0 ||
      priceRangeFilterValues.some((range) => {
        if (range === "0-50") return product.list_price < 50
        if (range === "50-100") return product.list_price >= 50 && product.list_price < 100
        if (range === "100-500") return product.list_price >= 100 && product.list_price < 500
        if (range === "500+") return product.list_price >= 500
        return false
      })

    return matchesSearch && matchesCategory && matchesStatus && matchesPriceRange
  })

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter, statusFilter, priceRangeFilter])

  const totalProducts = products.length
  const totalValue = products.reduce((sum, p) => sum + p.list_price * p.qty_available, 0)
  const inStock = products.filter((p) => p.qty_available > 0).length
  const forSale = products.filter((p) => p.sale_ok).length

  const handleProductClick = (product: Product) => {
    if (onEditProduct && canEditPage("products")) {
      onEditProduct(product.id)
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
                {t("Product Catalog")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage your product inventory and details")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              {onRefresh && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onRefresh}
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
              )}
              {onAddProduct && canCreatePage("products") && (
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
                  onClick={onAddProduct}
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
            label={t("Total Products")}
            value={totalProducts}
            icon={Package}
            gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
            delay={0}
          />
          <StatCard
            label={t("In Stock")}
            value={inStock}
            icon={Layers}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            delay={1}
          />
          <StatCard
            label={t("For Sale")}
            value={forSale}
            icon={TrendingUp}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            delay={2}
          />
          <StatCard
            label={t("Total Value")}
            value={`${currencySymbol}${totalValue.toLocaleString()}`}
            icon={Banknote}
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            delay={3}
          />
        </div>

          <div style={{ marginTop: "-2rem", paddingTop: "2rem" }}>
            <TransferFiltersBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={t("Search products...")}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              statusOptions={statusOptions}
              toFilter={categoryFilter}
              onToChange={setCategoryFilter}
              toOptions={categories}
              toPlaceholder={t("Category")}
              fromFilter={priceRangeFilter}
              onFromChange={setPriceRangeFilter}
              fromOptions={formattedPriceRangeOptions}
              fromPlaceholder={t("Price Range")}
              showDateRange={false}
              isMobile={isMobile}
            />

            {isLoading ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <ProductCardSkeleton key={idx} colors={colors} />
                ))}
              </div>
            ) : error ? (
          <div
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: "1rem",
              padding: "3rem 2rem",
              textAlign: "center",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: "4rem",
                height: "4rem",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
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
              {t("Failed to load products")}
            </h3>
            <p style={{ fontSize: "0.9rem", color: colors.textSecondary, marginBottom: "1.5rem" }}>
              {error}
            </p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90"
                style={{ background: colors.action }}
              >
                <RefreshCcw className="w-4 h-4" />
                {t("Retry")}
              </button>
            )}
          </div>
        ) : products.length === 0 ? (
          <div
            style={{
              background: `linear-gradient(135deg, ${colors.card} 0%, ${colors.mutedBg} 100%)`,
              border: `1px solid ${colors.border}`,
              borderRadius: "1rem",
              padding: "3rem 2rem",
              textAlign: "center",
              maxWidth: "600px",
              margin: "0 auto",
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
              {t("No products found")}
            </h3>
            <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>
              {t("No products available in the system")}
            </p>
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
                  {paginatedProducts.map((product, idx) => (
                    <ProductRecordCard key={product.id} product={product} onClick={() => handleProductClick(product)} index={idx} />
                  ))}
                </div>

                {filteredProducts.length === 0 && !isLoading && (
              <div
                style={{
                  background: `linear-gradient(135deg, ${colors.card} 0%, ${colors.mutedBg} 100%)`,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "1rem",
                  padding: "3rem 2rem",
                  textAlign: "center",
                  maxWidth: "600px",
                  margin: "2rem auto 0",
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
                  {t("No products found")}
                </h3>
                <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>
                  {t("Try adjusting your search criteria")}
                </p>
              </div>
            )}

                {filteredProducts.length > 0 && (
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
                  {[12, 24, 48].map((rows) => (
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
          </div>
        </div>
      </div>
    </div>
  )
}

// Skeleton component matching ProductRecordCard structure
function ProductCardSkeleton({ colors }: { colors: any }) {
  return (
    <div
      className="relative w-full rounded-[24px] p-[2px]"
      style={{
        background: colors.card,
      }}
    >
      <div
        className="relative h-full rounded-[22px] overflow-hidden"
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Status Badge Skeleton */}
        <div className="absolute top-0 right-0 p-4">
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
                borderRadius: "1rem",
                bgcolor: colors.mutedBg,
              }}
            />
            <div className="flex-1 pt-1">
              <Skeleton
                variant="text"
                width="40%"
                height={16}
                sx={{
                  marginBottom: "0.5rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              <Skeleton
                variant="text"
                width="80%"
                height={24}
                sx={{
                  bgcolor: colors.mutedBg,
                }}
              />
            </div>
          </div>

          {/* Details Grid - 2 per row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton
                  variant="text"
                  width="60%"
                  height={14}
                  sx={{
                    marginBottom: "0.5rem",
                    bgcolor: colors.mutedBg,
                  }}
                />
                <Skeleton
                  variant="text"
                  width="40%"
                  height={18}
                  sx={{
                    bgcolor: colors.mutedBg,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: colors.border }}>
            <div className="flex items-center gap-4">
              <Skeleton
                variant="text"
                width={80}
                height={16}
                sx={{
                  bgcolor: colors.mutedBg,
                }}
              />
              <Skeleton
                variant="text"
                width={100}
                height={16}
                sx={{
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
