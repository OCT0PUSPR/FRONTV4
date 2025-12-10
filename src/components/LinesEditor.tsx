"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import { API_CONFIG } from "../config/api"
import { CustomDropdown } from "./NewCustomDropdown"
import { CustomInput } from "./CusotmInput"
import { IOSCheckbox } from "./IOSCheckbox"
import { CustomDatePicker } from "./ui/CustomDatePicker"
import { NewCustomButton } from "./NewCustomButton"
import { Button } from "../../@/components/ui/button"
import { Plus, Trash2, X, Loader2, ChevronDown, ChevronUp } from "lucide-react"

interface LineFieldConfig {
    name: string
    label: string
    type: string
    widget: string
    required: boolean
    readonly: boolean
    options?: { value: string; label: string }[]
    relation?: { model: string; domain?: string }
}

interface LinesEditorProps {
    /** The parent model name (e.g., 'sale.order') */
    parentModel: string
    /** The field name on the parent model (e.g., 'order_line') */
    fieldName: string
    /** The related model name (e.g., 'sale.order.line') */
    relationModel: string
    /** The inverse field on the related model that points back to parent (e.g., 'order_id') */
    relationField?: string
    /** The parent record ID (null if creating new parent) */
    parentId: number | null
    /** Current line IDs */
    value: number[]
    /** Callback when lines change */
    onChange: (lineIds: number[]) => void
    /** Whether the field is readonly */
    readonly?: boolean
    /** Label for the lines section */
    label?: string
}

interface LineRecord {
    id: number
    [key: string]: any
}

