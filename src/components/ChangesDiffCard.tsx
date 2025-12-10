// src/pages/ChangesDiffCard.tsx
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../../@/components/ui/alert'
import { FileDiff, Hash } from 'lucide-react'

// This should match the ParsedPendingChange interface from the main page
interface ParsedPendingChange {
  original_data: Record<string, any> | null
  new_data: Record<string, any>
  changed_fields: string[]
  change_summary: string
  entity_type: string
}

interface ChangesDiffCardProps {
  change: ParsedPendingChange
}

// Helper to format complex values (like Odoo's [id, "Name"] arrays)
const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === false) return 'N/A'
  if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number') {
    return `${value[0]} - "${value[1]}"`
  }
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  // Truncate long strings for display
  const strValue = String(value)
  if (strValue.length > 150 && !strValue.startsWith('data:image')) {
    return strValue.substring(0, 150) + '...'
  }
  return strValue
}

// Helper to check if a value is a Base64 image
const isBase64Image = (value: any): boolean => {
  return typeof value === 'string' && value.startsWith('data:image')
}

const DiffRow: React.FC<{ field: string; oldValue: any; newValue: any }> = ({
  field,
  oldValue,
  newValue,
}) => {
  const oldValueFormatted = formatValue(oldValue)
  const newValueFormatted = formatValue(newValue)

  // Special handling for image changes
  if (isBase64Image(oldValue) || isBase64Image(newValue)) {
    return (
      <div className="rounded-lg border bg-background p-4">
        <h4 className="mb-3 font-semibold text-primary">{field}</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <span className="text-sm font-medium text-muted-foreground">Original</span>
            {isBase64Image(oldValue) ? (
              <img src={oldValue} alt="Original" className="mt-2 rounded-md border" />
            ) : (
              <div className="mt-2 rounded-md border bg-muted p-4 text-muted-foreground">N/A</div>
            )}
          </div>
          <div>
            <span className="text-sm font-medium text-muted-foreground">New</span>
            {isBase64Image(newValue) ? (
              <img src={newValue} alt="New" className="mt-2 rounded-md border" />
            ) : (
              <div className="mt-2 rounded-md border bg-muted p-4 text-muted-foreground">N/A</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Standard text/value diff
  return (
    <div className="rounded-lg border bg-background p-4">
      <h4 className="mb-2 font-semibold text-primary">{field}</h4>
      <div className="space-y-1 font-mono text-sm">
        <div className="flex items-start">
          <span className="mr-2 w-10 flex-shrink-0 text-red-500">OLD:</span>
          <span className="break-all rounded-md bg-red-100 p-1 text-red-700 line-through dark:bg-red-900/30 dark:text-red-400">
            {oldValueFormatted}
          </span>
        </div>
        <div className="flex items-start">
          <span className="mr-2 w-10 flex-shrink-0 text-green-500">NEW:</span>
          <span className="break-all rounded-md bg-green-100 p-1 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {newValueFormatted}
          </span>
        </div>
      </div>
    </div>
  )
}

export function ChangesDiffCard({ change }: ChangesDiffCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Proposed Changes</CardTitle>
        <CardDescription>
          Review the changes proposed for the entity: <strong>{change.entity_type}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {change.change_summary && (
          <Alert className="mb-6">
            <FileDiff className="h-4 w-4" />
            <AlertTitle>Change Summary</AlertTitle>
            <AlertDescription>{change.change_summary}</AlertDescription>
          </Alert>
        )}

        <h3 className="mb-4 text-lg font-semibold">Field Changes</h3>
        
        {change.changed_fields && change.changed_fields.length > 0 ? (
          <div className="space-y-4">
            {change.changed_fields.map((field) => (
              <DiffRow
                key={field}
                field={field}
                oldValue={change.original_data?.[field]}
                newValue={change.new_data?.[field]}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No specific field changes were recorded. The action might be a
            creation or deletion.
          </p>
        )}
      </CardContent>
    </Card>
  )
}