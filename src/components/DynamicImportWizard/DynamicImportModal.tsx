"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { X, FileSpreadsheet, ArrowRight, ArrowLeft, Sparkles } from "lucide-react"
import { useTheme } from "../../../context/theme"
import { useAuth } from "../../../context/auth"
import { Button } from "../../../@/components/ui/button"

import { UploadStep } from "./steps/UploadStep"
import { DiscoveryStep } from "./steps/DiscoveryStep"
import { ConfigurationStep } from "./steps/ConfigurationStep"
import { PreviewStep } from "./steps/PreviewStep"
import { ImportStep } from "./steps/ImportStep"
import { CompleteStep } from "./steps/CompleteStep"

import type {
  DynamicImportModalProps,
  ImportStep as ImportStepType,
  FileAnalysis,
  ModelConfiguration,
  StepProgress,
  ImportResults,
  DetectedSheet,
  SystemModel,
  SystemField,
} from "./types/import.types"
import { IMPORT_COLORS } from "./types/import.types"
import { sanitizeErrorMessage } from "../../utils/errorSanitizer"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3006'

const WIZARD_STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'discovery', label: 'Discovery' },
  { key: 'configuration', label: 'Configure' },
  { key: 'preview', label: 'Preview' },
  { key: 'importing', label: 'Import' },
  { key: 'complete', label: 'Done' },
]

