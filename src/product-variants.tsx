"use client"

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Package, DollarSign, TrendingUp, AlertCircle, RefreshCcw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { StatCard } from "./components/StatCard"
import { ProductVariantCard } from "./components/ProductVariantCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Button } from "../@/components/ui/button"
import { Skeleton } from "@mui/material"
import { useSmartFieldRecords } from "./hooks/useSmartFieldRecords"

interface ProductVariant {
  id: number
  internalReference: string
  name: string
  website: string
  variantValues: string
  salesPrice: number
  cost: number
  onHand: number
  forecasted: number
  unit: string
  category: string
  barcode: string
  productType: string
  sales: boolean
  purchase: boolean
  trackInventory: boolean
  salesTaxes: number
  purchaseTaxes: number
  invoicingPolicy: string
  favorite: boolean
  productImage: string
}

export default function ProductVariantsPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { canCreatePage, canEditPage } = useCasl()
  const navigate = useNavigate()
  const { sessionId } = useAuth()
  
  // Fetch records using SmartFieldSelector
  const { records: smartFieldRecords, loading: smartFieldLoading, refetch: refetchSmartFields } = useSmartFieldRecords({
    modelName: 'product.product',
    enabled: !!sessionId,
  })
  
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [productTypeFilter, setProductTypeFilter] = useState<string[]>([])
  const [stockStatusFilter, setStockStatusFilter] = useState<string[]>([])
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

  // Map real product.product data into ProductVariant shape for this UI
  const variants: ProductVariant[] = useMemo(() => {
    return (smartFieldRecords || []).map((p: any) => ({
      id: p.id,
      internalReference: p.default_code || "",
      name: p.name,
      website: "",
      variantValues: "",
      salesPrice: Number(p.list_price) || 0,
      cost: Number(p.standard_price) || 0,
      onHand: Number(p.qty_available) || 0,
      forecasted: Number(p.virtual_available) || 0,
      unit: "Units",
      category: Array.isArray(p.categ_id) ? p.categ_id[1] : "",
      barcode: p.barcode || "",
      productType: p.type ? (p.type === "service" ? "Service" : "Goods") : "Goods",
      sales: !!p.sale_ok,
      purchase: true,
      trackInventory: (p.tracking && p.tracking !== "none") || false,
      salesTaxes: 0,
      purchaseTaxes: 0,
      invoicingPolicy: "Ordered quantities",
      favorite: false,
      productImage: p.image_512 || "",
    }))
  }, [smartFieldRecords])

  const filteredVariants = useMemo(() => {
    const filtered = variants.filter((variant) => {
      const matchesSearch =
        variant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variant.internalReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variant.category.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(variant.category)
      const matchesProductType = productTypeFilter.length === 0 || productTypeFilter.includes(variant.productType)

      let matchesStockStatus = true
      if (stockStatusFilter.length > 0) {
        matchesStockStatus = stockStatusFilter.some((status) => {
          if (status === "in-stock") return variant.onHand >= 100
          if (status === "low-stock") return variant.onHand > 0 && variant.onHand < 100
          if (status === "out-of-stock") return variant.onHand === 0
          return false
        })
      }

      return matchesSearch && matchesCategory && matchesProductType && matchesStockStatus
    })

    // Sort: products with images first, then products without images
    return filtered.sort((a, b) => {
      const aHasImage = !!(a.productImage && a.productImage.trim())
      const bHasImage = !!(b.productImage && b.productImage.trim())
      if (aHasImage && !bHasImage) return -1
      if (!aHasImage && bHasImage) return 1
      return 0
    })
  }, [variants, searchQuery, categoryFilter, productTypeFilter, stockStatusFilter])

  // pagination calculations
  const totalPages = Math.ceil(filteredVariants.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedVariants = filteredVariants.slice(startIndex, endIndex)

  // reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter, productTypeFilter, stockStatusFilter])

  // Calculate statistics
  const totalVariants = variants.length
  const totalInventoryValue = variants.reduce((sum, v) => sum + v.onHand * v.cost, 0)
  const avgSalesPrice = variants.reduce((sum, v) => sum + v.salesPrice, 0) / (variants.length || 1)
  const lowStockCount = variants.filter((v) => v.onHand < 100).length

  // Chart data - Price distribution by category
  const categoryData = [
    { name: "Electronics", avgPrice: 2116.67, count: 3 },
    { name: "Travel", avgPrice: 4278.33, count: 3 },
    { name: "Apparel", avgPrice: 1148.75, count: 5 },
    { name: "Footwear", avgPrice: 600.0, count: 2 },
    { name: "Accessories", avgPrice: 350.0, count: 1 },
  ]

  // Inventory status pie chart
  const inventoryStatusData = [
    { name: "In Stock", value: 12, color: "#4A7FA7" },
    { name: "Low Stock", value: 2, color: "#B3CFE5" },
    { name: "Out of Stock", value: 1, color: "#0A1931" },
  ]

  // Price range distribution
  const priceRangeData = [
    { range: "0-500", count: 2 },
    { range: "500-1000", count: 3 },
    { range: "1000-2000", count: 4 },
    { range: "2000-3000", count: 3 },
    { range: "3000+", count: 3 },
  ]

  const handleVariantClick = (variant: ProductVariant) => {
    // Check edit permission before navigating
    if (!canEditPage("product-variants")) {
      return
    }
    navigate(`/product-variants/edit/${variant.id}`)
  }

  const handleAddVariant = () => {
    navigate('/product-variants/create')
  }

  const uniqueCategories = Array.from(new Set(variants.map((v) => v.category)))
  const uniqueProductTypes = Array.from(new Set(variants.map((v) => v.productType)))

  const stockStatusOptions = ["in-stock", "low-stock", "out-of-stock"]

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
                {t("Product Variants")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage product variants, pricing, and inventory levels")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
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
                  width: isMobile ? "100%" : "auto",
                }}
              >
                <RefreshCcw className={`w-4 h-4 ${smartFieldLoading ? "animate-spin" : ""}`} />
                {smartFieldLoading ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("product-variants") && (
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
                  onClick={handleAddVariant}
                >
                  <Package size={isMobile ? 18 : 20} />
                  {t("New Product Variant")}
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
            label={t("Total Variants")}
            value={totalVariants}
            icon={Package}
            gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
            delay={0}
          />
          <StatCard
            label={t("Inventory Value")}
            value={`$${totalInventoryValue.toLocaleString()}`}
            icon={DollarSign}
            gradient="linear-gradient(135deg, #d97706 0%, #f59e0b 100%)"
            delay={1}
          />
          <StatCard
            label={t("Avg Sales Price")}
            value={`$${avgSalesPrice.toFixed(2)}`}
            icon={TrendingUp}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            delay={2}
          />
          <StatCard
            label={t("Low Stock Items")}
            value={lowStockCount}
            icon={AlertCircle}
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" 
            delay={3}
          />
        </div>

          <div style={{ marginTop: "-2rem", paddingTop: "2rem" }}>
            <TransferFiltersBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={t("Search by name, reference, or category...")}
              statusFilter={stockStatusFilter}
              onStatusChange={setStockStatusFilter}
              statusOptions={stockStatusOptions}
              toFilter={categoryFilter}
              onToChange={setCategoryFilter}
              toOptions={uniqueCategories}
              toPlaceholder={t("Category")}
              fromFilter={productTypeFilter}
              onFromChange={setProductTypeFilter}
              fromOptions={uniqueProductTypes}
              fromPlaceholder={t("Product Type")}
              showDateRange={false}
              isMobile={isMobile}
            />

            {smartFieldLoading ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <ProductVariantCardSkeleton key={idx} colors={colors} />
                ))}
              </div>
            ) : (
              <>
                {filteredVariants.length === 0 ? (
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
                    <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "0.5rem" }}>
                      {t("No variants found")}
                    </h3>
                    <p style={{ color: colors.textSecondary, fontSize: "0.9rem" }}>
                      {t("Try adjusting your filters or search term")}
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
                      {paginatedVariants.map((variant, idx) => (
                        <ProductVariantCard
                          key={variant.id}
                          variant={{
                            id: variant.id,
                            internalReference: variant.internalReference,
                            name: variant.name,
                            category: variant.category,
                            salesPrice: variant.salesPrice,
                            cost: variant.cost,
                            onHand: variant.onHand,
                            barcode: variant.barcode,
                            productImage: variant.productImage,
                            favorite: variant.favorite,
                          }}
                          onClick={canEditPage("product-variants") ? () => handleVariantClick(variant) : undefined}
                          index={idx}
                        />
                      ))}
                    </div>

                    {filteredVariants.length > 0 && (
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Skeleton component matching ProductVariantCard structure
function ProductVariantCardSkeleton({ colors }: { colors: any }) {
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
