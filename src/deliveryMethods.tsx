"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/theme"
import { Plus, Truck, Banknote, Globe, Package, X, ChevronDown, RefreshCcw, CheckCircle2, FileText, Trash2, Edit, Eye } from "lucide-react"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import { StatCard } from "./components/StatCard"
import { DeliveryMethodCard } from "./components/DeliveryMethodCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Button } from "../@/components/ui/button"
import { Skeleton } from "@mui/material"
import { Card } from "../@/components/ui/card"
import { CustomInput } from "./components/CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./components/NewCustomDropdown"
import { NewCustomButton } from "./components/NewCustomButton"
import Toast from "./components/Toast"
import Alert from "./components/Alert"
import { DataTable } from "./components/DataTable"

type TabType = "general" | "pricing" | "availability" | "description"

export default function DeliveryMethodsPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const navigate = useNavigate()
  const { colors } = useTheme()
  const { products, stockRoutes, fetchData } = useData() as any
  const { sessionId, uid } = useAuth()
  const { canCreatePage, canEditPage } = useCasl()
  const [searchQuery, setSearchQuery] = useState("")
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<string[]>([])
  const [publishedFilter, setPublishedFilter] = useState<string[]>([])
  const [routeFilter, setRouteFilter] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  
  // Column visibility state - default: 6 most important columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "delivery_type",
    "fixed_price",
    "status",
    "tracking_url",
  ])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<TabType>("general")
  const isTab = (tab: TabType) => activeTab === tab
  const [refreshing, setRefreshing] = useState(false)
  const [carriers, setCarriers] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [rulesRefreshing, setRulesRefreshing] = useState(false)
  const [newRuleDrafts, setNewRuleDrafts] = useState<any[]>([])
  const [currencySymbol, setCurrencySymbol] = useState<string>("$")
  const [countries, setCountries] = useState<any[]>([])
  const [statesList, setStatesList] = useState<any[]>([])
  const [zipPrefixes, setZipPrefixes] = useState<any[]>([])
  const [productTags, setProductTags] = useState<any[]>([])
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [carrierToDelete, setCarrierToDelete] = useState<number | null>(null)

  const [formData, setFormData] = useState<any>({
    name: "",
    delivery_type: "fixed",
    route_ids: [] as string[],
    margin: "",
    fixed_margin: "",
    product_id: "",
    tracking_url: "",
    country_ids: [] as string[],
    state_ids: [] as string[],
    zip_prefix_ids: [] as string[],
    max_weight: "",
    max_volume: "",
    must_have_tag_ids: [] as string[],
    excluded_tag_ids: [] as string[],
    website_description: "",
    carrier_description: "",
  })

  // Get Odoo headers for API requests
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!sessionId) return
      try {
        setRefreshing(true)
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/delivery-carriers`, {
          method: "POST",
          headers: getOdooHeaders(),
          body: JSON.stringify({ sessionId }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.success) setCarriers(Array.isArray(data.deliveryCarriers) ? data.deliveryCarriers : [])
      } finally {
        setRefreshing(false)
      }
    }
    load()
    if (!Array.isArray(products) || !products.length) fetchData("products")
    if (!Array.isArray(stockRoutes) || !stockRoutes.length) fetchData("stockRoutes")
    ;(async () => {
      try {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/currencies`, {
          method: "POST",
          headers: getOdooHeaders(),
          body: JSON.stringify({ sessionId }),
        })
        const data = await res.json().catch(() => ({}))
        if (data?.success && Array.isArray(data?.currencies) && data.currencies.length > 0) {
          // Find default currency (id === 1) or use the first one
          const defaultCur = data.currencies.find((c: any) => c.id === 1) || data.currencies[0]
          if (defaultCur?.symbol) setCurrencySymbol(defaultCur.symbol)
        }
      } catch {}
    })()
    ;(async () => {
      try {
        if (!sessionId) return
        const [cc, ss, zz, tt] = await Promise.all([
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/countries`, {
            method: "POST",
            headers: getOdooHeaders(),
            body: JSON.stringify({ sessionId }),
          }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/states`, {
            method: "POST",
            headers: getOdooHeaders(),
            body: JSON.stringify({ sessionId }),
          }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/zip-prefixes`, {
            method: "POST",
            headers: getOdooHeaders(),
            body: JSON.stringify({ sessionId }),
          }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/product-tags`, {
            method: "POST",
            headers: getOdooHeaders(),
            body: JSON.stringify({ sessionId }),
          }),
        ])
        const [cjson, sjson, zjson, tjson] = await Promise.all([
          cc.json().catch(() => ({})),
          ss.json().catch(() => ({})),
          zz.json().catch(() => ({})),
          tt.json().catch(() => ({})),
        ])
        if (cjson?.countries) setCountries(cjson.countries)
        if (sjson?.states) setStatesList(sjson.states)
        if (zjson?.zipPrefixes) setZipPrefixes(zjson.zipPrefixes)
        if (tjson?.productTags) setProductTags(tjson.productTags)
      } catch {}
    })()
  }, [sessionId])

  const totalMethods = carriers.length
  const publishedMethods = carriers.filter((m: any) => m.website_published || m.active !== false).length
  const averagePrice = useMemo(() => {
    const list = Array.isArray(carriers) ? carriers : []
    if (!list.length) return "0.00"
    const sum = list.reduce((acc: number, c: any) => acc + Number(c.fixed_price || 0), 0)
    return (sum / list.length).toFixed(2)
  }, [carriers])
  const mostUsedProvider = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of carriers) counts[c.delivery_type || "fixed"] = (counts[c.delivery_type || "fixed"] || 0) + 1
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "fixed"
    return best === "base_on_rule" ? t("Based on Rules") : t("Fixed Price")
  }, [carriers, t])

  const onChange = (patch: Partial<typeof formData>) => {
    setFormData((f) => ({ ...f, ...patch }))
    setDirty(true)
  }

  const handleEditDeliveryMethod = (method?: any) => {
    // Check edit permission before navigating
    if (!canEditPage("delivery-methods")) {
      return
    }
    if (method?.id) {
      navigate(`/delivery-methods/edit/${method.id}`)
    }
  }

  const handleAddDeliveryMethod = () => {
    navigate('/delivery-methods/create')
  }

  const openModal = async (method?: any) => {
    // Legacy function - keeping for compatibility but redirecting to navigation
    if (method) {
      handleEditDeliveryMethod(method)
    } else {
      handleAddDeliveryMethod()
    }
  }

  const _legacyOpenModal = async (method?: any) => {
    // Check edit permission before opening modal
    if (!canEditPage("delivery-methods")) {
      return
    }
    if (method) {
      setSelectedMethod(method)
      setFormData({
        name: method.name || "",
        delivery_type: method.delivery_type || "fixed",
        route_ids: (Array.isArray(method.route_ids) ? method.route_ids : []).map((id: any) =>
          String(Array.isArray(id) ? id[0] : id),
        ),
        margin: String(method.margin ?? ""),
        fixed_margin: String(method.fixed_margin ?? ""),
        product_id: String(Array.isArray(method.product_id) ? method.product_id[0] : method.product_id || ""),
        tracking_url: method.tracking_url || "",
        country_ids: (Array.isArray(method.country_ids) ? method.country_ids : []).map((id: any) =>
          String(Array.isArray(id) ? id[0] : id),
        ),
        state_ids: (Array.isArray(method.state_ids) ? method.state_ids : []).map((id: any) =>
          String(Array.isArray(id) ? id[0] : id),
        ),
        zip_prefix_ids: (Array.isArray(method.zip_prefix_ids) ? method.zip_prefix_ids : []).map((id: any) =>
          String(Array.isArray(id) ? id[0] : id),
        ),
        max_weight: String(method.max_weight ?? ""),
        max_volume: String(method.max_volume ?? ""),
        must_have_tag_ids: (Array.isArray(method.must_have_tag_ids) ? method.must_have_tag_ids : []).map((id: any) =>
          String(Array.isArray(id) ? id[0] : id),
        ),
        excluded_tag_ids: (Array.isArray(method.excluded_tag_ids) ? method.excluded_tag_ids : []).map((id: any) =>
          String(Array.isArray(id) ? id[0] : id),
        ),
        website_description: method.website_description || "",
        carrier_description: method.carrier_description || "",
      })
    } else {
      setSelectedMethod(null)
      setFormData({
        name: "",
        delivery_type: "fixed",
        route_ids: [],
        margin: "",
        fixed_margin: "",
        product_id: "",
        tracking_url: "",
        country_ids: [],
        state_ids: [],
        zip_prefix_ids: [],
        max_weight: "",
        max_volume: "",
        must_have_tag_ids: [],
        excluded_tag_ids: [],
        website_description: "",
        carrier_description: "",
      })
    }
    setActiveTab("general")
    setDirty(false)
    setIsModalOpen(true)
    const carrierId = method?.id
    if (carrierId && sessionId) {
      try {
        setRulesRefreshing(true)
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/delivery-price-rules`, {
          method: "POST",
          headers: getOdooHeaders(),
          body: JSON.stringify({ sessionId, carrier_id: carrierId }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.success) setRules(data.deliveryPriceRules || [])
      } finally {
        setRulesRefreshing(false)
      }
    } else {
      setRules([])
    }
  }

  const closeModal = (skipDirtyCheck = false) => {
    if (skipDirtyCheck || !dirty) {
      setIsModalOpen(false)
      setSelectedMethod(null)
      setDirty(false)
    }
  }

  const handleDeleteClick = (carrierId: number) => {
    setCarrierToDelete(carrierId)
    setDeleteAlertOpen(true)
  }

  const deleteCarrierAction = async () => {
    if (!carrierToDelete) return
    const sessionId = localStorage.getItem("sessionId") || sessionStorage.getItem("sessionId")
    if (!sessionId) {
      setToast({ text: t("No session ID found"), state: "error" })
      setDeleteAlertOpen(false)
      setCarrierToDelete(null)
      return
    }
    try {
      const userId = uid ? Number(uid) : undefined
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/delivery-carriers/${carrierToDelete}`, {
        method: "DELETE",
        headers: getOdooHeaders(),
        body: JSON.stringify({ sessionId, userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || t("Delete failed"))
      setToast({ text: t("Delivery method deleted successfully"), state: "success" })
      setDeleteAlertOpen(false)
      setCarrierToDelete(null)
      // Refresh carriers
      setRefreshing(true)
      try {
        const res2 = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/delivery-carriers`, {
          method: "POST",
          headers: getOdooHeaders(),
          body: JSON.stringify({ sessionId }),
        })
        const data2 = await res2.json().catch(() => ({}))
        if (res2.ok && data2?.success) setCarriers(data2.deliveryCarriers || [])
      } finally {
        setRefreshing(false)
      }
      if (isModalOpen && selectedMethod?.id === carrierToDelete) {
        setIsModalOpen(false)
        setSelectedMethod(null)
      }
    } catch (error: any) {
      console.error("Delete failed:", error)
      setToast({ text: error?.message || t("Failed to delete delivery method"), state: "error" })
      setDeleteAlertOpen(false)
      setCarrierToDelete(null)
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
      const values: any = {
      name: formData.name,
      delivery_type: formData.delivery_type,
      route_ids: Array.isArray(formData.route_ids)
        ? [[6, 0, formData.route_ids.map((x: string) => Number(x))]]
        : undefined,
      margin: formData.margin === "" ? 0 : Number(formData.margin),
      fixed_margin: formData.fixed_margin === "" ? 0 : Number(formData.fixed_margin),
      product_id: formData.product_id ? Number(formData.product_id) : false,
      tracking_url: formData.tracking_url || "",
      country_ids: Array.isArray(formData.country_ids)
        ? [[6, 0, formData.country_ids.map((x: string) => Number(x))]]
        : undefined,
      state_ids: Array.isArray(formData.state_ids)
        ? [[6, 0, formData.state_ids.map((x: string) => Number(x))]]
        : undefined,
      zip_prefix_ids: Array.isArray(formData.zip_prefix_ids)
        ? [[6, 0, formData.zip_prefix_ids.map((x: string) => Number(x))]]
        : undefined,
      max_weight: formData.max_weight === "" ? 0 : Number(formData.max_weight),
      max_volume: formData.max_volume === "" ? 0 : Number(formData.max_volume),
      must_have_tag_ids: Array.isArray(formData.must_have_tag_ids)
        ? [[6, 0, formData.must_have_tag_ids.map((x: string) => Number(x))]]
        : undefined,
      excluded_tag_ids: Array.isArray(formData.excluded_tag_ids)
        ? [[6, 0, formData.excluded_tag_ids.map((x: string) => Number(x))]]
        : undefined,
      website_description: formData.website_description || "",
      carrier_description: formData.carrier_description || "",
    }
      const base = API_CONFIG.BACKEND_BASE_URL
      const userId = uid ? Number(uid) : undefined
      let res
      if (selectedMethod?.id) {
        res = await fetch(`${base}/delivery-carriers/${selectedMethod.id}`, {
          method: "PUT",
          headers: getOdooHeaders(),
          body: JSON.stringify({ sessionId, values, userId }),
        })
      } else {
        res = await fetch(`${base}/delivery-carriers/create`, {
          method: "POST",
          headers: getOdooHeaders(),
          body: JSON.stringify({ sessionId, values, userId }),
        })
      }
      const data = await res.json().catch(() => ({}))
      if (res.ok && (data?.success || data?.id)) {
        setRefreshing(true)
        try {
          const refreshRes = await fetch(`${base}/delivery-carriers`, {
            method: "POST",
            headers: getOdooHeaders(),
            body: JSON.stringify({ sessionId }),
          })
          const refreshData = await refreshRes.json().catch(() => ({}))
          if (refreshRes.ok && refreshData?.success) setCarriers(refreshData.deliveryCarriers || [])
        } finally {
          setRefreshing(false)
        }
        setDirty(false)
        setToast({
          text: selectedMethod?.id
            ? t("Delivery method updated successfully")
            : t("Delivery method created successfully"),
          state: "success",
        })
        setTimeout(() => {
          setToast(null)
          closeModal(true)
        }, 1200)
      } else {
        const errMsg =
          data?.message ||
          (selectedMethod?.id
            ? t("Failed to update delivery method")
            : t("Failed to create delivery method"))
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

  const filteredMethods = useMemo(() => {
    return carriers.filter((method: any) => {
      const matchesSearch = String(method.name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesDeliveryType = deliveryTypeFilter.length === 0 || deliveryTypeFilter.includes(method.delivery_type || "")
      const isPublished = method.website_published || method.active !== false
      const publishedStatus = isPublished ? "published" : "draft"
      const matchesPublished = publishedFilter.length === 0 || publishedFilter.includes(publishedStatus)
      const methodRoutes = Array.isArray(method.route_ids) ? method.route_ids.map((r: any) => String(Array.isArray(r) ? r[0] : r)) : []
      const matchesRoute = routeFilter.length === 0 || routeFilter.some((rf) => methodRoutes.includes(rf))
      return matchesSearch && matchesDeliveryType && matchesPublished && matchesRoute
    })
  }, [carriers, searchQuery, deliveryTypeFilter, publishedFilter, routeFilter])

  // Pagination - only for cards view
  const totalPages = Math.ceil(filteredMethods.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedMethods = viewMode === "cards" ? filteredMethods.slice(startIndex, endIndex) : filteredMethods

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, deliveryTypeFilter, publishedFilter, routeFilter])

  // Get unique values for filters
  const uniqueDeliveryTypes = useMemo(() => {
    return Array.from(new Set(carriers.map((c: any) => c.delivery_type || "fixed").filter(Boolean))) as string[]
  }, [carriers])

  const uniqueRoutes = useMemo(() => {
    const allRoutes = carriers.flatMap((c: any) => {
      const routes = Array.isArray(c.route_ids) ? c.route_ids : []
      return routes.map((r: any) => {
        const routeId = Array.isArray(r) ? r[0] : r
        const routeName = Array.isArray(r) ? r[1] : (stockRoutes.find((sr: any) => sr.id === routeId)?.name || String(routeId))
        return { id: String(routeId), name: routeName }
      })
    })
    const unique = Array.from(new Map(allRoutes.map(r => [r.id, r])).values())
    return unique.map(r => r.id)
  }, [carriers, stockRoutes])

  const routeLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    carriers.forEach((c: any) => {
      const routes = Array.isArray(c.route_ids) ? c.route_ids : []
      routes.forEach((r: any) => {
        const routeId = String(Array.isArray(r) ? r[0] : r)
        const routeName = Array.isArray(r) ? r[1] : (stockRoutes.find((sr: any) => sr.id === routeId)?.name || String(routeId))
        if (routeId && !map[routeId]) {
          map[routeId] = routeName
        }
      })
    })
    return map
  }, [carriers, stockRoutes])

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
      id: "delivery_type",
      header: t("Delivery Type"),
      cell: ({ row }: any) => {
        const type = row.original.delivery_type || "fixed"
        const label = type === "base_on_rule" ? t("Based on Rules") : t("Fixed Price")
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {label}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "fixed_price",
      header: t("Fixed Price"),
      cell: ({ row }: any) => {
        const price = row.original.fixed_price || 0
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {currencySymbol}{price.toFixed(2)}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "margin",
      header: t("Margin"),
      cell: ({ row }: any) => {
        const margin = row.original.margin || 0
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {margin}%
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "fixed_margin",
      header: t("Fixed Margin"),
      cell: ({ row }: any) => {
        const fixedMargin = row.original.fixed_margin || 0
        return (
          <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
            {currencySymbol}{fixedMargin.toFixed(2)}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "status",
      header: t("Status"),
      cell: ({ row }: any) => {
        const isPublished = row.original.website_published || row.original.active !== false
        const statusTheme = {
          bg: isPublished ? "rgba(67, 233, 123, 0.1)" : "rgba(79, 172, 254, 0.1)",
          text: isPublished ? "#43e97b" : colors.action,
          label: isPublished ? t("Published") : t("Draft"),
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
      id: "tracking_url",
      header: t("Tracking URL"),
      cell: ({ row }: any) => {
        const url = row.original.tracking_url || ""
        return (
          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
            {url || "-"}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "routes",
      header: t("Routes"),
      cell: ({ row }: any) => {
        const routes = Array.isArray(row.original.route_ids) ? row.original.route_ids : []
        const routeNames = routes.map((r: any) => {
          const routeId = Array.isArray(r) ? r[0] : r
          const routeName = Array.isArray(r) ? r[1] : (stockRoutes.find((sr: any) => sr.id === routeId)?.name || String(routeId))
          return routeName
        }).filter(Boolean)
        return (
          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
            {routeNames.length > 0 ? routeNames.join(", ") : "-"}
          </span>
        )
      },
      enableSorting: false,
    },
    {
      id: "max_weight",
      header: t("Max Weight"),
      cell: ({ row }: any) => {
        const weight = row.original.max_weight || 0
        return (
          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
            {weight > 0 ? `${weight} kg` : "-"}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "max_volume",
      header: t("Max Volume"),
      cell: ({ row }: any) => {
        const volume = row.original.max_volume || 0
        return (
          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
            {volume > 0 ? `${volume} m³` : "-"}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "countries",
      header: t("Countries"),
      cell: ({ row }: any) => {
        const countryIds = Array.isArray(row.original.country_ids) ? row.original.country_ids : []
        const countryNames = countryIds.map((c: any) => {
          const countryId = Array.isArray(c) ? c[0] : c
          const countryName = Array.isArray(c) ? c[1] : (countries.find((cnt: any) => cnt.id === countryId)?.name || String(countryId))
          return countryName
        }).filter(Boolean)
        return (
          <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
            {countryNames.length > 0 ? countryNames.join(", ") : "-"}
          </span>
        )
      },
      enableSorting: false,
    },
  ], [t, colors, currencySymbol, stockRoutes, countries])

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
                {t("Delivery Methods")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Manage shipping methods and pricing rules")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (!sessionId) return
                  try {
                    setRefreshing(true)
                    const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/delivery-carriers`, {
                      method: "POST",
                      headers: getOdooHeaders(),
                      body: JSON.stringify({ sessionId }),
                    })
                    const data = await res.json().catch(() => ({}))
                    if (res.ok && data?.success)
                      setCarriers(Array.isArray(data.deliveryCarriers) ? data.deliveryCarriers : [])
                  } finally {
                    setRefreshing(false)
                  }
                }}
                disabled={refreshing}
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
                <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("delivery-methods") && (
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
                  onClick={() => openModal()}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("Add Delivery Method")}
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
          label={t("Total Methods")}
          value={totalMethods}
          icon={Truck}
          gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
          delay={0}
        />
        <StatCard
          label={t("Published")}
          value={publishedMethods}
          icon={Package}
          gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          delay={1}
        />
        <StatCard
          label={t("Average Price")}
          value={`${currencySymbol}${averagePrice}`}
          icon={Banknote}
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          delay={2}
        />
        <StatCard
          label={t("Most Used Provider")}
          value={mostUsedProvider}
          icon={Globe}
          gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
          delay={3}
        />
      </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search delivery methods...")}
            statusFilter={deliveryTypeFilter}
            onStatusChange={setDeliveryTypeFilter}
            statusOptions={uniqueDeliveryTypes}
            statusPlaceholder={t("Delivery Type")}
            statusLabelMap={{
              "fixed": t("Fixed Price"),
              "base_on_rule": t("Based on Rules"),
            }}
            toFilter={publishedFilter}
            onToChange={setPublishedFilter}
            toOptions={["published", "draft"]}
            toPlaceholder={t("Status")}
            toLabelMap={{
              "published": t("Published"),
              "draft": t("Draft"),
            }}
            fromFilter={routeFilter}
            onFromChange={setRouteFilter}
            fromOptions={uniqueRoutes}
            fromPlaceholder={t("Routes")}
            fromLabelMap={routeLabelMap}
            showDateRange={false}
            isMobile={isMobile}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {viewMode === "cards" ? (
            refreshing ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                gap: "1.25rem",
              }}
            >
              {Array.from({ length: itemsPerPage }).map((_, idx) => (
                <DeliveryMethodCardSkeleton key={idx} colors={colors} />
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
                {paginatedMethods.map((method, idx) => (
                  <DeliveryMethodCard
                    key={method.id}
                    method={method}
                    onClick={canEditPage("delivery-methods") ? () => handleEditDeliveryMethod(method) : undefined}
                    index={idx}
                    currencySymbol={currencySymbol}
                  />
                ))}
              </div>
            )
          ) : (
            <DataTable
              data={filteredMethods}
              columns={columns}
              isLoading={refreshing}
              actions={(row) => [
                {
                  key: "view",
                  label: t("View"),
                  icon: Eye,
                  onClick: () => navigate(`/delivery-methods/view/${row.id}`),
                },
                ...(canEditPage("delivery-methods") ? [{
                  key: "edit",
                  label: t("Edit"),
                  icon: Edit,
                  onClick: () => handleEditDeliveryMethod(row),
                }] : []),
                ...(canEditPage("delivery-methods") ? [{
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
              getRowIcon={(method: any) => {
                const isPublished = method.website_published || method.active !== false
                return {
                  icon: isPublished ? CheckCircle2 : FileText,
                  gradient: isPublished 
                    ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                    : "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
                }
              }}
            />
          )}

              {filteredMethods.length === 0 && !refreshing && (
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
                    <Truck size={28} color="#FFFFFF" />
                  </div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {t("No delivery methods found")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                </div>
              )}

              {filteredMethods.length > 0 && viewMode === "cards" && (
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
          onClick={() => closeModal()}
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
                  {selectedMethod ? t("Edit Delivery Method") : t("New Delivery Method")}
                </h2>
                <p style={{ fontSize: 13, color: "#000" }}>
                  {t("Configure shipping method and pricing rules")}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "4px",
                padding: "16px 32px",
                borderBottom: `2px solid ${colors.border}`,
                background: colors.mutedBg,
              }}
            >
              {(["general", "pricing", "availability", "description"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as TabType)}
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "10px",
                    background: activeTab === tab ? colors.card : "transparent",
                    color: activeTab === tab ? colors.textPrimary : colors.textSecondary,
                    fontSize: "14px",
                    fontWeight: activeTab === tab ? "600" : "500",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: activeTab === tab ? "0 2px 8px rgba(0, 0, 0, 0.1)" : "none",
                  }}
                >
                  {t(tab.charAt(0).toUpperCase() + tab.slice(1))}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
              <style>{`
                input:focus, textarea:focus, select:focus, button[role="combobox"]:focus {
                  outline: none !important;
                  border-color: #667eea !important;
                  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
                }
              `}</style>
              <>
                {isTab("general") && (
                  <div>
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
                          label={t("Delivery Method Name")}
                          type="text"
                          value={formData.name || ""}
                          onChange={(v) => onChange({ name: v })}
                          placeholder={t("e.g. UPS Express")}
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <NewCustomDropdown
                        label={t("Provider")}
                        values={[t("Based on Rules"), t("Fixed Price")]}
                        type="single"
                        placeholder={t("Select provider")}
                        defaultValue={
                          formData.delivery_type === "base_on_rule" ? t("Based on Rules") : t("Fixed Price")
                        }
                        onChange={(v) =>
                          onChange({
                            delivery_type: v === t("Based on Rules") ? "base_on_rule" : "fixed",
                          })
                        }
                      />
                    </div>
                    <div>
                      <NewCustomDropdown
                        label={t("Delivery Product")}
                        values={(Array.isArray(products) ? products : []).map(
                          (p: any) => p.display_name || p.name || `#${p.id}`,
                        )}
                        type="single"
                        placeholder={t("Select product")}
                        defaultValue={
                          formData.product_id
                            ? (Array.isArray(products) ? products : []).find(
                                (p: any) => String(p.id) === String(formData.product_id),
                              )?.display_name ||
                              (Array.isArray(products) ? products : []).find(
                                (p: any) => String(p.id) === String(formData.product_id),
                              )?.name ||
                              `#${formData.product_id}`
                            : undefined
                        }
                        onChange={(v) => {
                          const selectedProduct = (Array.isArray(products) ? products : []).find(
                            (p: any) => (p.display_name || p.name || `#${p.id}`) === v,
                          )
                          onChange({ product_id: selectedProduct ? String(selectedProduct.id) : "" })
                        }}
                      />
                    </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <NewCustomDropdown
                      label={t("Routes")}
                      values={(Array.isArray(stockRoutes) ? stockRoutes : []).map(
                        (rt: any) => rt.display_name || rt.name || `#${rt.id}`,
                      )}
                      type="multi"
                      placeholder={t("Select routes")}
                      defaultValue={(formData.route_ids || []).map((id: string) => {
                        const rt = (Array.isArray(stockRoutes) ? stockRoutes : []).find((r: any) => String(r.id) === id)
                        return rt ? (rt.display_name || rt.name || `#${rt.id}`) : ""
                      }).filter(Boolean)}
                      onChange={(selected) => {
                        if (Array.isArray(selected)) {
                          const newRouteIds = selected
                            .map((name) => {
                              const rt = (Array.isArray(stockRoutes) ? stockRoutes : []).find(
                                (r: any) => (r.display_name || r.name || `#${r.id}`) === name,
                              )
                              return rt ? String(rt.id) : null
                            })
                            .filter((id): id is string => id !== null)
                          onChange({ route_ids: newRouteIds })
                        }
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <CustomInput
                          label={t("Margin on rate")}
                            type="number"
                          value={formData.margin}
                          onChange={(v) => onChange({ margin: v })}
                          placeholder="0"
                        />
                      </div>
                      <span style={{ color: colors.textSecondary, fontWeight: 600, marginBottom: "0.5rem" }}>%</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <CustomInput
                          label={t("Additional Margin")}
                            type="number"
                          value={formData.fixed_margin}
                          onChange={(v) => onChange({ fixed_margin: v })}
                          placeholder="0"
                        />
                      </div>
                      <span style={{ color: colors.textSecondary, fontWeight: 600, marginBottom: "0.5rem" }}>{currencySymbol}</span>
                    </div>
                  </div>

                  <div>
                    <CustomInput
                      label={t("Tracking link")}
                      type="text"
                      value={formData.tracking_url}
                      onChange={(v) => onChange({ tracking_url: v })}
                      placeholder={t("e.g. https://example.com/track/{shipment}")}
                    />
                  </div>
                </div>
                )}

                {isTab("pricing") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>{t("Pricing Rules")}</div>
                    <button
                      onClick={() =>
                        setNewRuleDrafts((prev) => [
                          ...prev,
                          {
                            id: `new-${Date.now()}`,
                            variable: "weight",
                            operator: "==",
                            max_value: "",
                            list_base_price: "",
                            list_price: "",
                            variable_factor: "weight",
                          },
                        ])
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        background: colors.card,
                        cursor: "pointer",
                        color: colors.textPrimary,
                      }}
                    >
                      <Plus size={16} /> {t("Add line")}
                    </button>
                  </div>

                  <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, overflow: "hidden" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 0.6fr 0.6fr 1.8fr",
                        gap: 8,
                        padding: "10px 12px",
                        background: colors.mutedBg,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: 13,
                        fontWeight: 600,
                        color: colors.textPrimary,
                      }}
                    >
                      <div>{t("Condition")}</div>
                      <div style={{ textAlign: "right" }}>{t("Value")}</div>
                      <div>{t("Cost")}</div>
                      <div>{t("Formula")}</div>
                    </div>
                    {(rulesRefreshing ? [] : rules).map((r: any) => (
                      <div
                        key={r.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.2fr 0.6fr 0.6fr 1.8fr",
                          gap: 8,
                          padding: "10px 12px",
                          borderBottom: `1px solid ${colors.border}`,
                          fontSize: 13,
                          color: colors.textPrimary,
                        }}
                      >
                        <div>
                          {r.variable} {r.operator} {r.max_value}
                        </div>
                        <div style={{ textAlign: "right" }}>{r.max_value}</div>
                        <div>
                          {currencySymbol}
                          {Number(r.list_base_price || 0).toFixed(2)}
                        </div>
                        <div>
                          {currencySymbol}
                          {Number(r.list_base_price || 0).toFixed(2)} + {Number(r.list_price || 0).toFixed(2)} *{" "}
                          {r.variable_factor}
                        </div>
                      </div>
                    ))}

                    {newRuleDrafts.map((d: any) => (
                      <div
                        key={d.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.2fr 0.6fr 0.6fr 1.8fr",
                          gap: 8,
                          padding: "10px 12px",
                          borderBottom: `1px solid ${colors.border}`,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <NewCustomDropdown
                              label=""
                              values={[t("Weight"), t("Volume"), t("Weight * Volume"), t("Price"), t("Quantity")]}
                              type="single"
                              placeholder=""
                              defaultValue={
                                d.variable === "weight" ? t("Weight") :
                                d.variable === "volume" ? t("Volume") :
                                d.variable === "wv" ? t("Weight * Volume") :
                                d.variable === "price" ? t("Price") :
                                d.variable === "quantity" ? t("Quantity") : undefined
                              }
                              onChange={(v) => {
                                if (typeof v === "string") {
                                  const variableMap: Record<string, string> = {
                                    [t("Weight")]: "weight",
                                    [t("Volume")]: "volume",
                                    [t("Weight * Volume")]: "wv",
                                    [t("Price")]: "price",
                                    [t("Quantity")]: "quantity",
                                  }
                              setNewRuleDrafts((prev) =>
                                    prev.map((x) => (x.id === d.id ? { ...x, variable: variableMap[v] || "weight" } : x)),
                                  )
                                }
                              }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <NewCustomDropdown
                              label=""
                              values={["=", "<=", "<", ">=", ">"]}
                              type="single"
                              placeholder=""
                              defaultValue={d.operator === "==" ? "=" : d.operator}
                              onChange={(v) => {
                                if (typeof v === "string") {
                                  const operator = v === "=" ? "==" : v
                              setNewRuleDrafts((prev) =>
                                    prev.map((x) => (x.id === d.id ? { ...x, operator } : x)),
                                  )
                                }
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <CustomInput
                            label=""
                            type="number"
                            value={d.max_value}
                            onChange={(v) =>
                              setNewRuleDrafts((prev) =>
                                prev.map((x) =>
                                  x.id === d.id ? { ...x, max_value: v } : x,
                                ),
                              )
                            }
                            placeholder=""
                          />
                        </div>
                        <div>
                          <CustomInput
                            label=""
                            type="number"
                            value={d.list_base_price}
                            onChange={(v) =>
                              setNewRuleDrafts((prev) =>
                                prev.map((x) =>
                                  x.id === d.id ? { ...x, list_base_price: v } : x,
                                ),
                              )
                            }
                            placeholder={t("Base")}
                          />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <CustomInput
                            label=""
                            type="number"
                            value={d.list_price}
                            onChange={(v) =>
                              setNewRuleDrafts((prev) =>
                                prev.map((x) =>
                                  x.id === d.id ? { ...x, list_price: v } : x,
                                ),
                              )
                            }
                            placeholder={t("Coeff.")}
                          />
                          <span style={{ color: colors.textPrimary }}>*</span>
                          <div style={{ flex: 1 }}>
                            <NewCustomDropdown
                              label=""
                              values={[t("Weight"), t("Volume"), t("Weight * Volume"), t("Price"), t("Quantity")]}
                              type="single"
                              placeholder=""
                              defaultValue={
                                d.variable_factor === "weight" ? t("Weight") :
                                d.variable_factor === "volume" ? t("Volume") :
                                d.variable_factor === "wv" ? t("Weight * Volume") :
                                d.variable_factor === "price" ? t("Price") :
                                d.variable_factor === "quantity" ? t("Quantity") : undefined
                              }
                              onChange={(v) => {
                                if (typeof v === "string") {
                                  const variableMap: Record<string, string> = {
                                    [t("Weight")]: "weight",
                                    [t("Volume")]: "volume",
                                    [t("Weight * Volume")]: "wv",
                                    [t("Price")]: "price",
                                    [t("Quantity")]: "quantity",
                                  }
                              setNewRuleDrafts((prev) =>
                                    prev.map((x) => (x.id === d.id ? { ...x, variable_factor: variableMap[v] || "weight" } : x)),
                                  )
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button
                      onClick={async () => {
                        if (!sessionId || !selectedMethod?.id) return
                        try {
                          setRulesRefreshing(true)
                          const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/delivery-price-rules`, {
                            method: "POST",
                            headers: getOdooHeaders(),
                            body: JSON.stringify({ sessionId, carrier_id: selectedMethod.id }),
                          })
                          const data = await res.json().catch(() => ({}))
                          if (res.ok && data?.success) setRules(data.deliveryPriceRules || [])
                        } finally {
                          setRulesRefreshing(false)
                        }
                      }}
                      style={{
                        padding: "10px 14px",
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        background: colors.card,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        color: colors.textPrimary,
                      }}
                    >
                      <RefreshCcw
                        size={16}
                        style={{ animation: rulesRefreshing ? "spin 0.9s linear infinite" : "none" }}
                      />{" "}
                      {t("Refresh")}
                    </button>
                    {newRuleDrafts.length > 0 && (
                      <button
                        onClick={async () => {
                          if (!sessionId || !selectedMethod?.id) return
                          const base = API_CONFIG.BACKEND_BASE_URL
                          for (const d of newRuleDrafts) {
                            const values: any = {
                              carrier_id: Number(selectedMethod.id),
                              variable: d.variable,
                              operator: d.operator,
                              max_value: d.max_value === "" ? 0 : Number(d.max_value),
                              list_base_price: d.list_base_price === "" ? 0 : Number(d.list_base_price),
                              list_price: d.list_price === "" ? 0 : Number(d.list_price),
                              variable_factor: d.variable_factor,
                            }
                            const userId = uid ? Number(uid) : undefined
                            await fetch(`${base}/delivery-price-rules/create`, {
                              method: "POST",
                              headers: getOdooHeaders(),
                              body: JSON.stringify({ sessionId, values, userId }),
                            })
                          }
                          try {
                            setRulesRefreshing(true)
                            const res = await fetch(`${base}/delivery-price-rules`, {
                              method: "POST",
                              headers: getOdooHeaders(),
                              body: JSON.stringify({ sessionId, carrier_id: selectedMethod.id }),
                            })
                            const data = await res.json().catch(() => ({}))
                            if (res.ok && data?.success) setRules(data.deliveryPriceRules || [])
                            setNewRuleDrafts([])
                          } finally {
                            setRulesRefreshing(false)
                          }
                        }}
                        style={{
                          padding: "10px 14px",
                          border: "none",
                          borderRadius: 8,
                          background: colors.action,
                          color: "#fff",
                          fontWeight: 600,
                        }}
                      >
                        {t("Confirm")}
                      </button>
                    )}
                  </div>
                </div>
                )}

                {isTab("availability") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                  <div>
                    <h3
                      style={{ fontSize: "16px", fontWeight: "700", color: colors.textPrimary, marginBottom: "16px" }}
                    >
                      {t("Destination")}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div>
                        <NewCustomDropdown
                          label={t("Countries")}
                          values={(countries || []).map((c: any) => c.name || `#${c.id}`)}
                          type="multi"
                          placeholder={t("Select countries")}
                          defaultValue={(formData.country_ids || []).map((id: string) => {
                            const c = (countries || []).find((country: any) => String(country.id) === id)
                            return c ? (c.name || `#${c.id}`) : ""
                          }).filter(Boolean)}
                          onChange={(selected) => {
                            if (Array.isArray(selected)) {
                              const newCountryIds = selected
                                .map((name) => {
                                  const c = (countries || []).find(
                                    (country: any) => (country.name || `#${country.id}`) === name,
                                  )
                                  return c ? String(c.id) : null
                                })
                                .filter((id): id is string => id !== null)
                              onChange({ country_ids: newCountryIds })
                            }
                          }}
                        />
                      </div>

                      <div>
                        <NewCustomDropdown
                          label={t("States")}
                          values={(statesList || []).map((s: any) => (s.name || `#${s.id}`) + (s.code ? ` (${s.code})` : ""))}
                          type="multi"
                          placeholder={t("Select states")}
                          defaultValue={(formData.state_ids || []).map((id: string) => {
                            const s = (statesList || []).find((state: any) => String(state.id) === id)
                            return s ? ((s.name || `#${s.id}`) + (s.code ? ` (${s.code})` : "")) : ""
                          }).filter(Boolean)}
                          onChange={(selected) => {
                            if (Array.isArray(selected)) {
                              const newStateIds = selected
                                .map((name) => {
                                  const s = (statesList || []).find(
                                    (state: any) => ((state.name || `#${state.id}`) + (state.code ? ` (${state.code})` : "")) === name,
                                  )
                                  return s ? String(s.id) : null
                                })
                                .filter((id): id is string => id !== null)
                              onChange({ state_ids: newStateIds })
                            }
                          }}
                        />
                      </div>

                      <div>
                        <NewCustomDropdown
                          label={t("Zip prefixes")}
                          values={(zipPrefixes || []).map((z: any) => z.name || z.prefix || `#${z.id}`)}
                          type="multi"
                          placeholder={t("Select zip prefixes")}
                          defaultValue={(formData.zip_prefix_ids || []).map((id: string) => {
                            const z = (zipPrefixes || []).find((zip: any) => String(zip.id) === id)
                            return z ? (z.name || z.prefix || `#${z.id}`) : ""
                          }).filter(Boolean)}
                          onChange={(selected) => {
                            if (Array.isArray(selected)) {
                              const newZipPrefixIds = selected
                                .map((name) => {
                                  const z = (zipPrefixes || []).find(
                                    (zip: any) => (zip.name || zip.prefix || `#${zip.id}`) === name,
                                  )
                                  return z ? String(z.id) : null
                                })
                                .filter((id): id is string => id !== null)
                              onChange({ zip_prefix_ids: newZipPrefixIds })
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3
                      style={{ fontSize: "16px", fontWeight: "700", color: colors.textPrimary, marginBottom: "16px" }}
                    >
                      {t("Capacity")}
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <CustomInput
                        label={t("Max weight (kg)")}
                          type="number"
                          value={formData.max_weight}
                        onChange={(v) => onChange({ max_weight: v })}
                        placeholder="0"
                      />
                      <CustomInput
                        label={t("Max volume (m³)")}
                          type="number"
                          value={formData.max_volume}
                        onChange={(v) => onChange({ max_volume: v })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      background: colors.mutedBg,
                      padding: "16px",
                      borderRadius: "10px",
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <p style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: "1.6" }}>
                      {t(
                        "Configure availability rules to make this shipping method available according to the order content or destination.",
                      )}
                    </p>
                  </div>
                </div>
                )}

                {isTab("description") && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "8px",
                    }}
                  >
                    {t("Description")}
                  </label>
                  <textarea
                    value={formData.website_description}
                    onChange={(e) => setFormData({ ...formData, website_description: e.target.value })}
                    placeholder={t("Add a description for this delivery method...")}
                    rows={8}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: `2px solid ${colors.border}`,
                      borderRadius: "10px",
                      fontSize: "15px",
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                      background: colors.card,
                      color: colors.textPrimary,
                    }}
                  />
                </div>
                )}
              </>
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
                {selectedMethod && canEditPage("delivery-methods") && (
                  <button
                    onClick={() => handleDeleteClick(selectedMethod.id)}
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
                    label={saving ? t("Saving...") : (selectedMethod ? t("Save Changes") : t("Create Method"))}
                    backgroundColor="#25D0FE"
                    onClick={handleSave}
                    disabled={saving}
                  />
                )}
                <NewCustomButton
                  label={t("Close")}
                  backgroundColor="#FFFFFF"
                  onClick={() => closeModal()}
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
        title={t("Delete this delivery method?")}
        message={t("This delivery method will be permanently deleted and cannot be recovered.")}
        onClose={() => {
          setDeleteAlertOpen(false)
          setCarrierToDelete(null)
        }}
        onConfirm={deleteCarrierAction}
        confirmLabel={t("Delete")}
        cancelLabel={t("Cancel")}
      />
    </div>
  )
}

function DeliveryMethodCardSkeleton({ colors }: { colors: any }) {
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
