"use client"

import { useTranslation } from "react-i18next"
import { Database, CheckCircle2, Loader2, Clock, AlertCircle } from "lucide-react"
import { useTheme } from "../../../../context/theme"
import type { ModelConfiguration, StepProgress } from "../types/import.types"
import { IMPORT_COLORS } from "../types/import.types"

interface ImportStepProps {
  configurations: ModelConfiguration[]
  stepProgress: Record<string, StepProgress>
}

export function ImportStep({ configurations, stepProgress }: ImportStepProps) {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()

  const getStatusIcon = (status: StepProgress['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 size={18} color={IMPORT_COLORS.success} />
      case 'in_progress':
        return (
          <div
            style={{
              width: '18px',
              height: '18px',
              border: `2px solid ${IMPORT_COLORS.primary}30`,
              borderTopColor: IMPORT_COLORS.primary,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        )
      case 'error':
        return <AlertCircle size={18} color={IMPORT_COLORS.error} />
      default:
        return <Clock size={18} color={colors.textSecondary} />
    }
  }

  const getStatusColor = (status: StepProgress['status']) => {
    switch (status) {
      case 'complete':
        return IMPORT_COLORS.success
      case 'in_progress':
        return IMPORT_COLORS.primary
      case 'error':
        return IMPORT_COLORS.error
      default:
        return colors.textSecondary
    }
  }

  const completedCount = Object.values(stepProgress).filter(p => p.status === 'complete').length
  const totalCount = configurations.length
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>

      {/* Overall Progress */}
      <div
        style={{
          padding: '1.5rem',
          borderRadius: '14px',
          background: `linear-gradient(135deg, ${IMPORT_COLORS.primary}10, ${IMPORT_COLORS.primary}05)`,
          border: `1px solid ${IMPORT_COLORS.primary}20`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: IMPORT_COLORS.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Loader2 size={22} color="#fff" style={{ animation: 'spin 2s linear infinite' }} />
            </div>
            <div>
              <span style={{ fontSize: '1rem', fontWeight: '600', color: colors.textPrimary, display: 'block' }}>
                {t('Importing...')}
              </span>
              <span style={{ fontSize: '0.8rem', color: colors.textSecondary }}>
                {completedCount} {t('of')} {totalCount} {t('models completed')}
              </span>
            </div>
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: IMPORT_COLORS.primary,
          }}>
            {overallProgress}%
          </div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            height: '8px',
            background: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${overallProgress}%`,
              background: `linear-gradient(90deg, ${IMPORT_COLORS.primary}, ${IMPORT_COLORS.success})`,
              borderRadius: '4px',
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>
      </div>

      {/* Model Progress List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {configurations.map((config) => {
          const progress = stepProgress[config.sheetName] || { status: 'pending', current: 0, total: 0 }
          const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

          return (
            <div
              key={config.sheetName}
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                background: progress.status === 'in_progress'
                  ? (mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')
                  : (mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff'),
                border: `1px solid ${
                  progress.status === 'complete' ? `${IMPORT_COLORS.success}30` :
                  progress.status === 'in_progress' ? `${IMPORT_COLORS.primary}30` :
                  progress.status === 'error' ? `${IMPORT_COLORS.error}30` :
                  colors.border
                }`,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                {/* Status Icon */}
                <div style={{ marginTop: '2px' }}>
                  {getStatusIcon(progress.status)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: colors.textPrimary,
                    }}>
                      {config.sheetName}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      color: colors.textSecondary,
                    }}>
                      {config.modelName}
                    </span>
                  </div>

                  {/* Status Text */}
                  <div style={{
                    fontSize: '0.8rem',
                    color: getStatusColor(progress.status),
                    marginBottom: progress.status === 'in_progress' ? '0.75rem' : 0,
                  }}>
                    {progress.status === 'pending' && t('Waiting...')}
                    {progress.status === 'in_progress' && (
                      <>
                        {progress.label || t('Processing...')}
                        {progress.phase && ` (${progress.phase})`}
                        {progress.total > 0 && ` - ${progress.current}/${progress.total}`}
                      </>
                    )}
                    {progress.status === 'complete' && (
                      <>
                        {t('Complete')}
                        {(progress.created !== undefined || progress.existing !== undefined) && (
                          <span style={{ color: colors.textSecondary, fontWeight: '400' }}>
                            {' '}— {progress.created || 0} {t('created')}, {progress.existing || 0} {t('existing')}
                          </span>
                        )}
                      </>
                    )}
                    {progress.status === 'error' && t('Failed')}
                  </div>

                  {/* Progress Bar (only for in_progress) */}
                  {progress.status === 'in_progress' && progress.total > 0 && (
                    <div
                      style={{
                        height: '4px',
                        background: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPercent}%`,
                          background: IMPORT_COLORS.primary,
                          borderRadius: '2px',
                          transition: 'width 0.2s ease-out',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Stats Badge */}
                {progress.status === 'complete' && (
                  <div style={{
                    padding: '0.25rem 0.625rem',
                    borderRadius: '6px',
                    background: `${IMPORT_COLORS.success}15`,
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    color: IMPORT_COLORS.success,
                  }}>
                    ✓
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Tip */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${colors.border}`,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.8rem', color: colors.textSecondary, margin: 0 }}>
          {t('Please do not close this window. The import is being processed in the background.')}
        </p>
      </div>
    </div>
  )
}

export default ImportStep
