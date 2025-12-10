import { useData } from './data'

// Custom hooks for specific data types
export function useProducts() {
  const { productTemplates, loading, errors, fetchData } = useData() as any
  return {
    products: productTemplates,
    loading: loading.productTemplates,
    error: errors.productTemplates,
    refetch: () => fetchData('productTemplates')
  }
}

export function useWarehouses() {
  const { warehouses, loading, errors, fetchData } = useData()
  return {
    warehouses,
    loading: loading.warehouses,
    error: errors.warehouses,
    refetch: () => fetchData('warehouses')
  }
}

export function useQuants() {
  const { quants, loading, errors, fetchData } = useData()
  return {
    quants,
    loading: loading.quants,
    error: errors.quants,
    refetch: () => fetchData('quants')
  }
}

export function usePickings() {
  const { pickings, loading, errors, fetchData } = useData()
  return {
    pickings,
    loading: loading.pickings,
    error: errors.pickings,
    refetch: () => fetchData('pickings')
  }
}

export function useStockMoves() {
  const { stockMoves, loading, errors, fetchData } = useData()
  return {
    stockMoves,
    loading: loading.stockMoves,
    error: errors.stockMoves,
    refetch: () => fetchData('stockMoves')
  }
}

export function useStockMoveLines() {
  const { stockMoveLines, loading, errors, fetchData } = useData()
  return {
    stockMoveLines,
    loading: loading.stockMoveLines,
    error: errors.stockMoveLines,
    refetch: () => fetchData('stockMoveLines')
  }
}

export function useUom() {
  const { uom, loading, errors, fetchData } = useData()
  return {
    uom,
    loading: loading.uom,
    error: errors.uom,
    refetch: () => fetchData('uom')
  }
}

export function useCategories() {
  const { categories, loading, errors, fetchData } = useData()
  return {
    categories,
    loading: loading.categories,
    error: errors.categories,
    refetch: () => fetchData('categories')
  }
}

export function useStockPickingTypes() {
  const { stockPickingTypes, loading, errors, fetchData } = useData()
  return {
    stockPickingTypes,
    loading: loading.stockPickingTypes,
    error: errors.stockPickingTypes,
    refetch: () => fetchData('stockPickingTypes')
  }
}

export function useLots() {
  const { lots, loading, errors, fetchData } = useData()
  return {
    lots,
    loading: loading.lots,
    error: errors.lots,
    refetch: () => fetchData('lots')
  }
}

export function useInventory() {
  const { inventory, loading, errors, fetchData } = useData()
  return {
    inventory,
    loading: loading.inventory,
    error: errors.inventory,
    refetch: () => fetchData('inventory')
  }
}

export function useInventoryLines() {
  const { inventoryLines, loading, errors, fetchData } = useData()
  return {
    inventoryLines,
    loading: loading.inventoryLines,
    error: errors.inventoryLines,
    refetch: () => fetchData('inventoryLines')
  }
}

// Hook for getting all data at once
export function useAllData() {
  const data = useData()
  return {
    ...data,
    isLoading: Object.values(data.loading).some(loading => loading),
    hasErrors: Object.values(data.errors).some(error => error !== null),
    errorCount: Object.values(data.errors).filter(error => error !== null).length
  }
}
