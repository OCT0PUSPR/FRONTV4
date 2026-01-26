"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { MapPin, Box, DollarSign, Warehouse, TrendingUp, Package, Plus, RefreshCcw, X, CheckCircle2, Edit, Trash2, Eye } from "lucide-react"
import Toast from "./components/Toast"
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useCasl } from "../context/casl"
import { API_CONFIG } from "./config/api"
import { StatCard } from "./components/StatCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Button } from "../@/components/ui/button"
import { Skeleton } from "@mui/material"
import { Card } from "../@/components/ui/card"
import { CustomInput } from "./components/CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./components/NewCustomDropdown"
import { NewCustomButton } from "./components/NewCustomButton"
import { DataTable, ColumnDef } from "./components/DataTable"
import Alert from "./components/Alert"

// Locations data will be derived from DataContext (stock.location + quants)

// Light mode map style (default Google look)
const googleLightMapStyle: any[] | undefined = undefined

// Accent and backgrounds should come from ThemeContext tokens

// Google Maps typings
declare global {
  interface Window {
    google?: any
  }
}

// Dark mode map style
const googleDarkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9080" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e7c59" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry.stroke", stylers: [{ color: "#27412b" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
]

// Lazy loader for Google Maps JS API
let googleMapsLoaderPromise: Promise<void> | null = null
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google && window.google.maps) return Promise.resolve()
  if (googleMapsLoaderPromise) return googleMapsLoaderPromise
  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-google-maps-loader]")
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve())
      existingScript.addEventListener("error", () => reject(new Error("Google Maps failed to load")))
      return
    }
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.setAttribute("data-google-maps-loader", "true")
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Google Maps failed to load"))
    document.body.appendChild(script)
  })
  return googleMapsLoaderPromise
}

