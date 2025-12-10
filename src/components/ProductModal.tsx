"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Plus, Trash2, Upload, ChevronDown, Check, X, Box, Tag, Layers, ShoppingBag, AlertTriangle, Image as ImageIcon, MoreVertical, Archive, Package, Radio, Scan } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { CustomTextarea } from "./ui/CustomTextarea"
import { CustomInput } from "./CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./NewCustomDropdown"
import { IOSCheckbox } from "./IOSCheckbox"
import { useSidebar } from "../../context/sidebar"
import { useTheme } from "../../context/theme"
import { useCasl } from "../../context/casl"
import { API_CONFIG } from "../config/api"
import { ConfirmationModal } from "./ConfirmationModal"
import Toast from "./Toast"
import { useAuth } from "../../context/auth"
import { Card } from "../../@/components/ui/card"
import { Button } from "../../@/components/ui/button"
import { NewCustomButton } from "./NewCustomButton"

interface Product {
  id?: number
  name?: string
  default_code?: string
  qty_available?: number
  virtual_available?: number
  list_price?: number
  standard_price?: number
  image_512?: string
  categ_id?: [number, string] | number
  weight?: number
  sale_ok?: boolean
  barcode?: string
  taxes_id?: number[]
  supplier_taxes_id?: number[]
  is_storable?: boolean
  optional_product_ids?: number[]
  accessory_product_ids?: number[]
  alternative_product_ids?: number[]
  product_tag_ids?: number[]
  website_id?: number
  pos_categ_ids?: number[]
  out_of_stock_message?: string
  is_published?: boolean
  allow_out_of_stock_order?: boolean
  description_purchase?: string
  description_ecommerce?: string
  purchase_line_warn?: string
  purchase_line_warn_msg?: string
  invoice_policy?: "order" | "delivery"
}

