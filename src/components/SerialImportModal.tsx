"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import {
  X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2,
  ArrowRight, ChevronDown, MapPin, Hash, Tag, Info
} from "lucide-react"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import { Button } from "../../@/components/ui/button"

interface SerialImportModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

interface ExcelColumn {
  index: number
  name: string
  sampleValues: string[]
}

interface FieldMapping {
  excelColumn: number | null
  targetField: string
  label: string
  required: boolean
  transform?: 'none' | 'location_sanitize'
}

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3006'

// Target fields for serial number import
const TARGET_FIELDS = [
  { field: 'name', label: 'Serial Number / Barcode', required: true },
  { field: 'x_rfid', label: 'RFID Tag', required: false },
  { field: 'location_code', label: 'Location Code', required: false, transform: 'location_sanitize' as const },
  { field: 'x_category', label: 'Category', required: false },
  { field: 'x_subcategory', label: 'Subcategory', required: false },
  { field: 'x_group', label: 'Group', required: false },
  { field: 'x_subgroup', label: 'Subgroup', required: false },
  { field: 'x_brand', label: 'Brand', required: false },
  { field: 'x_manufacturer', label: 'Manufacturer', required: false },
  { field: 'x_model', label: 'Model', required: false },
  { field: 'x_custodian', label: 'Custodian', required: false },
  { field: 'x_condition', label: 'Condition', required: false },
  { field: 'x_description', label: 'Description', required: false },
  { field: 'x_original_barcode', label: 'Original Barcode', required: false },
]

/**
 * Sanitize location code from format like "4AV09AF01" to "AV/09/AF/01"
 * Pattern: First digit is zone, then pairs of characters separated by /
 */
function sanitizeLocationCode(code: string): string {
  if (!code || typeof code !== 'string') return ''

  // Remove the first digit (zone number) and any leading/trailing whitespace
  const cleaned = code.trim()

  // Pattern: first char is digit (zone), then AV, then 2 digits, then 2 letters, then 2 digits
  // e.g., "4AV09AF01" -> "AV/09/AF/01"
  const match = cleaned.match(/^(\d)?([A-Z]{2})(\d{2})([A-Z]{2})(\d{2})$/i)

  if (match) {
    const [, , aisle, row, shelf, bin] = match
    return `${aisle.toUpperCase()}/${row}/${shelf.toUpperCase()}/${bin}`
  }

  // Try alternative pattern without zone prefix
  const match2 = cleaned.match(/^([A-Z]{2})(\d{2})([A-Z]{2})(\d{2})$/i)
  if (match2) {
    const [, aisle, row, shelf, bin] = match2
    return `${aisle.toUpperCase()}/${row}/${shelf.toUpperCase()}/${bin}`
  }

  // If no pattern matches, return as-is
  return cleaned
}

