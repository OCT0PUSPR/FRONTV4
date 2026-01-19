/**
 * Company Content Component
 *
 * Renders the company section in the preview panel.
 * Displays company information with configurable alignment.
 */

import { CompanySection, ReportTemplate } from "../types"

interface CompanyContentProps {
  section: CompanySection
  template: ReportTemplate
  previewData: Record<string, any>
}

export function CompanyContent({
  section,
  template,
  previewData,
}: CompanyContentProps) {
  const textAlignStyles = {
    left: "left" as const,
    center: "center" as const,
    right: "right" as const,
  }

  const companyData = previewData?.company || {}

  // Helper to get field value with fallback
  const getFieldValue = (fieldName: string): string => {
    const value = companyData[fieldName]
    if (value === undefined || value === null) return ""
    return String(value)
  }

  return (
    <div
      style={{
        marginBottom: "1.5rem",
        paddingBottom: "1rem",
        borderBottom: `2px solid ${template.primaryColor}`,
      }}
    >
      <div style={{ textAlign: textAlignStyles[section.layout] }}>
        {section.fields
          .filter((f) => f.enabled)
          .map((field) => {
            const value = getFieldValue(field.field)
            // Handle many2one fields that have _display suffix
            const displayValue =
              value === "" && companyData[`${field.field}_display`]
                ? companyData[`${field.field}_display`]
                : value

            if (!value && !displayValue) return null

            return (
              <div key={field.field} style={{ marginBottom: "0.25rem" }}>
                {field.field === "name" ? (
                  <h3
                    style={{
                      margin: "0 0 0.5rem 0",
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      color: template.primaryColor,
                    }}
                  >
                    {displayValue || value || field.label}
                  </h3>
                ) : (
                  <p
                    style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}
                  >
                    {displayValue || value}
                  </p>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
