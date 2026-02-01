"use client"

import {
  Home,
  Truck,
  Car,
  Package,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Briefcase,
  Wrench,
  ShoppingCart,
  PackageOpen,
  LayoutGrid,
  Boxes,
  Box,
  QrCode,
  Archive,
  MapPin,
  History,
  Clock,
  TrendingUp,
  DollarSign,
  Warehouse,
  GitBranch,
  Route,
  List,
  Container,
  FolderTree,
  Tag,
  Ruler,
  PackagePlus,
  Layers,
  Trash2,
  LogOut,
  PanelLeftOpen,
  PanelLeftClose,
  Shield,
  Users,
  Key,
  Network,
  LayoutDashboard,
  ListChecks,
  Activity,
  FileSpreadsheet,
  ChartBar,
  Copyright,
  Database,
  Zap,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react"
import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/auth"
import { useSidebar } from "../../context/sidebar"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import { useCasl } from "../../context/casl"
import { ROUTE_TO_PAGE_ID } from "../../src/config/pageRoutes"
import { API_CONFIG, getTenantHeaders } from "../../src/config/api"

type MenuItem = {
  title: string
  icon: LucideIcon
  url?: string
  items?: SubMenuItem[]
  badge?: string
}

type SubMenuItem = {
  title: string
  icon: LucideIcon
  url?: string
  items?: NestedMenuItem[]
}

type NestedMenuItem = {
  title: string
  icon: LucideIcon
  url?: string
}

const menuItems: MenuItem[] = [
  {
    title: "Overview",
    icon: Home,
    url: "/overview",
  },
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    url: "/dashboard",
  },
  {
    title: "Transfers",
    icon: Truck,
    items: [
      { title: "Receipts", icon: Inbox, url: "/receipts" },
      { title: "Deliveries", icon: Truck, url: "/deliveries" },
      { title: "Internal", icon: GitBranch, url: "/internal" },
      { title: "Manufacturing", icon: Settings, url: "/manufacturing" },
      { title: "Dropship", icon: Package, url: "/dropships" },
      { title: "Batch", icon: Layers, url: "/batch" },
      { title: "Wave", icon: TrendingUp, url: "/wave" },
    ],
  },
  {
    title: "Operations",
    icon: Wrench,
    items: [
      { title: "Physical Inventory", icon: Archive, url: "/physical-inventory" },
      { title: "Count Orders", icon: ListChecks, url: "/physical-inventory/orders" },
      { title: "Scrap", icon: Trash2, url: "/scrap" },
      { title: "Landed Costs", icon: DollarSign, url: "/landed-costs" },
    ],
  },
  {
    title: "Inventory",
    icon: Package,
    items: [
      { title: "Products", icon: Package, url: "/products" },
      { title: "Product Variants", icon: LayoutGrid, url: "/product-variants" },
      { title: "Lots & Serial Numbers", icon: QrCode, url: "/lots-serial" },
      { title: "Packages", icon: Boxes, url: "/product-packages" },
      { title: "Product Categories", icon: FolderTree, url: "/categories" },
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    items: [
      { title: "Stocks", icon: Archive, url: "/stocks" },
      { title: "Locations", icon: MapPin, url: "/reporting-location" },
      { title: "Moves History", icon: History, url: "/moves-history" },
      { title: "Valuation", icon: DollarSign, url: "/valuation" },
      { title: "Report Templates", icon: FileSpreadsheet, url: "/report-templates" },
      { title: "Generated Reports", icon: FileSpreadsheet, url: "/generated-reports" },
    ],
  },
  {
    title: "Warehouse Management",
    icon: Warehouse,
    items: [
      { title: "Warehouses", icon: Warehouse, url: "/warehouse-management" },
      { title: "Locations", icon: MapPin, url: "/locations" },
      { title: "Routes", icon: Route, url: "/routes" },
      { title: "Rules", icon: Settings, url: "/rules" },
      { title: "Storage Categories", icon: FolderTree, url: "/storage" },
      { title: "Putaway Rules", icon: Container, url: "/putaway" },
      { title: "Warehouse Navigator", icon: Box, url: "/warehouse-navigator" },
    ],
  },
  {
    title: "Configuration",
    icon: Settings,
    items: [
      { title: "Master Lookups", icon: Database, url: "/master-lookups" },
      { title: "UoM Categories", icon: Ruler, url: "/uom-categories" },
      { title: "Delivery Methods", icon: Truck, url: "/delivery-methods" },
      { title: "Package Types", icon: Package, url: "/package-types" },
      { title: "Attributes", icon: Tag, url: "/attributes" },
      { title: "Product Packagings", icon: Boxes, url: "/product-packagings" },
      { title: "Field Management", icon: ListChecks, url: "/field-management" },
      { title: "Field Layout Editor", icon: LayoutGrid, url: "/field-layout-editor" },
      { title: "Integrations", icon: Settings, url: "/integrations" },
      { title: "License", icon: Copyright, url: "/license" },

    ],
  },
  {
    title: "Workflow",
    icon: GitBranch,
    url: "/workflow-v2",
  },
  {
    title: "User Management",
    icon: Shield,
    items: [
      { title: "Users", icon: Users, url: "/users" },
      { title: "Roles", icon: Shield, url: "/roles" },
      { title: "Policies", icon: Key, url: "/policies" },
      { title: "Org Chart", icon: Network, url: "/org-chart" },
    ],
  },
]

// Icon mapping from string names to Lucide icons
const getIconByName = (iconName: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    Car: Car,
    Truck: Truck,
    Home: Home,
    Package: Package,
    Settings: Settings,
    Shield: Shield,
    Users: Users,
    Key: Key,
    Network: Network,
  }
  return iconMap[iconName] || Settings
}

