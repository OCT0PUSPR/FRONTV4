"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/theme"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import { Plus, FolderTree, ChevronRight, X, RefreshCcw } from "lucide-react"
import { StatCard } from "./components/StatCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Button } from "../@/components/ui/button"
import { Skeleton } from "@mui/material"
import Toast from "./components/Toast"
import Alert from "./components/Alert"
import { DataTable, ColumnDef } from "./components/DataTable"
import { Edit, Trash2, Package, Layers } from "lucide-react"
import { useSmartFieldRecords } from "./hooks/useSmartFieldRecords"
import { generateColumnsFromFields } from "./utils/generateColumnsFromFields"

export default function ProductCategoriesPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { sessionId, uid } = useAuth()
  const { canCreatePage, canEditPage, canDeletePage } = useCasl()
  const navigate = useNavigate()
  
  // Fetch records using SmartFieldSelector
  const { records: smartFieldRecords, fields: smartFields, columns: availableColumns, loading: smartFieldLoading, refetch: refetchSmartFields } = useSmartFieldRecords({
    modelName: 'product.category',
    enabled: !!sessionId,
  })
  
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [toFilter, setToFilter] = useState<string[]>([])
  const [fromFilter, setFromFilter] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null)
  
  // Column visibility state - initialize with first 6 available columns or defaults
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  
  // Update visible columns when available columns change
  useEffect(() => {
    if (availableColumns.length > 0 && visibleColumns.length === 0) {
      // Set default visible columns with proper ordering:
      // 1. id first
      // 2. display_name or name second
      // 3. Other columns in between
      const defaultCols: string[] = []
      
      // 1. Add id first if available
      if (availableColumns.some(col => col.id === 'id')) {
        defaultCols.push('id')
      }
      
      // 2. Add display_name or name second (in priority order)
      const nameFields = ['display_name', 'name', 'complete_name']
      for (const field of nameFields) {
        if (availableColumns.some(col => col.id === field) && !defaultCols.includes(field)) {
          defaultCols.push(field)
          break // Only add the first available one
        }
      }
      
      // 3. Add other columns up to 6 total
      availableColumns.forEach(col => {
        if (!defaultCols.includes(col.id) && defaultCols.length < 6) {
          defaultCols.push(col.id)
        }
      })
      
      setVisibleColumns(defaultCols)
    }
  }, [availableColumns, visibleColumns.length])

  const handleCategoryClick = (category: any) => {
    // Check edit permission before navigating
    if (!canEditPage("categories")) {
      return
    }
    const categoryId = category.id
    navigate(`/categories/edit/${categoryId}`)
  }

  const handleAddCategory = () => {
    navigate('/categories/create')
  }

  const handleDeleteClick = (categoryId: number) => {
    setCategoryToDelete(categoryId)
    setDeleteAlertOpen(true)
  }

  const handleDeleteCategory = async () => {
    if (!sessionId || !categoryToDelete) return

    try {
      const base = API_CONFIG.BACKEND_BASE_URL
      const resp = await fetch(`${base}/categories/${categoryToDelete}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      const data = await resp.json().catch(() => ({}))
      if (resp.ok && data?.success) {
        setToast({ text: t("Category deleted successfully"), state: "success" })
        setTimeout(() => setToast(null), 3000)
        setDeleteAlertOpen(false)
        setCategoryToDelete(null)
        await refetchSmartFields()
      } else {
        setToast({ text: data?.message || t("Failed to delete category"), state: "error" })
        setTimeout(() => setToast(null), 3000)
        setDeleteAlertOpen(false)
        setCategoryToDelete(null)
      }
    } catch (e: any) {
      console.error("Delete category failed", e)
      setToast({ text: e?.message || t("An error occurred"), state: "error" })
      setTimeout(() => setToast(null), 3000)
      setDeleteAlertOpen(false)
      setCategoryToDelete(null)
    }
  }

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Use records from SmartFieldSelector
  const categories = useMemo(() => smartFieldRecords, [smartFieldRecords])
  
  // Generate columns from SmartFieldSelector fields
  const tableColumns = useMemo(() => {
    if (smartFields.length === 0) {
      // Fallback columns if no fields available
      return [
        {
          id: "id",
          header: t("ID"),
          cell: ({ row }: any) => (
            <span style={{ color: colors.textSecondary, fontSize: "0.875rem", fontFamily: "monospace" }}>
              #{row.original.id}
            </span>
          ),
        },
        {
          id: "name",
          header: t("Name"),
          cell: ({ row }: any) => (
            <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 600 }}>
              {(row.original as any).name || "—"}
            </span>
          ),
        },
      ]
    }
    return generateColumnsFromFields(smartFields, colors, t)
  }, [smartFields, colors, t, i18n?.language || 'en'])

  const totalCategories = (categories || []).length
  const parentCategories = (categories || []).filter((c: any) => {
    const parent = Array.isArray(c.parent_id) ? c.parent_id[0] : c.parent_id
    return !parent
  }).length
  const childCategories = (categories || []).filter((c: any) => {
    const parent = Array.isArray(c.parent_id) ? c.parent_id[0] : c.parent_id
    return !!parent
  }).length

  const filteredCategories = useMemo(() => {
    return (categories || []).filter((c: any) => {
      const matchesSearch = (c.name || c.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())
      const parent = Array.isArray(c.parent_id) ? c.parent_id[1] : null
      const matchesTo = toFilter.length === 0 || (parent && toFilter.includes(parent))
      return matchesSearch && matchesTo
    })
  }, [categories, searchQuery, toFilter])

  // Pagination
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, toFilter])

  const uniqueParents = useMemo(() => {
    return Array.from(new Set((categories || []).map((c: any) => {
      const parent = Array.isArray(c.parent_id) ? c.parent_id[1] : null
      return parent || null
    }).filter(Boolean))) as string[]
  }, [categories])

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
                {t("Product Categories")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage product categories and hierarchies")}
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
              {canCreatePage("categories") && (
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
                  onClick={handleAddCategory}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("Add Category")}
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
              icon={FolderTree}
              gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
              delay={0}
            />
            <StatCard
              label={t("Parent Categories")}
              value={parentCategories}
              icon={FolderTree}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              delay={1}
            />
            <StatCard
              label={t("Child Categories")}
              value={childCategories}
              icon={FolderTree}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search categories...")}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={[]}
            toFilter={toFilter}
            onToChange={setToFilter}
            toOptions={uniqueParents}
            fromFilter={fromFilter}
            onFromChange={setFromFilter}
            fromOptions={[]}
            showDateRange={false}
            isMobile={isMobile}
            toPlaceholder={t("Parent Category")}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {smartFieldLoading && viewMode === "cards" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                gap: "1.25rem",
              }}
            >
              {Array.from({ length: itemsPerPage }).map((_, idx) => (
                <CategoryCardSkeleton key={idx} colors={colors} />
              ))}
            </div>
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
                  {paginatedCategories.map((category: any, idx: number) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      onClick={() => handleCategoryClick(category)}
                      index={idx}
                    />
                  ))}
                </div>
              ) : (
                <DataTable
                  data={smartFieldRecords}
                  rowSelection={{}}
                  onRowSelectionChange={() => {}}
                  onSelectAllChange={() => {}}
                  columns={tableColumns}
                  visibleColumns={visibleColumns}
                  onVisibleColumnsChange={setVisibleColumns}
                  getRowIcon={(category: any) => {
                    const parent = Array.isArray(category.parent_id) ? category.parent_id[0] : category.parent_id
                    const isParent = !parent
                    return {
                      icon: isParent ? Layers : Package,
                      gradient: isParent 
                        ? "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                        : "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                    }
                  }}
                  actions={canEditPage("categories") || canDeletePage("categories") ? ((category) => {
                    const categoryId = (category as any).id
                    const actions = []
                    if (canEditPage("categories")) {
                      actions.push({
                      key: "edit",
                      label: t("Edit"),
                      icon: Edit,
                      onClick: () => handleCategoryClick(category),
                      })
                    }
                    if (canDeletePage("categories")) {
                      actions.push({
                      key: "delete",
                      label: t("Delete"),
                      icon: Trash2,
                        onClick: () => handleDeleteClick(categoryId),
                      danger: true,
                      })
                    }
                    return actions
                  }) : undefined}
                  actionsLabel={t("Actions")}
                  isRTL={isRTL}
                  isLoading={smartFieldLoading}
                  showPagination={true}
                  defaultItemsPerPage={10}
                />
              )}

              {filteredCategories.length === 0 && !smartFieldLoading && (
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
                    <FolderTree size={28} color="#FFFFFF" />
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

      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}

      <Alert
        isOpen={deleteAlertOpen}
        type="delete"
        title={t("Delete this record?")}
        message={t("This record will be permanently deleted and cannot be recovered.")}
        onClose={() => {
          setDeleteAlertOpen(false)
          setCategoryToDelete(null)
        }}
        onConfirm={handleDeleteCategory}
        confirmLabel={t("Delete")}
        cancelLabel={t("Cancel")}
      />
                </div>
  )
}

interface CategoryCardProps {
  category: any
  onClick: () => void
  index: number
}

function CategoryCard({ category, onClick, index }: CategoryCardProps) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const isRTL = i18n?.dir() === "rtl"

  const statusTheme = {
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    label: Array.isArray(category.parent_id) ? t("Child") : t("Parent"),
  }

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
              <FolderTree className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                {Array.isArray(category.parent_id) && (
                  <ChevronRight size={14} style={{ color: colors.textSecondary }} />
                )}
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>#{category.id}</span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {category.name}
              </h3>
              {Array.isArray(category.parent_id) && (
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {t("Parent:")} {category.parent_id[1]}
                </p>
              )}
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
                  {t("Complete Name")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{category.complete_name || category.name}</p>
              </div>
            </div>

            {Array.isArray(category.child_id) && category.child_id.length > 0 && (
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
                    {t("Children")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{category.child_id.length}</p>
                </div>
              </div>
            )}
          </div>

          <div
            className="flex items-center justify-between pt-4 border-t"
            style={{ borderColor: colors.border }}
          >
            <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
              <FolderTree className="w-4 h-4" />
              <span className="text-xs font-medium">
                {category.complete_name || category.name}
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

function CategoryCardSkeleton({ colors }: { colors: any }) {
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
                width="40%"
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
