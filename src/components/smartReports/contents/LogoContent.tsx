/**
 * Logo Content Component
 *
 * Renders the logo section in the preview panel.
 * Displays image or icon logo with configurable size and alignment.
 */

import * as LucideIcons from "lucide-react"
import { LogoSection, ReportTemplate } from "../types"

interface LogoContentProps {
  section: LogoSection
  template: ReportTemplate
}

export function LogoContent({ section, template }: LogoContentProps) {
  const alignmentStyles: Record<string, string> = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
  }

  return (
    <div
      style={{
        marginBottom: "1rem",
        display: "flex",
        justifyContent: alignmentStyles[section.align],
      }}
    >
      {section.logoType === "icon" ? (
        <div
          style={{
            width: section.iconSize,
            height: section.iconSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {(() => {
            const IconComponent = (LucideIcons as Record<string, any>)[
              section.iconName || "Building2"
            ]
            return IconComponent ? (
              <IconComponent
                style={{
                  color: template.primaryColor,
                  width: section.iconSize,
                  height: section.iconSize,
                }}
              />
            ) : null
          })()}
        </div>
      ) : (
        section.imageData && (
          <img
            src={section.imageData}
            alt="Logo"
            style={{ maxWidth: 200, maxHeight: 100, objectFit: "contain" }}
          />
        )
      )}
    </div>
  )
}
