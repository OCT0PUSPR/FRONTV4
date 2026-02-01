"use client"

import { useTranslation } from "react-i18next"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Layers,
  Hash,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"
import { useTheme } from "../../../../context/theme"
import type { ImportResults } from "../types/import.types"
import { IMPORT_COLORS } from "../types/import.types"

interface CompleteStepProps {
  results: ImportResults
}

export function CompleteStep({ results }: CompleteStepProps) {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set())

  const hasErrors = results.summary.totalErrors > 0
  const isPartialSuccess = results.success && hasErrors

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const toggleModel = (modelKey: string) => {
    setExpandedModels(prev => {
      const next = new Set(prev)
      if (next.has(modelKey)) {
        next.delete(modelKey)
      } else {
        next.add(modelKey)
      }
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Success/Error Header */}
      <div
        style={{
          padding: '2rem',
          borderRadius: '16px',
          background: results.success
            ? `linear-gradient(135deg, ${IMPORT_COLORS.success}15, ${IMPORT_COLORS.success}05)`
            : `linear-gradient(135deg, ${IMPORT_COLORS.error}15, ${IMPORT_COLORS.error}05)`,
          border: `1px solid ${results.success ? `${IMPORT_COLORS.success}30` : `${IMPORT_COLORS.error}30`}`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: results.success ? IMPORT_COLORS.success : IMPORT_COLORS.error,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          {results.success ? (
            <CheckCircle2 size={32} color="#fff" />
          ) : (
            <XCircle size={32} color="#fff" />
          )}
        </div>

        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: colors.textPrimary,
          margin: '0 0 0.5rem',
        }}>
          {results.success
            ? (isPartialSuccess ? t('Import Completed with Warnings') : t('Import Successful!'))
            : t('Import Failed')
          }
        </h2>

        <p style={{ fontSize: '0.9rem', color: colors.textSecondary, margin: 0 }}>
          {results.success
            ? t('Your data has been imported successfully.')
            : t('There were errors during the import process.')
          }
        </p>

        {/* Duration */}
        <div style={{
          marginTop: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}>
          <Clock size={16} color={colors.textSecondary} />
          <span style={{ fontSize: '0.8rem', color: colors.textSecondary }}>
            {t('Duration')}: {formatDuration(results.duration)}
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff',
            border: `1px solid ${colors.border}`,
            textAlign: 'center',
          }}
        >
          <Database size={24} color={IMPORT_COLORS.models} style={{ marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.textPrimary }}>
            {results.summary.modelsCreated}
          </div>
          <div style={{ fontSize: '0.8rem', color: colors.textSecondary }}>
            {t('Models Created')}
          </div>
          {results.summary.modelsExisting > 0 && (
            <div style={{ fontSize: '0.7rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
              ({results.summary.modelsExisting} {t('existing')})
            </div>
          )}
        </div>

        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff',
            border: `1px solid ${colors.border}`,
            textAlign: 'center',
          }}
        >
          <Layers size={24} color={IMPORT_COLORS.fields} style={{ marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.textPrimary }}>
            {results.summary.fieldsCreated}
          </div>
          <div style={{ fontSize: '0.8rem', color: colors.textSecondary }}>
            {t('Fields Created')}
          </div>
        </div>

        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff',
            border: `1px solid ${colors.border}`,
            textAlign: 'center',
          }}
        >
          <Hash size={24} color={IMPORT_COLORS.data} style={{ marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.textPrimary }}>
            {results.summary.recordsCreated.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: colors.textSecondary }}>
            {t('Records Created')}
          </div>
          {results.summary.recordsExisting > 0 && (
            <div style={{ fontSize: '0.7rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
              ({results.summary.recordsExisting.toLocaleString()} {t('skipped')})
            </div>
          )}
        </div>
      </div>

      {/* Errors Warning */}
      {results.summary.totalErrors > 0 && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: `${IMPORT_COLORS.warning}10`,
            border: `1px solid ${IMPORT_COLORS.warning}30`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertTriangle size={20} color={IMPORT_COLORS.warning} />
          <span style={{ fontSize: '0.875rem', color: colors.textPrimary }}>
            {results.summary.totalErrors} {t('errors occurred during import')}
          </span>
        </div>
      )}

      {/* Model Details */}
      <div>
        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: colors.textPrimary, margin: '0 0 1rem' }}>
          {t('Import Details')}
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Object.entries(results.models).map(([key, model]) => {
            const hasModelErrors = model.errors.length > 0
            const isExpanded = expandedModels.has(key)

            return (
              <div
                key={key}
                style={{
                  borderRadius: '10px',
                  border: `1px solid ${hasModelErrors ? `${IMPORT_COLORS.warning}30` : colors.border}`,
                  background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff',
                  overflow: 'hidden',
                }}
              >
                <div
                  onClick={() => hasModelErrors && toggleModel(key)}
                  style={{
                    padding: '0.875rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: hasModelErrors ? 'pointer' : 'default',
                  }}
                >
                  {hasModelErrors ? (
                    <div style={{ color: colors.textSecondary }}>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  ) : (
                    <CheckCircle2 size={16} color={IMPORT_COLORS.success} />
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: colors.textPrimary }}>
                        {key}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        color: colors.textSecondary,
                      }}>
                        {model.modelName}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '1rem',
                      marginTop: '0.25rem',
                      fontSize: '0.75rem',
                      color: colors.textSecondary,
                    }}>
                      <span>{model.fieldsCreated} {t('fields')}</span>
                      <span>{model.recordsCreated} {t('created')}</span>
                      <span>{model.recordsExisting} {t('existing')}</span>
                      {hasModelErrors && (
                        <span style={{ color: IMPORT_COLORS.warning }}>
                          {model.errors.length} {t('errors')}
                        </span>
                      )}
                    </div>
                  </div>

                  {model.modelCreated && (
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      background: `${IMPORT_COLORS.success}15`,
                      fontSize: '0.7rem',
                      color: IMPORT_COLORS.success,
                    }}>
                      {t('NEW')}
                    </span>
                  )}
                </div>

                {/* Expanded Errors */}
                {isExpanded && hasModelErrors && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderTop: `1px solid ${colors.border}`,
                      background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {model.errors.slice(0, 5).map((err, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: '0.75rem',
                            color: colors.textSecondary,
                            display: 'flex',
                            gap: '0.5rem',
                          }}
                        >
                          <span style={{ color: IMPORT_COLORS.warning }}>•</span>
                          <span>
                            {err.phase && `[${err.phase}] `}
                            {err.field && `Field: ${err.field} - `}
                            {err.row && `Row ${err.row}: `}
                            {err.error}
                          </span>
                        </div>
                      ))}
                      {model.errors.length > 5 && (
                        <div style={{ fontSize: '0.75rem', color: colors.textSecondary, fontStyle: 'italic' }}>
                          ... {t('and {{count}} more', { count: model.errors.length - 5 })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Next Steps */}
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${colors.border}`,
        }}
      >
        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: colors.textPrimary, margin: '0 0 0.75rem' }}>
          {t('Next Steps')}
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
          <li style={{ fontSize: '0.85rem', color: colors.textSecondary, marginBottom: '0.375rem' }}>
            {t('Go to Settings > Technical > Models to view imported models')}
          </li>
          <li style={{ fontSize: '0.85rem', color: colors.textSecondary, marginBottom: '0.375rem' }}>
            {t('Create menu items to access your new data')}
          </li>
          <li style={{ fontSize: '0.85rem', color: colors.textSecondary }}>
            {t('Verify records in the Master Lookups page')}
          </li>
        </ul>
      </div>
    </div>
  )
}

export default CompleteStep