export function EnhancedSidebar() {
  const navigate = useNavigate()
  const { name } = useAuth()
  const location = useLocation()
  const { signOut } = useAuth()
  const { isCollapsed, toggleSidebar, setHasSecondaryPanel } = useSidebar()
  const [selectedModule, setSelectedModule] = useState<MenuItem | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const { mode, colors } = useTheme()
  const isDarkMode = mode === "dark"
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { canViewPage, isLoading: isCaslLoading } = useCasl()
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [fleetPages, setFleetPages] = useState<SubMenuItem[]>([])

  const canViewRoute = useCallback(
    (url: string | undefined): boolean => {
      if (!url) return true
      const pageId = ROUTE_TO_PAGE_ID[url]
      if (!pageId) return true
      return canViewPage(pageId)
    },
    [canViewPage],
  )

  const filterMenuItems = useCallback(
    (items: MenuItem[]): MenuItem[] => {
      return items
        .map((item) => {
          if (item.url && !canViewRoute(item.url)) {
            return null
          }
          if (item.items) {
            const filteredSubItems = item.items
              .map((subItem) => {
                if (subItem.url && !canViewRoute(subItem.url)) {
                  return null
                }
                if (subItem.items) {
                  const filteredNested = subItem.items.filter((nested) => !nested.url || canViewRoute(nested.url))
                  if (filteredNested.length === 0) {
                    return null
                  }
                  return { ...subItem, items: filteredNested }
                }
                return subItem
              })
              .filter((subItem): subItem is SubMenuItem => subItem !== null)

            if (filteredSubItems.length === 0 && item.items.length > 0) {
              return null
            }
            return { ...item, items: filteredSubItems }
          }
          return item
        })
        .filter((item): item is MenuItem => item !== null)
    },
    [canViewRoute],
  )

  useEffect(() => {
    const loadFleetPages = async () => {
      try {
        const response = await fetch(
          `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/registry/modules/11/pages`,
          { headers: getTenantHeaders() }
        )
        const data = await response.json()
        if (data.success && data.data) {
          const pages: SubMenuItem[] = data.data
            .filter((page: any) => page.is_active)
            .map((page: any) => ({
              title: page.page_name,
              icon: getIconByName(page.icon || 'Settings'),
              url: page.route,
            }))
          setFleetPages(pages)
        }
      } catch (error) {
        console.error('Error loading Fleet Management pages:', error)
      }
    }
    loadFleetPages()
  }, [])

  const visibleMenuItems = useMemo(() => {
    if (isCaslLoading) {
      return menuItems
    }
    const filteredItems = filterMenuItems(menuItems)
    const accessibleFleetPages = fleetPages.filter((page) => {
      if (!page.url) return false
      return canViewRoute(page.url)
    })

    if (accessibleFleetPages.length > 0) {
      const fleetIndex = filteredItems.findIndex((item) => item.title === 'Fleet Management')
      const fleetMenuItem: MenuItem = {
        title: 'Fleet Management',
        icon: Car,
        items: accessibleFleetPages,
      }
      if (fleetIndex >= 0) {
        filteredItems[fleetIndex] = fleetMenuItem
      } else {
        const insertIndex = filteredItems.findIndex((item) => item.title === 'User Management')
        if (insertIndex >= 0) {
          filteredItems.splice(insertIndex, 0, fleetMenuItem)
        } else {
          filteredItems.push(fleetMenuItem)
        }
      }
    }
    return filteredItems
  }, [isCaslLoading, filterMenuItems, fleetPages, canViewRoute])

  const isActive = (url: string) => location.pathname === url

  const handleNavigation = (url: string) => navigate(url)

  const handleSignOut = () => {
    signOut()
    setShowUserModal(false)
  }

  const handleModuleClick = (item: MenuItem) => {
    if (item.items && item.items.length > 0) {
      setSelectedModule(item)
    } else if (item.url) {
      handleNavigation(item.url)
    }
  }

  const handleBackToModules = () => setSelectedModule(null)

  // Sync secondary panel state with sidebar context
  useEffect(() => {
    setHasSecondaryPanel(selectedModule !== null && selectedModule.items !== undefined)
  }, [selectedModule, setHasSecondaryPanel])

  const isModuleActive = (item: MenuItem): boolean => {
    if (item.url) return isActive(item.url)
    if (item.items) {
      return item.items.some(subItem => {
        if (subItem.url && isActive(subItem.url)) return true
        if (subItem.items) {
          return subItem.items.some(nested => nested.url && isActive(nested.url))
        }
        return false
      })
    }
    return false
  }

  useEffect(() => {
    const activeModule = visibleMenuItems.find(item => isModuleActive(item))
    if (!selectedModule && activeModule && activeModule.items) {
      setSelectedModule(activeModule)
    }
    if (selectedModule && activeModule && activeModule.title !== selectedModule.title && activeModule.items) {
      setSelectedModule(activeModule)
    }
  }, [location.pathname, visibleMenuItems])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (showUserModal && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserModal(false)
      }
    }
    if (showUserModal) {
      document.addEventListener("mousedown", onDocClick)
    }
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [showUserModal])

  // Determine sidebar mode
  const hasSelectedModule = selectedModule !== null && selectedModule.items
  const showFullSidebar = !hasSelectedModule && !isCollapsed
  const showIconsOnly = isCollapsed || hasSelectedModule

  return (
    <div
      className={`flex h-screen fixed ${isRTL ? "right-0" : "left-0"} top-0 transition-all duration-300`}
      style={{
        backgroundColor: isDarkMode ? "#18181b" : "#0F7EA3",
      }}
    >
      {/* Primary Navigation Rail */}
      <div
        className={`flex flex-col h-full transition-all duration-300 ${
          showFullSidebar ? "w-60" : "w-[60px]"
        }`}
        style={{
          borderRight: hasSelectedModule
            ? `1px solid ${isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.15)"}`
            : "none",
        }}
      >
        {/* Logo Header */}
        <div className="h-16 flex items-center justify-center px-3 flex-shrink-0">
          {showFullSidebar ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: isDarkMode
                      ? "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)"
                      : "rgba(255,255,255,0.2)",
                  }}
                >
                  <Boxes className="w-4 h-4 text-white" />
                </div>
                <span className="text-[15px] font-semibold tracking-tight text-white">
                  {t("Smart Inventory")}
                </span>
              </div>
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              >
                <PanelLeftClose className="w-4 h-4 text-white/70" />
              </button>
            </div>
          ) : (
            <button
              onClick={hasSelectedModule ? handleBackToModules : toggleSidebar}
              className="p-2 rounded-lg transition-colors hover:bg-white/10"
              title={hasSelectedModule ? t("Back to modules") : t("Expand sidebar")}
            >
              {hasSelectedModule ? (
                isRTL ? (
                  <ChevronRight className="w-5 h-5 text-white/80" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-white/80" />
                )
              ) : (
                <PanelLeftOpen className="w-5 h-5 text-white/80" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin scrollbar-thumb-white/10">
          <ul className="space-y-0.5">
            {visibleMenuItems.map((item) => {
              const active = isModuleActive(item)
              const isCurrentModule = selectedModule?.title === item.title

              return (
                <li key={item.title}>
                  <button
                    onClick={() => handleModuleClick(item)}
                    className={`w-full flex items-center gap-3 rounded-lg transition-all duration-150 ${
                      showFullSidebar ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"
                    }`}
                    style={{
                      background: active
                        ? isDarkMode
                          ? "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(6,182,212,0.9) 100%)"
                          : "rgba(255,255,255,0.95)"
                        : isCurrentModule
                          ? isDarkMode
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(255,255,255,0.15)"
                          : "transparent",
                      color: active
                        ? isDarkMode
                          ? "#ffffff"
                          : "#0F7EA3"
                        : isDarkMode
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(255,255,255,0.9)",
                      boxShadow: active
                        ? isDarkMode
                          ? "0 4px 12px rgba(59,130,246,0.3)"
                          : "0 2px 8px rgba(0,0,0,0.1)"
                        : "none",
                    }}
                    title={showIconsOnly ? t(item.title) : undefined}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = isDarkMode
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(255,255,255,0.15)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active && !isCurrentModule) {
                        e.currentTarget.style.background = "transparent"
                      } else if (isCurrentModule && !active) {
                        e.currentTarget.style.background = isDarkMode
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(255,255,255,0.15)"
                      }
                    }}
                  >
                    <item.icon
                      className="w-[18px] h-[18px] flex-shrink-0"
                      strokeWidth={active ? 2.5 : 2}
                    />
                    {showFullSidebar && (
                      <>
                        <span className={`flex-1 text-sm ${isRTL ? "text-right" : "text-left"} ${active ? "font-medium" : ""}`}>
                          {t(item.title)}
                        </span>
                        {item.items && item.items.length > 0 && (
                          isRTL ? (
                            <ChevronLeft className="w-4 h-4 opacity-50" />
                          ) : (
                            <ChevronRight className="w-4 h-4 opacity-50" />
                          )
                        )}
                      </>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="p-2 flex-shrink-0" ref={userMenuRef}>
          <div
            className={`flex items-center gap-3 rounded-lg cursor-pointer transition-colors ${
              showFullSidebar ? "p-2.5" : "p-2 justify-center"
            }`}
            style={{ background: "transparent" }}
            onClick={() => setShowUserModal(!showUserModal)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDarkMode
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.15)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
              }}
            >
              <span className="text-xs font-semibold text-white">
                {name.toString().charAt(0).toUpperCase()}
              </span>
            </div>
            {showFullSidebar && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{name}</div>
                <div className="text-xs text-white/50">{t("My Workspace")}</div>
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
          {showUserModal && (
            <div
              className="absolute left-2 right-2 rounded-lg overflow-hidden"
              style={{
                bottom: "4.5rem",
                background: colors.card,
                border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : colors.border}`,
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                zIndex: 100,
              }}
            >
              <button
                onClick={() => setShowUserModal(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors"
                style={{ color: colors.textPrimary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.mutedBg
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent"
                }}
              >
                <Settings className="w-4 h-4" />
                <span>{t("Settings")}</span>
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors"
                style={{ color: "#ef4444" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.mutedBg
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent"
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>{t("Sign Out")}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Panel - Sub-pages */}
      {hasSelectedModule && selectedModule.items && (
        <div
          className="flex flex-col h-full w-52 transition-all duration-300"
          style={{
            background: isDarkMode
              ? "rgba(0,0,0,0.2)"
              : "rgba(0,0,0,0.08)",
          }}
        >
          {/* Module Title */}
          <div className="h-16 flex items-center px-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <selectedModule.icon className="w-4 h-4 text-white/70" />
              <span className="text-sm font-medium text-white">
                {t(selectedModule.title)}
              </span>
            </div>
          </div>

          {/* Sub-pages List */}
          <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin scrollbar-thumb-white/10">
            <ul className="space-y-0.5">
              {selectedModule.items.map((subItem) => {
                const active = isActive(subItem.url || "")

                return (
                  <li key={subItem.title}>
                    <button
                      onClick={() => subItem.url && handleNavigation(subItem.url)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150"
                      style={{
                        background: active
                          ? isDarkMode
                            ? "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(6,182,212,0.9) 100%)"
                            : "rgba(255,255,255,0.95)"
                          : "transparent",
                        color: active
                          ? isDarkMode
                            ? "#ffffff"
                            : "#0F7EA3"
                          : isDarkMode
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(255,255,255,0.85)",
                        boxShadow: active
                          ? isDarkMode
                            ? "0 4px 12px rgba(59,130,246,0.3)"
                            : "0 2px 8px rgba(0,0,0,0.1)"
                          : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = isDarkMode
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(255,255,255,0.12)"
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = "transparent"
                        }
                      }}
                    >
                      <subItem.icon
                        className="w-4 h-4 flex-shrink-0"
                        strokeWidth={active ? 2.5 : 1.75}
                      />
                      <span className={`text-[13px] ${isRTL ? "text-right" : "text-left"} truncate ${active ? "font-medium" : ""}`}>
                        {t(subItem.title)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      )}
    </div>
  )
}
