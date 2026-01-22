"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import { API_CONFIG } from "../config/api"
import {
    X,
    Search,
    Package,
    Loader2,
    Plus,
    Minus,
    Check
} from "lucide-react"

interface Product {
    id: number
    name: string
    display_name?: string
    default_code?: string
    uom_id?: [number, string]
    image_512?: string | false
}

interface AddLineModalProps {
    isOpen: boolean
    onClose: () => void
    onAdd: (productId: number, productName: string, quantity: number, uomId?: number) => Promise<boolean>
    pickingId: number
}

export function AddLineModal({ isOpen, onClose, onAdd, pickingId }: AddLineModalProps) {
    const { t } = useTranslation()
    const { colors, mode } = useTheme()
    const { sessionId } = useAuth()
    const isDark = mode === 'dark'

    const [searchQuery, setSearchQuery] = useState('')
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [quantity, setQuantity] = useState(1)
    const [adding, setAdding] = useState(false)
    const [initialLoaded, setInitialLoaded] = useState(false)

    // Get tenant ID and headers
    const getTenantId = () => localStorage.getItem('current_tenant_id')

    const getHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        const tenantId = getTenantId()
        if (tenantId) headers['X-Tenant-ID'] = tenantId
        if (sessionId) headers['X-Odoo-Session'] = sessionId
        const odooBase = localStorage.getItem('odooBase')
        const odooDb = localStorage.getItem('odooDb')
        if (odooBase) headers['x-odoo-base'] = odooBase
        if (odooDb) headers['x-odoo-db'] = odooDb
        return headers
    }, [sessionId])

    // Fetch products (initial or search)
    const fetchProducts = useCallback(async (query?: string) => {
        if (!sessionId) return
        setLoading(true)

        try {
            let domain: string
            if (query && query.trim().length > 0) {
                // Search by name or default_code
                domain = JSON.stringify([
                    '|',
                    ['name', 'ilike', query],
                    ['default_code', 'ilike', query]
                ])
            } else {
                // Load all products (limited)
                domain = JSON.stringify([])
            }

            // Include image_512 in fields
            const fields = JSON.stringify(['id', 'name', 'display_name', 'default_code', 'uom_id', 'image_512'])
            const url = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/product.product?domain=${encodeURIComponent(domain)}&fields=${encodeURIComponent(fields)}&limit=50`
            const res = await fetch(url, { headers: getHeaders() })
            const data = await res.json()

            if (data.success && data.records) {
                setProducts(data.records)
            } else {
                setProducts([])
            }
        } catch (error) {
            console.error('Error fetching products:', error)
            setProducts([])
        } finally {
            setLoading(false)
        }
    }, [sessionId, getHeaders])

    // Load products when modal opens
    useEffect(() => {
        if (isOpen && !initialLoaded) {
            fetchProducts()
            setInitialLoaded(true)
        }
    }, [isOpen, initialLoaded, fetchProducts])

    // Debounced search
    useEffect(() => {
        if (!isOpen) return

        const timer = setTimeout(() => {
            fetchProducts(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, isOpen, fetchProducts])

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('')
            setProducts([])
            setSelectedProduct(null)
            setQuantity(1)
            setInitialLoaded(false)
        }
    }, [isOpen])

    // Handle add line
    const handleAddLine = async () => {
        if (!selectedProduct) return
        setAdding(true)

        try {
            const success = await onAdd(
                selectedProduct.id,
                selectedProduct.display_name || selectedProduct.name,
                quantity,
                selectedProduct.uom_id?.[0]
            )
            if (success) {
                onClose()
            }
        } finally {
            setAdding(false)
        }
    }

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    // Render product image or fallback
    const renderProductImage = (product: Product, size: number = 40) => {
        if (product.image_512 && product.image_512 !== false) {
            return (
                <img
                    src={`data:image/png;base64,${product.image_512}`}
                    alt={product.name}
                    style={{
                        width: size,
                        height: size,
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                    }}
                />
            )
        }
        return (
            <div style={{
                width: size,
                height: size,
                borderRadius: '6px',
                background: colors.background,
                border: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Package size={size * 0.5} style={{ color: colors.textSecondary, opacity: 0.5 }} />
            </div>
        )
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 2000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: colors.card,
                                borderRadius: '16px',
                                width: '90%',
                                maxWidth: '520px',
                                maxHeight: '85vh',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: isDark
                                    ? '0 25px 80px rgba(0, 0, 0, 0.6)'
                                    : '0 25px 80px rgba(0, 0, 0, 0.2)',
                                border: `1px solid ${colors.border}`,
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 20px',
                                borderBottom: `1px solid ${colors.border}`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: `${colors.action}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Plus size={22} style={{ color: colors.action }} />
                                    </div>
                                    <h2 style={{
                                        margin: 0,
                                        fontSize: '1.15rem',
                                        fontWeight: 700,
                                        color: colors.textPrimary,
                                    }}>
                                        {t('Add Line')}
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    style={{
                                        background: colors.background,
                                        border: `1px solid ${colors.border}`,
                                        padding: '8px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        color: colors.textSecondary,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = colors.card
                                        e.currentTarget.style.color = colors.textPrimary
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = colors.background
                                        e.currentTarget.style.color = colors.textSecondary
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
                                {/* Product Search */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        color: colors.textSecondary,
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}>
                                        {t('Search Product')}
                                    </label>
                                    <div style={{
                                        position: 'relative',
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            left: '14px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            pointerEvents: 'none',
                                        }}>
                                            <Search size={18} style={{ color: colors.textSecondary }} />
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={t('Search by name or code...')}
                                            autoFocus
                                            style={{
                                                width: '100%',
                                                padding: '12px 40px 12px 44px',
                                                border: `1px solid ${colors.border}`,
                                                borderRadius: '10px',
                                                fontSize: '0.9rem',
                                                background: colors.background,
                                                color: colors.textPrimary,
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                        {loading && (
                                            <div style={{
                                                position: 'absolute',
                                                right: '14px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                                <Loader2
                                                    size={18}
                                                    style={{
                                                        color: colors.action,
                                                        animation: 'spin 1s linear infinite',
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Product Results */}
                                {products.length > 0 && !selectedProduct && (
                                    <div style={{
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '10px',
                                        maxHeight: '280px',
                                        overflow: 'auto',
                                        marginBottom: '16px',
                                    }}>
                                        {products.map((product, index) => (
                                            <div
                                                key={product.id}
                                                onClick={() => setSelectedProduct(product)}
                                                style={{
                                                    padding: '12px 14px',
                                                    borderBottom: index < products.length - 1 ? `1px solid ${colors.border}` : 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = colors.background
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent'
                                                }}
                                            >
                                                {renderProductImage(product, 44)}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: '0.9rem',
                                                        fontWeight: 600,
                                                        color: colors.textPrimary,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}>
                                                        {product.display_name || product.name}
                                                    </div>
                                                    {product.default_code && (
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            color: colors.textSecondary,
                                                            fontFamily: 'monospace',
                                                        }}>
                                                            {product.default_code}
                                                        </div>
                                                    )}
                                                </div>
                                                {product.uom_id && (
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        color: colors.textSecondary,
                                                        background: colors.background,
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontWeight: 500,
                                                        flexShrink: 0,
                                                    }}>
                                                        {product.uom_id[1]}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Selected Product */}
                                {selectedProduct && (
                                    <div style={{
                                        padding: '16px',
                                        background: colors.background,
                                        borderRadius: '12px',
                                        border: `2px solid ${colors.action}30`,
                                        marginBottom: '16px',
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '14px',
                                            marginBottom: '16px',
                                        }}>
                                            {renderProductImage(selectedProduct, 56)}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    marginBottom: '4px',
                                                }}>
                                                    <Check size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                                                    <span style={{
                                                        fontSize: '0.95rem',
                                                        fontWeight: 600,
                                                        color: colors.textPrimary,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}>
                                                        {selectedProduct.display_name || selectedProduct.name}
                                                    </span>
                                                </div>
                                                {selectedProduct.default_code && (
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: colors.textSecondary,
                                                        fontFamily: 'monospace',
                                                    }}>
                                                        {selectedProduct.default_code}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setSelectedProduct(null)}
                                                style={{
                                                    background: colors.card,
                                                    border: `1px solid ${colors.border}`,
                                                    padding: '6px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    color: colors.textSecondary,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>

                                        {/* Quantity Input */}
                                        <div>
                                            <label style={{
                                                display: 'block',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: colors.textSecondary,
                                                marginBottom: '8px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                            }}>
                                                {t('Quantity')}
                                            </label>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    background: colors.card,
                                                    border: `1px solid ${colors.border}`,
                                                    borderRadius: '10px',
                                                    overflow: 'hidden',
                                                }}>
                                                    <button
                                                        onClick={() => setQuantity(Math.max(0.01, quantity - 1))}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            padding: '10px 14px',
                                                            cursor: 'pointer',
                                                            color: colors.textSecondary,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRight: `1px solid ${colors.border}`,
                                                        }}
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={quantity}
                                                        onChange={(e) => setQuantity(Math.max(0.01, parseFloat(e.target.value) || 0))}
                                                        min={0.01}
                                                        step={1}
                                                        style={{
                                                            width: '80px',
                                                            padding: '10px 8px',
                                                            border: 'none',
                                                            fontSize: '1rem',
                                                            fontWeight: 600,
                                                            textAlign: 'center',
                                                            background: 'transparent',
                                                            color: colors.textPrimary,
                                                            outline: 'none',
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => setQuantity(quantity + 1)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            padding: '10px 14px',
                                                            cursor: 'pointer',
                                                            color: colors.textSecondary,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderLeft: `1px solid ${colors.border}`,
                                                        }}
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                                {selectedProduct.uom_id && (
                                                    <span style={{
                                                        fontSize: '0.9rem',
                                                        color: colors.textSecondary,
                                                        fontWeight: 500,
                                                    }}>
                                                        {selectedProduct.uom_id[1]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Empty state */}
                                {!loading && products.length === 0 && !selectedProduct && (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '40px 20px',
                                        color: colors.textSecondary,
                                    }}>
                                        <Package size={48} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.4 }} />
                                        <div style={{ fontSize: '0.9rem' }}>{t('No products found')}</div>
                                    </div>
                                )}

                                {/* Loading state */}
                                {loading && products.length === 0 && !selectedProduct && (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '40px 20px',
                                        color: colors.textSecondary,
                                    }}>
                                        <Loader2 size={32} style={{ marginBottom: '12px', animation: 'spin 1s linear infinite' }} />
                                        <div style={{ fontSize: '0.9rem' }}>{t('Loading products...')}</div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                padding: '16px 20px',
                                borderTop: `1px solid ${colors.border}`,
                                background: colors.background,
                            }}>
                                <button
                                    onClick={onClose}
                                    style={{
                                        padding: '11px 22px',
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '10px',
                                        background: 'transparent',
                                        color: colors.textPrimary,
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {t('Cancel')}
                                </button>
                                <button
                                    onClick={handleAddLine}
                                    disabled={!selectedProduct || adding}
                                    style={{
                                        padding: '11px 26px',
                                        border: 'none',
                                        borderRadius: '10px',
                                        background: selectedProduct ? colors.action : colors.border,
                                        color: selectedProduct ? 'white' : colors.textSecondary,
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        cursor: selectedProduct ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        opacity: adding ? 0.7 : 1,
                                    }}
                                >
                                    {adding ? (
                                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                    ) : (
                                        <Plus size={16} />
                                    )}
                                    {t('Add Line')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default AddLineModal
