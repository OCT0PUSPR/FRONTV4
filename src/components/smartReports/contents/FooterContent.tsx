/**
 * Footer Content Component
 *
 * Renders the footer section in the preview panel.
 * Displays page numbers, timestamps, and custom footer text.
 */

import { FooterSection, ReportTemplate } from "../types"

interface FooterContentProps {
  section: FooterSection
  template: ReportTemplate
}

export function FooterContent({ section, template }: FooterContentProps) {
  return (
    <div
      style={{
        marginTop: "1rem",
        paddingTop: "0.75rem",
        borderTop: `1px solid ${template.borderColor}`,
        fontSize: "0.75rem",
        color: "#94a3b8",
        textAlign: "center",
      }}
    >
      {section.showTimestamp && new Date().toLocaleString()}
      {section.showTimestamp && section.showPageNumbers && <span> • </span>}
      {section.showPageNumbers && <span>Page 1/1</span>}
      {section.customText && (
        <div style={{ marginTop: "0.5rem" }}>{section.customText}</div>
      )}
    </div>
  )
}
