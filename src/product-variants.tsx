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
import { TransfersTable } from "./components/TransfersTable"
import { Button } from "../@/components/ui/button"
import { useSmartFieldRecords } from "./hooks/useSmartFieldRecords"
import { generateColumnsFromFields } from "./utils/generateColumnsFromFields"

interface ProductVariant {
  id: number
  product_tmpl_id: number | [number, string] | null
  internalReference: string
  name: string
  salesPrice: number
  cost: number
  onHand: number
  forecasted: number
  unit: string
  category: string
  barcode: string
  productType: string
  trackInventory: boolean
  productImage: string
}

export default function ProductVariantsPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors, mode } = useTheme()
  const { canCreatePage, canEditPage } = useCasl()
  const navigate = useNavigate()
  const { sessionId } = useAuth()

  // Fetch records using SmartFieldSelector
  const { records: smartFieldRecords, fields: smartFields, columns: availableColumns, loading: smartFieldLoading, refetch: refetchSmartFields } = useSmartFieldRecords({
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

  // Column visibility state - initialize with sensible defaults for product.product
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])

  // Update visible columns when available columns change
  useEffect(() => {
    if (availableColumns.length > 0 && visibleColumns.length === 0) {
      // Set sensible default columns for product.product
      const productPriorityFields = [
        'id',
        'image_512',
        'name',
        'default_code',
        'categ_id',
        'list_price',
        'qty_available',
        'type'
      ]

      const defaultCols: string[] = []

      // Add priority fields in order if they exist
      for (const field of productPriorityFields) {
        if (availableColumns.some(col => col.id === field)) {
          defaultCols.push(field)
        }
      }

      // If we have fewer than 6 columns, add more from available columns
      if (defaultCols.length < 6) {
        availableColumns.forEach(col => {
          if (!defaultCols.includes(col.id) && defaultCols.length < 6) {
            defaultCols.push(col.id)
          }
        })
      }

      setVisibleColumns(defaultCols)
    }
  }, [availableColumns, visibleColumns.length])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Map real product.product data into ProductVariant shape for filtering/stats
  const variants: ProductVariant[] = useMemo(() => {
    return (smartFieldRecords || []).map((p: any) => ({
      id: p.id,
      product_tmpl_id: p.product_tmpl_id,
      internalReference: p.default_code || "",
      name: p.name,
      salesPrice: Number(p.list_price) || 0,
      cost: Number(p.standard_price) || 0,
      onHand: Number(p.qty_available) || 0,
      forecasted: Number(p.virtual_available) || 0,
      unit: "Units",
      category: Array.isArray(p.categ_id) ? p.categ_id[1] : "",
      barcode: p.barcode || "",
      productType: p.type ? (p.type === "service" ? "Service" : "Goods") : "Goods",
      trackInventory: (p.tracking && p.tracking !== "none") || false,
      productImage: p.image_512 || "",
    }))
  }, [smartFieldRecords])

  const filteredVariants = useMemo(() => {
    const filtered = variants.filter((variant) => {
      const matchesSearch =
        variant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variant.internalReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variant.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variant.barcode.toLowerCase().includes(searchQuery.toLowerCase())

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

  // Filter smartFieldRecords to match filteredVariants for TransfersTable
  const filteredSmartFieldRecords = useMemo(() => {
    const filteredIds = new Set(filteredVariants.map(v => v.id))
    return smartFieldRecords.filter((r: any) => filteredIds.has(r.id))
  }, [smartFieldRecords, filteredVariants])

  // Generate columns from SmartFieldSelector fields
  const tableColumns = useMemo(() => {
    if (smartFields.length === 0) {
      // Fallback columns if no fields available
      return [
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
          id: "name",
          header: t("Name"),
          cell: ({ row }: any) => (
            <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
              {(row.original as any).name || "—"}
            </span>
          ),
        },
      ]
    }
    return generateColumnsFromFields(smartFields, colors, t)
  }, [smartFields, colors, t, i18n?.language || 'en'])

  // Calculate statistics
  const totalVariants = variants.length
  const inStockCount = variants.filter((v) => v.onHand > 0).length
  const lowStockCount = variants.filter((v) => v.onHand > 0 && v.onHand < 100).length
  const outOfStockCount = variants.filter((v) => v.onHand === 0).length

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
    // Navigate to products page with create sidebar
    navigate('/products/create')
  }

  const uniqueCategories = Array.from(new Set(variants.map((v) => v.category).filter(Boolean)))
  const uniqueProductTypes = Array.from(new Set(variants.map((v) => v.productType).filter(Boolean)))

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
            data={filteredSmartFieldRecords}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            onSelectAllChange={setIsSelectAll}
            totalRecords={filteredSmartFieldRecords.length}
            isLoading={smartFieldLoading}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            columns={tableColumns}
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
