import { useState, useEffect, useCallback } from 'react'
import { API_CONFIG } from '../config/api'
import { useAuth } from '../../context/auth'

interface SerialNumberRecord {
  id: number
  name: string
  product_id: [number, string] | false
  location_id: [number, string] | false
  product_qty: number
  ref: string
  x_rfid: string
  // Lookup fields
  x_category_id: [number, string] | false
  x_subcategory_id: [number, string] | false
  x_group_id: [number, string] | false
  x_subgroup_id: [number, string] | false
  x_brand_id: [number, string] | false
  x_manufacturer_id: [number, string] | false
  x_model_id: [number, string] | false
  x_custodian_id: [number, string] | false
  x_condition: string | false
  x_disposal_status: string | false
  x_description: string
  x_original_barcode: string
  x_ams_item_id: string
  x_disposal_date: string
  create_date: string
  write_date: string
  [key: string]: any
}

interface SerialNumberColumn {
  id: string
  label: string
}

interface UseSerialNumbersReturn {
  records: SerialNumberRecord[]
  columns: SerialNumberColumn[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Fields to fetch from Odoo - ordered by importance
const SERIAL_NUMBER_FIELDS = [
  'id',
  'name',              // Serial number
  'product_id',        // Product (will show name)
  'location_id',       // Location
  'product_qty',       // Quantity
  'ref',               // Reference
  'x_rfid',            // RFID tag
  // Lookup fields
  'x_category_id',
  'x_subcategory_id',
  'x_group_id',
  'x_subgroup_id',
  'x_brand_id',
  'x_manufacturer_id',
  'x_model_id',
  'x_custodian_id',
  'x_condition',
  'x_disposal_status',
  // Other fields
  'x_description',
  'x_original_barcode',
  'x_ams_item_id',
  'x_disposal_date',
  'create_date',
  'write_date',
]

// Column definitions with proper labels - ordered as user requested
const SERIAL_NUMBER_COLUMNS: SerialNumberColumn[] = [
  { id: 'product_id', label: 'Product' },           // First: Product name
  { id: 'name', label: 'Serial Number' },           // Second: Serial number
  { id: 'location_id', label: 'Location' },         // Third: Location
  // Lookup fields
  { id: 'x_category_id', label: 'Category' },
  { id: 'x_subcategory_id', label: 'Subcategory' },
  { id: 'x_group_id', label: 'Group' },
  { id: 'x_subgroup_id', label: 'Subgroup' },
  { id: 'x_brand_id', label: 'Brand' },
  { id: 'x_manufacturer_id', label: 'Manufacturer' },
  { id: 'x_model_id', label: 'Model' },
  { id: 'x_custodian_id', label: 'Custodian' },
  { id: 'x_condition', label: 'Condition' },
  { id: 'x_disposal_status', label: 'Disposal Status' },
  // Other fields
  { id: 'x_rfid', label: 'RFID Tag' },
  { id: 'product_qty', label: 'Quantity' },
  { id: 'ref', label: 'Reference' },
  { id: 'x_description', label: 'Description' },
  { id: 'x_original_barcode', label: 'Original Barcode' },
  { id: 'x_ams_item_id', label: 'AMS Item ID' },
  { id: 'x_disposal_date', label: 'Disposal Date' },
  { id: 'create_date', label: 'Created' },
  { id: 'write_date', label: 'Modified' },
]

export function useSerialNumbers(): UseSerialNumbersReturn {
  const { sessionId } = useAuth()
  const [records, setRecords] = useState<SerialNumberRecord[]>([])
  const [columns, setColumns] = useState<SerialNumberColumn[]>(SERIAL_NUMBER_COLUMNS)
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
    if (!sessionId) return

    const tenantId = getTenantId()
    if (!tenantId) {
      setError('Tenant ID is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Use SmartFieldSelector's odooClient endpoint with fetchAllFields=true
      const params = new URLSearchParams({
        domain: JSON.stringify([]),
        limit: '0', // No limit - fetch all
        order: 'id desc',
        context: 'list',
        fetchAllFields: 'true', // Fetch ALL fields from Odoo, not just configured ones
      })

      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.lot?${params.toString()}`,
        {
          method: 'GET',
          headers: getHeaders(),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to fetch serial numbers')
      }

      setRecords(data.records || [])
      setColumns(SERIAL_NUMBER_COLUMNS)
    } catch (err: any) {
      console.error('Error fetching serial numbers:', err)
      setError(err.message || 'Failed to fetch serial numbers')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [sessionId, getHeaders])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  return {
    records,
    columns,
    loading,
    error,
    refetch: fetchRecords,
  }
}

// Default visible columns - the important ones
export const DEFAULT_VISIBLE_COLUMNS = [
  'product_id',        // Product name first
  'name',              // Serial number
  'location_id',       // Location
  'x_category_id',
  'x_subcategory_id',
  'x_group_id',
  'x_subgroup_id',
  'x_brand_id',
  'x_manufacturer_id',
  'x_model_id',
  'x_custodian_id',
  'x_condition',
]
