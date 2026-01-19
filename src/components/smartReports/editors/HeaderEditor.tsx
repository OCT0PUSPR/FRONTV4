/**
 * Header Editor Component
 *
 * Provides editing interface for the Header section type.
 * Header sections combine document title and company info in a two-column layout.
 */

import { useState, useEffect } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HeaderSection, HeaderLeftField, HeaderRightField, ModelField, OdooModel } from "../types"

interface HeaderEditorProps {
  section: HeaderSection
  colors: any
  t: any
  onUpdate: (updates: Partial<HeaderSection>) => void
  companies: any[]
  odooModels: OdooModel[]
  fetchModelFields: (modelName: string) => Promise<void>
}

export function HeaderEditor({
  section,
  colors,
  onUpdate,
  odooModels,
  fetchModelFields,
}: HeaderEditorProps) {
  const [companyFields, setCompanyFields] = useState<ModelField[]>([])
  const [recordFields, setRecordFields] = useState<ModelField[]>([])

  useEffect(() => {
    const loadFields = async () => {
      // Load res.company fields
      const companyModel = odooModels.find((m) => m.model === "res.company")
      if (companyModel && companyModel.fields.length > 0) {
        setCompanyFields(companyModel.fields)
      } else if (companyModel) {
        await fetchModelFields("res.company")
      }

      // Load stock.picking fields for left column
      const pickingModel = odooModels.find((m) => m.model === "stock.picking")
      if (pickingModel && pickingModel.fields.length > 0) {
        setRecordFields(pickingModel.fields)
      } else if (pickingModel) {
        await fetchModelFields("stock.picking")
      }
    }
    loadFields()
  }, [odooModels])

  const updateLeftField = (index: number, updates: Partial<HeaderLeftField>) => {
    onUpdate({
      leftFields: section.leftFields.map((f, i) =>
        i === index ? { ...f, ...updates } : f
      ),
    })
  }

  const addLeftField = () => {
    onUpdate({
      leftFields: [
        ...section.leftFields,
        { field: "", label: "New Field", enabled: true },
      ],
    })
  }

  const removeLeftField = (index: number) => {
    onUpdate({
      leftFields: section.leftFields.filter((_, i) => i !== index),
    })
  }

  const updateRightField = (index: number, updates: Partial<HeaderRightField>) => {
    onUpdate({
      rightFields: section.rightFields.map((f, i) =>
        i === index ? { ...f, ...updates } : f
      ),
    })
  }

  const addRightField = () => {
    onUpdate({
      rightFields: [
        ...section.rightFields,
        { field: "", label: "New Field", enabled: true },
      ],
    })
  }

  const removeRightField = (index: number) => {
    onUpdate({
      rightFields: section.rightFields.filter((_, i) => i !== index),
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Document Title */}
      <div>
        <label
          style={{
            fontSize: "0.75rem",
            fontWeight: 500,
            color: colors.textSecondary,
            marginBottom: "0.35rem",
            display: "block",
          }}
        >
          Document Title
        </label>
        <Input
          value={section.documentTitle}
          onChange={(e) => onUpdate({ documentTitle: e.target.value })}
          placeholder="INVOICE"
          style={{ fontSize: "0.875rem" }}
        />
      </div>

      {/* Left Column - Document Fields */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <label
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              color: colors.textSecondary,
            }}
          >
            Left Column - Document Info
          </label>
          <Button
            size="sm"
            variant="ghost"
            onClick={addLeftField}
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
          >
            <Plus className="w-3 h-3" style={{ marginRight: "0.25rem" }} /> Add
            Field
          </Button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {section.leftFields.map((field, index) => (
            <div
              key={index}
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <div style={{ flex: 1 }}>
                <Input
                  value={field.label}
                  onChange={(e) => updateLeftField(index, { label: e.target.value })}
                  placeholder="Field Label"
                  style={{ fontSize: "0.8rem" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  value={field.field}
                  onChange={(e) =>
                    updateLeftField(index, { field: e.target.value })
                  }
                  placeholder="Field Name (e.g., name)"
                  style={{ fontSize: "0.8rem" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Switch
                  checked={field.enabled}
                  onCheckedChange={(v) => updateLeftField(index, { enabled: v })}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeLeftField(index)}
                style={{ padding: "0.25rem" }}
              >
                <Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column - Company Fields */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <label
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              color: colors.textSecondary,
            }}
          >
            Right Column - Company Info
          </label>
          <Button
            size="sm"
            variant="ghost"
            onClick={addRightField}
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
          >
            <Plus className="w-3 h-3" style={{ marginRight: "0.25rem" }} /> Add
            Field
          </Button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {section.rightFields.map((field, index) => (
            <div
              key={index}
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <div style={{ flex: 1 }}>
                <Input
                  value={field.label}
                  onChange={(e) =>
                    updateRightField(index, { label: e.target.value })
                  }
                  placeholder="Field Label"
                  style={{ fontSize: "0.8rem" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  value={field.field}
                  onChange={(e) =>
                    updateRightField(index, { field: e.target.value })
                  }
                  placeholder="Field Name (e.g., name)"
                  style={{ fontSize: "0.8rem" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Switch
                  checked={field.enabled}
                  onCheckedChange={(v) => updateRightField(index, { enabled: v })}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRightField(index)}
                style={{ padding: "0.25rem" }}
              >
                <Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Show Logo Toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 0",
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <span style={{ fontSize: "0.875rem" }}>Show Company Logo</span>
        <Switch
          checked={section.showLogo}
          onCheckedChange={(v) => onUpdate({ showLogo: v })}
        />
      </div>
    </div>
  )
}