export function SerialImportModal({ isOpen, onClose, onComplete }: SerialImportModalProps) {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const { sessionId } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('current_tenant_id') : null

  const [step, setStep] = useState<ImportStep>("upload")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedFilePath, setUploadedFilePath] = useState<string>("")
  const [excelColumns, setExcelColumns] = useState<ExcelColumn[]>([])
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [previewData, setPreviewData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: '' })
  const [importResults, setImportResults] = useState<any>(null)

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // Initialize field mappings
  useEffect(() => {
    setFieldMappings(TARGET_FIELDS.map(f => ({
      excelColumn: null,
      targetField: f.field,
      label: f.label,
      required: f.required,
      transform: f.transform || 'none',
    })))
  }, [])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validExtensions = [".xlsx", ".xls"]
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf("."))
    if (!validExtensions.includes(fileExt)) {
      setError(t("Please select a valid Excel file (.xlsx or .xls)"))
      return
    }

    setSelectedFile(file)
    setError(null)
    await uploadAndAnalyze(file)
  }

  const uploadAndAnalyze = async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${API_BASE_URL}/import/serial/analyze`, {
        method: "POST",
        headers: {
          "X-Tenant-ID": tenantId || "",
          "X-Session-ID": sessionId || "",
        },
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to analyze file")
      }

      setExcelColumns(result.columns || [])
      setUploadedFilePath(result.filePath)

      // Auto-map columns based on name matching
      autoMapColumns(result.columns || [])

      setStep("mapping")
    } catch (err: any) {
      console.error("[SerialImport] Upload error:", err)
      setError(err.message || t("Unable to process file"))
    } finally {
      setIsLoading(false)
    }
  }

  const autoMapColumns = (columns: ExcelColumn[]) => {
    const mappings = [...fieldMappings]

    columns.forEach((col, idx) => {
      const colNameLower = col.name.toLowerCase()

      // Auto-map based on common column names
      if (colNameLower.includes('barcode') || colNameLower.includes('serial') || colNameLower === 'name') {
        const nameMapping = mappings.find(m => m.targetField === 'name')
        if (nameMapping && nameMapping.excelColumn === null) {
          nameMapping.excelColumn = idx
        }
      }
      if (colNameLower.includes('rfid')) {
        const rfidMapping = mappings.find(m => m.targetField === 'x_rfid')
        if (rfidMapping && rfidMapping.excelColumn === null) {
          rfidMapping.excelColumn = idx
        }
      }
      if (colNameLower.includes('location') || colNameLower.includes('loc')) {
        const locMapping = mappings.find(m => m.targetField === 'location_code')
        if (locMapping && locMapping.excelColumn === null) {
          locMapping.excelColumn = idx
        }
      }
      if (colNameLower.includes('category') && !colNameLower.includes('sub')) {
        const catMapping = mappings.find(m => m.targetField === 'x_category')
        if (catMapping && catMapping.excelColumn === null) {
          catMapping.excelColumn = idx
        }
      }
      if (colNameLower.includes('subcategory') || colNameLower.includes('sub_category') || colNameLower.includes('sub category')) {
        const subcatMapping = mappings.find(m => m.targetField === 'x_subcategory')
        if (subcatMapping && subcatMapping.excelColumn === null) {
          subcatMapping.excelColumn = idx
        }
      }
      if (colNameLower.includes('group') && !colNameLower.includes('sub')) {
        const groupMapping = mappings.find(m => m.targetField === 'x_group')
        if (groupMapping && groupMapping.excelColumn === null) {
          groupMapping.excelColumn = idx
        }
      }
      if (colNameLower.includes('subgroup') || colNameLower.includes('sub_group') || colNameLower.includes('sub group')) {
        const subgroupMapping = mappings.find(m => m.targetField === 'x_subgroup')
        if (subgroupMapping && subgroupMapping.excelColumn === null) {
          subgroupMapping.excelColumn = idx
        }
      }
      if (colNameLower.includes('brand')) {
        const brandMapping = mappings.find(m => m.targetField === 'x_brand')
        if (brandMapping && brandMapping.excelColumn === null) {
          brandMapping.excelColumn = idx
        }
      }
      if (colNameLower.includes('manufacturer') || colNameLower.includes('mfr')) {
        const mfrMapping = mappings.find(m => m.targetField === 'x_manufacturer')
        if (mfrMapping && mfrMapping.excelColumn === null) {
          mfrMapping.excelColumn = idx
        }
      }
      if (colNameLower.includes('model')) {
        const modelMapping = mappings.find(m => m.targetField === 'x_model')
        if (modelMapping && modelMapping.excelColumn === null) {
          modelMapping.excelColumn = idx
        }
      }
      if (colNameLower.includes('custodian') || colNameLower.includes('owner') || colNameLower.includes('assigned')) {
        const custMapping = mappings.find(m => m.targetField === 'x_custodian')
        if (custMapping && custMapping.excelColumn === null) {
          custMapping.excelColumn = idx
        }
      }
      if (colNameLower.includes('condition') || colNameLower.includes('status')) {
        const condMapping = mappings.find(m => m.targetField === 'x_condition')
        if (condMapping && condMapping.excelColumn === null) {
          condMapping.excelColumn = idx
        }
      }
      if (colNameLower.includes('description') || colNameLower.includes('notes') || colNameLower.includes('remarks')) {
        const descMapping = mappings.find(m => m.targetField === 'x_description')
        if (descMapping && descMapping.excelColumn === null) {
          descMapping.excelColumn = idx
        }
      }
    })

    setFieldMappings(mappings)
  }

  const updateMapping = (targetField: string, excelColumnIndex: number | null) => {
    setFieldMappings(prev => prev.map(m =>
      m.targetField === targetField
        ? { ...m, excelColumn: excelColumnIndex }
        : m
    ))
  }

  const validateMappings = (): boolean => {
    const requiredMappings = fieldMappings.filter(m => m.required)
    const unmapped = requiredMappings.filter(m => m.excelColumn === null)

    if (unmapped.length > 0) {
      setError(t("Please map all required fields: ") + unmapped.map(m => m.label).join(', '))
      return false
    }

    return true
  }

  const handlePreview = async () => {
    if (!validateMappings()) return

    setIsLoading(true)
    setError(null)

    try {
      // Generate preview data from the first few rows
      const response = await fetch(`${API_BASE_URL}/import/serial/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": tenantId || "",
          "X-Session-ID": sessionId || "",
        },
        body: JSON.stringify({
          filePath: uploadedFilePath,
          mappings: fieldMappings.filter(m => m.excelColumn !== null).map(m => ({
            excelColumn: m.excelColumn,
            targetField: m.targetField,
            transform: m.transform,
          })),
          limit: 10,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to generate preview")
      }

      setPreviewData(result.preview || [])
      setStep("preview")
    } catch (err: any) {
      console.error("[SerialImport] Preview error:", err)
      setError(err.message || t("Unable to generate preview"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!uploadedFilePath || !sessionId) {
      setError(t("Please upload a file first"))
      return
    }

    setStep("importing")
    setError(null)
    setImportProgress({ current: 0, total: 0, status: 'Starting...' })

    try {
      // Build SSE URL with query params
      const params = new URLSearchParams({
        sessionId,
        filePath: uploadedFilePath,
        tenantId: tenantId || "",
      })

      const response = await fetch(`${API_BASE_URL}/import/serial/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": tenantId || "",
          "X-Session-ID": sessionId || "",
        },
        body: JSON.stringify({
          filePath: uploadedFilePath,
          mappings: fieldMappings.filter(m => m.excelColumn !== null).map(m => ({
            excelColumn: m.excelColumn,
            targetField: m.targetField,
            transform: m.transform,
          })),
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Import failed")
      }

      setImportResults(result)
      setStep("complete")

      if (onComplete) {
        onComplete()
      }
    } catch (err: any) {
      console.error("[SerialImport] Import error:", err)
      setError(err.message || t("Import failed"))
      setStep("preview")
    }
  }

  const handleClose = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    setStep("upload")
    setSelectedFile(null)
    setUploadedFilePath("")
    setExcelColumns([])
    setPreviewData([])
    setError(null)
    setIsLoading(false)
    setImportResults(null)
    setFieldMappings(TARGET_FIELDS.map(f => ({
      excelColumn: null,
      targetField: f.field,
      label: f.label,
      required: f.required,
      transform: f.transform || 'none',
    })))
    onClose()
  }

  if (!isOpen) return null

  const wizardSteps = [
    { key: "upload", label: t("Upload") },
    { key: "mapping", label: t("Map Fields") },
    { key: "preview", label: t("Preview") },
    { key: "importing", label: t("Import") },
    { key: "complete", label: t("Done") },
  ]

  const currentStepIndex = wizardSteps.findIndex(s => s.key === step)

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(8px)",
      }}
      onClick={handleClose}
    >
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .modal-enter { animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        `}
      </style>

      <div
        className="modal-enter"
        style={{
          background: colors.card,
          borderRadius: "20px",
          width: "90%",
          maxWidth: "800px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${colors.border}`,
          boxShadow: mode === 'dark'
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            : "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.5rem",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: mode === 'dark' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(14, 165, 233, 0.1)',
                border: `1px solid ${colors.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Upload size={24} color="#0ea5e9" />
            </div>
            <div>
              <h2 style={{
                fontSize: "1.25rem",
                fontWeight: "700",
                color: colors.textPrimary,
                margin: 0,
              }}>
                {t("Import Serial Numbers")}
              </h2>
              <p style={{
                fontSize: "0.875rem",
                color: colors.textSecondary,
                margin: 0,
                marginTop: "2px"
              }}>
                {step === "upload" && t("Upload your Excel file with asset data")}
                {step === "mapping" && t("Map Excel columns to serial number fields")}
                {step === "preview" && t("Review data before importing")}
                {step === "importing" && t("Importing your data...")}
                {step === "complete" && t("Import completed successfully")}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              border: "none",
              cursor: "pointer",
              padding: "0.625rem",
              borderRadius: "10px",
              color: colors.textSecondary,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div style={{
          padding: "1rem 1.5rem",
          borderBottom: `1px solid ${colors.border}`,
          background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {wizardSteps.map((s, idx) => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", flex: idx < wizardSteps.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: idx <= currentStepIndex
                        ? (idx === currentStepIndex ? '#0ea5e9' : '#16a34a')
                        : (mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: idx <= currentStepIndex ? "#fff" : colors.textSecondary,
                    }}
                  >
                    {idx < currentStepIndex ? "✓" : idx + 1}
                  </div>
                  <span style={{
                    fontSize: "0.8rem",
                    fontWeight: idx === currentStepIndex ? "600" : "500",
                    color: idx <= currentStepIndex ? colors.textPrimary : colors.textSecondary
                  }}>
                    {s.label}
                  </span>
                </div>
                {idx < wizardSteps.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: "2px",
                    background: idx < currentStepIndex
                      ? '#16a34a'
                      : (mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                    marginLeft: "0.75rem",
                    borderRadius: "1px",
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem", overflow: "auto", flex: 1 }}>
          {error && (
            <div
              style={{
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: "12px",
                padding: "1rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <AlertCircle size={20} color="#dc2626" />
              <span style={{ color: "#dc2626", fontSize: "0.875rem", fontWeight: "500" }}>{error}</span>
            </div>
          )}

          {/* Step: Upload */}
          {step === "upload" && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx,.xls"
                style={{ display: "none" }}
              />

              <div
                onClick={() => !isLoading && fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isLoading ? '#0ea5e9' : colors.border}`,
                  borderRadius: "16px",
                  padding: "3rem 2rem",
                  textAlign: "center",
                  cursor: isLoading ? "default" : "pointer",
                  background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                }}
              >
                {isLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                    <Loader2 size={48} color="#0ea5e9" style={{ animation: "spin 1s linear infinite" }} />
                    <p style={{ color: colors.textSecondary, margin: 0, fontWeight: "500" }}>{t("Analyzing file...")}</p>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "18px",
                        background: 'rgba(14, 165, 233, 0.1)',
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 1.25rem",
                      }}
                    >
                      <Upload size={32} color="#0ea5e9" />
                    </div>
                    <p style={{
                      fontSize: "1.125rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                    }}>
                      {t("Drop your file here or click to browse")}
                    </p>
                    <p style={{ fontSize: "0.875rem", color: colors.textSecondary, margin: 0 }}>
                      {t("Supports .xlsx and .xls files")}
                    </p>
                  </>
                )}
              </div>

              {/* Info about location code transformation */}
              <div
                style={{
                  marginTop: "1.5rem",
                  padding: "1rem",
                  background: mode === 'dark' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(14, 165, 233, 0.05)',
                  borderRadius: "12px",
                  border: '1px solid rgba(14, 165, 233, 0.2)',
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <Info size={20} color="#0ea5e9" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <p style={{ fontSize: "0.875rem", fontWeight: "600", color: colors.textPrimary, margin: 0, marginBottom: "0.5rem" }}>
                      {t("Location Code Transformation")}
                    </p>
                    <p style={{ fontSize: "0.8rem", color: colors.textSecondary, margin: 0 }}>
                      {t("Location codes like '4AV09AF01' will be automatically converted to 'AV/09/AF/01' format for matching with Odoo locations.")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Mapping */}
          {step === "mapping" && (
            <div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.5rem",
                padding: "1rem",
                background: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderRadius: "12px",
                border: `1px solid ${colors.border}`
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: 'rgba(22, 163, 74, 0.15)',
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <FileSpreadsheet size={20} color="#16a34a" />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: "600", color: colors.textPrimary, fontSize: "0.9rem" }}>
                    {selectedFile?.name}
                  </span>
                  <p style={{ fontSize: "0.75rem", color: colors.textSecondary, margin: 0, marginTop: "2px" }}>
                    {excelColumns.length} {t("columns detected")}
                  </p>
                </div>
                <CheckCircle size={20} color="#16a34a" />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {fieldMappings.map((mapping) => (
                  <div
                    key={mapping.targetField}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "0.75rem 1rem",
                      background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                      borderRadius: "10px",
                      border: `1px solid ${mapping.required && mapping.excelColumn === null ? 'rgba(239, 68, 68, 0.5)' : colors.border}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "150px" }}>
                      <span style={{
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: colors.textPrimary,
                      }}>
                        {mapping.label}
                        {mapping.required && <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>}
                      </span>
                      {mapping.transform === 'location_sanitize' && (
                        <p style={{ fontSize: "0.7rem", color: colors.textSecondary, margin: "2px 0 0 0" }}>
                          {t("Auto-converts to AV/09/AF/01 format")}
                        </p>
                      )}
                    </div>
                    <ArrowRight size={16} color={colors.textSecondary} />
                    <div style={{ flex: 1.5 }}>
                      <select
                        value={mapping.excelColumn ?? ''}
                        onChange={(e) => updateMapping(mapping.targetField, e.target.value ? parseInt(e.target.value) : null)}
                        style={{
                          width: "100%",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "8px",
                          border: `1px solid ${colors.border}`,
                          background: mode === 'dark' ? '#27272a' : '#f4f4f5',
                          color: colors.textPrimary,
                          fontSize: "0.875rem",
                        }}
                      >
                        <option value="">{t("-- Select column --")}</option>
                        {excelColumns.map((col, idx) => (
                          <option key={idx} value={idx}>
                            {col.name} {col.sampleValues.length > 0 && `(e.g., ${col.sampleValues[0]})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <div>
              <p style={{ fontSize: "0.875rem", color: colors.textSecondary, marginBottom: "1rem" }}>
                {t("Showing first {{count}} records. Review the data transformation before importing.", { count: previewData.length })}
              </p>

              <div style={{
                overflowX: "auto",
                border: `1px solid ${colors.border}`,
                borderRadius: "12px",
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                      {fieldMappings.filter(m => m.excelColumn !== null).map(m => (
                        <th key={m.targetField} style={{
                          padding: "0.75rem",
                          textAlign: "left",
                          fontWeight: "600",
                          color: colors.textPrimary,
                          borderBottom: `1px solid ${colors.border}`,
                        }}>
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx}>
                        {fieldMappings.filter(m => m.excelColumn !== null).map(m => (
                          <td key={m.targetField} style={{
                            padding: "0.75rem",
                            color: colors.textSecondary,
                            borderBottom: `1px solid ${colors.border}`,
                          }}>
                            {row[m.targetField] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === "importing" && (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <Loader2 size={48} color="#0ea5e9" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
              <p style={{ color: colors.textPrimary, marginTop: "1rem", fontWeight: "500" }}>
                {importProgress.status || t("Processing...")}
              </p>
              {importProgress.total > 0 && (
                <p style={{ color: colors.textSecondary, fontSize: "0.875rem" }}>
                  {importProgress.current} / {importProgress.total}
                </p>
              )}
            </div>
          )}

          {/* Step: Complete */}
          {step === "complete" && importResults && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                background: 'rgba(22, 163, 74, 0.15)',
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
              }}>
                <CheckCircle size={32} color="#16a34a" />
              </div>
              <h3 style={{
                fontSize: "1.25rem",
                fontWeight: "700",
                color: colors.textPrimary,
                marginBottom: "0.5rem",
              }}>
                {t("Import Complete!")}
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
                marginTop: "1.5rem",
              }}>
                <div style={{
                  padding: "1rem",
                  background: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderRadius: "12px",
                  border: `1px solid ${colors.border}`,
                }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
                    {importResults.created || 0}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: colors.textSecondary }}>{t("Created")}</div>
                </div>
                <div style={{
                  padding: "1rem",
                  background: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderRadius: "12px",
                  border: `1px solid ${colors.border}`,
                }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#f59e0b" }}>
                    {importResults.skipped || 0}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: colors.textSecondary }}>{t("Skipped")}</div>
                </div>
                <div style={{
                  padding: "1rem",
                  background: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderRadius: "12px",
                  border: `1px solid ${colors.border}`,
                }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#dc2626" }}>
                    {importResults.errors || 0}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: colors.textSecondary }}>{t("Errors")}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
          }}
        >
          {step === "upload" && (
            <Button
              variant="outline"
              onClick={handleClose}
              style={{
                background: "transparent",
                color: colors.textPrimary,
                borderColor: colors.border,
                borderRadius: "10px",
                padding: "0.625rem 1.25rem",
                fontWeight: "500"
              }}
            >
              {t("Cancel")}
            </Button>
          )}

          {step === "mapping" && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("upload")}
                style={{
                  background: "transparent",
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  borderRadius: "10px",
                  padding: "0.625rem 1.25rem",
                  fontWeight: "500"
                }}
              >
                {t("Back")}
              </Button>
              <Button
                onClick={handlePreview}
                disabled={isLoading}
                style={{
                  background: "#0ea5e9",
                  color: "#fff",
                  borderRadius: "10px",
                  padding: "0.625rem 1.5rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  border: "none"
                }}
              >
                {isLoading ? (
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <ArrowRight size={16} />
                )}
                {t("Preview")}
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("mapping")}
                style={{
                  background: "transparent",
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  borderRadius: "10px",
                  padding: "0.625rem 1.25rem",
                  fontWeight: "500"
                }}
              >
                {t("Back")}
              </Button>
              <Button
                onClick={handleImport}
                disabled={isLoading}
                style={{
                  background: "#16a34a",
                  color: "#fff",
                  borderRadius: "10px",
                  padding: "0.625rem 1.5rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  border: "none"
                }}
              >
                {t("Start Import")}
                <ArrowRight size={16} />
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button
              onClick={handleClose}
              style={{
                background: "#16a34a",
                color: "#fff",
                borderRadius: "10px",
                padding: "0.625rem 1.5rem",
                fontWeight: "600",
                border: "none"
              }}
            >
              {t("Done")}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
