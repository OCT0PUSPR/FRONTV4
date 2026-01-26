"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Plus, Trash2, RefreshCcw, RouteIcon, CheckCircle, Settings, AlertCircle, Package, RefreshCw, CheckCircle2, Clock, Edit, Eye } from "lucide-react"
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import { StatCard } from "./components/StatCard"
import { RouteCard } from "./components/RouteCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Button } from "../@/components/ui/button"
import { Card } from "../@/components/ui/card"
import { Skeleton } from "@mui/material"
import { DataTable } from "./components/DataTable"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"
import { CustomInput } from "./components/CusotmInput"
import { IOSCheckbox } from "./components/IOSCheckbox"
import { NewCustomButton } from "./components/NewCustomButton"
import { CustomDropdown as NewCustomDropdown } from "./components/NewCustomDropdown"
import Alert from "./components/Alert"
import Toast from "./components/Toast"

interface Route {
  id: string
  name: string
  type: string
  sourceLocation: string
  destinationLocation: string
  rulesCount: number
  status: "active" | "inactive"
  applicableOn: {
    productCategories: boolean
    products: boolean
    packagings: boolean
    shippingMethods: boolean
    warehouses: boolean
    salesOrderLines: boolean
  }
  rules: Array<{
    action: string
    sourceLocation: string
    destinationLocation: string
  }>
}

