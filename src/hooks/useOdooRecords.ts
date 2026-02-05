import { useState, useEffect, useCallback, useRef } from 'react'
import { API_CONFIG } from '../config/api'
import { useAuth } from '../../context/auth'

interface OdooField {
  name: string
  type: string
  string: string // Label
  relation?: string
  required?: boolean
  readonly?: boolean
  store?: boolean
  sortable?: boolean
  searchable?: boolean
}

interface OdooRecord {
  id: number
  [key: string]: any
}

interface UseOdooRecordsOptions {
  modelName: string
  domain?: any[]
  enabled?: boolean
  defaultFields?: string[] // Default visible columns
  limit?: number
}

interface ColumnDef {
  id: string
  label: string
  type: string
  sortable?: boolean
}

interface UseOdooRecordsReturn {
  records: OdooRecord[]
  fields: Record<string, OdooField>
  columns: ColumnDef[]
  loading: boolean
  error: string | null
  totalCount: number
  refetch: () => Promise<void>
}

// Fields to exclude from display (technical/internal fields)
const EXCLUDED_FIELDS = [
  '__last_update',
  'create_uid',
  'create_date',
  'write_uid',
  'write_date',
  'display_name',
  'message_ids',
  'message_follower_ids',
  'message_partner_ids',
  'message_channel_ids',
  'message_attachment_count',
  'message_has_error',
  'message_has_error_counter',
  'message_has_sms_error',
  'message_is_follower',
  'message_main_attachment_id',
  'message_needaction',
  'message_needaction_counter',
  'message_unread',
  'message_unread_counter',
  'website_message_ids',
  'activity_ids',
  'activity_state',
  'activity_user_id',
  'activity_type_id',
  'activity_type_icon',
  'activity_date_deadline',
  'activity_summary',
  'activity_exception_decoration',
  'activity_exception_icon',
  'my_activity_date_deadline',
  'has_message',
]

// Field types to exclude (binary, one2many are usually not useful in list view)
const EXCLUDED_TYPES = ['binary', 'one2many', 'html']

// Priority fields that should appear first
const PRIORITY_FIELDS = ['id', 'name', 'display_name', 'state', 'partner_id', 'date', 'scheduled_date', 'origin']

/**
 * Convert field name to a readable label
 */
