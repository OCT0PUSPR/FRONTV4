// Utility to test backend connectivity
export const testBackendConnection = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/products/get-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId: 'test' }),
    })
    
    console.log('Backend test response status:', response.status)
    const data = await response.text()
    console.log('Backend test response:', data)
    
    return {
      isRunning: response.status !== 404,
      status: response.status,
      data: data
    }
  } catch (error) {
    console.error('Backend test failed:', error)
    return {
      isRunning: false,
      error: error.message
    }
  }
}

// Test all endpoints
export const testAllEndpoints = async () => {
  const endpoints = [
    'get-products',
    'get-warehouses', 
    'get-quants',
    'get-pickings',
    'stock-moves',
    'stock-move-lines',
    'get-uom',
    'product-categories',
    'get-stock-picking',
    'get-lots',
    'get-inventory',
    'get-inventory-lines'
  ]
  
  const results = []
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3000/api/products/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: 'test' }),
      })
      
      results.push({
        endpoint,
        status: response.status,
        ok: response.ok
      })
    } catch (error) {
      results.push({
        endpoint,
        status: 'ERROR',
        error: error.message
      })
    }
  }
  
  console.log('All endpoints test results:', results)
  return results
}
