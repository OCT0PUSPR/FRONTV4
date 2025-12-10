"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import { Package, Plus, ShoppingCart, ShoppingBag, Box, Hash, Barcode, Route, Building2, X, RefreshCcw, Edit, CheckCircle2 } from "lucide-react"
import { StatCard } from "./components/StatCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Button } from "../@/components/ui/button"
import { Card } from "../@/components/ui/card"
import { Skeleton } from "@mui/material"
import Toast from "./components/Toast"
import { CustomInput } from "./components/CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./components/NewCustomDropdown"
import { NewCustomButton } from "./components/NewCustomButton"
import { DataTable, ColumnDef } from "./components/DataTable"
import { IOSCheckbox } from "./components/IOSCheckbox"

interface UIPackaging {
  id: number
  name: string
  productName: string
  packageTypeName: string
  qty: number
  uomName: string
  sales: boolean
  purchase: boolean
  barcode: string
  routesLabel: string
  companyName: string
  raw: any
}

export default function ProductPackagingsPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { productPackaging, products, packageTypes, stockRoutes, fetchData, loading } = useData() as any
  const { uid } = useAuth()
  const { canCreatePage, canEditPage } = useCasl()

  // Get Odoo headers from localStorage
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem("odooBase") || localStorage.getItem("odoo_base_url") || "https://egy.thetalenter.net"
    const db = localStorage.getItem("odooDb") || localStorage.getItem("odoo_db") || "odoodb1"
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [usageTypeFilter, setUsageTypeFilter] = useState<string[]>([]) // Sales/Purchase filter
  const [toFilter, setToFilter] = useState<string[]>([])
  const [fromFilter, setFromFilter] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPackaging, setEditingPackaging] = useState<any | null>(null)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  
  // Column visibility state - default: 6 most important columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "productName",
    "packageTypeName",
    "qty",
    "usageType",
  ])

  // Form state
  const [formData, setFormData] = useState<any>({
    name: "",
    product_id: "",
    package_type_id: "",
    qty: "",
    sales: false,
    purchase: false,
    barcode: "",
    route_ids: [] as string[],
  })

  // Fetch data only on mount, not on array length changes to prevent infinite loops
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (hasFetchedRef.current) return
    const sessionId = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
    if (!sessionId) return
    
    hasFetchedRef.current = true
    // Only fetch if data is missing
    if (!Array.isArray(productPackaging) || !productPackaging.length) fetchData('productPackaging')
    if (!Array.isArray(products) || !products.length) fetchData('products')
    if (!Array.isArray(packageTypes) || !packageTypes.length) fetchData('packageTypes')
    if (!Array.isArray(stockRoutes) || !stockRoutes.length) fetchData('stockRoutes')
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [])

  const uiPackagings: UIPackaging[] = useMemo(() => {
    const routeName = (rt: any) => Array.isArray(rt) ? (rt[1] ?? rt[0]) : (rt?.display_name || rt?.name || rt || "")
    const m2oName = (v: any) => Array.isArray(v) ? (v[1] ?? v[0]) : (v?.display_name || v?.name || v || "")
    return (Array.isArray(productPackaging) ? productPackaging : []).map((p: any) => ({
      id: p.id,
      name: String(p.name || p.packaging || ""),
      productName: m2oName(p.product_id) || m2oName(p.product_tmpl_id),
      packageTypeName: m2oName(p.package_type_id),
      qty: Number(p.qty ?? 0),
      uomName: m2oName(p.product_uom_id) || "",
      sales: !!p.sales,
      purchase: !!p.purchase,
      barcode: String(p.barcode || ""),
      routesLabel: Array.isArray(p.route_ids) ? p.route_ids.map(routeName).slice(0,3).join(", ") : "",
      companyName: m2oName(p.company_id),
      raw: p,
    }))
  }, [productPackaging])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const filteredPackagings = useMemo(() => {
    return uiPackagings.filter((pkg) => {
      const matchesSearch = 
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.packageTypeName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTo = toFilter.length === 0 || toFilter.includes(pkg.productName)
      const matchesFrom = fromFilter.length === 0 || fromFilter.includes(pkg.packageTypeName)
      const matchesUsageType = usageTypeFilter.length === 0 || usageTypeFilter.some((type) => {
        if (type === "sales") return pkg.sales
        if (type === "purchase") return pkg.purchase
        if (type === "both") return pkg.sales && pkg.purchase
        return false
      })
      return matchesSearch && matchesTo && matchesFrom && matchesUsageType
    })
  }, [uiPackagings, searchQuery, toFilter, fromFilter, usageTypeFilter])

  // Pagination
  const totalPages = Math.ceil(filteredPackagings.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPackagings = filteredPackagings.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, toFilter, fromFilter, usageTypeFilter])
  
  // Get unique usage types for filter
  const uniqueUsageTypes = ["sales", "purchase", "both"]
  const usageTypeLabels: Record<string, string> = {
    'sales': t('Sales'),
    'purchase': t('Purchase'),
    'both': t('Sales & Purchase'),
  }

  const totalPackagings = uiPackagings.length
  const productsWithPackaging = new Set(uiPackagings.map((p) => p.productName)).size
  const salesEnabled = uiPackagings.filter((p) => p.sales).length
  const purchaseEnabled = uiPackagings.filter((p) => p.purchase).length

  const uniqueProducts = useMemo(() => {
    return Array.from(new Set(uiPackagings.map((p) => p.productName).filter(Boolean)))
  }, [uiPackagings])

  const uniquePackageTypes = useMemo(() => {
    return Array.from(new Set(uiPackagings.map((p) => p.packageTypeName).filter(Boolean)))
  }, [uiPackagings])

  const handleAddPackaging = () => {
    setEditingPackaging(null)
    setFormData({ name: "", product_id: "", package_type_id: "", qty: "", sales: false, purchase: false, barcode: "", route_ids: [] })
    setIsModalOpen(true)
  }

  const handleEditPackaging = (ui: UIPackaging) => {
    // Check edit permission before opening modal
    if (!canEditPage("product-packagings")) {
      return
    }
    const raw = ui.raw
    setEditingPackaging(raw)
    setFormData({
      name: String(raw?.name || raw?.packaging || ""),
      product_id: raw?.product_id ? String(Array.isArray(raw.product_id) ? raw.product_id[0] : raw.product_id) : "",
      package_type_id: raw?.package_type_id ? String(Array.isArray(raw.package_type_id) ? raw.package_type_id[0] : raw.package_type_id) : "",
      qty: raw?.qty != null ? String(raw.qty) : "",
      sales: !!raw?.sales,
      purchase: !!raw?.purchase,
      barcode: String(raw?.barcode || ""),
      route_ids: Array.isArray(raw?.route_ids) ? raw.route_ids.map((x:any)=> String(Array.isArray(x)? x[0]: x)).filter(Boolean) : [],
    })
    setIsModalOpen(true)
  }

  const getSessionId = () => localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
  const handleSavePackaging = async () => {
    try {
      const sessionId = getSessionId()
      if (!sessionId) {
        setToast({ text: t('No session ID found'), state: "error" })
        setTimeout(() => setToast(null), 3000)
        return
      }
      const values:any = {}
      if (typeof formData.name === 'string') values.name = formData.name
      if (formData.product_id) values.product_id = Number(formData.product_id)
      if (formData.package_type_id) values.package_type_id = Number(formData.package_type_id)
      if (formData.qty !== '' && !Number.isNaN(Number(formData.qty))) values.qty = Number(formData.qty)
      if (typeof formData.sales === 'boolean') values.sales = !!formData.sales
      if (typeof formData.purchase === 'boolean') values.purchase = !!formData.purchase
      if (typeof formData.barcode === 'string') values.barcode = formData.barcode
      if (Array.isArray(formData.route_ids)) values.route_ids = formData.route_ids.map((x:string)=> Number(x)).filter(Number.isInteger)

      const userId = uid ? Number(uid) : undefined
      let ok=false
      let message = ''
      const headers = getOdooHeaders()
      if (editingPackaging?.id) {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/product-packaging/${editingPackaging.id}`, { method: 'PUT', headers, body: JSON.stringify({ sessionId, values, userId }) })
        const j = await res.json().catch(async ()=>({ message: await res.text().catch(()=> '') }))
        ok = res.ok && j?.success
        message = j?.message || ''
      } else {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/product-packaging/create`, { method: 'POST', headers, body: JSON.stringify({ sessionId, values, userId }) })
        const j = await res.json().catch(async ()=>({ message: await res.text().catch(()=> '') }))
        ok = res.ok && (j?.success || j?.id)
        message = j?.message || ''
      }
      if (ok) {
        setToast({ text: editingPackaging?.id ? t("Packaging updated successfully") : t("Packaging created successfully"), state: "success" })
        setTimeout(() => setToast(null), 3000)
        await fetchData('productPackaging')
        setIsModalOpen(false)
        setEditingPackaging(null)
      } else {
        setToast({ text: message || (editingPackaging?.id ? t("Failed to update packaging") : t("Failed to create packaging")), state: "error" })
        setTimeout(() => setToast(null), 3000)
      }
    } catch (e: any) {
      console.error('Save packaging failed', e)
      setToast({ text: e?.message || t("An error occurred"), state: "error" })
      setTimeout(() => setToast(null), 3000)
    }
  }

  // no-op: deleting not implemented here; handled via backend if needed

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
                {t("Product Packagings")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage product packaging configurations and units")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  fetchData("productPackaging")
                  fetchData("products")
                  fetchData("packageTypes")
                  fetchData("stockRoutes")
                }}
                disabled={!!loading?.productPackaging}
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
                <RefreshCcw className={`w-4 h-4 ${loading?.productPackaging ? "animate-spin" : ""}`} />
                {loading?.productPackaging ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("product-packagings") && (
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
                  onClick={handleAddPackaging}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("Add Product Packaging")}
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
              label={t("Total Packagings")}
              value={totalPackagings}
              icon={Package}
              gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
              delay={0}
            />
            <StatCard
              label={t("Products with Packaging")}
              value={productsWithPackaging}
              icon={Box}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              delay={1}
            />
            <StatCard
              label={t("Sales Enabled")}
              value={salesEnabled}
              icon={ShoppingBag}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Purchase Enabled")}
              value={purchaseEnabled}
              icon={ShoppingCart}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search packagings, products, or types...")}
            statusFilter={usageTypeFilter}
            onStatusChange={setUsageTypeFilter}
            statusOptions={uniqueUsageTypes}
            statusPlaceholder={t("Usage Type")}
            statusLabelMap={usageTypeLabels}
            toFilter={toFilter}
            onToChange={setToFilter}
            toOptions={uniqueProducts}
            fromFilter={fromFilter}
            onFromChange={setFromFilter}
            fromOptions={uniquePackageTypes}
            showDateRange={false}
            isMobile={isMobile}
            toPlaceholder={t("Product")}
            fromPlaceholder={t("Package Type")}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {viewMode === "cards" ? (
            loading?.productPackaging ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <PackagingCardSkeleton key={idx} colors={colors} />
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
                {paginatedPackagings.map((packaging, idx) => (
                  <PackagingCard
                    key={packaging.id}
                    packaging={packaging}
                    onClick={canEditPage("product-packagings") ? () => handleEditPackaging(packaging) : undefined}
                    index={idx}
                  />
                ))}
              </div>
            )
          ) : (
            <DataTable
              data={paginatedPackagings}
              isLoading={loading?.productPackaging}
              columns={[
                    {
                      id: "id",
                      header: t("ID"),
                      cell: ({ row }) => (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                          #{row.original.id}
                        </span>
                      ),
                    },
                    {
                      id: "name",
                      header: t("Packaging Name"),
                      cell: ({ row }) => {
                        const pkg = row.original as UIPackaging
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.9375rem", fontWeight: 600 }}>
                            {pkg.name || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "productName",
                      header: t("Product"),
                      cell: ({ row }) => {
                        const pkg = row.original as UIPackaging
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {pkg.productName || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "packageTypeName",
                      header: t("Package Type"),
                      cell: ({ row }) => {
                        const pkg = row.original as UIPackaging
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {pkg.packageTypeName || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "qty",
                      header: t("Quantity"),
                      cell: ({ row }) => {
                        const pkg = row.original as UIPackaging
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                            {pkg.qty} {pkg.uomName || ""}
                          </span>
                        )
                      },
                    },
                    {
                      id: "usageType",
                      header: t("Usage Type"),
                      cell: ({ row }) => {
                        const pkg = row.original as UIPackaging
                        const usageType = pkg.sales && pkg.purchase ? "both" : pkg.sales ? "sales" : pkg.purchase ? "purchase" : "none"
                        const label = usageType === "both" ? t("Sales & Purchase") : usageType === "sales" ? t("Sales") : usageType === "purchase" ? t("Purchase") : t("None")
                        return (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.25rem 0.75rem",
                              borderRadius: "999px",
                              background: usageType === "both" ? "rgba(79, 172, 254, 0.1)" : usageType === "sales" ? "rgba(240, 147, 251, 0.1)" : usageType === "purchase" ? "rgba(67, 233, 123, 0.1)" : colors.mutedBg,
                              color: usageType === "both" ? "#4facfe" : usageType === "sales" ? "#f093fb" : usageType === "purchase" ? "#43e97b" : colors.textSecondary,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {label}
                          </span>
                        )
                      },
                    },
                    {
                      id: "barcode",
                      header: t("Barcode"),
                      cell: ({ row }) => {
                        const pkg = row.original as UIPackaging
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                            {pkg.barcode || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "routesLabel",
                      header: t("Routes"),
                      cell: ({ row }) => {
                        const pkg = row.original as UIPackaging
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {pkg.routesLabel || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "companyName",
                      header: t("Company"),
                      cell: ({ row }) => {
                        const pkg = row.original as UIPackaging
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {pkg.companyName || "—"}
                          </span>
                        )
                      },
                    },
                  ]}
                  visibleColumns={visibleColumns}
                  onVisibleColumnsChange={setVisibleColumns}
                  actions={(packaging) => [
                    ...(canEditPage("product-packagings") ? [{
                      key: "edit",
                      label: t("Edit"),
                      icon: Edit,
                      onClick: () => handleEditPackaging(packaging),
                    }] : []),
                  ]}
                  isRTL={isRTL}
                  getRowIcon={(pkg: UIPackaging) => {
                    const isSales = pkg.sales === true
                    const isPurchase = pkg.purchase === true
                    if (isSales && isPurchase) {
                      return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                    } else if (isSales) {
                      return { icon: ShoppingBag, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }
                    } else if (isPurchase) {
                      return { icon: ShoppingCart, gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" }
                    } else {
                      return { icon: Package, gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }
                    }
                  }}
                />
          )}

          {filteredPackagings.length === 0 && !loading?.productPackaging && (
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
                    {t("No packagings found")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
            </div>
          )}

          {filteredPackagings.length > 0 && (
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

      {/* Modal */}
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
          onClick={() => setIsModalOpen(false)}
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
            {/* Modal Header */}
            <div
              style={{
                padding: "1rem 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#000", margin: 0 }}>
                  {editingPackaging ? t("Edit Product Packaging") : t("Add Product Packaging")}
                </h2>
                <p style={{ fontSize: 13, color: "#000", margin: "0.25rem 0 0 0" }}>
                  {formData.name || t("New packaging")}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "8px",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = colors.background)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <X size={24} color={colors.textPrimary} />
              </button>
            </div>

            {/* Modal Content */}
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
                  <div>
                    <CustomInput
                      label={t("Packaging Name")}
                      type="text"
                      value={formData.name}
                      onChange={(v) => setFormData({ ...formData, name: v })}
                      placeholder={t("e.g. Box of 12")}
                    />
                  </div>
                  <div>
                    <NewCustomDropdown
                      label={t("Product")}
                      values={(Array.isArray(products) ? products : []).map((p: any) => p.display_name || p.name || String(p.id))}
                      type="single"
                      placeholder={t("Select product")}
                      defaultValue={
                        formData.product_id
                          ? (() => {
                              const p = (Array.isArray(products) ? products : []).find((p: any) => String(p.id) === String(formData.product_id))
                              return p?.display_name || p?.name || String(p?.id)
                            })()
                          : undefined
                      }
                      onChange={(v) => {
                        const selectedProduct = (Array.isArray(products) ? products : []).find(
                          (p: any) => (p.display_name || p.name || String(p.id)) === v
                        )
                        setFormData({ ...formData, product_id: selectedProduct ? String(selectedProduct.id) : "" })
                      }}
                    />
                  </div>
                  <div>
                    <NewCustomDropdown
                      label={t("Package Type")}
                      values={(Array.isArray(packageTypes) ? packageTypes : []).map((pt: any) => pt.display_name || pt.name || String(pt.id))}
                      type="single"
                      placeholder={t("Select package type")}
                      defaultValue={
                        formData.package_type_id
                          ? (() => {
                              const pt = (Array.isArray(packageTypes) ? packageTypes : []).find((pt: any) => String(pt.id) === String(formData.package_type_id))
                              return pt?.display_name || pt?.name || String(pt?.id)
                            })()
                          : undefined
                      }
                      onChange={(v) => {
                        const selectedType = (Array.isArray(packageTypes) ? packageTypes : []).find(
                          (pt: any) => (pt.display_name || pt.name || String(pt.id)) === v
                        )
                        setFormData({ ...formData, package_type_id: selectedType ? String(selectedType.id) : "" })
                      }}
                    />
                  </div>
                  <div>
                    <CustomInput
                      label={t("Contained Quantity")}
                      type="number"
                      value={String(formData.qty || "")}
                      onChange={(v) => setFormData({ ...formData, qty: v.replace(/[^0-9.]/g, "") })}
                      placeholder={t("Enter quantity")}
                    />
                  </div>
                  <div>
                    <CustomInput
                      label={t("Barcode")}
                      type="text"
                      value={formData.barcode}
                      onChange={(v) => setFormData({ ...formData, barcode: v })}
                      placeholder={t("Enter barcode")}
                    />
                  </div>
                  <div>
                    <NewCustomDropdown
                      label={t("Routes")}
                      values={(Array.isArray(stockRoutes) ? stockRoutes : []).map((rt: any) => rt.display_name || rt.name || String(rt.id))}
                      type="multi"
                      placeholder={t("Select routes")}
                      defaultValue={(formData.route_ids || []).map((id: string) => {
                        const rt = (Array.isArray(stockRoutes) ? stockRoutes : []).find((r: any) => String(r.id) === id)
                        return rt?.display_name || rt?.name || String(rt?.id) || ""
                      }).filter(Boolean)}
                      onChange={(selected) => {
                        const selectedIds = (Array.isArray(selected) ? selected : []).map((name: string) => {
                          const rt = (Array.isArray(stockRoutes) ? stockRoutes : []).find((r: any) => (r.display_name || r.name || String(r.id)) === name)
                          return rt ? String(rt.id) : ""
                        }).filter(Boolean)
                        setFormData({ ...formData, route_ids: selectedIds })
                      }}
                    />
                  </div>
                  <div>
                    <IOSCheckbox
                      checked={!!formData.sales}
                      onChange={(checked) => setFormData({ ...formData, sales: checked })}
                      color="blue"
                      label={t("Sales")}
                    />
                  </div>
                  <div>
                    <IOSCheckbox
                      checked={!!formData.purchase}
                      onChange={(checked) => setFormData({ ...formData, purchase: checked })}
                      color="blue"
                      label={t("Purchase")}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                background: colors.card,
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <NewCustomButton
                  label={editingPackaging ? t("Save Changes") : t("Create")}
                  backgroundColor="#25D0FE"
                  onClick={handleSavePackaging}
                />
                <NewCustomButton
                  label={t("Close")}
                  backgroundColor="#FFFFFF"
                  onClick={() => setIsModalOpen(false)}
                />
              </div>
            </div>
          </Card>
        </div>
      )}
      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
    </div>
  )
}

interface PackagingCardProps {
  packaging: UIPackaging
  onClick?: () => void
  index: number
}

function PackagingCard({ packaging, onClick, index }: PackagingCardProps) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const isRTL = i18n?.dir() === "rtl"

  const statusTheme = {
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    label: packaging.sales && packaging.purchase ? t("Sales & Purchase") : packaging.sales ? t("Sales") : packaging.purchase ? t("Purchase") : t("Packaging"),
  }

  return (
    <div
      className="group relative w-full rounded-[24px] p-[2px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
      onClick={onClick}
      style={{
        animationDelay: `${index * 50}ms`,
        background: colors.card,
        cursor: onClick ? 'pointer' : 'default',
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
              <Package className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 pt-1">
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {packaging.name}
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                {packaging.productName}
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
                  {t("Quantity")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{packaging.qty} {packaging.uomName}</p>
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
                  {t("Barcode")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{packaging.barcode || "—"}</p>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between pt-4 border-t"
            style={{ borderColor: colors.border }}
          >
            <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
              <Box className="w-4 h-4" />
              <span className="text-xs font-medium">
                {packaging.packageTypeName || "—"}
              </span>
            </div>

            <button
              onClick={onClick}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium"
              style={{
                background: colors.mutedBg,
                color: colors.textSecondary,
              }}
            >
              {t("View Details")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PackagingCardSkeleton({ colors }: { colors: any }) {
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
            {Array.from({ length: 2 }).map((_, idx) => (
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