interface ProductModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ProductModal({ product, isOpen, onClose, onSuccess }: ProductModalProps) {
  const { sessionId, uid } = useAuth()
  const userId = uid ? Number(uid) : undefined
  const { t, i18n } = useTranslation()
  const { isCollapsed } = useSidebar()
  const isRTL = i18n.dir() === "rtl"
  const { colors, mode } = useTheme()
  const { canDeletePage } = useCasl()
  const isDark = mode === "dark"
  const canDelete = canDeletePage("products")
  const [activeTab, setActiveTab] = useState("general")
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [toast, setToast] = useState<{ text: string; state: 'success' | 'error' } | null>(null)
  const [selectedProductType, setSelectedProductType] = useState("Goods")
  const [dirty, setDirty] = useState(false)
  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false)
  const actionsDropdownRef = useRef<HTMLDivElement>(null)

  // Data for dropdowns
  const [taxes, setTaxes] = useState<Array<{ id: number; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])
  const [products, setProducts] = useState<Array<{ id: number; name: string }>>([])
  const [productTags, setProductTags] = useState<Array<{ id: number; name: string }>>([])
  const [websites, setWebsites] = useState<Array<{ id: number; name: string }>>([])
  const [posCategories, setPosCategories] = useState<Array<{ id: number; name: string }>>([])

  const [form, setForm] = useState({
    name: "",
    default_code: "",
    list_price: 0,
    standard_price: 0,
    barcode: "",
    image_512: "" as string | undefined,
    invoice_policy: "order" as "order" | "delivery",
    taxes_id: [] as number[],
    supplier_taxes_id: [] as number[],
    is_storable: false,
    categ_id: null as number | null,
    optional_product_ids: [] as number[],
    accessory_product_ids: [] as number[],
    alternative_product_ids: [] as number[],
    product_tag_ids: [] as number[],
    website_id: null as number | null,
    pos_categ_ids: [] as number[],
    out_of_stock_message: "",
    is_published: false,
    allow_out_of_stock_order: false,
    description_purchase: "",
    description_ecommerce: "",
    purchase_line_warn: "no-message",
    purchase_line_warn_msg: "",
  })
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Fetch dropdown data
  useEffect(() => {
    if (!isOpen) return
    const sessionId = getSessionId()
    if (!sessionId) return

    const fetchData = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          ...getOdooHeaders()
        }
        const body = JSON.stringify({ sessionId })

        const [taxesRes, categoriesRes, productsRes, tagsRes, websitesRes, posRes] = await Promise.all([
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/account-taxes`, { method: 'POST', headers, body }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/categories`, { method: 'POST', headers, body }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/product-templates`, { method: 'POST', headers, body }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/product-tags`, { method: 'POST', headers, body }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/websites`, { method: 'POST', headers, body }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/pos-categories`, { method: 'POST', headers, body }),
        ])

        const [taxesData, categoriesData, productsData, tagsData, websitesData, posData] = await Promise.all([
          taxesRes.json(),
          categoriesRes.json(),
          productsRes.json(),
          tagsRes.json(),
          websitesRes.json(),
          posRes.json(),
        ])

        if (taxesData.success) setTaxes(taxesData.taxes || [])
        if (categoriesData.success) setCategories(categoriesData.categories || [])
        if (productsData.success) setProducts(productsData.productTemplates || productsData.products || [])
        if (tagsData.success) setProductTags(tagsData.tags || [])
        if (websitesData.success) setWebsites(websitesData.websites || [])
        if (posData.success) setPosCategories(posData.posCategories || [])
      } catch (error) {
        console.error('Error fetching dropdown data:', error)
      }
    }

    fetchData()
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      if (product) {
        const categId = Array.isArray(product.categ_id) ? product.categ_id[0] : product.categ_id
        setForm({
          name: product.name || "",
          default_code: product.default_code || "",
          list_price: Number(product.list_price) || 0,
          standard_price: Number(product.standard_price) || 0,
          barcode: product.barcode || "",
          image_512: product.image_512,
          invoice_policy: (product.invoice_policy === "delivery" ? "delivery" : "order") as "order" | "delivery",
          taxes_id: product.taxes_id || [],
          supplier_taxes_id: product.supplier_taxes_id || [],
          is_storable: product.is_storable ?? false,
          categ_id: categId || null,
          optional_product_ids: product.optional_product_ids || [],
          accessory_product_ids: product.accessory_product_ids || [],
          alternative_product_ids: product.alternative_product_ids || [],
          product_tag_ids: product.product_tag_ids || [],
          website_id: product.website_id || null,
          pos_categ_ids: product.pos_categ_ids || [],
          out_of_stock_message: product.out_of_stock_message || "",
          is_published: product.is_published ?? false,
          allow_out_of_stock_order: product.allow_out_of_stock_order ?? false,
          description_purchase: product.description_purchase || "",
          description_ecommerce: product.description_ecommerce || "",
          purchase_line_warn: product.purchase_line_warn || "no-message",
          purchase_line_warn_msg: product.purchase_line_warn_msg || "",
        })
      } else {
        // Reset form for new product
        setForm({
          name: "",
          default_code: "",
          list_price: 0,
          standard_price: 0,
          barcode: "",
          image_512: undefined,
          invoice_policy: "order" as "order" | "delivery",
          taxes_id: [],
          supplier_taxes_id: [],
          is_storable: false,
          categ_id: null,
          optional_product_ids: [],
          accessory_product_ids: [],
          alternative_product_ids: [],
          product_tag_ids: [],
          website_id: null,
          pos_categ_ids: [],
          out_of_stock_message: "",
          is_published: false,
          allow_out_of_stock_order: false,
          description_purchase: "",
          description_ecommerce: "",
          purchase_line_warn: "no-message",
          purchase_line_warn_msg: "",
        })
      }
      setDirty(false)
    }
  }, [isOpen, product])

  const productTypes = ["Goods", "Service", "Combo"]
  const warningMessages = ["No Message", "Warning", "Blocking Message"]
  const warningValues = ["no-message", "warning", "block"]

  // Generate barcode image URL
  const generateBarcodeUrl = (code: string) => {
    if (!code) return null
    return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(code)}&code=Code128&translate-esc=on`
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  // Close actions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target as Node)) {
        setActionsDropdownOpen(false)
      }
    }
    if (actionsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [actionsDropdownOpen])

  const setDirtyTrue = () => !dirty && setDirty(true)
  const getSessionId = () => localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
  const getOdooHeaders = (): Record<string, string> => {
    const rawBase = 'https://egy.thetalenter.net'
    const db = 'odoodb1'
    const headers: Record<string, string> = {}
    if (rawBase) headers['x-odoo-base'] = rawBase
    if (db) headers['x-odoo-db'] = db
    // Include tenant ID for multi-tenant workflow support
    const tenantId = localStorage.getItem('current_tenant_id')
    if (tenantId) headers['X-Tenant-ID'] = tenantId
    return headers
  }

  const handleSaveClick = () => setShowConfirmModal(true)

  const handleArchiveToggle = async () => {
    setShowArchiveModal(false)
    setActionsDropdownOpen(false)
    try {
      if (!sessionId || !product?.id) {
        setToast({ text: 'No session ID or product ID found.', state: 'error' })
        return
      }

      const newPublishedState = !form.is_published
      const values = { is_published: newPublishedState }

      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/product-templates/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getOdooHeaders() },
        body: JSON.stringify({ sessionId, values, userId })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data?.message || 'Failed to update product')
      }

      setForm({ ...form, is_published: newPublishedState })
      setToast({ text: newPublishedState ? 'Product published successfully' : 'Product archived successfully', state: 'success' })
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error('Archive/Publish error:', error)
      setToast({ text: error.message || 'Failed to update product', state: 'error' })
    }
  }

  const handleDelete = async () => {
    setShowDeleteModal(false)
    setActionsDropdownOpen(false)
    try {
      if (!sessionId || !product?.id) {
        setToast({ text: 'No session ID or product ID found.', state: 'error' })
        return
      }

      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/product-templates/${product.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getOdooHeaders() },
        body: JSON.stringify({ sessionId, userId })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data?.message || 'Failed to delete product')
      }

      if (data.requiresApproval) {
        setToast({ text: 'Product deletion submitted for approval', state: 'success' })
      } else {
        setToast({ text: 'Product deleted successfully', state: 'success' })
        onClose()
        if (onSuccess) onSuccess()
      }
    } catch (error: any) {
      console.error('Delete error:', error)
      setToast({ text: error.message || 'Failed to delete product', state: 'error' })
    }
  }

  const handleUpdateQuantity = () => {
    setActionsDropdownOpen(false)
    // TODO: Implement update quantity logic later
    setToast({ text: 'Update quantity feature coming soon', state: 'success' })
  }

  const handleSave = async () => {
    setShowConfirmModal(false)
    try {
      if (!sessionId) {
        setToast({ text: 'No session ID found. Please log in again.', state: 'error' })
        return
      }
      const values: any = {
        name: form.name,
        default_code: form.default_code,
        list_price: form.list_price,
        standard_price: form.standard_price,
        barcode: form.barcode,
        invoice_policy: form.invoice_policy,
        taxes_id: form.taxes_id.length > 0 ? [[6, 0, form.taxes_id]] : [[5]],
        supplier_taxes_id: form.supplier_taxes_id.length > 0 ? [[6, 0, form.supplier_taxes_id]] : [[5]],
        is_storable: form.is_storable,
        categ_id: form.categ_id || false,
        optional_product_ids: form.optional_product_ids.length > 0 ? [[6, 0, form.optional_product_ids]] : [[5]],
        accessory_product_ids: form.accessory_product_ids.length > 0 ? [[6, 0, form.accessory_product_ids]] : [[5]],
        alternative_product_ids: form.alternative_product_ids.length > 0 ? [[6, 0, form.alternative_product_ids]] : [[5]],
        product_tag_ids: form.product_tag_ids.length > 0 ? [[6, 0, form.product_tag_ids]] : [[5]],
        website_id: form.website_id || false,
        pos_categ_ids: form.pos_categ_ids.length > 0 ? [[6, 0, form.pos_categ_ids]] : [[5]],
        out_of_stock_message: form.out_of_stock_message,
        is_published: form.is_published,
        allow_out_of_stock_order: form.allow_out_of_stock_order,
        description_purchase: form.description_purchase,
        description_ecommerce: form.description_ecommerce,
        purchase_line_warn: form.purchase_line_warn,
        purchase_line_warn_msg: form.purchase_line_warn_msg,
      }
      if (form.image_512) {
        const match = /^data:[^;]+;base64,(.*)$/i.exec(form.image_512)
        values.image_512 = match ? match[1] : form.image_512
      }

      let res, data
      if (product?.id) {
        res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/product-templates/${product.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getOdooHeaders() },
          body: JSON.stringify({ sessionId, values, userId })
        })
        data = await res.json()
        if (!res.ok || !data.success) throw new Error(data?.message || 'Save failed')
        if (data.requiresApproval) setToast({ text: 'Changes submitted for approval', state: 'success' })
        else setToast({ text: 'Changes saved successfully', state: 'success' })
      } else {
        res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/product-templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getOdooHeaders() },
          body: JSON.stringify({ sessionId, values, userId })
        })
        data = await res.json()
        if (!res.ok || !data.success) throw new Error(data?.message || 'Create failed')
        if (data.requiresApproval) setToast({ text: 'Product submitted for approval', state: 'success' })
        else setToast({ text: 'Product created successfully', state: 'success' })
      }

      setDirty(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Save product failed:', err)
      setToast({ text: err?.message || 'Failed to save changes', state: 'error' })
    }
  }

  const onPickImage = () => fileInputRef.current?.click()
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setForm(prev => ({ ...prev, image_512: result }))
      setDirtyTrue()
    }
    reader.readAsDataURL(file)
  }

  if (!isOpen) return null

  const isCreating = !product?.id

  // --- UI Components for Layout ---

  const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-3 mb-6 pb-2 border-b" style={{ borderColor: colors.border }}>
      <div
        className="p-2 rounded-lg"
        style={{
          backgroundColor: colors.mutedBg,
          color: colors.action
        }}
      >
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <h3 className="text-lg font-display font-bold tracking-tight" style={{ color: colors.textPrimary }}>{title}</h3>
    </div>
  )

  const NavItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => {
    const isActive = activeTab === id
    return (
      <button
        onClick={() => setActiveTab(id)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden"
        style={{
          backgroundColor: isActive
            ? colors.card
            : 'transparent',
          color: isActive ? colors.textPrimary : colors.textSecondary,
          boxShadow: isActive ? (isDark ? '0 0 20px rgba(0,0,0,0.2)' : '0 0 10px rgba(0,0,0,0.1)') : 'none'
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.05)' : colors.mutedBg
            e.currentTarget.style.color = colors.textPrimary
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = colors.textSecondary
          }
        }}
      >
        {isActive && (
          <motion.div
            layoutId="activeTabIndicator"
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ backgroundColor: colors.action }}
          />
        )}
        <Icon
          size={18}
          strokeWidth={isActive ? 2.5 : 2}
          style={{ color: isActive ? colors.action : colors.textSecondary, opacity: isActive ? 1 : 0.7 }}
        />
        <span className="font-display font-medium text-sm tracking-wide">{label}</span>
      </button>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 font-sans">
          {/* Styles */}
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap');
            
            .font-display { font-family: 'Space Grotesk', sans-serif; }
            .font-body { font-family: 'Outfit', sans-serif; }
            
            .glass-panel {
              backdrop-filter: blur(24px);
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }
            
            .field-group {
              border-radius: 12px;
              padding: 4px;
              transition: background-color 0.2s;
              background-color: ${colors.card};
              border: none;
            }
            .field-group:focus-within {
              background-color: ${colors.card};
            }

            .premium-scroll::-webkit-scrollbar { width: 4px; }
            .premium-scroll::-webkit-scrollbar-track { background: transparent; }
            .premium-scroll::-webkit-scrollbar-thumb { 
              background: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.2)'}; 
              border-radius: 10px; 
            }
            .premium-scroll::-webkit-scrollbar-thumb:hover { 
              background: ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)'}; 
            }
          `}</style>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!dirty || window.confirm(t("Discard unsaved changes?"))) onClose() }}
            style={{ backgroundColor: isDark ? 'rgba(5, 5, 5, 0.8)' : 'rgba(0, 0, 0, 0.5)' }}
            className="absolute inset-0 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              backgroundColor: isDark ? 'rgba(20, 20, 23, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border}`
            }}
            className="relative w-full max-w-[1400px] h-[90vh] glass-panel rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex-none px-8 py-5 border-b flex items-center justify-between"
              style={{
                borderColor: colors.border,
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.02)'
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg"
                  style={{
                    background: `linear-gradient(to bottom right, ${colors.action}, ${colors.action}dd)`,
                    boxShadow: isDark ? '0 10px 15px -3px rgba(79, 172, 254, 0.2)' : '0 10px 15px -3px rgba(79, 172, 254, 0.15)'
                  }}
                >
                  <Box style={{ color: '#FFFFFF' }} size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold tracking-tight" style={{ color: colors.textPrimary }}>
                    {isCreating ? t("New Product") : t("Edit Product")}
                  </h2>
                  <p className="text-xs font-medium tracking-wide uppercase mt-0.5" style={{ color: colors.textSecondary }}>
                    {product?.default_code || "Draft Mode"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {dirty && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                    <Button
                      onClick={handleSaveClick}
                      className="font-display font-medium px-6 h-10 rounded-xl border"
                      style={{
                        backgroundColor: colors.action,
                        color: '#FFFFFF',
                        borderColor: isDark ? 'rgba(79, 172, 254, 0.2)' : 'rgba(79, 172, 254, 0.3)',
                        boxShadow: isDark ? '0 0 20px rgba(79, 172, 254, 0.3)' : '0 0 15px rgba(79, 172, 254, 0.25)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? '#5fb5fe' : '#3d9dfe'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colors.action
                      }}
                    >
                      <Check size={16} className="mr-2" strokeWidth={3} />
                      {isCreating ? t("Create Product") : t("Save Changes")}
                    </Button>
                  </motion.div>
                )}
                {!isCreating && (
                  <div className="relative" ref={actionsDropdownRef}>
                    <button
                      onClick={() => setActionsDropdownOpen(!actionsDropdownOpen)}
                      className="h-10 w-10 flex items-center justify-center rounded-xl transition-colors border"
                      style={{
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.mutedBg,
                        borderColor: colors.border,
                        color: colors.textSecondary
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border
                        e.currentTarget.style.color = colors.textPrimary
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.05)' : colors.mutedBg
                        e.currentTarget.style.color = colors.textSecondary
                      }}
                    >
                      <MoreVertical size={18} />
                    </button>

                    <AnimatePresence>
                      {actionsDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl overflow-hidden"
                          style={{
                            backgroundColor: colors.card,
                            border: `1px solid ${colors.border}`,
                            zIndex: 9999,
                          }}
                        >
                          <button
                            onClick={handleUpdateQuantity}
                            className="w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3"
                            style={{
                              color: colors.textPrimary,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.mutedBg
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            <Package size={16} />
                            <span>Update Quantity</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowArchiveModal(true)
                              setActionsDropdownOpen(false)
                            }}
                            className="w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 border-t"
                            style={{
                              color: colors.textPrimary,
                              borderColor: colors.border,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.mutedBg
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            <Archive size={16} />
                            <span>{form.is_published ? 'Archive' : 'Publish'}</span>
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => {
                                setShowDeleteModal(true)
                                setActionsDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 border-t"
                              style={{
                                color: '#ef4444',
                                borderColor: colors.border,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                            >
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="h-10 w-10 flex items-center justify-center rounded-xl transition-colors border"
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.mutedBg,
                    borderColor: colors.border,
                    color: colors.textSecondary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border
                    e.currentTarget.style.color = colors.textPrimary
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.05)' : colors.mutedBg
                    e.currentTarget.style.color = colors.textSecondary
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Main Content Layout */}
            <div className="flex-1 flex overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(0, 0, 0, 0.1)' : colors.mutedBg }}>

              {/* Sidebar Navigation */}
              <div
                className="w-64 flex-none border-r p-4 flex flex-col gap-2"
                style={{
                  borderColor: colors.border,
                  backgroundColor: isDark ? 'rgba(0, 0, 0, 0.1)' : colors.background
                }}
              >
                <div className="text-xs font-bold uppercase tracking-widest px-4 mb-2 mt-2 font-display" style={{ color: colors.textSecondary }}>
                  Configuration
                </div>
                <NavItem id="general" label={t("General Info")} icon={Layers} />
                <NavItem id="sales" label={t("Sales & Media")} icon={ShoppingBag} />
              </div>

              {/* Form Area */}
              <div className="flex-1 overflow-y-auto premium-scroll p-8 relative" style={{ backgroundColor: colors.background }}>
                <div className="max-w-3xl mx-auto space-y-8 pb-20">

                  {activeTab === "general" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <SectionTitle icon={Layers} title={t("Basic Information")} />

                      <div className="grid grid-cols-12 gap-5">
                        <div className="col-span-12 field-group">
                          <CustomInput
                            label={t("Product Name")}
                            type="text"
                            value={form.name}
                            onChange={(v) => { setForm({ ...form, name: v }); setDirtyTrue() }}
                            placeholder={t("e.g. Wireless Noise Cancelling Headphones")}
                          />
                        </div>

                        <div className="col-span-6 field-group">
                          <NewCustomDropdown
                            label={t("Product Type")}
                            values={productTypes}
                            type="single"
                            defaultValue={selectedProductType}
                            onChange={(v) => { setSelectedProductType(v as string); setDirtyTrue() }}
                          />
                        </div>

                        <div className="col-span-6 field-group">
                          <NewCustomDropdown
                            label={t("Category")}
                            values={[...new Set(categories.map(c => c.name))]}
                            type="single"
                            defaultValue={categories.find(c => c.id === form.categ_id)?.name}
                            onChange={(v) => {
                              const selectedId = categories.find(c => c.name === v)?.id || null
                              setForm({ ...form, categ_id: selectedId })
                              setDirtyTrue()
                            }}
                          />
                        </div>

                        <div className="col-span-12 py-2">
                          <IOSCheckbox
                            checked={form.is_storable}
                            onChange={(v) => { setForm({ ...form, is_storable: v }); setDirtyTrue() }}
                            label={t("Track Inventory Levels")}
                          />
                        </div>

                        <div className="col-span-12 h-px my-2" style={{ backgroundColor: colors.border }} />

                        <div className="col-span-6 field-group">
                          <CustomInput
                            label={t("Sales Price ($)")}
                            type="number"
                            value={String(form.list_price)}
                            onChange={(v) => { setForm({ ...form, list_price: Number(v) || 0 }); setDirtyTrue() }}
                          />
                        </div>
                        <div className="col-span-6 field-group">
                          <CustomInput
                            label={t("Cost ($)")}
                            type="number"
                            value={String(form.standard_price)}
                            onChange={(v) => { setForm({ ...form, standard_price: Number(v) || 0 }); setDirtyTrue() }}
                          />
                        </div>

                        <div className="col-span-6 field-group">
                          <NewCustomDropdown
                            label={t("Customer Taxes")}
                            values={[...new Set(taxes.map(t => t.name))]}
                            type="multi"
                            defaultValue={taxes.filter(t => form.taxes_id.includes(t.id)).map(t => t.name)}
                            onChange={(v) => {
                              const selectedIds = taxes.filter(t => (v as string[]).includes(t.name)).map(t => t.id)
                              setForm({ ...form, taxes_id: selectedIds })
                              setDirtyTrue()
                            }}
                          />
                        </div>

                        <div className="col-span-6 field-group">
                          <NewCustomDropdown
                            label={t("Vendor Taxes")}
                            values={[...new Set(taxes.map(t => t.name))]}
                            type="multi"
                            defaultValue={taxes.filter(t => form.supplier_taxes_id.includes(t.id)).map(t => t.name)}
                            onChange={(v) => {
                              const selectedIds = taxes.filter(t => (v as string[]).includes(t.name)).map(t => t.id)
                              setForm({ ...form, supplier_taxes_id: selectedIds })
                              setDirtyTrue()
                            }}
                          />
                        </div>

                        <div className="col-span-12 h-px my-2" style={{ backgroundColor: colors.border }} />

                        <div className="col-span-4 field-group">
                          <CustomInput
                            label={t("Internal Reference")}
                            type="text"
                            value={form.default_code}
                            onChange={(v) => { setForm({ ...form, default_code: v }); setDirtyTrue() }}
                          />
                        </div>
                        <div className="col-span-8 field-group">
                          <CustomInput
                            label={t("Barcode")}
                            type="text"
                            value={form.barcode}
                            onChange={(v) => { setForm({ ...form, barcode: v }); setDirtyTrue() }}
                          />
                        </div>

                      </div>
                    </motion.div>
                  )}

                  {activeTab === "sales" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-8"
                    >

                      {/* Media Section */}
                      <div>
                        <SectionTitle icon={ImageIcon} title={t("Product Media")} />
                        <div
                          onClick={onPickImage}
                          className="group relative w-full h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden"
                          style={{
                            borderColor: colors.border,
                            backgroundColor: colors.background
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = colors.action
                            e.currentTarget.style.backgroundColor = colors.background
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = colors.border
                            e.currentTarget.style.backgroundColor = colors.background
                          }}
                        >
                          {form.image_512 ? (
                            <>
                              <div
                                className="w-full h-full flex items-center justify-center p-4 z-10 rounded-xl"
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  border: `1px solid ${colors.border}`
                                }}
                              >
                                <img
                                  src={form.image_512.startsWith('data:') ? form.image_512 : `data:image/png;base64,${form.image_512}`}
                                  className="w-full h-full object-contain"
                                  style={{ filter: 'none' }}
                                />
                              </div>
                              <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20"
                                style={{ backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.5)' }}
                              >
                                <span className="font-medium flex items-center gap-2" style={{ color: colors.textPrimary }}><Upload size={16} /> Change Image</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-6">
                              <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"
                                style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.mutedBg }}
                              >
                                <Upload style={{ color: colors.textSecondary }} className="group-hover:transition-colors" size={24} />
                              </div>
                              <p className="font-medium" style={{ color: colors.textSecondary }}>{t("Click to upload image")}</p>
                              <p className="text-xs mt-2" style={{ color: colors.textSecondary }}>SVG, PNG, JPG or GIF (max. 3MB)</p>
                            </div>
                          )}
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                        </div>
                      </div>

                      {/* Upsells */}
                      <div>
                        <SectionTitle icon={ShoppingBag} title={t("Upsells & Accessories")} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="field-group">
                            <NewCustomDropdown
                              label={t("Optional Products")}
                              values={[...new Set(products.map(p => p.name))]}
                              type="multi"
                              defaultValue={products.filter(p => form.optional_product_ids.includes(p.id)).map(p => p.name)}
                              onChange={(v) => {
                                const ids = products.filter(p => (v as string[]).includes(p.name)).map(p => p.id)
                                setForm({ ...form, optional_product_ids: ids }); setDirtyTrue()
                              }}
                            />
                          </div>
                          <div className="field-group">
                            <NewCustomDropdown
                              label={t("Accessory Products")}
                              values={[...new Set(products.map(p => p.name))]}
                              type="multi"
                              defaultValue={products.filter(p => form.accessory_product_ids.includes(p.id)).map(p => p.name)}
                              onChange={(v) => {
                                const ids = products.filter(p => (v as string[]).includes(p.name)).map(p => p.id)
                                setForm({ ...form, accessory_product_ids: ids }); setDirtyTrue()
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Web & POS */}
                      <div>
                        <SectionTitle icon={Tag} title={t("Web & POS")} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="field-group">
                            <NewCustomDropdown
                              label={t("Website")}
                              values={[...new Set(websites.map(w => w.name))]}
                              type="single"
                              defaultValue={websites.find(w => w.id === form.website_id)?.name}
                              onChange={(v) => {
                                const id = websites.find(w => w.name === v)?.id || null
                                setForm({ ...form, website_id: id }); setDirtyTrue()
                              }}
                            />
                          </div>
                          <div className="field-group">
                            <NewCustomDropdown
                              label={t("Product Tags")}
                              values={[...new Set(productTags.map(t => t.name))]}
                              type="multi"
                              defaultValue={productTags.filter(t => form.product_tag_ids.includes(t.id)).map(t => t.name)}
                              onChange={(v) => {
                                const ids = productTags.filter(t => (v as string[]).includes(t.name)).map(t => t.id)
                                setForm({ ...form, product_tag_ids: ids }); setDirtyTrue()
                              }}
                            />
                          </div>
                          <div className="col-span-full space-y-3 pt-2">
                            <IOSCheckbox
                              checked={form.is_published}
                              onChange={(v) => { setForm({ ...form, is_published: v }); setDirtyTrue() }}
                              label={t("Publish on Website")}
                            />
                            <IOSCheckbox
                              checked={form.allow_out_of_stock_order}
                              onChange={(v) => { setForm({ ...form, allow_out_of_stock_order: v }); setDirtyTrue() }}
                              label={t("Allow Orders When Out of Stock")}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Text Content */}
                      <div>
                        <SectionTitle icon={AlertTriangle} title={t("Content & Warnings")} />
                        <div className="space-y-5">
                          <div className="field-group">
                            <CustomTextarea
                              label={t("Sales Description")}
                              value={form.description_ecommerce}
                              onChange={(v) => { setForm({ ...form, description_ecommerce: v }); setDirtyTrue() }}
                              minRows={3}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-5">
                            <div className="field-group">
                              <NewCustomDropdown
                                label={t("Warning Policy")}
                                values={warningMessages}
                                type="single"
                                defaultValue={warningValues.indexOf(form.purchase_line_warn) >= 0 ? warningMessages[warningValues.indexOf(form.purchase_line_warn)] : warningMessages[0]}
                                onChange={(v) => {
                                  const val = warningValues[warningMessages.indexOf(v as string)] || "no-message"
                                  setForm({ ...form, purchase_line_warn: val }); setDirtyTrue()
                                }}
                              />
                            </div>
                            {form.purchase_line_warn !== "no-message" && (
                              <div className="field-group">
                                <CustomInput
                                  label={t("Warning Message")}
                                  type="text"
                                  value={form.purchase_line_warn_msg}
                                  onChange={(v) => { setForm({ ...form, purchase_line_warn_msg: v }); setDirtyTrue() }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </motion.div>
                  )}
                </div>
              </div>

              {/* Right Preview Panel - Sticky */}
              <div
                className="w-[340px] flex-none border-l p-6 flex flex-col overflow-y-auto premium-scroll"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border
                }}
              >
                <div className="sticky top-0">
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-6 font-display" style={{ color: colors.textSecondary }}>Live Preview</h4>

                  {/* Card Preview */}
                  <div
                    className="border rounded-2xl overflow-hidden relative group"
                    style={{
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.background,
                      borderColor: colors.border
                    }}
                  >
                    <div
                      className="aspect-square relative flex items-center justify-center p-4 rounded-xl"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: `1px solid ${colors.border}`
                      }}
                    >
                      {form.image_512 ? (
                        <img
                          src={form.image_512.startsWith('data:') ? form.image_512 : `data:image/png;base64,${form.image_512}`}
                          className="w-full h-full object-contain p-2"
                          style={{ filter: 'none' }}
                        />
                      ) : (
                        <ImageIcon style={{ color: colors.textSecondary }} size={48} />
                      )}
                      {form.is_published && (
                        <div
                          className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm"
                          style={{ backgroundColor: colors.tableDoneBg, color: colors.tableDoneText }}
                        >
                          PUBLISHED
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                        {categories.find(c => c.id === form.categ_id)?.name || "Uncategorized"}
                      </div>
                      <h3 className="font-display font-bold text-lg leading-tight mb-2" style={{ color: colors.textPrimary }}>
                        {form.name || "Product Name"}
                      </h3>
                      <div className="flex items-end justify-between mt-4 border-t pt-4" style={{ borderColor: colors.border }}>
                        <div>
                          <div className="text-xs mb-0.5" style={{ color: colors.textSecondary }}>Price</div>
                          <div className="text-xl font-bold font-display" style={{ color: colors.action }}>
                            ${(Number(form.list_price) || 0).toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs mb-0.5" style={{ color: colors.textSecondary }}>Stock</div>
                          <div
                            className="text-sm font-bold"
                            style={{ color: product?.qty_available && product.qty_available > 0 ? colors.success : colors.cancel }}
                          >
                            {product?.qty_available || 0} Units
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats & Barcode & RFID */}
                  <div className="mt-6 space-y-3">

                    {(form.barcode || form.default_code) && (
                      <div
                        className="p-4 rounded-xl flex flex-col items-center justify-center gap-4 relative overflow-hidden"
                        style={{
                          backgroundColor: isDark ? 'rgba(24, 24, 27, 0.5)' : '#FFFFFF',
                          border: `1px solid ${colors.border}`
                        }}
                      >
                        {form.barcode && (
                          <>
                            <img src={generateBarcodeUrl(form.barcode) || ""} className="h-10 object-contain mix-blend-multiply opacity-80" />
                          </>
                        )}

                        {/* RFID Section */}
                        {form.default_code && (
                          <div
                            className="w-full mt-2 pt-4 border-t border-dashed"
                            style={{ borderColor: colors.border }}
                          >
                            <div
                              className="relative w-full rounded-lg border p-3 overflow-hidden group"
                              style={{
                                backgroundColor: isDark ? colors.mutedBg : colors.card,
                                borderColor: colors.border
                              }}
                            >

                              {/* RFID Antenna Lines Effect */}
                              <div
                                className="absolute inset-0"
                                style={{
                                  backgroundImage: `repeating-linear-gradient(45deg, ${isDark ? colors.textSecondary : '#000000'} 0, ${isDark ? colors.textSecondary : '#000000'} 1px, transparent 0, transparent 50%)`,
                                  backgroundSize: '10px 10px',
                                  opacity: isDark ? 0.15 : 0.05
                                }}
                              />

                              <div className="relative flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span
                                    className="text-[9px] uppercase font-bold tracking-widest mb-0.5 flex items-center gap-1"
                                    style={{ color: colors.textSecondary }}
                                  >
                                    <Radio size={10} style={{ color: colors.textSecondary }} /> RFID TAG
                                  </span>
                                  <span
                                    className="font-mono text-sm font-semibold tracking-wider"
                                    style={{ color: colors.textPrimary }}
                                  >
                                    {form.default_code}
                                  </span>
                                </div>

                                {/* Chip Visual */}
                                <div
                                  className="w-8 h-6 rounded border flex items-center justify-center relative"
                                  style={{
                                    borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.3)',
                                    backgroundColor: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.15)'
                                  }}
                                >
                                  <div className="w-full h-[1px] bg-amber-500/40 absolute top-1/3"></div>
                                  <div className="w-full h-[1px] bg-amber-500/40 absolute top-2/3"></div>
                                  <div className="h-full w-[1px] bg-amber-500/40 absolute left-1/3"></div>
                                  <div className="h-full w-[1px] bg-amber-500/40 absolute left-2/3"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleSave}
        title="Confirm Changes"
        message="Are you sure you want to save these changes to the product?"
      />

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${product?.name || 'this product'}"? This action cannot be undone.`}
      />

      <ConfirmationModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={handleArchiveToggle}
        title={form.is_published ? "Archive Product" : "Publish Product"}
        message={`Are you sure you want to ${form.is_published ? 'archive' : 'publish'} "${product?.name || 'this product'}"?`}
      />

      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}
    </AnimatePresence>
  )
}