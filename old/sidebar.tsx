import {
    Home,
    Truck,
    Package,
    BarChart3,
    Settings,
    ChevronDown,
    ChevronRight,
    Bell,
    Zap,
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
    type LucideIcon
  } from "lucide-react"
  import { useState } from "react"
  import { useNavigate, useLocation } from "react-router-dom"
  
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
      title: "Warehouse View",
      icon: Warehouse,
      url: "/warehouse-view",
    },
    {
      title: "Operations",
      icon: Truck,
      items: [
        {
          title: "Transfers",
          icon: PackageOpen,
          items: [
            { title: "Receipts", icon: Inbox, url: "/receipts" },
            { title: "Deliveries", icon: Truck, url: "/deliveries" },
            { title: "Internal", icon: GitBranch, url: "/internal" },
            { title: "Manufacturing", icon: Settings, url: "/manufacturing" },
            { title: "Dropships", icon: Package, url: "/dropships" },
          ],
        },
        {
          title: "Jobs",
          icon: Briefcase,
          items: [
            { title: "Batch transfers", icon: Layers, url: "/batch" },
            { title: "Wave transfers", icon: TrendingUp, url: "/wave" },
          ],
        },
        {
          title: "Adjustments",
          icon: Wrench,
          items: [
            { title: "Physical Inventory", icon: Archive, url: "/physical-inventory" },
            { title: "Scrap", icon: Trash2, url: "/scrap" },
            { title: "Landing costs", icon: DollarSign, url: "/landing-costs" },
          ],
        },
        {
          title: "Procurement",
          icon: ShoppingCart,
          items: [{ title: "Replenishment", icon: PackagePlus, url: "/replenishment" }],
        },
      ],
    },
    {
      title: "Products",
      icon: Package,
      items: [
        { title: "Products", icon: Package, url: "/products" },
        { title: "Product Variants", icon: LayoutGrid, url: "/product-variants" },
        { title: "Lots/Serial Numbers", icon: QrCode, url: "/lots-serial" },
        { title: "Packages", icon: Boxes, url: "/product-packages" },
      ],
    },
    {
      title: "Reporting",
      icon: BarChart3,
      items: [
        { title: "Stocks", icon: Archive, url: "/stocks" },
        { title: "Locations", icon: MapPin, url: "/locations" },
        { title: "Moves History", icon: History, url: "/moves-history" },
        { title: "Move Analysis", icon: TrendingUp, url: "/moves-analysis" },
        { title: "Valuation", icon: DollarSign, url: "/valuation" },
      ],
    },
    {
      title: "Configuration",
      icon: Settings,
      items: [
        {
          title: "Warehouse Management",
          icon: Warehouse,
          items: [
            { title: "Warehouses", icon: Warehouse, url: "/warehouse" },
            { title: "Operation types", icon: List, url: "/operations" },
            { title: "Locations", icon: MapPin, url: "/locations" },
            { title: "Routes", icon: Route, url: "/routes" },
            { title: "Rules", icon: Settings, url: "/rules" },
            { title: "Storage categories", icon: FolderTree, url: "/storage" },
            { title: "Putaway Rules", icon: Container, url: "/putaway" },
          ],
        },
        {
          title: "Products",
          icon: Package,
          items: [
            { title: "Product categories", icon: FolderTree, url: "/categories" },
            { title: "Product Packagings", icon: Boxes, url: "/product-packagings" },
            { title: "Attributes", icon: Tag, url: "/attributes" },
          ],
        },
        {
          title: "Units of Measure",
          icon: Ruler,
          items: [{ title: "UoM Categories", icon: Layers, url: "/uom-categories" }],
        },
        {
          title: "Delivery",
          icon: Truck,
          items: [
            { title: "Delivery Methods", icon: Truck, url: "/delivery-methods" },
            { title: "Package types", icon: Package, url: "/package-types" },
          ],
        },
      ],
    },
  ]
  
  export function EnhancedSidebar() {
    const navigate = useNavigate()
    const location = useLocation()
    const [expandedItems, setExpandedItems] = useState<string[]>([])
  
    const toggleExpanded = (title: string, parentTitle?: string) => {
      const uniqueKey = parentTitle ? `${parentTitle}-${title}` : title
      setExpandedItems(prev => 
        prev.includes(uniqueKey) 
          ? prev.filter(item => item !== uniqueKey)
          : [...prev, uniqueKey]
      )
    }
  
    const isActive = (url: string) => {
      return location.pathname === url
    }
  
    const handleNavigation = (url: string) => {
      navigate(url)
    }
  
    return (
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Warehouse</h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
        </div>
  
        {/* Navigation - Scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {menuItems.map((item) => (
            <div key={item.title}>
              {item.items ? (
                <div>
                  <button
                    onClick={() => toggleExpanded(item.title)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{item.title}</span>
                    {expandedItems.includes(item.title) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {expandedItems.includes(item.title) && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.items.map((subItem) => (
                        <div key={subItem.title}>
                          {subItem.items ? (
                            <div>
                              <button
                                onClick={() => toggleExpanded(subItem.title, item.title)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                <subItem.icon className="w-3.5 h-3.5" />
                                <span className="flex-1 text-left">{subItem.title}</span>
                                {expandedItems.includes(`${item.title}-${subItem.title}`) ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                              
                              {expandedItems.includes(`${item.title}-${subItem.title}`) && (
                                <div className="ml-6 mt-1 space-y-1">
                                  {subItem.items.map((nestedItem) => (
                                    <button
                                      key={nestedItem.title}
                                      onClick={() => nestedItem.url && handleNavigation(nestedItem.url)}
                                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                                        isActive(nestedItem.url || '') 
                                          ? 'bg-gray-100 text-gray-900 font-medium' 
                                          : 'text-gray-600 hover:bg-gray-50'
                                      }`}
                                    >
                                      <nestedItem.icon className="w-3 h-3" />
                                      <span className="flex-1 text-left">{nestedItem.title}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => subItem.url && handleNavigation(subItem.url)}
                              className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                                isActive(subItem.url || '') 
                                  ? 'bg-gray-100 text-gray-900 font-medium' 
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <subItem.icon className="w-3.5 h-3.5" />
                              <span className="flex-1 text-left">{subItem.title}</span>
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
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.url || '') 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.title}</span>
                </button>
              )}
            </div>
          ))}
        </div>
  
        {/* Bottom Section - Fixed at bottom */}
        <div className="p-3 border-t border-gray-200 space-y-2 flex-shrink-0">
          {/* Utility Links */}
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
              <span>Developers</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors relative">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
              <div className="w-2 h-2 bg-blue-500 rounded-full absolute right-3"></div>
            </button>
          </div>
  
          {/* Upgrade Button */}
          <button className="w-full flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm">
            <Zap className="w-4 h-4" />
            <span>Upgrade</span>
          </button>
  
          {/* User Profile */}
          <div className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">A</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Ahmed</div>
              <div className="text-xs text-gray-500">My Workspace</div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>
    )
  }
  