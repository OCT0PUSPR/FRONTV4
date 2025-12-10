"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Plus, Package, Truck, Scale, X, Trash2, RefreshCcw, Edit, Box, CheckCircle2, Eye } from "lucide-react"
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { StatCard } from "./components/StatCard"
import { ProductPackageCard } from "./components/ProductPackageCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Button } from "../@/components/ui/button"
import { Skeleton } from "@mui/material"
import { Card } from "../@/components/ui/card"
import { CustomInput } from "./components/CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./components/NewCustomDropdown"
import { NewCustomButton } from "./components/NewCustomButton"
import Toast from "./components/Toast"
import Alert from "./components/Alert"
import { API_CONFIG } from "./config/api"
import { DataTable, ColumnDef } from "./components/DataTable"

interface StorageCapacity {
  id: string
  category: string
  quantity: number
}

interface PackageType {
  [key: string]: any
}

export default function PackageTypesPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [carrierFilter, setCarrierFilter] = useState<string[]>([])
  const [toFilter, setToFilter] = useState<string[]>([])
  const [fromFilter, setFromFilter] = useState<string[]>([])
  const [maxWeightRange, setMaxWeightRange] = useState<[number, number] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null)
  const [formData, setFormData] = useState<Partial<PackageType>>({
    name: "",
    height: 0,
    width: 0,
    length: 0,
    weight: 0,
    maxWeight: 0,
    barcode: "",
    carrier: "No carrier integration",
    carrierCode: "",
    storageCapacities: [],
    sequence: 0,
  })
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  
  // Column visibility state - default: 7 most important columns (including sequence)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "sequence",
    "name",
    "height",
    "width",
    "length",
    "maxWeight",
  ])
  const { colors } = useTheme()
  const { packageTypes, fetchData, loading } = useData()
  const { sessionId, uid } = useAuth()
  const { canCreatePage, canEditPage } = useCasl()
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [packageToDelete, setPackageToDelete] = useState<number | null>(null)

  // Get Odoo headers from localStorage
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem("odooBase") || "https://egy.thetalenter.net"
    const db = localStorage.getItem("odooDb") || "odoodb1"
    const headers: Record<string, string> = {}
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

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
    if (!Array.isArray(packageTypes) || !packageTypes.length) fetchData('packageTypes')
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [])

  // Get unique carriers for filter
  const uniqueCarriers = useMemo(() => {
    const set = new Set<string>()
    ;(Array.isArray(packageTypes) ? packageTypes : []).forEach((p: any) => {
      const c = p?.package_carrier_type || p?.carrier || p?.delivery_carrier_id || ""
      if (c) {
        if (Array.isArray(c)) {
          set.add(String(c[1] || c[0] || ""))
        } else if (typeof c === "string" && c !== "No carrier integration") {
          set.add(c)
        }
      }
    })
    return Array.from(set).filter(Boolean) as string[]
  }, [packageTypes])

  // Get max weight range for slider
  const maxWeightRangeData = useMemo(() => {
    const list = Array.isArray(packageTypes) ? packageTypes : []
    const weights = list.map((p: any) => Number(p?.max_weight ?? p?.maxWeight ?? 0)).filter((n) => Number.isFinite(n) && n > 0)
    if (!weights.length) return { min: 0, max: 100 }
    return {
      min: Math.floor(Math.min(...weights)),
      max: Math.ceil(Math.max(...weights)),
    }
  }, [packageTypes])

  const filteredPackages = useMemo(() => {
    const list = Array.isArray(packageTypes) ? packageTypes : []
    const q = searchQuery.toLowerCase()
    return list.filter((pkg: any) => {
      // Search filter
      const name = String(pkg?.display_name || pkg?.name || "").toLowerCase()
      const barcode = String(pkg?.barcode || pkg?.x_barcode || "").toLowerCase()
      const carrier = String(pkg?.package_carrier_type || pkg?.carrier || pkg?.delivery_carrier_id || "").toLowerCase()
      const matchesSearch = name.includes(q) || barcode.includes(q) || carrier.includes(q)
      
      // Carrier filter
      const pkgCarrier = pkg?.package_carrier_type || pkg?.carrier || pkg?.delivery_carrier_id || ""
      let carrierName = ""
      if (Array.isArray(pkgCarrier)) {
        carrierName = String(pkgCarrier[1] || pkgCarrier[0] || "")
      } else if (typeof pkgCarrier === "string") {
        carrierName = pkgCarrier
      }
      const matchesCarrier = carrierFilter.length === 0 || carrierFilter.includes(carrierName)
      
      // Max weight range filter
      const maxWeight = Number(pkg?.max_weight ?? pkg?.maxWeight ?? 0)
      const matchesWeight = !maxWeightRange || (maxWeight >= maxWeightRange[0] && maxWeight <= maxWeightRange[1])
      
      return matchesSearch && matchesCarrier && matchesWeight
    })
  }, [packageTypes, searchQuery, carrierFilter, maxWeightRange])

  // Pagination - only for cards view
  const totalPages = Math.ceil(filteredPackages.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPackages = viewMode === "cards" ? filteredPackages.slice(startIndex, endIndex) : filteredPackages

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, carrierFilter, maxWeightRange])

  const totalPackages = Array.isArray(packageTypes) ? packageTypes.length : 0
  const carriersIntegrated = useMemo(() => {
    const set = new Set<string>()
    ;(Array.isArray(packageTypes) ? packageTypes : []).forEach((p: any) => {
      const c = p?.carrier || p?.delivery_carrier_id || ""
      if (c) set.add(typeof c === "string" ? c : Array.isArray(c) ? String(c[1] || c[0]) : String(c))
    })
    return set.size
  }, [packageTypes])
  const avgWeight = useMemo(() => {
    const list = Array.isArray(packageTypes) ? packageTypes : []
    const weights = list.map((p: any) => Number(p?.max_weight ?? p?.maxWeight ?? 0)).filter((n) => Number.isFinite(n))
    if (!weights.length) return "0.0"
    const sum = weights.reduce((a, b) => a + b, 0)
    return (sum / weights.length).toFixed(1)
  }, [packageTypes])

  const handleEditPackageType = (pkg?: PackageType) => {
    // Check edit permission before navigating
    if (!canEditPage("package-types")) {
      return
    }
    if (pkg?.id) {
      navigate(`/package-types/edit/${pkg.id}`)
    }
  }

  const handleAddPackageType = () => {
    navigate('/package-types/create')
  }

  const handleViewPackageType = (pkgId: number) => {
    navigate(`/package-types/view/${pkgId}`)
  }

  const handleCloseModal = (skipDirtyCheck = false) => {
    if (skipDirtyCheck || !dirty) {
      setIsModalOpen(false)
      setSelectedPackage(null)
      setDirty(false)
    }
  }

  const handleSave = async () => {
    if (!sessionId) {
      setToast({ text: t("Session expired. Please sign in again."), state: "error" })
      setTimeout(() => setToast(null), 3000)
      return
    }

    setSaving(true)
    try {
      const values: any = {}
      if (formData.name) values.name = formData.name
      if (formData.height) values.height = Number(formData.height)
      if (formData.width) values.width = Number(formData.width)
      if (formData.length) values.packaging_length = Number(formData.length)
      if (formData.weight) values.base_weight = Number(formData.weight)
      if (formData.maxWeight) values.max_weight = Number(formData.maxWeight)
      if (formData.barcode) values.barcode = formData.barcode
      if (formData.carrier && formData.carrier !== "No carrier integration") {
        values.package_carrier_type = formData.carrier.toLowerCase()
      }
      if (formData.carrierCode) values.shipper_package_code = formData.carrierCode

      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }

      let res
      if (selectedPackage?.id) {
        // Update existing package type
        res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/package-types/${selectedPackage.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ sessionId, values }),
        })
      } else {
        // Create new package type
        res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/package-types/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({ sessionId, values }),
        })
      }

      const data = await res.json().catch(() => ({}))
      if (res.ok && (data?.success || data?.id)) {
        await fetchData("packageTypes")
        setDirty(false)
        setToast({
          text: selectedPackage?.id
            ? t("Package type updated successfully")
            : t("Package type created successfully"),
          state: "success",
        })
        setTimeout(() => {
          setToast(null)
          handleCloseModal(true) // Skip dirty check since we just saved
        }, 1200)
      } else {
        const errMsg =
          data?.message ||
          (selectedPackage?.id
            ? t("Failed to update package type")
            : t("Failed to create package type"))
        setToast({ text: errMsg, state: "error" })
        setTimeout(() => setToast(null), 3000)
      }
    } catch (error: any) {
      const errorMsg = error?.message || t("Unknown error occurred")
      setToast({ text: errorMsg, state: "error" })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const onChange = (patch: Partial<typeof formData>) => {
    setFormData((f) => ({ ...f, ...patch }))
    setDirty(true)
  }

  const addStorageCapacity = () => {
    onChange({
      storageCapacities: [
        ...(formData.storageCapacities || []),
        { id: Date.now().toString(), category: "", quantity: 0 },
      ],
    })
  }

  const removeStorageCapacity = (id: string) => {
    onChange({
      storageCapacities: (formData.storageCapacities || []).filter((sc) => sc.id !== id),
    })
  }

  const updateStorageCapacity = (id: string, field: "category" | "quantity", value: string | number) => {
    onChange({
      storageCapacities: (formData.storageCapacities || []).map((sc) =>
        sc.id === id ? { ...sc, [field]: value } : sc,
      ),
    })
  }

  const handleDeleteClick = (packageId: number) => {
    setPackageToDelete(packageId)
    setDeleteAlertOpen(true)
  }

  const deletePackageAction = async () => {
    if (!packageToDelete) return
    const sessionId = localStorage.getItem("sessionId") || sessionStorage.getItem("sessionId")
    if (!sessionId) {
      setToast({ text: t("No session ID found"), state: "error" })
      setDeleteAlertOpen(false)
      setPackageToDelete(null)
      return
    }
    try {
      const userId = uid ? Number(uid) : undefined
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/package-types/${packageToDelete}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getOdooHeaders() },
        body: JSON.stringify({ sessionId, userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || t("Delete failed"))
      setToast({ text: t("Package type deleted successfully"), state: "success" })
      setDeleteAlertOpen(false)
      setPackageToDelete(null)
      // Refresh package types
      await fetchData("packageTypes")
      // Modal removed - using DynamicRecordPage instead
      if (false && selectedPackage?.id === packageToDelete) {
        setIsModalOpen(false)
        setSelectedPackage(null)
      }
    } catch (error: any) {
      console.error("Delete failed:", error)
      setToast({ text: error?.message || t("Failed to delete package type"), state: "error" })
      setDeleteAlertOpen(false)
      setPackageToDelete(null)
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
                {t("Package Types")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage packaging options and carrier integrations")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  fetchData("packageTypes")
                }}
                disabled={!!loading?.packageTypes}
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
                <RefreshCcw className={`w-4 h-4 ${loading?.packageTypes ? "animate-spin" : ""}`} />
                {loading?.packageTypes ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("package-types") && (
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
                  onClick={handleAddPackageType}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("Add Package Type")}
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
          label={t("Total Package Types")}
          value={totalPackages}
          icon={Package}
          gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
          delay={0}
        />
        <StatCard
          label={t("Carriers Integrated")}
          value={carriersIntegrated}
          icon={Truck}
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          delay={1}
        />
        <StatCard
          label={t("Average Weight")}
          value={`${avgWeight} kg`}
          icon={Scale}
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          delay={2}
        />
      </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search package types...")}
            statusFilter={carrierFilter}
            onStatusChange={setCarrierFilter}
            statusOptions={uniqueCarriers}
            statusPlaceholder={t("Carrier")}
            toFilter={toFilter}
            onToChange={setToFilter}
            toOptions={[]}
            fromFilter={fromFilter}
            onFromChange={setFromFilter}
            fromOptions={[]}
            showDateRange={false}
            isMobile={isMobile}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
            showRangeSlider={true}
            rangeSliderValue={maxWeightRange}
            onRangeSliderChange={setMaxWeightRange}
            rangeSliderMin={maxWeightRangeData.min}
            rangeSliderMax={maxWeightRangeData.max}
            rangeSliderStep={0.1}
            rangeSliderLabel={t("Max Weight (kg)")}
            rangeSliderPlaceholder={t("Max Weight Range")}
          />

          {viewMode === "cards" ? (
            loading?.packageTypes ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <PackageTypeCardSkeleton key={idx} colors={colors} />
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
                {paginatedPackages.map((pkg: any, idx) => (
                  <ProductPackageCard key={pkg.id} pkg={pkg} onClick={canEditPage("package-types") ? () => handleEditPackageType(pkg) : undefined} index={idx} />
                ))}
              </div>
            )
          ) : (
            <DataTable
              data={filteredPackages}
              isLoading={loading?.packageTypes}
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
                      id: "sequence",
                      header: t("Sequence"),
                      cell: ({ row }) => {
                        const pkg = row.original as any
                        const sequence = pkg.sequence || 0
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                            {sequence > 0 ? sequence : "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "name",
                      header: t("Package Type Name"),
                      cell: ({ row }) => {
                        const pkg = row.original as any
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.9375rem", fontWeight: 600 }}>
                            {pkg.display_name || pkg.name || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "height",
                      header: t("Height (mm)"),
                      cell: ({ row }) => {
                        const pkg = row.original as any
                        const height = pkg.height || 0
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {height > 0 ? `${height} mm` : "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "width",
                      header: t("Width (mm)"),
                      cell: ({ row }) => {
                        const pkg = row.original as any
                        const width = pkg.width || 0
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {width > 0 ? `${width} mm` : "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "length",
                      header: t("Length (mm)"),
                      cell: ({ row }) => {
                        const pkg = row.original as any
                        const length = pkg.packaging_length || pkg.length || 0
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {length > 0 ? `${length} mm` : "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "weight",
                      header: t("Weight (kg)"),
                      cell: ({ row }) => {
                        const pkg = row.original as any
                        const weight = pkg.base_weight || pkg.weight || 0
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {weight > 0 ? `${weight} kg` : "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "maxWeight",
                      header: t("Max Weight (kg)"),
                      cell: ({ row }) => {
                        const pkg = row.original as any
                        const maxWeight = pkg.max_weight || pkg.maxWeight || 0
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                            {maxWeight > 0 ? `${maxWeight} kg` : "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "barcode",
                      header: t("Barcode"),
                      cell: ({ row }) => {
                        const pkg = row.original as any
                        const barcode = pkg.barcode || pkg.x_barcode || ""
                        return (
                          <span style={{ color: colors.textSecondary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                            {barcode || "—"}
                          </span>
                        )
                      },
                    },
                    {
                      id: "carrier",
                      header: t("Carrier"),
                      cell: ({ row }) => {
                        const pkg = row.original as any
                        const carrier = pkg.package_carrier_type || pkg.carrier || pkg.delivery_carrier_id
                        let carrierName = "No carrier integration"
                        if (carrier) {
                          if (Array.isArray(carrier)) {
                            carrierName = carrier[1] || carrier[0] || "No carrier integration"
                          } else if (typeof carrier === "string") {
                            carrierName = carrier
                          }
                        }
                        return (
                          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                            {carrierName}
                          </span>
                        )
                      },
                    },
                    {
                      id: "carrierCode",
                      header: t("Carrier Code"),
                      cell: ({ row }) => {
                        const pkg = row.original as any
                        const carrierCode = pkg.shipper_package_code || pkg.carrierCode || ""
                        return (
                          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                            {carrierCode || "—"}
                          </span>
                        )
                      },
                    },
                  ]}
                  visibleColumns={visibleColumns}
                  onVisibleColumnsChange={setVisibleColumns}
                  actions={(pkg) => {
                    const pkgId = (pkg as any).id
                    return [
                      {
                        key: "view",
                        label: t("View"),
                        icon: Eye,
                        onClick: () => handleViewPackageType(pkgId),
                      },
                      ...(canEditPage("package-types") ? [{
                        key: "edit",
                        label: t("Edit"),
                        icon: Edit,
                        onClick: () => handleEditPackageType(pkg),
                      }] : []),
                      ...(canEditPage("package-types") ? [{
                        key: "delete",
                        label: t("Delete"),
                        icon: Trash2,
                        onClick: () => handleDeleteClick(Number(pkgId)),
                        danger: true,
                      }] : []),
                    ]
                  }}
                  isRTL={isRTL}
                  getRowIcon={(pkg: any) => {
                    const hasDimensions = (pkg.height && pkg.height > 0) || (pkg.width && pkg.width > 0) || (pkg.packaging_length || pkg.length)
                    const hasWeight = (pkg.base_weight || pkg.weight) && (pkg.base_weight || pkg.weight) > 0
                    if (hasDimensions && hasWeight) {
                      return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                    } else if (hasDimensions || hasWeight) {
                      return { icon: Box, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }
                    } else {
                      return { icon: Package, gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" }
                    }
                  }}
                  showPagination={true}
                  defaultItemsPerPage={10}
                />
          )}

          {filteredPackages.length === 0 && !loading?.packageTypes && (
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
                    {t("No package types found")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
            </div>
          )}

          {filteredPackages.length > 0 && viewMode === "cards" && (
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

      {/* Modal removed - using DynamicRecordPage instead */}
      {false && (
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
          onClick={() => handleCloseModal()}
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
                  {selectedPackage ? t("Edit Package Type") : t("New Package Type")}
                </h2>
                <p style={{ fontSize: 13, color: "#000" }}>
                  {t("Configure package dimensions and carrier integration")}
                </p>
              </div>
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
                      label={t("Package Type Name")}
                      type="text"
                      value={formData.name || ""}
                      onChange={(v) => onChange({ name: v })}
                      placeholder={t("e.g. Small Box")}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: colors.textSecondary,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("Size (mm)")}
                    </label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto 1fr auto 1fr",
                        gap: "12px",
                        alignItems: "end",
                      }}
                    >
                      <CustomInput
                        label={t("Height")}
                        type="number"
                        value={String(formData.height || 0)}
                        onChange={(v) => onChange({ height: Number.parseFloat(v) || 0 })}
                        placeholder="0.00"
                      />
                      <span style={{ fontSize: "20px", color: colors.border, marginBottom: "0.5rem" }}>×</span>
                      <CustomInput
                        label={t("Width")}
                        type="number"
                        value={String(formData.width || 0)}
                        onChange={(v) => onChange({ width: Number.parseFloat(v) || 0 })}
                        placeholder="0.00"
                      />
                      <span style={{ fontSize: "20px", color: colors.border, marginBottom: "0.5rem" }}>×</span>
                      <CustomInput
                        label={t("Length")}
                        type="number"
                        value={String(formData.length || 0)}
                        onChange={(v) => onChange({ length: Number.parseFloat(v) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
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
                    {t("Weight & Identification")}
                  </h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <CustomInput
                    label={t("Weight (kg)")}
                    type="number"
                    value={String(formData.weight || 0)}
                    onChange={(v) => onChange({ weight: Number.parseFloat(v) || 0 })}
                    placeholder="0.00"
                  />
                  <CustomInput
                    label={t("Max Weight (kg)")}
                    type="number"
                    value={String(formData.maxWeight || 0)}
                    onChange={(v) => onChange({ maxWeight: Number.parseFloat(v) || 0 })}
                    placeholder="0.00"
                  />
                  <div style={{ gridColumn: "1/-1" }}>
                    <CustomInput
                      label={t("Barcode")}
                      type="text"
                      value={formData.barcode || ""}
                      onChange={(v) => onChange({ barcode: v })}
                      placeholder="PKG-XXX-XXX"
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
                      background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
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
                    {t("Carrier Integration")}
                  </h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <NewCustomDropdown
                      label={t("Carrier")}
                      values={["No carrier integration", "UPS", "FedEx", "DHL", "USPS", "Freight"]}
                      type="single"
                      placeholder={t("Select carrier")}
                      defaultValue={formData.carrier || "No carrier integration"}
                      onChange={(v) => onChange({ carrier: v })}
                    />
                  </div>
                  <div>
                    <CustomInput
                      label={t("Carrier Code")}
                      type="text"
                      value={formData.carrierCode || ""}
                      onChange={(v) => onChange({ carrierCode: v })}
                      placeholder={t("e.g. UPS-SML")}
                    />
                  </div>
                </div>
              </div>

              <div>
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
                      background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
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
                    {t("Storage Category Capacity")}
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
                          <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Storage Category")}</th>
                          <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Quantity")}</th>
                          <th style={{ padding: ".5rem", fontWeight: 600, width: "50px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(formData.storageCapacities || []).map((sc) => (
                          <tr key={sc.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                            <td style={{ padding: ".5rem" }}>
                              <CustomInput
                                label=""
                                type="text"
                                value={sc.category || ""}
                                onChange={(v) => updateStorageCapacity(sc.id, "category", v)}
                                placeholder={t("e.g. Shelf A")}
                              />
                            </td>
                            <td style={{ padding: ".5rem" }}>
                              <CustomInput
                                label=""
                                type="number"
                                value={String(sc.quantity || 0)}
                                onChange={(v) => updateStorageCapacity(sc.id, "quantity", Number.parseInt(v) || 0)}
                                placeholder="0"
                              />
                            </td>
                            <td style={{ padding: ".5rem" }}>
                              <button
                                onClick={() => removeStorageCapacity(sc.id)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: "6px",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#FEE2E2"
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "transparent"
                                }}
                              >
                                <Trash2 size={18} color="#EF4444" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(!formData.storageCapacities || formData.storageCapacities.length === 0) && (
                          <tr>
                            <td
                              colSpan={3}
                              style={{ padding: ".75rem", color: colors.textSecondary, textAlign: "center", fontSize: 13 }}
                            >
                              {t("No storage capacities")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: "0.75rem" }}>
                    <NewCustomButton
                      label={t("Add a line")}
                      backgroundColor="#FFFFFF"
                      icon={Plus}
                      onClick={addStorageCapacity}
                    />
                  </div>
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
                {selectedPackage && canEditPage("package-types") && (
                  <button
                    onClick={() => handleDeleteClick(selectedPackage.id)}
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
                {dirty && (
                  <NewCustomButton
                    label={saving ? t("Saving...") : (selectedPackage ? t("Save Changes") : t("Create Package Type"))}
                    backgroundColor="#25D0FE"
                    onClick={handleSave}
                    disabled={saving}
                  />
                )}
                <NewCustomButton
                  label={t("Close")}
                  backgroundColor="#FFFFFF"
                  onClick={handleCloseModal}
                  disabled={saving}
                />
              </div>
            </div>
          </Card>
          {toast && (
            <Toast
              text={toast.text}
              state={toast.state}
              onClose={() => setToast(null)}
            />
          )}
        </div>
      )}

      <Alert
        isOpen={deleteAlertOpen}
        type="delete"
        title={t("Delete this package type?")}
        message={t("This package type will be permanently deleted and cannot be recovered.")}
        onClose={() => {
          setDeleteAlertOpen(false)
          setPackageToDelete(null)
        }}
        onConfirm={deletePackageAction}
        confirmLabel={t("Delete")}
        cancelLabel={t("Cancel")}
      />
    </div>
  )
}

function PackageTypeCardSkeleton({ colors }: { colors: any }) {
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
    </div>
  )
}
