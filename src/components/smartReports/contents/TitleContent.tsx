/**
 * Title Content Component
 *
 * Renders the title section in the preview panel.
 * Displays document title with optional reference, date, and partner information.
 */

import { TitleSection, ReportTemplate } from "../types"

interface TitleContentProps {
  section: TitleSection
  template: ReportTemplate
}

export function TitleContent({ section, template }: TitleContentProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: "1.5rem",
          fontWeight: "bold",
          textTransform: "uppercase",
          color: template.primaryColor,
        }}
      >
        {section.title}
      </h1>
      <div style={{ textAlign: "right", fontSize: "0.85rem", color: "#64748b" }}>
        {section.showReference && <div>Ref: WH/2024/001</div>}
        {section.showDate && <div>{new Date().toLocaleDateString()}</div>}
        {section.showPartner && <div>[Customer Name]</div>}
      </div>
    </div>
  )
}
