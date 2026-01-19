/**
 * Table Editor Component
 *
 * Provides editing interface for the Table section type.
 * Table sections display data with configurable columns, themes, and data sources.
 */

import { useState, useEffect } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableSection, TableColumn, ModelField, OdooModel, ReportTemplate } from "../types"
import { TABLE_THEMES } from "../constants"

interface TableEditorProps {
  section: TableSection
  colors: any
  t: any
  getModelFields: (model: string) => ModelField[]
  onUpdate: (updates: Partial<TableSection>) => void
  template: ReportTemplate
  modelFields: ModelField[]
  odooModels: OdooModel[]
  fetchModelFields: (modelName: string) => Promise<void>
  fetchPreviewData: (modelName: string, relationField?: string) => Promise<void>
}

export function TableEditor({
  section,
  colors,
  onUpdate,
  template,
  odooModels,
  fetchModelFields,
  fetchPreviewData,
}: TableEditorProps) {
  // Local state for this table's model fields
  const [tableModelFields, setTableModelFields] = useState<ModelField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)

  // Fetch fields when the table's model changes
  useEffect(() => {
    if (section.odooModel) {
      setLoadingFields(true)
      fetchModelFields(section.odooModel)
        .then(() => {
          setLoadingFields(false)
        })
        .catch(() => {
          setLoadingFields(false)
        })
      // Fetch preview data for this model
      fetchPreviewData(section.odooModel)
    }
  }, [section.odooModel])

  // Update local fields when global modelFields changes
  useEffect(() => {
    const model = odooModels.find((m) => m.model === section.odooModel)
    if (model) {
      setTableModelFields(model.fields || [])
    }
  }, [section.odooModel, odooModels])

  const addColumn = () => {
    const newColumn: TableColumn = {
      id: `col_${Date.now()}`,
      field: "",
      label: "New Column",
      width: 1,
      align: "left",
      format: "text",
    }
    onUpdate({ columns: [...section.columns, newColumn] })
  }

  const updateColumn = (colId: string, updates: Partial<TableColumn>) => {
    onUpdate({
      columns: section.columns.map((c) => (c.id === colId ? { ...c, ...updates } : c)),
    })
  }

  const removeColumn = (colId: string) => {
    onUpdate({ columns: section.columns.filter((c) => c.id !== colId) })
  }

  // Add a field from the available model fields as a column
  const addFieldAsColumn = (fieldName: string, fieldLabel: string) => {
    const newColumn: TableColumn = {
      id: `col_${Date.now()}`,
      field: fieldName,
      label: fieldLabel,
      width: 1,
      align: "left",
      format: "text",
    }
    onUpdate({ columns: [...section.columns, newColumn] })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <Label style={{ fontSize: "0.8rem" }}>Section Title</Label>
        <Input
          value={section.title || ""}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="e.g., Stock Items"
        />
      </div>

      <div>
        <Label style={{ fontSize: "0.8rem" }}>Table Theme</Label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.5rem",
            marginTop: "0.25rem",
          }}
        >
          {TABLE_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onUpdate({ theme: theme.id })}
              style={{
                padding: "0.5rem",
                borderRadius: "0.375rem",
                border: `1px solid ${colors.border}`,
                background:
                  section.theme === theme.id ? template.primaryColor : colors.card,
                color:
                  section.theme === theme.id ? "white" : colors.textPrimary,
                cursor: "pointer",
                fontSize: "0.75rem",
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 500 }}>{theme.name}</div>
              <div style={{ fontSize: "0.65rem", opacity: 0.8 }}>
                {theme.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label style={{ fontSize: "0.8rem" }}>Data Source Model</Label>
        <Select
          value={section.odooModel}
          onValueChange={(v) => {
            onUpdate({ odooModel: v, columns: [] })
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a model..." />
          </SelectTrigger>
          <SelectContent>
            {odooModels.map((model) => (
              <SelectItem key={model.model} value={model.model}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loadingFields && (
          <p
            style={{
              fontSize: "0.7rem",
              color: colors.textSecondary,
              marginTop: "0.25rem",
            }}
          >
            Loading fields...
          </p>
        )}
      </div>

      {/* Add Column from Fields Section */}
      <div>
        <Label style={{ fontSize: "0.8rem" }}>Add Column from Fields</Label>
        <p
          style={{
            fontSize: "0.7rem",
            color: colors.textSecondary,
            marginBottom: "0.25rem",
          }}
        >
          Click a field to add it as a column
        </p>
        {tableModelFields.length === 0 ? (
          <p style={{ fontSize: "0.75rem", color: colors.textSecondary }}>
            {section.odooModel
              ? "No fields available for this model"
              : "Select a model above to see available fields"}
          </p>
        ) : (
          <div
            style={{
              maxHeight: "150px",
              overflowY: "auto",
              border: `1px solid ${colors.border}`,
              borderRadius: "0.375rem",
              padding: "0.5rem",
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "0.25rem",
            }}
          >
            {tableModelFields.map((field) => {
              const isAdded = section.columns.some(
                (col) => col.field === field.name
              )
              return (
                <button
                  key={field.name}
                  onClick={() =>
                    !isAdded && addFieldAsColumn(field.name, field.label || field.name)
                  }
                  disabled={isAdded}
                  style={{
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.25rem",
                    border: "none",
                    background: isAdded
                      ? template.primaryColor
                      : colors.mutedBg,
                    color: isAdded ? "white" : colors.textPrimary,
                    cursor: isAdded ? "default" : "pointer",
                    fontSize: "0.75rem",
                    textAlign: "left",
                    opacity: isAdded ? 0.7 : 1,
                  }}
                  title={`${field.type}: ${field.label || field.name}`}
                >
                  {field.label || field.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Existing Columns */}
      {section.columns.length > 0 && (
        <div>
          <Label style={{ fontSize: "0.8rem" }}>Columns</Label>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {section.columns.map((col) => (
              <div
                key={col.id}
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <div style={{ flex: 2 }}>
                  <Select
                    value={col.field}
                    onValueChange={(v) => updateColumn(col.id, { field: v })}
                  >
                    <SelectTrigger style={{ fontSize: "0.8rem", width: "100%" }}>
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tableModelFields.map((field) => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.label || field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  value={col.label}
                  onChange={(e) => updateColumn(col.id, { label: e.target.value })}
                  placeholder="Label"
                  style={{ flex: 1 }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeColumn(col.id)}
                >
                  <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Switch
            checked={section.showRowNumbers}
            onCheckedChange={(v) => onUpdate({ showRowNumbers: v })}
          />
          <span style={{ fontSize: "0.85rem" }}>Show Row Numbers</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Switch
            checked={section.alternateColors}
            onCheckedChange={(v) => onUpdate({ alternateColors: v })}
          />
          <span style={{ fontSize: "0.85rem" }}>Alternate Row Colors</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Switch
            checked={section.showHeader}
            onCheckedChange={(v) => onUpdate({ showHeader: v })}
          />
          <span style={{ fontSize: "0.85rem" }}>Show Header</span>
        </div>
      </div>
    </div>
  )
}
