'use client';

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth.tsx'
import { useCasl } from '../context/casl.tsx'
import { RefreshCcw, File } from 'lucide-react'
import { ProductRecords } from './components/ProductRecords.tsx'
import { useTheme } from '../context/theme.tsx';
import { useData } from '../context/data.tsx'

// Using products from DataProvider; no local Product interface needed

function Products() {
    const { sessionId } = useAuth()
    const { canCreatePage, canEditPage } = useCasl()
    const { productTemplates, loading, errors, fetchData } = useData() as any
    const { colors } = useTheme()
    const navigate = useNavigate()
    const hasFetchedRef = useRef(false)
    
    // Fetch products automatically when component mounts or sessionId becomes available
    useEffect(() => {
        if (sessionId && !hasFetchedRef.current) {
            hasFetchedRef.current = true
            fetchData('productTemplates')
        }
    }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleGetProducts = async () => {
        if (sessionId) await fetchData('productTemplates')
    }

    const handleAddProduct = () => {
        navigate('/products/create')
    }

    const handleEditProduct = (productId: number) => {
        // Check edit permission before navigating
        if (!canEditPage("products")) {
            return
        }
        navigate(`/products/edit/${productId}`)
    }

  return (
    <div style={{ minHeight: "100vh", background: colors.background }}>
      <ProductRecords 
        products={productTemplates || []} 
        onAddProduct={handleAddProduct}
        onEditProduct={handleEditProduct}
        onRefresh={handleGetProducts}
        isLoading={!!loading?.productTemplates}
        error={errors.productTemplates || null}
      />
    </div>
  )
}

export default Products

