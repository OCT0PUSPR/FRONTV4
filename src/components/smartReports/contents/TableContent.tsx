/**
 * Table Content Component
 *
 * Renders the table section in the preview panel.
 * Displays data with various themes and formatting options.
 */

import { TableSection, ReportTemplate } from "../types"

interface TableContentProps {
  section: TableSection
  template: ReportTemplate
  previewData: Record<string, any>
}

export function TableContent({
  section,
  template,
  previewData,
}: TableContentProps) {
  // Get real data from preview for the selected model
  const modelData = previewData?.[section.odooModel]
  // Use the main record data if available, otherwise use relatedData
  const tableData = modelData?.record ? [modelData.record] : (modelData?.relatedData || [])

  const getValue = (row: any, column: any) => {
    const parts = column.field.split(".")
    let value = row
    for (const part of parts) {
      // First try the direct field
      value = value?.[part]
      // If empty, try the _display suffix for many2one fields
      if (!value && !parts.includes("_display")) {
        value = row[`${part}_display`]
      }
    }
    // Handle numeric formatting
    if (column.format === "number" && typeof value === "number") {
      return value.toFixed(2)
    }
    if (column.format === "currency" && typeof value === "number") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value)
    }
    return value ?? "-"
  }

  // Theme-based styles
  const getThemeStyles = () => {
    switch (section.theme) {
      case "simple":
        return {
          table: {
            borderCollapse: "collapse" as const,
            fontSize: `${template.fontSize}px`,
            width: "100%" as const,
          },
          th: {
            padding: "0.5rem",
            textAlign: "left" as const,
            borderBottom: `2px solid ${template.primaryColor}`,
            fontWeight: 600,
            color: template.primaryColor,
          },
          td: { padding: "0.5rem", borderBottom: `1px solid ${template.borderColor}` },
        }
      case "striped":
        return {
          table: {
            borderCollapse: "collapse" as const,
            fontSize: `${template.fontSize}px`,
            width: "100%" as const,
          },
          th: {
            padding: "0.5rem",
            textAlign: "left" as const,
            background: template.primaryColor,
            color: "white",
            fontWeight: 600,
          },
          td: { padding: "0.5rem" },
        }
      case "boxed":
        return {
          table: {
            borderCollapse: "collapse" as const,
            fontSize: `${template.fontSize}px`,
            border: `2px solid ${template.borderColor}`,
            width: "100%" as const,
          },
          th: {
            padding: "0.5rem",
            textAlign: "left" as const,
            background: template.headerBgColor,
            border: `1px solid ${template.borderColor}`,
            fontWeight: 600,
          },
          td: {
            padding: "0.5rem",
            border: `1px solid ${template.borderColor}`,
          },
        }
      case "modern":
        return {
          table: {
            borderCollapse: "collapse" as const,
            fontSize: `${template.fontSize}px`,
            width: "100%" as const,
          },
          th: {
            padding: "0.75rem 0.5rem",
            textAlign: "left" as const,
            background: template.primaryColor,
            color: "white",
            fontWeight: 600,
            textTransform: "uppercase" as const,
            fontSize: "0.75rem",
            letterSpacing: "0.05em",
          },
          td: {
            padding: "0.75rem 0.5rem",
            borderBottom: `1px solid ${template.borderColor}`,
          },
        }
      case "compact":
        return {
          table: {
            borderCollapse: "collapse" as const,
            fontSize: `${template.fontSize - 1}px`,
            width: "100%" as const,
          },
          th: {
            padding: "0.25rem 0.5rem",
            textAlign: "left" as const,
            background: template.headerBgColor,
            fontWeight: 600,
            fontSize: "0.75rem",
          },
          td: {
            padding: "0.25rem 0.5rem",
            borderBottom: `1px solid ${template.borderColor}`,
          },
        }
      default:
        return {
          table: {
            borderCollapse: "collapse" as const,
            fontSize: `${template.fontSize}px`,
            width: "100%" as const,
          },
          th: {
            padding: "0.5rem",
            textAlign: "left" as const,
            borderBottom: `1px solid ${template.borderColor}`,
            fontWeight: 600,
          },
          td: {
            padding: "0.5rem",
            borderBottom: `1px solid ${template.borderColor}`,
          },
        }
    }
  }

  const themeStyles = getThemeStyles()

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {section.title && (
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            marginBottom: "0.75rem",
            color: template.primaryColor,
          }}
        >
          {section.title}
        </h3>
      )}
      <table style={{ ...themeStyles.table, width: "100%" }}>
        {section.showHeader && (
          <thead>
            <tr>
              {section.showRowNumbers && (
                <th style={{ ...themeStyles.th, textAlign: "center" }}>#</th>
              )}
              {section.columns.map((col) => (
                <th key={col.id} style={{ ...themeStyles.th, textAlign: col.align as any }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {tableData.length === 0 ? (
            <tr>
              <td
                colSpan={section.columns.length + (section.showRowNumbers ? 1 : 0)}
                style={{
                  ...themeStyles.td,
                  textAlign: "center",
                  color: "#94a3b8",
                  fontStyle: "italic",
                  padding: "2rem",
                }}
              >
                Select a model to see data
              </td>
            </tr>
          ) : (
            tableData.map((row, i) => {
              const rowStyle =
                section.theme === "striped" && i % 2 === 0
                  ? { background: template.headerBgColor }
                  : section.theme === "boxed" && i % 2 === 0
                  ? { background: template.headerBgColor }
                  : {}

              return (
                <tr key={i} style={rowStyle}>
                  {section.showRowNumbers && (
                    <td style={{ ...themeStyles.td, textAlign: "center" }}>{i + 1}</td>
                  )}
                  {section.columns.map((col) => (
                    <td key={col.id} style={{ ...themeStyles.td, textAlign: col.align as any }}>
                      {getValue(row, col)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
