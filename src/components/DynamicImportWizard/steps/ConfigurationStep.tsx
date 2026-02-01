"use client"

import { useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import {
  ChevronDown,
  ChevronRight,
  Database,
  Settings,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  Link2,
  AlignLeft,
  List,
  Plus,
  Trash2,
  Edit3,
} from "lucide-react"
import { useTheme } from "../../../../context/theme"
import { SearchableDropdown } from "../components/SearchableDropdown"
import type { ModelConfiguration, FieldConfiguration, FieldType, SystemModel, SystemField, RelationSource } from "../types/import.types"
import { IMPORT_COLORS, FIELD_TYPE_OPTIONS } from "../types/import.types"

interface ConfigurationStepProps {
  configurations: ModelConfiguration[]
  allModelNames: string[]
  existingModels: SystemModel[]
  onConfigurationUpdate: (sheetName: string, updates: Partial<ModelConfiguration>) => void
  onFetchModelFields: (modelName: string) => Promise<SystemField[]>
}

const FieldTypeIcon = ({ type }: { type: FieldType }) => {
  switch (type) {
    case 'char':
      return <Type size={14} />
    case 'text':
      return <AlignLeft size={14} />
    case 'integer':
    case 'float':
      return <Hash size={14} />
    case 'date':
    case 'datetime':
      return <Calendar size={14} />
    case 'boolean':
      return <ToggleLeft size={14} />
    case 'many2one':
      return <Link2 size={14} />
    case 'selection':
      return <List size={14} />
    default:
      return <Type size={14} />
  }
}

interface ModelCardProps {
  config: ModelConfiguration
  allConfigurations: ModelConfiguration[]
  allModelNames: string[]
  existingModels: SystemModel[]
  onUpdate: (updates: Partial<ModelConfiguration>) => void
  onFetchModelFields: (modelName: string) => Promise<SystemField[]>
  isExpanded: boolean
  onToggle: () => void
  colors: any
  mode: string
}

function ModelCard({ config, allConfigurations, allModelNames, existingModels, onUpdate, onFetchModelFields, isExpanded, onToggle, colors, mode }: ModelCardProps) {
  const { t } = useTranslation()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [modelFields, setModelFields] = useState<Record<string, SystemField[]>>({})
  const [loadingFields, setLoadingFields] = useState<string | null>(null)

  const handleModelNameChange = (value: string) => {
    // Ensure x_ prefix
    let name = value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    if (!name.startsWith('x_')) {
      name = `x_${name}`
    }
    onUpdate({ modelName: name })
  }

  const handleModelLabelChange = (value: string) => {
    onUpdate({ modelLabel: value })
  }

  const handleFieldUpdate = (idx: number, updates: Partial<FieldConfiguration>) => {
    const newFields = [...config.fields]
    newFields[idx] = { ...newFields[idx], ...updates }
    onUpdate({ fields: newFields })
  }

  const handleFieldTypeChange = (idx: number, fieldType: FieldType) => {
    const updates: Partial<FieldConfiguration> = { fieldType }
    // Clear relation if not many2one
    if (fieldType !== 'many2one') {
      updates.relation = undefined
      updates.relationSource = undefined
      updates.relationField = undefined
    }
    handleFieldUpdate(idx, updates)
  }

  // Fetch fields for a model when selected
  const fetchFieldsForModel = async (modelName: string) => {
    if (modelFields[modelName]) return // Already fetched

    setLoadingFields(modelName)
    try {
      const fields = await onFetchModelFields(modelName)
      setModelFields(prev => ({ ...prev, [modelName]: fields }))
    } catch (error) {
      console.error('Error fetching fields for model:', modelName, error)
    } finally {
      setLoadingFields(null)
    }
  }

  // Get fields for new models (from configurations)
  const getFieldsForNewModel = (modelName: string): SystemField[] => {
    const modelConfig = allModelNames.includes(modelName)
      ? config.fields // Current model
      : null

    // Find the configuration for this model
    // Since we're in ModelCard, we need to look at the parent configurations
    // For simplicity, return common fields for new models
    return [
      { name: 'id', string: 'ID', type: 'integer' },
      { name: 'x_name', string: 'Name', type: 'char' },
      { name: 'x_code', string: 'Code', type: 'char' },
    ]
  }

  const handleRelationSourceChange = (idx: number, source: RelationSource) => {
    handleFieldUpdate(idx, {
      relationSource: source,
      relation: undefined,
      relationField: undefined
    })
  }

  const handleRelationModelChange = async (idx: number, modelName: string) => {
    const field = config.fields[idx]
    handleFieldUpdate(idx, {
      relation: modelName,
      relationField: 'id' // Default to id
    })

    // Fetch fields if it's an existing model
    if (field.relationSource === 'existing') {
      await fetchFieldsForModel(modelName)
    }
  }

  const handleRelationFieldChange = (idx: number, fieldName: string) => {
    handleFieldUpdate(idx, { relationField: fieldName })
  }

  const handleAddField = () => {
    const newField: FieldConfiguration = {
      excelColumn: '',
      odooFieldName: 'x_new_field',
      fieldLabel: 'New Field',
      fieldType: 'char',
      required: false,
    }
    onUpdate({ fields: [...config.fields, newField] })
  }

  const handleRemoveField = (idx: number) => {
    const newFields = config.fields.filter((_, i) => i !== idx)
    onUpdate({ fields: newFields })
  }

  return (
    <div
      style={{
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff',
      }}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          cursor: 'pointer',
          background: isExpanded
            ? (mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')
            : 'transparent',
          borderBottom: isExpanded ? `1px solid ${colors.border}` : 'none',
        }}
      >
        <div style={{ color: colors.textSecondary }}>
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: '600', color: colors.textPrimary }}>
              {config.sheetName}
            </span>
            <span style={{
              fontSize: '0.8rem',
              color: colors.textSecondary,
              fontFamily: 'monospace',
              background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              padding: '0.125rem 0.5rem',
              borderRadius: '4px',
            }}>
              → {config.modelName}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
              {config.fields.length} {t('fields')}
            </span>
            {config.isDualColumn && (
              <span style={{ fontSize: '0.75rem', color: '#0891b2' }}>
                {t('Dual-column')}
              </span>
            )}
            {config.parentField && (
              <span style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>
                {t('Hierarchical')}
              </span>
            )}
          </div>
        </div>

        <Settings size={16} color={colors.textSecondary} style={{ opacity: 0.5 }} />
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ padding: '1.25rem' }}>
          {/* Model Settings */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
            padding: '1rem',
            borderRadius: '10px',
            background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '500', color: colors.textSecondary, display: 'block', marginBottom: '0.375rem' }}>
                {t('Model Name')}
              </label>
              <input
                type="text"
                value={config.modelName}
                onChange={(e) => handleModelNameChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.card,
                  color: colors.textPrimary,
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '500', color: colors.textSecondary, display: 'block', marginBottom: '0.375rem' }}>
                {t('Display Label')}
              </label>
              <input
                type="text"
                value={config.modelLabel}
                onChange={(e) => handleModelLabelChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.card,
                  color: colors.textPrimary,
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          {/* Fields Table */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: colors.textPrimary, margin: 0 }}>
                {t('Field Mapping')}
              </h4>
              <button
                onClick={handleAddField}
                style={{
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <Plus size={14} />
                {t('Add Field')}
              </button>
            </div>

            <div style={{
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
            }}>
              {/* Header Row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 140px 60px 80px',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' }}>
                  {t('Excel Column')}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' }}>
                  {t('Target Field')}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' }}>
                  {t('Type')}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' }}>
                  {t('Req.')}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' }}>
                  {t('Actions')}
                </span>
              </div>

              {/* Field Rows */}
              {config.fields.map((field, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 140px 60px 80px',
                    gap: '0.5rem',
                    padding: '0.625rem 1rem',
                    alignItems: 'center',
                    borderBottom: idx < config.fields.length - 1 ? `1px solid ${colors.border}` : 'none',
                    background: editingField === `${idx}` ? (mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') : 'transparent',
                  }}
                >
                  {/* Excel Column */}
                  <div style={{
                    fontSize: '0.8rem',
                    color: colors.textSecondary,
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {field.excelColumn || '-'}
                  </div>

                  {/* Target Field Name */}
                  {editingField === `${idx}` ? (
                    <input
                      type="text"
                      value={field.odooFieldName}
                      onChange={(e) => handleFieldUpdate(idx, { odooFieldName: e.target.value })}
                      onBlur={() => setEditingField(null)}
                      autoFocus
                      style={{
                        padding: '0.375rem 0.5rem',
                        borderRadius: '6px',
                        border: `1px solid ${IMPORT_COLORS.primary}`,
                        background: colors.card,
                        color: colors.textPrimary,
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        width: '100%',
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => setEditingField(`${idx}`)}
                      style={{
                        fontSize: '0.8rem',
                        color: colors.textPrimary,
                        fontFamily: 'monospace',
                        cursor: 'text',
                        padding: '0.375rem 0.5rem',
                        borderRadius: '6px',
                        background: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {field.odooFieldName}
                    </div>
                  )}

                  {/* Field Type */}
                  <SearchableDropdown
                    options={FIELD_TYPE_OPTIONS.map(opt => ({
                      value: opt.value,
                      label: opt.label,
                    }))}
                    value={field.fieldType}
                    onChange={(value) => handleFieldTypeChange(idx, value as FieldType)}
                    placeholder={t('Select type...')}
                    searchPlaceholder={t('Search types...')}
                  />

                  {/* Required */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => handleFieldUpdate(idx, { required: e.target.checked })}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center' }}>
                    <button
                      onClick={() => setEditingField(`${idx}`)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '0.375rem',
                        cursor: 'pointer',
                        color: colors.textSecondary,
                        borderRadius: '4px',
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleRemoveField(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '0.375rem',
                        cursor: 'pointer',
                        color: IMPORT_COLORS.error,
                        borderRadius: '4px',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {config.fields.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: 0 }}>
                    {t('No fields configured')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Many2One Relations */}
          {config.fields.filter(f => f.fieldType === 'many2one').length > 0 && (
            <div style={{
              padding: '1rem',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: '600', color: colors.textPrimary, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link2 size={14} color={colors.textSecondary} />
                {t('Configure Relations')}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {config.fields
                  .map((f, idx) => ({ field: f, idx }))
                  .filter(({ field }) => field.fieldType === 'many2one')
                  .map(({ field, idx }) => {
                    const relationSource = field.relationSource || 'new'
                    const availableModels = relationSource === 'new'
                      ? allModelNames.filter(m => m !== config.modelName)
                      : existingModels.map(m => m.model)

                    // Get available fields for the selected model
                    let availableFields: SystemField[] = []
                    if (field.relation) {
                      if (relationSource === 'existing') {
                        availableFields = modelFields[field.relation] || []
                      } else {
                        // For new models, get fields from the model's configuration
                        const targetConfig = allConfigurations.find(c => c.modelName === field.relation)
                        if (targetConfig) {
                          availableFields = [
                            { name: 'id', string: 'ID', type: 'integer' },
                            ...targetConfig.fields.map(f => ({
                              name: f.odooFieldName,
                              string: f.fieldLabel,
                              type: f.fieldType
                            }))
                          ]
                        } else {
                          availableFields = [{ name: 'id', string: 'ID', type: 'integer' }]
                        }
                      }
                    }

                    return (
                      <div key={idx}>
                        <div style={{ fontSize: '0.8rem', color: colors.textPrimary, fontFamily: 'monospace', marginBottom: '0.5rem' }}>
                          {field.odooFieldName}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                          {/* Source: New or Existing */}
                          <div>
                            <label style={{ fontSize: '0.7rem', color: colors.textSecondary, display: 'block', marginBottom: '0.25rem' }}>
                              {t('Source')}
                            </label>
                            <SearchableDropdown
                              options={[
                                { value: 'new', label: t('New (Import)') },
                                { value: 'existing', label: t('Existing (System)') },
                              ]}
                              value={relationSource}
                              onChange={(value) => handleRelationSourceChange(idx, value as RelationSource)}
                              placeholder={t('Select source...')}
                            />
                          </div>

                          {/* Model Selection */}
                          <div>
                            <label style={{ fontSize: '0.7rem', color: colors.textSecondary, display: 'block', marginBottom: '0.25rem' }}>
                              {t('Model')}
                            </label>
                            <SearchableDropdown
                              options={availableModels.map(model => ({
                                value: model,
                                label: relationSource === 'existing'
                                  ? (existingModels.find(m => m.model === model)?.name || model)
                                  : model,
                              }))}
                              value={field.relation || ''}
                              onChange={(value) => handleRelationModelChange(idx, value)}
                              placeholder={t('Select model...')}
                              searchPlaceholder={t('Search models...')}
                              emptyMessage={t('No models available')}
                            />
                          </div>

                          {/* Field Selection */}
                          <div>
                            <label style={{ fontSize: '0.7rem', color: colors.textSecondary, display: 'block', marginBottom: '0.25rem' }}>
                              {t('Match Field')}
                            </label>
                            <SearchableDropdown
                              options={availableFields.map(f => ({
                                value: f.name,
                                label: `${f.string} (${f.name})`,
                              }))}
                              value={field.relationField || 'id'}
                              onChange={(value) => handleRelationFieldChange(idx, value)}
                              placeholder={t('Select field...')}
                              searchPlaceholder={t('Search fields...')}
                              emptyMessage={field.relation
                                ? (loadingFields === field.relation ? t('Loading...') : t('No fields available'))
                                : t('Select a model first')
                              }
                              disabled={!field.relation}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ConfigurationStep({ configurations, allModelNames, existingModels, onConfigurationUpdate, onFetchModelFields }: ConfigurationStepProps) {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set([configurations[0]?.sheetName]))

  const handleToggle = useCallback((sheetName: string) => {
    setExpandedModels(prev => {
      const next = new Set(prev)
      if (next.has(sheetName)) {
        next.delete(sheetName)
      } else {
        next.add(sheetName)
      }
      return next
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: '0 0 0.5rem' }}>
        {t('Configure how each sheet will be imported. Click to expand and customize fields.')}
      </p>

      {configurations.map((config) => (
        <ModelCard
          key={config.sheetName}
          config={config}
          allConfigurations={configurations}
          allModelNames={allModelNames}
          existingModels={existingModels}
          onUpdate={(updates) => onConfigurationUpdate(config.sheetName, updates)}
          onFetchModelFields={onFetchModelFields}
          isExpanded={expandedModels.has(config.sheetName)}
          onToggle={() => handleToggle(config.sheetName)}
          colors={colors}
          mode={mode}
        />
      ))}

      {configurations.length === 0 && (
        <div
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            borderRadius: '12px',
            background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            border: `1px solid ${colors.border}`,
          }}
        >
          <Database size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: colors.textPrimary, margin: '0 0 0.5rem' }}>
            {t('No models to configure')}
          </h3>
          <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: 0 }}>
            {t('Go back and select sheets to import.')}
          </p>
        </div>
      )}
    </div>
  )
}

export default ConfigurationStep
