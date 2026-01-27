("use client")

import { useState, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import { useData } from "../../context/data"
import { API_CONFIG } from "../config/api"
import {
  Upload,
  FileText,
  Image,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Package,
  DollarSign,
  Search,
  Plus,
  X,
  ChevronLeft,
} from "lucide-react"
import { Button } from "../../@/components/ui/button"
import { Input } from "../../@/components/ui/input"
import { Label } from "../../@/components/ui/label"
import { Badge } from "../../@/components/ui/badge"

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
  total: number | null
}

interface OCRItem {
  description: string
  quantity: number
  unit_price: number
  subtotal: number
  matched_product_id?: number
  matched_product_name?: string
}

interface OCRData {
  vendor: OCRVendor
  invoice: OCRInvoice
  items: OCRItem[]
}

interface OdooVendor {
  id: number
  name: string
  email: string | null
}

interface OdooProduct {
  id: number
  name: string
  default_code: string | null
}

interface OCRImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (pickingId: number) => void
}

export function OCRImportModal({ isOpen, onClose, onSuccess }: OCRImportModalProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { sessionId } = useAuth()
  const { stockPickingTypes } = useData()
  const navigate = useNavigate()

  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [ocrData, setOcrData] = useState<OCRData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null)
  const [selectedVendorName, setSelectedVendorName] = useState<string>('')
  const [selectedPickingTypeId, setSelectedPickingTypeId] = useState<number | null>(null)

  const [vendorResults, setVendorResults] = useState<OdooVendor[]>([])
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)

  const [productResults, setProductResults] = useState<OdooProduct[]>([])
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [productSearch, setProductSearch] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const receiptPickingTypes = stockPickingTypes?.filter((pt: any) => pt.code === 'incoming') || []

  const resetModal = () => {
    setStep('upload')
    setOcrData(null)
    setError(null)
    setSelectedVendorId(null)
    setSelectedVendorName('')
    setSelectedPickingTypeId(null)
    setVendorResults([])
    setProductResults([])
    setEditingItemIndex(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const handleFileUpload = async (file: File) => {
    if (!sessionId) {
      setError('Please sign in first')
      return
    }

    setIsProcessing(true)
    setError(null)

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

      if (result.data.vendor?.name) {
        setSelectedVendorName(result.data.vendor.name)
        searchVendors(result.data.vendor.name)
      }

      if (receiptPickingTypes.length > 0) {
        setSelectedPickingTypeId(receiptPickingTypes[0].id)
      }

      setStep('review')
    } catch (err: any) {
      setError(err.message || 'Failed to process invoice')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

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
    if (file) handleFileUpload(file)
  }, [sessionId])

  const searchVendors = async (query: string) => {
    if (!sessionId || query.length < 2) {
      setVendorResults([])
      return
    }

    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/ocr/search-vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, query, limit: 10 }),
      })
      const result = await response.json()
      if (result.success) setVendorResults(result.vendors || [])
    } catch (err) {
      console.error('Vendor search error:', err)
    }
  }

  const searchProducts = async (query: string) => {
    if (!sessionId || query.length < 2) {
      setProductResults([])
      return
    }

    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/ocr/search-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, query, limit: 10 }),
      })
      const result = await response.json()
      if (result.success) setProductResults(result.products || [])
    } catch (err) {
      console.error('Product search error:', err)
    }
  }

  const selectVendor = (vendor: OdooVendor) => {
    setSelectedVendorId(vendor.id)
    setSelectedVendorName(vendor.name)
    setShowVendorDropdown(false)
  }

  const selectProductForItem = (product: OdooProduct, itemIndex: number) => {
    if (!ocrData) return
    const newItems = [...ocrData.items]
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      matched_product_id: product.id,
      matched_product_name: product.name,
    }
    setOcrData({ ...ocrData, items: newItems })
    setEditingItemIndex(null)
    setProductSearch('')
    setProductResults([])
  }

  const updateItemQuantity = (index: number, quantity: number) => {
    if (!ocrData) return
    const newItems = [...ocrData.items]
    newItems[index] = {
      ...newItems[index],
      quantity,
      subtotal: quantity * newItems[index].unit_price,
    }
    setOcrData({ ...ocrData, items: newItems })
  }

  const removeItem = (index: number) => {
    if (!ocrData) return
    setOcrData({
      ...ocrData,
      items: ocrData.items.filter((_, i) => i !== index),
    })
  }

  const createReceipt = async () => {
    if (!sessionId || !ocrData) {
      setError('Missing required data')
      return
    }

    setIsCreating(true)
    setError(null)

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

      if (result.pickingId) {
        onSuccess(result.pickingId)
        handleClose()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create receipt')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-auto rounded-lg shadow-xl"
        style={{ backgroundColor: colors.card }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            {step === 'review' && (
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
              {step === 'upload' ? t('Import from Invoice') : t('Review Extracted Data')}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Upload Step */}
          {step === 'upload' && (
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
                    {t('Supports JPEG, PNG, WebP, TIFF, and PDF files')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && ocrData && (
            <div className="space-y-6">
              {/* Vendor */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t('Vendor')}
                </Label>
                <div className="relative">
                  <Input
                    value={selectedVendorName}
                    onChange={(e) => {
                      setSelectedVendorName(e.target.value)
                      setSelectedVendorId(null)
                      searchVendors(e.target.value)
                      setShowVendorDropdown(true)
                    }}
                    onFocus={() => setShowVendorDropdown(true)}
                    placeholder={t('Search vendor...')}
                  />
                  {selectedVendorId && (
                    <Badge className="absolute right-2 top-2 bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('Matched')}
                    </Badge>
                  )}
                  {showVendorDropdown && vendorResults.length > 0 && (
                    <div
                      className="absolute z-20 w-full mt-1 rounded-md shadow-lg max-h-40 overflow-auto"
                      style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                    >
                      {vendorResults.map((vendor) => (
                        <div
                          key={vendor.id}
                          className="px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900"
                          onClick={() => selectVendor(vendor)}
                        >
                          <p style={{ color: colors.textPrimary }}>{vendor.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm">{t('Invoice #')}</Label>
                  <p className="font-medium" style={{ color: colors.textPrimary }}>
                    {ocrData.invoice?.number || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{t('Date')}</Label>
                  <p className="font-medium" style={{ color: colors.textPrimary }}>
                    {ocrData.invoice?.date || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{t('Total')}</Label>
                  <p className="font-medium text-green-600">
                    {ocrData.invoice?.currency} {ocrData.invoice?.total?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {t('Line Items')} ({ocrData.items.length})
                </Label>

                {ocrData.items.length === 0 ? (
                  <p className="text-center py-4" style={{ color: colors.textSecondary }}>
                    {t('No items extracted')}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-auto">
                    {ocrData.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: colors.mutedBg }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ color: colors.textPrimary }}>
                            {item.description}
                          </p>
                          <p className="text-sm" style={{ color: colors.textSecondary }}>
                            {item.quantity} × {item.unit_price.toFixed(2)}
                          </p>
                          {item.matched_product_id && (
                            <Badge className="mt-1 bg-green-100 text-green-700 text-xs">
                              {item.matched_product_name}
                            </Badge>
                          )}
                        </div>

                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 1)}
                          className="w-16"
                        />

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
                              <Search className="h-3 w-3" />
                            </Button>

                            {editingItemIndex === index && (
                              <div
                                className="absolute z-20 right-0 mt-1 w-64 rounded-md shadow-lg"
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
                                <div className="max-h-40 overflow-auto">
                                  {productResults.map((product) => (
                                    <div
                                      key={product.id}
                                      className="px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900"
                                      onClick={() => selectProductForItem(product, index)}
                                    >
                                      <p className="text-sm" style={{ color: colors.textPrimary }}>
                                        {product.name}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Receipt Type */}
              <div className="space-y-2">
                <Label>{t('Receipt Type')}</Label>
                <select
                  value={selectedPickingTypeId || ''}
                  onChange={(e) => setSelectedPickingTypeId(parseInt(e.target.value))}
                  className="w-full p-2 rounded-md border"
                  style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }}
                >
                  {receiptPickingTypes.map((pt: any) => (
                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'review' && (
          <div className="sticky bottom-0 flex justify-end gap-3 p-4 border-t" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Button variant="outline" onClick={handleClose}>
              {t('Cancel')}
            </Button>
            <Button
              onClick={createReceipt}
              disabled={isCreating || !ocrData || ocrData.items.length === 0}
              style={{ backgroundColor: colors.action, color: '#fff' }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('Creating...')}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('Create Receipt')}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
