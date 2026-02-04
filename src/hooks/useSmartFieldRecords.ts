import { useState, useEffect, useCallback } from 'react'
import { API_CONFIG } from '../config/api'
import { useAuth } from '../../context/auth'

interface SmartFieldRecord {
  [key: string]: any
}

interface UseSmartFieldRecordsOptions {
  modelName: string
  pickingTypeCode?: 'incoming' | 'outgoing' | 'internal' | 'dropship'
  enabled?: boolean
  // If true, extract columns from actual record data instead of just configured fields
  extractColumnsFromData?: boolean
}

interface SmartField {
  name: string
  label: string
  type: string
  show_in_list?: boolean
  field_name?: string
  field_label?: string
}

interface UseSmartFieldRecordsReturn {
  records: SmartFieldRecord[]
  columns: Array<{ id: string; label: string }>
  fields: SmartField[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Convert field name to a readable label
 * e.g., "x_category_id" -> "Category", "product_qty" -> "Product Qty"
 */
function fieldNameToLabel(fieldName: string): string {
  // Remove x_ prefix
  let label = fieldName.replace(/^x_/, '')
  // Remove _id suffix for relation fields
  label = label.replace(/_id$/, '')
  // Replace underscores with spaces and capitalize each word
  return label
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function useSmartFieldRecords({
  modelName,
  pickingTypeCode,
  enabled = true,
  extractColumnsFromData = true, // Default to true for better column discovery
}: UseSmartFieldRecordsOptions): UseSmartFieldRecordsReturn {
  const { sessionId } = useAuth()
  const [records, setRecords] = useState<SmartFieldRecord[]>([])
  const [columns, setColumns] = useState<Array<{ id: string; label: string }>>([])
  const [fields, setFields] = useState<SmartField[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getTenantId = () => localStorage.getItem('current_tenant_id')

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

  const fetchRecords = useCallback(async () => {
    if (!enabled || !sessionId) return

    const tenantId = getTenantId()
    if (!tenantId) {
      setError('Tenant ID is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Build domain filter for picking_type_code
      let domain: any[] = []
      if (pickingTypeCode) {
        domain = [['picking_type_code', '=', pickingTypeCode]]
      }

      // Fetch records using SmartFieldSelector API
      // Use fetchAllFields=true to get all fields from Odoo, not just pre-configured ones
      const recordsUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${modelName}?domain=${encodeURIComponent(JSON.stringify(domain))}&limit=1000&context=list&fetchAllFields=true`
      
      const recordsResponse = await fetch(recordsUrl, {
        method: 'GET',
        headers: getHeaders(),
      })

      const recordsData = await recordsResponse.json()

      if (!recordsResponse.ok || !recordsData.success) {
        throw new Error(recordsData.error || 'Failed to fetch records')
      }

      const fetchedRecords = recordsData.records || []
      setRecords(fetchedRecords)

      // Fetch available columns from SmartFieldSelector (fields marked as show_in_list)
      const fieldsUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${modelName}/selected?context=list`

      const fieldsResponse = await fetch(fieldsUrl, {
        method: 'GET',
        headers: getHeaders(),
      })

      const fieldsData = await fieldsResponse.json()

      // Build a map of field labels from the SmartFieldSelector response
      const fieldLabelMap: Record<string, string> = {}

      if (fieldsResponse.ok && fieldsData.success) {
        // Extract columns from fields data - response structure: { success: true, data: { fields: [...] } }
        const fieldList = fieldsData.data?.fields || []

        // Build label map from configured fields
        fieldList.forEach((f: any) => {
          const fieldName = f.name || f.field_name
          const fieldLabel = f.label || f.field_label
          if (fieldName && fieldLabel) {
            fieldLabelMap[fieldName] = fieldLabel
          }
        })

        // Ensure 'id' field is always included in fields
        const hasIdField = fieldList.some((f: any) => (f.name || f.field_name) === 'id')
        if (!hasIdField) {
          fieldList.unshift({
            name: 'id',
            label: 'ID',
            type: 'integer',
            show_in_list: true,
          })
        }

        setFields(fieldList)
      } else {
        setFields([])
      }

      // Extract ALL columns from actual record data
      // This ensures we capture fields that may not be in SmartFieldSelector config
      if (extractColumnsFromData && fetchedRecords.length > 0) {
        const fieldSet = new Set<string>()

        // Collect all unique field names from all records
        fetchedRecords.forEach((record: any) => {
          Object.keys(record).forEach(key => {
            // Skip internal/technical fields
            if (!key.startsWith('__') && key !== 'display_name') {
              fieldSet.add(key)
            }
          })
        })

        // Convert to columns array with proper labels
        const extractedColumns: Array<{ id: string; label: string }> = []

        // Add 'id' first if it exists
        if (fieldSet.has('id')) {
          extractedColumns.push({ id: 'id', label: 'ID' })
          fieldSet.delete('id')
        }

        // Add 'name' second if it exists
        if (fieldSet.has('name')) {
          extractedColumns.push({ id: 'name', label: fieldLabelMap['name'] || 'Name' })
          fieldSet.delete('name')
        }

        // Add remaining fields sorted alphabetically
        const sortedFields = Array.from(fieldSet).sort((a, b) => {
          // Prioritize certain fields
          const priority: Record<string, number> = {
            'location_id': 1,
            'product_id': 2,
            'x_rfid': 3,
            'product_qty': 4,
          }
          const aPriority = priority[a] || (a.startsWith('x_') ? 10 : 100)
          const bPriority = priority[b] || (b.startsWith('x_') ? 10 : 100)
          if (aPriority !== bPriority) return aPriority - bPriority
          return a.localeCompare(b)
        })

        sortedFields.forEach(fieldName => {
          extractedColumns.push({
            id: fieldName,
            label: fieldLabelMap[fieldName] || fieldNameToLabel(fieldName),
          })
        })

        setColumns(extractedColumns)
      } else if (fieldsResponse.ok && fieldsData.success) {
        // Use SmartFieldSelector columns only
        const fieldList = fieldsData.data?.fields || []
        const availableColumns = fieldList
          .filter((field: any) => field.show_in_list !== false)
          .map((field: any) => ({
            id: field.name || field.field_name,
            label: field.label || field.field_label || field.name || field.field_name,
          }))

        // Ensure 'id' column is always included and is first
        const hasIdColumn = availableColumns.some((col: any) => col.id === 'id')
        if (!hasIdColumn) {
          availableColumns.unshift({ id: 'id', label: 'ID' })
        } else {
          const idIndex = availableColumns.findIndex((col: any) => col.id === 'id')
          if (idIndex > 0) {
            const [idCol] = availableColumns.splice(idIndex, 1)
            availableColumns.unshift(idCol)
          }
        }

        setColumns(availableColumns)
      } else {
        // Fallback: use default columns if field fetch fails
        setColumns([
          { id: 'id', label: 'ID' },
          { id: 'name', label: 'Name' },
        ])
      }
    } catch (err: any) {
      console.error('Error fetching SmartFieldSelector records:', err)
      setError(err.message || 'Failed to fetch records')
      setRecords([])
      setColumns([])
    } finally {
      setLoading(false)
    }
  }, [modelName, pickingTypeCode, enabled, sessionId, getHeaders])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  return {
    records,
    columns,
    fields,
    loading,
    error,
    refetch: fetchRecords,
  }
}

