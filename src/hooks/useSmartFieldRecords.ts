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

export function useSmartFieldRecords({
  modelName,
  pickingTypeCode,
  enabled = true,
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
      const recordsUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${modelName}?domain=${encodeURIComponent(JSON.stringify(domain))}&limit=1000&context=list`
      
      const recordsResponse = await fetch(recordsUrl, {
        method: 'GET',
        headers: getHeaders(),
      })

      const recordsData = await recordsResponse.json()

      if (!recordsResponse.ok || !recordsData.success) {
        throw new Error(recordsData.error || 'Failed to fetch records')
      }

      setRecords(recordsData.records || [])

      // Fetch available columns from SmartFieldSelector (fields marked as show_in_list)
      const fieldsUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/${modelName}/selected?context=list`
      
      const fieldsResponse = await fetch(fieldsUrl, {
        method: 'GET',
        headers: getHeaders(),
      })

      const fieldsData = await fieldsResponse.json()

      if (fieldsResponse.ok && fieldsData.success) {
        // Extract columns from fields data - response structure: { success: true, data: { fields: [...] } }
        const fieldList = fieldsData.data?.fields || []
        
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
        
        const availableColumns = fieldList
          .filter((field: any) => field.show_in_list !== false) // Only fields that should be shown in list
          .map((field: any) => ({
            id: field.name || field.field_name,
            label: field.label || field.field_label || field.name || field.field_name,
          }))

        // Ensure 'id' column is always included and is first
        const hasIdColumn = availableColumns.some((col: any) => col.id === 'id')
        if (!hasIdColumn) {
          availableColumns.unshift({ id: 'id', label: 'ID' })
        } else {
          // Move id to first position if it exists but isn't first
          const idIndex = availableColumns.findIndex((col: any) => col.id === 'id')
          if (idIndex > 0) {
            const [idCol] = availableColumns.splice(idIndex, 1)
            availableColumns.unshift(idCol)
          }
        }

        setColumns(availableColumns)
      } else {
        // Fallback: use default columns if field fetch fails
        setFields([])
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

