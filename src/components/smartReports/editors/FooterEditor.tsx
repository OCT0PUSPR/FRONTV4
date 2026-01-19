/**
 * Footer Editor Component
 *
 * Provides editing interface for the Footer section type.
 * Footer sections display page numbers, timestamps, and custom footer text.
 */

import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FooterSection } from "../types"

interface FooterEditorProps {
  section: FooterSection
  colors: any
  t: any
  onUpdate: (updates: Partial<FooterSection>) => void
}

export function FooterEditor({
  section,
  colors,
  onUpdate,
}: FooterEditorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Switch
            checked={section.showPageNumbers}
            onCheckedChange={(v) => onUpdate({ showPageNumbers: v })}
          />
          <span style={{ fontSize: "0.85rem" }}>Page Numbers</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Switch
            checked={section.showTimestamp}
            onCheckedChange={(v) => onUpdate({ showTimestamp: v })}
          />
          <span style={{ fontSize: "0.85rem" }}>Timestamp</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Switch
            checked={section.showPrintedBy}
            onCheckedChange={(v) => onUpdate({ showPrintedBy: v })}
          />
          <span style={{ fontSize: "0.85rem" }}>Printed By</span>
        </div>
      </div>
      <div>
        <Label style={{ fontSize: "0.8rem" }}>Custom Text</Label>
        <Input
          value={section.customText || ""}
          onChange={(e) => onUpdate({ customText: e.target.value })}
          placeholder="Optional footer text"
        />
      </div>
    </div>
  )
}
