"use client"

import { useTranslation } from "react-i18next"
import { FileSpreadsheet, GitBranch, Layers, List, Check, Hash } from "lucide-react"
import { useTheme } from "../../../../context/theme"
import type { DetectedSheet, PatternType } from "../types/import.types"
import { IMPORT_COLORS, PATTERN_DESCRIPTIONS } from "../types/import.types"

interface DiscoveryStepProps {
  sheets: DetectedSheet[]
  selectedSheets: string[]
  onSheetSelectionChange: (sheetName: string, selected: boolean) => void
}

const PatternIcon = ({ pattern }: { pattern: PatternType }) => {
  switch (pattern) {
    case 'hierarchical':
      return <GitBranch size={16} />
    case 'dual-column':
    case 'dual-column-parent':
    case 'dual-column-child':
      return <Layers size={16} />
    default:
      return <List size={16} />
  }
}

const PatternBadge = ({ pattern, colors, mode }: { pattern: PatternType; colors: any; mode: string }) => {
  const { t } = useTranslation()

  const patternColors: Record<PatternType, string> = {
    'hierarchical': '#8b5cf6',
    'dual-column': '#0891b2',
    'dual-column-parent': '#059669', // green for parent
    'dual-column-child': '#0891b2', // cyan for child
    'flat': '#64748b',
  }

  const patternLabels: Record<PatternType, string> = {
    'hierarchical': 'Hierarchical',
    'dual-column': 'Dual-Column',
    'dual-column-parent': 'Parent Model',
    'dual-column-child': 'Child Model',
    'flat': 'Flat',
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.25rem 0.625rem',
        borderRadius: '6px',
        background: `${patternColors[pattern]}15`,
        color: patternColors[pattern],
        fontSize: '0.75rem',
        fontWeight: '500',
      }}
    >
      <PatternIcon pattern={pattern} />
      {t(patternLabels[pattern])}
    </div>
  )
}

export function DiscoveryStep({ sheets, selectedSheets, onSheetSelectionChange }: DiscoveryStepProps) {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()

  const handleToggleAll = () => {
    const allSelected = sheets.every(s => selectedSheets.includes(s.sheetName))
    if (allSelected) {
      sheets.forEach(s => onSheetSelectionChange(s.sheetName, false))
    } else {
      sheets.forEach(s => onSheetSelectionChange(s.sheetName, true))
    }
  }

  const allSelected = sheets.every(s => selectedSheets.includes(s.sheetName))
  const someSelected = selectedSheets.length > 0 && !allSelected

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: 0 }}>
            {t('Found {{count}} sheets in your file. Select which ones to import.', { count: sheets.length })}
          </p>
        </div>
        <button
          onClick={handleToggleAll}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            fontWeight: '500',
            color: colors.textPrimary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {allSelected ? t('Deselect All') : t('Select All')}
        </button>
      </div>

      {/* Selection Summary */}
      <div
        style={{
          padding: '0.875rem 1rem',
          borderRadius: '10px',
          background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${colors.border}`,
        }}
      >
        <span style={{ fontSize: '0.875rem', fontWeight: '500', color: selectedSheets.length > 0 ? IMPORT_COLORS.success : colors.textPrimary }}>
          {selectedSheets.length} {t('of')} {sheets.length} {t('sheets selected for import')}
        </span>
      </div>

      {/* Sheets Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sheets.map((sheet) => {
          const isSelected = selectedSheets.includes(sheet.sheetName)

          return (
            <div
              key={sheet.sheetName}
              onClick={() => onSheetSelectionChange(sheet.sheetName, !isSelected)}
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: `1px solid ${isSelected ? IMPORT_COLORS.primary : colors.border}`,
                background: isSelected
                  ? `${IMPORT_COLORS.primary}08`
                  : (mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff'),
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                {/* Checkbox */}
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    border: `2px solid ${isSelected ? IMPORT_COLORS.primary : colors.border}`,
                    background: isSelected ? IMPORT_COLORS.primary : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                    transition: 'all 0.2s',
                  }}
                >
                  {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                </div>

                {/* Sheet Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileSpreadsheet size={16} color={IMPORT_COLORS.primary} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: colors.textPrimary,
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {sheet.displayName || sheet.sheetName}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.8rem', color: colors.textSecondary }}>
                          → x_{sheet.suggestedModelName}
                        </span>
                        {sheet.sourceSheetName && (
                          <span style={{ fontSize: '0.7rem', color: colors.textSecondary, opacity: 0.7 }}>
                            ({t('from')} {sheet.sourceSheetName})
                          </span>
                        )}
                      </div>
                    </div>
                    <PatternBadge pattern={sheet.pattern} colors={colors} mode={mode} />
                  </div>

                  {/* Stats Row */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Hash size={14} color={colors.textSecondary} />
                      <span style={{ fontSize: '0.8rem', color: colors.textSecondary }}>
                        {sheet.recordCount.toLocaleString()} {t('records')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Layers size={14} color={colors.textSecondary} />
                      <span style={{ fontSize: '0.8rem', color: colors.textSecondary }}>
                        {sheet.columns.length} {t('columns')}
                      </span>
                    </div>
                    {sheet.pattern === 'hierarchical' && sheet.patternDetails.hasParent && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <GitBranch size={14} color="#8b5cf6" />
                        <span style={{ fontSize: '0.8rem', color: '#8b5cf6' }}>
                          {t('Has parent-child')}
                        </span>
                      </div>
                    )}
                    {sheet.pattern === 'dual-column' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Layers size={14} color="#0891b2" />
                        <span style={{ fontSize: '0.8rem', color: '#0891b2' }}>
                          {sheet.patternDetails.parentNameColumn} → {sheet.patternDetails.childNameColumn}
                        </span>
                      </div>
                    )}
                    {sheet.pattern === 'dual-column-parent' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Layers size={14} color="#059669" />
                        <span style={{ fontSize: '0.8rem', color: '#059669' }}>
                          {t('Distinct values from')} {sheet.patternDetails.parentNameColumn}
                        </span>
                      </div>
                    )}
                    {sheet.pattern === 'dual-column-child' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <GitBranch size={14} color="#0891b2" />
                        <span style={{ fontSize: '0.8rem', color: '#0891b2' }}>
                          {t('References')} {sheet.patternDetails.parentModelName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Column Preview */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.375rem',
                    marginTop: '0.75rem',
                  }}>
                    {sheet.columns.slice(0, 6).map((col, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          fontSize: '0.7rem',
                          color: colors.textSecondary,
                          fontFamily: 'monospace',
                        }}
                      >
                        {col.name}
                      </span>
                    ))}
                    {sheet.columns.length > 6 && (
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.7rem',
                          color: colors.textSecondary,
                        }}
                      >
                        +{sheet.columns.length - 6} {t('more')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {sheets.length === 0 && (
        <div
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            borderRadius: '12px',
            background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            border: `1px solid ${colors.border}`,
          }}
        >
          <FileSpreadsheet size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: colors.textPrimary, margin: '0 0 0.5rem' }}>
            {t('No sheets found')}
          </h3>
          <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: 0 }}>
            {t('The uploaded file does not contain any valid sheets.')}
          </p>
        </div>
      )}
    </div>
  )
}

export default DiscoveryStep
