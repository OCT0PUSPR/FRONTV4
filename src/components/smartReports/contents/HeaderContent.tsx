/**
 * Header Content Component
 *
 * Renders the header section in the preview panel.
 * Displays document title on the left and company info on the right.
 */

import { Building2 } from "lucide-react"
import { HeaderSection, ReportTemplate } from "../types"

interface HeaderContentProps {
  section: HeaderSection
  template: ReportTemplate
  previewData: Record<string, any>
}

export function HeaderContent({
  section,
  previewData,
}: HeaderContentProps) {
  const companyData = previewData?.company || {}
  const recordData = previewData?.["stock.picking"]?.record || {}

  // Helper to get field value from company or record
  const getFieldValue = (fieldName: string): string => {
    // Check company data first
    let value = companyData[fieldName]
    if (value !== undefined && value !== null) return String(value)

    // Check record data
    value = recordData[fieldName]
    if (value !== undefined && value !== null) return String(value)

    // Check _display variants
    const displayField = `${fieldName}_display`
    value = recordData[displayField] || companyData[displayField]
    if (value !== undefined && value !== null) return String(value)

    return ""
  }

  return (
    <div style={{ marginBottom: "2rem", paddingBottom: "1.5rem" }}>
      {/* Two column layout */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "2rem" }}>
        {/* Left Column - Document Info */}
        <div style={{ flex: 1 }}>
          <h1
            style={{
              margin: "0 0 1.5rem 0",
              fontSize: "1.75rem",
              fontWeight: "bold",
              color: "#000000",
              letterSpacing: "-0.02em",
            }}
          >
            {section.documentTitle}
          </h1>
          {section.leftFields
            .filter((f) => f.enabled)
            .map((field) => {
              const value = getFieldValue(field.field)
              if (!value) return null

              return (
                <div key={field.field} style={{ marginBottom: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#888888",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginRight: "0.5rem",
                    }}
                  >
                    {field.label}
                  </span>
                  <div
                    style={{ fontSize: "0.875rem", color: "#000000", fontWeight: 400 }}
                  >
                    {value}
                  </div>
                </div>
              )
            })}
        </div>

        {/* Right Column - Company Info */}
        <div style={{ flex: 1, textAlign: "right" }}>
          {section.showLogo && (
            <div style={{ marginBottom: "0.75rem" }}>
              <Building2
                style={{ width: 32, height: 32, color: "#000000", marginLeft: "auto" }}
              />
            </div>
          )}
          {section.rightFields
            .filter((f) => f.enabled)
            .map((field) => {
              const value = getFieldValue(field.field)
              if (!value) return null

              return (
                <div key={field.field} style={{ marginBottom: "0.35rem" }}>
                  {field.field === "name" ? (
                    <div
                      style={{ fontSize: "0.95rem", fontWeight: 600, color: "#000000" }}
                    >
                      {value}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.8rem", color: "#666666" }}>{value}</div>
                  )}
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
