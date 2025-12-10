import { useEffect, useState } from 'react'
import { useAuth } from '../context/auth.tsx'
import { RefreshCcw, LogOut, File } from 'lucide-react'
import {SyncLoader} from 'react-spinners'
import { ProductRecords } from './components/ProductRecords.tsx'

interface Product {
    id: number;
    name: string;
    default_code: string;
    qty_available: number;
    virtual_available: number;
    list_price: number;
    standard_price: number;
    image_1920?: string;
    categ_id: [number, string];
    weight: number;
    sale_ok: boolean;
    barcode: string;
}

function Inventory() {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ;  
    const { sessionId, isAuthenticated, signOut } = useAuth()
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(false)

    // Fetch products
    const getProducts = async (sessionId: string) => {
        try {
            setLoading(true)
      const response = await fetch(`${API_BASE_URL}/products/get-products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
                body: JSON.stringify({ sessionId }),
        });
            const data = await response.json();
            if (response.ok && data.products) {
                console.log('Products fetched:', data.products);
                setProducts(data.products)
                return data;
            } else {
                console.error('Failed to fetch products:', data);
                return null;
            }
    } catch (error) {
      console.error('Get Products error:', error);
      throw error;
        } finally {
            setLoading(false)
        }
    }

    const getModels = async (sessionId: string) => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE_URL}/api/models/getModels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId }),
            });
            const data = await response.json();
            if (response.ok && data.models) {
                console.log('Models fetched:', data.models);
                return data;
            }
   
        } catch (error) {
            console.error('Get Models error:', error);
            throw error;
        } finally {
            setLoading(false)
        }
    }

    // Show the productss if session ID is available
    useEffect(() => {
        if (sessionId && isAuthenticated) {
            getProducts(sessionId)
        }
    }, [sessionId, isAuthenticated])

    const handleGetProducts = async () => {
        if (sessionId) {
            await getProducts(sessionId)
        }
    }

    const handleGetModels = async () => {
        if (sessionId) {
            await getModels(sessionId)
        }
    }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-16 border-b border-gray-200 bg-white px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Warehouse Inventory</h1>
            <p className="text-sm text-gray-600">Manage your products and stock levels</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleGetProducts}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw className="h-4 w-4" />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button 
            onClick={handleGetModels}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            <File className="h-4 w-4" />
            {loading ? 'Loading...' : 'Models'}
          </button>
          <button 
            onClick={signOut}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
      
      <div className="p-4 lg:p-6">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <SyncLoader color="#6366f1" size={10} />
              <p className="mt-4 text-sm text-gray-600">
                {products.length > 0 ? 'Refreshing products...' : 'Loading products...'}
              </p>
            </div>
          ) : products.length > 0 ? (
            <ProductRecords products={products} />
          ) : (
            <p className="py-24 text-center text-sm text-gray-600">No products found</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Inventory