function fieldNameToLabel(fieldName: string): string {
  let label = fieldName.replace(/^x_/, '')
  label = label.replace(/_id$/, '')
  label = label.replace(/_ids$/, 's')
  return label
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Hook to fetch records and fields directly from Odoo
 */
export function useOdooRecords({
  modelName,
  domain = [],
  enabled = true,
  defaultFields,
  limit = 0, // 0 means no limit - fetch all
}: UseOdooRecordsOptions): UseOdooRecordsReturn {
  const { sessionId } = useAuth()
  const [records, setRecords] = useState<OdooRecord[]>([])
  const [fields, setFields] = useState<Record<string, OdooField>>({})
  const [columns, setColumns] = useState<ColumnDef[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const fetchedRef = useRef(false)

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

  const fetchData = useCallback(async () => {
    if (!enabled || !sessionId) return

    const tenantId = getTenantId()
    if (!tenantId) {
      setError('Tenant ID is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: Fetch fields metadata from Odoo using fields_get
      const fieldsUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${modelName}/execute`
      const fieldsResponse = await fetch(fieldsUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          method: 'fields_get',
          args: [],
          kwargs: { attributes: ['type', 'string', 'relation', 'required', 'readonly', 'store', 'sortable', 'searchable'] }
        })
      })

      const fieldsData = await fieldsResponse.json()

      if (!fieldsResponse.ok || !fieldsData.success) {
        throw new Error(fieldsData.error || 'Failed to fetch fields')
      }

      const odooFields: Record<string, OdooField> = {}
      const fieldColumns: ColumnDef[] = []

      // Process fields from Odoo
      const rawFields = fieldsData.result || {}

      for (const [fieldName, fieldInfo] of Object.entries(rawFields)) {
        const info = fieldInfo as any

        // Skip excluded fields and types
        if (EXCLUDED_FIELDS.includes(fieldName)) continue
        if (EXCLUDED_TYPES.includes(info.type)) continue
        if (fieldName.startsWith('__')) continue

        odooFields[fieldName] = {
          name: fieldName,
          type: info.type,
          string: info.string || fieldNameToLabel(fieldName),
          relation: info.relation,
          required: info.required,
          readonly: info.readonly,
          store: info.store !== false, // Default to true
          sortable: info.sortable !== false,
          searchable: info.searchable !== false,
        }

        fieldColumns.push({
          id: fieldName,
          label: info.string || fieldNameToLabel(fieldName),
          type: info.type,
          sortable: info.store !== false,
        })
      }

      setFields(odooFields)

      // Sort columns: priority fields first, then alphabetically
      fieldColumns.sort((a, b) => {
        const aPriority = PRIORITY_FIELDS.indexOf(a.id)
        const bPriority = PRIORITY_FIELDS.indexOf(b.id)

        if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority
        if (aPriority !== -1) return -1
        if (bPriority !== -1) return 1

        // Custom fields (x_) come before standard fields
        const aIsCustom = a.id.startsWith('x_')
        const bIsCustom = b.id.startsWith('x_')
        if (aIsCustom && !bIsCustom) return -1
        if (!aIsCustom && bIsCustom) return 1

        return a.label.localeCompare(b.label)
      })

      // Ensure 'id' is always first
      const idIndex = fieldColumns.findIndex(c => c.id === 'id')
      if (idIndex > 0) {
        const [idCol] = fieldColumns.splice(idIndex, 1)
        fieldColumns.unshift(idCol)
      } else if (idIndex === -1) {
        fieldColumns.unshift({ id: 'id', label: 'ID', type: 'integer', sortable: true })
      }

      setColumns(fieldColumns)

      // Step 2: Get field names to fetch (all stored fields)
      const fieldsToFetch = Object.keys(odooFields).filter(f => odooFields[f].store !== false)

      // Step 3: Fetch records
      const domainStr = JSON.stringify(domain)
      const limitParam = limit > 0 ? `&limit=${limit}` : '&limit=10000' // High limit to get all
      const recordsUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/${modelName}?domain=${encodeURIComponent(domainStr)}${limitParam}&order=id desc&fetchAllFields=true`

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
      setTotalCount(recordsData.totalCount || fetchedRecords.length)

    } catch (err: any) {
      console.error('Error fetching Odoo records:', err)
      setError(err.message || 'Failed to fetch data')
      setRecords([])
      setColumns([])
    } finally {
      setLoading(false)
    }
  }, [modelName, domain, enabled, sessionId, getHeaders, limit])

  useEffect(() => {
    if (!fetchedRef.current && enabled && sessionId) {
      fetchedRef.current = true
      fetchData()
    }
  }, [enabled, sessionId])

  // Reset when model changes
  useEffect(() => {
    fetchedRef.current = false
    setRecords([])
    setColumns([])
    setFields({})
    if (enabled && sessionId) {
      fetchedRef.current = true
      fetchData()
    }
  }, [modelName])

  return {
    records,
    fields,
    columns,
    loading,
    error,
    totalCount,
    refetch: fetchData,
  }
}

/**
 * Hook specifically for stock.picking with picking_type_code filter
 */
export function usePickingRecords({
  pickingTypeCode,
  enabled = true,
}: {
  pickingTypeCode: 'incoming' | 'outgoing' | 'internal'
  enabled?: boolean
}) {
  const domain = pickingTypeCode ? [['picking_type_code', '=', pickingTypeCode]] : []

  return useOdooRecords({
    modelName: 'stock.picking',
    domain,
    enabled,
  })
}
