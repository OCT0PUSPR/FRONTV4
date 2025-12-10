# Data Context Documentation

This directory contains the data management context for the Odoo Auth application. The context provides a centralized way to manage data from the backend API and automatically refreshes data when navigating between pages.

## Files

- `data.tsx` - Main data context with all backend data management
- `hooks.tsx` - Custom hooks for easy data access
- `sidebar.tsx` - Sidebar state management
- `auth.tsx` - Authentication context

## Usage

### Basic Setup

The `DataProvider` is already integrated into the main App component, so all child components have access to the data context.

### Using Data in Components

```tsx
import { useProducts, useWarehouses, useAllData } from '../context/hooks'

function MyComponent() {
  // Get specific data
  const { products, loading, error, refetch } = useProducts()
  const { warehouses } = useWarehouses()
  
  // Get all data at once
  const { isLoading, hasErrors, refreshAllData } = useAllData()
  
  return (
    <div>
      {loading ? 'Loading...' : (
        <div>
          {products.map(product => (
            <div key={product.id}>{product.name}</div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Available Data Types

The context manages the following data types:

- `products` - Product information
- `warehouses` - Warehouse data
- `quants` - Stock quantities
- `pickings` - Stock picking operations
- `stockMoves` - Stock movement records
- `stockMoveLines` - Stock movement line items
- `uom` - Units of measure
- `categories` - Product categories
- `stockPickingTypes` - Stock picking types
- `lots` - Lot/serial number data
- `inventory` - Inventory data
- `inventoryLines` - Inventory line items

### Custom Hooks

Each data type has its own custom hook:

```tsx
// Individual data hooks
const { products, loading, error, refetch } = useProducts()
const { warehouses, loading, error, refetch } = useWarehouses()
const { quants, loading, error, refetch } = useQuants()
// ... and so on for each data type

// Global data hook
const { 
  products, warehouses, quants, // ... all data
  loading, errors, // loading and error states
  fetchData, refreshAllData, clearData // actions
} = useAllData()
```

### Automatic Data Refresh

The context automatically refreshes all data when:
- The user navigates to a different page
- The location pathname changes

### Manual Data Management

```tsx
import { useData } from '../context/data'

function MyComponent() {
  const { fetchData, refreshAllData, clearData } = useData()
  
  // Fetch specific data
  const handleFetchProducts = () => {
    fetchData('products')
  }
  
  // Refresh all data
  const handleRefreshAll = () => {
    refreshAllData()
  }
  
  // Clear all data
  const handleClearData = () => {
    clearData()
  }
}
```

### Error Handling

Each data type has its own error state:

```tsx
const { products, loading, error } = useProducts()

if (error) {
  return <div>Error: {error}</div>
}

if (loading) {
  return <div>Loading...</div>
}

return <div>{/* Render products */}</div>
```

### Loading States

```tsx
const { loading } = useData()

// Check if any data is loading
const isLoading = Object.values(loading).some(loading => loading)

// Check specific data loading
const { loading: productsLoading } = useProducts()
```

## API Integration

The context automatically handles:
- Session ID management from localStorage/sessionStorage
- API endpoint mapping
- Error handling and retry logic
- Loading state management
- Data caching and optimization

## Backend Routes

The context integrates with these backend routes:
- `/api/products/get-products`
- `/api/products/get-warehouses`
- `/api/products/get-quants`
- `/api/products/get-pickings`
- `/api/products/stock-moves`
- `/api/products/stock-move-lines`
- `/api/products/get-uom`
- `/api/products/product-categories`
- `/api/products/get-stock-picking`
- `/api/products/get-lots`
- `/api/products/get-inventory`
- `/api/products/get-inventory-lines`

All routes expect a `sessionId` in the request body.
