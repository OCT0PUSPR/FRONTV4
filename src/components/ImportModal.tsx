"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Package, Tags, FolderTree, Factory, Box, Users, ArrowRight, Sparkles, Circle } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import { Button } from "../../@/components/ui/button"

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

interface PreviewData {
  summary: {
    items: number
    groups: number
    subGroups: number
    categories: number
    subCategories: number
    brands: number
    manufacturers: number
    models: number
    custodians: number
  }
  samples: {
    items: Array<{ itemId: string; name: string }>
    groups: Array<{ id: string; name: string }>
    brands: Array<{ id: string; name: string }>
  }
}

interface ImportResults {
  success: boolean
  summary: {
    totalItemsParsed: number
    productsCreated: number
    productsExisting: number
    brandsCreated: number
    brandsExisting: number
    manufacturersCreated: number
    manufacturersExisting: number
    modelsCreated: number
    modelsExisting: number
    groupsCreated: number
    groupsExisting: number
    subGroupsCreated: number
    subGroupsExisting: number
    totalErrors: number
  }
  duration: number
}

interface StepProgress {
  status: 'pending' | 'in_progress' | 'complete' | 'error'
  current: number
  total: number
  created?: number
  existing?: number
  label?: string
}

type ImportStep = "upload" | "preview" | "importing" | "complete"

