/**
 * Products Editor Component
 *
 * Provides editing interface for the Products section type.
 * Product sections display line items with auto-detected fields from the template's Odoo model.
 */

import { useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ProductsSection,
  ModelField,
  OdooModel,
  ReportTemplate,
} from "../types"

interface ProductsEditorProps {
  section: ProductsSection
  colors: any
  t: any
  getModelFields: (model: string) => ModelField[]
  onUpdate: (updates: Partial<ProductsSection>) => void
  template: ReportTemplate
  odooModels: OdooModel[]
  fetchPreviewData: (modelName: string, relationField?: string) => Promise<void>
}

export function ProductsEditor({
  section,
  colors,
  onUpdate,
  template,
  odooModels,
  fetchPreviewData,
}: ProductsEditorProps) {
  // Auto-detect line field from template model
  const templateModel = odooModels.find((m) => m.model === template.odooModel)
  const lineFields =
    templateModel?.fields.filter(
      (f) => f.type === "one2many" || f.type === "many2many"
    ) || []
  const detectedLineField = lineFields.find((f) => f.isLineField) || lineFields[0]

  useEffect(() => {
    // Fetch preview data when template model changes
    if (template.odooModel && detectedLineField) {
      fetchPreviewData(template.odooModel, detectedLineField.name)
    }
  }, [template.odooModel, detectedLineField?.name])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <Label style={{ fontSize: "0.8rem" }}>Section Title</Label>
        <Input
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="e.g., Items Received"
        />
      </div>

      {!template.odooModel && (
        <div
          style={{
            padding: "0.75rem",
            background: colors.mutedBg,
            borderRadius: "0.375rem",
            border: `1px solid ${colors.border}`,
          }}
        >
          <p style={{ fontSize: "0.8rem", color: colors.textSecondary, margin: 0 }}>
            Select a model in the template settings to use the Products section.
          </p>
        </div>
      )}

      {template.odooModel && (
        <div>
          <Label style={{ fontSize: "0.8rem" }}>Data Source</Label>
          <p
            style={{
              fontSize: "0.7rem",
              color: colors.textSecondary,
              marginBottom: "0.25rem",
            }}
          >
            Using template model:{" "}
            <strong>{templateModel?.name || template.odooModel}</strong>
          </p>
          {detectedLineField ? (
            <p style={{ fontSize: "0.75rem", color: colors.textSecondary }}>
              Line items field:{" "}
              <strong>{detectedLineField.label || detectedLineField.name}</strong>
            </p>
          ) : (
            <p style={{ fontSize: "0.75rem", color: "#ef4444" }}>
              No one2many/many2many field found in this model
            </p>
          )}
        </div>
      )}

      <div>
        <Label style={{ fontSize: "0.8rem" }}>Show Fields</Label>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Switch
              checked={section.showSKU}
              onCheckedChange={(v) => onUpdate({ showSKU: v })}
            />
            <span style={{ fontSize: "0.85rem" }}>SKU</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Switch
              checked={section.showImages}
              onCheckedChange={(v) => onUpdate({ showImages: v })}
            />
            <span style={{ fontSize: "0.85rem" }}>Images</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Switch
              checked={section.showQuantity}
              onCheckedChange={(v) => onUpdate({ showQuantity: v })}
            />
            <span style={{ fontSize: "0.85rem" }}>Quantity</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Switch
              checked={section.showPrice}
              onCheckedChange={(v) => onUpdate({ showPrice: v })}
            />
            <span style={{ fontSize: "0.85rem" }}>Price</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Switch
              checked={section.showRFID}
              onCheckedChange={(v) => onUpdate({ showRFID: v })}
            />
            <span style={{ fontSize: "0.85rem" }}>RFID Serial</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Switch
              checked={section.showTotal}
              onCheckedChange={(v) => onUpdate({ showTotal: v })}
            />
            <span style={{ fontSize: "0.85rem" }}>Total</span>
          </div>
        </div>
      </div>

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
            checked={section.showSectionTotal}
            onCheckedChange={(v) => onUpdate({ showSectionTotal: v })}
          />
          <span style={{ fontSize: "0.85rem" }}>Show Section Total</span>
        </div>
      </div>
    </div>
  )
}
