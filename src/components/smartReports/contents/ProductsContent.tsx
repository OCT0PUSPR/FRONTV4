/**
 * Products Content Component
 *
 * Renders the products section in the preview panel.
 * Displays line items with configurable columns and totals.
 */

import { ProductsSection, ReportTemplate } from "../types"

interface ProductsContentProps {
  section: ProductsSection
  template: ReportTemplate
  previewData: Record<string, any>
}

export function ProductsContent({
  section,
  template,
  previewData,
}: ProductsContentProps) {
  const columns: any[] = []
  if (section.showSKU) columns.push({ field: "product_id_default_code", label: "SKU", width: 1.5 })
  columns.push({ field: "product_id_display", label: "Product", width: 3 })
  if (section.showQuantity) columns.push({ field: "qty_done", label: "Qty", width: 1 })
  if (section.showPrice) columns.push({ field: "price_unit", label: "Price", width: 1 })
  if (section.showTotal) columns.push({ field: "total", label: "Total", width: 1 })
  if (section.showRFID) columns.push({ field: "x_rfid", label: "RFID Serial", width: 1.5 })

  // Get real data from preview using template model
  const modelData = previewData?.[template.odooModel || "stock.picking"]
  const itemsData = modelData?.relatedData || []

  const getValue = (row: any, column: any) => {
    const field = column.field
    let value = row[field]
    // Handle display values for many2one fields
    if (!value && field.includes("_display")) {
      value = row[field]
    } else if (!value && !field.includes("_display")) {
      value = row[`${field}_display`] || row[field]
    }
    // Handle numeric formatting
    if (column.format === "currency" && typeof value === "number") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value)
    }
    if (column.format === "number" && typeof value === "number") {
      return value.toFixed(2)
    }
    return value ?? "-"
  }

  const total = itemsData.reduce((sum, row) => sum + (row.qty_done || 0), 0)

  return (
    <div style={{ marginBottom: "1.5rem" }}>
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
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: `${template.fontSize}px`,
        }}
      >
        <thead>
          <tr style={{ background: template.headerBgColor }}>
            {section.showRowNumbers && (
              <th
                style={{
                  padding: "0.5rem",
                  textAlign: "center",
                  border: `1px solid ${template.borderColor}`,
                  fontWeight: 600,
                }}
              >
                #
              </th>
            )}
            {columns.map((col, i) => (
              <th
                key={i}
                style={{
                  padding: "0.5rem",
                  textAlign: "left",
                  border: `1px solid ${template.borderColor}`,
                  fontWeight: 600,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {itemsData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (section.showRowNumbers ? 1 : 0)}
                style={{
                  padding: "0.5rem",
                  textAlign: "center",
                  color: "#94a3b8",
                  fontStyle: "italic",
                }}
              >
                {!template.odooModel
                  ? "Select a model in template settings to see line items."
                  : "No line items data available."}
              </td>
            </tr>
          ) : (
            itemsData.map((row, i) => (
              <tr
                key={i}
                style={{ background: i % 2 === 0 ? "white" : template.headerBgColor }}
              >
                {section.showRowNumbers && (
                  <td
                    style={{
                      padding: "0.5rem",
                      textAlign: "center",
                      border: `1px solid ${template.borderColor}`,
                    }}
                  >
                    {i + 1}
                  </td>
                )}
                {columns.map((col, i) => (
                  <td
                    key={i}
                    style={{
                      padding: "0.5rem",
                      textAlign: "left",
                      border: `1px solid ${template.borderColor}`,
                    }}
                  >
                    {getValue(row, col)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {section.showSectionTotal && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              padding: "0.5rem 1rem",
              background: template.headerBgColor,
              borderRadius: "0.375rem",
            }}
          >
            Total: {total}
          </span>
        </div>
      )}
    </div>
  )
}
