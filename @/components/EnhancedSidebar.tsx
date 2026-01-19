"use client"

import {
  Home,
  Truck,
  Car,
  Package,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Inbox,
  Briefcase,
  Wrench,
  ShoppingCart,
  PackageOpen,
  LayoutGrid,
  Boxes,
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
  Sun,
  Moon,
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
  FileText,
  Layers as LayersIcon,
  Database,
  Zap,
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
      { title: "Headers", icon: FileText, url: "/report-headers" },
      { title: "Footers", icon: FileText, url: "/report-footers" },
      { title: "Export Reports", icon: FileSpreadsheet, url: "/report-export" },
      { title: "Transfer Reports", icon: Truck, url: "/report-transfer" },
      { title: "Generated Reports", icon: FileSpreadsheet, url: "/generated-reports" },
      { title: "Auto Rules", icon: Activity, url: "/report-rules" },
    ],
  },
  {
    title: "Smart Reports",
    icon: FileText,
    items: [
      { title: "Templates", icon: FileSpreadsheet, url: "/smart-reports" },
      { title: "Template Builder", icon: LayersIcon, url: "/smart-reports/builder" },
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
    ],
  },
  {
    title: "Configuration",
    icon: Settings,
    items: [
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
    // Add more mappings as needed
  }
  return iconMap[iconName] || Settings // Default to Settings if icon not found
}

