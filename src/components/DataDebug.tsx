import React from 'react'
import { useAllData } from '../../context/hooks'

export function DataDebug() {
  const { 
    products, warehouses, quants, pickings, stockMoves, stockMoveLines,
    uom, categories, stockPickingTypes, lots, inventory, inventoryLines,
    loading, errors, retryProblematicEndpoints, refreshAllData 
  } = useAllData()

  const dataSummary = {
    products: { count: products.length, loading: loading.products, error: errors.products },
    warehouses: { count: warehouses.length, loading: loading.warehouses, error: errors.warehouses },
    quants: { count: quants.length, loading: loading.quants, error: errors.quants },
    pickings: { count: pickings.length, loading: loading.pickings, error: errors.pickings },
    stockMoves: { count: stockMoves.length, loading: loading.stockMoves, error: errors.stockMoves },
    stockMoveLines: { count: stockMoveLines.length, loading: loading.stockMoveLines, error: errors.stockMoveLines },
    uom: { count: uom.length, loading: loading.uom, error: errors.uom },
    categories: { count: categories.length, loading: loading.categories, error: errors.categories },
    stockPickingTypes: { count: stockPickingTypes.length, loading: loading.stockPickingTypes, error: errors.stockPickingTypes },
    lots: { count: lots.length, loading: loading.lots, error: errors.lots },
    inventory: { count: inventory.length, loading: loading.inventory, error: errors.inventory },
    inventoryLines: { count: inventoryLines.length, loading: loading.inventoryLines, error: errors.inventoryLines },
  }

  const hasErrors = Object.values(errors).some(error => error !== null)
  const isLoading = Object.values(loading).some(loading => loading)

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Data Debug Panel</h3>
      
      <div className="mb-4">
        <div className="flex gap-4 mb-4">
          <button
            onClick={refreshAllData}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh All Data'}
          </button>
          
          <button
            onClick={retryProblematicEndpoints}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Retry Problematic Endpoints
          </button>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Status: {isLoading ? 'Loading...' : hasErrors ? 'Some errors detected' : 'All good'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(dataSummary).map(([key, data]) => (
          <div 
            key={key} 
            className={`p-3 rounded border ${
              data.error 
                ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
                : data.loading 
                ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20'
                : 'border-green-300 bg-green-50 dark:bg-green-900/20'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium capitalize">{key}</span>
              <span className="text-sm font-mono">{data.count}</span>
            </div>
            
            {data.loading && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400">Loading...</div>
            )}
            
            {data.error && (
              <div className="text-xs text-red-600 dark:text-red-400 truncate" title={data.error}>
                Error: {data.error}
              </div>
            )}
            
            {!data.loading && !data.error && (
              <div className="text-xs text-green-600 dark:text-green-400">✓ Working</div>
            )}
          </div>
        ))}
      </div>

      {hasErrors && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
          <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Error Summary:</h4>
          <div className="space-y-1">
            {Object.entries(errors).map(([key, error]) => 
              error && (
                <div key={key} className="text-sm text-red-700 dark:text-red-300">
                  <strong>{key}:</strong> {error}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
