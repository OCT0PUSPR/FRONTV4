"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Plus, Ruler, Package, Scale, Clock, X, Trash2, RefreshCcw, CheckCircle2 } from "lucide-react"
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import Toast from "./components/Toast"
import Alert from "./components/Alert"
import { StatCard } from "./components/StatCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Button } from "../@/components/ui/button"
import { Skeleton } from "@mui/material"
import { Card } from "../@/components/ui/card"
import { CustomInput } from "./components/CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./components/NewCustomDropdown"
import { NewCustomButton } from "./components/NewCustomButton"
import { DataTable } from "./components/DataTable"

interface Unit {
  id: string
  name: string
  type: "reference" | "bigger" | "smaller"
  ratio: number
  active: boolean
  rounding: number
}

interface UnitCategory {
  id: string
  name: string
  units: Unit[]
}

export default function UnitsOfMeasurePage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<string[]>([])
  const [unitTypeFilter, setUnitTypeFilter] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  
  // Column visibility state - default: 6 most important columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "total_units",
    "active_units",
    "reference_units",
    "units_list",
  ])
  const [selectedCategory, setSelectedCategory] = useState<UnitCategory | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [addingUnit, setAddingUnit] = useState(false)
  const [newUnit, setNewUnit] = useState<{ name: string; type: "reference" | "bigger" | "smaller"; ratio: number; active: boolean; rounding: number }>({ name: "", type: "reference", ratio: 1.0, active: true, rounding: 0.01 })
  const { colors } = useTheme()
  const { uom, fetchData, loading } = useData() as any
  const { sessionId } = useAuth()
  const { canCreatePage, canEditPage } = useCasl()
  const { uid } = useAuth()
  const [toast, setToast] = useState<{ text: string; state?: 'success' | 'error' } | null>(null)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null)

  const categories: UnitCategory[] = useMemo(() => {
    const list = Array.isArray(uom) ? uom : []
    const byCat: Record<string, UnitCategory> = {}
    for (const rec of list) {
      const cat = rec.category_id
      const catId = Array.isArray(cat) ? cat[0] : cat
      const catName = Array.isArray(cat) ? cat[1] : (rec.category_name || 'Category')
      if (typeof catId !== 'number') continue
      const key = String(catId)
      if (!byCat[key]) byCat[key] = { id: key, name: String(catName || key), units: [] }
      byCat[key].units.push({
        id: String(rec.id),
        name: rec.name || '',
        type: (rec.uom_type as any) || 'reference',
        ratio: Number(rec.ratio || rec.factor_inv || 1),
        active: rec.active !== false,
        rounding: Number(rec.rounding || 0.01),
      })
    }
    return Object.values(byCat)
  }, [uom])

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
    if (!sessionId) return
    
    hasFetchedRef.current = true
    if (!Array.isArray(uom) || !uom.length) fetchData('uom')
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [sessionId])

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase())
      const totalActive = category.units.filter((u) => u.active).length
      const hasActive = totalActive > 0
      const activeStatus = hasActive ? "active" : "inactive"
      const matchesActive = activeFilter.length === 0 || activeFilter.includes(activeStatus)
      const hasReference = category.units.some((u) => u.type === "reference")
      const hasBigger = category.units.some((u) => u.type === "bigger")
      const hasSmaller = category.units.some((u) => u.type === "smaller")
      const categoryTypes: string[] = []
      if (hasReference) categoryTypes.push("reference")
      if (hasBigger) categoryTypes.push("bigger")
      if (hasSmaller) categoryTypes.push("smaller")
      const matchesUnitType = unitTypeFilter.length === 0 || unitTypeFilter.some((type) => categoryTypes.includes(type))
      return matchesSearch && matchesActive && matchesUnitType
    })
  }, [categories, searchQuery, activeFilter, unitTypeFilter])

  // Pagination - only for cards view
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCategories = viewMode === "cards" ? filteredCategories.slice(startIndex, endIndex) : filteredCategories

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeFilter, unitTypeFilter])

  // Get unique values for filters
  const uniqueUnitTypes = useMemo(() => {
    return ["reference", "bigger", "smaller"]
  }, [])

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      id: "id",
      header: t("ID"),
      cell: ({ row }: any) => (
        <span style={{ color: colors.textSecondary, fontSize: "0.875rem", fontFamily: "monospace" }}>
          #{row.original.id}
        </span>
      ),
      enableSorting: true,
    },
    {
      id: "name",
      header: t("Name"),
      cell: ({ row }: any) => (
        <span style={{ color: colors.textPrimary, fontSize: "0.9375rem", fontWeight: 600 }}>
          {row.original.name || ""}
        </span>
      ),
      enableSorting: true,
    },
    {
      id: "total_units",
      header: t("Total Units"),
      cell: ({ row }: any) => {
        const count = row.original.units?.length || 0
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {count}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "active_units",
      header: t("Active Units"),
      cell: ({ row }: any) => {
        const count = row.original.units?.filter((u: Unit) => u.active).length || 0
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {count}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "reference_units",
      header: t("Reference Units"),
      cell: ({ row }: any) => {
        const count = row.original.units?.filter((u: Unit) => u.type === "reference").length || 0
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {count}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "bigger_units",
      header: t("Bigger Units"),
      cell: ({ row }: any) => {
        const count = row.original.units?.filter((u: Unit) => u.type === "bigger").length || 0
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {count}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "smaller_units",
      header: t("Smaller Units"),
      cell: ({ row }: any) => {
        const count = row.original.units?.filter((u: Unit) => u.type === "smaller").length || 0
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {count}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "units_list",
      header: t("Units List"),
      cell: ({ row }: any) => {
        const units = row.original.units || []
        const unitNames = units.slice(0, 3).map((u: Unit) => u.name).join(", ")
        const moreCount = units.length > 3 ? units.length - 3 : 0
        return (
          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
            {unitNames || "-"}
            {moreCount > 0 && ` +${moreCount} ${t("more")}`}
          </span>
        )
      },
      enableSorting: false,
    },
  ], [t, colors])

  const totalUnits = categories.reduce((sum, cat) => sum + cat.units.length, 0)
  const activeUnits = categories.reduce((sum, cat) => sum + cat.units.filter((u) => u.active).length, 0)
  const referenceUnits = categories.reduce(
    (sum, cat) => sum + cat.units.filter((u) => u.type === "reference").length,
    0,
  )

  const handleOpenModal = (category: UnitCategory | null = null) => {
    // Check edit permission before opening modal
    if (!canEditPage("uom-categories")) {
      return
    }
    if (category) {
      setSelectedCategory(category)
      setIsAddingNew(false)
    } else {
      setSelectedCategory({
        id: "",
        name: "",
        units: [],
      })
      setIsAddingNew(true)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedCategory(null)
    setIsAddingNew(false)
    setAddingUnit(false)
    setNewUnit({ name: "", type: "reference", ratio: 1.0, active: true, rounding: 0.01 })
  }

  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = "https://egy.thetalenter.net"
    const db = "odoodb1"
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
    const sessionId = localStorage.getItem("sessionId") || sessionStorage.getItem("sessionId")
    if (!sessionId) {
      setToast({ text: t("No session ID found"), state: "error" })
      setDeleteAlertOpen(false)
      setCategoryToDelete(null)
      return
    }
    try {
      const userId = uid ? Number(uid) : undefined
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/uom-categories/${categoryToDelete}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getOdooHeaders() },
        body: JSON.stringify({ sessionId, userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || t("Delete failed"))
      setToast({ text: t("UOM category deleted successfully"), state: "success" })
      setDeleteAlertOpen(false)
      setCategoryToDelete(null)
      // Refresh categories
      await fetchData("uom")
      if (isModalOpen && selectedCategory?.id === String(categoryToDelete)) {
        setIsModalOpen(false)
        setSelectedCategory(null)
      }
    } catch (error: any) {
      console.error("Delete failed:", error)
      setToast({ text: error?.message || t("Failed to delete UOM category"), state: "error" })
      setDeleteAlertOpen(false)
      setCategoryToDelete(null)
    }
  }

  const confirmAddUnit = async () => {
    if (!newUnit.name.trim()) {
      setToast({ text: t("Please enter a unit name"), state: "error" })
      setTimeout(() => setToast(null), 3000)
      return
    }
    
    if (selectedCategory?.id && sessionId) {
      try {
        const base = API_CONFIG.BACKEND_BASE_URL
        const values: any = {
          name: newUnit.name,
          uom_type: newUnit.type,
          ratio: Number(newUnit.ratio || 1),
          active: !!newUnit.active,
          rounding: Number(newUnit.rounding || 0.01),
          category_id: Number(selectedCategory.id),
        }
        const res = await fetch(`${base}/uom/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, values })
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to create unit")
        await fetchData('uom')
        setToast({ text: t("Unit created successfully"), state: "success" })
        setTimeout(() => setToast(null), 3000)
        // Refresh category data
        const catId = Number(selectedCategory.id)
        const fresh = Array.isArray(uom) ? uom.filter((r: any) => {
          const c = Array.isArray(r.category_id) ? r.category_id[0] : r.category_id
          return c === catId
        }) : []
        setSelectedCategory((prev) => prev ? ({
          ...prev,
          units: fresh.map((rec: any) => ({
            id: String(rec.id),
            name: rec.name || '',
            type: (rec.uom_type as any) || 'reference',
            ratio: Number(rec.ratio || rec.factor_inv || 1),
            active: rec.active !== false,
            rounding: Number(rec.rounding || 0.01),
          }))
        }) : prev)
      } catch (error: any) {
        console.error("Error creating unit:", error)
        setToast({ text: error?.message || t("Failed to create unit. Please try again."), state: "error" })
        setTimeout(() => setToast(null), 3000)
        return
      }
    }
    
    setAddingUnit(false)
    setNewUnit({ name: "", type: "reference", ratio: 1.0, active: true, rounding: 0.01 })
  }

  const cancelAddUnit = () => {
    setAddingUnit(false)
    setNewUnit({ name: "", type: "reference", ratio: 1.0, active: true, rounding: 0.01 })
  }

  const handleAddUnit = () => {
    if (selectedCategory) {
      const newUnit: Unit = {
        id: `new-${Date.now()}`,
        name: "",
        type: "reference",
        ratio: 1.0,
        active: true,
        rounding: 0.01,
      }
      setSelectedCategory({
        ...selectedCategory,
        units: [...selectedCategory.units, newUnit],
      })
    }
  }

  const handleRemoveUnit = (unitId: string) => {
    if (selectedCategory) {
      setSelectedCategory({
        ...selectedCategory,
        units: selectedCategory.units.filter((u) => u.id !== unitId),
      })
    }
  }

  const handleUpdateUnit = (unitId: string, field: keyof Unit, value: any) => {
    if (selectedCategory) {
      setSelectedCategory({
        ...selectedCategory,
        units: selectedCategory.units.map((u) => (u.id === unitId ? { ...u, [field]: value } : u)),
      })
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
                {t("Units of Measure")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage units of measure and categories")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  fetchData("uom")
                }}
                disabled={!!loading?.uom}
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
                <RefreshCcw className={`w-4 h-4 ${loading?.uom ? "animate-spin" : ""}`} />
                {loading?.uom ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("uom-categories") && (
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
                  onClick={() => handleOpenModal()}
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
              value={categories.length}
              icon={Package}
              gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
              delay={0}
            />
            <StatCard
              label={t("Total Units")}
              value={totalUnits}
              icon={Ruler}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              delay={1}
            />
            <StatCard
              label={t("Active Units")}
              value={activeUnits}
              icon={Scale}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Reference Units")}
              value={referenceUnits}
              icon={Clock}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search categories...")}
            statusFilter={activeFilter}
            onStatusChange={setActiveFilter}
            statusOptions={["active", "inactive"]}
            statusPlaceholder={t("Status")}
            statusLabelMap={{
              "active": t("Active"),
              "inactive": t("Inactive"),
            }}
            toFilter={unitTypeFilter}
            onToChange={setUnitTypeFilter}
            toOptions={uniqueUnitTypes}
            toPlaceholder={t("Unit Type")}
            toLabelMap={{
              "reference": t("Reference"),
              "bigger": t("Bigger"),
              "smaller": t("Smaller"),
            }}
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
            loading?.uom ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <UomCardSkeleton key={idx} colors={colors} />
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
                {paginatedCategories.map((category, idx) => (
                  <UomCard
                    key={category.id}
                    category={category}
                    onClick={canEditPage("uom-categories") ? () => handleOpenModal(category) : undefined}
                    index={idx}
                  />
                ))}
              </div>
            )
          ) : (
            <DataTable
              data={filteredCategories}
              columns={columns}
              isLoading={loading?.uom}
              actions={(row) => [
                ...(canEditPage("uom-categories") ? [{
                  key: "edit",
                  label: t("Edit"),
                  onClick: () => handleOpenModal(row),
                }] : []),
                ...(canEditPage("uom-categories") ? [{
                  key: "delete",
                  label: t("Delete"),
                  icon: Trash2,
                  onClick: () => handleDeleteClick(Number(row.id)),
                  danger: true,
                }] : []),
              ]}
              showPagination={true}
              defaultItemsPerPage={10}
              actionsLabel={t("Actions")}
              isRTL={isRTL}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              getRowIcon={(category: any) => {
                const hasUnits = category.units && category.units.length > 0
                return {
                  icon: hasUnits ? CheckCircle2 : Scale,
                  gradient: hasUnits 
                    ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                    : "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                }
              }}
            />
          )}

              {filteredCategories.length === 0 && !loading?.uom && (
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
                    <Ruler size={28} color="#FFFFFF" />
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

              {filteredCategories.length > 0 && viewMode === "cards" && (
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
      {isModalOpen && selectedCategory && (
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
          onClick={handleCloseModal}
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
                  {isAddingNew ? t("Add Unit of Measure Category") : t("Edit Unit of Measure Category")}
                </h2>
                <p style={{ fontSize: 13, color: "#000", margin: "0.25rem 0 0 0" }}>
                  {selectedCategory.name || t("New category")}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.background
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none"
                }}
              >
                <X size={24} color={colors.textSecondary} />
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                  <div>
                    <CustomInput
                      label={t("Unit of Measure Category")}
                      type="text"
                      value={selectedCategory.name}
                      onChange={(v) => setSelectedCategory({ ...selectedCategory, name: v })}
                      placeholder={t("e.g., Weight, Length, Volume")}
                    />
                  </div>
                </div>
              </div>

              {/* Operations Section (only for existing categories) */}
              {!isAddingNew && (
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
                <div
                  style={{
                    background: colors.background,
                    padding: "1rem",
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div style={{ color: colors.textSecondary, fontWeight: 600, fontSize: 13 }}></div>
                    <NewCustomButton
                      label={t("Add Line")}
                      backgroundColor="#FFFFFF"
                      icon={Plus}
                      onClick={() => {
                        setAddingUnit(true)
                        setNewUnit({ name: "", type: "reference", ratio: 1.0, active: true, rounding: 0.01 })
                      }}
                      disabled={addingUnit}
                    />
                  </div>

                  <div style={{ overflowX: "auto" }}>
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
                          <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Unit of Measure")}</th>
                          <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Type")}</th>
                          <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Ratio")}</th>
                          <th style={{ padding: ".5rem", fontWeight: 600, textAlign: "center" }}>{t("Active")}</th>
                          <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Rounding")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedCategory.units || []).map((unit) => (
                          <tr key={unit.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                            <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                              {unit.name}
                            </td>
                            <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                              {unit.type === "reference" ? t("Reference Unit") : unit.type === "bigger" ? t("Bigger than reference") : t("Smaller than reference")}
                            </td>
                            <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                              {unit.ratio}
                            </td>
                            <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13, textAlign: "center" }}>
                              {unit.active ? t("Yes") : t("No")}
                            </td>
                            <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                              {unit.rounding}
                            </td>
                          </tr>
                        ))}
                        {(!selectedCategory.units || selectedCategory.units.length === 0) && (
                          <tr>
                            <td
                              colSpan={5}
                              style={{ padding: ".75rem", color: colors.textSecondary, textAlign: "center", fontSize: 13 }}
                            >
                              {t("No operation lines")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {addingUnit && (
                    <>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr",
                          gap: ".5rem",
                          marginTop: "0.75rem",
                        }}
                      >
                        <CustomInput
                          label=""
                          type="text"
                          value={newUnit.name}
                          onChange={(v) => setNewUnit((s) => ({ ...s, name: v }))}
                          placeholder={t("Unit of Measure")}
                        />
                        <div style={{ minWidth: 0 }}>
                          <NewCustomDropdown
                            label=""
                            values={[
                              t("Reference Unit"),
                              t("Bigger than reference"),
                              t("Smaller than reference")
                            ]}
                            type="single"
                            placeholder={t("Type")}
                            defaultValue={
                              newUnit.type === "reference" ? t("Reference Unit") :
                              newUnit.type === "bigger" ? t("Bigger than reference") :
                              t("Smaller than reference")
                            }
                            onChange={(v) => {
                              const type = v === t("Reference Unit") ? "reference" :
                                         v === t("Bigger than reference") ? "bigger" : "smaller"
                              setNewUnit((s) => ({ ...s, type: type as "reference" | "bigger" | "smaller" }))
                            }}
                          />
                        </div>
                        <CustomInput
                          label=""
                          type="number"
                          value={String(newUnit.ratio)}
                          onChange={(v) => setNewUnit((s) => ({ ...s, ratio: Number.parseFloat(v) || 1 }))}
                          placeholder={t("Ratio")}
                        />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "1.5rem" }}>
                          <input
                            type="checkbox"
                            checked={newUnit.active}
                            onChange={(e) => setNewUnit((s) => ({ ...s, active: e.target.checked }))}
                            style={{ accentColor: colors.action, cursor: "pointer" }}
                          />
                        </div>
                        <CustomInput
                          label=""
                          type="number"
                          value={String(newUnit.rounding)}
                          onChange={(v) => setNewUnit((s) => ({ ...s, rounding: Number.parseFloat(v) || 0.01 }))}
                          placeholder={t("Rounding")}
                        />
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: ".5rem", marginTop: ".75rem" }}>
                        <Button
                          onClick={confirmAddUnit}
                          style={{
                            background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                            color: "#fff",
                            border: "none",
                            padding: "0.5rem 1rem",
                            fontSize: 13,
                          }}
                        >
                          {t("Confirm")}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={cancelAddUnit}
                          style={{
                            border: `1px solid ${colors.border}`,
                            background: colors.card,
                            color: colors.textPrimary,
                            padding: "0.5rem 1rem",
                            fontSize: 13,
                          }}
                        >
                          {t("Cancel")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: colors.card,
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {!isAddingNew && canEditPage("uom-categories") && (
                  <button
                    onClick={() => handleDeleteClick(selectedCategory ? Number(selectedCategory.id) : 0)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.375rem 0.5rem",
                      border: `1px solid ${colors.border}`,
                      borderRadius: "6px",
                      background: colors.card,
                      color: "#FF0000",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#FF0000"
                      e.currentTarget.style.color = "#FFFFFF"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = colors.card
                      e.currentTarget.style.color = "#FF0000"
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <NewCustomButton
                  label={isAddingNew ? t("Create") : t("Save")}
                  backgroundColor="#25D0FE"
                  onClick={async () => {
                  try {
                    if (!sessionId) {
                      setToast({ text: t("Session ID not found"), state: "error" })
                      setTimeout(() => setToast(null), 3000)
                      return
                    }
                    const base = API_CONFIG.BACKEND_BASE_URL
                    if (isAddingNew) {
                      const res = await fetch(`${base}/uom-categories/create`, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ sessionId, values: { name: selectedCategory?.name || '' } }) 
                      })
                      const data = await res.json().catch(() => ({}))
                      if (res.ok && data?.success) {
                        setToast({ text: t("Category created successfully"), state: "success" })
                        setTimeout(() => setToast(null), 3000)
                        await fetchData('uom')
                        setIsModalOpen(false)
                      } else {
                        setToast({ text: data?.message || t("Failed to create category"), state: "error" })
                        setTimeout(() => setToast(null), 3000)
                      }
                    } else if (selectedCategory?.id) {
                      const res = await fetch(`${base}/uom-categories/${selectedCategory.id}`, { 
                        method: 'PUT', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ sessionId, values: { name: selectedCategory.name } }) 
                      })
                      const data = await res.json().catch(() => ({}))
                      if (res.ok && data?.success) {
                        const newUnits = (selectedCategory.units || []).filter(u => String(u.id).startsWith('new-') && (u.name || '').trim())
                        for (const u of newUnits) {
                          const values: any = {
                            name: u.name,
                            uom_type: u.type,
                            ratio: Number(u.ratio || 1),
                            active: !!u.active,
                            category_id: Number(selectedCategory.id),
                          }
                          await fetch(`${base}/uom/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, values }) })
                        }
                        setToast({ text: t("Category updated successfully"), state: "success" })
                        setTimeout(() => setToast(null), 3000)
                        await fetchData('uom')
                        setIsModalOpen(false)
                      } else {
                        setToast({ text: data?.message || t("Failed to update category"), state: "error" })
                        setTimeout(() => setToast(null), 3000)
                      }
                    }
                  } catch (e: any) {
                    console.error('Save UoM category/units failed', e)
                    setToast({ text: e?.message || t("An error occurred"), state: "error" })
                    setTimeout(() => setToast(null), 3000)
                  }
                }}
                />
                <NewCustomButton
                  label={t("Close")}
                  backgroundColor="#FFFFFF"
                  onClick={handleCloseModal}
                />
              </div>
            </div>
          </Card>
        </div>
      )}
      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}

      <Alert
        isOpen={deleteAlertOpen}
        type="delete"
        title={t("Delete this UOM category?")}
        message={t("This UOM category will be permanently deleted and cannot be recovered.")}
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

interface UomCardProps {
  category: UnitCategory
  onClick: () => void
  index: number
}

function UomCard({ category, onClick, index }: UomCardProps) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const isRTL = i18n?.dir() === "rtl"

  const statusTheme = {
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    label: t("Category"),
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
                {category.name}
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                {category.units.length} {t("units")}
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
                  {t("Total Units")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{category.units.length}</p>
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
                  {t("Active")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{category.units.filter((u) => u.active).length}</p>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between pt-4 border-t"
            style={{ borderColor: colors.border }}
          >
            <div className="flex items-center gap-1.5 flex-wrap" style={{ color: colors.textSecondary }}>
              {category.units.slice(0, 3).map((unit) => (
                <span
                  key={unit.id}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.25rem 0.5rem",
                    background: colors.mutedBg,
                    borderRadius: "0.375rem",
                    color: colors.textPrimary,
                  }}
                >
                  {unit.name}
                </span>
              ))}
              {category.units.length > 3 && (
                <span style={{ fontSize: "0.75rem", color: colors.textSecondary }}>
                  +{category.units.length - 3} {t("more")}
                </span>
              )}
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

function UomCardSkeleton({ colors }: { colors: any }) {
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