function GoogleMapsContainer({
  apiKey,
  locations,
  mode,
  accentColor,
}: { apiKey?: string; locations: any[]; mode: "light" | "dark"; accentColor: string }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const { t } = useTranslation()

  useEffect(() => {
    if (!apiKey) return
    let isCancelled = false
    loadGoogleMaps(apiKey)
      .then(() => {
        if (isCancelled || !mapRef.current) return
        const center = { lat: 24.2, lng: 54.5 }
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 7,
          center,
          styles: mode === "dark" ? googleDarkMapStyle : googleLightMapStyle,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })
        mapInstanceRef.current = map

        markersRef.current.forEach((m) => m.setMap(null))
        markersRef.current = []
        const withCoords = (locations || []).filter(
          (l: any) => l?.coordinates && typeof l.coordinates.lat === "number" && typeof l.coordinates.lng === "number",
        )
        withCoords.forEach((location: any) => {
          const marker = new window.google.maps.Marker({
            position: { lat: location.coordinates.lat, lng: location.coordinates.lng },
            map,
            title: location.name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: accentColor,
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2,
            },
          })
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding:8px;font-family:sans-serif;">
                <div style="font-weight:bold;margin-bottom:4px;">${location.name}</div>
                <div style="font-size:12px;color:#ccc;">${location.address}</div>
                <div style="font-size:12px;color:#ccc;margin-top:4px;">Items: ${location.items}</div>
              </div>
            `,
          })
          marker.addListener("click", () => infoWindow.open(map, marker))
          markersRef.current.push(marker)
        })
      })
      .catch(() => {
        // noop: fallback UI below
      })
    return () => {
      isCancelled = true
    }
  }, [apiKey, locations, t, mode])

  if (!apiKey) {
    return (
      <div
        style={{
          width: "100%",
          height: "400px",
          borderRadius: "0.75rem",
          background: mode === "dark" ? "#0f172a" : "#e5e7eb",
          color: mode === "dark" ? "#e5e7eb" : "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        {t("Set your Google Maps API key in VITE_GOOGLE_MAPS_API_KEY to view the map.")}
      </div>
    )
  }

  return <div ref={mapRef} style={{ width: "100%", height: "400px", borderRadius: "0.75rem" }} />
}

export default function LocationsPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { mode, colors } = useTheme()
  const navigate = useNavigate()
  const { locations, quants, products, storageCategories, removalStrategies, fetchData, loading } = useData() as any
  const { uid } = useAuth()
  const { canCreatePage, canEditPage } = useCasl()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "name",
    "usage",
    "storageCategory",
    "items",
    "value",
    "active"
  ])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreate, setIsCreate] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>("")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<number | null>(null)

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
    if (!Array.isArray(locations) || !locations.length) fetchData("locations")
    if (!Array.isArray(quants) || !quants.length) fetchData("quants")
    if (!Array.isArray(products) || !products.length) fetchData("products")
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [])
  
  // Get Odoo headers for API requests
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = "https://egy.thetalenter.net"
    const db = "odoodb1"
    const headers: Record<string, string> = {}
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    return headers
  }

  const [form, setForm] = useState<any>({
    name: "",
    location_id: "",
    usage: "internal",
    storage_category_id: "",
    scrap_location: false,
    is_a_dock: false,
    replenish_location: false,
    cyclic_inventory_frequency: "",
    removal_strategy_id: "",
    comment: "",
  })

  const usageOptions: Array<{ label: string; value: string }> = [
    { label: t("Vendor Location"), value: "supplier" },
    { label: t("View"), value: "view" },
    { label: t("Internal Location"), value: "internal" },
    { label: t("Customer Location"), value: "customer" },
    { label: t("Inventory Loss"), value: "inventory" },
    { label: t("Production"), value: "production" },
    { label: t("Transit Location"), value: "transit" },
  ]

  const handleEditLocation = (loc?: any) => {
    // Check edit permission before navigating
    if (!canEditPage("locations")) {
      return
    }
    if (loc?.id) {
      navigate(`/locations/edit/${loc.id}`)
    }
  }

  const handleCreateLocation = () => {
    navigate('/locations/create')
  }

  const handleViewLocation = (locationId: number) => {
    navigate(`/locations/view/${locationId}`)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelected(null)
    setIsCreate(false)
    setDirty(false)
    setForm({
      name: "",
      location_id: "",
      usage: "internal",
      storage_category_id: "",
      scrap_location: false,
      is_a_dock: false,
      replenish_location: false,
      cyclic_inventory_frequency: "",
      removal_strategy_id: "",
      comment: "",
    })
  }

  const handleDeleteClick = (locationId: number | undefined) => {
    if (!locationId) return
    setLocationToDelete(locationId)
    setDeleteAlertOpen(true)
  }

  const deleteLocationAction = async () => {
    if (!locationToDelete) return
    const sessionId = localStorage.getItem("sessionId") || sessionStorage.getItem("sessionId")
    if (!sessionId) {
      setToast({ text: t("No session ID found"), state: "error" })
      setDeleteAlertOpen(false)
      setLocationToDelete(null)
      return
    }
    try {
      const userId = uid ? Number(uid) : undefined
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/locations/${locationToDelete}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getOdooHeaders() },
        body: JSON.stringify({ sessionId, userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.message || t("Delete failed"))
      setToast({ text: t("Location deleted successfully"), state: "success" })
      setDeleteAlertOpen(false)
      setLocationToDelete(null)
      await fetchData("locations")
      if (isModalOpen && selected?.id === locationToDelete) {
        closeModal()
      }
    } catch (error: any) {
      console.error("Delete failed:", error)
      setToast({ text: error?.message || t("Failed to delete location"), state: "error" })
      setDeleteAlertOpen(false)
      setLocationToDelete(null)
    }
  }

  // Compute locations summary from DataContext
  const computedLocations = useMemo<any[]>(() => {
    // Map product price for fallback value calc
    const priceByProduct: Record<string | number, number> = {}
    for (const p of products || []) {
      const id = p.id
      const std = typeof p.standard_price === "number" ? p.standard_price : undefined
      const lst =
        typeof p.list_price === "number" ? p.list_price : typeof p.lst_price === "number" ? p.lst_price : undefined
      const price = std ?? lst ?? 0
      if (id != null) priceByProduct[id] = price
    }
    const totalsByLocId: Record<string | number, { items: number; value: number }> = {}
    for (const q of quants || []) {
      const locId = q.location_id?.[0]
      const qty = typeof q.quantity === "number" ? q.quantity : q.qty || 0
      const invValRaw =
        typeof q.inventory_value === "number" ? q.inventory_value : typeof q.value === "number" ? q.value : undefined
      const prodId = q.product_id?.[0]
      const price = prodId != null ? (priceByProduct[prodId] ?? 0) : 0
      const computedVal = invValRaw != null ? invValRaw : qty * price
      const value = isFinite(computedVal) ? computedVal : 0
      if (locId != null) {
        const prev = totalsByLocId[locId] || { items: 0, value: 0 }
        totalsByLocId[locId] = { items: prev.items + qty, value: prev.value + value }
      }
    }
    const usageLabel = (u?: string) => {
      switch (u) {
        case "internal":
          return "Internal Location"
        case "view":
          return "View"
        case "supplier":
          return "Vendor Location"
        case "customer":
          return "Customer Location"
        case "inventory":
          return "Inventory Loss"
        case "production":
          return "Production"
        case "transit":
          return "Transit Location"
        default:
          return u || ""
      }
    }

    const locationsById = new Map<number, any>()
    for (const loc of locations || []) {
      locationsById.set(loc.id, loc)
    }

    return (locations || []).map((loc: any) => {
      const id = loc.id
      const name = loc.complete_name || loc.name || ""
      const address = ""
      const capacity = 0
      const totals = totalsByLocId[id] || { items: 0, value: 0 }
      const parentId = Array.isArray(loc.location_id) ? loc.location_id[0] : loc.location_id
      const parent = parentId ? locationsById.get(parentId) : null
      const parentName = parent ? (parent.complete_name || parent.name || "") : ""
      return {
        id,
        name,
        address,
        items: totals.items,
        value: totals.value,
        capacity,
        usage: usageLabel(loc.usage),
        isReception: !!loc.is_reception_location,
        storageCategory: Array.isArray(loc.storage_category_id) ? loc.storage_category_id[1] : "",
        parentName,
        scrapLocation: !!loc.scrap_location,
        isDock: !!loc.is_a_dock,
        replenishLocation: !!loc.replenish_location,
        cyclicInventoryFrequency: loc.cyclic_inventory_frequency || "",
        removalStrategy: Array.isArray(loc.removal_strategy_id) ? loc.removal_strategy_id[1] : "",
        comment: loc.comment || "",
        active: loc.active !== false, // Default to true if not explicitly false
        // optional map coordinates if present via custom fields lat/lng
        coordinates: loc.coordinates || undefined,
        rawLocation: loc,
      }
    })
  }, [locations, quants, products])

  const totalItems = computedLocations.reduce<number>((sum: number, loc: any) => sum + (loc.items || 0), 0)
  const totalValue = computedLocations.reduce<number>((sum: number, loc: any) => sum + (loc.value || 0), 0)
  const avgCapacity =
    computedLocations.length > 0
      ? computedLocations.reduce<number>((sum: number, loc: any) => sum + (loc.capacity ? (loc.items / loc.capacity) * 100 : 0), 0) /
        computedLocations.length
      : 0

  const uniqueTypes: string[] = useMemo(
    () => Array.from(new Set((computedLocations as any[]).map((l: any) => String(l.usage || "")).filter((v: string) => !!v))),
    [computedLocations],
  )
  const uniqueCategories: string[] = useMemo(
    () => Array.from(new Set((computedLocations as any[]).map((l: any) => String(l.storageCategory || "")).filter((v: string) => !!v))),
    [computedLocations],
  )

  const filteredLocations: any[] = computedLocations.filter((loc: any) => {
    const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter.length === 0 || typeFilter.includes(loc.usage)
    const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(loc.storageCategory)
    return matchesSearch && matchesType && matchesCategory
  })

  // Pagination
  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLocations = filteredLocations.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, typeFilter, categoryFilter])

  // Donut data: distribution by location type (usage)
  const donutData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of computedLocations) {
      const key = l.usage || "Other"
      counts[key] = (counts[key] || 0) + 1
    }
    const palette = [colors.action, "#FAD766", "#A9E0BA", "#7A9BA8", "#6EE7B7", "#93C5FD"]
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }))
  }, [computedLocations, colors.action])

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

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
                {t("Warehouse Locations")}
              </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
                {t("Monitor inventory across all warehouse locations")}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  fetchData("locations")
                  fetchData("quants")
                  fetchData("products")
                }}
                disabled={!!loading?.locations}
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
                <RefreshCcw className={`w-4 h-4 ${loading?.locations ? "animate-spin" : ""}`} />
                {loading?.locations ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("locations") && (
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
                  onClick={handleCreateLocation}
                >
                  <Plus size={isMobile ? 18 : 20} />
                  {t("Add Location")}
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
              label={t("Total Locations")}
              value={computedLocations.length}
              icon={Warehouse}
              gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
              delay={0}
            />
            <StatCard
              label={t("Total Items")}
              value={totalItems.toLocaleString()}
              icon={Package}
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              delay={1}
            />
            <StatCard
              label={t("Total Value")}
              value={`${(totalValue / 1000).toFixed(0)}K LE`}
              icon={DollarSign}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Avg Capacity")}
              value={`${avgCapacity.toFixed(1)}%`}
              icon={TrendingUp}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search locations...")}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={[]}
            toFilter={typeFilter}
            onToChange={setTypeFilter}
            toOptions={uniqueTypes}
            fromFilter={categoryFilter}
            onFromChange={setCategoryFilter}
            fromOptions={uniqueCategories}
            showDateRange={false}
            isMobile={isMobile}
            toPlaceholder={t("Type")}
            fromPlaceholder={t("Category")}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {viewMode === "cards" ? (
            loading?.locations ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
                  gap: "1.25rem",
                }}
              >
                {Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <LocationCardSkeleton key={idx} colors={colors} />
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
                {paginatedLocations.map((loc: any, idx: number) => {
                  const raw = (Array.isArray(locations) ? locations : []).find((l:any)=> Number(l.id)===Number(loc.id))
                  return (
                    <LocationCard
                      key={String(loc.id)}
                      location={loc}
                      onClick={canEditPage("locations") ? () => handleEditLocation(raw) : undefined}
                      index={idx}
                    />
                  )
                })}
              </div>
            )
          ) : (
            <DataTable
              data={filteredLocations}
              columns={[
                {
                  id: "id",
                  header: t("Location ID"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                      #{(row.original as any).id}
                    </span>
                  ),
                },
                {
                  id: "name",
                  header: t("Location Name"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.9375rem", fontWeight: 600 }}>
                      {(row.original as any).name || "—"}
                    </span>
                  ),
                },
                {
                  id: "usage",
                  header: t("Location Type"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {(row.original as any).usage || "—"}
                    </span>
                  ),
                },
                {
                  id: "storageCategory",
                  header: t("Storage Category"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {(row.original as any).storageCategory || "—"}
                    </span>
                  ),
                },
                {
                  id: "parentName",
                  header: t("Parent Location"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {(row.original as any).parentName || "—"}
                    </span>
                  ),
                },
                {
                  id: "items",
                  header: t("Items"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                      {((row.original as any).items || 0).toLocaleString()}
                    </span>
                  ),
                },
                {
                  id: "value",
                  header: t("Total Value"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 600 }}>
                      {Math.round((row.original as any).value || 0).toLocaleString()} LE
                    </span>
                  ),
                },
                {
                  id: "capacity",
                  header: t("Capacity"),
                  cell: ({ row }) => {
                    const capacity = (row.original as any).capacity
                    return (
                      <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                        {capacity ? `${capacity}%` : "—"}
                      </span>
                    )
                  },
                },
                {
                  id: "isReception",
                  header: t("Is Reception"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {(row.original as any).isReception ? t("Yes") : t("No")}
                    </span>
                  ),
                },
                {
                  id: "scrapLocation",
                  header: t("Is Scrap Location"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {(row.original as any).scrapLocation ? t("Yes") : t("No")}
                    </span>
                  ),
                },
                {
                  id: "isDock",
                  header: t("Is Dock Location"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {(row.original as any).isDock ? t("Yes") : t("No")}
                    </span>
                  ),
                },
                {
                  id: "replenishLocation",
                  header: t("Replenish Location"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {(row.original as any).replenishLocation ? t("Yes") : t("No")}
                    </span>
                  ),
                },
                {
                  id: "cyclicInventoryFrequency",
                  header: t("Inventory Frequency"),
                  cell: ({ row }) => {
                    const freq = (row.original as any).cyclicInventoryFrequency
                    return (
                      <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                        {freq ? String(freq) : "—"}
                      </span>
                    )
                  },
                },
                {
                  id: "removalStrategy",
                  header: t("Removal Strategy"),
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {(row.original as any).removalStrategy || "—"}
                    </span>
                  ),
                },
                {
                  id: "comment",
                  header: t("Comment"),
                  cell: ({ row }) => {
                    const comment = (row.original as any).comment
                    return (
                      <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                        {comment ? (comment.length > 50 ? `${comment.substring(0, 50)}...` : comment) : "—"}
                      </span>
                    )
                  },
                },
                {
                  id: "active",
                  header: t("Active"),
                  cell: ({ row }) => {
                    const location = row.original as any
                    const isActive = location.active !== false
                    const statusColor = isActive
                      ? { bg: colors.tableDoneBg, text: colors.tableDoneText }
                      : { bg: colors.tableDraftBg, text: colors.tableDraftText }
                    return (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "999px",
                          background: statusColor.bg,
                          color: statusColor.text,
                          fontSize: "0.875rem",
                          fontWeight: 600,
                        }}
                      >
                        {isActive ? t("Active") : t("Inactive")}
                      </span>
                    )
                  },
                },
              ]}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              actions={(location) => {
                const raw = (location as any).rawLocation
                const locationId = raw?.id
                return [
                  {
                    key: "view",
                    label: t("View"),
                    icon: Eye,
                    onClick: () => handleViewLocation(locationId),
                  },
                  ...(canEditPage("locations") ? [{
                    key: "edit",
                    label: t("Edit"),
                    icon: Edit,
                    onClick: () => handleEditLocation(raw),
                  }] : []),
                  ...(canEditPage("locations") ? [{
                    key: "delete",
                    label: t("Delete"),
                    icon: Trash2,
                    onClick: () => handleDeleteClick(raw?.id),
                    danger: true,
                  }] : []),
                ]
              }}
              actionsLabel={t("Actions")}
              isRTL={isRTL}
              isLoading={loading?.locations}
              getRowIcon={(location: any) => {
                const isActive = location.active !== false
                return {
                  icon: CheckCircle2,
                  gradient: isActive
                    ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                    : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }
              }}
              showPagination={true}
              defaultItemsPerPage={10}
            />
          )}

          {!loading?.locations && (
            <>

              {filteredLocations.length === 0 && !loading?.locations && (
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
                    <MapPin size={28} color="#FFFFFF" />
                  </div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {t("No locations found")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
                </div>
              )}

              {filteredLocations.length > 0 && viewMode === "cards" && (
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
          onClick={() => {
            if (!dirty || window.confirm(t("Discard unsaved changes?"))) closeModal()
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
                <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary }}>
                  {isCreate ? t("Add Location") : t("Edit Location")}
                </h2>
                <p style={{ fontSize: 13, color: colors.textSecondary }}>
                  {t("Manage location details")}
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <CustomInput
                      label={t("Name")}
                      type="text"
                      value={form.name}
                      onChange={(v) => {
                        setForm({ ...form, name: v })
                        setDirty(true)
                      }}
                      placeholder={t("Enter location name")}
                    />
                  </div>
                  <div>
                    <NewCustomDropdown
                      label={t("Parent Location")}
                      values={(Array.isArray(locations) ? locations : []).map((l: any) => l.complete_name || l.name || String(l.id))}
                      type="single"
                      placeholder={t("Select parent")}
                      defaultValue={
                        form.location_id
                          ? (() => {
                              const found = (Array.isArray(locations) ? locations : []).find((l: any) => String(l.id) === form.location_id)
                              return found ? (found.complete_name || found.name || String(found.id)) : undefined
                            })()
                          : undefined
                      }
                      onChange={(v) => {
                        const selectedLocation = (Array.isArray(locations) ? locations : []).find(
                          (l: any) => (l.complete_name || l.name || String(l.id)) === v
                        )
                        setForm({ ...form, location_id: selectedLocation ? String(selectedLocation.id) : "" })
                        setDirty(true)
                      }}
                    />
                  </div>
                  <div>
                    <NewCustomDropdown
                      label={t("Location type")}
                      values={usageOptions.map((o) => o.label)}
                      type="single"
                      placeholder={t("Select location type")}
                      defaultValue={
                        form.usage
                          ? usageOptions.find((o) => o.value === form.usage)?.label
                          : undefined
                      }
                      onChange={(v) => {
                        const selected = usageOptions.find((o) => o.label === v)
                        setForm({ ...form, usage: selected ? selected.value : "internal" })
                        setDirty(true)
                      }}
                    />
                  </div>
                  <div>
                    <NewCustomDropdown
                      label={t("Storage category")}
                      values={(Array.isArray(storageCategories) ? storageCategories : []).map((c: any) => c.display_name || c.name || String(c.id))}
                      type="single"
                      placeholder={t("Select category")}
                      defaultValue={
                        form.storage_category_id
                          ? (() => {
                              const found = (Array.isArray(storageCategories) ? storageCategories : []).find((c: any) => String(c.id) === form.storage_category_id)
                              return found ? (found.display_name || found.name || String(found.id)) : undefined
                            })()
                          : undefined
                      }
                      onChange={(v) => {
                        const selectedCategory = (Array.isArray(storageCategories) ? storageCategories : []).find(
                          (c: any) => (c.display_name || c.name || String(c.id)) === v
                        )
                        setForm({ ...form, storage_category_id: selectedCategory ? String(selectedCategory.id) : "" })
                        setDirty(true)
                      }}
                    />
                  </div>
                  <div>
                    <NewCustomDropdown
                      label={t("Removal Strategy")}
                      values={(Array.isArray(removalStrategies) ? removalStrategies : []).map((r: any) => r.display_name || r.name || String(r.id))}
                      type="single"
                      placeholder={t("Select strategy")}
                      defaultValue={
                        form.removal_strategy_id
                          ? (() => {
                              const found = (Array.isArray(removalStrategies) ? removalStrategies : []).find((r: any) => String(r.id) === form.removal_strategy_id)
                              return found ? (found.display_name || found.name || String(found.id)) : undefined
                            })()
                          : undefined
                      }
                      onChange={(v) => {
                        const selectedStrategy = (Array.isArray(removalStrategies) ? removalStrategies : []).find(
                          (r: any) => (r.display_name || r.name || String(r.id)) === v
                        )
                        setForm({ ...form, removal_strategy_id: selectedStrategy ? String(selectedStrategy.id) : "" })
                        setDirty(true)
                      }}
                    />
                  </div>
                  <div>
                    <CustomInput
                      label={t("Inventory frequency")}
                      type="number"
                      value={String(form.cyclic_inventory_frequency)}
                      onChange={(v) => {
                        setForm({ ...form, cyclic_inventory_frequency: v })
                        setDirty(true)
                      }}
                      placeholder={t("Enter frequency in days")}
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
                    {t("Location Settings")}
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!form.scrap_location}
                        onChange={(e) => {
                          setForm({ ...form, scrap_location: e.target.checked })
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      <label style={{ fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                        {t("Is a scrap location")}
                      </label>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!form.is_a_dock}
                        onChange={(e) => {
                          setForm({ ...form, is_a_dock: e.target.checked })
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      <label style={{ fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                        {t("Is a dock location")}
                      </label>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!form.replenish_location}
                        onChange={(e) => {
                          setForm({ ...form, replenish_location: e.target.checked })
                          setDirty(true)
                        }}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      <label style={{ fontSize: 13, color: colors.textPrimary, cursor: "pointer" }}>
                        {t("Replenish location")}
                      </label>
                    </div>
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
                      background: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
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
                    {t("Additional Information")}
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 12,
                          color: colors.textSecondary,
                          fontWeight: 600,
                          marginBottom: 6,
                        }}
                      >
                        {t("External note")}
                      </label>
                      <textarea
                        value={form.comment}
                        onChange={(e) => {
                          setForm({ ...form, comment: e.target.value })
                          setDirty(true)
                        }}
                        rows={4}
                        style={{
                          width: "100%",
                          minHeight: 100,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 8,
                          background: colors.card,
                          color: colors.textPrimary,
                          padding: "0.6rem 0.75rem",
                          fontSize: 13,
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                    </div>
                    {!isCreate && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 12,
                              color: colors.textSecondary,
                              fontWeight: 600,
                              marginBottom: 6,
                            }}
                          >
                            {t("Last inventory date")}
                          </label>
                          <div
                            style={{
                              padding: "0.625rem 0.75rem",
                              borderRadius: 8,
                              border: `1px solid ${colors.border}`,
                              background: colors.mutedBg,
                              color: colors.textSecondary,
                              fontSize: 13,
                            }}
                          >
                            {selected?.last_inventory_date ? String(selected.last_inventory_date) : "-"}
                          </div>
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 12,
                              color: colors.textSecondary,
                              fontWeight: 600,
                              marginBottom: 6,
                            }}
                          >
                            {t("Next Inventory date")}
                          </label>
                          <div
                            style={{
                              padding: "0.625rem 0.75rem",
                              borderRadius: 8,
                              border: `1px solid ${colors.border}`,
                              background: colors.mutedBg,
                              color: colors.textSecondary,
                              fontSize: 13,
                            }}
                          >
                            {selected?.next_inventory_date ? String(selected.next_inventory_date) : "-"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {saveError && (
              <div
                style={{
                  margin: "0 1.25rem",
                  padding: "0.75rem",
                  borderRadius: 8,
                  background: "#FEE2E2",
                  color: "#991B1B",
                  border: "1px solid #FCA5A5",
                  fontSize: 13,
                }}
              >
                {saveError}
              </div>
            )}

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
                {!isCreate && canEditPage("locations") && (
                  <button
                    onClick={() => handleDeleteClick(selected?.id)}
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
                    label={isCreate ? t("Create") : t("Save Changes")}
                    backgroundColor="#25D0FE"
                    onClick={async () => {
                      try {
                        setSaving(true)
                        setSaveError("")
                        const sessionId = localStorage.getItem("sessionId") || sessionStorage.getItem("sessionId")
                        if (!sessionId) throw new Error("No session ID")
                        const values: any = {
                          name: form.name,
                          usage: form.usage,
                          location_id: form.location_id ? Number(form.location_id) : undefined,
                          storage_category_id: form.storage_category_id ? Number(form.storage_category_id) : undefined,
                          scrap_location: !!form.scrap_location,
                          is_a_dock: !!form.is_a_dock,
                          replenish_location: !!form.replenish_location,
                          cyclic_inventory_frequency: form.cyclic_inventory_frequency === "" ? 0 : Number(form.cyclic_inventory_frequency),
                          removal_strategy_id: form.removal_strategy_id ? Number(form.removal_strategy_id) : undefined,
                          comment: form.comment,
                        }
                        let ok = false
                        let errMsg = ""
                        const userId = uid ? Number(uid) : undefined
                        if (isCreate) {
                          const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/locations/create`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", ...getOdooHeaders() },
                            body: JSON.stringify({ sessionId, values, userId }),
                          })
                          const j = await res.json().catch(async () => {
                            try {
                              return { message: await res.text() }
                            } catch {
                              return {}
                            }
                          })
                          ok = res.ok && (j?.success || j?.id)
                          if (!ok) errMsg = j?.message || t("Failed to create location")
                        } else if (selected?.id) {
                          const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/locations/${selected.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", ...getOdooHeaders() },
                            body: JSON.stringify({ sessionId, values, userId }),
                          })
                          const j = await res.json().catch(async () => {
                            try {
                              return { message: await res.text() }
                            } catch {
                              return {}
                            }
                          })
                          ok = res.ok && j?.success
                          if (!ok) errMsg = j?.message || t("Failed to update location")
                        }
                        if (ok) {
                          await fetchData("locations")
                          setDirty(false)
                          setToast({ text: isCreate ? t("Location created successfully") : t("Location updated successfully"), state: "success" })
                          setTimeout(() => {
                            closeModal()
                            setToast(null)
                          }, 1200)
                        } else if (errMsg) {
                          setSaveError(errMsg)
                          setToast({ text: errMsg, state: "error" })
                          setTimeout(() => setToast(null), 3000)
                        }
                      } catch (e: any) {
                        const errorMsg = e?.message || t("Unknown error")
                        setSaveError(errorMsg)
                        setToast({ text: errorMsg, state: "error" })
                        setTimeout(() => setToast(null), 3000)
                      } finally {
                        setSaving(false)
                      }
                    }}
                    disabled={saving || !form.name}
                  />
                )}
                <NewCustomButton label={t("Close")} backgroundColor="#FFFFFF" onClick={closeModal} />
              </div>
            </div>
          </Card>
        </div>
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
        title={t("Delete this location?")}
        message={t("This location will be permanently deleted and cannot be recovered.")}
        onClose={() => {
          setDeleteAlertOpen(false)
          setLocationToDelete(null)
        }}
        onConfirm={deleteLocationAction}
        confirmLabel={t("Delete")}
        cancelLabel={t("Cancel")}
      />
    </div>
  )
}

interface LocationCardProps {
  location: any
  onClick: () => void
  index: number
}

function LocationCard({ location, onClick, index }: LocationCardProps) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const isRTL = i18n?.dir() === "rtl"

  const statusTheme = {
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    label: location.usage || t("Location"),
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
              <MapPin className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 pt-1">
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {location.name}
              </h3>
              {location.address && (
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {location.address}
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
                  {t("Items")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{(location.items || 0).toLocaleString()}</p>
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
                  {t("Value")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>${((location.value || 0) / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between pt-4 border-t"
            style={{ borderColor: colors.border }}
          >
            <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-medium">
                {location.storageCategory || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LocationCardSkeleton({ colors }: { colors: any }) {
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
