"use client"

import {
  Search,
  Mail,
  Bell,
  ChevronDown,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Upload,
  Filter,
  ChevronLeft,
  ChevronRight,
  Package,
  Star,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  BarChart3,
  Activity,
  DollarSign,
  Layers,
  RefreshCcw,
  Phone,
  XCircle,
  FileText,
  MapPin,
  User,
} from "lucide-react"
import { Button } from "../@/components/ui/button"
import { Input } from "../@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../@/components/ui/dropdown-menu"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"
import { useTranslation } from 'react-i18next'
import { useTheme } from "../context/theme"
import { useData } from "../context/data"
import { useAuth } from "../context/auth"
import { useState, useMemo, useEffect, useRef } from "react"
import { RangeDatePicker } from "./components/RangeDatePicker"
import { StatCard } from "./components/StatCard"
import { Skeleton } from "@mui/material"
import { useNavigate } from "react-router"

// Rotated X axis tick for Recharts
function RotatedTick(props: any) {
  const { x, y, payload, fill } = props
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill={fill}
        transform="rotate(-30)"
        style={{ fontSize: '0.825rem' }}
      >
        {payload && payload.value}
      </text>
    </g>
  )
}

const revenueData = [
  { month: "Jan", income: 45000, expend: 38000 },
  { month: "Feb", income: 52000, expend: 42000 },
  { month: "Mar", income: 48000, expend: 35000 },
  { month: "Apr", income: 38000, expend: 28000 },
  { month: "May", income: 55000, expend: 45000 },
  { month: "Jun", income: 62000, expend: 48000 },
  { month: "Jul", income: 58000, expend: 42000 },
]

const warehouseCapacity = [
  { day: "Mon", used: 7200, available: 2800 },
  { day: "Tue", used: 7500, available: 2500 },
  { day: "Wed", used: 8100, available: 1900 },
  { day: "Thu", used: 7800, available: 2200 },
  { day: "Fri", used: 8400, available: 1600 },
  { day: "Sat", used: 7900, available: 2100 },
  { day: "Sun", used: 7300, available: 2700 },
]

const orderFulfillmentData = [
  { month: "March", current: 56000, forecast: 22000 },
  { month: "April", current: 90000, forecast: 96000 },
  { month: "May", current: 102000, forecast: 92000 },
  { month: "June", current: 94000, forecast: 72000 },
  { month: "July", current: 88000, forecast: 60000 },
  { month: "August", current: 60000, forecast: 8000 },
]

