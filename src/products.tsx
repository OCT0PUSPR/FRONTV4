'use client';

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation, matchPath } from 'react-router-dom'
import { useAuth } from '../context/auth.tsx'
import { useCasl } from '../context/casl.tsx'
import { RefreshCcw, File } from 'lucide-react'
import { ProductRecords } from './components/ProductRecords.tsx'
import { ProductSidebar, ProductRecordPanel } from './components/ProductSidebar.tsx'
import { useTheme } from '../context/theme.tsx';
import { useData } from '../context/data.tsx'

function Products() {
    const { sessionId } = useAuth()
    const { canCreatePage, canEditPage } = useCasl()
    const { productTemplates, loading, errors, fetchData } = useData() as any
    const { colors } = useTheme()
    const navigate = useNavigate()
    const location = useLocation()
    const hasFetchedRef = useRef(false)

    // Route-based sidebar detection
    const viewMatch = matchPath('/products/view/:id', location.pathname)
    const editMatch = matchPath('/products/edit/:id', location.pathname)
    const createMatch = matchPath('/products/create', location.pathname)

    const sidebarRecordId = viewMatch?.params?.id || editMatch?.params?.id
    const isCreating = !!createMatch
    const isSidebarOpen = !!sidebarRecordId || isCreating

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

    const handleViewProduct = (productId: number) => {
        navigate(`/products/view/${productId}`)
    }

    const handleCloseSidebar = useCallback(() => {
        navigate('/products')
    }, [navigate])

    const handleSaveProduct = useCallback(() => {
        // Refresh products list after save
        fetchData('productTemplates')
    }, [fetchData])

  return (
    <div style={{ minHeight: "100vh", background: colors.background }}>
      <ProductRecords
        products={productTemplates || []}
        onAddProduct={handleAddProduct}
        onEditProduct={handleEditProduct}
        onViewProduct={handleViewProduct}
        onRefresh={handleGetProducts}
        isLoading={!!loading?.productTemplates}
        error={errors.productTemplates || null}
      />

      {/* Product Sidebar Modal */}
      <ProductSidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
      >
        {(sidebarRecordId || isCreating) && (
          <ProductRecordPanel
            recordId={sidebarRecordId ? parseInt(sidebarRecordId) : undefined}
            isCreating={isCreating}
            onClose={handleCloseSidebar}
            onSave={handleSaveProduct}
          />
        )}
      </ProductSidebar>
    </div>
  )
}

export default Products
