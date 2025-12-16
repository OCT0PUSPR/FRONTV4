import React from 'react'
import { ColumnDef } from '../components/DataTable'

interface SmartField {
  name: string
  label: string
  type: string
  show_in_list?: boolean
  field_name?: string
  field_label?: string
}

// Helper function to get status pill colors
const getStatusColors = (status: string, colors: any): { bg: string; text: string } => {
  const normalizedStatus = (status || '').toLowerCase().trim()
  
  switch (normalizedStatus) {
    // Draft status - grey
    case 'draft':
      return { bg: colors.tableDraftBg, text: colors.tableDraftText }
    
    // Done/Completed status - green
    case 'done':
    case 'completed':
    case 'complete':
      return { bg: colors.tableDoneBg, text: colors.tableDoneText }
    
    // Ready/Assigned status - blue
    case 'ready':
    case 'assigned':
    case 'confirmed':
      return { bg: colors.tableReadyBg, text: colors.tableReadyText }
    
    // Cancelled status - red
    case 'cancelled':
    case 'cancel':
    case 'canceled':
      return { bg: colors.tableCancelledBg, text: colors.tableCancelledText }
    
    // Waiting/In Progress status - yellow/orange
    case 'waiting':
    case 'wait':
    case 'in progress':
    case 'inprogress':
    case 'progress':
    case 'planned':
      return { bg: colors.tableWaitingBg, text: colors.tableWaitingText }
    
    default:
      // Default to draft colors for unknown statuses
      return { bg: colors.tableDraftBg, text: colors.tableDraftText }
  }
}

// Helper function to capitalize first letter
const capitalizeFirst = (str: string): string => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Helper function to map state database values to display labels
const getStateDisplayLabel = (stateValue: string): string => {
  if (!stateValue) return stateValue
  
  const stateMap: Record<string, string> = {
    'draft': 'Draft',
    'waiting': 'Waiting Another Operation',
    'confirmed': 'Waiting',
    'assigned': 'Ready',
    'done': 'Done',
    'cancel': 'Cancelled',
  }
  
  // Normalize the state value (lowercase, trim)
  const normalizedState = stateValue.toLowerCase().trim()
  
  // Return mapped label or fallback to capitalized original
  return stateMap[normalizedState] || capitalizeFirst(stateValue)
}

