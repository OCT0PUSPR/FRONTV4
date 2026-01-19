/**
 * Section Preview Component
 *
 * Wrapper component for rendering sections in the A4 preview panel.
 * Handles selection state and renders the appropriate content component.
 */

import { Settings } from "lucide-react"
import { ReportSection, ReportTemplate } from "./types"
import { SECTION_TYPES } from "./constants"
import { SectionContent } from "./SectionContent"

interface SectionPreviewProps {
  section: ReportSection
  template: ReportTemplate
  isSelected: boolean
  onClick: () => void
  previewData: Record<string, any>
}

export function SectionPreview({
  section,
  template,
  isSelected,
  onClick,
  previewData,
}: SectionPreviewProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: "relative",
        cursor: "pointer",
        transition: "all 0.2s",
        outline: isSelected
          ? `2px solid ${template.primaryColor}`
          : "2px solid transparent",
        outlineOffset: "2px",
        borderRadius: "0.25rem",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.outline = `1px dashed ${template.primaryColor}40`
          e.currentTarget.style.outlineOffset = "2px"
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.outline = "none"
        }
      }}
    >
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: "-8px",
            right: "-8px",
            width: "20px",
            height: "20px",
            background: template.primaryColor,
            borderRadius: "50%",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "10px",
          }}
        >
          <Settings style={{ width: 12, height: 12 }} />
        </div>
      )}

      {!section.enabled ? (
        <div
          style={{
            padding: "1rem",
            textAlign: "center",
            color: "#94a3b8",
            fontStyle: "italic",
            background: "#f8fafc",
            borderLeft: `3px solid ${template.primaryColor}`,
            margin: "0.5rem 0",
          }}
        >
          [Hidden Section: {SECTION_TYPES[section.type].label}]
        </div>
      ) : (
        <SectionContent section={section} template={template} previewData={previewData} />
      )}
    </div>
  )
}
