import React from 'react'
import { useProducts, useWarehouses, useAllData } from '../../context/hooks'

// Example component showing how to use the data context
export function DataExample() {
  const { products, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts()
  const { warehouses, loading: warehousesLoading, error: warehousesError } = useWarehouses()
  const { isLoading, hasErrors, errorCount, refreshAllData } = useAllData()

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Context Example</h2>
      
      {/* Global Status */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Global Status</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{products.length}</div>
            <div className="text-sm text-gray-600">Products</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{warehouses.length}</div>
            <div className="text-sm text-gray-600">Warehouses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Products</h3>
          <button
            onClick={refetchProducts}
            disabled={productsLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {productsLoading ? 'Loading...' : 'Refresh Products'}
          </button>
        </div>
        
        {productsError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error: {productsError}
          </div>
        )}
        
        {productsLoading ? (
          <div className="text-center py-4">Loading products...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.slice(0, 6).map((product) => (
              <div key={product.id} className="border rounded-lg p-4">
                <h4 className="font-semibold">{product.name}</h4>
                <p className="text-sm text-gray-600">Code: {product.default_code}</p>
                <p className="text-sm text-gray-600">Available: {product.qty_available}</p>
                <p className="text-sm text-gray-600">Price: ${product.list_price}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warehouses Section */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Warehouses</h3>
        
        {warehousesError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error: {warehousesError}
          </div>
        )}
        
        {warehousesLoading ? (
          <div className="text-center py-4">Loading warehouses...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warehouses.map((warehouse) => (
              <div key={warehouse.id} className="border rounded-lg p-4">
                <h4 className="font-semibold">{warehouse.name}</h4>
                <p className="text-sm text-gray-600">Code: {warehouse.code}</p>
                <p className="text-sm text-gray-600">Partner: {warehouse.partner_id?.[1] || 'N/A'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global Actions */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Global Actions</h3>
        <div className="flex gap-4">
          <button
            onClick={refreshAllData}
            disabled={isLoading}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Refreshing All...' : 'Refresh All Data'}
          </button>
          
          {hasErrors && (
            <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded">
              {errorCount} error(s) detected
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
