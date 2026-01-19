/**
 * Company Editor Component
 *
 * Provides editing interface for the Company section type.
 * Company sections display company information with configurable alignment.
 */

import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CompanySection, ModelField, OdooModel, ReportTemplate } from "../types"
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react"

interface CompanyEditorProps {
  section: CompanySection
  template: ReportTemplate
  colors: any
  t: any
  onUpdate: (updates: Partial<CompanySection>) => void
  companies: any[]
  odooModels: OdooModel[]
  fetchModelFields: (modelName: string) => Promise<void>
}

export function CompanyEditor({
  section,
  template,
  colors,
  onUpdate,
  odooModels,
  fetchModelFields,
}: CompanyEditorProps) {
  const [companyFields, setCompanyFields] = useState<ModelField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)

  // Fetch res.company fields on mount
  useEffect(() => {
    const loadCompanyFields = async () => {
      setLoadingFields(true)
      const companyModel = odooModels.find((m) => m.model === "res.company")
      if (companyModel && companyModel.fields.length > 0) {
        setCompanyFields(companyModel.fields)
      } else {
        // Fetch from API if not loaded
        await fetchModelFields("res.company")
        const updatedModel = odooModels.find((m) => m.model === "res.company")
        setCompanyFields(updatedModel?.fields || [])
      }
      setLoadingFields(false)
    }
    loadCompanyFields()
  }, [odooModels])

  const toggleField = (fieldName: string) => {
    const exists = section.fields.find((f) => f.field === fieldName)
    if (exists) {
      onUpdate({ fields: section.fields.filter((f) => f.field !== fieldName) })
    } else {
      const field = companyFields.find((f) => f.name === fieldName)
      onUpdate({
        fields: [
          ...section.fields,
          { field: fieldName, label: field?.label || fieldName, enabled: true },
        ],
      })
    }
  }

  const isFieldEnabled = (fieldName: string) => {
    return section.fields.some((f) => f.field === fieldName)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <Label style={{ fontSize: "0.8rem" }}>Alignment</Label>
        <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.25rem" }}>
          <button
            onClick={() => onUpdate({ layout: "left" })}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: `1px solid ${colors.border}`,
              background:
                section.layout === "left" ? template.primaryColor : colors.card,
              color: section.layout === "left" ? "white" : colors.textPrimary,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            <AlignLeft style={{ margin: "0 auto" }} />
          </button>
          <button
            onClick={() => onUpdate({ layout: "center" })}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: `1px solid ${colors.border}`,
              background:
                section.layout === "center" ? template.primaryColor : colors.card,
              color: section.layout === "center" ? "white" : colors.textPrimary,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            <AlignCenter style={{ margin: "0 auto" }} />
          </button>
          <button
            onClick={() => onUpdate({ layout: "right" })}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: `1px solid ${colors.border}`,
              background:
                section.layout === "right" ? template.primaryColor : colors.card,
              color: section.layout === "right" ? "white" : colors.textPrimary,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            <AlignRight style={{ margin: "0 auto" }} />
          </button>
        </div>
      </div>

      <div>
        <Label style={{ fontSize: "0.8rem" }}>Fields to Display</Label>
        <p
          style={{
            fontSize: "0.75rem",
            color: colors.textSecondary,
            marginBottom: "0.5rem",
          }}
        >
          Select fields from res.company model
        </p>
        {loadingFields ? (
          <p style={{ fontSize: "0.75rem", color: colors.textSecondary }}>
            Loading fields...
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.375rem",
              maxHeight: 250,
              overflowY: "auto",
            }}
          >
            {companyFields.map((field) => (
              <div
                key={field.name}
                onClick={() => toggleField(field.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.625rem",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  background: isFieldEnabled(field.name)
                    ? template.primaryColor + "15"
                    : colors.mutedBg,
                  border: `1px solid ${
                    isFieldEnabled(field.name)
                      ? template.primaryColor
                      : colors.border
                  }`,
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "4px",
                    background: isFieldEnabled(field.name)
                      ? template.primaryColor
                      : "transparent",
                    border: `1px solid ${
                      isFieldEnabled(field.name)
                        ? template.primaryColor
                        : colors.border
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isFieldEnabled(field.name) && (
                    <Check className="w-3 h-3" style={{ color: "white" }} />
                  )}
                </div>
                <span
                  style={{ flex: 1, fontSize: "0.875rem", color: colors.textPrimary }}
                >
                  {field.label || field.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
