/**
 * Logo Editor Component
 *
 * Provides editing interface for the Logo section type.
 * Logo sections display images or icons with configurable size and alignment.
 */

import * as LucideIcons from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { LogoSection, ReportTemplate } from "../types"
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react"

interface LogoEditorProps {
  section: LogoSection
  template: ReportTemplate
  colors: any
  t: any
  onUpdate: (updates: Partial<LogoSection>) => void
  onOpenIconPicker: () => void
  selectedIconFor: string | null
  setSelectedIconFor: (id: string | null) => void
  setShowIconPicker: (show: boolean) => void
}

export function LogoEditor({
  section,
  template,
  colors,
  onUpdate,
  setSelectedIconFor,
  setShowIconPicker,
}: LogoEditorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <Label style={{ fontSize: "0.8rem" }}>Logo Type</Label>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
          <button
            onClick={() => onUpdate({ logoType: "icon" })}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: `1px solid ${colors.border}`,
              background:
                section.logoType === "icon" ? template.primaryColor : colors.card,
              color: section.logoType === "icon" ? "white" : colors.textPrimary,
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Icon
          </button>
          <button
            onClick={() => onUpdate({ logoType: "image" })}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: `1px solid ${colors.border}`,
              background:
                section.logoType === "image" ? template.primaryColor : colors.card,
              color: section.logoType === "image" ? "white" : colors.textPrimary,
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Image
          </button>
        </div>
      </div>

      {section.logoType === "icon" ? (
        <>
          <div>
            <Label style={{ fontSize: "0.8rem" }}>Icon</Label>
            <button
              onClick={() => {
                setSelectedIconFor(section.id)
                setShowIconPicker(true)
              }}
              style={{
                width: "100%",
                marginTop: "0.25rem",
                padding: "0.5rem",
                borderRadius: "0.375rem",
                border: `1px solid ${colors.border}`,
                background: colors.card,
                color: colors.textPrimary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {(() => {
                const IconComponent = (LucideIcons as Record<string, any>)[
                  section.iconName || "Building2"
                ]
                return IconComponent ? <IconComponent className="w-5 h-5" /> : null
              })()}
              <span>{section.iconName || "Choose Icon"}</span>
            </button>
          </div>
          <div>
            <Label style={{ fontSize: "0.8rem" }}>Icon Size</Label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "0.25rem",
              }}
            >
              <Input
                type="range"
                min={24}
                max={96}
                value={section.iconSize}
                onChange={(e) => onUpdate({ iconSize: parseInt(e.target.value) })}
                style={{ flex: 1 }}
              />
              <span
                style={{
                  fontSize: "0.85rem",
                  minWidth: 40,
                  textAlign: "center",
                }}
              >
                {section.iconSize}px
              </span>
            </div>
          </div>
        </>
      ) : (
        <div>
          <Label style={{ fontSize: "0.8rem" }}>Image (Base64)</Label>
          <p
            style={{
              fontSize: "0.75rem",
              color: colors.textSecondary,
              marginBottom: "0.25rem",
            }}
          >
            Paste base64 encoded image data
          </p>
          <Textarea
            value={section.imageData || ""}
            onChange={(e) => onUpdate({ imageData: e.target.value })}
            placeholder="data:image/png;base64,..."
            rows={3}
            style={{ marginTop: "0.25rem" }}
          />
          {section.imageData && (
            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.5rem",
                border: `1px solid ${colors.border}`,
                borderRadius: "0.375rem",
              }}
            >
              <img src={section.imageData} alt="Logo" style={{ maxHeight: 60 }} />
            </div>
          )}
        </div>
      )}

      <div>
        <Label style={{ fontSize: "0.8rem" }}>Alignment</Label>
        <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.25rem" }}>
          <button
            onClick={() => onUpdate({ align: "left" })}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: `1px solid ${colors.border}`,
              background:
                section.align === "left" ? template.primaryColor : colors.card,
              color: section.align === "left" ? "white" : colors.textPrimary,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            <AlignLeft style={{ margin: "0 auto" }} />
          </button>
          <button
            onClick={() => onUpdate({ align: "center" })}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: `1px solid ${colors.border}`,
              background:
                section.align === "center" ? template.primaryColor : colors.card,
              color: section.align === "center" ? "white" : colors.textPrimary,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            <AlignCenter style={{ margin: "0 auto" }} />
          </button>
          <button
            onClick={() => onUpdate({ align: "right" })}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: `1px solid ${colors.border}`,
              background:
                section.align === "right" ? template.primaryColor : colors.card,
              color: section.align === "right" ? "white" : colors.textPrimary,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            <AlignRight style={{ margin: "0 auto" }} />
          </button>
        </div>
      </div>
    </div>
  )
}
