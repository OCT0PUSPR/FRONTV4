"use client"

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Package, Boxes, AlertTriangle, XCircle, RefreshCcw, Eye, Edit } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { StatCard } from "./components/StatCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { TransfersTable, ColumnDef } from "./components/TransfersTable"
import { Button } from "../@/components/ui/button"
import { useSmartFieldRecords } from "./hooks/useSmartFieldRecords"

interface ProductVariant {
  id: number
  product_tmpl_id: number | [number, string] | null
  default_code: string
  name: string
  list_price: number
  standard_price: number
  qty_available: number
  virtual_available: number
  categ_id: [number, string] | null
  barcode: string
  type: string
  tracking: string
  image_512: string
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
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isSelectAll, setIsSelectAll] = useState<boolean | "indeterminate">(false)
  const [isMobile, setIsMobile] = useState(false)

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "image_512",
    "name",
    "default_code",
    "categ_id",
    "list_price",
    "qty_available",
    "type"
  ])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Map records for filtering/stats
  const variants = useMemo(() => {
    return (smartFieldRecords || []).map((p: any) => ({
      ...p,
      categoryName: Array.isArray(p.categ_id) ? p.categ_id[1] : "",
      productType: p.type === "service" ? "Service" : p.type === "consu" ? "Consumable" : "Storable",
      onHand: Number(p.qty_available) || 0,
    }))
  }, [smartFieldRecords])

  const filteredVariants = useMemo(() => {
    const filtered = variants.filter((variant: any) => {
      const name = variant.name || ""
      const defaultCode = variant.default_code || ""
      const categoryName = variant.categoryName || ""
      const barcode = variant.barcode || ""

      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        defaultCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        barcode.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(categoryName)
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

    // Sort: products with images first
    return filtered.sort((a: any, b: any) => {
      const aHasImage = !!(a.image_512 && a.image_512.trim())
      const bHasImage = !!(b.image_512 && b.image_512.trim())
      if (aHasImage && !bHasImage) return -1
      if (!aHasImage && bHasImage) return 1
      return 0
    })
  }, [variants, searchQuery, categoryFilter, productTypeFilter, stockStatusFilter])

  // Define columns manually based on Odoo product.product fields
  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      id: "id",
      header: t("ID"),
      cell: ({ row }: any) => (
        <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 600, fontFamily: "monospace" }}>
          #{row.original.id}
        </span>
      ),
    },
    {
      id: "image_512",
      header: t("Image"),
      cell: ({ row }: any) => {
        const image = row.original.image_512
        if (image) {
          return (
            <div style={{ width: "40px", height: "40px", borderRadius: "0.5rem", overflow: "hidden", border: `1px solid ${colors.border}` }}>
              <img
                src={image.startsWith('data:') ? image : `data:image/webp;base64,${image}`}
                alt={row.original.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          )
        }
        return (
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "0.5rem",
            background: colors.mutedBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${colors.border}`
          }}>
            <Package size={16} style={{ color: colors.textSecondary }} />
          </div>
        )
      },
    },
    {
      id: "name",
      header: t("Product Name"),
      cell: ({ row }: any) => (
        <div>
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
            {row.original.name || "—"}
          </span>
          {row.original.barcode && (
            <div style={{ color: colors.textSecondary, fontSize: "0.75rem", fontFamily: "monospace", marginTop: "2px" }}>
              {row.original.barcode}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "default_code",
      header: t("Internal Reference"),
      cell: ({ row }: any) => (
        <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontFamily: "monospace" }}>
          {row.original.default_code || "—"}
        </span>
      ),
    },
    {
      id: "categ_id",
      header: t("Category"),
      cell: ({ row }: any) => {
        const categ = row.original.categ_id
        const name = Array.isArray(categ) ? categ[1] : categ
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {name || "—"}
          </span>
        )
      },
    },
    {
      id: "type",
      header: t("Type"),
      cell: ({ row }: any) => {
        const type = row.original.type
        const displayType = type === "service" ? t("Service") : type === "consu" ? t("Consumable") : t("Storable")
        const isService = type === "service"
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 600,
              background: isService ? colors.tableWaitingBg : colors.tableDoneBg,
              color: isService ? colors.tableWaitingText : colors.tableDoneText,
            }}
          >
            {displayType}
          </span>
        )
      },
    },
    {
      id: "list_price",
      header: t("Sales Price"),
      cell: ({ row }: any) => (
        <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
          {Number(row.original.list_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      id: "standard_price",
      header: t("Cost"),
      cell: ({ row }: any) => (
        <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
          {Number(row.original.standard_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      id: "qty_available",
      header: t("On Hand"),
      cell: ({ row }: any) => {
        const qty = Number(row.original.qty_available) || 0
        const isLowStock = qty > 0 && qty < 100
        const isOutOfStock = qty === 0
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.875rem",
              fontWeight: 600,
              background: isOutOfStock
                ? colors.tableCancelledBg
                : isLowStock
                  ? colors.tableReadyBg
                  : colors.tableDoneBg,
              color: isOutOfStock
                ? colors.tableCancelledText
                : isLowStock
                  ? colors.tableReadyText
                  : colors.tableDoneText,
            }}
          >
            {qty}
          </span>
        )
      },
    },
    {
      id: "virtual_available",
      header: t("Forecasted"),
      cell: ({ row }: any) => (
        <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
          {Number(row.original.virtual_available) || 0}
        </span>
      ),
    },
    {
      id: "tracking",
      header: t("Tracking"),
      cell: ({ row }: any) => {
        const tracking = row.original.tracking
        const isTracked = tracking && tracking !== "none"
        const displayText = tracking === "lot" ? t("By Lots") : tracking === "serial" ? t("By Serial") : t("No Tracking")
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 600,
              background: isTracked ? colors.tableDoneBg : colors.tableDraftBg,
              color: isTracked ? colors.tableDoneText : colors.tableDraftText,
            }}
          >
            {displayText}
          </span>
        )
      },
    },
    {
      id: "barcode",
      header: t("Barcode"),
      cell: ({ row }: any) => (
        <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontFamily: "monospace" }}>
          {row.original.barcode || "—"}
        </span>
      ),
    },
  ], [colors, t])

  // Calculate statistics
  const totalVariants = variants.length
  const inStockCount = variants.filter((v: any) => v.onHand > 0).length
  const lowStockCount = variants.filter((v: any) => v.onHand > 0 && v.onHand < 100).length
  const outOfStockCount = variants.filter((v: any) => v.onHand === 0).length

  // Get product_tmpl_id from variant
  const getTemplateId = (record: any): number | null => {
    const product_tmpl_id = record.product_tmpl_id
    if (!product_tmpl_id) return null
    if (Array.isArray(product_tmpl_id)) return product_tmpl_id[0]
    if (typeof product_tmpl_id === 'number') return product_tmpl_id
    return null
  }

  // Navigate to product.template create (via products page sidebar)
  const handleAddVariant = () => {
    navigate('/products/create')
  }

  const uniqueCategories = Array.from(new Set(variants.map((v: any) => v.categoryName).filter(Boolean)))
  const uniqueProductTypes = Array.from(new Set(variants.map((v: any) => v.productType).filter(Boolean)))

  const stockStatusOptions = ["in-stock", "low-stock", "out-of-stock"]

  // Actions for each row
  const getRowActions = (record: any) => {
    const templateId = getTemplateId(record)
    const actions = [
      {
        key: "view",
        label: t("View"),
        icon: Eye,
        onClick: () => {
          if (templateId) {
            navigate(`/products/view/${templateId}`)
          }
        },
      },
    ]

    if (canEditPage("product-variants") && templateId) {
      actions.push({
        key: "edit",
        label: t("Edit Product"),
        icon: Edit,
        onClick: () => {
          navigate(`/products/edit/${templateId}`)
        },
      })
    }

    return actions
  }

  // Row icon based on stock status
  const getRowIcon = (record: any) => {
    const qty = Number(record.qty_available) || 0
    if (qty === 0) {
      return { icon: XCircle, gradient: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)" }
    }
    if (qty < 100) {
      return { icon: AlertTriangle, gradient: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }
    }
    return { icon: Package, gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }
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
                {t("Product Variants")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("View product variants - create/edit via Products page")}
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
                  {t("New Product")}
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
              gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
              delay={0}
            />
            <StatCard
              label={t("In Stock")}
              value={inStockCount}
              icon={Boxes}
              gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              delay={1}
            />
            <StatCard
              label={t("Low Stock")}
              value={lowStockCount}
              icon={AlertTriangle}
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              delay={2}
            />
            <StatCard
              label={t("Out of Stock")}
              value={outOfStockCount}
              icon={XCircle}
              gradient="linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search by name, reference, barcode, or category...")}
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

          <TransfersTable
            data={filteredVariants}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            onSelectAllChange={setIsSelectAll}
            totalRecords={filteredVariants.length}
            isLoading={smartFieldLoading}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            columns={columns}
            actions={canEditPage("product-variants") ? getRowActions : undefined}
            actionsLabel={t("Actions")}
            isRTL={isRTL}
            getRowIcon={getRowIcon}
            showPagination={true}
            defaultItemsPerPage={10}
          />

          {!smartFieldLoading && filteredVariants.length === 0 && (
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
          )}
        </div>
      </div>
    </div>
  )
}
