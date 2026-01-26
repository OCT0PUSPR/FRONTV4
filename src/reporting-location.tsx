"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { MapPin, Box, DollarSign, Plus, RefreshCcw, Package, Edit, CheckCircle2, FileText, Eye } from "lucide-react"
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useCasl } from "../context/casl"
import { Button } from "../@/components/ui/button"
import { StatCard } from "./components/StatCard"
import { LocationCard } from "./components/LocationCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { Skeleton } from "@mui/material"
import { DataTable } from "./components/DataTable"
import { ProductModal } from "./components/ProductModal"
import ExportModal, { ExportOptions } from "./components/ExportModal"
import { useExport } from "./hooks/useExport"


const googleLightMapStyle: any[] | undefined = undefined


declare global {
  interface Window {
    google?: any
  }
}

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

function GoogleMapsContainer({ apiKey, locations, mode, accentColor }: { apiKey?: string; locations: any[]; mode: "light" | "dark"; accentColor: string }) {
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
        const withCoords = (locations || []).filter((l: any) => l?.coordinates && typeof l.coordinates.lat === 'number' && typeof l.coordinates.lng === 'number')
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

export default function ReportingLocationConst() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isRTL = i18n.dir() === "rtl"
  const { mode, colors } = useTheme()
  const { locations, quants, products, productPackaging, partners, lots, fetchData, loading } = useData()
  const { canCreatePage, canExportPage } = useCasl()
  const [searchQuery, setSearchQuery] = useState("")
  const [locationFilter, setLocationFilter] = useState<string[]>([])
  const [packageFilter, setPackageFilter] = useState<string[]>([])
  const [ownerFilter, setOwnerFilter] = useState<string[]>([])
  // Using statusFilter prop name for package filter to match TransferFiltersBar interface
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)
  const [isRowModalOpen, setIsRowModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  // Column visibility state - default: 6 most important columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "id",
    "productName",
    "locationName",
    "onHand",
    "reserved",
    "total",
    "active",
  ])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch data only on mount and only if missing to prevent unnecessary requests
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (hasFetchedRef.current) return
    const sessionId = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
    if (!sessionId) return

    hasFetchedRef.current = true
    // Only fetch data that's actually needed for this page and missing
    if (!Array.isArray(quants) || !quants.length) fetchData("quants")
    if (!Array.isArray(locations) || !locations.length) fetchData("locations")
    if (!Array.isArray(products) || !products.length) fetchData("products")
    if (!Array.isArray(productPackaging) || !productPackaging.length) fetchData("productPackaging")
    if (!Array.isArray(partners) || !partners.length) fetchData("partners")
    if (!Array.isArray(lots) || !lots.length) fetchData("lots")
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [])

  const productCards = useMemo(() => {
    const prodById: Record<number, any> = {}
    for (const p of products || []) {
      const pid = typeof p.id === 'number' ? p.id : (Array.isArray(p.id) ? p.id[0] : p.id)
      if (pid) prodById[pid] = p
    }
    const locById: Record<number, any> = {}
    for (const l of locations || []) {
      const lid = typeof l.id === 'number' ? l.id : (Array.isArray(l.id) ? l.id[0] : l.id)
      if (lid) locById[lid] = l
    }
    const packById: Record<number, any> = {}
    for (const pk of productPackaging || []) {
      const pkid = typeof pk.id === 'number' ? pk.id : (Array.isArray(pk.id) ? pk.id[0] : pk.id)
      if (pkid) packById[pkid] = pk
    }
    const partnerById: Record<number, any> = {}
    for (const pr of partners || []) {
      const prid = typeof pr.id === 'number' ? pr.id : (Array.isArray(pr.id) ? pr.id[0] : pr.id)
      if (prid) partnerById[prid] = pr
    }
    const lotById: Record<number, any> = {}
    for (const lt of lots || []) {
      const ltid = typeof lt.id === 'number' ? lt.id : (Array.isArray(lt.id) ? lt.id[0] : lt.id)
      if (ltid) lotById[ltid] = lt
    }

    const list: Array<{
      id: string
      productName: string
      productImage?: string
      locationName: string
      packageName: string
      lotName: string
      ownerName: string
      onHand: number
      reserved: number
      uomName: string
      active: boolean
      productId: number
    }> = []

    for (const q of quants || []) {
      const prodId = Array.isArray(q.product_id) ? q.product_id[0] : (typeof q.product_id === 'number' ? q.product_id : undefined)
      if (!prodId) continue

      const locId = Array.isArray(q.location_id) ? q.location_id[0] : (typeof q.location_id === 'number' ? q.location_id : undefined)
      const pkgId = Array.isArray(q.package_id) ? q.package_id[0] : (typeof q.package_id === 'number' ? q.package_id : undefined)
      const ownId = Array.isArray(q.owner_id) ? q.owner_id[0] : (typeof q.owner_id === 'number' ? q.owner_id : undefined)
      const lotId = Array.isArray(q.lot_id) ? q.lot_id[0] : (typeof q.lot_id === 'number' ? q.lot_id : undefined)

      const prod = prodById[prodId]
      const loc = locId ? locById[locId] : undefined
      const pkg = pkgId ? packById[pkgId] : undefined
      const own = ownId ? partnerById[ownId] : undefined
      const lot = lotId ? lotById[lotId] : undefined

      // Get product name with fallback to product_id tuple name
      const productName = prod?.display_name || prod?.name || (Array.isArray(q.product_id) ? q.product_id[1] : undefined) || t('Unknown Product')

      const uom = Array.isArray(prod?.uom_id) ? prod.uom_id[1] : (typeof prod?.uom_id === 'string' ? prod.uom_id : "")
      const onHand = typeof q.quantity === 'number' ? q.quantity : (typeof q.qty === 'number' ? q.qty : 0)
      const reserved = typeof q.reserved_quantity === 'number' ? q.reserved_quantity : (typeof q.reserved_qty === 'number' ? q.reserved_qty : 0)

      list.push({
        id: `${String(q.id ?? `${prodId}-${locId || ''}-${lotId || ''}-${pkgId || ''}`)}`,
        productName,
        productImage: prod?.image_1920 || prod?.image_512,
        locationName: loc?.complete_name || loc?.name || '',
        packageName: pkg?.name || pkg?.display_name || '',
        lotName: lot?.name || '',
        ownerName: own?.name || '',
        onHand,
        reserved,
        uomName: typeof uom === 'string' ? uom : '',
        active: prod?.active !== false, // Default to true if undefined
        productId: prodId,
      })
    }
    return list
  }, [quants, products, locations, productPackaging, partners, lots, t])

  const totalOnHand = useMemo(() => productCards.reduce((s, x) => s + (x.onHand || 0), 0), [productCards])
  const totalReserved = useMemo(() => productCards.reduce((s, x) => s + (x.reserved || 0), 0), [productCards])
  const totalQuantities = totalOnHand + totalReserved
  const totalLocationsUsed = useMemo(() => new Set(productCards.map((x) => x.locationName).filter(Boolean)).size, [productCards])

  const filteredCards = productCards.filter((c) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      c.productName.toLowerCase().includes(q) ||
      c.locationName.toLowerCase().includes(q) ||
      c.packageName.toLowerCase().includes(q) ||
      c.lotName.toLowerCase().includes(q) ||
      c.ownerName.toLowerCase().includes(q)
    const matchesLocation = locationFilter.length === 0 || locationFilter.includes(c.locationName)
    const matchesOwner = ownerFilter.length === 0 || ownerFilter.includes(c.ownerName)
    const matchesPackage = packageFilter.length === 0 || packageFilter.includes(c.packageName)
    // Active filter could be added here if needed, but user didn't explicitly ask for a filter, just a column
    return matchesSearch && matchesLocation && matchesOwner && matchesPackage
  })

  // Pagination
  const totalPages = Math.ceil(filteredCards.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCards = filteredCards.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, locationFilter, ownerFilter, packageFilter])

  const { exportData } = useExport()

  const handleExport = (options: ExportOptions) => {
    // Check export permission before exporting
    if (!canExportPage("reporting-location")) {
      return
    }
    // Determine data to export
    let dataToExport = filteredCards
    if (options.scope === "selected") {
      dataToExport = filteredCards.filter((card) => rowSelection[String(card.id)])
    } else if (options.scope === "page") {
      dataToExport = paginatedCards
    }

    // Define all possible columns
    const allColumns = {
      id: {
        header: t('ID'),
        accessor: (row: any) => `#${row.id}`,
        isMonospace: true
      },
      productName: {
        header: t('Product Name'),
        accessor: (row: any) => row.productName,
        isBold: true
      },
      locationName: {
        header: t('Location Name'),
        accessor: (row: any) => row.locationName || '-'
      },
      packageName: {
        header: t('Package'),
        accessor: (row: any) => row.packageName || '-'
      },
      lotName: {
        header: t('Lot/Serial'),
        accessor: (row: any) => row.lotName || '-'
      },
      ownerName: {
        header: t('Owner'),
        accessor: (row: any) => row.ownerName || '-'
      },
      onHand: {
        header: t('On Hand'),
        accessor: (row: any) => (row.onHand || 0).toLocaleString()
      },
      reserved: {
        header: t('Reserved'),
        accessor: (row: any) => (row.reserved || 0).toLocaleString()
      },
      total: {
        header: t('Total'),
        accessor: (row: any) => ((row.onHand || 0) + (row.reserved || 0)).toLocaleString()
      },
      uomName: {
        header: t('Unit'),
        accessor: (row: any) => row.uomName || '-'
      },
      active: {
        header: t('Active'),
        accessor: (row: any) => row.active ? t('Active') : t('Inactive'),
        isStatus: true
      },
    }

    // Filter columns based on visible columns
    const exportColumns = visibleColumns
      .map(colId => allColumns[colId as keyof typeof allColumns])
      .filter(Boolean)

    const config = {
      title: t("Reporting Location Export"),
      columns: exportColumns,
      getSummary: (data: any[]) => [
        { label: t('Total Records'), value: data.length },
        { label: t('Total On Hand'), value: data.reduce((sum: number, card: any) => sum + (card.onHand || 0), 0).toLocaleString() },
        { label: t('Total Reserved'), value: data.reduce((sum: number, card: any) => sum + (card.reserved || 0), 0).toLocaleString() },
        { label: t('Active Products'), value: data.filter((card: any) => card.active).length }
      ]
    }

    exportData(options, dataToExport, config, null)
    setIsExportModalOpen(false)
  }

  // Get unique values for filters
  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(productCards.map((c) => c.locationName).filter(Boolean))).sort()
  }, [productCards])

  const uniqueOwners = useMemo(() => {
    return Array.from(new Set(productCards.map((c) => c.ownerName).filter(Boolean))).sort()
  }, [productCards])

  const uniquePackages = useMemo(() => {
    return Array.from(new Set(productCards.map((c) => c.packageName).filter(Boolean))).sort()
  }, [productCards])

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
                  // Only refresh the data this page actually uses
                  fetchData("quants")
                  fetchData("locations")
                  fetchData("products")
                }}
                disabled={!!loading?.quants}
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
                <RefreshCcw className={`w-4 h-4 ${loading?.quants ? "animate-spin" : ""}`} />
                {loading?.quants ? t("Loading...") : t("Refresh")}
              </Button>
              {canCreatePage("reporting-location") && (
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
                    // Add action handler here if needed
                  }}
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
              label={t("Total on hand quantity")}
              value={totalOnHand.toLocaleString()}
              icon={Package}
              gradient="linear-gradient(135deg, #dc2626 0%, #ea580c 100%)"
              delay={0}
            />
            <StatCard
              label={t("Total Reserved quantity")}
              value={totalReserved.toLocaleString()}
              icon={Box}
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              delay={1}
            />
            <StatCard
              label={t("Total quantities")}
              value={totalQuantities.toLocaleString()}
              icon={DollarSign}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Total locations used")}
              value={totalLocationsUsed.toLocaleString()}
              icon={MapPin}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
          </div>

          <TransferFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t("Search products, locations, lots...")}
            statusFilter={packageFilter}
            onStatusChange={setPackageFilter}
            statusOptions={uniquePackages}
            statusPlaceholder={t("Package")}
            toFilter={locationFilter}
            onToChange={setLocationFilter}
            toOptions={uniqueLocations}
            fromFilter={ownerFilter}
            onFromChange={setOwnerFilter}
            fromOptions={uniqueOwners}
            showDateRange={false}
            isMobile={isMobile}
            toPlaceholder={t("Location")}
            fromPlaceholder={t("Owner")}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
          />

          {viewMode === "cards" ? (
            loading?.quants ? (
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
                {paginatedCards.map((item, idx) => (
                  <LocationCard key={item.id} location={item} onClick={() => { }} index={idx} />
                ))}
              </div>
            )
          ) : (
            <DataTable
              data={filteredCards}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              onExport={canExportPage("reporting-location") ? () => setIsExportModalOpen(true) : undefined}
              columns={[
                {
                  id: "id",
                  header: t("ID"),
                  width: "80px",
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem", fontFamily: "monospace" }}>
                      #{row.original.id}
                    </span>
                  ),
                },
                {
                  id: "productName",
                  header: t("Product Name"),
                  width: "250px",
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.9375rem", fontWeight: 600 }}>
                      {row.original.productName}
                    </span>
                  ),
                },
                {
                  id: "locationName",
                  header: t("Location Name"),
                  width: "200px",
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                      {row.original.locationName || "—"}
                    </span>
                  ),
                },
                {
                  id: "packageName",
                  header: t("Package"),
                  width: "120px",
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                      {row.original.packageName || "—"}
                    </span>
                  ),
                },
                {
                  id: "lotName",
                  header: t("Lot/Serial"),
                  width: "120px",
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                      {row.original.lotName || "—"}
                    </span>
                  ),
                },
                {
                  id: "ownerName",
                  header: t("Owner"),
                  width: "120px",
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
                      {row.original.ownerName || "—"}
                    </span>
                  ),
                },
                {
                  id: "onHand",
                  header: t("On Hand"),
                  width: "100px",
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                      {row.original.onHand.toLocaleString()}
                    </span>
                  ),
                },
                {
                  id: "reserved",
                  header: t("Reserved"),
                  width: "100px",
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 500 }}>
                      {row.original.reserved.toLocaleString()}
                    </span>
                  ),
                },
                {
                  id: "total",
                  header: t("Total"),
                  width: "100px",
                  cell: ({ row }) => (
                    <span style={{ color: colors.textPrimary, fontSize: "0.875rem", fontWeight: 600 }}>
                      {(row.original.onHand + row.original.reserved).toLocaleString()}
                    </span>
                  ),
                },
                {
                  id: "uomName",
                  header: t("Unit"),
                  width: "80px",
                  cell: ({ row }) => (
                    <span style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                      {row.original.uomName || "—"}
                    </span>
                  ),
                },
                {
                  id: "active",
                  header: t("Active"),
                  width: "100px",
                  cell: ({ row }) => {
                    const isActive = row.original.active
                    return (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "999px",
                          background: isActive ? colors.tableDoneBg : colors.tableCancelledBg,
                          color: isActive ? colors.tableDoneText : colors.tableCancelledText,
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
              getRowIcon={(item: any) => {
                const hasQuantity = item.onHand > 0 || item.reserved > 0
                return {
                  icon: hasQuantity ? CheckCircle2 : FileText,
                  gradient: hasQuantity
                    ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                    : "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                }
              }}
              actions={(row) => {
                const rowId = (row as any).id
                return [
                  {
                    key: "view",
                    label: t("View"),
                    icon: Eye,
                    onClick: () => navigate(`/reporting-location/view/${rowId}`),
                  },
                ]
              }}
              isRTL={isRTL}
              isLoading={loading?.quants}
              showPagination={true}
              defaultItemsPerPage={10}
            />
          )}

          <ProductModal
            product={selectedProduct}
            isOpen={isProductModalOpen}
            onClose={() => {
              setIsProductModalOpen(false)
              setSelectedProduct(null)
            }}
            onSuccess={() => {
              fetchData("products")
              fetchData("quants")
            }}
          />

          {canExportPage("reporting-location") && (
            <ExportModal
              isOpen={isExportModalOpen}
              onClose={() => setIsExportModalOpen(false)}
              onExport={handleExport}
              totalRecords={filteredCards.length}
              selectedCount={Object.keys(rowSelection).length}
              isSelectAll={Object.keys(rowSelection).length === filteredCards.length && filteredCards.length > 0}
            />
          )}

          {filteredCards.length === 0 && !loading?.quants && (
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
                {t("No locations found")}
              </h3>
              <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>{t("Try adjusting your search criteria")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Skeleton component matching LocationCard structure
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
              {/* ID */}
              <Skeleton
                variant="text"
                width="30%"
                height={14}
                sx={{
                  marginBottom: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              {/* Product name */}
              <Skeleton
                variant="text"
                width="60%"
                height={24}
                sx={{
                  marginBottom: "0.25rem",
                  bgcolor: colors.mutedBg,
                }}
              />
              {/* Location name */}
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

          {/* Details Visualization */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            {Array.from({ length: 6 }).map((_, idx) => (
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

          {/* Footer Metadata */}
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
