"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import {
  ChevronDown,
  Search,
  X,
  Loader2,
  Link2,
  AlertCircle,
  Check,
} from "lucide-react"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3006'

interface LookupOption {
  id: number
  x_name: string
  x_name_ar?: string
  x_code?: string
  [key: string]: any
}

interface FieldConfig {
  name: string
  label: string
  model: string
  parentField?: string  // Field name in this model that references the parent (e.g., 'x_category_id')
  parentModel?: string  // The model this field depends on
  required?: boolean
  placeholder?: string
}

interface HierarchicalLookupFieldProps {
  fields: FieldConfig[]
  values: Record<string, number | null>
  onChange: (fieldName: string, value: number | null) => void
  disabled?: boolean
  layout?: 'horizontal' | 'vertical' | 'grid'
  columns?: number
}

export function HierarchicalLookupField({
  fields,
  values,
  onChange,
  disabled = false,
  layout = 'grid',
  columns = 2
}: HierarchicalLookupFieldProps) {
  const { t, i18n } = useTranslation()
  const { mode, colors } = useTheme()
  const { sessionId } = useAuth()
  const isRTL = i18n.dir() === 'rtl'
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('current_tenant_id') : null

  // Track options for each field
  const [options, setOptions] = useState<Record<string, LookupOption[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({})

  // Build dependency map from fields
  const dependencyMap = useMemo(() => {
    const map: Record<string, { parentField: string; parentModel: string } | null> = {}
    fields.forEach(field => {
      if (field.parentField && field.parentModel) {
        map[field.name] = {
          parentField: field.parentField,
          parentModel: field.parentModel
        }
      } else {
        map[field.name] = null
      }
    })
    return map
  }, [fields])

  // Determine if a field is enabled (parent is selected if dependency exists)
  const isFieldEnabled = useCallback((fieldName: string): boolean => {
    if (disabled) return false
    const dependency = dependencyMap[fieldName]
    if (!dependency) return true

    // Find the parent field in our fields list that matches the parentModel
    const parentFieldConfig = fields.find(f => f.model === dependency.parentModel)
    if (!parentFieldConfig) return true

    // Check if parent has a value
    const parentValue = values[parentFieldConfig.name]
    return parentValue !== null && parentValue !== undefined && parentValue !== 0
  }, [dependencyMap, values, fields, disabled])

  // Fetch options for a field
  const fetchOptions = useCallback(async (field: FieldConfig, parentId?: number) => {
    if (!sessionId) return

    setLoading(prev => ({ ...prev, [field.name]: true }))

    try {
      let url = `${API_BASE_URL}/master-lookups/${field.model}`

      // If this field has a parent dependency, use the filtered endpoint
      if (field.parentField && parentId) {
        url = `${API_BASE_URL}/master-lookups/${field.model}/filtered?parentField=${field.parentField}&parentId=${parentId}`
      }

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || '',
          'X-Tenant-ID': tenantId || '',
        },
      })

      const data = await response.json()
      if (data.success) {
        setOptions(prev => ({ ...prev, [field.name]: data.data || [] }))
      }
    } catch (error) {
      console.error(`Error fetching options for ${field.name}:`, error)
      setOptions(prev => ({ ...prev, [field.name]: [] }))
    } finally {
      setLoading(prev => ({ ...prev, [field.name]: false }))
    }
  }, [sessionId, tenantId])

  // Fetch initial options for fields without dependencies
  useEffect(() => {
    fields.forEach(field => {
      if (!dependencyMap[field.name]) {
        // No dependency, fetch all options
        fetchOptions(field)
      }
    })
  }, [fields, fetchOptions, dependencyMap])

  // When a parent value changes, fetch child options and clear child values
  useEffect(() => {
    fields.forEach(field => {
      const dependency = dependencyMap[field.name]
      if (dependency) {
        // Find the parent field
        const parentFieldConfig = fields.find(f => f.model === dependency.parentModel)
        if (parentFieldConfig) {
          const parentValue = values[parentFieldConfig.name]
          if (parentValue) {
            // Fetch filtered options
            fetchOptions(field, parentValue)
          } else {
            // Clear options when parent is not selected
            setOptions(prev => ({ ...prev, [field.name]: [] }))
          }
        }
      }
    })
  }, [values, fields, dependencyMap, fetchOptions])

  // Handle selection
  const handleSelect = (fieldName: string, option: LookupOption | null) => {
    const newValue = option?.id || null
    onChange(fieldName, newValue)
    setOpenDropdown(null)
    setSearchTerms(prev => ({ ...prev, [fieldName]: '' }))

    // Clear dependent fields when a parent changes
    fields.forEach(field => {
      const dependency = dependencyMap[field.name]
      if (dependency) {
        const parentFieldConfig = fields.find(f => f.model === dependency.parentModel)
        if (parentFieldConfig && parentFieldConfig.name === fieldName) {
          // This field depends on the changed field, clear its value
          onChange(field.name, null)
        }
      }
    })
  }

  // Get display value for a field
  const getDisplayValue = (fieldName: string): string => {
    const value = values[fieldName]
    if (!value) return ''

    const fieldOptions = options[fieldName] || []
    const option = fieldOptions.find(o => o.id === value)
    if (option) {
      return isRTL && option.x_name_ar ? option.x_name_ar : option.x_name
    }
    return `#${value}`
  }

  // Filter options by search term
  const getFilteredOptions = (fieldName: string): LookupOption[] => {
    const fieldOptions = options[fieldName] || []
    const search = (searchTerms[fieldName] || '').toLowerCase().trim()

    if (!search) return fieldOptions

    return fieldOptions.filter(opt => {
      const name = (opt.x_name || '').toLowerCase()
      const nameAr = (opt.x_name_ar || '').toLowerCase()
      const code = (opt.x_code || '').toLowerCase()
      return name.includes(search) || nameAr.includes(search) || code.includes(search)
    })
  }

  // Grid/layout styles
  const containerStyle: React.CSSProperties = layout === 'grid'
    ? {
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '16px',
      }
    : layout === 'horizontal'
    ? {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }

  const fieldStyle: React.CSSProperties = layout === 'horizontal'
    ? { flex: '1 1 200px', minWidth: '200px' }
    : {}

  return (
    <div style={containerStyle}>
      {fields.map((field, index) => {
        const isEnabled = isFieldEnabled(field.name)
        const isLoading = loading[field.name]
        const isOpen = openDropdown === field.name
        const displayValue = getDisplayValue(field.name)
        const filteredOptions = getFilteredOptions(field.name)
        const dependency = dependencyMap[field.name]

        return (
          <div key={field.name} style={fieldStyle} className="relative">
            {/* Label */}
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: colors.textPrimary }}
            >
              <span className="flex items-center gap-2">
                <Link2 size={14} style={{ color: colors.textSecondary }} />
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </span>
            </label>

            {/* Dropdown Trigger */}
            <button
              type="button"
              onClick={() => {
                if (isEnabled && !isLoading) {
                  setOpenDropdown(isOpen ? null : field.name)
                }
              }}
              disabled={!isEnabled || isLoading}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all"
              style={{
                backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${isOpen ? colors.action : colors.border}`,
                color: !isEnabled ? colors.textSecondary : colors.textPrimary,
                opacity: !isEnabled ? 0.6 : 1,
                cursor: !isEnabled ? 'not-allowed' : 'pointer',
              }}
            >
              <span className={displayValue ? '' : 'opacity-50'}>
                {displayValue || (dependency && !isEnabled
                  ? t('Select {{parent}} first', { parent: fields.find(f => f.model === dependency.parentModel)?.label || 'parent' })
                  : field.placeholder || t('Select...')
                )}
              </span>
              <div className="flex items-center gap-2">
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {displayValue && isEnabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelect(field.name, null)
                    }}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                  >
                    <X size={14} />
                  </button>
                )}
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {/* Dependency hint */}
            {dependency && !isEnabled && (
              <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: colors.textSecondary }}>
                <AlertCircle size={12} />
                <span>{t('Depends on')} {fields.find(f => f.model === dependency.parentModel)?.label}</span>
              </div>
            )}

            {/* Dropdown Menu */}
            {isOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
                style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                }}
              >
                {/* Search Input */}
                <div className="p-2 border-b" style={{ borderColor: colors.border }}>
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    }}
                  >
                    <Search size={16} style={{ color: colors.textSecondary }} />
                    <input
                      type="text"
                      placeholder={t('Search...')}
                      value={searchTerms[field.name] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, [field.name]: e.target.value }))}
                      className="flex-1 bg-transparent outline-none text-sm"
                      style={{ color: colors.textPrimary }}
                      autoFocus
                    />
                    {searchTerms[field.name] && (
                      <button onClick={() => setSearchTerms(prev => ({ ...prev, [field.name]: '' }))}>
                        <X size={14} style={{ color: colors.textSecondary }} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Options List */}
                <div className="max-h-60 overflow-y-auto">
                  {filteredOptions.length === 0 ? (
                    <div className="p-4 text-center text-sm" style={{ color: colors.textSecondary }}>
                      {isLoading ? t('Loading...') : t('No options available')}
                    </div>
                  ) : (
                    filteredOptions.map((option) => {
                      const isSelected = values[field.name] === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSelect(field.name, option)}
                          className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          style={{
                            backgroundColor: isSelected
                              ? (mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
                              : 'transparent',
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          <div className="flex flex-col items-start">
                            <span
                              className="font-medium text-sm"
                              style={{ color: colors.textPrimary }}
                            >
                              {isRTL && option.x_name_ar ? option.x_name_ar : option.x_name}
                            </span>
                            {option.x_code && (
                              <span
                                className="text-xs font-mono"
                                style={{ color: colors.textSecondary }}
                              >
                                {option.x_code}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <Check size={16} style={{ color: colors.action }} />
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Click outside to close */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  )
}

export default HierarchicalLookupField
