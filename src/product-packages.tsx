"use client"

import { useEffect, useMemo, useState } from "react"
import { Package, Boxes, Weight, TrendingUp, Plus, RefreshCcw, CheckCircle2, Edit, Trash2, Eye } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { StatCard } from "./components/StatCard"
import { PackageCard } from "./components/PackageCard"
import { API_CONFIG } from "./config/api"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Button } from "../@/components/ui/button"
import { Skeleton } from "@mui/material"
import PackageEditModal from "./components/PackageEditModal"
import { DataTable, ColumnDef } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"

type PackageRecord = any

export default function PackagesPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { packages, loading, fetchData, packageTypes, locations, partners } = useData() as any
  const { sessionId, uid } = useAuth()
  const { canCreatePage, canEditPage, canExportPage, canDeletePage } = useCasl()
  const navigate = useNavigate()

  // Get Odoo headers from localStorage
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem("odooBase") || "https://egy.thetalenter.net"
    const db = localStorage.getItem("odooDb") || "odoodb1"
    const headers: Record<string, string> = {}
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [packageTypeFilter, setPackageTypeFilter] = useState<string[]>([])
  const [ownerFilter, setOwnerFilter] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "barcode",
    "packageType",
    "owner",
    "location"
  ])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!sessionId) return
    if (!loading?.packageTypes && (!packageTypes || packageTypes.length === 0)) {
      fetchData("packageTypes")
    }
    if (!loading?.packages && (!packages || packages.length === 0)) {
      fetchData("packages")
    }
  }, [sessionId])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const typesById = useMemo(() => {
    const map = new Map<number, any>()
    for (const pt of (packageTypes || [])) map.set(pt.id, pt)
    return map
  }, [packageTypes])

  const ownersById = useMemo(() => {
    const map = new Map<number, any>()
    for (const owner of (partners || [])) map.set(owner.id, owner)
    return map
  }, [partners])

  const locationsById = useMemo(() => {
    const map = new Map<number, any>()
    for (const loc of (locations || [])) map.set(loc.id, loc)
    return map
  }, [locations])

  const uiPackages: PackageRecord[] = useMemo(() => {
    if (!packages) return []
    return (packages || []).map((p: any) => {
      const typeId = Array.isArray(p.package_type_id) ? p.package_type_id[0] : p.package_type_id
      const ownerId = Array.isArray(p.partner_id) ? p.partner_id[0] : (Array.isArray(p.owner_id) ? p.owner_id[0] : p.owner_id)
      const locationId = Array.isArray(p.location_id) ? p.location_id[0] : p.location_id
      const pt = typesById.get(typeId)
      const owner = ownersById.get(ownerId)
      const location = locationsById.get(locationId)
      
      const packageTypeName = pt ? (pt.name || pt.display_name || `#${typeId}`) : (Array.isArray(p.package_type_id) ? p.package_type_id[1] : "")
      const ownerName = owner ? (owner.name || owner.display_name || `#${ownerId}`) : (Array.isArray(p.partner_id) ? p.partner_id[1] : (Array.isArray(p.owner_id) ? p.owner_id[1] : ""))
      const locationName = location ? (location.complete_name || location.display_name || location.name || `#${locationId}`) : (Array.isArray(p.location_id) ? p.location_id[1] : "")
      
      return {
        ...p,
        // flatten selected fields from package type so the card can read them directly
        shipping_weight: pt?.shipping_weight ?? pt?.base_weight ?? pt?.weight,
        weight: pt?.weight ?? pt?.base_weight ?? pt?.shipping_weight,
        base_weight: pt?.base_weight ?? pt?.weight ?? pt?.shipping_weight,
        max_weight: pt?.max_weight,
        width: pt?.width,
        height: pt?.height,
        packaging_length: pt?.packaging_length ?? pt?.length ?? pt?.pack_length,
        weight_uom_name: pt?.weight_uom_name,
        length_uom_name: pt?.length_uom_name,
        barcode: p.barcode ?? pt?.barcode,
        display_name: p.display_name || p.name,
        packageTypeName,
        ownerName,
        locationName,
      }
    })
  }, [packages, typesById, ownersById, locationsById])

  const filteredPackages = uiPackages.filter((pkg: any) => {
    const title = (pkg.display_name || pkg.name || "").toLowerCase()
    const barcode = (pkg.barcode || "").toLowerCase()
    const q = searchQuery.toLowerCase()
    const matchesSearch = title.includes(q) || barcode.includes(q)
    
    // Package type filter
    const typeName = Array.isArray(pkg.package_type_id)
      ? pkg.package_type_id[1]
      : typeof pkg.package_type_id === "string"
        ? pkg.package_type_id.replace(/^[0-9]+\s*/, "").trim()
        : ""
    const matchesType = packageTypeFilter.length === 0 || packageTypeFilter.includes(typeName)
    
    // Owner filter (from partner_id or owner_id)
    const ownerName = Array.isArray(pkg.partner_id) ? pkg.partner_id[1] : Array.isArray(pkg.owner_id) ? pkg.owner_id[1] : ""
    const matchesOwner = ownerFilter.length === 0 || ownerFilter.includes(ownerName)
    
    // Status filter (placeholder - packages may not have explicit status)
    const matchesStatus = statusFilter.length === 0
    
    return matchesSearch && matchesStatus && matchesType && matchesOwner
  })

  // Pagination
  const totalPages = Math.ceil(filteredPackages.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPackages = filteredPackages.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, packageTypeFilter, ownerFilter])

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("product-packages")) {
      return
    }
    // Determine data to export
    let dataToExport = filteredPackages
    if (options.scope === "selected") {
      dataToExport = filteredPackages.filter((pkg: any) => rowSelection[String(pkg.id)])
    } else if (options.scope === "page") {
      dataToExport = paginatedPackages
    }

    // Define all possible columns
    const allColumns = {
      id: {
        header: t('Package ID'),
        accessor: (row: any) => `#${row.id}`,
        isMonospace: true
      },
      name: {
        header: t('Package Name'),
        accessor: (row: any) => row.display_name || row.name || '-',
        isBold: true
      },
      barcode: {
        header: t('Barcode'),
        accessor: (row: any) => row.barcode || '-',
        isMonospace: true
      },
      packageType: {
        header: t('Package Type'),
        accessor: (row: any) => row.packageTypeName || '-'
      },
      owner: {
        header: t('Owner'),
        accessor: (row: any) => row.ownerName || '-'
      },
      location: {
        header: t('Location'),
        accessor: (row: any) => row.locationName || '-'
      },
      weight: {
        header: t('Weight'),
        accessor: (row: any) => {
          const weight = row.weight || row.shipping_weight || row.base_weight
          const uom = row.weight_uom_name || "kg"
          return weight ? `${Number(weight).toFixed(2)} ${uom}` : '-'
        }
      },
      maxWeight: {
        header: t('Max Weight'),
        accessor: (row: any) => {
          const maxWeight = row.max_weight
          const uom = row.weight_uom_name || "kg"
          return maxWeight ? `${Number(maxWeight).toFixed(2)} ${uom}` : '-'
        }
      },
      dimensions: {
        header: t('Dimensions'),
        accessor: (row: any) => {
          const width = row.width
          const height = row.height
          const length = row.packaging_length
          const uom = row.length_uom_name || "cm"
          if (width && height && length) {
            return `${Number(length).toFixed(1)} × ${Number(width).toFixed(1)} × ${Number(height).toFixed(1)} ${uom}`
          }
          return '-'
        }
      },
    }

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Product Packages Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Total Packages'), value: data.length },
        { label: t('With Barcode'), value: data.filter((pkg: any) => pkg.barcode).length },
        { label: t('With Location'), value: data.filter((pkg: any) => pkg.locationName).length }
      ]
    }

    exportData(options, dataToExport, config, null)
    setIsExportModalOpen(false)
  }

  // Get unique values for filters
  const uniquePackageTypes = useMemo(() => {
    const types = new Set<string>()
    // First, get types from packages
    uiPackages.forEach((pkg: any) => {
      const typeName = Array.isArray(pkg.package_type_id)
        ? pkg.package_type_id[1]
        : typeof pkg.package_type_id === "string"
          ? pkg.package_type_id.replace(/^[0-9]+\s*/, "").trim()
          : ""
      if (typeName) types.add(typeName)
    })
    // Also include types from packageTypes array if available
    if (packageTypes && Array.isArray(packageTypes)) {
      packageTypes.forEach((pt: any) => {
        const name = pt.name || pt.display_name
        if (name) types.add(name)
      })
    }
    return Array.from(types).sort()
  }, [uiPackages, packageTypes])

  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>()
    // Get owners from packages
    uiPackages.forEach((pkg: any) => {
      const ownerName = Array.isArray(pkg.partner_id) ? pkg.partner_id[1] : Array.isArray(pkg.owner_id) ? pkg.owner_id[1] : ""
      if (ownerName) owners.add(ownerName)
    })
    // Also include from partners array if available
    if (partners && Array.isArray(partners)) {
      partners.forEach((p: any) => {
        const name = Array.isArray(p.name) ? p.name[1] : p.name
        if (name) owners.add(name)
      })
    }
    return Array.from(owners).sort()
  }, [uiPackages, partners])

  const handleDeletePackage = async (packageId: number) => {
    if (!sessionId) return
    if (!confirm(t("Are you sure you want to delete this package?"))) return

    try {
      const headers = {
        "Content-Type": "application/json",
        ...getOdooHeaders(),
      }
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/quant-packages/${packageId}`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        await fetchData("packages")
      } else {
        alert(data?.message || t("Failed to delete package"))
      }
    } catch (error: any) {
      console.error("Delete package failed", error)
      alert(error?.message || t("An error occurred"))
    }
  }

  const totalPackages = uiPackages.length
  const totalWeight = uiPackages.reduce((sum: number, pkg: any) => {
    const w = pkg?.shipping_weight ?? pkg?.weight ?? pkg?.base_weight
    return sum + (Number(w) || 0)
  }, 0)
  const packedPackages = 0
  const inTransitPackages = 0

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
              {t("Packages")}
            </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
              {t("Manage and track your package references")}
            </p>
          </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
              onClick={() => fetchData("packages")}
              disabled={!!loading?.packages}
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
              <RefreshCcw className={`w-4 h-4 ${loading?.packages ? "animate-spin" : ""}`} />
              {loading?.packages ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("product-packages") && (
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
                  onClick={() => {
                    if (canCreatePage("product-packages")) {
                      navigate('/product-packages/create')
                    }
                  }}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("Add Package")}
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
            label={t("Total Packages")}
            value={totalPackages}
            icon={Package}
            gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
            delay={0}
          />
          <StatCard
            label={t("Packed Packages")}
            value={packedPackages}
            icon={Boxes}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            delay={1}
          />
          <StatCard
            label={t("Total Weight")}
            value={`${totalWeight.toFixed(1)} kg`}
            icon={Weight}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            delay={2}
          />
          <StatCard
            label={t("In Transit")}
            value={inTransitPackages}
            icon={TrendingUp}
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            delay={3}
          />
        </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search packages...")}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={[]}
            toFilter={packageTypeFilter}
            onToChange={setPackageTypeFilter}
            toOptions={uniquePackageTypes}
            fromFilter={ownerFilter}
            onFromChange={setOwnerFilter}
            fromOptions={uniqueOwners}
            showDateRange={false}
            isMobile={isMobile}
            toPlaceholder={t("Package Type")}
            fromPlaceholder={t("Owner")}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {viewMode === "cards" ? (
            loading?.packages ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <PackageCardSkeleton key={idx} colors={colors} />
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
                {paginatedPackages.map((pkg: any, idx: number) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onClick={canEditPage("product-packages") ? () => {
                      navigate(`/product-packages/edit/${pkg.id}`)
                    } : undefined}
                    index={idx}
                  />
                ))}
              </div>
            )
          ) : (
            <>
              <DataTable
                data={filteredPackages}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                onExport={canExportPage("product-packages") ? () => setIsExportModalOpen(true) : undefined}
                columns={[
                  {
                    id: "id",
                    header: t("Package ID"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textSecondary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                        #{(row.original as any).id}
                      </span>
                    ),
                  },
                  {
                    id: "name",
                    header: t("Package Name"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textPrimary, fontSize: "0.9375rem", fontWeight: 600 }}>
                        {(row.original as any).display_name || (row.original as any).name || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "barcode",
                    header: t("Barcode"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textSecondary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                        {(row.original as any).barcode || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "packageType",
                    header: t("Package Type"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                        {(row.original as any).packageTypeName || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "owner",
                    header: t("Owner"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                        {(row.original as any).ownerName || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "location",
                    header: t("Location"),
                    cell: ({ row }) => (
                      <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                        {(row.original as any).locationName || "—"}
                      </span>
                    ),
                  },
                  {
                    id: "weight",
                    header: t("Weight"),
                    cell: ({ row }) => {
                      const weight = (row.original as any).weight || (row.original as any).shipping_weight || (row.original as any).base_weight
                      const uom = (row.original as any).weight_uom_name || "kg"
                      return (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                          {weight ? `${Number(weight).toFixed(2)} ${uom}` : "—"}
                        </span>
                      )
                    },
                  },
                  {
                    id: "maxWeight",
                    header: t("Max Weight"),
                    cell: ({ row }) => {
                      const maxWeight = (row.original as any).max_weight
                      const uom = (row.original as any).weight_uom_name || "kg"
                      return (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                          {maxWeight ? `${Number(maxWeight).toFixed(2)} ${uom}` : "—"}
                        </span>
                      )
                    },
                  },
                  {
                    id: "dimensions",
                    header: t("Dimensions"),
                    cell: ({ row }) => {
                      const width = (row.original as any).width
                      const height = (row.original as any).height
                      const length = (row.original as any).packaging_length
                      const uom = (row.original as any).length_uom_name || "cm"
                      if (width && height && length) {
                        return (
                          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                            {Number(length).toFixed(1)} × {Number(width).toFixed(1)} × {Number(height).toFixed(1)} {uom}
                          </span>
                        )
                      }
                      return <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>—</span>
                    },
                  },
                  {
                    id: "width",
                    header: t("Width"),
                    cell: ({ row }) => {
                      const width = (row.original as any).width
                      const uom = (row.original as any).length_uom_name || "cm"
                      return (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                          {width ? `${Number(width).toFixed(2)} ${uom}` : "—"}
                        </span>
                      )
                    },
                  },
                  {
                    id: "height",
                    header: t("Height"),
                    cell: ({ row }) => {
                      const height = (row.original as any).height
                      const uom = (row.original as any).length_uom_name || "cm"
                      return (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                          {height ? `${Number(height).toFixed(2)} ${uom}` : "—"}
                        </span>
                      )
                    },
                  },
                  {
                    id: "length",
                    header: t("Length"),
                    cell: ({ row }) => {
                      const length = (row.original as any).packaging_length
                      const uom = (row.original as any).length_uom_name || "cm"
                      return (
                        <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                          {length ? `${Number(length).toFixed(2)} ${uom}` : "—"}
                        </span>
                      )
                    },
                  },
                ]}
                actions={(pkg) => [
                  {
                    key: "view",
                    label: t("View"),
                    icon: Eye,
                    onClick: () => {
                      const id = (pkg as any)?.id
                      if (id != null) {
                        navigate(`/product-packages/view/${id}`)
                      }
                    },
                  },
                  ...(canEditPage("product-packages") ? [{
                    key: "edit",
                    label: t("Edit"),
                    icon: Edit,
                    onClick: () => {
                      const id = (pkg as any)?.id
                      if (id != null) {
                        navigate(`/product-packages/edit/${id}`)
                      }
                    },
                  }] : []),
                  ...(canDeletePage("product-packages") ? [{
                    key: "delete",
                    label: t("Delete"),
                    icon: Trash2,
                    onClick: () => handleDeletePackage((pkg as any)?.id),
                    danger: true,
                  }] : []),
                ]}
                actionsLabel={t("Actions")}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
                isRTL={isRTL}
                isLoading={loading?.packages}
                getRowIcon={() => {
                  return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                }}
                showPagination={true}
                defaultItemsPerPage={10}
              />

              {!loading?.packages && filteredPackages.length === 0 && (
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
                    {t("No packages found")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                </div>
              )}
            </>
          )}

        {isModalOpen && (
          <PackageEditModal
            isOpen={isModalOpen}
            packageId={selectedPackageId}
            onClose={() => {
              setIsModalOpen(false)
              setSelectedPackageId(null)
              fetchData("packages")
            }}
            canDelete={canDeletePage("product-packages")}
          />
        )}

        {canExportPage("product-packages") && (
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            onExport={handleExport}
            totalRecords={filteredPackages.length}
            selectedCount={Object.keys(rowSelection).length}
            isSelectAll={Object.keys(rowSelection).length === filteredPackages.length && filteredPackages.length > 0}
          />
        )}
        </div>
      </div>
    </div>
  )
}

// Skeleton component matching PackageCard structure
function PackageCardSkeleton({ colors }: { colors: any }) {
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
        {/* Status Tab (Top Right) */}
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
              {/* Title */}
              <Skeleton
                variant="text"
                width="60%"
                height={20}
                sx={{
                  marginBottom: "0.5rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              {/* Type name */}
              <Skeleton
                variant="text"
                width="40%"
                height={14}
                sx={{
                  bgcolor: colors.mutedBg,
                }}
              />
            </div>
          </div>

          {/* Weight and Dimensions Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div
              style={{
                background: `linear-gradient(135deg, ${colors.mutedBg}, ${colors.background})`,
                borderRadius: "0.75rem",
                padding: "1rem",
                border: `1px solid ${colors.border}`,
              }}
            >
              <Skeleton
                variant="text"
                width="40%"
                height={12}
                sx={{
                  marginBottom: "0.5rem",
                  bgcolor: colors.border,
                }}
              />
              <Skeleton
                variant="text"
                width="70%"
                height={20}
                sx={{
                  bgcolor: colors.border,
                }}
              />
                </div>
            <div
              style={{
                background: `linear-gradient(135deg, ${colors.mutedBg}, ${colors.background})`,
                borderRadius: "0.75rem",
                padding: "1rem",
                border: `1px solid ${colors.border}`,
              }}
            >
              <Skeleton
                variant="text"
                width="50%"
                height={12}
                sx={{
                  marginBottom: "0.5rem",
                  bgcolor: colors.border,
                }}
              />
              <Skeleton
                variant="text"
                width="80%"
                height={20}
                sx={{
                  bgcolor: colors.border,
                }}
              />
            </div>
          </div>

          {/* Footer Metadata */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              paddingTop: "1rem",
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <Skeleton
              variant="text"
              width="60%"
              height={14}
              sx={{
                bgcolor: colors.mutedBg,
              }}
            />
            <Skeleton
              variant="text"
              width="40%"
              height={14}
              sx={{
                bgcolor: colors.mutedBg,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