// Color palette - using theme action color for accent
const COLORS = {
  products: "#0891b2",      // Cyan
  categories: "#059669",    // Emerald
  brands: "#ea580c",        // Orange
  manufacturers: "#0284c7", // Sky blue
  models: "#ca8a04",        // Yellow/amber
  custodians: "#64748b",    // Slate
  success: "#16a34a",       // Green
  error: "#dc2626",         // Red
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3006'

const IMPORT_STEPS = [
  { key: 'setup', label: 'Setup', icon: Sparkles, color: COLORS.custodians },
  { key: 'brands', label: 'Brands', icon: Tags, color: COLORS.brands },
  { key: 'manufacturers', label: 'Manufacturers', icon: Factory, color: COLORS.manufacturers },
  { key: 'models', label: 'Models', icon: Box, color: COLORS.models },
  { key: 'categories', label: 'Categories', icon: FolderTree, color: COLORS.categories },
  { key: 'products', label: 'Products', icon: Package, color: COLORS.products },
]

export function ImportModal({ isOpen, onClose, onComplete }: ImportModalProps) {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const { sessionId } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Get tenantId from localStorage (not exposed by useAuth)
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('current_tenant_id') : null

  const [step, setStep] = useState<ImportStep>("upload")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedFilePath, setUploadedFilePath] = useState<string>("")
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [importResults, setImportResults] = useState<ImportResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Progress tracking for each import step
  const [stepProgress, setStepProgress] = useState<Record<string, StepProgress>>({
    setup: { status: 'pending', current: 0, total: 1 },
    parsing: { status: 'pending', current: 0, total: 1 },
    brands: { status: 'pending', current: 0, total: 0 },
    manufacturers: { status: 'pending', current: 0, total: 0 },
    models: { status: 'pending', current: 0, total: 0 },
    categories: { status: 'pending', current: 0, total: 0 },
    products: { status: 'pending', current: 0, total: 0 },
  })

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validExtensions = [".xlsx", ".xls"]
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf("."))
    if (!validExtensions.includes(fileExt)) {
      setError("Please select a valid Excel file (.xlsx or .xls)")
      return
    }

    setSelectedFile(file)
    setError(null)
    await uploadAndPreview(file)
  }

  const uploadAndPreview = async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${API_BASE_URL}/import/preview`, {
        method: "POST",
        headers: {
          "X-Tenant-ID": tenantId || "",
        },
        body: formData,
      })

      const text = await response.text()
      let result
      try {
        result = text ? JSON.parse(text) : null
      } catch {
        result = null
      }

      if (!response.ok || !result?.success) {
        console.error("[Import] Error:", { status: response.status, result, text })
        throw new Error("upload_failed")
      }

      setPreviewData(result.preview)
      setUploadedFilePath(result.filePath)
      setStep("preview")
    } catch (err: any) {
      console.error("[Import] Upload error:", err)
      setError(t("Unable to process file. Please ensure the file is a valid Excel spreadsheet and try again."))
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!uploadedFilePath || !sessionId) {
      setError(t("Please upload a file first and try again."))
      return
    }

    // Reset progress states
    setStepProgress({
      setup: { status: 'pending', current: 0, total: 1 },
      parsing: { status: 'pending', current: 0, total: 1 },
      brands: { status: 'pending', current: 0, total: previewData?.summary.brands || 0 },
      manufacturers: { status: 'pending', current: 0, total: previewData?.summary.manufacturers || 0 },
      models: { status: 'pending', current: 0, total: previewData?.summary.models || 0 },
      categories: { status: 'pending', current: 0, total: (previewData?.summary.groups || 0) + (previewData?.summary.subGroups || 0) },
      products: { status: 'pending', current: 0, total: previewData?.summary.items || 0 },
    })

    setStep("importing")
    setError(null)

    // Build SSE URL with query params
    const params = new URLSearchParams({
      sessionId,
      filePath: uploadedFilePath,
      tenantId: tenantId || "",
    })

    const sseUrl = `${API_BASE_URL}/import/stream?${params.toString()}`

    try {
      const eventSource = new EventSource(sseUrl)
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'progress') {
            const { step: stepKey, status, current, total, created, existing, label } = data

            setStepProgress(prev => ({
              ...prev,
              [stepKey]: {
                status: status === 'complete' ? 'complete' : 'in_progress',
                current: current ?? prev[stepKey]?.current ?? 0,
                total: total ?? prev[stepKey]?.total ?? 0,
                created,
                existing,
                label,
              }
            }))
          } else if (data.type === 'complete') {
            eventSource.close()
            setImportResults(data.results)
            setStep("complete")
            if (onComplete) {
              onComplete()
            }
          } else if (data.type === 'error') {
            eventSource.close()
            setError(t("Unable to complete the import. Please try again."))
            setStep("preview")
          }
        } catch (parseError) {
          console.error("[Import] Error parsing SSE data:", parseError)
        }
      }

      eventSource.onerror = (err) => {
        console.error("[Import] SSE error:", err)
        eventSource.close()
        setError(t("Connection lost. Please try again."))
        setStep("preview")
      }

    } catch (err: any) {
      console.error("[Import] Import error:", err)
      setError(t("Unable to complete the import. Please try again."))
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
    setPreviewData(null)
    setImportResults(null)
    setError(null)
    setIsLoading(false)
    setStepProgress({
      setup: { status: 'pending', current: 0, total: 1 },
      parsing: { status: 'pending', current: 0, total: 1 },
      brands: { status: 'pending', current: 0, total: 0 },
      manufacturers: { status: 'pending', current: 0, total: 0 },
      models: { status: 'pending', current: 0, total: 0 },
      categories: { status: 'pending', current: 0, total: 0 },
      products: { status: 'pending', current: 0, total: 0 },
    })
    onClose()
  }

  const resetToUpload = () => {
    setStep("upload")
    setSelectedFile(null)
    setUploadedFilePath("")
    setPreviewData(null)
    setError(null)
  }

  if (!isOpen) return null

  const wizardSteps = [
    { key: "upload", label: t("Upload") },
    { key: "preview", label: t("Preview") },
    { key: "importing", label: t("Import") },
    { key: "complete", label: t("Done") },
  ]

  const currentStepIndex = wizardSteps.findIndex(s => s.key === step)

  // Progress row component
  const ProgressRow = ({ stepKey, icon: Icon, label, color }: { stepKey: string, icon: any, label: string, color: string }) => {
    const progress = stepProgress[stepKey]
    if (!progress) return null

    const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.875rem 1rem",
          background: progress.status === 'in_progress'
            ? (mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
            : 'transparent',
          borderRadius: "10px",
          transition: "all 0.3s ease",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: progress.status === 'complete'
              ? `${COLORS.success}15`
              : progress.status === 'in_progress'
                ? `${color}15`
                : (mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s",
          }}
        >
          {progress.status === 'complete' ? (
            <CheckCircle size={18} color={COLORS.success} />
          ) : progress.status === 'in_progress' ? (
            <Loader2 size={18} color={color} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Circle size={18} color={colors.textSecondary} style={{ opacity: 0.4 }} />
          )}
        </div>

        {/* Label and progress */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
            <span style={{
              fontSize: "0.875rem",
              fontWeight: progress.status === 'in_progress' ? "600" : "500",
              color: progress.status === 'pending' ? colors.textSecondary : colors.textPrimary,
            }}>
              {label}
            </span>
            {progress.status !== 'pending' && progress.total > 0 && (
              <span style={{
                fontSize: "0.75rem",
                fontWeight: "500",
                color: progress.status === 'complete' ? COLORS.success : color,
              }}>
                {progress.status === 'complete'
                  ? `${progress.created || 0} created`
                  : `${progress.current}/${progress.total}`
                }
              </span>
            )}
          </div>

          {/* Progress bar */}
          {progress.total > 0 && (
            <div
              style={{
                height: "4px",
                background: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress.status === 'complete' ? 100 : percentage}%`,
                  background: progress.status === 'complete' ? COLORS.success : color,
                  borderRadius: "2px",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

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
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .modal-enter { animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
          .stat-card { transition: all 0.2s ease; }
          .stat-card:hover { transform: translateY(-2px); }
        `}
      </style>

      <div
        className="modal-enter"
        style={{
          background: colors.card,
          borderRadius: "20px",
          width: "90%",
          maxWidth: "680px",
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
                background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${colors.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileSpreadsheet size={24} color={colors.action} />
            </div>
            <div>
              <h2 style={{
                fontSize: "1.25rem",
                fontWeight: "700",
                color: colors.textPrimary,
                margin: 0,
                letterSpacing: "-0.02em"
              }}>
                {t("Import Data")}
              </h2>
              <p style={{
                fontSize: "0.875rem",
                color: colors.textSecondary,
                margin: 0,
                marginTop: "2px"
              }}>
                {step === "upload" && t("Upload your Excel file")}
                {step === "preview" && t("Review before importing")}
                {step === "importing" && t("Processing your data...")}
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
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
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
                        ? (idx === currentStepIndex ? colors.action : COLORS.success)
                        : (mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: idx <= currentStepIndex ? "#fff" : colors.textSecondary,
                      transition: "all 0.3s",
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
                      ? COLORS.success
                      : (mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                    marginLeft: "0.75rem",
                    borderRadius: "1px",
                    transition: "all 0.3s",
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
                background: `${COLORS.error}10`,
                border: `1px solid ${COLORS.error}30`,
                borderRadius: "12px",
                padding: "1rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <AlertCircle size={20} color={COLORS.error} />
              <span style={{ color: COLORS.error, fontSize: "0.875rem", fontWeight: "500" }}>{error}</span>
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
                  border: `2px dashed ${isLoading ? colors.action : colors.border}`,
                  borderRadius: "16px",
                  padding: "3rem 2rem",
                  textAlign: "center",
                  cursor: isLoading ? "default" : "pointer",
                  transition: "all 0.2s",
                  background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                }}
                onMouseEnter={(e) => !isLoading && (e.currentTarget.style.borderColor = colors.action)}
                onMouseLeave={(e) => !isLoading && (e.currentTarget.style.borderColor = colors.border)}
              >
                {isLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                    <Loader2 size={48} color={colors.action} style={{ animation: "spin 1s linear infinite" }} />
                    <p style={{ color: colors.textSecondary, margin: 0, fontWeight: "500" }}>{t("Analyzing file...")}</p>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "18px",
                        background: `${colors.action}10`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 1.25rem",
                      }}
                    >
                      <Upload size={32} color={colors.action} />
                    </div>
                    <p style={{
                      fontSize: "1.125rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                      letterSpacing: "-0.01em"
                    }}>
                      {t("Drop your file here or click to browse")}
                    </p>
                    <p style={{ fontSize: "0.875rem", color: colors.textSecondary, margin: 0 }}>
                      {t("Supports .xlsx and .xls files up to 50MB")}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && previewData && (
            <div>
              {/* File Info */}
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
                  background: `${COLORS.success}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <FileSpreadsheet size={20} color={COLORS.success} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: "600", color: colors.textPrimary, fontSize: "0.9rem" }}>
                    {selectedFile?.name}
                  </span>
                  <p style={{ fontSize: "0.75rem", color: colors.textSecondary, margin: 0, marginTop: "2px" }}>
                    {t("File parsed successfully")}
                  </p>
                </div>
                <CheckCircle size={20} color={COLORS.success} />
              </div>

              {/* Summary Stats Grid */}
              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  {t("Data Found")}
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                  {[
                    { icon: Package, color: COLORS.products, value: previewData.summary.items, label: t("Products") },
                    { icon: FolderTree, color: COLORS.categories, value: previewData.summary.groups + previewData.summary.subGroups, label: t("Categories") },
                    { icon: Tags, color: COLORS.brands, value: previewData.summary.brands, label: t("Brands") },
                    { icon: Factory, color: COLORS.manufacturers, value: previewData.summary.manufacturers, label: t("Manufacturers") },
                    { icon: Box, color: COLORS.models, value: previewData.summary.models, label: t("Models") },
                    { icon: Users, color: COLORS.custodians, value: previewData.summary.custodians, label: t("Custodians") },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="stat-card"
                      style={{
                        background: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                        border: `1px solid ${colors.border}`,
                        borderRadius: "12px",
                        padding: "1rem",
                        textAlign: "center",
                      }}
                    >
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: `${item.color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 0.5rem",
                      }}>
                        <item.icon size={18} color={item.color} />
                      </div>
                      <div style={{
                        fontSize: "1.5rem",
                        fontWeight: "700",
                        color: colors.textPrimary,
                        lineHeight: "1"
                      }}>
                        {item.value}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: colors.textSecondary, marginTop: "0.25rem" }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: Importing - with progress tracking */}
          {step === "importing" && (
            <div>
              <div style={{
                background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                borderRadius: "12px",
                border: `1px solid ${colors.border}`,
                overflow: "hidden",
              }}>
                {IMPORT_STEPS.map((s, idx) => (
                  <div key={s.key}>
                    <ProgressRow stepKey={s.key} icon={s.icon} label={s.label} color={s.color} />
                    {idx < IMPORT_STEPS.length - 1 && (
                      <div style={{ height: "1px", background: colors.border, marginLeft: "3.5rem" }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Complete */}
          {step === "complete" && importResults && (
            <div>
              {/* Success Header */}
              <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                <div style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "16px",
                  background: `${COLORS.success}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}>
                  <CheckCircle size={32} color={COLORS.success} />
                </div>
                <h3 style={{
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  color: colors.textPrimary,
                  marginBottom: "0.25rem",
                  letterSpacing: "-0.02em"
                }}>
                  {t("Import Complete!")}
                </h3>
                <p style={{ fontSize: "0.875rem", color: colors.textSecondary }}>
                  {t("Completed in")} {(importResults.duration / 1000).toFixed(1)}s
                </p>
              </div>

              {/* Results Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
                {[
                  { value: importResults.summary.productsCreated, label: t("Products"), color: COLORS.products },
                  { value: importResults.summary.brandsCreated, label: t("Brands"), color: COLORS.brands },
                  { value: importResults.summary.manufacturersCreated, label: t("Manufacturers"), color: COLORS.manufacturers },
                  { value: importResults.summary.modelsCreated, label: t("Models"), color: COLORS.models },
                  { value: importResults.summary.groupsCreated + importResults.summary.subGroupsCreated, label: t("Categories"), color: COLORS.categories },
                  { value: importResults.summary.productsExisting, label: t("Skipped"), color: COLORS.custodians },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="stat-card"
                    style={{
                      background: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                      border: `1px solid ${colors.border}`,
                      borderRadius: "12px",
                      padding: "1rem",
                      textAlign: "center",
                    }}
                  >
                    <div style={{
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      color: item.color,
                      lineHeight: "1"
                    }}>
                      {item.value}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: colors.textSecondary, marginTop: "0.25rem" }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Errors if any */}
              {importResults.summary.totalErrors > 0 && (
                <div style={{
                  background: `${COLORS.error}10`,
                  border: `1px solid ${COLORS.error}30`,
                  borderRadius: "12px",
                  padding: "1rem",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}>
                  <AlertCircle size={20} color={COLORS.error} />
                  <span style={{ color: COLORS.error, fontSize: "0.875rem", fontWeight: "500" }}>
                    {importResults.summary.totalErrors} {t("errors occurred during import")}
                  </span>
                </div>
              )}
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

          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={resetToUpload}
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
                  background: colors.action,
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
                background: COLORS.success,
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
