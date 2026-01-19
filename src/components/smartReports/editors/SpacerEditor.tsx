/**
 * Spacer Editor Component
 *
 * Provides editing interface for the Spacer section type.
 * Spacer sections add vertical spacing between sections.
 */

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SpacerSection } from "../types"

interface SpacerEditorProps {
  section: SpacerSection
  colors: any
  t: any
  onUpdate: (updates: Partial<SpacerSection>) => void
}

export function SpacerEditor({
  section,
  onUpdate,
}: SpacerEditorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Label style={{ fontSize: "0.8rem" }}>Height (pixels)</Label>
      <Input
        type="number"
        min={5}
        max={200}
        value={section.height}
        onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 20 })}
      />
    </div>
  )
}
