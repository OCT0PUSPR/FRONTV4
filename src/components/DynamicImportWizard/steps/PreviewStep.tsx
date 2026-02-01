"use client"

import { useTranslation } from "react-i18next"
import { Database, Layers, Hash, AlertCircle, ArrowRight, CheckCircle2, GitBranch } from "lucide-react"
import { useTheme } from "../../../../context/theme"
import type { ModelConfiguration, FileAnalysis } from "../types/import.types"
import { IMPORT_COLORS } from "../types/import.types"

interface PreviewStepProps {
  configurations: ModelConfiguration[]
  analysis: FileAnalysis | null
  error: string | null
}

export function PreviewStep({ configurations, analysis, error }: PreviewStepProps) {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()

  const totalRecords = configurations.reduce((sum, config) => {
    const sheet = analysis?.sheets.find(s => s.sheetName === config.sheetName)
    return sum + (sheet?.recordCount || 0)
  }, 0)

  const totalFields = configurations.reduce((sum, config) => sum + config.fields.length, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: `${IMPORT_COLORS.error}10`,
            border: `1px solid ${IMPORT_COLORS.error}30`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertCircle size={20} color={IMPORT_COLORS.error} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem', color: IMPORT_COLORS.error }}>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: `${IMPORT_COLORS.models}10`,
            border: `1px solid ${IMPORT_COLORS.models}20`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Database size={20} color={IMPORT_COLORS.models} />
            <span style={{ fontSize: '0.8rem', fontWeight: '500', color: IMPORT_COLORS.models }}>
              {t('Models')}
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: colors.textPrimary }}>
            {configurations.length}
          </div>
        </div>

        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: `${IMPORT_COLORS.fields}10`,
            border: `1px solid ${IMPORT_COLORS.fields}20`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Layers size={20} color={IMPORT_COLORS.fields} />
            <span style={{ fontSize: '0.8rem', fontWeight: '500', color: IMPORT_COLORS.fields }}>
              {t('Fields')}
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: colors.textPrimary }}>
            {totalFields}
          </div>
        </div>

        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: `${IMPORT_COLORS.data}10`,
            border: `1px solid ${IMPORT_COLORS.data}20`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Hash size={20} color={IMPORT_COLORS.data} />
            <span style={{ fontSize: '0.8rem', fontWeight: '500', color: IMPORT_COLORS.data }}>
              {t('Records')}
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: colors.textPrimary }}>
            {totalRecords.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Import Order */}
      <div>
        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: colors.textPrimary, margin: '0 0 1rem' }}>
          {t('Import Order')}
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {configurations.map((config, idx) => {
            const sheet = analysis?.sheets.find(s => s.sheetName === config.sheetName)
            return (
              <div
                key={config.sheetName}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '10px',
                  background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${colors.border}`,
                }}
              >
                {/* Step Number */}
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: IMPORT_COLORS.primary,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </div>

                {/* Model Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: colors.textPrimary }}>
                      {config.sheetName}
                    </span>
                    <ArrowRight size={14} color={colors.textSecondary} />
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        color: IMPORT_COLORS.models,
                        background: `${IMPORT_COLORS.models}10`,
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                      }}
                    >
                      {config.modelName}
                    </span>
                    {config.isDualColumn && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: '#0891b2',
                          background: 'rgba(8,145,178,0.1)',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <Layers size={12} />
                        {t('Dual-column')}
                      </span>
                    )}
                    {config.parentField && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: '#8b5cf6',
                          background: 'rgba(139,92,246,0.1)',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <GitBranch size={12} />
                        {t('Hierarchical')}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.375rem' }}>
                    <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                      {config.fields.length} {t('fields')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                      {(sheet?.recordCount || 0).toLocaleString()} {t('records')}
                    </span>
                  </div>
                </div>

                {/* Ready Icon */}
                <CheckCircle2 size={20} color={IMPORT_COLORS.success} style={{ flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* What will happen */}
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${colors.border}`,
        }}
      >
        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: colors.textPrimary, margin: '0 0 1rem' }}>
          {t('What will happen')}
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { step: 1, text: t('Create models if they don\'t exist') },
            { step: 2, text: t('Add custom fields (x_*) to each model') },
            { step: 3, text: t('Create access rights for full CRUD operations') },
            { step: 4, text: t('Generate tree and form views for each model') },
            { step: 5, text: t('Import data records with parent-child linking') },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: colors.textSecondary,
                }}
              >
                {step}
              </div>
              <span style={{ fontSize: '0.85rem', color: colors.textSecondary }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Warning */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          background: `${IMPORT_COLORS.warning}10`,
          border: `1px solid ${IMPORT_COLORS.warning}30`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
        }}
      >
        <AlertCircle size={20} color={IMPORT_COLORS.warning} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: colors.textPrimary, display: 'block' }}>
            {t('Please review carefully')}
          </span>
          <span style={{ fontSize: '0.8rem', color: colors.textSecondary }}>
            {t('This will create models and import data into your database. Existing records with matching codes/names will be skipped.')}
          </span>
        </div>
      </div>
    </div>
  )
}

export default PreviewStep