export function EnhancedSidebar() {
  const navigate = useNavigate()
  const { name } = useAuth()
  const location = useLocation()
  const { signOut } = useAuth()
  const { isCollapsed, toggleSidebar } = useSidebar()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [showUserModal, setShowUserModal] = useState(false)
  const { mode, setMode, colors } = useTheme()
  const isDarkMode = mode === "dark"
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { canViewPage, isLoading: isCaslLoading } = useCasl()
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [fleetPages, setFleetPages] = useState<SubMenuItem[]>([])

  /**
   * Check if a URL should be visible based on CASL permissions
   */
  const canViewRoute = useCallback(
    (url: string | undefined): boolean => {
      if (!url) return true // No URL means it's a parent item, show it

      // Get page_id from route
      const pageId = ROUTE_TO_PAGE_ID[url]

      // If no page_id mapping, allow access (for pages not in our security system)
      if (!pageId) return true

      // Check CASL permission
      return canViewPage(pageId)
    },
    [canViewPage],
  )

  /**
   * Filter menu items recursively based on CASL permissions
   */
  const filterMenuItems = useCallback(
    (items: MenuItem[]): MenuItem[] => {
      return items
        .map((item) => {
          // If item has a URL, check permission
          if (item.url && !canViewRoute(item.url)) {
            return null // Hide this item
          }

          // If item has sub-items, filter them recursively
          if (item.items) {
            const filteredSubItems = item.items
              .map((subItem) => {
                // Check sub-item URL
                if (subItem.url && !canViewRoute(subItem.url)) {
                  return null
                }

                // Check nested items
                if (subItem.items) {
                  const filteredNested = subItem.items.filter((nested) => !nested.url || canViewRoute(nested.url))
                  // Only return sub-item if it has visible nested items
                  if (filteredNested.length === 0) {
                    return null
                  }
                  return { ...subItem, items: filteredNested }
                }

                return subItem
              })
              .filter((subItem): subItem is SubMenuItem => subItem !== null)

            // Only return item if it has visible sub-items or no sub-items
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

  // Fetch Fleet Management pages from ABAC registry
  useEffect(() => {
    const loadFleetPages = async () => {
      try {
        // Fetch Fleet module pages (module_id: 11, module_key: 'fleet')
        const response = await fetch(
          `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/registry/modules/11/pages`,
          { headers: getTenantHeaders() }
        )
        const data = await response.json()
        
        if (data.success && data.data) {
          // Map pages to menu items
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

  // Filter menu items based on permissions and merge with Fleet pages
  const visibleMenuItems = useMemo(() => {
    if (isCaslLoading) {
      return menuItems // Show all while loading
    }
    
    const filteredItems = filterMenuItems(menuItems)
    
    // Add Fleet Management section if user has access to any Fleet page
    const accessibleFleetPages = fleetPages.filter((page) => {
      if (!page.url) return false
      return canViewRoute(page.url)
    })
    
    if (accessibleFleetPages.length > 0) {
      // Find if Fleet Management already exists or insert it
      const fleetIndex = filteredItems.findIndex((item) => item.title === 'Fleet Management')
      
      const fleetMenuItem: MenuItem = {
        title: 'Fleet Management',
        icon: Car,
        items: accessibleFleetPages,
      }
      
      if (fleetIndex >= 0) {
        // Replace existing Fleet Management item
        filteredItems[fleetIndex] = fleetMenuItem
      } else {
        // Insert Fleet Management after Warehouse Management or before User Management
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

  const toggleExpanded = (title: string, parentTitle?: string) => {
    const uniqueKey = parentTitle ? `${parentTitle}-${title}` : title
    setExpandedItems((prev) =>
      prev.includes(uniqueKey) ? prev.filter((item) => item !== uniqueKey) : [...prev, uniqueKey],
    )
  }

  const isActive = (url: string) => {
    return location.pathname === url
  }

  const handleNavigation = (url: string) => {
    navigate(url)
  }

  const handleSignOut = () => {
    signOut()
    setShowUserModal(false)
  }

  const toggleTheme = () => {
    setMode(isDarkMode ? "light" : "dark")
  }

  // Close user menu on outside click
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
    return () => {
      document.removeEventListener("mousedown", onDocClick)
    }
  }, [showUserModal])

  return (
    <div
      className={`${isCollapsed ? "w-20" : "w-64"} ${
        isDarkMode
          ? "bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950"
          : ""
      } border-r ${
        isDarkMode ? "border-zinc-800" : "border-slate-100"
      } flex flex-col h-screen fixed ${isRTL ? "right-0" : "left-0"} top-0 transition-all duration-300 shadow-xl`}
      style={!isDarkMode ? { backgroundColor: "#0F7EA3" } : {}}
    >
      {/* Header */}
      <div className={`p-4 flex-shrink-0 border-b ${isDarkMode ? "border-zinc-800" : "border-white/20"}`}>
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-6 justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-all duration-300 ${
                    isDarkMode
                      ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                      : "bg-white"
                  }`}
                >
                  <Package className={`w-5 h-5 ${isDarkMode ? "text-white" : "text-[#0F7EA3]"}`} />
                </div>
                <span className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-white"}`}>
                  Octopus
                </span>
              </div>
            )}
            <button
              onClick={toggleSidebar}
              className={`p-2.5 rounded-xl transition-all duration-200 ${
                isDarkMode
                  ? "hover:bg-zinc-800 text-zinc-400 hover:text-white"
                  : "hover:bg-white/20 text-white/90 hover:text-white"
              }`}
            >
              {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {!isCollapsed && (
          <div className="px-3 mb-3">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isDarkMode ? "text-zinc-500" : "text-white/70"
              }`}
            >
              {t("Navigation")}
            </span>
          </div>
        )}

        <div className="space-y-1">
          {visibleMenuItems.map((item) => (
            <div key={item.title}>
              {/* Main Item */}
              {item.items ? (
                <div>
                  <button
                    onClick={() => !isCollapsed && toggleExpanded(item.title)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isCollapsed ? "justify-center" : "justify-start"
                    } ${
                      isDarkMode
                        ? "text-zinc-300 hover:bg-zinc-800 hover:text-white hover:shadow-md"
                        : "text-white hover:bg-white/20 hover:text-white hover:shadow-sm"
                    } group relative overflow-hidden`}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <div
                      className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                        isDarkMode
                          ? "bg-gradient-to-r from-blue-500/5 to-cyan-500/5"
                          : "bg-gradient-to-r from-blue-500/5 to-cyan-500/5"
                      }`}
                    />
                    <item.icon className="w-5 h-5 flex-shrink-0 relative z-10" />
                    {!isCollapsed && (
                      <>
                        <span className={`flex-1 ${isRTL ? "text-right" : "text-left"} relative z-10`}>
                          {t(item.title)}
                        </span>
                        {expandedItems.includes(item.title) ? (
                          <ChevronDown className="w-4 h-4 relative z-10 transition-transform duration-200" />
                        ) : isRTL ? (
                          <ChevronLeft className="w-4 h-4 relative z-10 transition-transform duration-200" />
                        ) : (
                          <ChevronRight className="w-4 h-4 relative z-10 transition-transform duration-200" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Sub Items */}
                  {!isCollapsed && expandedItems.includes(item.title) && (
                    <div
                      className={`${isRTL ? "mr-4 border-r-2 pr-3" : "ml-4 border-l-2 pl-3"} mt-1 space-y-1 ${
                        isDarkMode ? "border-zinc-700" : "border-slate-200"
                      }`}
                    >
                      {item.items.map((subItem) => (
                        <div key={subItem.title}>
                          {subItem.items ? (
                            <div>
                              <button
                                onClick={() => toggleExpanded(subItem.title, item.title)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                                  isDarkMode
                                    ? "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                    : "text-white/90 hover:bg-white/20 hover:text-white"
                                }`}
                              >
                                <subItem.icon className="w-4 h-4 flex-shrink-0" />
                                <span className={`flex-1 ${isRTL ? "text-right" : "text-left"}`}>
                                  {t(subItem.title)}
                                </span>
                                {expandedItems.includes(`${item.title}-${subItem.title}`) ? (
                                  <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" />
                                ) : isRTL ? (
                                  <ChevronLeft className="w-3.5 h-3.5 transition-transform duration-200" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200" />
                                )}
                              </button>

                              {/* Nested Items */}
                              {expandedItems.includes(`${item.title}-${subItem.title}`) && (
                                <div className={`${isRTL ? "mr-4" : "ml-4"} mt-1 space-y-1`}>
                                  {subItem.items.map((nestedItem) => (
                                    <button
                                      key={nestedItem.title}
                                      onClick={() => nestedItem.url && handleNavigation(nestedItem.url)}
                                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 relative overflow-hidden group ${
                                        isActive(nestedItem.url || "")
                                          ? isDarkMode
                                            ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium shadow-lg shadow-blue-500/25"
                                            : "bg-white text-[#0F7EA3] font-medium shadow-md"
                                          : isDarkMode
                                            ? "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                            : "text-white/90 hover:bg-white/15 hover:text-white"
                                      }`}
                                    >
                                      <nestedItem.icon className="w-3.5 h-3.5 flex-shrink-0 relative z-10" />
                                      <span className={`flex-1 ${isRTL ? "text-right" : "text-left"} relative z-10`}>
                                        {t(nestedItem.title)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => subItem.url && handleNavigation(subItem.url)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 relative overflow-hidden group ${
                                isActive(subItem.url || "")
                                  ? isDarkMode
                                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium shadow-lg shadow-blue-500/25"
                                    : "bg-white text-[#0F7EA3] font-medium shadow-md"
                                  : isDarkMode
                                    ? "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                    : "text-white/90 hover:bg-white/15 hover:text-white"
                              }`}
                            >
                              <subItem.icon className="w-4 h-4 flex-shrink-0 relative z-10" />
                              <span className={`flex-1 ${isRTL ? "text-right" : "text-left"} relative z-10`}>
                                {t(subItem.title)}
                              </span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => item.url && handleNavigation(item.url)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative overflow-hidden group ${
                    isCollapsed ? "justify-center" : "justify-start"
                  } ${
                    isActive(item.url || "")
                      ? isDarkMode
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white text-[#0F7EA3] shadow-md"
                      : isDarkMode
                        ? "text-zinc-300 hover:bg-zinc-800 hover:text-white hover:shadow-md"
                        : "text-white hover:bg-white/15 hover:text-white hover:shadow-sm"
                  }`}
                  title={isCollapsed ? item.title : undefined}
                >
                  {!isActive(item.url || "") && (
                    <div
                      className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                        isDarkMode
                          ? "bg-gradient-to-r from-blue-500/5 to-cyan-500/5"
                          : "bg-gradient-to-r from-blue-500/5 to-cyan-500/5"
                      }`}
                    />
                  )}
                  <item.icon className="w-5 h-5 flex-shrink-0 relative z-10" />
                  {!isCollapsed && (
                    <span className={`flex-1 ${isRTL ? "text-right" : "text-left"} relative z-10`}>
                      {t(item.title)}
                    </span>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section - Fixed at bottom */}
      <div className={`p-3 space-y-2 flex-shrink-0 border-t ${isDarkMode ? "border-zinc-800" : "border-white/20"}`}>
        {/* User Profile */}
        <div className="relative" ref={userMenuRef}>
          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group ${
              isCollapsed ? "justify-center" : ""
            } ${isDarkMode ? "hover:bg-zinc-800 hover:shadow-md" : "hover:bg-white/20 hover:shadow-sm"}`}
            onClick={() => !isCollapsed && setShowUserModal(true)}
          >
          <div className="relative flex-shrink-0">
            <div
              className={`absolute inset-0 rounded-full ${
                isDarkMode
                  ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                  : "bg-gradient-to-br from-blue-600 to-cyan-600"
              } p-[2px]`}
            >
              <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-full" />
            </div>
            <div
              className={`relative w-9 h-9 rounded-full flex items-center justify-center ${
                isDarkMode
                  ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                  : "bg-gradient-to-br from-blue-600 to-cyan-600"
              }`}
            >
              <span className="text-sm font-bold text-white">{name.toString().charAt(0).toUpperCase()}</span>
            </div>
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1">
                <div className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-white"}`}>{name}</div>
                <div className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-white/70"}`}>{t("My Workspace")}</div>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform group-hover:translate-y-0.5 ${
                  isDarkMode ? "text-zinc-400" : "text-white/90"
                }`}
              />
            </>
          )}
          </div>

          {/* User Modal */}
          {showUserModal && !isCollapsed && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: '0.25rem',
                borderRadius: '0.375rem',
                border: `1px solid ${isDarkMode ? '#3f3f46' : colors.border}`,
                zIndex: 50,
                overflow: 'hidden',
                background: colors.card,
                color: colors.textPrimary,
                boxShadow: isDarkMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                width: '14rem',
              }}
            >
              <button
                onClick={() => {
                  setShowUserModal(false)
                  // Navigate to settings page if you have one
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s',
                  color: colors.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.mutedBg
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium">{t("Settings")}</span>
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.mutedBg
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">{t("Sign Out")}</span>
              </button>
            </div>
          )}
        </div>

        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "justify-center"
          } gap-3 px-3 py-2 ${isRTL ? "flex-row-reverse" : ""}`}
        >
          {!isCollapsed && (
            <Sun className={`w-4 h-4 transition-colors ${isDarkMode ? "text-zinc-600" : "text-amber-500"}`} />
          )}
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 rounded-full transition-all duration-300 shadow-inner ${
              isDarkMode ? "bg-zinc-700 shadow-zinc-900/50" : "bg-slate-200 shadow-slate-300/50"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full transition-all duration-300 shadow-md ${
                isDarkMode ? "bg-gradient-to-br from-blue-500 to-cyan-500" : "bg-white"
              } ${isRTL ? (isDarkMode ? "left-0.5" : "right-0.5") : isDarkMode ? "right-0.5" : "left-0.5"}`}
            />
          </button>
          {!isCollapsed && (
            <Moon className={`w-4 h-4 transition-colors ${isDarkMode ? "text-blue-400" : "text-white"}`} />
          )}
        </div>

      </div>
    </div>
  )
}
