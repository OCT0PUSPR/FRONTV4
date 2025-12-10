"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import { Card, CardContent } from "../@/components/ui/card"
import { MapPin,  Plus, Package, ListChecks, Shuffle, Warehouse, RefreshCcw, Edit, Trash2, X, CheckCircle2 } from "lucide-react"
import { StatCard } from "./components/StatCard"
import { StorageCategoryCard } from "./components/StorageCategoryCard"
import { Input } from "../@/components/ui/input"
import { Button } from "../@/components/ui/button"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Skeleton } from "@mui/material"
import { DataTable, ColumnDef } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import { CustomInput } from "./components/CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./components/NewCustomDropdown"
import { NewCustomButton } from "./components/NewCustomButton"
import Toast from "./components/Toast"
import Alert from "./components/Alert"

export default function StorageCategoriesPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { storageCategories, stockRoutes, packageTypes, products, uom, fetchData, loading } = useData() as any
  const { uid } = useAuth()
  const { canCreatePage, canEditPage, canExportPage, canDeletePage } = useCasl()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [policyFilter, setPolicyFilter] = useState<string[]>([]) // Policy filter (mixed, same, empty)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isSelectAll, setIsSelectAll] = useState<boolean | "indeterminate">(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null)
  
  // Column visibility state - default: 6 most important columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "allow_new_product",
    "max_weight",
    "package_capacity_count",
    "product_capacity_count",
  ])

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
    if (!Array.isArray(storageCategories) || !storageCategories.length) fetchData("storageCategories")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Form state
  const [form, setForm] = useState<any>({
    name: "",
    allow_new_product: "mixed" as "empty" | "same" | "mixed",
    max_weight: "" as string | number,
    packageLines: [] as Array<{ tempId: string; package_type_id: string; quantity: string }>,
    productLines: [] as Array<{ tempId: string; product_id: string; product_uom_id: string; quantity: string }>,
  })

  const genId = () => Math.random().toString(36).slice(2, 9)

  const getSessionId = () => localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')

  // Derive UI list with field keys to inspect what's available
  const categories = useMemo(() => {
    const list = Array.isArray(storageCategories) ? storageCategories : []
    return list.map((r: any) => ({
      id: r.id,
      title: r.display_name || r.name || `Category #${r.id}`,
      keys: Object.keys(r || {}).sort(),
      raw: r,
    }))
  }, [storageCategories])

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchesSearch = String(category.title || '').toLowerCase().includes(searchQuery.toLowerCase())
      const policy = String(category.raw?.allow_new_product || '')
      const matchesPolicy = policyFilter.length === 0 || policyFilter.includes(policy)
      return matchesSearch && matchesPolicy
    })
  }, [categories, searchQuery, policyFilter])

  // Pagination
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, policyFilter])

  // Helper function to count many2many relationships
  const m2mSummary = (val: any): number => {
    if (Array.isArray(val)) return val.length
    return 0
  }

  // Get unique values for filters
  const uniquePolicies = Array.from(new Set(categories.map((c) => String(c.raw?.allow_new_product || '')).filter(Boolean)))
  
  // Format policy labels for display
  const policyLabels: Record<string, string> = {
    'empty': t('If the location is empty'),
    'same': t('If all products are same'),
    'mixed': t('Allow mixed products'),
  }

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("storage")) {
      return
    }
    // Determine data to export
    let dataToExport = filteredCategories
    if (options.scope === "selected") {
      dataToExport = filteredCategories.filter((c) => rowSelection[String(c.id)])
    } else if (options.scope === "page") {
      dataToExport = paginatedCategories
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
        header: t('Storage Category Name'),
        accessor: (row: any) => row.title || '-',
        isBold: true
      },
      allow_new_product: {
        header: t('Product Policy'),
        accessor: (row: any) => {
          const policy = String(row.raw?.allow_new_product || 'mixed')
          return policyLabels[policy] || policy
        },
        isStatus: true
      },
      max_weight: {
        header: t('Max Weight'),
        accessor: (row: any) => {
          const maxWeight = row.raw?.max_weight ?? null
          return maxWeight ? `${maxWeight} ${row.raw?.weight_uom_name || ''}` : '-'
        }
      },
      locations_count: {
        header: t('Locations'),
        accessor: (row: any) => m2mSummary(row.raw?.location_ids)
      },
      package_capacity_count: {
        header: t('Package Caps'),
        accessor: (row: any) => m2mSummary(row.raw?.package_capacity_ids)
      },
      product_capacity_count: {
        header: t('Product Caps'),
        accessor: (row: any) => m2mSummary(row.raw?.product_capacity_ids)
      },
    }

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Storage Categories Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Mixed Policy'), value: data.filter((c: any) => c.raw?.allow_new_product === 'mixed').length },
        { label: t('Same Policy'), value: data.filter((c: any) => c.raw?.allow_new_product === 'same').length },
        { label: t('Empty Policy'), value: data.filter((c: any) => c.raw?.allow_new_product === 'empty').length }
      ]
    }

    exportData(options, dataToExport, config, dateRange)
    setIsExportModalOpen(false)
  }

  // Stats for summary cards
  const totalCategories = categories.length
  const totalLocations = useMemo(() => categories.reduce((sum, c) => sum + (Array.isArray(c.raw?.location_ids) ? c.raw.location_ids.length : 0), 0), [categories]);
  const totalCapacityRules = useMemo(() => categories.reduce((sum, c) => sum + (Array.isArray(c.raw?.package_capacity_ids) ? c.raw.package_capacity_ids.length : 0) + (Array.isArray(c.raw?.product_capacity_ids) ? c.raw.product_capacity_ids.length : 0), 0), [categories]);
  const mixedPolicyCount = useMemo(() => categories.filter(c => c.raw?.allow_new_product === 'mixed').length, [categories]);


  const openModal = (category: any = null) => {
    // Check edit permission before opening modal
    if (!canEditPage("storage")) {
      return
    }
    if (category) {
      const categoryId = category?.id || (category?.raw?.id)
      navigate(`/storage/edit/${categoryId}`)
    } else {
      navigate('/storage/create')
    }
  }

  const handleNewStorageCategory = () => {
    if (canCreatePage("storage")) {
      navigate('/storage/create')
    }
  }

  const closeModal = () => {
    if (!dirty || window.confirm(t("Discard unsaved changes?"))) {
    setIsModalOpen(false)
    setSelectedCategory(null)
      setForm({ name: "", allow_new_product: "mixed", max_weight: "", route_id: null, packageLines: [], productLines: [] })
      setDirty(false)
    }
  }

  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem("odooBase") || "https://egy.thetalenter.net"
    const db = localStorage.getItem("odooDb") || "odoodb1"
    const headers: Record<string, string> = {}
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

  const handleDeleteClick = (categoryId: number) => {
    setCategoryToDelete(categoryId)
    setDeleteAlertOpen(true)
  }

  const deleteCategoryAction = async () => {
    if (!categoryToDelete) return
    const sessionId = getSessionId()
    if (!sessionId) {
      setToast({ text: t("No session ID found"), state: "error" })
      setDeleteAlertOpen(false)
      setCategoryToDelete(null)
      return
    }
    try {
      const userId = uid ? Number(uid) : undefined
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/storage-categories/${categoryToDelete}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getOdooHeaders() },
        body: JSON.stringify({ sessionId, userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || t("Delete failed"))
      setToast({ text: t("Storage category deleted successfully"), state: "success" })
      setDeleteAlertOpen(false)
      setCategoryToDelete(null)
      // Refresh categories
      await fetchData("storageCategories")
      // Close modal if the deleted category was being edited
      if (isModalOpen && selectedCategory?.id === categoryToDelete) {
        setIsModalOpen(false)
        setSelectedCategory(null)
      }
    } catch (error: any) {
      console.error("Delete failed:", error)
      setToast({ text: error?.message || t("Failed to delete storage category"), state: "error" })
      setDeleteAlertOpen(false)
      setCategoryToDelete(null)
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
                {t("Storage Categories")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Organize and manage warehouse storage capacities")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchData("storageCategories")}
                disabled={!!loading?.storageCategories}
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
                <RefreshCcw className={`w-4 h-4 ${loading?.storageCategories ? "animate-spin" : ""}`} />
                {loading?.storageCategories ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("storage") && (
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
                  onClick={handleNewStorageCategory}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("Add Storage Category")}
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
              label={t("Total Categories")}
              value={totalCategories}
              icon={Warehouse}
              gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
              delay={0}
            />
            <StatCard
              label={t("Total Locations Managed")}
              value={totalLocations}
              icon={MapPin}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              delay={1}
            />
            <StatCard
              label={t("Total Capacity Rules")}
              value={totalCapacityRules}
              icon={ListChecks}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Mixed Product Policies")}
              value={mixedPolicyCount}
              icon={Shuffle}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search categories...")}
            statusFilter={policyFilter}
            onStatusChange={setPolicyFilter}
            statusOptions={uniquePolicies}
            statusPlaceholder={t("Product Policy")}
            statusLabelMap={policyLabels}
            toFilter={[]}
            onToChange={() => {}}
            toOptions={[]}
            toPlaceholder=""
            fromFilter={[]}
            onFromChange={() => {}}
            fromOptions={[]}
            fromPlaceholder=""
            isMobile={isMobile}
            showDateRange={false}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {loading?.storageCategories ? (
            viewMode === "cards" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                gap: "1.25rem",
              }}
            >
              {Array.from({ length: itemsPerPage }).map((_, idx) => (
                <StorageCategoryCardSkeleton key={idx} colors={colors} />
              ))}
            </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderRadius: "0.5rem",
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      padding: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <Skeleton variant="rectangular" width={16} height={16} sx={{ borderRadius: "4px", bgcolor: colors.mutedBg }} />
                      <Skeleton variant="text" width={60} height={20} sx={{ bgcolor: colors.mutedBg }} />
                      <Skeleton variant="text" width={150} height={20} sx={{ bgcolor: colors.mutedBg }} />
                      <Skeleton variant="text" width={100} height={20} sx={{ bgcolor: colors.mutedBg }} />
                      <Skeleton variant="text" width={80} height={20} sx={{ bgcolor: colors.mutedBg }} />
                      <div style={{ marginLeft: "auto" }}>
                        <Skeleton variant="rectangular" width={32} height={32} sx={{ borderRadius: "4px", bgcolor: colors.mutedBg }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <>
              {viewMode === "cards" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {paginatedCategories.map((category, index) => (
                  <StorageCategoryCard
                    key={category.id}
                    category={category}
                    index={index}
                    onClick={canEditPage("storage") ? () => {
                      const categoryId = category?.id || (category?.raw?.id)
                      navigate(`/storage/edit/${categoryId}`)
                    } : undefined}
                  />
                ))}
              </div>
              ) : (
                <DataTable
                  data={paginatedCategories}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                  onSelectAllChange={setIsSelectAll}
                  onExport={canExportPage("storage") ? () => setIsExportModalOpen(true) : undefined}
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
                      header: t("Storage Category Name"),
                      cell: ({ row }) => {
                        const category = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.9375rem", fontWeight: 600 }}>
                            {category.title || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "allow_new_product",
                      header: t("Product Policy"),
                      cell: ({ row }) => {
                        const category = row.original as any
                        const policy = String(category.raw?.allow_new_product || "mixed")
                        const policyLabel = policyLabels[policy] || policy
                        return (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.25rem 0.75rem",
                              borderRadius: "999px",
                              background: policy === "mixed" ? "rgba(79, 172, 254, 0.1)" : policy === "same" ? "rgba(67, 233, 123, 0.1)" : "rgba(240, 147, 251, 0.1)",
                              color: policy === "mixed" ? "#4facfe" : policy === "same" ? "#43e97b" : "#f093fb",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {policyLabel}
                          </span>
                        )
                      },
                    },
                    {
                      id: "max_weight",
                      header: t("Max Weight"),
                      cell: ({ row }) => {
                        const category = row.original as any
                        const maxWeight = category.raw?.max_weight ?? null
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {maxWeight ? `${maxWeight} ${category.raw?.weight_uom_name || ""}` : "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "locations_count",
                      header: t("Locations"),
                      cell: ({ row }) => {
                        const category = row.original as any
                        const locationsCount = m2mSummary(category.raw?.location_ids)
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                            {locationsCount}
                          </span>
                        )
                      },
                    },
                    {
                      id: "package_capacity_count",
                      header: t("Package Caps"),
                      cell: ({ row }) => {
                        const category = row.original as any
                        const packageCapsCount = m2mSummary(category.raw?.package_capacity_ids)
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                            {packageCapsCount}
                          </span>
                        )
                      },
                    },
                    {
                      id: "product_capacity_count",
                      header: t("Product Caps"),
                      cell: ({ row }) => {
                        const category = row.original as any
                        const productCapsCount = m2mSummary(category.raw?.product_capacity_ids)
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                            {productCapsCount}
                          </span>
                        )
                      },
                    },
                  ]}
                  visibleColumns={visibleColumns}
                  onVisibleColumnsChange={setVisibleColumns}
                  actions={(category) => [
                    ...(canEditPage("storage") ? [{
                      key: "edit",
                      label: t("Edit"),
                      icon: Edit,
                      onClick: () => {
                        const categoryId = (category as any).id
                        navigate(`/storage/edit/${categoryId}`)
                      },
                    }] : []),
                    ...(canDeletePage("storage") ? [{
                      key: "delete",
                      label: t("Delete"),
                      icon: Trash2,
                      onClick: () => handleDeleteClick((category as any).id),
                      danger: true,
                    }] : []),
                  ]}
                  isRTL={isRTL}
                  getRowIcon={(category: any) => {
                    const policy = String(category.raw?.allow_new_product || "mixed")
                    if (policy === "same") {
                      return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                    } else if (policy === "mixed") {
                      return { icon: Warehouse, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }
                    }
                    return { icon: Warehouse, gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }
                  }}
                />
              )}

              {filteredCategories.length === 0 && !loading?.storageCategories && (
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
                    {t("No categories found")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                </div>
              )}

              {filteredCategories.length > 0 && (
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
                        currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"
                      }`}
                      style={{
                        borderColor: colors.border,
                        background: currentPage === 1 ? colors.mutedBg : colors.card,
                        color: colors.textPrimary,
                      }}
                    >
                      {t("Previous")}
                    </button>
                    <span className="text-sm font-medium px-3" style={{ color: colors.textSecondary }}>
                      {t("Page")} {currentPage} {t("of")} {totalPages}
                    </span>
                    <button
                      onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1.5 text-sm font-medium border rounded-md transition-all ${
                        currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"
                      }`}
                      style={{
                        borderColor: colors.border,
                        background: currentPage === totalPages ? colors.mutedBg : colors.card,
                        color: colors.textPrimary,
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


      {/* Edit/Add Modal */}
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
              closeModal()
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
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#000" }}>
                {selectedCategory ? t("Edit Storage Category") : t("New Storage Category")}
              </h2>
                <p style={{ fontSize: 13, color: "#000" }}>
                  {t("Configure storage category and capacity rules")}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!dirty || window.confirm(t("Discard unsaved changes?"))) {
                    closeModal()
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                <div>
                    <CustomInput
                      label={t("Storage Category Name")}
                      type="text"
                      value={form.name || ""}
                      onChange={(v) => {
                        setForm((f: any) => ({ ...f, name: v }))
                        setDirty(true)
                      }}
                      placeholder={t("Enter category name")}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      {(() => {
                        const policyOptions = [
                          { value: "empty", label: t("If the location is empty") },
                          { value: "same", label: t("If all products are same") },
                          { value: "mixed", label: t("Allow mixed products") },
                        ]
                        const currentValue = form.allow_new_product || "mixed"
                        const currentLabel = policyOptions.find(o => o.value === currentValue)?.label || policyOptions[0].label
                        return (
                          <NewCustomDropdown
                            label={t("Allow New Product")}
                            values={policyOptions.map(o => o.label)}
                            type="single"
                            defaultValue={currentLabel}
                            onChange={(val) => {
                              const selected = policyOptions.find(o => o.label === val)
                              setForm((f: any) => ({ ...f, allow_new_product: selected?.value || "mixed" }))
                              setDirty(true)
                            }}
                            placeholder={t("Select policy")}
                          />
                        )
                      })()}
                    </div>
                    <div>
                      <CustomInput
                        label={t("Max Weight")}
                    type="number"
                        value={String(form.max_weight || "")}
                        onChange={(v) => {
                          setForm((f: any) => ({ ...f, max_weight: v }))
                          setDirty(true)
                        }}
                        placeholder="0.00"
                  />
                </div>
              </div>
                  <div>
                    {(() => {
                      const routeOptions: { id: number; label: string }[] = (stockRoutes || []).map((r: any) => ({
                        id: r.id as number,
                        label: r.display_name || r.name || `Route #${r.id}`,
                      }))
                      const currentRouteId = Array.isArray(selectedCategory?.route_id) ? selectedCategory.route_id[0] : (selectedCategory?.route_id || null)
                      const currentLabel = routeOptions.find(o => o.id === currentRouteId)?.label || ""
                      return (
                        <NewCustomDropdown
                          label={t("Routes")}
                          values={[t("Select"), ...routeOptions.map(o => o.label)]}
                          type="single"
                          defaultValue={currentLabel || t("Select")}
                          onChange={(val) => {
                            if (val === t("Select")) {
                              setForm((f: any) => ({ ...f, route_id: null }))
                              setDirty(true)
                              return
                            }
                            const sel = routeOptions.find(o => o.label === val)
                            setForm((f: any) => ({ ...f, route_id: sel ? sel.id : null }))
                            setDirty(true)
                          }}
                          placeholder={t("Select route")}
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
                      background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
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
                    {t("Operations")}
                  </h3>
                </div>
                
              {/* Capacity by Package Section */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      width: "4px",
                      height: "16px",
                      background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                      borderRadius: "2px",
                    }}
                  />
                  <h4
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      margin: 0,
                    }}
                  >
                    {t("Capacity by Package")}
                  </h4>
                </div>
                <div
                  style={{
                    background: colors.background,
                    padding: "1rem",
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                  }}
                >

                  {/* Read-only table for completed lines */}
                  <div style={{ overflowX: "auto", marginBottom: "0.75rem" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr
                          style={{
                            textAlign: "left",
                            color: colors.textSecondary,
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Package Type")}</th>
                          <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Quantity")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const completedLines = form.packageLines.filter((line: any) => line.package_type_id && line.quantity)
                          if (completedLines.length === 0) {
                            return (
                              <tr>
                                <td
                                  colSpan={2}
                                  style={{ padding: ".75rem", color: colors.textSecondary, textAlign: "center", fontSize: 13 }}
                                >
                                  {t("No capacity rules added.")}
                                </td>
                              </tr>
                            )
                          }
                          return completedLines.map((line: any) => {
                            const pkgType = (Array.isArray(packageTypes) ? packageTypes : []).find((pt: any) => String(pt.id) === line.package_type_id)
                            return (
                              <tr key={line.tempId} style={{ borderTop: `1px solid ${colors.border}` }}>
                                <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                                  {pkgType?.name || pkgType?.display_name || "—"}
                                </td>
                                <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                                  {line.quantity || "—"}
                                </td>
                              </tr>
                            )
                          })
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Line Button */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <NewCustomButton
                      label={t("Add Line")}
                      backgroundColor="#FFFFFF"
                      icon={Plus}
                      onClick={() => {
                        setForm((f: any) => ({ ...f, packageLines: [...f.packageLines, { tempId: genId(), package_type_id: '', quantity: '' }] }))
                        setDirty(true)
                      }}
                    />
                  </div>

                  {/* Add Line Form (appears when adding incomplete lines) */}
                  {(() => {
                    const incompleteLines = form.packageLines.filter((line: any) => !line.package_type_id || !line.quantity)
                    if (incompleteLines.length === 0) return null
                    return (
                      <div style={{ marginTop: "1rem", padding: "1rem", background: colors.mutedBg, borderRadius: 8, border: `1px solid ${colors.border}` }}>
                        {incompleteLines.map((line: any) => (
                          <div key={line.tempId} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
                            <div>
                              {(() => {
                                const pkgOptions: { id: number; label: string }[] = (packageTypes || []).map((pt: any) => ({
                                  id: pt.id as number,
                                  label: pt.name || pt.display_name || `#${pt.id}`,
                                }))
                                const currentLabel = pkgOptions.find(o => String(o.id) === line.package_type_id)?.label || ""
                                return (
                                  <NewCustomDropdown
                                    label={t("Package Type")}
                                    values={[t("Select"), ...pkgOptions.map(o => o.label)]}
                                    type="single"
                                    defaultValue={currentLabel || t("Select")}
                                    onChange={(val) => {
                                      if (val === t("Select")) {
                                        setForm((f: any) => ({ ...f, packageLines: f.packageLines.map((l: any) => l.tempId === line.tempId ? { ...l, package_type_id: '' } : l) }))
                                        setDirty(true)
                                        return
                                      }
                                      const sel = pkgOptions.find(o => o.label === val)
                                      setForm((f: any) => ({ ...f, packageLines: f.packageLines.map((l: any) => l.tempId === line.tempId ? { ...l, package_type_id: sel ? String(sel.id) : '' } : l) }))
                                      setDirty(true)
                                    }}
                                    placeholder={t("Select type")}
                                  />
                                )
                              })()}
                </div>
                            <div>
                              <CustomInput
                                label={t("Quantity")}
                          type="number"
                                value={line.quantity || ""}
                                onChange={(v) => {
                                  setForm((f: any) => ({ ...f, packageLines: f.packageLines.map((l: any) => l.tempId === line.tempId ? { ...l, quantity: v } : l) }))
                                  setDirty(true)
                                }}
                                placeholder="0"
                              />
                      </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <NewCustomButton
                                label={t("Confirm")}
                                backgroundColor="#25D0FE"
                      onClick={() => {
                                  // Line is already in the list, just need to ensure it's saved
                                  setDirty(true)
                                }}
                              />
                              <NewCustomButton
                                label={t("Cancel")}
                                backgroundColor="#FFFFFF"
                                onClick={() => {
                                  setForm((f: any) => ({ ...f, packageLines: f.packageLines.filter((l: any) => l.tempId !== line.tempId) }))
                                  setDirty(true)
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Capacity by Product Section */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      width: "4px",
                      height: "16px",
                      background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                      borderRadius: "2px",
                    }}
                  />
                  <h4
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textPrimary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      margin: 0,
                    }}
                  >
                    {t("Capacity by Product")}
                  </h4>
                </div>
                <div
                  style={{
                    background: colors.background,
                    padding: "1rem",
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {/* Read-only table for completed lines */}
                  <div style={{ overflowX: "auto", marginBottom: "0.75rem" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr
                          style={{
                            textAlign: "left",
                            color: colors.textSecondary,
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Product")}</th>
                          <th style={{ padding: ".5rem", fontWeight: 600 }}>{t('Unit of measure')}</th>
                          <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Quantity")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const completedLines = form.productLines.filter((line: any) => line.product_id && line.quantity)
                          if (completedLines.length === 0) {
                            return (
                              <tr>
                                <td
                                  colSpan={3}
                                  style={{ padding: ".75rem", color: colors.textSecondary, textAlign: "center", fontSize: 13 }}
                                >
                                  {t("No capacity rules added.")}
                                </td>
                              </tr>
                            )
                          }
                          return completedLines.map((line: any) => {
                            const prod = (Array.isArray(products) ? products : []).find((p: any) => String(Array.isArray(p.id) ? p.id[0] : p.id) === line.product_id)
                            const uomId = Array.isArray(prod?.uom_id) ? String(prod.uom_id[0]) : (prod?.uom_id ? String(prod.uom_id) : '')
                            const uomName = Array.isArray(prod?.uom_id) ? (prod.uom_id[1] || '') : ((Array.isArray(uom) ? uom : []).find((u: any) => String(u.id) === uomId)?.name || '')
                            return (
                              <tr key={line.tempId} style={{ borderTop: `1px solid ${colors.border}` }}>
                                <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                                  {prod?.display_name || prod?.name || "—"}
                                </td>
                                <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                                  {uomName || "—"}
                                </td>
                                <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                                  {line.quantity || "—"}
                                </td>
                              </tr>
                            )
                          })
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Line Button */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <NewCustomButton
                      label={t("Add Line")}
                      backgroundColor="#FFFFFF"
                      icon={Plus}
                      onClick={() => {
                        setForm((f: any) => ({ ...f, productLines: [...f.productLines, { tempId: genId(), product_id: '', product_uom_id: '', quantity: '' }] }))
                        setDirty(true)
                      }}
                    />
                  </div>

                  {/* Add Line Form (appears when adding incomplete lines) */}
                  {(() => {
                    const incompleteLines = form.productLines.filter((line: any) => !line.product_id || !line.quantity)
                    if (incompleteLines.length === 0) return null
                    return (
                      <div style={{ marginTop: "1rem", padding: "1rem", background: colors.mutedBg, borderRadius: 8, border: `1px solid ${colors.border}` }}>
                        {incompleteLines.map((line: any) => (
                          <div key={line.tempId} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
                            <div>
                              {(() => {
                                const prodOptions: { id: number; label: string }[] = (products || []).map((p: any) => ({
                                  id: Array.isArray(p.id) ? p.id[0] : p.id as number,
                                  label: p.display_name || p.name || `#${Array.isArray(p.id) ? p.id[0] : p.id}`,
                                }))
                                const currentLabel = prodOptions.find(o => String(o.id) === line.product_id)?.label || ""
                                return (
                                  <NewCustomDropdown
                                    label={t("Product")}
                                    values={[t("Select"), ...prodOptions.map(o => o.label)]}
                                    type="single"
                                    defaultValue={currentLabel || t("Select")}
                                    onChange={(val) => {
                                      if (val === t("Select")) {
                                        setForm((f: any) => ({ ...f, productLines: f.productLines.map((l: any) => l.tempId === line.tempId ? { ...l, product_id: '', product_uom_id: '' } : l) }))
                                        setDirty(true)
                                        return
                                      }
                                      const sel = prodOptions.find(o => o.label === val)
                                      const prod = (products || []).find((p: any) => {
                                        const pId = Array.isArray(p.id) ? p.id[0] : p.id
                                        return String(pId) === String(sel?.id)
                                      })
                                      const uomId = Array.isArray(prod?.uom_id) ? String(prod.uom_id[0]) : (prod?.uom_id ? String(prod.uom_id) : '')
                                      setForm((f: any) => ({ ...f, productLines: f.productLines.map((l: any) => l.tempId === line.tempId ? { ...l, product_id: sel ? String(sel.id) : '', product_uom_id: uomId } : l) }))
                                      setDirty(true)
                                    }}
                                    placeholder={t("Select product")}
                                  />
                                )
                              })()}
                            </div>
                            <div>
                              {(() => {
                                const prod = (products || []).find((p: any) => {
                                  const pId = Array.isArray(p.id) ? p.id[0] : p.id
                                  return String(pId) === line.product_id
                                })
                                const uomId = Array.isArray(prod?.uom_id) ? String(prod.uom_id[0]) : (prod?.uom_id ? String(prod.uom_id) : '')
                                const uomName = Array.isArray(prod?.uom_id) ? (prod.uom_id[1] || '') : ((Array.isArray(uom) ? uom : []).find((u: any) => String(u.id) === uomId)?.name || '')
                                return (
                                  <CustomInput
                                    label={t("Unit of measure")}
                                    type="text"
                                    value={uomName || ""}
                                    onChange={() => {}}
                                    placeholder="—"
                                    disabled
                                  />
                                )
                              })()}
                            </div>
                            <div>
                              <CustomInput
                                label={t("Quantity")}
                                type="number"
                                value={line.quantity || ""}
                                onChange={(v) => {
                                  setForm((f: any) => ({ ...f, productLines: f.productLines.map((l: any) => l.tempId === line.tempId ? { ...l, quantity: v } : l) }))
                                  setDirty(true)
                                }}
                                placeholder="0"
                              />
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <NewCustomButton
                                label={t("Confirm")}
                                backgroundColor="#25D0FE"
                                onClick={() => {
                                  setDirty(true)
                                }}
                              />
                              <NewCustomButton
                                label={t("Cancel")}
                                backgroundColor="#FFFFFF"
                                onClick={() => {
                                  setForm((f: any) => ({ ...f, productLines: f.productLines.filter((l: any) => l.tempId !== line.tempId) }))
                                  setDirty(true)
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
              </div>
            </div>

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
                    label={saving ? t("Saving...") : (selectedCategory ? t("Save Changes") : t("Create Category"))}
                    backgroundColor="#25D0FE"
                onClick={async () => {
                  try {
                    setSaving(true)
                    const sessionId = getSessionId()
                        if (!sessionId) {
                          setToast({ text: t("No session ID found"), state: "error" })
                          setTimeout(() => setToast(null), 3000)
                          return
                        }
                    const values: any = {
                      name: form.name,
                      allow_new_product: form.allow_new_product,
                    }
                    if (form.max_weight !== '' && !Number.isNaN(Number(form.max_weight))) values.max_weight = Number(form.max_weight)
                        if (form.route_id) values.route_id = form.route_id
                    const pkgCmds = (form.packageLines || []).filter((l: any) => l.package_type_id && l.quantity !== '').map((l: any) => [0, 0, { package_type_id: Number(l.package_type_id), quantity: Number(l.quantity) }])
                    if (pkgCmds.length) values.package_capacity_ids = pkgCmds
                    const prodCmds = (form.productLines || []).filter((l: any) => l.product_id && l.quantity !== '').map((l: any) => [0, 0, { product_id: Number(l.product_id), product_uom_id: l.product_uom_id ? Number(l.product_uom_id) : undefined, quantity: Number(l.quantity) }])
                    if (prodCmds.length) values.product_capacity_ids = prodCmds

                    const userId = uid ? Number(uid) : undefined
                    let ok = false
                    if (selectedCategory?.id) {
                      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/storage-categories/${selectedCategory.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, values, userId }) })
                      const j = await res.json().catch(() => ({}))
                      ok = res.ok && j?.success
                    } else {
                      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/storage-categories/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, values, userId }) })
                      const j = await res.json().catch(() => ({}))
                      ok = res.ok && (j?.success || j?.id)
                    }
                    if (ok) {
                      await fetchData('storageCategories')
                          setDirty(false)
                          setToast({ text: selectedCategory ? t("Storage category updated successfully") : t("Storage category created successfully"), state: "success" })
                          setTimeout(() => {
                      closeModal()
                            setToast(null)
                          }, 1200)
                        } else {
                          setToast({ text: selectedCategory ? t("Failed to update storage category") : t("Failed to create storage category"), state: "error" })
                          setTimeout(() => setToast(null), 3000)
                    }
                      } catch (e: any) {
                    console.error('Save storage category failed', e)
                        setToast({ text: e?.message || t("Unknown error occurred"), state: "error" })
                        setTimeout(() => setToast(null), 3000)
                  } finally {
                    setSaving(false)
                  }
                }}
                    disabled={saving}
                  />
                )}
                {selectedCategory && canDeletePage("storage") && (
                  <NewCustomButton
                    label={t("Delete")}
                    backgroundColor="#FFFFFF"
                    icon={Trash2}
                    onClick={() => handleDeleteClick(selectedCategory.id)}
                  />
                )}
                <NewCustomButton
                  label={t("Close")}
                  backgroundColor="#FFFFFF"
                  onClick={() => {
                    if (!dirty || window.confirm(t("Discard unsaved changes?"))) {
                      closeModal()
                    }
                  }}
                />
            </div>
          </div>
          </Card>
          {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
        </div>
      )}

      <Alert
        isOpen={deleteAlertOpen}
        type="delete"
        title={t("Delete this record?")}
        message={t("This record will be permanently deleted and cannot be recovered.")}
        onClose={() => {
          setDeleteAlertOpen(false)
          setCategoryToDelete(null)
        }}
        onConfirm={deleteCategoryAction}
        confirmLabel={t("Delete")}
        cancelLabel={t("Cancel")}
      />
    </div>
  )
}

// Skeleton component matching MoveCard structure
function StorageCategoryCardSkeleton({ colors }: { colors?: any }) {
  if (!colors) return null
  
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
        {/* Policy Tab (Top Right) */}
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
              {/* Reference */}
              <Skeleton
                variant="text"
                width="30%"
                height={14}
                sx={{
                  marginBottom: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              {/* Category name */}
              <Skeleton
                variant="text"
                width="60%"
                height={24}
                sx={{
                  marginBottom: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
            </div>
          </div>

          {/* Details Visualization */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0" }}>
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
        </div>
      </div>

      {canExportPage("storage") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={filteredCategories.length}
          selectedCount={Object.keys(rowSelection).length}
          isSelectAll={isSelectAll === true}
        />
      )}
    </div>
  )
}
