/**
 * Text Content Component
 *
 * Renders the text section in the preview panel.
 * Displays custom text with configurable font size, weight, and alignment.
 */

import { TextSection, ReportTemplate } from "../types"

interface TextContentProps {
  section: TextSection
  template: ReportTemplate
}

export function TextContent({ section }: TextContentProps) {
  return (
    <div style={{ marginBottom: "1rem", textAlign: section.align }}>
      <p
        style={{
          margin: 0,
          fontSize: `${section.fontSize}px`,
          fontWeight: section.fontWeight === "bold" ? 700 : 400,
        }}
      >
        {section.content}
      </p>
    </div>
  )
}
