/**
 * Line Editor Component
 *
 * Provides editing interface for the Line section type.
 * Line sections add horizontal dividers between sections.
 */

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LineSection } from "../types"

interface LineEditorProps {
  section: LineSection
  colors: any
  t: any
  onUpdate: (updates: Partial<LineSection>) => void
}

export function LineEditor({ section, onUpdate }: LineEditorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <Label style={{ fontSize: "0.8rem" }}>Line Style</Label>
        <Select
          value={section.style}
          onValueChange={(v) =>
            onUpdate({ style: v as "solid" | "dashed" | "double" })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="double">Double</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label style={{ fontSize: "0.8rem" }}>Thickness (px)</Label>
        <Input
          type="number"
          min={1}
          max={5}
          value={section.thickness}
          onChange={(e) => onUpdate({ thickness: parseInt(e.target.value) || 1 })}
        />
      </div>
    </div>
  )
}