export function DynamicImportModal({ isOpen, onClose, onComplete }: DynamicImportModalProps) {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const { sessionId } = useAuth()
  const eventSourceRef = useRef<EventSource | null>(null)

  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('current_tenant_id') : null

  // Wizard state
  const [step, setStep] = useState<ImportStepType>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [filePath, setFilePath] = useState('')
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null)
  const [selectedSheets, setSelectedSheets] = useState<string[]>([])
  const [configurations, setConfigurations] = useState<ModelConfiguration[]>([])
  const [stepProgress, setStepProgress] = useState<Record<string, StepProgress>>({})
  const [results, setResults] = useState<ImportResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [existingModels, setExistingModels] = useState<SystemModel[]>([])
  const [modelFieldsCache, setModelFieldsCache] = useState<Record<string, SystemField[]>>({})

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // Generate configurations from selected sheets
  const generateConfigurations = useCallback((sheets: DetectedSheet[], selected: string[]): ModelConfiguration[] => {
    return sheets
      .filter(sheet => selected.includes(sheet.sheetName))
      .map(sheet => {
        // Determine label based on pattern type
        let modelLabel = sheet.displayName || sheet.sheetName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        if (sheet.pattern === 'dual-column-parent') {
          modelLabel = sheet.patternDetails.parentNameColumn || modelLabel
        } else if (sheet.pattern === 'dual-column-child') {
          modelLabel = sheet.patternDetails.childNameColumn?.replace(/_/g, ' ') || modelLabel
        }

        return {
          sheetName: sheet.sheetName,
          sourceSheetName: sheet.sourceSheetName || sheet.sheetName, // Actual Excel sheet
          modelName: `x_${sheet.suggestedModelName}`,
          modelLabel,
          fields: sheet.fields,
          parentField: sheet.pattern === 'hierarchical' && sheet.patternDetails.hasParent
            ? sheet.patternDetails.parentIdColumn || undefined
            : undefined,
          isDualColumn: sheet.pattern === 'dual-column',
          dualColumnConfig: sheet.pattern === 'dual-column'
            ? {
                parentIdColumn: sheet.patternDetails.parentIdColumn || null,
                parentNameColumn: sheet.patternDetails.parentNameColumn || '',
                childIdColumn: sheet.patternDetails.childIdColumn || null,
                childNameColumn: sheet.patternDetails.childNameColumn || '',
              }
            : undefined,
          // New: pass pattern info for dual-column split handling
          pattern: sheet.pattern,
          patternDetails: sheet.patternDetails,
          isDualColumnParent: sheet.isDualColumnParent,
          isDualColumnChild: sheet.isDualColumnChild,
        }
      })
  }, [])

  // Fetch existing system models
  const fetchExistingModels = useCallback(async () => {
    if (!sessionId) return

    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-import/system-models`, {
        headers: {
          'X-Session-ID': sessionId,
          'X-Tenant-ID': tenantId || '',
        },
      })
      const data = await response.json()
      if (data.success && data.models) {
        setExistingModels(data.models)
      }
    } catch (error) {
      console.error('Error fetching existing models:', error)
    }
  }, [sessionId, tenantId])

  // Fetch fields for a specific model
  const fetchModelFields = useCallback(async (modelName: string): Promise<SystemField[]> => {
    // Check cache first
    if (modelFieldsCache[modelName]) {
      return modelFieldsCache[modelName]
    }

    if (!sessionId) return []

    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-import/model-fields/${encodeURIComponent(modelName)}`, {
        headers: {
          'X-Session-ID': sessionId,
          'X-Tenant-ID': tenantId || '',
        },
      })
      const data = await response.json()
      if (data.success && data.fields) {
        setModelFieldsCache(prev => ({ ...prev, [modelName]: data.fields }))
        return data.fields
      }
    } catch (error) {
      console.error('Error fetching model fields:', error)
    }
    return []
  }, [sessionId, tenantId, modelFieldsCache])

  // Fetch existing models when entering configuration step
  useEffect(() => {
    if (step === 'configuration' && existingModels.length === 0) {
      fetchExistingModels()
    }
  }, [step, existingModels.length, fetchExistingModels])

  // Handle file upload and analysis
  const handleFileAnalyzed = useCallback((uploadedFile: File, uploadedFilePath: string, fileAnalysis: FileAnalysis) => {
    setFile(uploadedFile)
    setFilePath(uploadedFilePath)
    setAnalysis(fileAnalysis)
    // Auto-select all sheets by default
    const allSheetNames = fileAnalysis.sheets.map(s => s.sheetName)
    setSelectedSheets(allSheetNames)
    // Generate initial configurations
    setConfigurations(generateConfigurations(fileAnalysis.sheets, allSheetNames))
    setStep('discovery')
  }, [generateConfigurations])

  // Handle sheet selection change
  const handleSheetSelectionChange = useCallback((sheetName: string, selected: boolean) => {
    setSelectedSheets(prev => {
      const newSelected = selected
        ? [...prev, sheetName]
        : prev.filter(s => s !== sheetName)
      // Regenerate configurations
      if (analysis) {
        setConfigurations(generateConfigurations(analysis.sheets, newSelected))
      }
      return newSelected
    })
  }, [analysis, generateConfigurations])

  // Handle configuration update
  const handleConfigurationUpdate = useCallback((sheetName: string, updates: Partial<ModelConfiguration>) => {
    setConfigurations(prev =>
      prev.map(config =>
        config.sheetName === sheetName
          ? { ...config, ...updates }
          : config
      )
    )
  }, [])

  // Start the import process
  const handleStartImport = useCallback(async () => {
    if (!filePath || !sessionId || configurations.length === 0) {
      setError(t('Missing required data for import'))
      return
    }

    // Initialize progress for each model
    const initialProgress: Record<string, StepProgress> = {}
    for (const config of configurations) {
      initialProgress[config.sheetName] = {
        status: 'pending',
        current: 0,
        total: analysis?.sheets.find(s => s.sheetName === config.sheetName)?.recordCount || 0,
      }
    }
    setStepProgress(initialProgress)
    setStep('importing')
    setError(null)

    // Build SSE URL with query params
    const params = new URLSearchParams({
      sessionId,
      filePath,
      tenantId: tenantId || '',
      configurations: JSON.stringify(configurations),
    })

    const sseUrl = `${API_BASE_URL}/dynamic-import/stream?${params.toString()}`

    try {
      const eventSource = new EventSource(sseUrl)
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'progress') {
            const { step: stepKey, status, current, total, created, existing, label, phase } = data

            setStepProgress(prev => ({
              ...prev,
              [stepKey]: {
                status: status === 'complete' ? 'complete' : status === 'error' ? 'error' : 'in_progress',
                current: current ?? prev[stepKey]?.current ?? 0,
                total: total ?? prev[stepKey]?.total ?? 0,
                created,
                existing,
                label,
                phase,
              }
            }))
          } else if (data.type === 'complete') {
            eventSource.close()
            setResults(data.results)
            setStep('complete')
            if (onComplete) {
              onComplete()
            }
          } else if (data.type === 'error') {
            eventSource.close()
            setError(sanitizeErrorMessage(data.message || t('Import failed')))
            setStep('preview')
          }
        } catch (parseError) {
          console.error('[DynamicImport] Error parsing SSE data:', parseError)
        }
      }

      eventSource.onerror = (err) => {
        console.error('[DynamicImport] SSE error:', err)
        eventSource.close()
        setError(t('Connection lost. Please try again.'))
        setStep('preview')
      }

    } catch (err: any) {
      console.error('[DynamicImport] Import error:', err)
      setError(sanitizeErrorMessage(err?.message || t('Failed to start import')))
      setStep('preview')
    }
  }, [filePath, sessionId, tenantId, configurations, analysis, onComplete, t])

  // Handle close/reset
  const handleClose = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    setStep('upload')
    setFile(null)
    setFilePath('')
    setAnalysis(null)
    setSelectedSheets([])
    setConfigurations([])
    setStepProgress({})
    setResults(null)
    setError(null)
    setIsLoading(false)
    onClose()
  }, [onClose])

  // Navigation helpers
  const canGoBack = step === 'discovery' || step === 'configuration' || step === 'preview'
  const canGoNext = (step === 'discovery' && selectedSheets.length > 0) ||
                   (step === 'configuration' && configurations.length > 0) ||
                   step === 'preview'

  const handleBack = useCallback(() => {
    switch (step) {
      case 'discovery':
        setStep('upload')
        break
      case 'configuration':
        setStep('discovery')
        break
      case 'preview':
        setStep('configuration')
        break
    }
  }, [step])

  const handleNext = useCallback(() => {
    switch (step) {
      case 'discovery':
        setStep('configuration')
        break
      case 'configuration':
        setStep('preview')
        break
      case 'preview':
        handleStartImport()
        break
    }
  }, [step, handleStartImport])

  if (!isOpen) return null

  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.key === step)

  const getStepSubtitle = () => {
    switch (step) {
      case 'upload': return t('Upload your Excel file to begin')
      case 'discovery': return t('Select sheets to import')
      case 'configuration': return t('Configure models and fields')
      case 'preview': return t('Review before importing')
      case 'importing': return t('Processing your data...')
      case 'complete': return t('Import completed')
      default: return ''
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
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
          borderRadius: '20px',
          width: '95%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${colors.border}`,
          boxShadow: mode === 'dark'
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            {step === 'complete' ? (
              <Sparkles size={26} color={IMPORT_COLORS.success} />
            ) : (
              <FileSpreadsheet size={26} color={IMPORT_COLORS.primary} />
            )}
            <div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: colors.textPrimary,
                margin: 0,
                letterSpacing: '-0.02em'
              }}>
                {t('Dynamic Import Wizard')}
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: colors.textSecondary,
                margin: 0,
                marginTop: '2px'
              }}>
                {getStepSubtitle()}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              border: 'none',
              cursor: 'pointer',
              padding: '0.625rem',
              borderRadius: '10px',
              color: colors.textSecondary,
              transition: 'all 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: `1px solid ${colors.border}`,
          background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {WIZARD_STEPS.map((s, idx) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: idx < WIZARD_STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: idx <= currentStepIndex
                        ? (idx === currentStepIndex ? IMPORT_COLORS.primary : IMPORT_COLORS.success)
                        : (mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: idx <= currentStepIndex ? '#fff' : colors.textSecondary,
                      transition: 'all 0.3s',
                    }}
                  >
                    {idx < currentStepIndex ? '✓' : idx + 1}
                  </div>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: idx === currentStepIndex ? '600' : '500',
                    color: idx <= currentStepIndex ? colors.textPrimary : colors.textSecondary,
                    display: idx === currentStepIndex || idx < currentStepIndex ? 'block' : 'none',
                  }}>
                    {t(s.label)}
                  </span>
                </div>
                {idx < WIZARD_STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    background: idx < currentStepIndex
                      ? IMPORT_COLORS.success
                      : (mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                    marginLeft: '0.75rem',
                    borderRadius: '1px',
                    transition: 'all 0.3s',
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflow: 'auto', flex: 1, minHeight: '400px' }}>
          {step === 'upload' && (
            <UploadStep
              onFileAnalyzed={handleFileAnalyzed}
              error={error}
              setError={setError}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          )}

          {step === 'discovery' && analysis && (
            <DiscoveryStep
              sheets={analysis.sheets}
              selectedSheets={selectedSheets}
              onSheetSelectionChange={handleSheetSelectionChange}
            />
          )}

          {step === 'configuration' && (
            <ConfigurationStep
              configurations={configurations}
              allModelNames={configurations.map(c => c.modelName)}
              existingModels={existingModels}
              onConfigurationUpdate={handleConfigurationUpdate}
              onFetchModelFields={fetchModelFields}
            />
          )}

          {step === 'preview' && (
            <PreviewStep
              configurations={configurations}
              analysis={analysis}
              error={error}
            />
          )}

          {step === 'importing' && (
            <ImportStep
              configurations={configurations}
              stepProgress={stepProgress}
            />
          )}

          {step === 'complete' && results && (
            <CompleteStep
              results={results}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.75rem',
            background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
          }}
        >
          <div>
            {canGoBack && (
              <Button
                variant="outline"
                onClick={handleBack}
                style={{
                  background: 'transparent',
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  borderRadius: '10px',
                  padding: '0.625rem 1.25rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ArrowLeft size={16} />
                {t('Back')}
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {step === 'upload' && (
              <Button
                variant="outline"
                onClick={handleClose}
                style={{
                  background: 'transparent',
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  borderRadius: '10px',
                  padding: '0.625rem 1.25rem',
                  fontWeight: '500'
                }}
              >
                {t('Cancel')}
              </Button>
            )}

            {canGoNext && (
              <Button
                onClick={handleNext}
                disabled={isLoading}
                style={{
                  background: step === 'preview' ? IMPORT_COLORS.success : IMPORT_COLORS.primary,
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '0.625rem 1.5rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: 'none'
                }}
              >
                {step === 'preview' ? t('Start Import') : t('Next')}
                <ArrowRight size={16} />
              </Button>
            )}

            {step === 'complete' && (
              <Button
                onClick={handleClose}
                style={{
                  background: IMPORT_COLORS.success,
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '0.625rem 1.5rem',
                  fontWeight: '600',
                  border: 'none'
                }}
              >
                {t('Done')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DynamicImportModal
