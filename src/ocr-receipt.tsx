("use client")

import { useState, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/theme"
import { useAuth } from "../context/auth"
import { useData } from "../context/data"
import { API_CONFIG } from "./config/api"
import {
  Upload,
  FileText,
  Image,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Calendar,
  Receipt,
  Package,
  DollarSign,
  ChevronRight,
  Edit2,
  Search,
  Plus,
  X,
  Eye,
  RefreshCcw
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../@/components/ui/card"
import { Button } from "../@/components/ui/button"
import { Input } from "../@/components/ui/input"
import { Label } from "../@/components/ui/label"
import { Textarea } from "../@/components/ui/textarea"
import { Badge } from "../@/components/ui/badge"
import { Separator } from "../@/components/ui/separator"
import Toast from "./components/Toast"

interface OCRVendor {
  name: string | null
  address: string | null
  phone: string | null
  email: string | null
  tax_id: string | null
}

interface OCRInvoice {
  number: string | null
  date: string | null
  due_date: string | null
  currency: string
  subtotal: number | null
  tax_amount: number | null
  discount_amount: number | null
  total: number | null
  payment_terms: string | null
  notes: string | null
}

interface OCRItem {
  description: string
  product_code: string | null
  quantity: number
  unit: string
  unit_price: number
  discount: number
  tax_rate: number
  subtotal: number
  matched_product_id?: number
  matched_product_name?: string
}

interface OCRData {
  vendor: OCRVendor
  invoice: OCRInvoice
  items: OCRItem[]
  raw_text: string
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface OdooVendor {
  id: number
  name: string
  email: string | null
  phone: string | null
  vat: string | null
}

interface OdooProduct {
  id: number
  name: string
  default_code: string | null
  list_price: number
  uom_id: [number, string]
}

export default function OCRReceiptPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const { sessionId } = useAuth()
  const { stockPickingTypes, locations } = useData()
  const navigate = useNavigate()

  // State
  const [step, setStep] = useState<'upload' | 'review' | 'create'>('upload')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [ocrData, setOcrData] = useState<OCRData | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [rawText, setRawText] = useState<string>('')
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  // Selected values
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null)
  const [selectedVendorName, setSelectedVendorName] = useState<string>('')
  const [selectedPickingTypeId, setSelectedPickingTypeId] = useState<number | null>(null)

  // Search states
  const [vendorSearch, setVendorSearch] = useState('')
  const [vendorResults, setVendorResults] = useState<OdooVendor[]>([])
  const [isSearchingVendors, setIsSearchingVendors] = useState(false)
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)

  // Product search states
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<OdooProduct[]>([])
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false)

  const isDark = mode === 'dark'

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
  }

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!sessionId) {
      showToast('Please sign in first', 'error')
      return
    }

    setIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/ocr/process`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'OCR processing failed')
      }

      setOcrData(result.data)
      setValidation(result.validation)
      setRawText(result.raw_text || '')

      // Pre-fill vendor name if extracted
      if (result.data.vendor?.name) {
        setSelectedVendorName(result.data.vendor.name)
        // Auto-search for matching vendor
        searchVendors(result.data.vendor.name)
      }

      // Set default picking type (first receipt type)
      const receiptTypes = stockPickingTypes?.filter((pt: any) => pt.code === 'incoming')
      if (receiptTypes && receiptTypes.length > 0) {
        setSelectedPickingTypeId(receiptTypes[0].id)
      }

      setStep('review')
      showToast('Invoice processed successfully', 'success')
    } catch (error: any) {
      console.error('OCR Error:', error)
      showToast(error.message || 'Failed to process invoice', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [sessionId])

  // Search vendors
  const searchVendors = async (query: string) => {
    if (!sessionId || query.length < 2) {
      setVendorResults([])
      return
    }

    setIsSearchingVendors(true)
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/ocr/search-vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, query, limit: 10 }),
      })

      const result = await response.json()
      if (result.success) {
        setVendorResults(result.vendors || [])
      }
    } catch (error) {
      console.error('Vendor search error:', error)
    } finally {
      setIsSearchingVendors(false)
    }
  }

  // Search products
  const searchProducts = async (query: string) => {
    if (!sessionId || query.length < 2) {
      setProductResults([])
      return
    }

    setIsSearchingProducts(true)
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/ocr/search-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, query, limit: 10 }),
      })

      const result = await response.json()
      if (result.success) {
        setProductResults(result.products || [])
      }
    } catch (error) {
      console.error('Product search error:', error)
    } finally {
      setIsSearchingProducts(false)
    }
  }

  // Select vendor
  const selectVendor = (vendor: OdooVendor) => {
    setSelectedVendorId(vendor.id)
    setSelectedVendorName(vendor.name)
    setShowVendorDropdown(false)
    setVendorSearch('')
  }

  // Select product for item
  const selectProductForItem = (product: OdooProduct, itemIndex: number) => {
    if (!ocrData) return

    const newItems = [...ocrData.items]
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      matched_product_id: product.id,
      matched_product_name: product.name,
    }

    setOcrData({
      ...ocrData,
      items: newItems,
    })

    setEditingItemIndex(null)
    setProductSearch('')
    setProductResults([])
  }

  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    if (!ocrData) return

    const newItems = [...ocrData.items]
    newItems[index] = {
      ...newItems[index],
      quantity,
      subtotal: quantity * newItems[index].unit_price,
    }

    setOcrData({
      ...ocrData,
      items: newItems,
    })
  }

  // Remove item
  const removeItem = (index: number) => {
    if (!ocrData) return

    const newItems = ocrData.items.filter((_, i) => i !== index)
    setOcrData({
      ...ocrData,
      items: newItems,
    })
  }

  // Create receipt in Odoo
  const createReceipt = async () => {
    if (!sessionId || !ocrData) {
      showToast('Missing required data', 'error')
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/ocr/create-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          ocrData,
          vendorId: selectedVendorId,
          pickingTypeId: selectedPickingTypeId,
          scheduledDate: ocrData.invoice?.date,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to create receipt')
      }

      showToast(result.message || 'Receipt created successfully', 'success')

      // Navigate to the receipt
      if (result.pickingId) {
        setTimeout(() => {
          navigate(`/receipts/view/${result.pickingId}`)
        }, 1500)
      }
    } catch (error: any) {
      console.error('Create receipt error:', error)
      showToast(error.message || 'Failed to create receipt', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  // Reset and start over
  const resetForm = () => {
    setStep('upload')
    setOcrData(null)
    setValidation(null)
    setRawText('')
    setSelectedVendorId(null)
    setSelectedVendorName('')
    setSelectedPickingTypeId(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Get receipt picking types
  const receiptPickingTypes = stockPickingTypes?.filter((pt: any) => pt.code === 'incoming') || []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colors.border }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            {t('OCR Receipt Import')}
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            {t('Upload an invoice or receipt image to automatically extract and import data')}
          </p>
        </div>

        {step !== 'upload' && (
          <Button
            variant="outline"
            onClick={resetForm}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            {t('Start Over')}
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 p-4 border-b" style={{ borderColor: colors.border }}>
        <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-500' : 'text-green-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-500' : 'bg-green-500'} text-white`}>
            {step === 'upload' ? '1' : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <span className="font-medium">{t('Upload')}</span>
        </div>

        <ChevronRight className="h-5 w-5" style={{ color: colors.textSecondary }} />

        <div className={`flex items-center gap-2 ${step === 'review' ? 'text-blue-500' : step === 'create' ? 'text-green-500' : ''}`} style={{ color: step === 'upload' ? colors.textSecondary : undefined }}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'review' ? 'bg-blue-500 text-white' : step === 'create' ? 'bg-green-500 text-white' : ''}`} style={{ backgroundColor: step === 'upload' ? colors.mutedBg : undefined, color: step === 'upload' ? colors.textSecondary : undefined }}>
            {step === 'create' ? <CheckCircle2 className="h-5 w-5" /> : '2'}
          </div>
          <span className="font-medium">{t('Review')}</span>
        </div>

        <ChevronRight className="h-5 w-5" style={{ color: colors.textSecondary }} />

        <div className={`flex items-center gap-2 ${step === 'create' ? 'text-blue-500' : ''}`} style={{ color: step !== 'create' ? colors.textSecondary : undefined }}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'create' ? 'bg-blue-500 text-white' : ''}`} style={{ backgroundColor: step !== 'create' ? colors.mutedBg : undefined, color: step !== 'create' ? colors.textSecondary : undefined }}>
            3
          </div>
          <span className="font-medium">{t('Create')}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Upload Step */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {t('Upload Invoice or Receipt')}
                </CardTitle>
                <CardDescription>
                  {t('Drag and drop or click to upload an image (JPEG, PNG) or PDF file')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : ''
                  }`}
                  style={{ borderColor: isDragging ? undefined : colors.border }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/tiff,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                      <p className="text-lg font-medium" style={{ color: colors.textPrimary }}>
                        {t('Processing with OCR...')}
                      </p>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>
                        {t('This may take a moment')}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-4 rounded-full" style={{ backgroundColor: colors.mutedBg }}>
                          <Image className="h-8 w-8" style={{ color: colors.textSecondary }} />
                        </div>
                        <div className="p-4 rounded-full" style={{ backgroundColor: colors.mutedBg }}>
                          <FileText className="h-8 w-8" style={{ color: colors.textSecondary }} />
                        </div>
                      </div>
                      <p className="text-lg font-medium" style={{ color: colors.textPrimary }}>
                        {isDragging ? t('Drop file here') : t('Click or drag file to upload')}
                      </p>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>
                        {t('Supports JPEG, PNG, WebP, TIFF, and PDF files (max 20MB)')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && ocrData && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Validation Warnings */}
            {validation && validation.warnings.length > 0 && (
              <Card className="border-yellow-200 dark:border-yellow-900">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-700 dark:text-yellow-400">{t('Some data may need review')}</p>
                      <ul className="text-sm mt-1 space-y-1 text-yellow-600 dark:text-yellow-500">
                        {validation.warnings.map((warning, i) => (
                          <li key={i}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vendor Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {t('Vendor Information')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('Vendor Name')}</Label>
                    <div className="relative">
                      <Input
                        value={selectedVendorName || ocrData.vendor?.name || ''}
                        onChange={(e) => {
                          setSelectedVendorName(e.target.value)
                          setSelectedVendorId(null)
                          searchVendors(e.target.value)
                          setShowVendorDropdown(true)
                        }}
                        onFocus={() => setShowVendorDropdown(true)}
                        placeholder={t('Search or enter vendor name')}
                      />
                      {selectedVendorId && (
                        <Badge className="absolute right-2 top-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t('Matched')}
                        </Badge>
                      )}

                      {/* Vendor dropdown */}
                      {showVendorDropdown && vendorResults.length > 0 && (
                        <div
                          className="absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-60 overflow-auto"
                          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                        >
                          {vendorResults.map((vendor) => (
                            <div
                              key={vendor.id}
                              className="px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900"
                              onClick={() => selectVendor(vendor)}
                            >
                              <p className="font-medium" style={{ color: colors.textPrimary }}>{vendor.name}</p>
                              {vendor.email && (
                                <p className="text-sm" style={{ color: colors.textSecondary }}>{vendor.email}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {ocrData.vendor?.email && (
                    <div className="space-y-2">
                      <Label>{t('Email')}</Label>
                      <Input value={ocrData.vendor.email} readOnly className="bg-muted" />
                    </div>
                  )}

                  {ocrData.vendor?.phone && (
                    <div className="space-y-2">
                      <Label>{t('Phone')}</Label>
                      <Input value={ocrData.vendor.phone} readOnly className="bg-muted" />
                    </div>
                  )}

                  {ocrData.vendor?.tax_id && (
                    <div className="space-y-2">
                      <Label>{t('Tax ID / VAT')}</Label>
                      <Input value={ocrData.vendor.tax_id} readOnly className="bg-muted" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Invoice Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    {t('Invoice Information')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('Invoice Number')}</Label>
                      <Input value={ocrData.invoice?.number || ''} readOnly className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('Currency')}</Label>
                      <Input value={ocrData.invoice?.currency || 'USD'} readOnly className="bg-muted" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('Invoice Date')}</Label>
                      <Input value={ocrData.invoice?.date || ''} readOnly className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('Due Date')}</Label>
                      <Input value={ocrData.invoice?.due_date || ''} readOnly className="bg-muted" />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('Subtotal')}</Label>
                      <Input value={ocrData.invoice?.subtotal?.toFixed(2) || ''} readOnly className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('Tax Amount')}</Label>
                      <Input value={ocrData.invoice?.tax_amount?.toFixed(2) || ''} readOnly className="bg-muted" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lg font-semibold">{t('Total')}</Label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      <span className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                        {ocrData.invoice?.total?.toFixed(2) || '0.00'}
                      </span>
                      <span style={{ color: colors.textSecondary }}>{ocrData.invoice?.currency || 'USD'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('Line Items')} ({ocrData.items.length})
                </CardTitle>
                <CardDescription>
                  {t('Match items to existing products in your inventory')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ocrData.items.length === 0 ? (
                  <div className="text-center py-8" style={{ color: colors.textSecondary }}>
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('No line items could be extracted from the document')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ocrData.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 rounded-lg"
                        style={{ backgroundColor: colors.mutedBg }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium" style={{ color: colors.textPrimary }}>
                              {item.description}
                            </p>
                            {item.matched_product_id && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {item.matched_product_name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm" style={{ color: colors.textSecondary }}>
                            {item.quantity} × {item.unit_price.toFixed(2)} = {item.subtotal.toFixed(2)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 1)}
                            className="w-20"
                          />

                          {/* Product search button */}
                          {!item.matched_product_id && (
                            <div className="relative">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingItemIndex(editingItemIndex === index ? null : index)
                                  setProductSearch(item.description)
                                  searchProducts(item.description)
                                }}
                              >
                                <Search className="h-4 w-4 mr-1" />
                                {t('Match')}
                              </Button>

                              {editingItemIndex === index && (
                                <div
                                  className="absolute z-10 right-0 mt-1 w-72 rounded-md shadow-lg"
                                  style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                                >
                                  <div className="p-2">
                                    <Input
                                      value={productSearch}
                                      onChange={(e) => {
                                        setProductSearch(e.target.value)
                                        searchProducts(e.target.value)
                                      }}
                                      placeholder={t('Search products...')}
                                      autoFocus
                                    />
                                  </div>

                                  {isSearchingProducts ? (
                                    <div className="p-4 text-center">
                                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                    </div>
                                  ) : productResults.length > 0 ? (
                                    <div className="max-h-60 overflow-auto">
                                      {productResults.map((product) => (
                                        <div
                                          key={product.id}
                                          className="px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900"
                                          onClick={() => selectProductForItem(product, index)}
                                        >
                                          <p className="font-medium" style={{ color: colors.textPrimary }}>
                                            {product.name}
                                          </p>
                                          {product.default_code && (
                                            <p className="text-sm" style={{ color: colors.textSecondary }}>
                                              [{product.default_code}]
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="p-4 text-center" style={{ color: colors.textSecondary }}>
                                      {t('No products found')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Picking Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Receipt Settings')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>{t('Receipt Type')}</Label>
                  <select
                    value={selectedPickingTypeId || ''}
                    onChange={(e) => setSelectedPickingTypeId(parseInt(e.target.value))}
                    className="w-full p-2 rounded-md"
                    style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }}
                  >
                    <option value="">{t('Select a receipt type')}</option>
                    {receiptPickingTypes.map((pt: any) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Raw Text (collapsible) */}
            <details className="group">
              <summary className="cursor-pointer list-none">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5" style={{ color: colors.textSecondary }} />
                        <span className="font-medium" style={{ color: colors.textPrimary }}>
                          {t('View Raw OCR Text')}
                        </span>
                      </div>
                      <ChevronRight className="h-5 w-5 transition-transform group-open:rotate-90" style={{ color: colors.textSecondary }} />
                    </div>
                  </CardContent>
                </Card>
              </summary>
              <Card className="mt-2">
                <CardContent className="pt-4">
                  <Textarea
                    value={rawText}
                    readOnly
                    className="font-mono text-sm min-h-[200px]"
                    style={{ backgroundColor: colors.mutedBg }}
                  />
                </CardContent>
              </Card>
            </details>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={resetForm}>
                {t('Cancel')}
              </Button>
              <Button
                onClick={createReceipt}
                disabled={isCreating || ocrData.items.length === 0}
                className="gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('Creating...')}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {t('Create Receipt')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
