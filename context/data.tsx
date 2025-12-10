import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface DataContextType {
  // Data state
  products: any[]
  locations: any[]
  warehouses: any[]
  quants: any[]
  pickings: any[]
  pickingTransfers: any[]
  waves: any[]
  stockMoves: any[]
  stockMoveLines: any[]
  productions: any[]
  uom: any[]
  categories: any[]
  stockPickingTypes: any[]
  lots: any[]
  inventory: any[]
  inventoryLines: any[]
  landedCosts: any[]
  packages: any[]
  stockRules: any[]
  stockRoutes: any[]
  scraps: any[]
  partnerTitles: any[]
  partners: any[]
  productPackaging: any[]
  productTemplates: any[]
  putawayRules: any[]
  storageCategories: any[]
  packageTypes: any[]
  removalStrategies: any[]
  attributes: any[]
  attributeValues: any[]
  supplierinfo: any[]
  workcenters: any[]
  projects: any[]
  vendorBills: any[]
  landedCostLinesByCost: Record<number, any[]>

  // Loading states
  loading: {
    products: boolean
    locations: boolean
    warehouses: boolean
    quants: boolean
    pickings: boolean
    pickingTransfers: boolean
    waves: boolean
    stockMoves: boolean
    stockMoveLines: boolean
    productions: boolean
    uom: boolean
    categories: boolean
    stockPickingTypes: boolean
    lots: boolean
    inventory: boolean
    inventoryLines: boolean
    landedCosts: boolean
    packages: boolean
    stockRules: boolean
    stockRoutes: boolean
    scraps: boolean
    partnerTitles: boolean
    partners: boolean
    productPackaging: boolean
    productTemplates: boolean
    putawayRules: boolean
    storageCategories: boolean
    packageTypes: boolean
    removalStrategies: boolean
    attributes: boolean
    attributeValues: boolean
    supplierinfo: boolean
    workcenters: boolean
    projects: boolean
    vendorBills: boolean
  }

  // Error states
  errors: {
    products: string | null
    locations: string | null
    warehouses: string | null
    quants: string | null
    pickings: string | null
    pickingTransfers: string | null
    waves: string | null
    stockMoves: string | null
    stockMoveLines: string | null
    productions: string | null
    uom: string | null
    categories: string | null
    stockPickingTypes: string | null
    lots: string | null
    inventory: string | null
    inventoryLines: string | null
    landedCosts: string | null
    packages: string | null
    stockRules: string | null
    stockRoutes: string | null
    scraps: string | null
    partnerTitles: string | null
    partners: string | null
    productPackaging: string | null
    productTemplates: string | null
    putawayRules: string | null
    storageCategories: string | null
    packageTypes: string | null
    removalStrategies: string | null
    attributes: string | null
    attributeValues: string | null
    supplierinfo: string | null
    workcenters: string | null
    projects: string | null
    vendorBills: string | null
  }

  // Actions
  fetchData: (dataType: string) => Promise<void>
  refreshAllData: () => Promise<void>
  retryProblematicEndpoints: () => Promise<void>
  clearData: () => void
  fetchLandedCostLines: (costId: number) => Promise<void>
  refreshStockRulesDirect: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function DataProvider({ children }: { children: ReactNode }) {
  // Data state
  const [products, setProducts] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [quants, setQuants] = useState<any[]>([])
  const [pickings, setPickings] = useState<any[]>([])
  const [pickingTransfers, setPickingTransfers] = useState<any[]>([])
  const [waves, setWaves] = useState<any[]>([])
  const [stockMoves, setStockMoves] = useState<any[]>([])
  const [stockMoveLines, setStockMoveLines] = useState<any[]>([])
  const [productions, setProductions] = useState<any[]>([])
  const [uom, setUom] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [stockPickingTypes, setStockPickingTypes] = useState<any[]>([])
  const [lots, setLots] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [inventoryLines, setInventoryLines] = useState<any[]>([])
  const [landedCosts, setLandedCosts] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [stockRules, setStockRules] = useState<any[]>([])
  const [stockRoutes, setStockRoutes] = useState<any[]>([])
  const [scraps, setScraps] = useState<any[]>([])
  const [partnerTitles, setPartnerTitles] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [productPackaging, setProductPackaging] = useState<any[]>([])
  const [productTemplates, setProductTemplates] = useState<any[]>([])
  const [putawayRules, setPutawayRules] = useState<any[]>([])
  const [storageCategories, setStorageCategories] = useState<any[]>([])
  const [packageTypes, setPackageTypes] = useState<any[]>([])
  const [removalStrategies, setRemovalStrategies] = useState<any[]>([])
  const [attributes, setAttributes] = useState<any[]>([])
  const [attributeValues, setAttributeValues] = useState<any[]>([])
  const [supplierinfo, setSupplierinfo] = useState<any[]>([])
  const [workcenters, setWorkcenters] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [vendorBills, setVendorBills] = useState<any[]>([])
  const [landedCostLinesByCost, setLandedCostLinesByCost] = useState<Record<number, any[]>>({})
  
  // Loading states
  const [loading, setLoading] = useState({
    products: false,
    locations: false,
    warehouses: false,
    quants: false,
    pickings: false,
    pickingTransfers: false,
    waves: false,
    stockMoves: false,
    stockMoveLines: false,
    productions: false,
    uom: false,
    categories: false,
    stockPickingTypes: false,
    lots: false,
    inventory: false,
    inventoryLines: false,
    landedCosts: false,
    packages: false,
    stockRules: false,
    stockRoutes: false,
    scraps: false,
    partnerTitles: false,
    partners: false,
    productPackaging: false,
    productTemplates: false,
    putawayRules: false,
    storageCategories: false,
    packageTypes: false,
    removalStrategies: false,
    attributes: false,
    attributeValues: false,
    supplierinfo: false,
    workcenters: false,
    projects: false,
    vendorBills: false,
  })
  
  // Error states
  const [errors, setErrors] = useState({
    products: null,
    locations: null,
    warehouses: null,
    quants: null,
    pickings: null,
    pickingTransfers: null,
    waves: null,
    stockMoves: null,
    stockMoveLines: null,
    productions: null,
    uom: null,
    categories: null,
    stockPickingTypes: null,
    lots: null,
    inventory: null,
    inventoryLines: null,
    landedCosts: null,
    packages: null,
    stockRules: null,
    stockRoutes: null,
    scraps: null,
    partnerTitles: null,
    partners: null,
    productPackaging: null,
    productTemplates: null,
    putawayRules: null,
    storageCategories: null,
    packageTypes: null,
    removalStrategies: null,
    attributes: null,
    attributeValues: null,
    supplierinfo: null,
    workcenters: null,
    projects: null,
    vendorBills: null,
  } as any)
  
  // Get session ID from localStorage or sessionStorage
  const getSessionId = () => {
    return localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
  }

  // Get Odoo headers from localStorage
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = "https://egy.thetalenter.net"
    const db = "odoodb1"
    const headers: Record<string, string> = {}
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    
    // Include tenant ID for multi-tenant support
    const tenantId = localStorage.getItem('current_tenant_id')
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId
    }
    
    return headers
  }
  
  // Generic fetch function with timeout
  const fetchData = async (dataType: string, timeoutMs?: number) => {
    // Set different timeouts for different data types
    const defaultTimeout = timeoutMs ?? (() => {
      // Large datasets get longer timeouts
      const largeDatasets = ['products', 'productTemplates', 'quants', 'stockMoves', 'stockMoveLines', 'pickings']
      return largeDatasets.includes(dataType) ? 60000 : 25000 // 60s for large datasets, 25s for others
    })()
    
    timeoutMs = defaultTimeout
    const sessionId = getSessionId()
    if (!sessionId) {
      console.error('No session ID found')
      setErrors((prev: any) => ({ 
        ...prev, 
        [dataType]: 'No session ID found. Please log in again.' 
      }))
      return
    }
    
    setLoading((prev: any) => ({ ...prev, [dataType]: true }))
    setErrors((prev: any) => ({ ...prev, [dataType]: null }))
    
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    
    try {
      const endpoint = getEndpoint(dataType)
      const url = getUrl(dataType, endpoint)
      
      // Create an AbortController for timeout
      const controller = new AbortController()
      timeoutId = setTimeout(() => controller.abort(), timeoutMs)
            
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getOdooHeaders(),
        },
        body: JSON.stringify({ sessionId }),
        signal: controller.signal,
      })
      
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP error for ${dataType}:`, response.status, errorText)
        
        if (response.status === 404) {
          throw new Error(`Endpoint not found: ${endpoint}. Please check if the backend server is running and the route is configured correctly.`)
        } else if (response.status === 500) {
          throw new Error(`Server error: ${errorText}. Please check the backend server logs.`)
        } else {
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
        }
      }
      
      const data = await response.json()
      
      if (data.success) {
        const setter = getSetter(dataType)
        let payload = data[dataType] || []
        if (dataType === 'quants' && Array.isArray(payload)) {
          // Filter to match Odoo's On Hand default view: internal locations and positive available quantity
          const locUsageById = new Map<number, string>()
          for (const loc of (locations || [])) {
            const id = typeof loc.id === 'number' ? loc.id : Array.isArray(loc.id) ? loc.id[0] : undefined
            if (typeof id === 'number') locUsageById.set(id, loc.usage)
          }
          payload = payload.filter((q: any) => {
            const locId = Array.isArray(q.location_id) ? q.location_id[0] : q.location_id
            const usage = locUsageById.get(locId)
            const available = Number(q.available_quantity ?? q.quantity ?? 0)
            return usage === 'internal' && available > 0
          })
        }
        setter(payload)
      } else {
        throw new Error(data.message || `Failed to fetch ${dataType}`)
      }
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      // Handle timeout/abort errors gracefully
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'aborted' || error.message.includes('aborted'))) {
        const timeoutMessage = dataType === 'products' 
          ? `Loading products is taking longer than expected. The dataset is large (${timeoutMs / 1000}s timeout). Please wait or try refreshing the page.`
          : `Request timeout: ${dataType} took longer than ${timeoutMs / 1000}s to load. This may be due to a large dataset or backend performance issues.`
        console.warn(`Timeout fetching ${dataType}:`, timeoutMessage, `Timeout was ${timeoutMs}ms`)
        setErrors((prev: any) => ({ 
          ...prev, 
          [dataType]: timeoutMessage
        }))
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // Handle connection errors (server not running, network issues, etc.)
        const connectionMessage = `Unable to connect to the server. Please ensure the backend server is running and accessible.`
        console.error(`Connection error fetching ${dataType}:`, error)
        setErrors((prev: any) => ({ 
          ...prev, 
          [dataType]: connectionMessage
        }))
      } else {
        console.error(`Error fetching ${dataType}:`, error)
        // Check if error message contains "aborted"
        const errorMessage = error instanceof Error 
          ? (error.message.includes('aborted') 
              ? `Request was aborted. This may be due to a timeout (${timeoutMs / 1000}s). Please try again.`
              : error.message)
          : (String(error).includes('aborted')
              ? `Request was aborted. This may be due to a timeout (${timeoutMs / 1000}s). Please try again.`
              : 'Unknown error')
        setErrors((prev: any) => ({ 
          ...prev, 
          [dataType]: errorMessage
        }))
      }
    } finally {
      setLoading((prev: any) => ({ ...prev, [dataType]: false }))
    }
  }
  
  // Get endpoint for each data type
  const getEndpoint = (dataType: string): string => {
    const endpointMap: Record<string, string> = {
      // Use per-model route mounted at /api/products-single/all
      products: 'products-single/all',
      locations: 'locations',
      warehouses: 'warehouses',
      quants: 'quants',
      pickings: 'pickings',
      pickingTransfers: 'picking-transfers',
      waves: 'picking-transfers/waves',
      stockMoves: 'stock-moves',
      stockMoveLines: 'move-lines',
      productions: 'productions',
      uom: 'uom',
      categories: 'categories',
      stockPickingTypes: 'picking-types',
      lots: 'lots',
      packages: 'quant-packages',
      inventory: 'inventory',
      inventoryLines: 'inventory-lines',
      landedCosts: 'landed-costs',
      stockRules: 'stock-rules',
      stockRoutes: 'stock-routes',
      scraps: 'scraps',
      putawayRules: 'putaway-rules',
      storageCategories: 'storage-categories',
      packageTypes: 'package-types',
      removalStrategies: 'removal-strategies',
      attributes: 'attributes',
      attributeValues: 'attribute-values',
      supplierinfo: 'supplierinfo',
      partnerTitles: 'partner-titles',
      partners: 'partners',
      productPackaging: 'product-packaging',
      productTemplates: 'product-templates',
      workcenters: 'workcenters',
      projects: 'projects',
      vendorBills: 'account-moves',
    }
    return endpointMap[dataType] || dataType
  }

  const getUrl = (dataType: string, endpoint: string): string => {
    // Datasets mounted directly under /api (per-model routes)
    const topLevel: Record<string, true> = {
      products: true,
      locations: true,
      landedCosts: true,
      stockRules: true,
      stockRoutes: true,
      stockMoves: true,
      stockMoveLines: true,
      warehouses: true,
      quants: true,
      pickings: true,
      pickingTransfers: true,
      waves: true,
      productions: true,
      uom: true,
      categories: true,
      stockPickingTypes: true,
      lots: true,
      packages: true,
      inventory: true,
      inventoryLines: true,
      putawayRules: true,
      storageCategories: true,
      packageTypes: true,
      removalStrategies: true,
      attributes: true,
      attributeValues: true,
      supplierinfo: true,
      partnerTitles: true,
      partners: true,
      productPackaging: true,
      productTemplates: true,
      workcenters: true,
      projects: true,
      scraps: true,
      vendorBills: true,
    }
    if (topLevel[dataType]) return `${API_BASE_URL}/${endpoint}`
    // Legacy endpoints grouped under /api/products
    return `${API_BASE_URL}/products/${endpoint}`
  }

  const fetchLandedCostLines = async (costId: number) => {
    const sessionId = getSessionId()
    if (!sessionId || !costId) return
    try {
      const res = await fetch(`${API_BASE_URL}/landed-cost-lines/by-cost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getOdooHeaders() },
        body: JSON.stringify({ sessionId, cost_id: costId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        setLandedCostLinesByCost((prev) => ({ ...prev, [costId]: data.lines || [] }))
      }
    } catch (e) {
      console.error('fetchLandedCostLines error', e)
    }
  }
  
  const refreshStockRulesDirect = async () => {
    const sessionId = getSessionId()
    if (!sessionId) return
    try {
      setLoading((prev: any) => ({ ...prev, stockRules: true }))
      setErrors((prev: any) => ({ ...prev, stockRules: null }))
      const res = await fetch(`${API_BASE_URL}/stock-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getOdooHeaders() },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        setStockRules(data.stockRules || [])
      } else {
        throw new Error(data?.message || 'Failed to refresh stock rules')
      }
    } catch (e: any) {
      console.error('refreshStockRulesDirect error', e)
      setErrors((prev: any) => ({ ...prev, stockRules: e?.message || 'Unknown error' }))
    } finally {
      setLoading((prev: any) => ({ ...prev, stockRules: false }))
    }
  }
  
  // Get setter function for each data type
  const getSetter = (dataType: string) => {
    const setterMap: Record<string, (data: any[]) => void> = {
      products: setProducts,
      locations: setLocations,
      warehouses: setWarehouses,
      quants: setQuants,
      pickings: setPickings,
      pickingTransfers: setPickingTransfers,
      waves: setWaves,
      stockMoves: setStockMoves,
      stockMoveLines: setStockMoveLines,
      productions: setProductions,
      uom: setUom,
      categories: setCategories,
      stockPickingTypes: setStockPickingTypes,
      lots: setLots,
      packages: setPackages,
      inventory: setInventory,
      inventoryLines: setInventoryLines,
      landedCosts: setLandedCosts,
      stockRules: setStockRules,
      stockRoutes: setStockRoutes,
      scraps: setScraps,
      putawayRules: setPutawayRules,
      storageCategories: setStorageCategories,
      packageTypes: setPackageTypes,
      removalStrategies: setRemovalStrategies,
      attributes: setAttributes,
      attributeValues: setAttributeValues,
      supplierinfo: setSupplierinfo,
      partnerTitles: setPartnerTitles,
      partners: setPartners,
      productPackaging: setProductPackaging,
      productTemplates: setProductTemplates,
      workcenters: setWorkcenters,
      projects: setProjects,
      vendorBills: setVendorBills,
    }
    return setterMap[dataType] || (() => {})
  }
  
  function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
    return chunks
  }
  
  // Refresh all data - DEPRECATED: This function is too aggressive and overloads the server
  // Use targeted fetchData() calls instead for specific data types only
  const refreshAllData = async () => {
    console.warn('refreshAllData() is deprecated. Use fetchData() for specific data types instead to avoid server overload.')
    // Do nothing - prevent server overload
    // Components should call fetchData() with specific data types instead
  }
  
  // Retry problematic endpoints
  const retryProblematicEndpoints = async () => {
    const problematicDataTypes = ['lots', 'inventory', 'inventoryLines']
    
    for (const dataType of problematicDataTypes) {
      try {
        await fetchData(dataType)
      } catch (error) {
        console.error(`Still failing to fetch ${dataType}:`, error)
      }
    }
  }

  // Clear all data
  const clearData = () => {
    setProducts([])
    setLocations([])
    setWarehouses([])
    setQuants([])
    setPickings([])
    setPickingTransfers([])
    setWaves([])
    setStockMoves([])
    setStockMoveLines([])
    setProductions([])
    setUom([])
    setCategories([])
    setStockPickingTypes([])
    setLots([])
    setInventory([])
    setInventoryLines([])
    setLandedCosts([])
    setStockRules([])
    setStockRoutes([])
    setScraps([])
    setPutawayRules([])
    setStorageCategories([])
    setPackageTypes([])
    setRemovalStrategies([])
    setAttributes([])
    setAttributeValues([])
    setPartnerTitles([])
    setPartners([])
    setProductPackaging([])
    setProductTemplates([])
    setWorkcenters([])
    setProjects([])
    setErrors({
      products: null,
      warehouses: null,
      quants: null,
      pickings: null,
      stockMoves: null,
      stockMoveLines: null,
      productions: null,
      uom: null,
      categories: null,
      stockPickingTypes: null,
      lots: null,
      inventory: null,
      inventoryLines: null,
      landedCosts: null,
      stockRules: null,
      stockRoutes: null,
      scraps: null,
      putawayRules: null,
      storageCategories: null,
      packageTypes: null,
      removalStrategies: null,
      attributes: null,
      attributeValues: null,
      partnerTitles: null,
      workcenters: null,
      projects: null,
    })
  }
  
  // Removed auto-refresh on route change
  // Data should now only be fetched when explicitly requested by page components
  // Pages can call fetchData() for specific data types when they mount or when needed
  
  const value: DataContextType = {
    // Data
    products,
    locations,
    warehouses,
    quants,
    pickings,
    pickingTransfers,
    waves,
    stockMoves,
    stockMoveLines,
    productions,
    uom,
    categories,
    stockPickingTypes,
    lots,
    packages,
    inventory,
    inventoryLines,
    landedCosts,
    stockRules,
    stockRoutes,
    scraps,
    putawayRules,
    storageCategories,
    packageTypes,
    removalStrategies,
    attributes,
    attributeValues,
    supplierinfo,
    partnerTitles,
    partners,
    productPackaging,
    productTemplates,
    workcenters,
    projects,
    vendorBills,
    landedCostLinesByCost,
    
    // Loading states
    loading,
    
    // Error states
    errors,
    
    // Actions
    fetchData,
    refreshAllData,
    retryProblematicEndpoints,
    clearData,
    fetchLandedCostLines,
    refreshStockRulesDirect,
  }
  
  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