export function LinesEditor({
    parentModel,
    fieldName,
    relationModel,
    relationField,
    parentId,
    value = [],
    onChange,
    readonly = false,
    label
}: LinesEditorProps) {
    const { t } = useTranslation()
    const { colors, mode } = useTheme()
    const { sessionId } = useAuth()
    const isDark = mode === 'dark'

    // State
    const [loading, setLoading] = useState(false)
    const [lines, setLines] = useState<LineRecord[]>([])
    const [lineFields, setLineFields] = useState<LineFieldConfig[]>([])
    const [relationOptions, setRelationOptions] = useState<Record<string, { id: number; name: string }[]>>({})
    const [addingLine, setAddingLine] = useState(false)
    const [newLineData, setNewLineData] = useState<Record<string, any>>({})
    const [savingLine, setSavingLine] = useState(false)
    const [deletingLineId, setDeletingLineId] = useState<number | null>(null)
    const [expanded, setExpanded] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Get tenant ID from localStorage
    const getTenantId = () => localStorage.getItem('current_tenant_id')

    // Get Odoo headers
    const getHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }
        const tenantId = getTenantId()
        if (tenantId) headers['X-Tenant-ID'] = tenantId
        if (sessionId) headers['X-Odoo-Session'] = sessionId

        const odooBase = localStorage.getItem('odooBase')
        const odooDb = localStorage.getItem('odooDb')
        if (odooBase) headers['x-odoo-base'] = odooBase
        if (odooDb) headers['x-odoo-db'] = odooDb

        return headers
    }, [sessionId])

    // Fetch fields for the related model (only required fields for creating lines)
    const fetchLineFields = useCallback(async () => {
        if (!sessionId || !relationModel) return

        try {
            const url = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${relationModel}/form`
            const response = await fetch(url, { method: 'GET', headers: getHeaders() })
            const data = await response.json()

            if (data.success && data.fields?.fields) {
                // Filter to show only required fields and some common useful fields
                const allFields = data.fields.fields as LineFieldConfig[]
                
                // Get required fields
                const requiredFields = allFields.filter(f => f.required && !f.readonly)
                
                // Also include some common useful fields if they exist
                const usefulFieldNames = ['name', 'product_id', 'quantity', 'product_uom_qty', 'price_unit', 'product_uom', 'product_uom_id', 'tax_id', 'tax_ids', 'account_id', 'analytic_distribution']
                const usefulFields = allFields.filter(f => 
                    usefulFieldNames.includes(f.name) && 
                    !f.readonly && 
                    !requiredFields.find(rf => rf.name === f.name)
                )

                // Combine and limit to reasonable number
                const combinedFields = [...requiredFields, ...usefulFields].slice(0, 10)
                
                // Exclude the relation field back to parent (it will be set automatically)
                const filteredFields = combinedFields.filter(f => f.name !== relationField)
                
                setLineFields(filteredFields)

                // Initialize new line data with defaults
                const initialData: Record<string, any> = {}
                filteredFields.forEach(f => {
                    if (f.type === 'boolean') initialData[f.name] = false
                    else if (f.type === 'integer' || f.type === 'float' || f.type === 'monetary') initialData[f.name] = 0
                    else if (f.type === 'many2many' || f.type === 'one2many') initialData[f.name] = []
                    else initialData[f.name] = null
                })
                setNewLineData(initialData)
            }
        } catch (err) {
            console.error('Error fetching line fields:', err)
        }
    }, [sessionId, relationModel, relationField, getHeaders])

    // Fetch existing lines data
    const fetchLines = useCallback(async () => {
        if (!sessionId || !relationModel || value.length === 0) {
            setLines([])
            return
        }

        setLoading(true)
        try {
            // Fetch records by IDs
            const domain = JSON.stringify([['id', 'in', value]])
            const url = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${relationModel}?domain=${encodeURIComponent(domain)}&limit=1000`
            const response = await fetch(url, { method: 'GET', headers: getHeaders() })
            const data = await response.json()

            if (data.success && data.records) {
                setLines(data.records)
            }
        } catch (err) {
            console.error('Error fetching lines:', err)
            setError(t('Failed to load lines'))
        } finally {
            setLoading(false)
        }
    }, [sessionId, relationModel, value, getHeaders, t])

    // Fetch relation options for dropdown fields
    const fetchRelationOptions = useCallback(async (fieldName: string, relModel: string) => {
        if (!sessionId) return

        try {
            const url = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${relationModel}/${fieldName}/relation-options?search=&limit=100`
            const response = await fetch(url, { method: 'GET', headers: getHeaders() })
            
            // Check if response is ok before parsing
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error')
                console.error(`Error fetching options for ${fieldName}: HTTP ${response.status} - ${errorText}`)
                return
            }
            
            const data = await response.json().catch((parseError) => {
                console.error(`Error parsing JSON response for ${fieldName}:`, parseError)
                return null
            })

            if (data && data.success && data.options) {
                setRelationOptions(prev => ({
                    ...prev,
                    [fieldName]: data.options.map((opt: any) => ({
                        id: opt.value,
                        name: opt.label
                    }))
                }))
            } else if (data && !data.success) {
                console.warn(`Failed to fetch options for ${fieldName}:`, data.error || 'Unknown error')
            }
        } catch (err) {
            // Handle network errors (connection refused, etc.)
            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                console.error(`Network error fetching options for ${fieldName}. Backend may be down or unreachable.`)
            } else {
                console.error(`Error fetching options for ${fieldName}:`, err)
            }
        }
    }, [sessionId, relationModel, getHeaders])

    // Load relation options for fields (both for form and display)
    useEffect(() => {
        if (lineFields.length > 0) {
            lineFields.forEach(field => {
                if ((field.type === 'many2one' || field.type === 'many2many') && field.relation?.model) {
                    fetchRelationOptions(field.name, field.relation.model)
                }
            })
        }
    }, [lineFields, fetchRelationOptions])

    // Also fetch relation options for any relational values found in lines data
    useEffect(() => {
        if (lines.length > 0 && lineFields.length > 0) {
            // Check each line for relational fields that might need name lookup
            lineFields.forEach(field => {
                if ((field.type === 'many2one' || field.type === 'many2many') && field.relation?.model) {
                    // Check if we have IDs without names
                    const needsLookup = lines.some(line => {
                        const val = line[field.name]
                        if (val === null || val === undefined || val === false) return false
                        // If it's a number (ID only) and we don't have it in options, we need lookup
                        if (typeof val === 'number') {
                            const options = relationOptions[field.name] || []
                            return !options.find(o => o.id === val)
                        }
                        // If it's an array of IDs (many2many)
                        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
                            const options = relationOptions[field.name] || []
                            return val.some((id: number) => !options.find(o => o.id === id))
                        }
                        return false
                    })
                    
                    if (needsLookup && !relationOptions[field.name]?.length) {
                        fetchRelationOptions(field.name, field.relation.model)
                    }
                }
            })
        }
    }, [lines, lineFields, relationOptions, fetchRelationOptions])

    // Initial load
    useEffect(() => {
        fetchLineFields()
    }, [fetchLineFields])

    useEffect(() => {
        fetchLines()
    }, [fetchLines])

    // Handle new line field change
    const handleNewLineChange = (fieldName: string, fieldValue: any) => {
        setNewLineData(prev => ({ ...prev, [fieldName]: fieldValue }))
    }

    // Format relation field for Odoo API
    const formatRelationField = (field: LineFieldConfig, val: any): any => {
        if (field.type === 'many2one') {
            if (Array.isArray(val) && val.length >= 1) return val[0] || false
            if (val === null || val === undefined || val === '') return false
            if (typeof val === 'string') {
                const parsed = parseInt(val)
                return isNaN(parsed) ? false : parsed
            }
            return typeof val === 'number' ? val : false
        } else if (field.type === 'many2many') {
            if (!Array.isArray(val) || val.length === 0) return [[6, 0, []]]
            const ids = val.map((v: any) => {
                if (Array.isArray(v) && v.length >= 1) return v[0]
                if (typeof v === 'number') return v
                if (typeof v === 'string') {
                    const parsed = parseInt(v)
                    return isNaN(parsed) ? null : parsed
                }
                return null
            }).filter((id: any) => id !== null)
            return [[6, 0, ids]]
        }
        return val
    }

    // Create new line
    const handleCreateLine = async () => {
        if (!sessionId || !relationModel) return

        // Validate required fields
        const missingRequired = lineFields.filter(f => {
            if (!f.required) return false
            const val = newLineData[f.name]
            return val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)
        })

        if (missingRequired.length > 0) {
            setError(t('Please fill all required fields: ') + missingRequired.map(f => f.label).join(', '))
            return
        }

        setSavingLine(true)
        setError(null)

        try {
            // Prepare data
            const dataToSend: Record<string, any> = {}
            
            // Add the relation back to parent if we have a parent ID
            if (parentId && relationField) {
                dataToSend[relationField] = parentId
            }

            // Add all field values
            Object.entries(newLineData).forEach(([key, val]) => {
                const field = lineFields.find(f => f.name === key)
                if (field) {
                    if (field.type === 'many2one' || field.type === 'many2many') {
                        dataToSend[key] = formatRelationField(field, val)
                    } else {
                        dataToSend[key] = val
                    }
                }
            })

            const url = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${relationModel}`
            const response = await fetch(url, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ data: dataToSend, validate: true })
            })
            const result = await response.json()

            if (result.success && result.id) {
                // Add new line ID to the list
                const newIds = [...value, result.id]
                onChange(newIds)

                // Reset form
                const initialData: Record<string, any> = {}
                lineFields.forEach(f => {
                    if (f.type === 'boolean') initialData[f.name] = false
                    else if (f.type === 'integer' || f.type === 'float' || f.type === 'monetary') initialData[f.name] = 0
                    else if (f.type === 'many2many' || f.type === 'one2many') initialData[f.name] = []
                    else initialData[f.name] = null
                })
                setNewLineData(initialData)
                setAddingLine(false)

                // Refresh lines
                setTimeout(() => fetchLines(), 300)
            } else {
                setError(result.error || t('Failed to create line'))
            }
        } catch (err) {
            console.error('Error creating line:', err)
            setError(t('Failed to create line'))
        } finally {
            setSavingLine(false)
        }
    }

    // Delete line
    const handleDeleteLine = async (lineId: number) => {
        if (!sessionId || !relationModel) return

        setDeletingLineId(lineId)
        try {
            const url = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${relationModel}/${lineId}`
            const response = await fetch(url, {
                method: 'DELETE',
                headers: getHeaders()
            })
            const result = await response.json()

            if (result.success) {
                // Remove from list
                const newIds = value.filter(id => id !== lineId)
                onChange(newIds)
                setLines(prev => prev.filter(l => l.id !== lineId))
            } else {
                setError(result.error || t('Failed to delete line'))
            }
        } catch (err) {
            console.error('Error deleting line:', err)
            setError(t('Failed to delete line'))
        } finally {
            setDeletingLineId(null)
        }
    }

    // Get display columns for the table
    const displayColumns = useMemo(() => {
        if (lineFields.length === 0) return []
        // Show up to 5 columns in the table
        return lineFields.slice(0, 5)
    }, [lineFields])

    // Format cell value for display
    const formatCellValue = (line: LineRecord, field: LineFieldConfig): string => {
        const val = line[field.name]
        if (val === null || val === undefined || val === false) return '-'

        if (field.type === 'many2one') {
            // First check if it's already [id, name] tuple from Odoo
            if (Array.isArray(val) && val.length >= 2) return val[1]
            // If it's just an ID, look up the name from relationOptions
            if (typeof val === 'number') {
                const options = relationOptions[field.name] || []
                const found = options.find(o => o.id === val)
                return found?.name || String(val)
            }
            return String(val)
        }
        if (field.type === 'many2many') {
            // Handle many2many - show comma-separated names
            if (Array.isArray(val)) {
                const options = relationOptions[field.name] || []
                const names = val.map((item: any) => {
                    // Item could be [id, name] tuple or just id
                    if (Array.isArray(item) && item.length >= 2) return item[1]
                    if (typeof item === 'number') {
                        const found = options.find(o => o.id === item)
                        return found?.name || String(item)
                    }
                    return String(item)
                })
                return names.length > 0 ? names.join(', ') : '-'
            }
            return '-'
        }
        if (field.type === 'boolean') {
            return val ? '✓' : '✗'
        }
        if (field.type === 'selection') {
            const opt = field.options?.find(o => o.value === val)
            return opt?.label || String(val)
        }
        if (field.type === 'float' || field.type === 'monetary') {
            return typeof val === 'number' ? val.toFixed(2) : String(val)
        }
        return String(val)
    }

    // Render input field for new line form
    const renderNewLineField = (field: LineFieldConfig) => {
        const val = newLineData[field.name]

        if (field.type === 'boolean') {
            return (
                <IOSCheckbox
                    label={field.label}
                    checked={!!val}
                    onChange={(v) => handleNewLineChange(field.name, v)}
                />
            )
        }

        if (field.type === 'selection') {
            return (
                <CustomDropdown
                    label={field.label}
                    values={(field.options || []).map(o => `${o.value}::${o.label}`)}
                    type="single"
                    defaultValue={val ? `${val}::${(field.options || []).find(o => o.value === val)?.label || val}` : undefined}
                    onChange={(v) => handleNewLineChange(field.name, typeof v === 'string' ? v.split('::')[0] : null)}
                />
            )
        }

        if (field.type === 'many2one') {
            return (
                <CustomDropdown
                    label={field.label}
                    values={(relationOptions[field.name] || []).map(o => `${o.id}::${o.name}`)}
                    type="single"
                    defaultValue={
                        val
                            ? `${val}::${(relationOptions[field.name] || []).find(o => o.id === val)?.name || val}`
                            : undefined
                    }
                    onChange={(v) => handleNewLineChange(field.name, typeof v === 'string' ? parseInt(v.split('::')[0]) : null)}
                />
            )
        }

        if (field.type === 'many2many') {
            return (
                <CustomDropdown
                    label={field.label}
                    values={(relationOptions[field.name] || []).map(o => `${o.id}::${o.name}`)}
                    type="multi"
                    defaultValue={Array.isArray(val) ? val.map((id: any) => {
                        const found = (relationOptions[field.name] || []).find(o => o.id === id)
                        return `${id}::${found?.name || id}`
                    }) : []}
                    onChange={(v) => {
                        const ids = Array.isArray(v) ? v.map(item => parseInt(item.split('::')[0])) : []
                        handleNewLineChange(field.name, ids)
                    }}
                />
            )
        }

        if (field.type === 'date') {
            return (
                <CustomDatePicker
                    label={field.label}
                    value={val || ''}
                    onChange={(d) => handleNewLineChange(field.name, d)}
                    colors={colors}
                />
            )
        }

        // Default: text/number input
        return (
            <CustomInput
                label={field.label}
                type={field.type === 'integer' || field.type === 'float' || field.type === 'monetary' ? 'number' : 'text'}
                value={val ?? ''}
                onChange={(v) => handleNewLineChange(field.name, 
                    field.type === 'integer' ? parseInt(v) || 0 : 
                    field.type === 'float' || field.type === 'monetary' ? parseFloat(v) || 0 : v
                )}
            />
        )
    }

    return (
        <div 
            className="w-full rounded-xl border overflow-hidden"
            style={{ 
                borderColor: colors.border,
                backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : colors.card 
            }}
        >
            {/* Header */}
            <div 
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    <div 
                        className="w-1 h-5 rounded-full"
                        style={{ backgroundColor: colors.action }}
                    />
                    <h3 className="font-semibold text-sm uppercase tracking-wide" style={{ color: colors.textPrimary }}>
                        {label || fieldName}
                    </h3>
                    <span 
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}
                    >
                        {lines.length} {t('items')}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {!readonly && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <NewCustomButton
                                label={t("Add Line")}
                                icon={Plus}
                                backgroundColor={colors.action}
                                onClick={() => setAddingLine(true)}
                                disabled={addingLine}
                            />
                        </div>
                    )}
                    {expanded ? <ChevronUp size={18} style={{ color: colors.textSecondary }} /> : <ChevronDown size={18} style={{ color: colors.textSecondary }} />}
                </div>
            </div>

            {expanded && (
                <div className="p-4">
                    {/* Error message */}
                    {error && (
                        <div 
                            className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                        >
                            <X size={16} />
                            {error}
                            <button onClick={() => setError(null)} className="ml-auto">
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {/* Lines Table */}
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin" size={24} style={{ color: colors.textSecondary }} />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                                        {displayColumns.map(col => (
                                            <th 
                                                key={col.name}
                                                className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider"
                                                style={{ color: colors.textSecondary }}
                                            >
                                                {col.label}
                                                {col.required && <span className="text-red-500 ml-1">*</span>}
                                            </th>
                                        ))}
                                        {!readonly && (
                                            <th className="w-12 px-3 py-2"></th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.length === 0 && !addingLine ? (
                                        <tr>
                                            <td 
                                                colSpan={displayColumns.length + (readonly ? 0 : 1)}
                                                className="text-center py-8 text-sm"
                                                style={{ color: colors.textSecondary }}
                                            >
                                                {t('No lines yet. Click "Add Line" to create one.')}
                                            </td>
                                        </tr>
                                    ) : (
                                        lines.map(line => (
                                            <tr 
                                                key={line.id}
                                                style={{ borderBottom: `1px solid ${colors.border}` }}
                                                className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                            >
                                                {displayColumns.map(col => (
                                                    <td 
                                                        key={col.name}
                                                        className="px-3 py-2.5 text-sm"
                                                        style={{ color: colors.textPrimary }}
                                                    >
                                                        {formatCellValue(line, col)}
                                                    </td>
                                                ))}
                                                {!readonly && (
                                                    <td className="px-3 py-2.5">
                                                        <button
                                                            onClick={() => handleDeleteLine(line.id)}
                                                            disabled={deletingLineId === line.id}
                                                            className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                                            style={{ color: '#ef4444' }}
                                                        >
                                                            {deletingLineId === line.id ? (
                                                                <Loader2 className="animate-spin" size={16} />
                                                            ) : (
                                                                <Trash2 size={16} />
                                                            )}
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Add Line Form */}
                    {!readonly && addingLine && (
                        <div 
                            className="mt-4 p-4 rounded-lg border"
                            style={{ 
                                borderColor: colors.action,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                            }}
                        >
                            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: colors.textSecondary }}>
                                {t('New Line')}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {lineFields.map(field => (
                                    <div key={field.name}>
                                        {renderNewLineField(field)}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button
                                    onClick={handleCreateLine}
                                    disabled={savingLine}
                                    style={{
                                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '0.5rem 1rem',
                                        fontSize: 13,
                                    }}
                                >
                                    {savingLine ? (
                                        <Loader2 className="animate-spin mr-2" size={14} />
                                    ) : null}
                                    {t('Confirm')}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setAddingLine(false)
                                        setError(null)
                                    }}
                                    style={{
                                        border: `1px solid ${colors.border}`,
                                        background: colors.card,
                                        color: colors.textPrimary,
                                        padding: '0.5rem 1rem',
                                        fontSize: 13,
                                    }}
                                >
                                    {t('Cancel')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default LinesEditor
