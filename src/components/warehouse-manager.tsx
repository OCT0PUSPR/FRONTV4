"use client"

import { useState } from "react"
import { Button } from "../../@/components/ui/button"
import { Card } from "../../@/components/ui/card"
import { X, Trash2, Package, TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../@/components/ui/select"

// Mock data for warehouses
const warehouses = [
  { id: "1", name: "Warehouse 1" },
  { id: "2", name: "Warehouse 2" },
  { id: "3", name: "Warehouse 3" },
  { id: "4", name: "Warehouse 4" },
]

const warehouseData = {
  "1": {
    sectionGroups: [
      {
        id: "A",
        name: "A-Electronics",
        usage: "5/12",
        sections: [
          { id: "A1", occupied: false },
          { id: "A2", occupied: true, color: "green" },
          { id: "A3", occupied: false },
          { id: "A4", occupied: false },
          { id: "A5", occupied: true, color: "green" },
          { id: "A6", occupied: true, color: "green" },
          { id: "A7", occupied: true, color: "green" },
          { id: "A8", occupied: false },
          { id: "A9", occupied: false },
          { id: "A10", occupied: false },
          { id: "A11", occupied: false },
          { id: "A12", occupied: true, color: "green" },
        ],
      },
      {
        id: "B",
        name: "B-Appliances",
        usage: "7/12",
        sections: [
          { id: "B1", occupied: true, color: "yellow" },
          { id: "B2", occupied: false },
          { id: "B3", occupied: true, color: "yellow" },
          { id: "B4", occupied: false },
          { id: "B5", occupied: false },
          { id: "B6", occupied: true, color: "yellow" },
          { id: "B7", occupied: true, color: "yellow" },
          { id: "B8", occupied: true, color: "yellow" },
          { id: "B9", occupied: true, color: "yellow" },
          { id: "B10", occupied: false },
          { id: "B11", occupied: false },
          { id: "B12", occupied: true, color: "yellow" },
        ],
      },
      {
        id: "C",
        name: "C-Home Decor",
        usage: "8/12",
        sections: [
          { id: "C1", occupied: false },
          { id: "C2", occupied: true, color: "purple" },
          { id: "C3", occupied: true, color: "purple" },
          { id: "C4", occupied: true, color: "purple" },
          { id: "C5", occupied: true, color: "purple" },
          { id: "C6", occupied: true, color: "purple" },
          { id: "C7", occupied: true, color: "purple" },
          { id: "C8", occupied: false },
          { id: "C9", occupied: false },
          { id: "C10", occupied: true, color: "purple" },
          { id: "C11", occupied: true, color: "purple" },
          { id: "C12", occupied: true, color: "purple" },
        ],
      },
      {
        id: "D",
        name: "D-Sports",
        usage: "7/12",
        sections: [
          { id: "D1", occupied: true, color: "teal" },
          { id: "D2", occupied: false },
          { id: "D3", occupied: true, color: "teal" },
          { id: "D4", occupied: true, color: "teal" },
          { id: "D5", occupied: true, color: "teal" },
          { id: "D6", occupied: true, color: "teal" },
          { id: "D7", occupied: true, color: "teal" },
          { id: "D8", occupied: false },
          { id: "D9", occupied: false },
          { id: "D10", occupied: true, color: "teal" },
          { id: "D11", occupied: true, color: "teal" },
          { id: "D12", occupied: false },
        ],
      },
    ],
    products: {
      A2: [
        {
          id: "1",
          name: "Onions",
          code: "E5",
          stock: 101,
          total: 185,
          price: 14.81,
          image: "/pile-of-onions.png",
          status: "in-stock",
        },
        {
          id: "2",
          name: "Garlic",
          code: "E6",
          stock: 45,
          total: 120,
          price: 8.99,
          image: "/bunch-of-garlic.png",
          status: "low-stock",
        },
      ],
      B3: [
        {
          id: "7",
          name: "Pennywort",
          code: "B3",
          stock: 22,
          total: 35,
          price: 12.23,
          image: "/pennywort-herbs.jpg",
          status: "in-stock",
        },
        {
          id: "8",
          name: "Basil",
          code: "B4",
          stock: 18,
          total: 40,
          price: 9.5,
          image: "/fresh-basil.png",
          status: "in-stock",
        },
      ],
      C2: [
        {
          id: "3",
          name: "Bell Pepper",
          code: "A1",
          stock: 22,
          total: 994,
          price: 8.99,
          image: "/single-bell-pepper.png",
          status: "in-stock",
        },
        {
          id: "4",
          name: "Tomatoes",
          code: "A2",
          stock: 156,
          total: 300,
          price: 12.5,
          image: "/ripe-tomatoes.png",
          status: "in-stock",
        },
      ],
      D1: [
        {
          id: "9",
          name: "Avocado",
          code: "D1",
          stock: 78,
          total: 540,
          price: 14.81,
          image: "/ripe-avocado-halves.png",
          status: "updated",
        },
        {
          id: "10",
          name: "Cucumber",
          code: "E7",
          stock: 5,
          total: 877,
          price: 14.81,
          image: "/single-fresh-cucumber.png",
          status: "out-of-stock",
        },
      ],
    },
  },
  "2": {
    sectionGroups: [
      {
        id: "A",
        name: "A-Furniture",
        usage: "6/12",
        sections: [
          { id: "A1", occupied: true, color: "green" },
          { id: "A2", occupied: false },
          { id: "A3", occupied: true, color: "green" },
          { id: "A4", occupied: true, color: "green" },
          { id: "A5", occupied: false },
          { id: "A6", occupied: true, color: "green" },
          { id: "A7", occupied: false },
          { id: "A8", occupied: true, color: "green" },
          { id: "A9", occupied: false },
          { id: "A10", occupied: true, color: "green" },
          { id: "A11", occupied: false },
          { id: "A12", occupied: false },
        ],
      },
      {
        id: "B",
        name: "B-Tools",
        usage: "8/12",
        sections: [
          { id: "B1", occupied: true, color: "yellow" },
          { id: "B2", occupied: true, color: "yellow" },
          { id: "B3", occupied: false },
          { id: "B4", occupied: true, color: "yellow" },
          { id: "B5", occupied: true, color: "yellow" },
          { id: "B6", occupied: true, color: "yellow" },
          { id: "B7", occupied: false },
          { id: "B8", occupied: true, color: "yellow" },
          { id: "B9", occupied: true, color: "yellow" },
          { id: "B10", occupied: false },
          { id: "B11", occupied: true, color: "yellow" },
          { id: "B12", occupied: false },
        ],
      },
    ],
    products: {
      A1: [
        {
          id: "11",
          name: "Banana",
          code: "A3",
          stock: 79,
          total: 561,
          price: 17.84,
          image: "/ripe-banana.png",
          status: "in-stock",
        },
      ],
    },
  },
}

type Section = {
  id: string
  occupied: boolean
  color?: string
}

type Product = {
  id: string
  name: string
  code: string
  stock: number
  total: number
  price: number
  image: string
  status: string
}

export default function WarehouseManager() {
  const [selectedWarehouse, setSelectedWarehouse] = useState("1")
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedSectionGroup, setSelectedSectionGroup] = useState<string | null>(null)

  const currentWarehouse = warehouseData[selectedWarehouse as keyof typeof warehouseData]
  const selectedProducts = selectedSection
    ? currentWarehouse.products[selectedSection as keyof typeof currentWarehouse.products] || []
    : []

  const getSectionColorClass = (color?: string, occupied?: boolean) => {
    if (!occupied) {
      return "bg-muted/30 text-muted-foreground border-2 border-dashed border-muted-foreground/20 diagonal-stripes"
    }
    switch (color) {
      case "green":
        return "bg-gradient-to-br from-[#00B4D8] to-[#90E0EF] text-white hover:shadow-lg hover:scale-105"
      case "yellow":
        return "bg-gradient-to-br from-[#90E0EF] to-[#CAF0F8] text-[#03045E] hover:shadow-lg hover:scale-105"
      case "purple":
        return "bg-gradient-to-br from-[#007786] to-[#00B4D8] text-white hover:shadow-lg hover:scale-105"
      case "teal":
        return "bg-gradient-to-br from-[#03045E] to-[#007786] text-white hover:shadow-lg hover:scale-105"
      default:
        return "bg-gradient-to-br from-[#00B4D8] to-[#90E0EF] text-white hover:shadow-lg hover:scale-105"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-stock":
        return null // Don't show badge for in-stock
      case "low-stock":
        return <span className="text-xs text-amber-600">Low stock</span>
      case "out-of-stock":
        return <span className="text-xs text-red-600">Out of stock</span>
      case "expiring":
        return <span className="text-xs text-amber-600">About to expire</span>
      case "updated":
        return <span className="text-xs text-[#007786]">New updated</span>
      default:
        return null
    }
  }

  const totalSections = currentWarehouse.sectionGroups.reduce((acc, group) => acc + group.sections.length, 0)

  const selectedGroupData = selectedSectionGroup
    ? currentWarehouse.sectionGroups.find((g) => g.id === selectedSectionGroup)
    : null
  const occupiedCount = selectedGroupData?.sections.filter((s) => s.occupied).length || 0
  const totalCount = selectedGroupData?.sections.length || 0
  const usagePercentage = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0

  return (
    <div className="relative flex h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">Warehouses ({warehouses.length})</h1>
            <div className="flex items-center gap-2">
              <Select
                value={selectedWarehouse}
                onValueChange={(value) => {
                  setSelectedWarehouse(value)
                  setSelectedSection(null)
                  setSelectedSectionGroup(null)
                }}
              >
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-2 bg-white">
                <span className="text-sm text-gray-600">Sort by</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-white">
                <span className="text-sm text-gray-600">Filter by (4)</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1600px] mx-auto">
            {/* Section Overview - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Section Overview ({totalSections})</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2 bg-white">
                    <span className="text-sm text-gray-600">Add Request</span>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 bg-white">
                    <span className="text-sm text-gray-600">Edit Section</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 hover:text-red-700 text-sm h-8 bg-transparent"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete Section
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {currentWarehouse.sectionGroups.map((group) => (
                  <Card
                    key={group.id}
                    className={`p-4 border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer ${
                      selectedSectionGroup === group.id ? "ring-2 ring-[#00B4D8]" : "border-gray-200"
                    }`}
                    onClick={() => setSelectedSectionGroup(group.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-sm text-gray-900">{group.name}</h3>
                      <span className="text-xs text-gray-500">{group.usage}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {group.sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (section.occupied) {
                              setSelectedSection(section.id)
                              setSelectedSectionGroup(group.id)
                            }
                          }}
                          disabled={!section.occupied}
                          className={`aspect-square rounded-xl flex items-center justify-center font-medium text-xs transition-all ${getSectionColorClass(
                            section.color,
                            section.occupied,
                          )} ${section.occupied ? "cursor-pointer" : "cursor-not-allowed"}`}
                        >
                          {section.id}
                        </button>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {selectedSectionGroup ? `${selectedSectionGroup}-Section Usage` : "Section Usage"}
              </h2>
              <Card className="p-6 bg-white shadow-sm border-gray-200">
                {/* Donut Chart */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-40 h-40">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle cx="80" cy="80" r="60" stroke="#f0f0f0" strokeWidth="20" fill="none" />
                      <circle
                        cx="80"
                        cy="80"
                        r="60"
                        stroke="url(#gradient)"
                        strokeWidth="20"
                        fill="none"
                        strokeDasharray={`${(usagePercentage / 100) * 377} 377`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#CAF0F8" />
                          <stop offset="100%" stopColor="#00B4D8" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-gray-900">{usagePercentage}%</span>
                      <span className="text-xs text-gray-500">Location Used</span>
                    </div>
                  </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
                    <div className="text-xs text-gray-500">Total Shelves</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{totalCount - occupiedCount}</div>
                    <div className="text-xs text-gray-500">Empty Shelves</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{occupiedCount}</div>
                    <div className="text-xs text-gray-500">Full Shelves</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">0</div>
                    <div className="text-xs text-gray-500">Newly Added</div>
                  </div>
                </div>
              </Card>

              <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">Inventory Overview</h2>
              <Card className="p-6 bg-white shadow-sm border-gray-200">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        26% <TrendingUp className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">4,236</div>
                    <div className="text-xs text-gray-500">Orders Received</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        20% <TrendingDown className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">2,778</div>
                    <div className="text-xs text-gray-500">Orders Shipped</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        8% <TrendingDown className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">147</div>
                    <div className="text-xs text-gray-500">Orders Returned</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        6% <TrendingUp className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">537</div>
                    <div className="text-xs text-gray-500">Orders Canceled</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {selectedSection && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedSection(null)} />

          {/* Sidebar Modal */}
          <div className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Products</h3>
                <Button variant="ghost" size="icon" onClick={() => setSelectedSection(null)} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {/* Column headers aligned with content */}
              <div className="flex items-center gap-4 text-xs font-medium text-gray-500 pl-[76px]">
                <div className="flex-1">Product name</div>
                <div className="w-24 text-center">In stock</div>
                <div className="w-16 text-right">Price</div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="divide-y divide-gray-100">
                {selectedProducts.length > 0 ? (
                  selectedProducts.map((product) => (
                    <div key={product.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Color indicator dot */}
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            product.status === "out-of-stock"
                              ? "bg-orange-500"
                              : product.status === "updated"
                                ? "bg-teal-500"
                                : product.status === "expiring"
                                  ? "bg-orange-500"
                                  : "bg-green-500"
                          }`}
                        />

                        {/* Product image - larger size */}
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                        />

                        {/* Product info - aligned with header */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm text-gray-500 font-medium">{product.code}</span>
                            <h4 className="font-semibold text-base text-gray-900">{product.name}</h4>
                          </div>
                          {getStatusBadge(product.status)}
                        </div>

                        {/* Stock info - aligned with header */}
                        <div className="flex flex-col items-center gap-1 w-24 flex-shrink-0">
                          <span className="text-base font-semibold text-gray-900">
                            {product.stock}
                            <span className="text-gray-400">/{product.total}</span>
                          </span>
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                product.status === "out-of-stock"
                                  ? "bg-orange-500"
                                  : product.status === "low-stock"
                                    ? "bg-orange-500"
                                    : "bg-[#00B4D8]"
                              }`}
                              style={{ width: `${Math.min((product.stock / product.total) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Price - aligned with header */}
                        <span className="text-base font-semibold text-gray-900 w-16 text-right flex-shrink-0">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-sm">No products in this section</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
