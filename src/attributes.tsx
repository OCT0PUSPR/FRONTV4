"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/theme"
import { Plus, Trash2, FileText, Grid3x3, Zap, Eye, RefreshCcw, CheckCircle2, Circle, Edit } from "lucide-react"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import { StatCard } from "./components/StatCard"
import { AttributeCard } from "./components/AttributeCard"
import { Card, CardContent } from "../@/components/ui/card"
import { Input } from "../@/components/ui/input"
import { Button } from "../@/components/ui/button"
import { Label } from "../@/components/ui/label"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Skeleton } from "@mui/material"
import { CustomInput } from "./components/CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./components/NewCustomDropdown"
import { NewCustomButton } from "./components/NewCustomButton"
import Toast from "./components/Toast"
import Alert from "./components/Alert"
import { DataTable } from "./components/DataTable"

// Theming via ThemeContext

type DisplayType = "Radio" | "Pills" | "Select" | "Color" | "Multi-checkbox"
type VariantCreation = "Instantly" | "Dynamically" | "Never"
type FilterVisibility = "Visible" | "Hidden"

interface AttributeValue {
  id: string
  value: string
  freeText: boolean
  extraPrice: number
}

interface Attribute {
  id: string
  name: string
  displayType: DisplayType
  variantCreation: VariantCreation
  filterVisibility: FilterVisibility
  values: AttributeValue[]
}