export default function RoutesPage() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ;
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { colors } = useTheme()
  const { stockRoutes, stockRules, locations, stockPickingTypes, warehouses, fetchData, loading } = useData() as any
  const { uid } = useAuth()
  const { canCreatePage, canEditPage, canExportPage } = useCasl()
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [rulesCountFilter, setRulesCountFilter] = useState<string[]>([])
  const [fromFilter, setFromFilter] = useState<string[]>([])
  const [toFilter, setToFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<[string | null, string | null] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isSelectAll, setIsSelectAll] = useState<boolean | "indeterminate">(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [routeToDelete, setRouteToDelete] = useState<number | null>(null)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  
  // Column visibility state - default: 6 most important columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "type",
    "sourceLocation",
    "destinationLocation",
    "rulesCount",
  ])
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const isRTL = i18n.dir() === "rtl"
  const [refreshingRules, setRefreshingRules] = useState(false)
  const [rulesOverride, setRulesOverride] = useState<any[] | null>(null)

  // Route modal editable state (used for both edit and create)
  const [isCreateRoute, setIsCreateRoute] = useState(false)
  const [routeDirty, setRouteDirty] = useState(false)
  const [routeForm, setRouteForm] = useState<any>({
    name: "",
    product_categ_selectable: false,
    product_selectable: false,
    packaging_selectable: false,
    shipping_selectable: false,
    warehouse_selectable: false,
    sale_selectable: false,
    warehouse_ids: [] as number[],
  })

  // Rule modal state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [isCreateRule, setIsCreateRule] = useState(false)
  const [ruleDirty, setRuleDirty] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [ruleForm, setRuleForm] = useState<any>({
    name: "",
    action: "pull",
    picking_type_id: "",
    location_src_id: "",
    location_dest_id: "",
    procure_method: "make_to_stock",
    auto: "manual",
    route_id: "",
    group_propagation_option: "none",
    propagate_carrier: false,
    delay: "",
  })

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
    if (!Array.isArray(stockRoutes) || !stockRoutes.length) fetchData("stockRoutes")
    if (!Array.isArray(stockRules) || !stockRules.length) fetchData("stockRules")
    if (!Array.isArray(locations) || !locations.length) fetchData("locations")
    if (!Array.isArray(stockPickingTypes) || !stockPickingTypes.length) fetchData("stockPickingTypes")
    if (!Array.isArray(warehouses) || !warehouses.length) fetchData("warehouses")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getSessionId = () => localStorage.getItem("sessionId") || sessionStorage.getItem("sessionId")

  // Get Odoo headers for API requests
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = localStorage.getItem('odoo_base_url') || 'https://egy.thetalenter.net'
    const db = localStorage.getItem('odoo_db') || 'odoodb1'
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

  const routesData: Route[] = useMemo(() => {
    const sourceRules = rulesOverride ?? stockRules ?? []
    const rulesByRoute: Record<number, any[]> = {}
    for (const rule of sourceRules as any[]) {
      const rid = rule.route_id?.[0]
      if (!rid) continue
      if (!rulesByRoute[rid]) rulesByRoute[rid] = []
      rulesByRoute[rid].push(rule)
    }
    const mapAction = (a?: string) => {
      if (!a) return ""
      const m: Record<string, string> = { pull: "Pull From", push: "Push To", buy: "Buy", manufacture: "Manufacture" }
      return m[a] || a
    }
    return (stockRoutes || []).map((r: any, idx: number) => {
      const rid = r.id ?? idx
      const related = rulesByRoute[rid] || []
      const firstRule = related[0]
      const rules = related.map((ru: any) => ({
        id: String(ru.id ?? ""),
        action: mapAction(ru.action),
        sourceLocation: ru.location_src_id?.[1] ?? ru.location_id?.[1] ?? "",
        destinationLocation: ru.location_id?.[1] ?? "",
        raw: ru,
      }))
      const applicableOn = {
        productCategories: !!(r.product_categ_selectable || r.categ_selectable),
        products: !!r.product_selectable,
        packagings: !!r.packaging_selectable,
        shippingMethods: !!(r.shipping_selectable || r.sale_selectable),
        warehouses: !!r.warehouse_selectable,
        salesOrderLines: !!r.sale_order_line_selectable,
      }
      const type = firstRule?.picking_type_id?.[1] || (related.length ? "Route" : "Route")
      return {
        id: String(rid),
        name: r.name || "",
        type,
        sourceLocation: firstRule?.location_src_id?.[1] ?? firstRule?.location_id?.[1] ?? "",
        destinationLocation: firstRule?.location_id?.[1] ?? "",
        rulesCount: related.length,
        status: r.active === false ? "inactive" : "active",
        applicableOn,
        rules,
      } as Route
    })
  }, [stockRoutes, stockRules, rulesOverride])

  const filteredRoutes = useMemo(() => {
    return routesData.filter((route) => {
      const matchesSearch = route.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter.length === 0 || typeFilter.includes(route.type)
      const matchesFrom = fromFilter.length === 0 || fromFilter.includes(route.sourceLocation)
      const matchesTo = toFilter.length === 0 || toFilter.includes(route.destinationLocation)
      const rulesCountStr = route.rulesCount > 0 ? "has_rules" : "no_rules"
      const matchesRulesCount = rulesCountFilter.length === 0 || rulesCountFilter.includes(rulesCountStr)
      return matchesSearch && matchesType && matchesFrom && matchesTo && matchesRulesCount
    })
  }, [routesData, searchQuery, typeFilter, fromFilter, toFilter, rulesCountFilter])

  // Pagination - only for cards view
  const totalPages = Math.ceil(filteredRoutes.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRoutes = viewMode === "cards" ? filteredRoutes.slice(startIndex, endIndex) : filteredRoutes

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, typeFilter, fromFilter, toFilter, rulesCountFilter])

  const uniqueTypes = Array.from(new Set(routesData.map((r) => r.type).filter(Boolean)))
  const uniqueFrom = Array.from(new Set(routesData.map((r) => r.sourceLocation).filter(Boolean)))
  const uniqueTo = Array.from(new Set(routesData.map((r) => r.destinationLocation).filter(Boolean)))

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("routes")) {
      return
    }
    // Determine data to export
    let dataToExport = filteredRoutes
    if (options.scope === "selected") {
      dataToExport = filteredRoutes.filter((r) => rowSelection[String(r.id)])
    } else if (options.scope === "page") {
      dataToExport = paginatedRoutes
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
        header: t('Name'),
        accessor: (row: any) => row.name,
        isBold: true
      },
      type: {
        header: t('Type'),
        accessor: (row: any) => row.type || '-'
      },
      sourceLocation: {
        header: t('Source Location'),
        accessor: (row: any) => row.sourceLocation || '-'
      },
      destinationLocation: {
        header: t('Destination Location'),
        accessor: (row: any) => row.destinationLocation || '-'
      },
      rulesCount: {
        header: t('Rules Count'),
        accessor: (row: any) => row.rulesCount || 0
      },
      status: {
        header: t('Status'),
        accessor: (row: any) => row.status || 'active',
        isStatus: true
      },
    }

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Routes Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Active Routes'), value: data.filter((r: any) => r.status === 'active').length },
        { label: t('Inactive Routes'), value: data.filter((r: any) => r.status === 'inactive').length },
        { label: t('Total Rules'), value: data.reduce((sum: number, r: any) => sum + (r.rulesCount || 0), 0) }
      ]
    }

    exportData(options, dataToExport, config, dateRange)
    setIsExportModalOpen(false)
  }

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
      id: "type",
      header: t("Type"),
      cell: ({ row }: any) => {
        const type = row.original.type || ""
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {type}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "sourceLocation",
      header: t("Source Location"),
      cell: ({ row }: any) => {
        const location = row.original.sourceLocation || ""
        return (
          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
            {location || "-"}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "destinationLocation",
      header: t("Destination Location"),
      cell: ({ row }: any) => {
        const location = row.original.destinationLocation || ""
        return (
          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
            {location || "-"}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "rulesCount",
      header: t("Rules Count"),
      cell: ({ row }: any) => {
        const count = row.original.rulesCount || 0
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {count}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "status",
      header: t("Status"),
      cell: ({ row }: any) => {
        const status = row.original.status || "active"
        const statusTheme = {
          bg: status === "active" ? "rgba(67, 233, 123, 0.1)" : "rgba(79, 172, 254, 0.1)",
          text: status === "active" ? "#43e97b" : colors.action,
          label: status === "active" ? t("Active") : t("Inactive"),
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
      id: "applicableOn",
      header: t("Applicable On"),
      cell: ({ row }: any) => {
        const applicable = row.original.applicableOn || {}
        const items: string[] = []
        if (applicable.productCategories) items.push(t("Categories"))
        if (applicable.products) items.push(t("Products"))
        if (applicable.packagings) items.push(t("Packagings"))
        if (applicable.shippingMethods) items.push(t("Shipping Methods"))
        if (applicable.warehouses) items.push(t("Warehouses"))
        if (applicable.salesOrderLines) items.push(t("Sales Order Lines"))
        return (
          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
            {items.length > 0 ? items.join(", ") : "-"}
          </span>
        )
      },
      enableSorting: false,
    },
  ], [t, colors])

  const activeRoutes = routesData.filter((r) => r.status === "active").length
  const totalRules = routesData.reduce((sum, r) => sum + r.rulesCount, 0)

  const handleRouteClick = (route: Route) => {
    // Check edit permission before navigating
    if (!canEditPage("routes")) {
      return
    }
    navigate(`/routes/edit/${route.id}`)
  }

  const handleAddRoute = () => {
    navigate('/routes/create')
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedRoute(null)
    setIsCreateRoute(false)
  }

  const handleDeleteClick = (routeId: number) => {
    setRouteToDelete(routeId)
    setDeleteAlertOpen(true)
  }

  const deleteRouteAction = async () => {
    if (!routeToDelete) return
    const sessionId = getSessionId()
    if (!sessionId) {
      setToast({ text: t("No session ID found"), state: "error" })
      setDeleteAlertOpen(false)
      setRouteToDelete(null)
      return
    }
    try {
      const userId = uid ? Number(uid) : undefined
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/stock-routes/${routeToDelete}`, {
        method: "DELETE",
        headers: getOdooHeaders(),
        body: JSON.stringify({ sessionId, userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || t("Delete failed"))
      setToast({ text: t("Route deleted successfully"), state: "success" })
      setDeleteAlertOpen(false)
      setRouteToDelete(null)
      await fetchData("stockRoutes")
      if (isModalOpen && selectedRoute?.id === String(routeToDelete)) {
        closeModal()
      }
    } catch (error: any) {
      console.error("Delete failed:", error)
      setToast({ text: error?.message || t("Failed to delete route"), state: "error" })
      setDeleteAlertOpen(false)
      setRouteToDelete(null)
    }
  }

  const openCreateRule = () => {
    setIsCreateRule(true)
    setEditingRuleId(null)
    setRuleDirty(false)
    setRuleForm({
      name: "",
      action: "pull",
      picking_type_id: "",
      location_src_id: "",
      location_dest_id: "",
      procure_method: "make_to_stock",
      auto: "manual",
      route_id: selectedRoute ? Number(selectedRoute.id) : "",
      group_propagation_option: "none",
      propagate_carrier: false,
      delay: "",
    })
    setIsRuleModalOpen(true)
  }

  const openEditRule = (ru: any) => {
    const raw = ru?.raw || ru
    setIsCreateRule(false)
    setEditingRuleId(String(raw?.id || ""))
    setRuleDirty(false)
    setRuleForm({
      name: String(raw?.name || ""),
      action: String(raw?.action || "pull"),
      picking_type_id: Array.isArray(raw?.picking_type_id)
        ? String(raw.picking_type_id[0])
        : raw?.picking_type_id
          ? String(raw.picking_type_id)
          : "",
      location_src_id: Array.isArray(raw?.location_src_id)
        ? String(raw.location_src_id[0])
        : raw?.location_src_id
          ? String(raw.location_src_id)
          : "",
      location_dest_id: Array.isArray(raw?.location_dest_id)
        ? String(raw.location_dest_id[0])
        : raw?.location_dest_id
          ? String(raw.location_dest_id)
          : "",
      procure_method: String(raw?.procure_method || "make_to_stock"),
      auto: String(raw?.auto || "manual"),
      route_id: Array.isArray(raw?.route_id)
        ? String(raw.route_id[0])
        : raw?.route_id
          ? String(raw.route_id)
          : selectedRoute
            ? String(selectedRoute.id)
            : "",
      group_propagation_option: String(raw?.group_propagation_option || "none"),
      propagate_carrier: !!raw?.propagate_carrier,
      delay: raw?.delay != null ? String(raw.delay) : "",
    })
    setIsRuleModalOpen(true)
  }

  const handleSaveRule = async () => {
    try {
      const sessionId = getSessionId()
      if (!sessionId) throw new Error("No session ID found")
      const values: any = {
        name: ruleForm.name,
        action: ruleForm.action,
        procure_method: ruleForm.procure_method,
        auto: ruleForm.auto,
        group_propagation_option: ruleForm.group_propagation_option,
        propagate_carrier: !!ruleForm.propagate_carrier,
      }
      if (ruleForm.picking_type_id) values.picking_type_id = Number(ruleForm.picking_type_id)
      if (ruleForm.location_src_id) values.location_src_id = Number(ruleForm.location_src_id)
      if (ruleForm.location_dest_id) values.location_dest_id = Number(ruleForm.location_dest_id)
      if (ruleForm.route_id) values.route_id = Number(ruleForm.route_id)
      if (ruleForm.delay !== "") values.delay = Number(ruleForm.delay)

      const userId = uid ? Number(uid) : undefined
      let res: Response
      if (isCreateRule) {
        res = await fetch(`${API_BASE_URL}/stock-rules/create`, {
          method: "POST",
          headers: getOdooHeaders(),
          body: JSON.stringify({ sessionId, values, userId }),
        })
      } else {
        if (!editingRuleId) throw new Error("Missing rule id")
        res = await fetch(`${API_BASE_URL}/stock-rules/${editingRuleId}`, {
          method: "PUT",
          headers: getOdooHeaders(),
          body: JSON.stringify({ sessionId, values, userId }),
        })
      }
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json().catch(() => ({}))
      if (!data.success && !data.id) throw new Error(data.message || "Operation failed")
      setRuleDirty(false)
      setIsRuleModalOpen(false)
      // Directly refresh rules from backend to avoid going through data.tsx
      try {
        const sid = getSessionId()
        if (sid) {
          const res2 = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/stock-rules`, {
            method: "POST",
            headers: getOdooHeaders(),
            body: JSON.stringify({ sessionId: sid }),
          })
          const d2 = await res2.json().catch(() => ({}))
          if (res2.ok && d2?.success) setRulesOverride(d2.stockRules || [])
        }
      } catch {}
    } catch (e: any) {
      console.error(e?.message || "Failed to save rule")
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Receipt":
        return "#4A7FA7"
      case "Delivery":
        return "#0A1931"
      case "Transfer":
        return "#1A3D63"
      case "Manufacturing":
        return "#4A7FA7"
      default:
        return "#1A3D63"
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
                {t("Routes Management")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Configure and manage warehouse routing rules")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  fetchData("stockRoutes")
                  fetchData("stockRules")
                }}
                disabled={!!(loading?.stockRoutes || loading?.stockRules || refreshingRules)}
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
                <RefreshCcw className={`w-4 h-4 ${(loading?.stockRoutes || loading?.stockRules || refreshingRules) ? "animate-spin" : ""}`} />
                {(loading?.stockRoutes || loading?.stockRules || refreshingRules) ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("routes") && (
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
                  onClick={handleAddRoute}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("Add Route")}
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
          label={t("Total Routes")}
          value={routesData.length}
          icon={RouteIcon}
          gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
          delay={0}
        />
        <StatCard
          label={t("Active Routes")}
          value={activeRoutes}
          icon={CheckCircle}
          gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          delay={1}
        />
        <StatCard
          label={t("Total Rules")}
          value={totalRules}
          icon={Settings}
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          delay={2}
        />
        <StatCard
          label={t("Inactive Routes")}
          value={routesData.length - activeRoutes}
          icon={AlertCircle}
          gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
          delay={3}
        />
      </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search routes...")}
            statusFilter={typeFilter}
            onStatusChange={setTypeFilter}
            statusOptions={uniqueTypes}
            statusPlaceholder={t("Type")}
            toFilter={toFilter}
            onToChange={setToFilter}
            toOptions={uniqueTo}
            toPlaceholder={t("Destination")}
            fromFilter={fromFilter}
            onFromChange={setFromFilter}
            fromOptions={uniqueFrom}
            fromPlaceholder={t("Source")}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            isMobile={isMobile}
            showDateRange={false}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
            rulesCountFilter={rulesCountFilter}
            onRulesCountChange={setRulesCountFilter}
            rulesCountOptions={["has_rules", "no_rules"]}
            rulesCountPlaceholder={t("Rules Count")}
            rulesCountLabelMap={{
              "has_rules": t("Has Rules"),
              "no_rules": t("No Rules"),
            }}
            showRulesCountFilter={true}
          />

          {viewMode === "cards" ? (
            loading?.stockRoutes || loading?.stockRules ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <RouteCardSkeleton key={idx} colors={colors} />
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
                {paginatedRoutes.map((route, index) => (
                  <RouteCard key={route.id} route={route} onClick={() => handleRouteClick(route)} index={index} />
                ))}
              </div>
            )
          ) : (
            <DataTable
              data={filteredRoutes}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              onSelectAllChange={setIsSelectAll}
              onExport={canExportPage("routes") ? () => setIsExportModalOpen(true) : undefined}
              columns={columns}
              actions={(row) => {
                const routeId = (row as any).id
                return [
                  {
                    key: "view",
                    label: t("View"),
                    icon: Eye,
                    onClick: () => navigate(`/routes/view/${routeId}`),
                  },
                  ...(canEditPage("routes") ? [{
                    key: "edit",
                    label: t("Edit"),
                    icon: Edit,
                    onClick: () => navigate(`/routes/edit/${routeId}`),
                  }] : []),
                  ...(canEditPage("routes") ? [{
                    key: "delete",
                    label: t("Delete"),
                    icon: Trash2,
                    onClick: () => handleDeleteClick(Number(row.id)),
                  danger: true,
                }] : []),
              ]
            }}
              actionsLabel={t("Actions")}
              isRTL={isRTL}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              getRowIcon={(route: any) => {
                const status = route.status || "active"
                const hasRules = route.rulesCount > 0
                if (status === "active" && hasRules) {
                  return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
                } else if (status === "active") {
                  return { icon: Clock, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }
                } else {
                  return { icon: RouteIcon, gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)" }
                }
              }}
              isLoading={loading?.stockRoutes || loading?.stockRules}
              showPagination={true}
              defaultItemsPerPage={10}
            />
          )}

          {!loading?.stockRoutes && !loading?.stockRules && (
            <>

              {filteredRoutes.length === 0 && !loading?.stockRoutes && !loading?.stockRules && (
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
                    <RouteIcon size={28} color="#FFFFFF" />
                  </div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {t("No routes found")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                </div>
              )}

              {filteredRoutes.length > 0 && viewMode === "cards" && (
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

      {/* Edit Modal */}
      {isModalOpen && (selectedRoute || isCreateRoute) && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 1100,
          }}
          onClick={closeModal}
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
                <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary }}>
                  {isCreateRoute ? t("Add Route") : selectedRoute?.name || ""}
                </h2>
                <p style={{ fontSize: 13, color: colors.textSecondary }}>
                  {t("Configure route settings and rules")}
                </p>
              </div>
              <button
                onClick={closeModal}
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.card,
                  color: colors.textSecondary,
                  borderRadius: 8,
                  padding: "0.5rem",
                  cursor: "pointer",
                  fontSize: 20,
                  lineHeight: 1,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.cancel
                  e.currentTarget.style.color = "#FFFFFF"
                  e.currentTarget.style.borderColor = colors.cancel
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.card
                  e.currentTarget.style.color = colors.textSecondary
                  e.currentTarget.style.borderColor = colors.border
                }}
              >
                ✕
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

              {/* Name field */}
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
                <CustomInput
                  label={t("Name")}
                  type="text"
                  value={routeForm.name}
                  onChange={(v) => {
                    setRouteForm({ ...routeForm, name: v })
                    setRouteDirty(true)
                  }}
                  placeholder={t("Enter route name")}
                />
              </div>
              {/* Applicable On Section */}
              <div style={{ marginBottom: "1.5rem" }}>
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
                    {t("Applicable On")}
                  </h3>
                </div>
                <p
                  style={{
                    color: colors.textSecondary,
                    fontSize: "0.875rem",
                    marginBottom: "1rem",
                  }}
                >
                  {t("Select the places where this route can be selected")}
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "0.75rem",
                  }}
                >
                  <IOSCheckbox
                    checked={!!routeForm.product_categ_selectable}
                    onChange={(checked) => {
                      setRouteForm({ ...routeForm, product_categ_selectable: checked })
                      setRouteDirty(true)
                    }}
                    label={t("Products category")}
                  />
                  <IOSCheckbox
                    checked={!!routeForm.product_selectable}
                    onChange={(checked) => {
                      setRouteForm({ ...routeForm, product_selectable: checked })
                      setRouteDirty(true)
                    }}
                    label={t("Products")}
                  />
                  <IOSCheckbox
                    checked={!!routeForm.packaging_selectable}
                    onChange={(checked) => {
                      setRouteForm({ ...routeForm, packaging_selectable: checked })
                      setRouteDirty(true)
                    }}
                    label={t("Packagings")}
                  />
                  <IOSCheckbox
                    checked={!!routeForm.shipping_selectable}
                    onChange={(checked) => {
                      setRouteForm({ ...routeForm, shipping_selectable: checked })
                      setRouteDirty(true)
                    }}
                    label={t("Shipping Methods")}
                  />
                  <IOSCheckbox
                    checked={!!routeForm.warehouse_selectable}
                    onChange={(checked) => {
                      setRouteForm({ ...routeForm, warehouse_selectable: checked })
                      setRouteDirty(true)
                    }}
                    label={t("Warehouses:")}
                  />
                  {routeForm.warehouse_selectable && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <select
                        multiple
                        value={(routeForm.warehouse_ids || []).map((n: number) => String(n))}
                        onChange={(e) => {
                          const opts = Array.from(e.target.selectedOptions)
                            .map((o) => Number(o.value))
                            .filter((n) => Number.isFinite(n))
                          setRouteForm({ ...routeForm, warehouse_ids: opts })
                          setRouteDirty(true)
                        }}
                        style={{
                          width: "100%",
                          minHeight: 120,
                          padding: "0.5rem",
                          borderRadius: "0.5rem",
                          border: `2px solid ${colors.border}`,
                          background: colors.background,
                          color: colors.textPrimary,
                        }}
                      >
                        {(Array.isArray(warehouses) ? warehouses : []).map((w: any) => (
                          <option key={w.id} value={String(w.id)}>
                            {w.name ||
                              (Array.isArray(w.display_name) ? w.display_name[1] : w.display_name || `#${w.id}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <IOSCheckbox
                    checked={!!routeForm.sale_selectable}
                    onChange={(checked) => {
                      setRouteForm({ ...routeForm, sale_selectable: checked })
                      setRouteDirty(true)
                    }}
                    label={t("Sales Order Lines:")}
                  />
                </div>
              </div>

              {/* Rules Section */}
              {!isCreateRoute && (
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
                      {t("Rules")}
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
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <NewCustomButton
                          label={t("Refresh")}
                          backgroundColor="#FFFFFF"
                          icon={RefreshCw}
                          onClick={async () => {
                            if (refreshingRules) return
                            setRefreshingRules(true)
                            try {
                              const sid = localStorage.getItem("sessionId") || sessionStorage.getItem("sessionId")
                              if (!sid) throw new Error("No session ID")
                              const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/stock-rules`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ sessionId: sid }),
                              })
                              const data = await res.json().catch(() => ({}))
                              if (res.ok && data?.success) setRulesOverride(data.stockRules || [])
                            } catch (e) {
                              console.error("Direct rules refresh failed", e)
                            } finally {
                              setRefreshingRules(false)
                            }
                          }}
                          disabled={refreshingRules}
                        />
                        <NewCustomButton
                          label={t("Add rule")}
                          backgroundColor="#FFFFFF"
                          icon={Plus}
                          onClick={openCreateRule}
                        />
                      </div>
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
                            <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Action")}</th>
                            <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Source Location")}</th>
                            <th style={{ padding: ".5rem", fontWeight: 600 }}>{t("Destination Location")}</th>
                            <th style={{ padding: ".5rem", fontWeight: 600 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedRoute?.rules || []).map((rule, index) => (
                            <tr key={index} style={{ borderTop: `1px solid ${colors.border}` }}>
                              <td style={{ padding: ".5rem", color: colors.textPrimary, fontSize: 13 }}>
                                {rule.action}
                              </td>
                              <td style={{ padding: ".5rem", color: colors.textSecondary, fontSize: 13 }}>
                                {rule.sourceLocation || "—"}
                              </td>
                              <td style={{ padding: ".5rem", color: colors.textSecondary, fontSize: 13 }}>
                                {rule.destinationLocation || "—"}
                              </td>
                              <td style={{ padding: ".5rem" }}>
                                <button
                                  onClick={() => openEditRule(rule)}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "0.25rem",
                                    borderRadius: "0.25rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "all 0.2s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = colors.mutedBg
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "transparent"
                                  }}
                                >
                                  <Trash2 size={16} style={{ color: colors.textSecondary }} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {(!selectedRoute?.rules || selectedRoute.rules.length === 0) && (
                            <tr>
                              <td
                                colSpan={4}
                                style={{ padding: ".75rem", color: colors.textSecondary, textAlign: "center", fontSize: 13 }}
                              >
                                {t("No rules found")}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: colors.card,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {!isCreateRoute && canEditPage("routes") && (
                  <button
                    onClick={() => handleDeleteClick(selectedRoute ? Number(selectedRoute.id) : 0)}
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
                {(routeDirty || isCreateRoute) && (
                  <NewCustomButton
                    label={isCreateRoute ? t("Create") : t("Save Changes")}
                    backgroundColor="#25D0FE"
                    onClick={async () => {
                      try {
                        const sid = localStorage.getItem("sessionId") || sessionStorage.getItem("sessionId")
                        if (!sid) throw new Error("No session ID found")
                        const payload: any = {
                          name: routeForm.name,
                          product_categ_selectable: !!routeForm.product_categ_selectable,
                          product_selectable: !!routeForm.product_selectable,
                          packaging_selectable: !!routeForm.packaging_selectable,
                          shipping_selectable: !!routeForm.shipping_selectable,
                          warehouse_selectable: !!routeForm.warehouse_selectable,
                          sale_selectable: !!routeForm.sale_selectable,
                        }
                        if (Array.isArray(routeForm.warehouse_ids)) payload.warehouse_ids = routeForm.warehouse_ids

                        const userId = uid ? Number(uid) : undefined
                        let ok = false
                        if (isCreateRoute) {
                          const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/stock-routes/create`, {
                            method: "POST",
                            headers: getOdooHeaders(),
                            body: JSON.stringify({ sessionId: sid, values: payload, userId }),
                          })
                          const j = await res.json().catch(() => ({}))
                          ok = res.ok && (j?.success || j?.id)
                        } else {
                          const rid = selectedRoute ? selectedRoute.id : ""
                          if (!rid) throw new Error("Missing route id")
                          const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/stock-routes/${rid}`, {
                            method: "PUT",
                            headers: getOdooHeaders(),
                            body: JSON.stringify({ sessionId: sid, values: payload, userId }),
                          })
                          const j = await res.json().catch(() => ({}))
                          ok = res.ok && j?.success
                        }
                        if (ok) {
                          if (fetchData) await fetchData("stockRoutes")
                          setRouteDirty(false)
                          setIsModalOpen(false)
                        }
                      } catch (e) {
                        console.error("Save route failed", e)
                      }
                    }}
                  />
                )}
                <NewCustomButton
                  label={t("Close")}
                  backgroundColor="#FFFFFF"
                  onClick={closeModal}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Rule Edit Modal */}
      {isRuleModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 1100,
          }}
          onClick={() => setIsRuleModalOpen(false)}
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
                <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary }}>
                  {t(isCreateRule ? "Create Rule" : "Edit Rule")}
                </h2>
                <p style={{ fontSize: 13, color: colors.textSecondary }}>
                  {t("Configure rule parameters")}
                </p>
              </div>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.card,
                  color: colors.textSecondary,
                  borderRadius: 8,
                  padding: "0.5rem",
                  cursor: "pointer",
                  fontSize: 20,
                  lineHeight: 1,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.cancel
                  e.currentTarget.style.color = "#FFFFFF"
                  e.currentTarget.style.borderColor = colors.cancel
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.card
                  e.currentTarget.style.color = colors.textSecondary
                  e.currentTarget.style.borderColor = colors.border
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{ flex: 1, overflow: "auto", padding: "1.25rem", display: "grid", gap: "1rem" }}
            >
              <style>{`
                input:focus, textarea:focus, select:focus, button[role="combobox"]:focus {
                  outline: none !important;
                  border-color: #667eea !important;
                  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
                }
              `}</style>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: colors.textPrimary,
                  }}
                >
                  {t("Name")}
                </label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => {
                    setRuleForm({ ...ruleForm, name: e.target.value })
                    setRuleDirty(true)
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.9375rem",
                    outline: "none",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.action
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: colors.textPrimary,
                  }}
                >
                  {t("Action")}
                </label>
                <select
                  value={ruleForm.action}
                  onChange={(e) => {
                    setRuleForm({ ...ruleForm, action: e.target.value })
                    setRuleDirty(true)
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: `2px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                >
                  <option value="pull">{t("Pull From")}</option>
                  <option value="push">{t("Push To")}</option>
                  <option value="pull_push">{t("Pull & Push")}</option>
                  <option value="manufacture">{t("Manufacture")}</option>
                  <option value="buy">{t("Buy")}</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: colors.textPrimary,
                  }}
                >
                  {t("Operation type")}
                </label>
                <select
                  value={ruleForm.picking_type_id}
                  onChange={(e) => {
                    setRuleForm({ ...ruleForm, picking_type_id: e.target.value })
                    setRuleDirty(true)
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: `2px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                >
                  <option value="">{t("Select operation type")}</option>
                  {(Array.isArray(stockPickingTypes) ? stockPickingTypes : []).map((pt: any) => (
                    <option key={pt.id} value={String(pt.id)}>
                      {pt.name || pt.display_name || `#${pt.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      marginBottom: "0.5rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {t("Source Location")}
                  </label>
                  <select
                    value={ruleForm.location_src_id}
                    onChange={(e) => {
                      setRuleForm({ ...ruleForm, location_src_id: e.target.value })
                      setRuleDirty(true)
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      border: `2px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.textPrimary,
                      fontSize: "0.95rem",
                      outline: "none",
                    }}
                  >
                    <option value="">{t("Select location")}</option>
                    {(Array.isArray(locations) ? locations : []).map((loc: any) => (
                      <option key={loc.id} value={String(loc.id)}>
                        {loc.complete_name ||
                          (Array.isArray(loc.display_name)
                            ? loc.display_name[1]
                            : loc.display_name || loc.name || `#${loc.id}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      marginBottom: "0.5rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {t("Destination Location")}
                  </label>
                  <select
                    value={ruleForm.location_dest_id}
                    onChange={(e) => {
                      setRuleForm({ ...ruleForm, location_dest_id: e.target.value })
                      setRuleDirty(true)
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      border: `2px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.textPrimary,
                      fontSize: "0.95rem",
                      outline: "none",
                    }}
                  >
                    <option value="">{t("Select location")}</option>
                    {(Array.isArray(locations) ? locations : []).map((loc: any) => (
                      <option key={loc.id} value={String(loc.id)}>
                        {loc.complete_name ||
                          (Array.isArray(loc.display_name)
                            ? loc.display_name[1]
                            : loc.display_name || loc.name || `#${loc.id}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: colors.textPrimary,
                  }}
                >
                  {t("Supply method")}
                </label>
                <select
                  value={ruleForm.procure_method}
                  onChange={(e) => {
                    setRuleForm({ ...ruleForm, procure_method: e.target.value })
                    setRuleDirty(true)
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: `2px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                >
                  <option value="make_to_stock">{t("Take From Stock")}</option>
                  <option value="make_to_order">{t("Trigger Another Rule")}</option>
                  <option value="mts_else_mto">{t("Take From Stock, if unavailable, Trigger Another Rule")}</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: colors.textPrimary,
                  }}
                >
                  {t("Automatic Move")}
                </label>
                <select
                  value={ruleForm.auto}
                  onChange={(e) => {
                    setRuleForm({ ...ruleForm, auto: e.target.value })
                    setRuleDirty(true)
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: `2px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                >
                  <option value="manual">{t("Manual Operation")}</option>
                  <option value="transparent">{t("Automatic No Step Added")}</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: colors.textPrimary,
                  }}
                >
                  {t("Route")}
                </label>
                <select
                  value={ruleForm.route_id}
                  onChange={(e) => {
                    setRuleForm({ ...ruleForm, route_id: e.target.value })
                    setRuleDirty(true)
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: `2px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                >
                  <option value="">{t("Select route")}</option>
                  {(Array.isArray(stockRoutes) ? stockRoutes : []).map((rt: any) => (
                    <option key={rt.id} value={String(rt.id)}>
                      {rt.name || rt.display_name || `#${rt.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: colors.textPrimary,
                  }}
                >
                  {t("Propagation of Procurement Group")}
                </label>
                <select
                  value={ruleForm.group_propagation_option}
                  onChange={(e) => {
                    setRuleForm({ ...ruleForm, group_propagation_option: e.target.value })
                    setRuleDirty(true)
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: `2px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                >
                  <option value="none">{t("Leave Empty")}</option>
                  <option value="propagate">{t("Propagate")}</option>
                  <option value="fixed">{t("Fixed")}</option>
                </select>
              </div>
              <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!ruleForm.propagate_carrier}
                  onChange={(e) => {
                    setRuleForm({ ...ruleForm, propagate_carrier: e.target.checked })
                    setRuleDirty(true)
                  }}
                />
                <span style={{ fontSize: "0.875rem", color: colors.textPrimary }}>{t("Propagation of carrier")}</span>
              </label>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: colors.textPrimary,
                  }}
                >
                  {t("Lead Time")}
                </label>
                <input
                  type="number"
                  value={ruleForm.delay}
                  onChange={(e) => {
                    setRuleForm({ ...ruleForm, delay: e.target.value })
                    setRuleDirty(true)
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: "0.9375rem",
                    outline: "none",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.action
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.action}15`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
              </div>
            </div>
            <div
              style={{
                padding: "1rem 1.5rem",
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <button
                onClick={() => setIsRuleModalOpen(false)}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  background: colors.card,
                  color: colors.textPrimary,
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.mutedBg
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.card
                }}
              >
                {t("Cancel")}
              </button>
              <button
                onClick={handleSaveRule}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: 8,
                  border: "none",
                  background: colors.action,
                  color: "#FFFFFF",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(82, 104, 237, 0.25)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)"
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(82, 104, 237, 0.35)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(82, 104, 237, 0.25)"
                }}
              >
                {t(isCreateRule ? "Create" : "Save")}
              </button>
            </div>
          </Card>
        </div>
      )}

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
          
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

      {canExportPage("routes") && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          totalRecords={filteredRoutes.length}
          selectedCount={Object.keys(rowSelection).length}
          isSelectAll={isSelectAll === true}
        />
      )}

      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        /> 
      )}

      <Alert
        isOpen={deleteAlertOpen}
        type="delete"
        title={t("Delete this route?")}
        message={t("This route will be permanently deleted and cannot be recovered.")}
        onClose={() => {
          setDeleteAlertOpen(false)
          setRouteToDelete(null)
        }}
        onConfirm={deleteRouteAction}
        confirmLabel={t("Delete")}
        cancelLabel={t("Cancel")}
      />
    </div>
  )
}

// Skeleton component matching MoveCard structure
function RouteCardSkeleton({ colors }: { colors?: any }) {
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
              {/* Route name */}
              <Skeleton
                variant="text"
                width="60%"
                height={24}
                sx={{
                  marginBottom: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              {/* Type */}
              <Skeleton
                variant="text"
                width="30%"
                height={14}
                sx={{
                  bgcolor: colors.mutedBg,
                }}
              />
            </div>
          </div>

          {/* Details Visualization */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0" }}>
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
        </div>
      </div>
    </div>
  )
}