export function generateColumnsFromFields(
  fields: SmartField[],
  colors: any,
  t: (key: string) => string
): ColumnDef<any>[] {
  const formatFieldValue = (field: SmartField, value: any): string => {
    try {
      // Handle false, null, undefined, or empty string as N/A
      if (value === null || value === undefined || value === '' || value === false) {
        return typeof t === 'function' ? t('N/A') : 'N/A'
      }

      // Handle relation fields (many2one) - they come as [id, name] tuples
      if ((field.type === 'many2one' || field.type === 'many2many') && Array.isArray(value)) {
        const displayName = value[1] || value[0]?.toString()
        return displayName || (typeof t === 'function' ? t('N/A') : 'N/A')
      }

      // Handle boolean fields
      if (field.type === 'boolean') {
        const yes = typeof t === 'function' ? t('Yes') : 'Yes'
        const no = typeof t === 'function' ? t('No') : 'No'
        return value ? yes : no
      }

      // Handle date fields
      if (field.type === 'date' || field.type === 'datetime') {
        if (!value) return typeof t === 'function' ? t('N/A') : 'N/A'
        const date = new Date(value)
        if (isNaN(date.getTime())) return value.toString()
        
        if (field.type === 'date') {
          return date.toLocaleDateString()
        } else {
          return date.toLocaleString()
        }
      }

      // Handle monetary fields
      if (field.type === 'monetary' || field.type === 'float') {
        if (typeof value === 'number') {
          return value.toFixed(2)
        }
        return value?.toString() || (typeof t === 'function' ? t('N/A') : 'N/A')
      }

      // Default: return string representation
      const stringValue = value?.toString()
      return stringValue || (typeof t === 'function' ? t('N/A') : 'N/A')
    } catch (error) {
      console.warn('Error formatting field value:', field.name, error)
      return value?.toString() || 'N/A'
    }
  }

  // Sort fields: id first, display_name/reference/default_code second, status/state last, others in between
  const sortedFields = [...fields]
    .filter(field => field.show_in_list !== false) // Only show fields marked for list view
    .sort((a, b) => {
      const aName = a.name || a.field_name || ''
      const bName = b.name || b.field_name || ''
      
      // id always first
      if (aName === 'id') return -1
      if (bName === 'id') return 1
      
      // status/state always last (but after id)
      if (aName === 'status' || aName === 'state') return 1
      if (bName === 'status' || bName === 'state') return -1
      
      // display_name, reference, or default_code second (after id, before others)
      const priorityFields = ['display_name', 'reference', 'default_code']
      const aPriority = priorityFields.indexOf(aName)
      const bPriority = priorityFields.indexOf(bName)
      
      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority // display_name before reference before default_code
      }
      if (aPriority !== -1) return -1 // a is priority, comes before b
      if (bPriority !== -1) return 1  // b is priority, comes before a
      
      // Otherwise maintain original order
      return 0
    })
  
  // Ensure ID column exists and is first
  const hasIdField = sortedFields.some(f => (f.name || f.field_name || '') === 'id')
  if (!hasIdField) {
    // Add ID field if it doesn't exist
    sortedFields.unshift({
      name: 'id',
      label: 'ID',
      type: 'integer',
      show_in_list: true,
    })
  }

  return sortedFields.map(field => {
      const fieldName = field.name || field.field_name || ''
      // Return a function that calls t() so it's reactive to language changes
      // Use a React component wrapper to ensure it re-renders when language changes
      const getFieldLabel = () => {
        try {
          // Try to translate field name first, fallback to label from backend, then field name
          if (typeof t !== 'function') {
            return field.label || field.field_label || fieldName
          }
          // Always try to translate the field name first
          const translated = t(fieldName) !== fieldName 
            ? t(fieldName) 
            : (field.label || field.field_label || fieldName)
          // If we got the backend label, try to translate that too
          if (translated === field.label || translated === field.field_label) {
            const translatedLabel = t(translated) !== translated ? t(translated) : translated
            return translatedLabel
          }
          return translated
        } catch (error) {
          // Fallback if translation fails
          console.warn('Translation error for field:', fieldName, error)
          return field.label || field.field_label || fieldName
        }
      }

      return {
        id: fieldName,
        accessorKey: fieldName,
        header: getFieldLabel,
        cell: ({ row }: any) => {
          const value = row.original[fieldName]
          const formattedValue = formatFieldValue(field, value)

          // Special styling for ID field - always first
          if (fieldName === 'id') {
            return (
              <span style={{ color: colors.textPrimary, fontSize: '0.875rem', fontWeight: 600 }}>
                #{formattedValue}
              </span>
            )
          }

          // Special styling for status/state fields - show as pill (like in locations page)
          if (fieldName === 'status' || fieldName === 'state') {
            // Use raw value for color matching (before formatting)
            const rawValue = value?.toString() || ''
            const statusColors = getStatusColors(rawValue, colors)
            // Get display label from mapping
            const displayLabel = getStateDisplayLabel(rawValue)
            return (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  backgroundColor: statusColors.bg,
                  color: statusColors.text,
                }}
              >
                {displayLabel}
              </span>
            )
          }

          // Special styling for name/reference fields
          if (fieldName === 'name' || fieldName === 'reference') {
            return (
              <span style={{ color: colors.textPrimary, fontSize: '0.875rem', fontFamily: 'monospace' }}>
                {formattedValue}
              </span>
            )
          }

          // Default styling
          return (
            <span style={{ color: colors.textSecondary, fontSize: '0.875rem' }}>
              {formattedValue}
            </span>
          )
        },
        enableSorting: true,
      }
    })
}