export default function AttributesPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { attributes: rawAttributes, fetchData, loading } = useData() as any
  const { sessionId, uid } = useAuth()
  const { canCreatePage, canEditPage } = useCasl()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterVisibilityFilter, setFilterVisibilityFilter] = useState<string[]>([])
  const [toFilter, setToFilter] = useState<string[]>([])
  const [fromFilter, setFromFilter] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  
  // Column visibility state - default: 6 most important columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "displayType",
    "variantCreation",
    "filterVisibility",
    "values_count",
  ])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null)
  const [addingValue, setAddingValue] = useState(false)
  const [newValue, setNewValue] = useState<{
    value: string
    freeText: boolean
    extraPrice: number
  }>({ value: "", freeText: false, extraPrice: 0 })
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [attributeToDelete, setAttributeToDelete] = useState<number | null>(null)

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
    if (!Array.isArray(rawAttributes) || !rawAttributes.length) fetchData('attributes')
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Update formData when rawAttributes changes for the selected attribute
  useEffect(() => {
    if (!selectedAttribute?.id || !Array.isArray(rawAttributes)) return
    const updatedAttribute = rawAttributes.find((a: any) => a.id === Number(selectedAttribute.id))
    if (updatedAttribute) {
      const mappedAttribute: Attribute = {
        id: String(updatedAttribute.id),
        name: updatedAttribute.name || "",
        displayType: mapDisplayType(updatedAttribute.display_type || updatedAttribute.displayType || ""),
        variantCreation: mapVariantCreation(updatedAttribute.create_variant || updatedAttribute.variant_creation || ""),
        filterVisibility: mapVisibility(updatedAttribute.visibility || updatedAttribute.filter_visibility || ""),
        values: Array.isArray(updatedAttribute.values)
          ? updatedAttribute.values.map((v: any) => ({
              id: String(v.id),
              value: v.name || "",
              freeText: !!v.is_custom,
              extraPrice: Number(v.price_extra || 0),
            }))
          : [],
      }
      setFormData(mappedAttribute)
      setSelectedAttribute(mappedAttribute)
    }
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [rawAttributes, selectedAttribute?.id])

  const [formData, setFormData] = useState<Attribute>({
    id: "",
    name: "",
    displayType: "Radio",
    variantCreation: "Instantly",
    filterVisibility: "Visible",
    values: [],
  })

  // Map Odoo fields to UI model
  const mapDisplayType = (s: string): DisplayType => {
    const k = (s || "").toLowerCase()
    if (k.includes("color")) return "Color"
    if (k.includes("pill")) return "Pills"
    if (k.includes("multi")) return "Multi-checkbox"
    if (k.includes("select")) return "Select"
    return "Radio"
  }
  const mapVariantCreation = (s: string): VariantCreation => {
    const k = (s || "").toLowerCase()
    if (k.includes("dynamic") || k.includes("needed")) return "Dynamically"
    if (k.includes("never") || k.includes("no_variant")) return "Never"
    return "Instantly"
  }
  const mapVisibility = (s: string): FilterVisibility => {
    const k = (s || "").toLowerCase()
    if (k.includes("hidden")) return "Hidden"
    return "Visible"
  }

  const attributes: Attribute[] = useMemo(() => {
    const list = Array.isArray(rawAttributes) ? rawAttributes : []
    return list.map((a: any) => ({
      id: String(a.id),
      name: a.name || "",
      displayType: mapDisplayType(a.display_type || a.displayType || ""),
      variantCreation: mapVariantCreation(a.create_variant || a.variant_creation || ""),
      filterVisibility: mapVisibility(a.visibility || a.filter_visibility || ""),
      values: Array.isArray(a.values)
        ? a.values.map((v: any) => ({
            id: String(v.id),
            value: v.name || "",
            freeText: !!v.is_custom,
            extraPrice: Number(v.price_extra || 0),
          }))
        : [],
    }))
  }, [rawAttributes])

  const filteredAttributes = useMemo(() => {
    return attributes.filter((attr) => {
      const matchesSearch = attr.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTo = toFilter.length === 0 || toFilter.includes(attr.displayType)
      const matchesFrom = fromFilter.length === 0 || fromFilter.includes(attr.variantCreation)
      const matchesVisibility = filterVisibilityFilter.length === 0 || filterVisibilityFilter.includes(attr.filterVisibility)
      return matchesSearch && matchesTo && matchesFrom && matchesVisibility
    })
  }, [attributes, searchQuery, toFilter, fromFilter, filterVisibilityFilter])

  // Pagination - only for cards view
  const totalPages = Math.ceil(filteredAttributes.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedAttributes = viewMode === "cards" ? filteredAttributes.slice(startIndex, endIndex) : filteredAttributes

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, toFilter, fromFilter, filterVisibilityFilter])

  const uniqueDisplayTypes = useMemo(() => {
    return Array.from(new Set(attributes.map((a) => a.displayType).filter(Boolean)))
  }, [attributes])

  const uniqueVariantCreations = useMemo(() => {
    return Array.from(new Set(attributes.map((a) => a.variantCreation).filter(Boolean)))
  }, [attributes])

  const uniqueFilterVisibilities = useMemo(() => {
    return Array.from(new Set(attributes.map((a) => a.filterVisibility).filter(Boolean)))
  }, [attributes])

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
      id: "displayType",
      header: t("Display Type"),
      cell: ({ row }: any) => {
        const type = row.original.displayType || ""
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {t(type)}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "variantCreation",
      header: t("Variant Creation"),
      cell: ({ row }: any) => {
        const variant = row.original.variantCreation || ""
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {t(variant)}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "filterVisibility",
      header: t("Filter Visibility"),
      cell: ({ row }: any) => {
        const visibility = row.original.filterVisibility || "Visible"
        const statusTheme = {
          bg: visibility === "Visible" ? "rgba(67, 233, 123, 0.1)" : "rgba(79, 172, 254, 0.1)",
          text: visibility === "Visible" ? "#43e97b" : colors.action,
          label: t(visibility),
        }
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              background: statusTheme.bg,
              color: statusTheme.text,
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {statusTheme.label}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "values_count",
      header: t("Values Count"),
      cell: ({ row }: any) => {
        const count = row.original.values?.length || 0
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {count}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "values_list",
      header: t("Values List"),
      cell: ({ row }: any) => {
        const values = row.original.values || []
        const valueNames = values.slice(0, 3).map((v: AttributeValue) => v.value).join(", ")
        const moreCount = values.length > 3 ? values.length - 3 : 0
        return (
          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
            {valueNames || "-"}
            {moreCount > 0 && ` +${moreCount} ${t("more")}`}
          </span>
        )
      },
      enableSorting: false,
    },
  ], [t, colors])

  const handleOpenModal = (attribute?: Attribute) => {
    // Check edit permission before opening modal
    if (!canEditPage("attributes")) {
      return
    }
    if (attribute) {
      navigate(`/attributes/edit/${attribute.id}`)
    } else {
      navigate('/attributes/create')
    }
  }

  const handleNewAttribute = () => {
    if (canCreatePage("attributes")) {
      navigate('/attributes/create')
    }
  }

  // Get Odoo headers for API requests
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem("odooBase") || localStorage.getItem("odoo_base_url") || "https://egy.thetalenter.net"
    const db = localStorage.getItem("odooDb") || localStorage.getItem("odoo_db") || "odoodb1"
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    }
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedAttribute(null)
    setAddingValue(false)
    setNewValue({ value: "", freeText: false, extraPrice: 0 })
    // Refresh attributes data after modal closes
    fetchData("attributes")
  }

  const handleDeleteClick = (attributeId: number) => {
    setAttributeToDelete(attributeId)
    setDeleteAlertOpen(true)
  }

  const deleteAttributeAction = async () => {
    if (!attributeToDelete) return
    const sessionId = localStorage.getItem("sessionId") || sessionStorage.getItem("sessionId")
    if (!sessionId) {
      setToast({ text: t("No session ID found"), state: "error" })
      setDeleteAlertOpen(false)
      setAttributeToDelete(null)
      return
    }
    try {
      const userId = uid ? Number(uid) : undefined
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/attributes/${attributeToDelete}`, {
        method: "DELETE",
        headers: getOdooHeaders(),
        body: JSON.stringify({ sessionId, userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || t("Delete failed"))
      setToast({ text: t("Attribute deleted successfully"), state: "success" })
      setDeleteAlertOpen(false)
      setAttributeToDelete(null)
      // Refresh attributes
      await fetchData("attributes")
      if (isModalOpen && selectedAttribute?.id === String(attributeToDelete)) {
        setIsModalOpen(false)
        setSelectedAttribute(null)
      }
    } catch (error: any) {
      console.error("Delete failed:", error)
      setToast({ text: error?.message || t("Failed to delete attribute"), state: "error" })
      setDeleteAlertOpen(false)
      setAttributeToDelete(null)
    }
  }

  const handleAddValue = () => {
    setAddingValue(true)
    setNewValue({ value: "", freeText: false, extraPrice: 0 })
  }

  const confirmAddValue = async () => {
    if (!newValue.value.trim()) {
      setToast({ text: t("Please enter a value"), state: "error" })
      setTimeout(() => setToast(null), 3000)
      return
    }
    
    // If attribute exists, save the value immediately
    if (selectedAttribute?.id && sessionId) {
      try {
        const base = API_CONFIG.BACKEND_BASE_URL
        const headers = getOdooHeaders()
        const userId = uid ? Number(uid) : undefined
        const values: any = {
          name: newValue.value,
          is_custom: !!newValue.freeText,
          price_extra: Number(newValue.extraPrice || 0),
          attribute_id: Number(selectedAttribute.id),
        }
        const res = await fetch(`${base}/attribute-values/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({ sessionId, values, userId }),
        })
        if (!res.ok) throw new Error("Failed to create attribute value")
        // Refresh data to get the new value with proper ID
        await fetchData("attributes")
        // Update formData with the new value immediately (temporary ID, will be updated on refresh)
        setFormData({
          ...formData,
          values: [
            ...formData.values,
            {
              id: `new-${Date.now()}`,
              value: newValue.value,
              freeText: newValue.freeText,
              extraPrice: newValue.extraPrice,
            },
          ],
        })
      } catch (error) {
        console.error("Error creating attribute value:", error)
        setToast({ text: t("Failed to create attribute value. Please try again."), state: "error" })
        setTimeout(() => setToast(null), 3000)
        return
      }
    } else {
      // For new attributes, just add to formData.values
      setFormData({
        ...formData,
        values: [
          ...formData.values,
          {
            id: `new-${Date.now()}`,
            value: newValue.value,
            freeText: newValue.freeText,
            extraPrice: newValue.extraPrice,
          },
        ],
      })
    }
    
    setAddingValue(false)
    setNewValue({ value: "", freeText: false, extraPrice: 0 })
  }

  const cancelAddValue = () => {
    setAddingValue(false)
    setNewValue({ value: "", freeText: false, extraPrice: 0 })
  }

  const handleRemoveValue = (id: string) => {
    setFormData({
      ...formData,
      values: formData.values.filter((v) => v.id !== id),
    })
  }

  const handleValueChange = (id: string, field: keyof AttributeValue, value: any) => {
    setFormData({
      ...formData,
      values: formData.values.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    })
  }

  // Helpers to map UI -> backend fields
  const toDisplayType = (d: DisplayType) => {
    switch (d) {
      case "Pills":
        return "pills"
      case "Select":
        return "select"
      case "Color":
        return "color"
      case "Multi-checkbox":
        return "multi"
      default:
        return "radio"
    }
  }
  const toCreateVariant = (v: VariantCreation) => {
    switch (v) {
      case "Dynamically":
        return "dynamic"
      case "Never":
        return "no_variant"
      default:
        return "always"
    }
  }
  const toVisibility = (v: FilterVisibility) => (v === "Hidden" ? "hidden" : "visible")

  const saveAttribute = async () => {
    if (!sessionId) return
    const payload: any = {
      name: formData.name,
      display_type: toDisplayType(formData.displayType),
      create_variant: toCreateVariant(formData.variantCreation),
      visibility: toVisibility(formData.filterVisibility),
    }
    const base = API_CONFIG.BACKEND_BASE_URL
    const userId = uid ? Number(uid) : undefined
    const headers = getOdooHeaders()
    
    try {
      let attributeId: number | null = null
      if (selectedAttribute?.id) {
        const res = await fetch(`${base}/attributes/${selectedAttribute.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ sessionId, values: payload, userId }),
        })
        if (!res.ok) throw new Error("Failed to update attribute")
        attributeId = Number(selectedAttribute.id)
      } else {
        const res = await fetch(`${base}/attributes/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({ sessionId, values: payload, userId }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.id) throw new Error("Failed to create attribute")
        attributeId = data.id
      }
      
      // Save new values if any
      const newValues = formData.values.filter((v) => v.id.startsWith("new-") && v.value.trim().length > 0)
      if (newValues.length > 0 && attributeId) {
        for (const v of newValues) {
          const values: any = {
            name: v.value,
            is_custom: !!v.freeText,
            price_extra: Number(v.extraPrice || 0),
            attribute_id: attributeId,
          }
          await fetch(`${base}/attribute-values/create`, {
            method: "POST",
            headers,
            body: JSON.stringify({ sessionId, values, userId }),
          })
        }
      }
      
      await fetchData("attributes")
      setToast({ text: selectedAttribute?.id ? t("Attribute updated successfully") : t("Attribute created successfully"), state: "success" })
      setTimeout(() => setToast(null), 3000)
      setIsModalOpen(false)
    } catch (error) {
      console.error("Error saving attribute:", error)
      setToast({ text: t("Failed to save attribute. Please try again."), state: "error" })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const confirmNewValues = async () => {
    if (!sessionId || !selectedAttribute?.id) return
    const base = API_CONFIG.BACKEND_BASE_URL
    const headers = getOdooHeaders()
    const newLines = formData.values.filter((v) => v.id.startsWith("new-") && v.value.trim().length > 0)
    
    try {
      for (const v of newLines) {
        const values: any = {
          name: v.value,
          is_custom: !!v.freeText,
          price_extra: Number(v.extraPrice || 0),
          attribute_id: Number(selectedAttribute.id),
        }
        const userId = uid ? Number(uid) : undefined
        const res = await fetch(`${base}/attribute-values/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({ sessionId, values, userId }),
        })
        if (!res.ok) throw new Error("Failed to create attribute value")
      }
      await fetchData("attributes")
    } catch (error) {
      console.error("Error creating attribute values:", error)
    }
  }

  const displayTypeStats = attributes.reduce(
    (acc, attr) => {
      acc[attr.displayType] = (acc[attr.displayType] || 0) + 1
      return acc
    },
    {} as Record<DisplayType, number>,
  )

  const variantCreationStats = attributes.reduce(
    (acc, attr) => {
      acc[attr.variantCreation] = (acc[attr.variantCreation] || 0) + 1
      return acc
    },
    {} as Record<VariantCreation, number>,
  )

  const totalValues = attributes.reduce((sum, attr) => sum + attr.values.length, 0)
  const visibleFilters = attributes.filter((a) => a.filterVisibility === "Visible").length

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
                {t("Product Attributes")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage product attributes for variant creation and filtering")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  fetchData("attributes")
                }}
                disabled={!!loading?.attributes}
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
                <RefreshCcw className={`w-4 h-4 ${loading?.attributes ? "animate-spin" : ""}`} />
                {loading?.attributes ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("attributes") && (
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
                  onClick={handleNewAttribute}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("Add Attribute")}
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
              label={t("Total Attributes")}
              value={attributes.length}
              icon={FileText}
              gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
              delay={0}
            />
            <StatCard
              label={t("Display Types")}
              value={Object.keys(displayTypeStats).length}
              icon={Grid3x3}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={1}
            />
            <StatCard
              label={t("Total Values")}
              value={totalValues}
              icon={Zap}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Visible Filters")}
              value={visibleFilters}
              icon={Eye}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search attributes...")}
            statusFilter={filterVisibilityFilter}
            onStatusChange={setFilterVisibilityFilter}
            statusOptions={uniqueFilterVisibilities}
            statusPlaceholder={t("Filter Visibility")}
            statusLabelMap={{
              "Visible": t("Visible"),
              "Hidden": t("Hidden"),
            }}
            toFilter={toFilter}
            onToChange={setToFilter}
            toOptions={uniqueDisplayTypes}
            toPlaceholder={t("Display Type")}
            toLabelMap={{
              "Radio": t("Radio"),
              "Pills": t("Pills"),
              "Select": t("Select"),
              "Color": t("Color"),
              "Multi-checkbox": t("Multi-checkbox"),
            }}
            fromFilter={fromFilter}
            onFromChange={setFromFilter}
            fromOptions={uniqueVariantCreations}
            fromPlaceholder={t("Variant Creation")}
            fromLabelMap={{
              "Instantly": t("Instantly"),
              "Dynamically": t("Dynamically"),
              "Never": t("Never"),
            }}
            showDateRange={false}
            isMobile={isMobile}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {viewMode === "cards" ? (
            loading?.attributes ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <AttributeCardSkeleton key={idx} colors={colors} />
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
                {paginatedAttributes.map((attribute, idx) => (
                  <AttributeCard
                    key={attribute.id}
                    attribute={attribute}
                    onClick={canEditPage("attributes") ? () => navigate(`/attributes/edit/${attribute.id}`) : undefined}
                    index={idx}
                  />
                ))}
              </div>
            )
          ) : (
            <DataTable
              data={filteredAttributes}
              columns={columns}
              isLoading={loading?.attributes}
              actions={(row) => [
                {
                  key: "view",
                  label: t("View"),
                  icon: Eye,
                  onClick: () => navigate(`/attributes/view/${row.id}`),
                },
                ...(canEditPage("attributes") ? [{
                  key: "edit",
                  label: t("Edit"),
                  icon: Edit,
                  onClick: () => navigate(`/attributes/edit/${row.id}`),
                }] : []),
                ...(canEditPage("attributes") ? [{
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
              getRowIcon={(attribute: any) => {
                const hasValues = attribute.values && attribute.values.length > 0
                return {
                  icon: hasValues ? CheckCircle2 : FileText,
                  gradient: hasValues 
                    ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                    : "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                }
              }}
            />
          )}

              {filteredAttributes.length === 0 && !loading?.attributes && (
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
                    <FileText size={28} color="#FFFFFF" />
                  </div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {t("No attributes found")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                </div>
              )}

              {filteredAttributes.length > 0 && viewMode === "cards" && (
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
                  {selectedAttribute ? t("Edit Attribute") : t("Add New Attribute")}
                </h2>
                {formData.name && (
                  <p style={{ fontSize: 13, color: "#000", marginTop: 4 }}>{formData.name}</p>
                )}
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  border: "none",
                  background: "transparent",
                  color: colors.textSecondary,
                  cursor: "pointer",
                  fontSize: 24,
                  lineHeight: 1,
                  padding: "0.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
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
                      label={t("Attribute Name")}
                      type="text"
                      value={formData.name}
                      onChange={(v) => setFormData({ ...formData, name: v })}
                      placeholder={t("e.g. Brand, Color, Size")}
                    />
                  </div>

                  <div>
                    <NewCustomDropdown
                      label={t("eCommerce Filter")}
                      values={["Visible", "Hidden"]}
                      type="single"
                      placeholder={t("Select visibility")}
                      defaultValue={formData.filterVisibility}
                      onChange={(v) => setFormData({ ...formData, filterVisibility: v as FilterVisibility })}
                    />
                  </div>

                  <div>
                    <NewCustomDropdown
                      label={t("Display Type")}
                      values={["Radio", "Pills", "Select", "Color", "Multi-checkbox"]}
                      type="single"
                      placeholder={t("Select display type")}
                      defaultValue={formData.displayType}
                      onChange={(v) => setFormData({ ...formData, displayType: v as DisplayType })}
                    />
                  </div>

                  <div>
                    <NewCustomDropdown
                      label={t("Variant Creation")}
                      values={["Instantly", "Dynamically", "Never"]}
                      type="single"
                      placeholder={t("Select variant creation")}
                      defaultValue={formData.variantCreation}
                      onChange={(v) => setFormData({ ...formData, variantCreation: v as VariantCreation })}
                    />
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
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
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
                      onClick={handleAddValue}
                      disabled={addingValue}
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
                          <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Value")}</th>
                          <th style={{ padding: ".5rem", fontWeight: 600, textAlign: "center" }}>{t("Free Text")}</th>
                          <th style={{ padding: ".5rem", fontWeight: 600, textAlign: "right" }}>{t("Extra Price")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(formData.values || []).map((value) => (
                          <tr key={value.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                            <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                              {value.value}
                            </td>
                            <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13, textAlign: "center" }}>
                              {value.freeText ? t("Yes") : t("No")}
                            </td>
                            <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13, textAlign: "right" }}>
                              {value.extraPrice}
                            </td>
                          </tr>
                        ))}
                        {(!formData.values || formData.values.length === 0) && (
                          <tr>
                            <td
                              colSpan={3}
                              style={{ padding: ".75rem", color: colors.textSecondary, textAlign: "center", fontSize: 13 }}
                            >
                              {t("No operation lines")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {addingValue && (
                    <>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr 1fr",
                          gap: ".5rem",
                          marginTop: "0.75rem",
                        }}
                      >
                        <CustomInput
                          label=""
                          type="text"
                          value={newValue.value}
                          onChange={(v) => setNewValue((s) => ({ ...s, value: v }))}
                          placeholder={t("Value")}
                        />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "1.5rem" }}>
                          <input
                            type="checkbox"
                            checked={newValue.freeText}
                            onChange={(e) => setNewValue((s) => ({ ...s, freeText: e.target.checked }))}
                            style={{ accentColor: colors.action, cursor: "pointer" }}
                          />
                          <label style={{ marginLeft: "0.5rem", fontSize: 13, color: colors.textSecondary }}>
                            {t("Free Text")}
                          </label>
                        </div>
                        <CustomInput
                          label=""
                          type="number"
                          value={String(newValue.extraPrice)}
                          onChange={(v) => setNewValue((s) => ({ ...s, extraPrice: Number.parseFloat(v) || 0 }))}
                          placeholder={t("Extra Price")}
                        />
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: ".5rem", marginTop: ".75rem" }}>
                        <Button
                          onClick={confirmAddValue}
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
                          onClick={cancelAddValue}
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
            </div>
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
                {selectedAttribute && canEditPage("attributes") && (
                  <button
                    onClick={() => handleDeleteClick(Number(selectedAttribute.id))}
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
                  label={selectedAttribute ? t("Save Changes") : t("Create Attribute")}
                  backgroundColor="#25D0FE"
                  onClick={saveAttribute}
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
        title={t("Delete this attribute?")}
        message={t("This attribute will be permanently deleted and cannot be recovered.")}
        onClose={() => {
          setDeleteAlertOpen(false)
          setAttributeToDelete(null)
        }}
        onConfirm={deleteAttributeAction}
        confirmLabel={t("Delete")}
        cancelLabel={t("Cancel")}
      />
    </div>
  )
}

function AttributeCardSkeleton({ colors }: { colors: any }) {
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
