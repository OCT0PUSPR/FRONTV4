"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Plus, Upload, ChevronDown, Check, Edit2, X } from "lucide-react"
import { CustomInput } from "./CusotmInput"
import { CustomDropdown as NewCustomDropdown } from "./NewCustomDropdown"
import { CustomCheckbox } from "./ui/CustomCheckbox"
import { CustomTextarea } from "./ui/CustomTextarea"
import { useSidebar } from "../../context/sidebar"
import Toast from "./Toast"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth.tsx"
import { API_CONFIG } from "../config/api"
import { useData } from "../../context/data.tsx"

interface Product {
  id: number
  name: string
  default_code: string
  qty_available: number
  virtual_available: number
  list_price: number
  standard_price: number
  image_512?: string
  categ_id: [number, string]
  weight: number
  sale_ok: boolean
  barcode?: string
  tracking?: string
  product_tmpl_id?: [number, string]
}

function ProductMultiSelect({
  options,
  values,
  onChange,
  placeholder,
}: {
  options: Array<{ id: number; name: string; image_512?: string }>
  values: number[]
  onChange: (ids: number[]) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { colors } = useTheme()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const toggle = (id: number) => {
    if (values.includes(id)) onChange(values.filter((v) => v !== id))
    else onChange([...values, id])
  }

  const selected = values.map((id) => options.find((o) => o.id === id)).filter(Boolean) as Array<{
    id: number
    name: string
    image_512?: string
  }>

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 text-left rounded-lg border"
        style={{ background: colors.card, borderColor: colors.border, color: colors.textPrimary }}
      >
        {selected.length === 0 ? (
          <span style={{ color: colors.textSecondary }}>{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-2 px-2 py-0.5 rounded text-xs"
                style={{ background: colors.mutedBg, color: colors.textPrimary }}
              >
                {s.image_512 && (
                  <img
                    alt={s.name}
                    src={`data:image/webp;base64,${s.image_512}`}
                    className="w-4 h-4 rounded object-cover"
                  />
                )}
                {s.name}
              </span>
            ))}
          </div>
        )}
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="w-4 h-4" style={{ color: colors.textSecondary }} />
        </span>
      </button>
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg shadow max-h-64 overflow-auto"
          style={{ background: colors.card, border: `1px solid ${colors.border}`, zIndex: 1000 }}
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:opacity-90"
              style={{ color: colors.textPrimary }}
            >
              {opt.image_512 && (
                <img
                  alt={opt.name}
                  src={`data:image/webp;base64,${opt.image_512}`}
                  className="w-6 h-6 rounded object-cover"
                />
              )}
              <span className="flex-1 text-left">{opt.name}</span>
              {values.includes(opt.id) && <Check className="w-4 h-4" style={{ color: colors.action }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface VariantModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
}

interface PurchaseRecord {
  id: string
  vendor: string
  quantity: number
  price: number
  currency: string
  delivery: number
}

interface CustomDropdownProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

function CustomDropdown({ options, value, onChange, placeholder, className = "", menuWidth }: CustomDropdownProps & { menuWidth?: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { colors } = useTheme()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const insideTrigger = containerRef.current && containerRef.current.contains(target)
      const insideMenu = menuRef.current && menuRef.current.contains(target)
      if (!insideTrigger && !insideMenu) setIsOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    window.addEventListener("scroll", () => setIsOpen(false), true)
    window.addEventListener("resize", () => setIsOpen(false))

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
      window.removeEventListener("scroll", () => setIsOpen(false), true)
      window.removeEventListener("resize", () => setIsOpen(false))
    }
  }, [])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left text-sm rounded-lg focus:outline-none transition-colors"
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          color: value ? colors.textPrimary : colors.textSecondary,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = colors.mutedBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = colors.card)}
      >
        <span className="block truncate">{value || placeholder}</span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className={`w-4 h-4`} style={{ color: colors.textSecondary }} />
        </span>
      </button>

      {isOpen && createPortal((() => {
        const rect = containerRef.current?.getBoundingClientRect()
        const style: React.CSSProperties = rect ? {
          position: 'fixed',
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: (menuWidth && menuWidth > 0) ? menuWidth : rect.width,
          background: colors.card,
          border: `1px solid ${colors.border}`,
          zIndex: 2000,
          borderRadius: 8,
          boxShadow: '0 8px 20px rgba(0,0,0,0.12)'
        } : { position: 'fixed', zIndex: 2000 }
        return (
          <div ref={menuRef} style={style}>
            <div className="py-1 max-h-60 overflow-auto">
              {options.map((option, idx) => (
                <div key={`${String(option)}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => { onChange(option); setIsOpen(false) }}
                    className="w-full px-3 py-1.5 text-sm text-left flex items-center justify-between"
                    style={{ color: colors.textPrimary }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = colors.mutedBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{String(option)}</span>
                    {value === option && <Check className="w-4 h-4" style={{ color: colors.action }} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })(), document.body)}
    </div>
  )
}

interface TokenOption {
  id: number
  name: string
}

function TokenMultiSelect({
  options,
  values,
  onChange,
  placeholder,
  className = "",
}: {
  options: TokenOption[]
  values: number[]
  onChange: (ids: number[]) => void
  placeholder?: string
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { colors } = useTheme()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggle = (id: number) => {
    if (values.includes(id)) onChange(values.filter((v) => v !== id))
    else onChange([...values, id])
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left rounded-lg border"
        style={{ background: colors.card, borderColor: colors.border, color: colors.textPrimary }}
      >
        {values.length === 0 ? (
          <span style={{ color: colors.textSecondary }}>{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {values
              .map((id) => options.find((o) => o.id === id)?.name)
              .filter(Boolean)
              .map((name) => (
                <span
                  key={name}
                  className="px-2 py-0.5 rounded text-xs"
                  style={{ background: colors.mutedBg, color: colors.textPrimary }}
                >
                  {name}
                </span>
              ))}
          </div>
        )}
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="w-4 h-4" style={{ color: colors.textSecondary }} />
        </span>
      </button>
      {isOpen && (
        <div
          className="absolute z-20 w-full mt-1 rounded-lg shadow"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <ul className="max-h-56 overflow-auto py-1">
            {options.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className="w-full px-3 py-2 flex items-center justify-between"
                  style={{ color: colors.textPrimary }}
                >
                  <span>{opt.name}</span>
                  {values.includes(opt.id) && <Check className="w-4 h-4" style={{ color: colors.action }} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function VariantModal({ product, isOpen, onClose }: VariantModalProps) {
  const { t, i18n } = useTranslation()
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  const { isCollapsed } = useSidebar()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { sessionId, partnerId } = useAuth()
  const { attributes, attributeValues, stockRoutes } = useData()
  const [activeTab, setActiveTab] = useState("general")
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([
    { id: "1", vendor: "", quantity: 0, price: 0, currency: "USD", delivery: 0 },
  ])
  const [selectedProductType, setSelectedProductType] = useState("Goods")
  // removed single tax selects in favor of token multi-selects
  const [selectedWarning, setSelectedWarning] = useState("None")
  const [trackInventory, setTrackInventory] = useState(false)
  const [createRepair, setCreateRepair] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [outOfStock, setOutOfStock] = useState(false)
  const [showAvailableQuantity, setShowAvailableQuantity] = useState(false)
  const [quotationDescription, setQuotationDescription] = useState("")
  const [ecommerceDescription, setEcommerceDescription] = useState("")

  const getOdooHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {}
    headers['x-odoo-base'] = 'https://egy.thetalenter.net'
    headers['x-odoo-db'] = 'odoodb1'
    return headers
  }
  const productTypes = ["Goods", "Service", "Combo"]
  const invoicePolicies = [t("Delivered quantities"), t("Ordered quantities")]
  const [invoicePolicy, setInvoicePolicy] = useState<string>(t("Ordered quantities"))
  const [salesPrice, setSalesPrice] = useState<number>(product.list_price || 0)
  const [cost, setCost] = useState<number>(product.standard_price || 0)
  const [internalRef, setInternalRef] = useState<string>(product.default_code || "")
  const [barcode, setBarcode] = useState<string>(product.barcode || "")
  const [internalNotes, setInternalNotes] = useState<string>("")
  const [categoryId, setCategoryId] = useState<number>(product.categ_id?.[0] || 0)
  const [taxOptions, setTaxOptions] = useState<TokenOption[]>([])
  const [selectedSalesTaxIds, setSelectedSalesTaxIds] = useState<number[]>([])
  const [selectedPurchaseTaxIds, setSelectedPurchaseTaxIds] = useState<number[]>([])
  const [selectedRouteIds, setSelectedRouteIds] = useState<number[]>([])
  const [categories, setCategories] = useState<TokenOption[]>([])
  const [inventoryTracking, setInventoryTracking] = useState<string>("By quantity")

  
  const [dirty, setDirty] = useState(false)
  const [templateId, setTemplateId] = useState<number | null>(product.product_tmpl_id?.[0] || null)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  // Sales tab product pickers
  const [allProducts, setAllProducts] = useState<Array<{ id: number; name: string; image_512?: string }>>([])
  const [optionalProductIds, setOptionalProductIds] = useState<number[]>([])
  const [accessoryProductIds, setAccessoryProductIds] = useState<number[]>([])
  const [alternativeProductIds, setAlternativeProductIds] = useState<number[]>([])
  const currencyOptions = ["USD", "EUR", "GBP", "CAD", "AUD"]
  const warningMessages = ["None", "Warning", "Block"]
  const [toast, setToast] = useState<null | { text: string; state: "success" | "error" }>(null)

  // Point of Sale tab state
  const [weighWithScale, setWeighWithScale] = useState(false)
  const [posCategories, setPosCategories] = useState<Array<{ id: number; name: string; color?: number }>>([])
  const [selectedPosCategoryId, setSelectedPosCategoryId] = useState<number | null>(null)
  // POS Color derived from attributes
  const [attrLines, setAttrLines] = useState<any[]>([])
  const [colorValues, setColorValues] = useState<Array<{ id: number; name: string; html_color: string }>>([])
  const [selectedColorValueId, setSelectedColorValueId] = useState<number | null>(null)

  // Purchase tab state
  interface VendorLine { id: string; serverId?: number; vendorId: number | null; quantity: number | ""; price: number | ""; currencyId: number | null; delay?: number | "" }
  const [vendorLines, setVendorLines] = useState<VendorLine[]>([])
  const [vendorLoading, setVendorLoading] = useState<boolean>(false)
  const [partners, setPartners] = useState<Array<{ id: number; name: string }>>([])
  const [currencies, setCurrencies] = useState<Array<{ id: number; name: string }>>([])
  const [uoms, setUoms] = useState<Array<{ id: number; name: string }>>([])
  const [purchaseUnitId, setPurchaseUnitId] = useState<number | null>(null)
  const [controlPolicy, setControlPolicy] = useState<string>("On ordered quantity")
  const [vendorDirty, setVendorDirty] = useState(false)
  const [purchaseDescription, setPurchaseDescription] = useState<string>("")
  const [purchaseWarningType, setPurchaseWarningType] = useState<string>("None")
  const [purchaseWarningMessage, setPurchaseWarningMessage] = useState<string>("")

  // Operations / Logistics tab state
  const routeOptions = [
    "Dropship Subcontractor on Order",
    "Buy",
    "Manufacture",
    "Resupply Subcontractor on Order",
  ]
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([])
  const [weight, setWeight] = useState<string>(product && typeof (product as any).weight === 'number' ? String((product as any).weight) : "")
  const [volume, setVolume] = useState<string>(product && typeof (product as any).volume === 'number' ? String((product as any).volume) : "")
  const [leadTimeDays, setLeadTimeDays] = useState<string>(product && typeof (product as any).sale_delay === 'number' ? String((product as any).sale_delay) : "")
  const [hsCode, setHsCode] = useState<string>(product && typeof (product as any).hs_code === 'string' ? (product as any).hs_code : "")
  const [countries, setCountries] = useState<Array<{ id: number; name: string }>>([])
  const [originCountryId, setOriginCountryId] = useState<number | null>(() => {
    const v = (product as any)?.country_of_origin

    if (Array.isArray(v)) return typeof v[0] === 'number' ? v[0] : null
    return typeof v === 'number' ? v : null
  })

  // Editable product name and image
  const [productName, setProductName] = useState<string>(product.name || "")
  const [editingName, setEditingName] = useState<boolean>(false)
  const [imageBase64, setImageBase64] = useState<string | undefined>(product.image_512)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const b64 = result.includes(',') ? result.split(',')[1] : result
      setImageBase64(b64)
      setDirtyTrue()
    }
    reader.readAsDataURL(file)
    // reset input so selecting the same file again still triggers change
    e.target.value = ''
  }

  const gradientButtonClasses =
    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg bg-[#5268ED] hover:bg-[#4457cf] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5268ED] focus-visible:ring-offset-2"

  // Initialize tracking state from product.product when available
  useEffect(() => {
    if (typeof product?.tracking === "string") {
      const tr = product.tracking
      setTrackInventory(tr !== "none")
      setInventoryTracking(
        tr === "lot"
          ? "By lots"
          : tr === "serial"
          ? "By Unique Serial Number"
          : tr === "quantity"
          ? "By quantity"
          : "By quantity",
      )
    }
  }, [product?.id, product?.tracking])

  // Fallback: fetch tracking if not provided on product
  useEffect(() => {
    const loadTracking = async () => {
      if (!sessionId || !product?.id) return
      try {
        const resp = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/products-single/${product.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getOdooHeaders() },
          body: JSON.stringify({ sessionId }),
        })
        const data = await resp.json()
        const p = Array.isArray(data?.products) ? data.products[0] : null
        if (p && typeof p.tracking === 'string') {
          const tr = p.tracking
          setTrackInventory(tr !== 'none')
          setInventoryTracking(
            tr === 'lot' ? 'By lots' : tr === 'serial' ? 'By Unique Serial Number' : 'By quantity'
          )
        }
        // Do not prefill Inventory fields from product.product; use product.template (handled in loadTemplate)
      } catch (e) {
        console.error('Failed to fetch product tracking', e)
      }
    }
    if (product && (product as any).tracking === undefined) {
      loadTracking()
    }
  }, [product?.id])

  // Fetch attribute lines for the product template (for POS Color)
  useEffect(() => {
    const fetchLines = async () => {
      if (!sessionId || !templateId) return
      try {
        const resp = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/attribute-lines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getOdooHeaders() },
          body: JSON.stringify({ sessionId, templateId }),
        })
        const data = await resp.json()
        if (data?.success && Array.isArray(data.attributeLines)) {
          setAttrLines(data.attributeLines)
        }
      } catch (e) {
        console.error('Fetch attribute lines error', e)
      }
    }
    fetchLines()
  }, [sessionId, templateId])

  // Load vendor lines (product.supplierinfo) for this product template
  useEffect(() => {
    const loadSupplierinfo = async () => {
      try {
        if (!sessionId || !templateId) return
        const resp = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/supplierinfo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getOdooHeaders() },
          body: JSON.stringify({ sessionId, product_tmpl_id: templateId }),
        })
        const data = await resp.json()
        const lines: VendorLine[] = (data?.supplierinfo || []).map((si: any) => ({
          id: String(si.id),
          serverId: si.id,
          vendorId: Array.isArray(si.partner_id) ? si.partner_id[0] : si.partner_id || null,
          quantity: Number(si.min_qty ?? 0),
          price: Number(si.price ?? 0),
          currencyId: Array.isArray(si.currency_id) ? si.currency_id[0] : si.currency_id || null,
          delay: typeof si.delay === 'number' ? si.delay : Number(si.delay || 0),
        }))
        if (lines.length) setVendorLines(lines)
      } catch (e) {
        console.error('Load supplierinfo error', e)
      }
    }
    loadSupplierinfo()
  }, [sessionId, templateId])

  // Derive Color attribute values from lines + attributeValues using attribute_id/value_ids
  useEffect(() => {
    // Find the attribute line whose attribute name is 'Color' using attribute_id [id, name]
    let colorLine: any | null = null
    for (const line of attrLines || []) {
      const attrTuple = Array.isArray(line.attribute_id) ? line.attribute_id : [line.attribute_id, undefined]
      const attrName = typeof attrTuple?.[1] === 'string' ? attrTuple[1] : undefined
      if (attrName && attrName.toLowerCase() === 'color') {
        colorLine = line
        break
      }
    }

    // If no explicit 'Color' name on tuple, fall back: pick first line whose values have html_color
    if (!colorLine) {
      for (const line of attrLines || []) {
        const vals = Array.isArray(line.value_ids) ? line.value_ids : []
        const hasColor = vals.some((vid: number) => {
          const v = (attributeValues || []).find((x: any) => x.id === vid)
          return v && typeof v.html_color === 'string' && v.html_color.trim() !== ''
        })
        if (hasColor) { colorLine = line; break }
      }
    }

    const list: Array<{ id: number; name: string; html_color: string }> = []
    if (colorLine) {
      const valueIds = Array.isArray(colorLine.value_ids) ? colorLine.value_ids : []
      for (const vid of valueIds) {
        const v = (attributeValues || []).find((x: any) => x.id === vid)
        if (v && typeof v.html_color === 'string' && v.html_color.trim() !== '') {
          list.push({ id: v.id, name: v.name, html_color: v.html_color })
        }
      }
    }
    setColorValues(list)
    if (selectedColorValueId && !list.some((v) => v.id === selectedColorValueId)) {
      setSelectedColorValueId(null)
    }
  }, [attrLines, attributeValues])

  const addPurchaseRecord = () => {
    const newRecord: PurchaseRecord = {
      id: Date.now().toString(),
      vendor: "",
      quantity: 0,
      price: 0,
      currency: "USD",
      delivery: 0,
    }
    setPurchaseRecords([...purchaseRecords, newRecord])
  }

  // Generate barcode image URL
  const generateBarcodeUrl = (code: string) => {
    if (!code) return null
    // Using a simple barcode generator service - in production, use a proper barcode library
    return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(code)}&code=Code128&translate-esc=on`
  }

  const updatePurchaseRecord = (id: string, field: keyof PurchaseRecord, value: string | number) => {
    setPurchaseRecords(purchaseRecords.map((record) => (record.id === id ? { ...record, [field]: value } : record)))
  }

  const removePurchaseRecord = (id: string) => {
    if (purchaseRecords.length > 1) {
      setPurchaseRecords(purchaseRecords.filter((record) => record.id !== id))
    }
  }

  // Fetch taxes and categories
  useEffect(() => {
    const fetchAll = async () => {
      try {
        if (!sessionId) return
        const [taxRes, catRes] = await Promise.all([
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/account-taxes`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getOdooHeaders() },
            body: JSON.stringify({ sessionId }),
          }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/categories`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getOdooHeaders() },
            body: JSON.stringify({ sessionId }),
          }),
        ])
        const taxJson = await taxRes.json()
        const catJson = await catRes.json()
        const taxes = (taxJson?.taxes || []).map((t: any) => ({ id: t.id, name: t.name }))
        const cats = (catJson?.categories || []).map((c: any) => ({ id: c.id, name: c.name }))
        setTaxOptions(taxes)
        setCategories(cats)
      } catch (e) {
        console.error("VariantModal fetch error", e)
      }
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Fetch data for Point of Sale, Purchase, and Operations tabs
  useEffect(() => {
    const fetchRefs = async () => {
      try {
        if (!sessionId) return
        const [posRes, partnersRes, currenciesRes, uomRes, countriesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/pos-categories`, { method: "POST", headers: { "Content-Type": "application/json", ...getOdooHeaders() }, body: JSON.stringify({ sessionId }) }),
          fetch(`${API_BASE_URL}/partners`, { method: "POST", headers: { "Content-Type": "application/json", ...getOdooHeaders() }, body: JSON.stringify({ sessionId }) }),
          fetch(`${API_BASE_URL}/currencies`, { method: "POST", headers: { "Content-Type": "application/json", ...getOdooHeaders() }, body: JSON.stringify({ sessionId }) }),
          fetch(`${API_BASE_URL}/uom`, { method: "POST", headers: { "Content-Type": "application/json", ...getOdooHeaders() }, body: JSON.stringify({ sessionId }) }),
          fetch(`${API_BASE_URL}/countries`, { method: "POST", headers: { "Content-Type": "application/json", ...getOdooHeaders() }, body: JSON.stringify({ sessionId }) }),
        ])
        const [posJ, partnersJ, currenciesJ, uomJ, countriesJ] = await Promise.all([
          posRes.json(), partnersRes.json(), currenciesRes.json(), uomRes.json(), countriesRes.json(),
        ])
        const posList = (posJ?.posCategories || []).map((c: any) => ({ id: c.id, name: c.name, color: c.color }))
        setPosCategories(posList)
        setPartners((partnersJ?.partners || []).map((p: any) => ({ id: p.id, name: p.name })))
        setCurrencies((currenciesJ?.currencies || []).map((c: any) => ({ id: c.id, name: c.name })))
        setUoms((uomJ?.uom || []).map((u: any) => ({ id: u.id, name: u.name })))
        setCountries((countriesJ?.countries || []).map((c: any) => ({ id: c.id, name: c.name })))
      } catch (e) {
        console.error("VariantModal refs fetch error", e)
      }
    }
    fetchRefs()
  }, [sessionId])

  // Re-fetch refs when switching to Purchase tab to guarantee dropdowns are populated
  useEffect(() => {
    const fetchPurchaseRefs = async () => {
      try {
        if (!sessionId || activeTab !== 'purchase') return
        const [partnersRes, currenciesRes, uomRes] = await Promise.all([
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/partners`, { method: "POST", headers: { "Content-Type": "application/json", ...getOdooHeaders() }, body: JSON.stringify({ sessionId }) }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/currencies`, { method: "POST", headers: { "Content-Type": "application/json", ...getOdooHeaders() }, body: JSON.stringify({ sessionId }) }),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/uom`, { method: "POST", headers: { "Content-Type": "application/json", ...getOdooHeaders() }, body: JSON.stringify({ sessionId }) }),
        ])
        const [partnersJ, currenciesJ, uomJ] = await Promise.all([partnersRes.json(), currenciesRes.json(), uomRes.json()])
        setPartners((partnersJ?.partners || []).map((p: any) => ({ id: p.id, name: p.name })))
        setCurrencies((currenciesJ?.currencies || []).map((c: any) => ({ id: c.id, name: c.name })))
        setUoms((uomJ?.uom || []).map((u: any) => ({ id: u.id, name: u.name })))
      } catch (e) {
        console.error('Purchase refs fetch error', e)
      }
    }
    fetchPurchaseRefs()
  }, [activeTab, sessionId])

  // Read variant's uom (product.product.uom_id) to prefill Purchase Unit
  useEffect(() => {
    const loadVariantUom = async () => {
      try {
        if (!sessionId || !product?.id) return
        const resp = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/products-single/${product.id}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...getOdooHeaders() }, body: JSON.stringify({ sessionId })
        })
        const js = await resp.json()
        const rec = Array.isArray(js?.products) ? js.products[0] : null
        if (rec && Array.isArray(rec.uom_id)) setPurchaseUnitId(rec.uom_id[0])
      } catch {}
    }
    loadVariantUom()
  }, [sessionId, product?.id])

  // Load product.supplierinfo for this product variant (by product_id)
  useEffect(() => {
    const loadSupplierinfo = async () => {
      try {
        if (!sessionId || !product?.id) return
        setVendorLoading(true)
        const resp = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/supplierinfo`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...getOdooHeaders() }, body: JSON.stringify({ sessionId, product_id: product.id, product_tmpl_id: templateId })
        })
        const js = await resp.json()
        const serverLines: VendorLine[] = (js?.supplierinfo || []).map((si: any) => ({
          id: String(si.id),
          serverId: si.id,
          vendorId: Array.isArray(si.partner_id) ? si.partner_id[0] : si.partner_id || null,
          quantity: Number(si.min_qty ?? 0),
          price: Number(si.price ?? 0),
          currencyId: Array.isArray(si.currency_id) ? si.currency_id[0] : si.currency_id || null,
          delay: Number(si.delay ?? 0)
        }))
        setVendorLines((prev) => {
          const unsaved = (prev || []).filter((l:any) => !l.serverId)
          return [...serverLines, ...unsaved]
        })
        setVendorDirty((prev) => prev && true)
      } catch (e) { console.error('Load supplierinfo error', e) }
      finally { setVendorLoading(false) }
    }
    loadSupplierinfo()
  }, [sessionId, product?.id])

  // Fetch products for Sales tab selectors
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (!sessionId) return
        const resp = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/products-single/all`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getOdooHeaders() },
          body: JSON.stringify({ sessionId }),
        })
        const data = await resp.json()
        const list = (data?.products || []).map((p: any) => ({ id: p.id, name: p.name, image_512: p.image_512 }))
        setAllProducts(list)
      } catch (e) {
        console.error("Fetch products error", e)
      }
    }
    fetchProducts()
  }, [sessionId])

  // Only ensure templateId exists (for supplierinfo). No template fetch/prefill.
  useEffect(() => {
    const ensureTemplateId = async () => {
      try {
        if (!sessionId || templateId) return
        const resp = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/products-single/${product.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getOdooHeaders() },
          body: JSON.stringify({ sessionId }),
        })
        const pj = await resp.json()
        const p = pj?.products?.[0]
        const tmplId = p?.product_tmpl_id?.[0] || null
        setTemplateId(tmplId)
      } catch (e) {
        console.error('Ensure templateId error', e)
      }
    }
    ensureTemplateId()
  }, [sessionId, product.id, templateId])

  // Prevent background scrolling when modal is open
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

  const setDirtyTrue = () => !dirty && setDirty(true)

  const mapProductType = (label: string) => (label === "Goods" ? "consu" : label === "Service" ? "service" : "bundle")
  const mapInvoicePolicy = (label: string) => (label.toLowerCase().startsWith("delivered") ? "delivery" : "order")
  const mapTracking = (label: string) =>
    label === "By lots" ? "lot" : label === "By Unique Serial Number" ? "serial" : "quantity"

  const handleSave = async () => {
    try {
      if (!sessionId) return
      // 1) Update variant-only fields on product.product
      const variantValues: any = {
        default_code: internalRef,
        barcode,
        name: productName,
        ...(imageBase64 ? { image_512: imageBase64 } : {}),
        tracking: trackInventory ? mapTracking(inventoryTracking) : "none",
      }
      const resp1 = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/products-single/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getOdooHeaders() },
        body: JSON.stringify({ sessionId, userId: partnerId ? Number(partnerId) : undefined, values: variantValues }),
      })
      const j1 = await resp1.json()
      if (!resp1.ok || !j1?.success) {
        const msg = (j1?.error?.data?.arguments && j1.error.data.arguments[0]) || j1?.message || "Save failed"
        setToast({ text: String(msg), state: "error" })
        return
      }

      // 2) Skip product.template updates; only operate on product.product

      // 3) Create new vendor lines (product.supplierinfo) for those without serverId
      if (!templateId) throw new Error("Missing product template id")
      const newLines = (vendorLines || []).filter((ln) => !ln.serverId && ln.vendorId && ln.price !== "")
      if (newLines.length) {
        const userId = partnerId ? Number(partnerId) : undefined
        const vendorLineResults = await Promise.allSettled(newLines.map(async (ln) => {
          const payload: any = {
            product_tmpl_id: templateId,
            partner_id: ln.vendorId!,
            min_qty: Number(ln.quantity || 0),
            price: Number(ln.price || 0),
            currency_id: ln.currencyId || false,
            delay: ln.delay === "" || typeof ln.delay === 'undefined' ? 0 : Number(ln.delay),
          }
          const resp = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/supplierinfo/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getOdooHeaders() },
            body: JSON.stringify({ sessionId, values: payload, userId }),
          })
          const json = await resp.json()
          if (!resp.ok || !json?.success) {
            throw new Error(json?.message || "Failed to create vendor line")
          }
          return json
        }))
        
        // Check if any vendor line creation failed
        const failedVendorLines = vendorLineResults.filter(r => r.status === 'rejected')
        if (failedVendorLines.length > 0) {
          const firstFailure = failedVendorLines[0]
          const errorMsg = firstFailure.status === 'rejected' && firstFailure.reason instanceof Error
            ? firstFailure.reason.message
            : "Some vendor lines could not be created"
          setToast({ text: String(errorMsg), state: "error" })
          return
        }
      }

      // All operations succeeded - show success toast and close
      if (resp1.ok && j1.success) {
        setToast({ text: t("Product updated successfully"), state: "success" })
        setDirty(false)
        // Delay closing to show the success toast
        setTimeout(() => {
          onClose()
        }, 500)
      }
    } catch (e) {
      console.error("Save product error", e)
      const msg = (e as any)?.message || "Save failed"
      setToast({ text: String(msg), state: "error" })
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        [isRTL ? "marginRight" : "marginLeft"]: isCollapsed ? "5rem" : "16rem",
        background: "rgba(0,0,0,0.4)",
        transition: "margin 0.3s ease",
      }}
    >
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b bg-white"
        style={{ borderColor: colors.border, background: `${colors.background}` }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg hover:shadow-sm transition-all"
            style={{ color: colors.textPrimary, background: colors.mutedBg }}
            onMouseEnter={(e) => (e.currentTarget.style.background = colors.border)}
            onMouseLeave={(e) => (e.currentTarget.style.background = colors.mutedBg)}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("Back")}</span>
          </button>
          <div className="h-6 w-px" style={{ background: colors.border }}></div>
          {!editingName ? (
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                {productName}
              </h1>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="p-1 rounded hover:opacity-80"
                style={{ color: colors.textSecondary }}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CustomInput
                label=""
                type="text"
                value={productName}
                onChange={(val) => {
                  setProductName(val)
                  setDirtyTrue()
                }}
                placeholder={t("Product Name")}
              />
              <button
                type="button"
                onClick={() => setEditingName(false)}
                className="px-2 py-1 rounded text-sm"
                style={{ background: colors.action, color: '#fff' }}
              >
                {t('Save')}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty}
          className={gradientButtonClasses}
          style={{ opacity: dirty ? 1 : 0.5, cursor: dirty ? "pointer" : "not-allowed" }}
        >
          {t("Save Changes")}
        </button>
      </div>

      <div className="flex h-full" style={{ background: colors.background, }}>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="border-b" style={{ borderColor: colors.border, background: colors.card, }}>
            <nav className="flex px-8 gap-1">
              {[
                { id: "general", label: t("General") },
                { id: "sales", label: t("Sales") },
                { id: "pos", label: t("Point of Sale") },
                { id: "purchase", label: t("Purchase") },
                { id: "operations", label: t("Operations") },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-4 py-3 text-sm font-medium border-b-2 transition-all"
                  style={{
                    borderColor: activeTab === tab.id ? colors.action : "transparent",
                    color: activeTab === tab.id ? colors.textPrimary : colors.textSecondary,
                    background: activeTab === tab.id ? colors.mutedBg : "transparent",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 mb-10">
            {/* General Information Tab */}
            {activeTab === "general" && (
              <div className="space-y-6 max-w-4xl">
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="rounded-xl p-5 border"
                    style={{ background: colors.card, borderColor: colors.border }}
                  >
                    <h3 className="text-sm font-semibold mb-4" style={{ color: colors.textPrimary }}>
                      {t("Sales Information")}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                          {t("Sales Price")}
                        </label>
                        <CustomInput
                          label=""
                          type="number"
                          value={String(salesPrice)}
                          onChange={(val) => {
                            setSalesPrice(val === '' ? 0 : Number(val))
                            setDirtyTrue()
                          }}
                          placeholder={t("Sales Price")}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                          {t("Sales Tax")}
                        </label>
                        <TokenMultiSelect
                          options={taxOptions}
                          values={selectedSalesTaxIds}
                          onChange={(ids) => {
                            setSelectedSalesTaxIds(ids)
                            setDirtyTrue()
                          }}
                          placeholder={t("Select taxes")}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-5 border"
                    style={{ background: colors.card, borderColor: colors.border }}
                  >
                    <h3 className="text-sm font-semibold mb-4" style={{ color: colors.textPrimary }}>
                      {t("Purchase Information")}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                          {t("Cost")}
                        </label>
                        <CustomInput
                          label=""
                          type="number"
                          value={String(cost)}
                          onChange={(val) => {
                            setCost(val === '' ? 0 : Number(val))
                            setDirtyTrue()
                          }}
                          placeholder={t("Cost")}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                          {t("Purchase Tax")}
                        </label>
                        <TokenMultiSelect
                          options={taxOptions}
                          values={selectedPurchaseTaxIds}
                          onChange={(ids) => {
                            setSelectedPurchaseTaxIds(ids)
                            setDirtyTrue()
                          }}
                          placeholder={t("Select taxes")}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-5 border" style={{ background: colors.card, borderColor: colors.border }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: colors.textPrimary }}>
                    {t("Product Details")}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                        {t("Product Type")}
                      </label>
                      <NewCustomDropdown
                        key={`ptype-${selectedProductType}`}
                        label=""
                        values={productTypes}
                        type="single"
                        defaultValue={selectedProductType || t("Select")}
                        onChange={(selected) => {
                          setSelectedProductType(String(selected))
                          setDirtyTrue()
                        }}
                        placeholder={t("Select type")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                        {t("Category")}
                      </label>
                      <NewCustomDropdown
                        key={`cat-${categoryId ?? 'none'}`}
                        label=""
                        values={categories.map((c) => c.name)}
                        type="single"
                        defaultValue={categories.find((c) => c.id === categoryId)?.name || t("Select")}
                        onChange={(selected) => {
                          const name = String(selected)
                          const c = categories.find((x) => x.name === name)
                          setCategoryId(c ? c.id : 0)
                          setDirtyTrue()
                        }}
                        placeholder={t("Select category")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                        {t("Internal Reference")}
                      </label>
                      <CustomInput
                        label=""
                        type="text"
                        value={internalRef}
                        onChange={(val) => {
                          setInternalRef(val)
                          setDirtyTrue()
                        }}
                        placeholder={t("Internal Reference")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                        {t("Barcode")}
                      </label>
                      <CustomInput
                        label=""
                        type="text"
                        value={barcode}
                        onChange={(val) => {
                          setBarcode(val)
                          setDirtyTrue()
                        }}
                        placeholder={t("Enter barcode")}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                        {t("Invoicing Policy")}
                      </label>
                      <NewCustomDropdown
                        key={`invpol-${invoicePolicy}`}
                        label=""
                        values={invoicePolicies}
                        type="single"
                        defaultValue={invoicePolicy || t("Select")}
                        onChange={(selected) => {
                          setInvoicePolicy(String(selected))
                          setDirtyTrue()
                        }}
                        placeholder={t("Select policy")}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-5 border" style={{ background: colors.card, borderColor: colors.border }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: colors.textPrimary }}>
                    {t("Inventory & Operations")}
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <CustomCheckbox
                        checked={trackInventory}
                        onChange={(v) => {
                          setTrackInventory(v)
                          setDirtyTrue()
                        }}
                        label={t("Track Inventory")}
                      />
                      {trackInventory && (
                        <div className="flex-1 max-w-xs">
                          <NewCustomDropdown
                            key={`invtrack-${inventoryTracking}`}
                            label=""
                            values={["By quantity", "By lots", "By Unique Serial Number"]}
                            type="single"
                            defaultValue={inventoryTracking || t("Select")}
                            onChange={(selected) => {
                              setInventoryTracking(String(selected))
                              setDirtyTrue()
                            }}
                            placeholder={t("Tracking method")}
                          />
                        </div>
                      )}
                    </div>
                    <CustomCheckbox
                      checked={createRepair}
                      onChange={(v) => {
                        setCreateRepair(v)
                        setDirtyTrue()
                      }}
                      label={t("Can be Repaired")}
                    />
                  </div>
                </div>

                <div className="rounded-xl p-5 border" style={{ background: colors.card, borderColor: colors.border }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: colors.textPrimary }}>
                    {t("Internal Notes")}
                  </h3>
                  <CustomTextarea
                    value={internalNotes}
                    onChange={(v) => {
                      setInternalNotes(v)
                      setDirtyTrue()
                    }}
                    placeholder={t("Add internal notes about this product...")}
                    minRows={4}
                    maxRows={8}
                  />
                </div>
              </div>
            )}

            {/* Sales tab (existing UI is elsewhere in file) */}

            {/* Point of Sale Tab */}
            {activeTab === "pos" && (
              <div className="space-y-6 max-w-3xl">
                <div className="rounded-xl p-5 border" style={{ background: colors.card, borderColor: colors.border }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: colors.textPrimary }}>
                    {t("Point of Sale Settings")}
                  </h3>
                  <div className="space-y-4">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={weighWithScale} onChange={(e) => { setWeighWithScale(e.target.checked); setDirtyTrue() }} />
                      <span style={{ color: colors.textPrimary }}>{t("To weigh with scale")}</span>
                    </label>

                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                        {t("Category")}
                      </label>
                      <NewCustomDropdown
                        key={`poscat-${selectedPosCategoryId ?? 'none'}`}
                        label=""
                        values={posCategories.map((c) => c.name)}
                        type="single"
                        defaultValue={posCategories.find((c) => c.id === selectedPosCategoryId)?.name || t("Select")}
                        onChange={(selected) => {
                          const name = String(selected)
                          const c = posCategories.find((x) => x.name === name)
                          setSelectedPosCategoryId(c ? c.id : null)
                          setDirtyTrue()
                        }}
                        placeholder={t("Select POS category")}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
                        {t("Color")}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {colorValues.map((v) => (
                          <button
                            type="button"
                            key={v.id}
                            onClick={() => { setSelectedColorValueId(v.id); setDirtyTrue() }}
                            className={`w-8 h-8 rounded-md border ${selectedColorValueId === v.id ? 'ring-2 ring-offset-2' : ''}`}
                            style={{ background: v.html_color, borderColor: colors.border }}
                            title={v.name}
                          />
                        ))}
                        {colorValues.length === 0 && (
                          <span className="text-sm" style={{ color: colors.textSecondary }}>
                            {t("No colors available")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Tab */}
            {activeTab === "purchase" && (
              <div className="space-y-6 max-w-5xl overflow-y-auto">
                <div className="rounded-xl p-5 border" style={{ background: colors.card, borderColor: colors.border }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                      {t("Vendors")}
                    </h3>
                    <button onClick={() => { setVendorLines((prev) => [...prev, { id: Date.now().toString(), vendorId: null, quantity: "", price: "", currencyId: null, delay: "" }]); setVendorDirty(true) }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ background: colors.mutedBg, color: colors.textPrimary }}>
                      <Plus className="w-4 h-4" /> {t("Add line")}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '37%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '4%' }} />
                      </colgroup>
                      <thead>
                        <tr style={{ color: colors.textSecondary }}>
                          <th className="text-left py-1">{t("Vendor")}</th>
                          <th className="text-left py-1">{t("Quantity")}</th>
                          <th className="text-left py-1">{t("Price")}</th>
                          <th className="text-left py-1">{t("Currency")}</th>
                          <th className="text-left py-1">{t("Delivery")}</th>
                          <th className="py-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {!vendorLoading && vendorLines.map((line) => (
                          <tr key={line.id}>
                            <td className="py-1 pr-2" style={{ overflow: 'visible', position: 'relative' }}>
                              <NewCustomDropdown
                                key={`vendor-${line.id}-${line.vendorId ?? 'none'}`}
                                label=""
                                values={partners.map((p) => p.name)}
                                type="single"
                                defaultValue={partners.find((p) => p.id === line.vendorId)?.name || t("Select")}
                                onChange={(selected) => {
                                  const name = String(selected)
                                  const v = partners.find((x) => x.name === name)
                                  setVendorLines((prev) => prev.map((L) => (L.id === line.id ? { ...L, vendorId: v ? v.id : null, _changed: true } as any : L)))
                                  setDirtyTrue(); setVendorDirty(true)
                                }}
                                placeholder={t("Select vendor")}
                              />
                            </td>
                            <td className="py-1 pr-2" style={{ overflow: 'visible' }}>
                              <CustomInput
                                label=""
                                type="number"
                                value={line.quantity === '' ? '' : String(line.quantity)}
                                onChange={(val) => {
                                  const num = val === '' ? '' : Number(val)
                                  setVendorLines((prev) => prev.map((L) => (L.id === line.id ? { ...L, quantity: num, _changed: true } as any : L)))
                                  setDirtyTrue(); setVendorDirty(true)
                                }}
                                placeholder={t("Quantity")}
                              />
                            </td>
                            <td className="py-1 pr-2" style={{ overflow: 'visible' }}>
                              <CustomInput
                                label=""
                                type="number"
                                value={line.price === '' ? '' : String(line.price)}
                                onChange={(val) => {
                                  const num = val === '' ? '' : Number(val)
                                  setVendorLines((prev) => prev.map((L) => (L.id === line.id ? { ...L, price: num, _changed: true } as any : L)))
                                  setDirtyTrue(); setVendorDirty(true)
                                }}
                                placeholder={t("Price")}
                              />
                            </td>
                            <td className="py-1 pr-2" style={{ overflow: 'visible' }}>
                              <NewCustomDropdown
                                key={`currency-${line.id}-${line.currencyId ?? 'none'}`}
                                label=""
                                values={currencies.map((c) => c.name)}
                                type="single"
                                defaultValue={currencies.find((c) => c.id === line.currencyId)?.name || t("Select")}
                                onChange={(selected) => {
                                  const name = String(selected)
                                  const c = currencies.find((x) => x.name === name)
                                  setVendorLines((prev) => prev.map((L) => (L.id === line.id ? { ...L, currencyId: c ? c.id : null, _changed: true } as any : L)))
                                  setDirtyTrue(); setVendorDirty(true)
                                }}
                                placeholder={t("Select currency")}
                              />
                            </td>
                            <td className="py-1 pr-2">
                              <CustomInput
                                label=""
                                type="number"
                                value={line.delay === '' ? '' : String(line.delay)}
                                onChange={(val) => {
                                  const num = val === '' ? '' : Number(val)
                                  setVendorLines((prev) => prev.map((L) => (L.id === line.id ? { ...L, delay: num, _changed: true } as any : L)))
                                  setDirtyTrue(); setVendorDirty(true)
                                }}
                                placeholder={t("Delivery")}
                              />
                            </td>
                            <td className="py-1">
                              <button onClick={() => { setVendorLines((prev) => prev.filter((L) => L.id !== line.id)); setVendorDirty(true) }} className="px-2 py-1 rounded" style={{ color: colors.textSecondary, display:'inline-flex', alignItems:'center', gap:4 }}>
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end mt-3 gap-2">
                    <button
                      onClick={async () => {
                        try {
                          if (!sessionId || !product?.id) return
                          setVendorLoading(true)
                          const resp = await fetch(`${API_BASE_URL}/api/supplierinfo`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sessionId, product_id: product.id, product_tmpl_id: templateId }) })
                          const js = await resp.json()
                          const serverLines: VendorLine[] = (js?.supplierinfo || []).map((si: any) => ({ id: String(si.id), serverId: si.id, vendorId: Array.isArray(si.partner_id)? si.partner_id[0]: si.partner_id||null, quantity: Number(si.min_qty??0), price: Number(si.price??0), currencyId: Array.isArray(si.currency_id)? si.currency_id[0]: si.currency_id||null, delay: Number(si.delay??0) }))
                          setVendorLines((prev) => {
                            const unsaved = (prev || []).filter((l:any) => !l.serverId)
                            return [...serverLines, ...unsaved]
                          })
                        } catch (e) { console.error('Refresh supplierinfo error', e) }
                        finally { setVendorLoading(false) }
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                      style={{ border: `1px solid ${colors.border}`, background: colors.card, color: colors.textPrimary }}
                    >
                      {t('Refresh')}
                    </button>

                    {!vendorLoading && vendorDirty && (
                      <button
                        onClick={async () => {
                          try {
                            if (!sessionId || !product?.id) return
                            // Create new supplierinfo
                            const toCreate = vendorLines.filter((l:any) => !l.serverId && l.vendorId && l.price !== '')
                            await Promise.all(toCreate.map(async (ln:any) => {
                              const values:any = { partner_id: ln.vendorId, product_id: product.id, min_qty: Number(ln.quantity||0), price: Number(ln.price||0), currency_id: ln.currencyId||false, delay: ln.delay === '' ? 0 : Number(ln.delay||0) }
                              await fetch(`${API_BASE_URL}/api/supplierinfo/create`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sessionId, values }) })
                            }))
                            // Update existing supplierinfo
                            const toUpdate = vendorLines.filter((l:any) => l.serverId && l._changed)
                            await Promise.all(toUpdate.map(async (ln:any) => {
                              const values:any = { }
                              if (ln.vendorId != null) values.partner_id = ln.vendorId
                              if (ln.quantity !== '') values.min_qty = Number(ln.quantity||0)
                              if (ln.price !== '') values.price = Number(ln.price||0)
                              if (ln.currencyId != null) values.currency_id = ln.currencyId || false
                              if (ln.delay !== '') values.delay = Number(ln.delay||0)
                              const userId = partnerId ? Number(partnerId) : undefined
                              await fetch(`${API_CONFIG.BACKEND_BASE_URL}/supplierinfo/${ln.serverId}`, { method:'PUT', headers:{'Content-Type':'application/json', ...getOdooHeaders() }, body: JSON.stringify({ sessionId, values, userId }) })
                            }))
                            // Reload
                            const resp2 = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/supplierinfo`, { method:'POST', headers:{'Content-Type':'application/json', ...getOdooHeaders() }, body: JSON.stringify({ sessionId, product_id: product.id, product_tmpl_id: templateId }) })
                            const js2 = await resp2.json()
                            const lines2: VendorLine[] = (js2?.supplierinfo || []).map((si: any) => ({ id: String(si.id), serverId: si.id, vendorId: Array.isArray(si.partner_id)? si.partner_id[0]: si.partner_id||null, quantity: Number(si.min_qty??0), price: Number(si.price??0), currencyId: Array.isArray(si.currency_id)? si.currency_id[0]: si.currency_id||null, delay: Number(si.delay??0) }))
                            setVendorLines(lines2)
                            setVendorDirty(false)
                            setToast({ text: t('Vendors updated'), state: 'success' })
                          } catch (e) {
                            console.error(e)
                            setToast({ text: t('Failed to update vendors'), state: 'error' })
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                        style={{ background: colors.action, color: '#fff' }}
                      >
                        {t('Save')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl p-5 border" style={{ background: colors.card, borderColor: colors.border }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: colors.textPrimary }}>
                    {t("Vendor Bills")}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 max-w-4xl">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t("Purchase Unit")}</label>
                      <CustomDropdown
                        options={uoms.map((u) => u.name)}
                        value={uoms.find((u) => u.id === purchaseUnitId)?.name || ""}
                        onChange={(name) => { const u = uoms.find((x) => x.name === name); setPurchaseUnitId(u ? u.id : null); setDirtyTrue() }}
                        placeholder={t("Select unit")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t("Control policy")}</label>
                      <CustomDropdown
                        options={["On ordered quantity", "On received quantity"]}
                        value={controlPolicy}
                        onChange={(v) => { setControlPolicy(v); setDirtyTrue() }}
                        placeholder={t("Select policy")}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t("Purchase Description")}</label>
                      <textarea value={purchaseDescription} onChange={(e) => { setPurchaseDescription(e.target.value); setDirtyTrue() }} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${colors.border}`, background: colors.background, color: colors.textPrimary }} rows={3} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t("Warning when Purchasing this Product")}</label>
                      <div className="grid grid-cols-2 gap-3">
                        <CustomDropdown
                          options={["None", "Warning", "Blocking Message"]}
                          value={purchaseWarningType}
                          onChange={(v) => { setPurchaseWarningType(v); setDirtyTrue() }}
                          placeholder={t("Select type")}
                        />
                        {purchaseWarningType !== "None" && (
                          <textarea value={purchaseWarningMessage} onChange={(e) => { setPurchaseWarningMessage(e.target.value); setDirtyTrue() }} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${colors.border}`, background: colors.background, color: colors.textPrimary }} rows={2} placeholder={t("Enter message")} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Operations Tab */}
            {activeTab === "operations" && (
              <div className="space-y-6 max-w-4xl">
                <div className="rounded-xl p-5 border" style={{ background: colors.card, borderColor: colors.border }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: colors.textPrimary }}>
                    {t("Routes")}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                        {t("Routes")}
                      </label>
                      <TokenMultiSelect
                        options={(stockRoutes || []).map((r: any) => ({ id: r.id, name: r.name }))}
                        values={selectedRouteIds}
                        onChange={(ids) => { setSelectedRouteIds(ids); setDirtyTrue() }}
                        placeholder={t("Select routes")}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-5 border" style={{ background: colors.card, borderColor: colors.border }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: colors.textPrimary }}>
                    {t("Logistics")}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t("Weight")}</label>
                      <div className="flex items-center gap-2">
                        <CustomInput label="" type="number" value={weight} onChange={(val) => { setWeight(val); setDirtyTrue() }} placeholder={t("Weight")} />
                        <span style={{ color: colors.textSecondary }}>kg</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t("Volume")}</label>
                      <div className="flex items-center gap-2">
                        <CustomInput label="" type="number" value={volume} onChange={(val) => { setVolume(val); setDirtyTrue() }} placeholder={t("Volume")} />
                        <span style={{ color: colors.textSecondary }}>m³</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t("Customer Lead Time")}</label>
                      <div className="flex items-center gap-2">
                        <CustomInput label="" type="number" value={leadTimeDays} onChange={(val) => { setLeadTimeDays(val); setDirtyTrue() }} placeholder={t("Customer Lead Time")} />
                        <span style={{ color: colors.textSecondary }}>{t("days")}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t("HS code")}</label>
                      <CustomInput label="" type="text" value={hsCode} onChange={(val) => { setHsCode(val); setDirtyTrue() }} placeholder={t("HS code")} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t("Origin of good")}</label>
                      <NewCustomDropdown
                        key={`origin-${originCountryId ?? 'none'}`}
                        label=""
                        values={countries.map((c) => c.name)}
                        type="single"
                        defaultValue={countries.find((c) => c.id === originCountryId)?.name || t("Select")}
                        onChange={(selected) => {
                          const name = String(selected)
                          const c = countries.find((x) => x.name === name)
                          setOriginCountryId(c ? c.id : null)
                          setDirtyTrue()
                        }}
                        placeholder={t("Select country")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sales Tab */}
            {activeTab === "sales" && (
              <div className="space-y-6 max-w-4xl">
                <div className="rounded-xl p-5 border" style={{ background: colors.card, borderColor: colors.border }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: colors.textPrimary }}>
                    {t("Upsell & Cross-Sell")}
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                        {t("Optional Products")}
                      </label>
                      <ProductMultiSelect
                        options={allProducts}
                        values={optionalProductIds}
                        onChange={(ids) => {
                          setOptionalProductIds(ids)
                          setDirtyTrue()
                        }}
                        placeholder={t("Select")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                        {t("Accessories")}
                      </label>
                      <ProductMultiSelect
                        options={allProducts}
                        values={accessoryProductIds}
                        onChange={(ids) => {
                          setAccessoryProductIds(ids)
                          setDirtyTrue()
                        }}
                        placeholder={t("Select")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                        {t("Alternatives")}
                      </label>
                      <ProductMultiSelect
                        options={allProducts}
                        values={alternativeProductIds}
                        onChange={(ids) => {
                          setAlternativeProductIds(ids)
                          setDirtyTrue()
                        }}
                        placeholder={t("Select")}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-5 border" style={{ background: colors.card, borderColor: colors.border }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: colors.textPrimary }}>
                    {t("Ecommerce Settings")}
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                          {t("Tags")}
                        </label>
                        <NewCustomDropdown label="" values={[]} type="single" defaultValue={t("Select")} onChange={() => {}} placeholder={t("Select tags")} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                          {t("Website")}
                        </label>
                        <NewCustomDropdown label="" values={[]} type="single" defaultValue={t("Select")} onChange={() => {}} placeholder={t("Select website")} />
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <CustomCheckbox checked={isPublished} onChange={setIsPublished} label={t("Published")} />
                      <CustomCheckbox checked={outOfStock} onChange={setOutOfStock} label={t("Out of Stock")} />
                      <CustomCheckbox
                        checked={showAvailableQuantity}
                        onChange={setShowAvailableQuantity}
                        label={t("Show Quantity")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <CustomTextarea
                        value={quotationDescription}
                        onChange={setQuotationDescription}
                        label={t("Quotation Description")}
                        placeholder={t("Description for quotes...")}
                        minRows={3}
                        maxRows={6}
                      />
                      <CustomTextarea
                        value={ecommerceDescription}
                        onChange={setEcommerceDescription}
                        label={t("Ecommerce Description")}
                        placeholder={t("Description for online store...")}
                        minRows={3}
                        maxRows={6}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-80 border-l overflow-y-auto" style={{ background: colors.card, borderColor: colors.border }}>
          <div className="p-6 sticky top-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: colors.textSecondary }}>
              {t("Product Preview")}
            </h3>

            {/* Product Image */}
            <div
              className="w-full aspect-square rounded-xl mb-4 flex items-center justify-center overflow-hidden border cursor-pointer"
              style={{ background: colors.background, borderColor: colors.border }}
              onClick={() => fileInputRef.current?.click()}
              title={t('Click to upload image')}
            >
              {imageBase64 ? (
                <img
                  src={`data:image/webp;base64,${imageBase64}`}
                  alt={productName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6">
                  <Upload className="w-12 h-12 mx-auto mb-2" style={{ color: colors.textSecondary, opacity: 0.3 }} />
                  <p className="text-xs" style={{ color: colors.textSecondary, opacity: 0.6 }}>
                    {t("No image")}
                  </p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Product Info */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>
                  {t("Product Name")}
                </p>
                <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                  {productName}
                </p>
              </div>

              {barcode && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
                    {t("Barcode")}
                  </p>
                  <div
                    className="rounded-lg p-3 flex items-center justify-center"
                    style={{ background: colors.background }}
                  >
                    {generateBarcodeUrl(barcode) && (
                      <img
                        src={generateBarcodeUrl(barcode)! || "/placeholder.svg"}
                        alt={`Barcode: ${barcode}`}
                        className="h-12 object-contain"
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t" style={{ borderColor: colors.border }}>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-medium mb-1" style={{ color: colors.textSecondary }}>
                      {t("Available")}
                    </p>
                    <p className="font-semibold" style={{ color: colors.textPrimary }}>
                      {product.qty_available}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium mb-1" style={{ color: colors.textSecondary }}>
                      {t("Forecasted")}
                    </p>
                    <p className="font-semibold" style={{ color: colors.textPrimary }}>
                      {product.virtual_available}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t" style={{ borderColor: colors.border }}>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: colors.textSecondary }}>{t("Sales Price")}</span>
                    <span className="font-semibold" style={{ color: colors.textPrimary }}>
                      ${salesPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: colors.textSecondary }}>{t("Cost")}</span>
                    <span className="font-semibold" style={{ color: colors.textPrimary }}>
                      ${cost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t" style={{ borderColor: colors.border }}>
                    <span className="font-medium" style={{ color: colors.textSecondary }}>
                      {t("Margin")}
                    </span>
                    <span className="font-bold" style={{ color: colors.action }}>
                      ${(salesPrice - cost).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {toast && (
        <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