export default function WarehouseDashboard() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'
  const { colors } = useTheme()
  const navigate = useNavigate()
  const { 
    pickings, 
    stockMoves, 
    productTemplates, 
    products,
    quants,
    categories,
    partners,
    fetchData,
    loading
  } = useData()
  const { uid, sessionId } = useAuth()
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)
  const [dateRange, setDateRange] = useState<[string | null, string | null] | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Cache duration: 30 minutes
  const CACHE_DURATION = 30 * 60 * 1000
  const CACHE_PREFIX = 'overview_cache_'

  // Helper function to get cached data
  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`)
      if (!cached) return null
      const { data, timestamp } = JSON.parse(cached)
      const now = Date.now()
      if (now - timestamp > CACHE_DURATION) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`)
        return null
      }
      return data
    } catch {
      return null
    }
  }

  // Helper function to set cached data
  const setCachedData = (key: string, data: any) => {
    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  }

  // Get data with cache fallback
  const getDataWithCache = (dataType: string, currentData: any[]) => {
    // If we have data in context, use it and update cache
    if (Array.isArray(currentData) && currentData.length > 0) {
      setCachedData(dataType, currentData)
      return currentData
    }
    
    // Check cache
    const cached = getCachedData(dataType)
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached
    }
    
    return currentData
  }

  // Use cached data as fallback
  const cachedPickings = useMemo(() => getDataWithCache("pickings", pickings), [pickings])
  const cachedStockMoves = useMemo(() => getDataWithCache("stockMoves", stockMoves), [stockMoves])
  const cachedProductTemplates = useMemo(() => getDataWithCache("productTemplates", productTemplates), [productTemplates])
  const cachedProducts = useMemo(() => getDataWithCache("products", products), [products])
  const cachedQuants = useMemo(() => getDataWithCache("quants", quants), [quants])
  const cachedCategories = useMemo(() => getDataWithCache("categories", categories), [categories])
  const cachedPartners = useMemo(() => getDataWithCache("partners", partners), [partners])

  // Fetch data on mount - with localStorage caching (only fetch if cache is missing or expired)
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (hasFetchedRef.current) return
    if (!sessionId) return
    
    hasFetchedRef.current = true
    
    // Only fetch if we don't have data in context AND cache is missing/expired
    const needsPickings = !Array.isArray(pickings) || !pickings.length
    const needsStockMoves = !Array.isArray(stockMoves) || !stockMoves.length
    const needsProductTemplates = !Array.isArray(productTemplates) || !productTemplates.length
    const needsProducts = !Array.isArray(products) || !products.length
    const needsQuants = !Array.isArray(quants) || !quants.length
    const needsCategories = !Array.isArray(categories) || !categories.length
    const needsPartners = !Array.isArray(partners) || !partners.length
    
    // Check if cache exists for each data type
    const hasCachedPickings = getCachedData("pickings") !== null
    const hasCachedStockMoves = getCachedData("stockMoves") !== null
    const hasCachedProductTemplates = getCachedData("productTemplates") !== null
    const hasCachedProducts = getCachedData("products") !== null
    const hasCachedQuants = getCachedData("quants") !== null
    const hasCachedCategories = getCachedData("categories") !== null
    const hasCachedPartners = getCachedData("partners") !== null
    
    // Only fetch if data is missing AND cache is also missing/expired
    if (needsPickings && !hasCachedPickings) fetchData("pickings")
    if (needsStockMoves && !hasCachedStockMoves) fetchData("stockMoves")
    if (needsProductTemplates && !hasCachedProductTemplates) fetchData("productTemplates")
    if (needsProducts && !hasCachedProducts) fetchData("products")
    if (needsQuants && !hasCachedQuants) fetchData("quants")
    if (needsCategories && !hasCachedCategories) fetchData("categories")
    if (needsPartners && !hasCachedPartners) fetchData("partners")
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Update cache when data changes
  useEffect(() => {
    if (Array.isArray(pickings) && pickings.length > 0) setCachedData("pickings", pickings)
  }, [pickings])

  useEffect(() => {
    if (Array.isArray(stockMoves) && stockMoves.length > 0) setCachedData("stockMoves", stockMoves)
  }, [stockMoves])

  useEffect(() => {
    if (Array.isArray(productTemplates) && productTemplates.length > 0) setCachedData("productTemplates", productTemplates)
  }, [productTemplates])

  useEffect(() => {
    if (Array.isArray(products) && products.length > 0) setCachedData("products", products)
  }, [products])

  useEffect(() => {
    if (Array.isArray(quants) && quants.length > 0) setCachedData("quants", quants)
  }, [quants])

  useEffect(() => {
    if (Array.isArray(categories) && categories.length > 0) setCachedData("categories", categories)
  }, [categories])

  useEffect(() => {
    if (Array.isArray(partners) && partners.length > 0) setCachedData("partners", partners)
  }, [partners])

  // Calculate total valuation from quants (using cached data) - with cache
  const totalValuation = useMemo(() => {
    const cached = getCachedData("totalValuation")
    if (cached !== null && typeof cached === "number") {
      // Use cached value but also recalculate in background
      if (!Array.isArray(cachedQuants) || !Array.isArray(cachedProducts)) return cached
    }
    
    if (!Array.isArray(cachedQuants) || !Array.isArray(cachedProducts)) return 0
    const priceMap: Record<number, number> = {}
    for (const p of cachedProducts) {
      const id = p.id
      const price = typeof p.standard_price === "number" ? p.standard_price : (typeof p.list_price === "number" ? p.list_price : 0)
      if (id != null) priceMap[id] = price
    }
    let total = 0
    for (const q of cachedQuants) {
      const prodId = Array.isArray(q.product_id) ? q.product_id[0] : q.product_id
      if (!prodId) continue
      const qty = typeof q.quantity === "number" ? q.quantity : (typeof q.qty === "number" ? q.qty : 0)
      const invValue = typeof q.inventory_value === "number" ? q.inventory_value : null
      if (invValue != null) {
        total += invValue
      } else {
        const price = priceMap[prodId] || 0
        total += qty * price
      }
    }
    setCachedData("totalValuation", total)
    return total
  }, [cachedQuants, cachedProducts])

  // Calculate total stock (count of products) - using cached data
  const totalStock = useMemo(() => {
    if (!Array.isArray(cachedProductTemplates)) return 0
    return cachedProductTemplates.length
  }, [cachedProductTemplates])

  // Total transfers (pickings) - using cached data
  const totalTransfers = Array.isArray(cachedPickings) ? cachedPickings.length : 0

  // Inventory distribution by category - using product_count from product.category (using cached data)
  const inventoryDistribution = useMemo(() => {
    if (!Array.isArray(cachedCategories)) return []
    
    // Filter categories that have products
    const categoriesWithProducts = cachedCategories.filter((cat: any) => {
      const productCount = typeof cat.product_count === "number" ? cat.product_count : 0
      return productCount > 0
    })
    
    if (categoriesWithProducts.length === 0) return []
    
    const total = categoriesWithProducts.reduce((sum: number, cat: any) => {
      const productCount = typeof cat.product_count === "number" ? cat.product_count : 0
      return sum + productCount
    }, 0)
    
    if (total === 0) return []
    
    const gradients = [
      { start: "#fa709a", end: "#fee140" },
      { start: "#f093fb", end: "#f5576c" },
      { start: "#4facfe", end: "#00f2fe" },
      { start: "#43e97b", end: "#38f9d7" },
    ]
    const palette = ["#fa709a", "#f093fb", "#4facfe", "#43e97b", "#fee140", "#f5576c", "#00f2fe", "#38f9d7"]
    return categoriesWithProducts
      .map((cat: any, index: number) => {
        const productCount = typeof cat.product_count === "number" ? cat.product_count : 0
        const name = cat.name || cat.complete_name || `Category #${cat.id}`
        const gradient = gradients[index % gradients.length]
        return {
          name,
          value: Math.round((productCount / total) * 100),
          count: productCount,
          color: palette[index % palette.length],
          gradientStart: gradient.start,
          gradientEnd: gradient.end,
          gradient: `linear-gradient(135deg, ${gradient.start} 0%, ${gradient.end} 100%)`
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [cachedCategories, colors])

  // Recent activities from stockMoves (using cached data) - with cache
  const recentActivities = useMemo(() => {
    const cached = getCachedData("recentActivities")
    if (cached && Array.isArray(cached) && cached.length > 0) {
      // Use cached value but also recalculate in background
      if (!Array.isArray(cachedStockMoves)) return cached
    }
    
    if (!Array.isArray(cachedStockMoves)) return []
    const productMap: Record<number, any> = {}
    for (const p of cachedProducts || []) productMap[p.id] = p
    
    const activities = cachedStockMoves
      .slice()
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateB - dateA
      })
      .slice(0, 15)
      .map((move) => {
        const prodId = Array.isArray(move.product_id) ? move.product_id[0] : move.product_id
        const product = productMap[prodId]
        const productName = product?.name || product?.display_name || (Array.isArray(move.product_id) ? move.product_id[1] : "Unknown")
        const qty = typeof move.product_uom_qty === "number" ? move.product_uom_qty : (typeof move.quantity_done === "number" ? move.quantity_done : 0)
        const moveType = move.location_id?.[1]?.toLowerCase().includes("supplier") || move.location_id?.[1]?.toLowerCase().includes("vendor") ? "in" :
                        move.location_dest_id?.[1]?.toLowerCase().includes("customer") || move.location_dest_id?.[1]?.toLowerCase().includes("client") ? "out" :
                        move.picking_code === "incoming" ? "in" :
                        move.picking_code === "outgoing" ? "out" : "adjust"
        const date = move.date ? new Date(move.date) : new Date()
        const hoursAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60))
        const timeStr = hoursAgo < 1 ? t("Just now") : hoursAgo === 1 ? t("1 hour ago") : t("{{hours}} hours ago", { hours: hoursAgo })
        
        return {
          action: moveType === "in" ? t("Stock Received") : moveType === "out" ? t("Order Shipped") : t("Stock Adjusted"),
          product: productName,
          quantity: qty,
          time: timeStr,
          type: moveType
        }
      })
    
    setCachedData("recentActivities", activities)
    return activities
  }, [cachedStockMoves, cachedProducts, t])

  // Low stock alerts (using cached data)
  const lowStockAlerts = useMemo(() => {
    if (!Array.isArray(cachedProductTemplates)) return []
    return cachedProductTemplates
      .filter((p: any) => {
        const qtyAvailable = typeof p.qty_available === "number" ? p.qty_available : 0
        const minQty = typeof p.reordering_min_qty === "number" ? p.reordering_min_qty : (typeof p.min_qty === "number" ? p.min_qty : 50)
        return qtyAvailable < minQty
      })
      .slice(0, 15)
      .map((p: any) => {
        const qtyAvailable = typeof p.qty_available === "number" ? p.qty_available : 0
        const minQty = typeof p.reordering_min_qty === "number" ? p.reordering_min_qty : (typeof p.min_qty === "number" ? p.min_qty : 50)
        const status = qtyAvailable < (minQty * 0.3) ? "critical" : "warning"
        return {
          product: p.name || p.display_name || `#${p.id}`,
          sku: p.default_code || p.barcode || `SKU-${p.id}`,
          current: qtyAvailable,
          minimum: minQty,
          status
        }
      })
  }, [cachedProductTemplates])

  // Top inventory items (using cached data)
  const topItems = useMemo(() => {
    if (!Array.isArray(cachedProductTemplates)) return []
    return cachedProductTemplates.slice(0, 10)
  }, [cachedProductTemplates])

  // Latest transfers (pickings) - using cached data
  const latestTransfers = useMemo(() => {
    if (!Array.isArray(cachedPickings)) return []
    return cachedPickings
      .slice()
      .sort((a, b) => {
        const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : (a.date_done ? new Date(a.date_done).getTime() : 0)
        const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : (b.date_done ? new Date(b.date_done).getTime() : 0)
        return dateB - dateA
      })
      .slice(0, 15)
  }, [cachedPickings])
  return (
    <>
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

          @keyframes fadeInDown {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <div style={{ minHeight: "100vh", background: colors.background }}>
      <div
        style={{
          background: colors.background,
            padding: isMobile ? "1rem" : "2rem",
            color: colors.textPrimary,
        }}
      >
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Title and Actions */}
        <div
          style={{
            display: "flex",
                flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
                alignItems: isMobile ? "flex-start" : "center",
                gap: isMobile ? "1rem" : "0",
                marginBottom: "2rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: "700",
                color: colors.textPrimary,
                marginBottom: "0.5rem",
                letterSpacing: "-0.025em",
              }}
            >
              {t('Warehouse Inventory Dashboard')}
            </h1>
            <p style={{ fontSize: "0.95rem", color: colors.textSecondary }}>
              {t('Real-time overview of your warehouse operations and inventory')}
            </p>
          </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
              <div style={{ width: isMobile ? "100%" : "280px" }}>
                <RangeDatePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder={[t("Start date"), t("End date")]}
                />
              </div>
                <Button
                type="button"
                  variant="outline"
                onClick={() => {
                  hasFetchedRef.current = false
                  fetchData("pickings")
                  fetchData("stockMoves")
                  fetchData("productTemplates")
                  fetchData("products")
                  fetchData("quants")
                  fetchData("categories")
                  fetchData("partners")
                }}
                disabled={!!loading?.pickings || !!loading?.stockMoves || !!loading?.productTemplates}
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
                <RefreshCcw className={`w-4 h-4 ${loading?.pickings || loading?.stockMoves || loading?.productTemplates ? "animate-spin" : ""}`} />
                {loading?.pickings || loading?.stockMoves || loading?.productTemplates ? t("Loading...") : t("Refresh")}
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        {loading.quants || loading.products || loading.pickings ? (
        <div
          style={{
            display: "grid",
            gap: "1.5rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            marginBottom: "2rem",
          }}
        >
            {[0, 1, 2, 3].map((idx) => (
              <Skeleton key={idx} variant="rectangular" width="100%" height={120} style={{ borderRadius: "1rem" }} />
            ))}
            </div>
        ) : (
              <div
                style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            <StatCard
              label={t("Total Valuation")}
              value={`$${totalValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              icon={DollarSign}
              gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
              delay={0}
            />
            <StatCard
              label={t("Total Stock")}
              value={totalStock.toLocaleString()}
              icon={Package}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              delay={1}
            />
            <StatCard
              label={t("Total Transfers")}
              value={totalTransfers.toLocaleString()}
              icon={Layers}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Total Products")}
              value={Array.isArray(cachedProductTemplates) ? cachedProductTemplates.length.toLocaleString() : "0"}
              icon={BarChart3}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
              </div>
        )}

        <div
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(3, 1fr)",
            marginBottom: "2rem",
          }}
        >
          {/* Revenue Performance Chart */}
          <div
            style={{
              background: colors.card,
              borderRadius: "0.75rem",
              padding: "1.5rem",
              border: `1px solid ${colors.border}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              animation: "fadeInUp 0.6s ease-out 0.5s backwards",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "0.5rem" }}>
                  {t('Revenue Performance')}
                </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.875rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ height: "0.75rem", width: "0.75rem", borderRadius: "9999px", background: "#6366f1" }} />
                  <span style={{ color: colors.textSecondary }}>{t('Income')}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ height: "0.75rem", width: "0.75rem", borderRadius: "9999px", background: "#ec4899" }} />
                  <span style={{ color: colors.textSecondary }}>{t('Expend')}</span>
                </div>
              </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    style={{
                      borderRadius: "0.75rem",
                      border: `1px solid ${colors.border}`,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      background: "transparent",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {t('Monthly')}
                    <ChevronDown style={{ marginLeft: "0.5rem", height: "1rem", width: "1rem" }} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>{t('Daily')}</DropdownMenuItem>
                  <DropdownMenuItem>{t('Weekly')}</DropdownMenuItem>
                  <DropdownMenuItem>{t('Monthly')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {(loading.quants || loading.products) && !cachedQuants.length ? (
              <Skeleton variant="rectangular" width="100%" height={250} style={{ borderRadius: "0.5rem" }} />
            ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={colors.border} vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke={colors.textSecondary}
                  style={{ fontSize: "0.875rem" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke={colors.textSecondary} style={{ fontSize: "0.875rem" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "0.5rem",
                    color: colors.textPrimary,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="expend"
                  stroke="#ec4899"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorExpend)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>

          <div
            style={{
              background: colors.card,
              borderRadius: "0.75rem",
              padding: "1.5rem",
              border: `1px solid ${colors.border}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              animation: "fadeInUp 0.6s ease-out 0.6s backwards",
            }}
          >
            <div style={{ marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "0.5rem" }}>
                {t('Warehouse Capacity')}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.875rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ height: "0.75rem", width: "0.75rem", borderRadius: "9999px", background: "#9fc5e8" }} />
                  <span style={{ color: colors.textSecondary }}>{t('Used')}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ height: "0.75rem", width: "0.75rem", borderRadius: "9999px", background: "#60a5fa" }} />
                  <span style={{ color: colors.textSecondary }}>{t('Available')}</span>
                </div>
              </div>
            </div>
            {loading.quants && !cachedQuants.length ? (
              <Skeleton variant="rectangular" width="100%" height={250} style={{ borderRadius: "0.5rem" }} />
            ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={warehouseCapacity}>
                <CartesianGrid stroke={colors.border} vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke={colors.textSecondary}
                  style={{ fontSize: "0.875rem" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke={colors.textSecondary} style={{ fontSize: "0.875rem" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "0.5rem",
                    color: colors.textPrimary,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="used" stackId="a" fill="#33C3FD" radius={[0, 0, 0, 0]} />
                <Bar dataKey="available" stackId="a" fill="#b5eaff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>

          {/* Inventory Distribution Pie Chart */}
          <div
            style={{
              background: colors.card,
              borderRadius: "0.75rem",
              padding: "1.5rem",
              border: `1px solid ${colors.border}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              animation: "fadeInUp 0.6s ease-out 0.7s backwards",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: colors.textPrimary }}>{t('Inventory Distribution')}</h3>
              <MoreVertical style={{ height: "1.25rem", width: "1.25rem", color: colors.textSecondary }} />
            </div>
            {(loading.quants || loading.products || loading.categories) && !cachedQuants.length && !cachedCategories.length ? (
              <Skeleton variant="rectangular" width="100%" height={200} style={{ borderRadius: "0.5rem" }} />
            ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={inventoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {inventoryDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "0.5rem",
                    color: colors.textPrimary,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            )}
            <div
              style={{
                marginTop: "1rem",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              {inventoryDistribution.length > 0 ? inventoryDistribution.map((entry, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        height: "0.5rem",
                        width: "0.5rem",
                        borderRadius: "9999px",
                        background: (entry as any).gradient || entry.color,
                      }}
                    />
                    <span style={{ fontSize: "0.875rem", color: colors.textSecondary }}>{entry.name}</span>
                  </div>
                  <span style={{ fontSize: "0.875rem", fontWeight: "600", color: colors.textPrimary }}>{entry.value}%</span>
                </div>
              )) : (
                <div style={{ textAlign: "center", padding: "1rem", color: colors.textSecondary }}>
                  {t("No data available")}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "2fr 1fr",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              background: colors.card,
              borderRadius: "0.75rem",
              padding: "1.5rem",
              border: `1px solid ${colors.border}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              animation: "fadeInUp 0.6s ease-out 0.8s backwards",
            }}
          >
            <div style={{ marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "0.5rem" }}>
                {t('Order Fulfillment Rate')}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.875rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ height: "0.5rem", width: "0.5rem", borderRadius: "9999px", background: "#f59e0b" }} />
                  <span style={{ color: colors.textSecondary }}>{t('Forecast')}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ height: "0.5rem", width: "0.5rem", borderRadius: "9999px", background: "#10b981" }} />
                  <span style={{ color: colors.textSecondary }}>{t('Current')}</span>
                </div>
              </div>
            </div>
            {loading.pickings ? (
              <Skeleton variant="rectangular" width="100%" height={250} style={{ borderRadius: "0.5rem" }} />
            ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={orderFulfillmentData} barCategoryGap={30} barGap={10}>
                <CartesianGrid stroke={colors.border} vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke={colors.textSecondary}
                  style={{ fontSize: "0.875rem" }}
                  axisLine={false}
                  tickLine={false}
                  tick={<RotatedTick fill={colors.textSecondary} />}
                />
                <YAxis stroke={colors.textSecondary} style={{ fontSize: "0.875rem" }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v/1000)}K` : `${v}`)}
                />
                <Tooltip
                  contentStyle={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "0.5rem",
                    color: colors.textPrimary,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="forecast" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="current" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>

          <div
            style={{
              background: colors.card,
              borderRadius: "0.75rem",
              padding: "1.5rem",
              border: `1px solid ${colors.border}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              animation: "fadeInUp 0.6s ease-out 0.9s backwards",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: colors.textPrimary }}>{t('Recent Activities')}</h3>
              <Activity style={{ height: "1.25rem", width: "1.25rem", color: colors.textSecondary }} />
            </div>
            {(loading.stockMoves || loading.products) && !cachedStockMoves.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[0, 1, 2, 3].map((idx) => (
                  <Skeleton key={idx} variant="rectangular" width="100%" height={60} style={{ borderRadius: "0.5rem" }} />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "320px", overflowY: "auto", paddingRight: "4px" }}>
                {recentActivities.length > 0 ? recentActivities.map((activity, index) => {
                  const getActivityTheme = () => {
                    switch (activity.type) {
                      case "in":
                        return {
                          icon: <TrendingUp className="w-4 h-4" />,
                          iconColor: "#10b981",
                        }
                      case "out":
                        return {
                          icon: <Truck className="w-4 h-4" />,
                          iconColor: "#3b82f6",
                        }
                      case "adjust":
                        return {
                          icon: <BarChart3 className="w-4 h-4" />,
                          iconColor: "#f59e0b",
                        }
                      case "return":
                      default:
                        return {
                          icon: <TrendingDown className="w-4 h-4" />,
                          iconColor: "#ef4444",
                        }
                    }
                  }
                  
                  const activityTheme = getActivityTheme()
                  
                  return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    paddingBottom: "1rem",
                    borderBottom: index < recentActivities.length - 1 ? `1px solid ${colors.border}` : "none",
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "0.5rem",
                      background: `${activityTheme.iconColor}15`,
                      color: activityTheme.iconColor,
                    }}
                  >
                    {activityTheme.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "0.125rem" }}>
                      {t(activity.action)}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: "0.25rem" }}>
                      {activity.product} ({activity.quantity} {t('units')})
                    </div>
                    <div style={{ fontSize: "0.75rem", color: colors.textSecondary }}>{activity.time}</div>
                  </div>
                </div>
                  )
                }) : (
                <div style={{ textAlign: "center", padding: "2rem", color: colors.textSecondary }}>
                  {t("No recent activities")}
            </div>
              )}
            </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "1fr 1fr",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              background: colors.card,
              borderRadius: "0.75rem",
              padding: "1.5rem",
              border: `1px solid ${colors.border}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              animation: "fadeInUp 0.6s ease-out 1s backwards",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    height: "2.5rem",
                    width: "2.5rem",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "0.75rem",
                    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  }}
                >
                  <AlertTriangle style={{ height: "1.25rem", width: "1.25rem", color: "white" }} />
                </div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: colors.textPrimary }}>{t('Low Stock Alerts')}</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/products')}
                disabled={false}
                className="gap-2 font-semibold border"
                style={{
                  background: colors.card,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                }}
              >
                {t('See more')}
              </Button>
            </div>
            {loading.productTemplates && !cachedProductTemplates.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => (
                  <Skeleton key={idx} variant="rectangular" width="100%" height={50} style={{ borderRadius: "0.5rem" }} />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", height: "380px", overflowY: "auto", paddingRight: "4px" }}>
                {lowStockAlerts.length > 0 ? lowStockAlerts.map((alert, index) => (
                <div
                  key={index}
                  className="group"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    background: alert.status === "critical" ? "rgb(254 242 242)" : "rgb(254 242 242)",
                    border: `1px solid ${alert.status === "critical" ? "rgb(254 226 226)" : "rgb(254 226 226)"}`,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (alert.status === "critical") {
                      e.currentTarget.style.backgroundColor = "rgb(254 226 226)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (alert.status === "critical") {
                      e.currentTarget.style.backgroundColor = "rgb(254 242 242)"
                    }
                  }}
                >
                  <AlertTriangle className="text-red-500 shrink-0" size={16} style={{ color: "#991b1b" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#991b1b", marginBottom: "0.125rem" }}>
                      {alert.product}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "rgb(127 29 29)" }}>{t('SKU:')} {alert.sku}</div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: "center", padding: "2rem", color: colors.textSecondary }}>
                  {t("No low stock alerts")}
            </div>
              )}
            </div>
            )}
          </div>

          {/* Inventory Items */}
          <div
            style={{
              background: colors.card,
              borderRadius: "0.75rem",
              padding: "1.5rem",
              paddingBottom: 0,
              border: `1px solid ${colors.border}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              animation: "fadeInUp 0.6s ease-out 1.1s backwards",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: colors.textPrimary }}>{t('Top Inventory Items')}</h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/products')}
                disabled={false}
                className="gap-2 font-semibold border"
                style={{
                  background: colors.card,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                }}
              >
                {t('See all')}
              </Button>
            </div>
            {loading.productTemplates && !cachedProductTemplates.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {[0, 1, 2, 3, 4].map((idx) => (
                  <Skeleton key={idx} variant="rectangular" width="100%" height={60} style={{ borderRadius: "0.5rem" }} />
                ))}
              </div>
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", height: "380px", overflowY: "auto", paddingRight: "4px" }}>
                {topItems.length > 0 ? topItems.map((p: any, index: number) => {
                const name = p.name || p.display_name || `#${p.id}`
                const code = (p.default_code || '').toString()
                const category = Array.isArray(p.categ_id) ? p.categ_id[1] : (p.category || '')
                const price = (p.list_price ?? p.standard_price ?? '').toString()
                return (
                  <div
                    key={p.id ?? index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          display: "flex",
                          height: "40px",
                          width: "40px",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          borderRadius: "0.5rem",
                          backgroundColor: colors.card,
                        }}
                      >
                        {p.image_512 ? (
                          <img
                            src={`data:image/png;base64,${p.image_512}`}
                            alt={name}
                            style={{
                              objectFit: "contain",
                              height: "100%",
                              width: "100%",
                              borderRadius: "0.5rem",
                              backgroundColor: colors.card,
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                              const parent = e.currentTarget.parentElement
                              if (parent) {
                                const icon = document.createElement("div")
                                icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>'
                                parent.appendChild(icon)
                              }
                            }}
                          />
                        ) : (
                          <Package style={{ height: "1.5rem", width: "1.5rem", color: colors.textPrimary }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", color: colors.textPrimary, fontSize: "0.9rem" }}>{name}</div>
                        <div style={{ fontSize: "0.8rem", color: colors.textSecondary }}>
                          {category}{code ? ` • ${code}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, color: colors.textPrimary }}>{price ? `$${price}` : ''}</div>
                  </div>
                )
              }) : (
                <div style={{ textAlign: "center", padding: "2rem", color: colors.textSecondary }}>
                  {t("No products available")}
            </div>
              )}
            </div>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", marginBottom: "2rem" }}>
          {/* Supplier Info - List Style */}
          <div
            style={{
              background: colors.card,
              borderRadius: "0.75rem",
              padding: "1.5rem",
              border: `1px solid ${colors.border}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "1rem" }}>{t('Supplier Info')}</h3>
            {loading.partners && !cachedPartners.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[0, 1, 2, 3, 4].map((idx) => (
                  <Skeleton key={idx} variant="rectangular" width="100%" height={70} style={{ borderRadius: "0.5rem" }} />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", height: "400px", overflowY: "auto" }}>
                {Array.isArray(cachedPartners) && cachedPartners.length > 0 ? cachedPartners.map((partner: any, index: number) => {
                  const name = partner.name || partner.display_name || `#${partner.id}`
                  const email = partner.email || "-"
                  const phone = partner.phone || partner.mobile || "-"
                  const isSupplier = partner.supplier_rank && partner.supplier_rank > 0
                  const isCustomer = partner.customer_rank && partner.customer_rank > 0
                  const type = isSupplier && isCustomer ? t("Both") : isSupplier ? t("Supplier") : isCustomer ? t("Customer") : t("Other")
                  
                  // Icon and color based on type (no gradients)
                  const getTypeTheme = () => {
                    if (isSupplier && isCustomer) {
                      return {
                        icon: <User className="w-4 h-4" />,
                        iconColor: "#a78bfa",
                        bg: "bg-purple-500/10",
                        text: "text-purple-600 dark:text-purple-400",
                      }
                    } else if (isSupplier) {
                      return {
                        icon: <Package className="w-4 h-4" />,
                        iconColor: "#3b82f6",
                        bg: "bg-blue-500/10",
                        text: "text-blue-600 dark:text-blue-400",
                      }
                    } else if (isCustomer) {
                      return {
                        icon: <Star className="w-4 h-4" />,
                        iconColor: "#10b981",
                        bg: "bg-emerald-500/10",
                        text: "text-emerald-600 dark:text-emerald-400",
                      }
                    } else {
                      return {
                        icon: <User className="w-4 h-4" />,
                        iconColor: "#f59e0b",
                        bg: "bg-orange-500/10",
                        text: "text-orange-600 dark:text-orange-400",
                      }
                    }
                  }
                  
                  const typeTheme = getTypeTheme()
                  
                  return (
                    <div
                      key={partner.id || index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        background: colors.card,
                        border: `1px solid ${colors.border}`,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.mutedBg
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.card
                      }}
                    >
                      {/* Icon with solid color */}
                      <div
                        className="flex items-center justify-center flex-shrink-0"
                        style={{ 
                          width: "32px",
                          height: "32px",
                          borderRadius: "0.5rem",
                          background: `${typeTheme.iconColor}15`,
                          color: typeTheme.iconColor
                        }}
                      >
                        {typeTheme.icon}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.875rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "0.25rem" }}>
                          {name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem", color: colors.textSecondary, flexWrap: "wrap" }}>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${typeTheme.bg} ${typeTheme.text}`}>
                            {type}
                          </span>
                          {email !== "-" && (
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Mail className="w-3 h-3" />
                              {email}
                            </span>
                          )}
                          {phone !== "-" && (
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Phone className="w-3 h-3" />
                              {phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }) : (
                  <div style={{ textAlign: "center", padding: "2rem", color: colors.textSecondary }}>
                    {t("No suppliers available")}
            </div>
                )}
              </div>
            )}
          </div>

          {/* Latest Transfers - List Style */}
          <div
            style={{
              background: colors.card,
              borderRadius: "0.75rem",
              padding: "1.5rem",
              border: `1px solid ${colors.border}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "1rem" }}>{t('Latest Transfers')}</h3>
            {loading.pickings && !cachedPickings.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[0, 1, 2, 3, 4].map((idx) => (
                  <Skeleton key={idx} variant="rectangular" width="100%" height={70} style={{ borderRadius: "0.5rem" }} />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", height: "400px", overflowY: "auto" }}>
                {latestTransfers.length > 0 ? latestTransfers.map((transfer: any, index: number) => {
                  const name = transfer.name || transfer.display_name || `#${transfer.id}`
                  const state = transfer.state || "draft"
                  
                  const getStatusTheme = (status: string) => {
                    switch (status) {
                      case "done":
                        return {
                          icon: <CheckCircle2 className="w-4 h-4" />,
                          iconColor: "#10b981",
                          label: t("Completed"),
                          bg: "bg-emerald-500/10",
                          text: "text-emerald-600 dark:text-emerald-400",
                        }
                      case "ready":
                      case "assigned":
                      case "confirmed":
                        return {
                          icon: <Clock className="w-4 h-4" />,
                          iconColor: "#3b82f6",
                          label: t("Ready"),
                          bg: "bg-blue-500/10",
                          text: "text-blue-600 dark:text-blue-400",
                        }
                      case "cancel":
                      case "cancelled":
                        return {
                          icon: <XCircle className="w-4 h-4" />,
                          iconColor: "#ef4444",
                          label: t("Cancelled"),
                          bg: "bg-rose-500/10",
                          text: "text-rose-600 dark:text-rose-400",
                        }
                      case "draft":
                      default:
                        return {
                          icon: <FileText className="w-4 h-4" />,
                          iconColor: "#f59e0b",
                          label: t("Draft"),
                          bg: "bg-orange-500/10",
                          text: "text-orange-600 dark:text-orange-400",
                        }
                    }
                  }
                  
                  const statusTheme = getStatusTheme(state)
                  
                  return (
                    <div
                      key={transfer.id || index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        background: colors.card,
                        border: `1px solid ${colors.border}`,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.mutedBg
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.card
                      }}
                    >
                      {/* Icon with solid color */}
                      <div
                        className="flex items-center justify-center flex-shrink-0"
                        style={{ 
                          width: "32px",
                          height: "32px",
                          borderRadius: "0.5rem",
                          background: `${statusTheme.iconColor}15`,
                          color: statusTheme.iconColor
                        }}
                      >
                        {statusTheme.icon}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.875rem", fontWeight: "600", color: colors.textPrimary }}>
                          {name}
                        </div>
                      </div>
                      
                      {/* Status badge - smaller */}
                      <div
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusTheme.bg} ${statusTheme.text}`}
                      >
                        {statusTheme.label}
                      </div>
                    </div>
                  )
                }) : (
                  <div style={{ textAlign: "center", padding: "2rem", color: colors.textSecondary }}>
                    {t("No transfers available")}
              </div>
                )}
                  </div>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

