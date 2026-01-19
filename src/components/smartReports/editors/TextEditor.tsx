/**
 * Text Editor Component
 *
 * Provides editing interface for the Text section type.
 * Text sections display custom text with configurable font size, weight, and alignment.
 */

import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TextSection } from "../types"
import { FONT_SIZES } from "../constants"
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react"

interface TextEditorProps {
  section: TextSection
  colors: any
  t: any
  onUpdate: (updates: Partial<TextSection>) => void
}

export function TextEditor({ section, colors, onUpdate }: TextEditorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <Label style={{ fontSize: "0.8rem" }}>Content</Label>
        <Textarea
          value={section.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Enter your text here..."
          rows={3}
        />
      </div>

      <div>
        <Label style={{ fontSize: "0.8rem" }}>Font Size</Label>
        <Select
          value={String(section.fontSize)}
          onValueChange={(v) => onUpdate({ fontSize: parseInt(v) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label style={{ fontSize: "0.8rem" }}>Weight</Label>
        <Select
          value={section.fontWeight}
          onValueChange={(v) => onUpdate({ fontWeight: v as "normal" | "bold" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label style={{ fontSize: "0.8rem" }}>Alignment</Label>
        <div
          style={{
            display: "flex",
            border: `1px solid ${colors.border}`,
            borderRadius: "0.5rem",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => onUpdate({ align: "left" })}
            style={{
              flex: 1,
              padding: "0.5rem",
              background: section.align === "left" ? "#3b82f6" : "transparent",
              border: "none",
              cursor: "pointer",
              color: section.align === "left" ? "white" : colors.textPrimary,
            }}
          >
            <AlignLeft style={{ margin: "0 auto" }} />
          </button>
          <button
            onClick={() => onUpdate({ align: "center" })}
            style={{
              flex: 1,
              padding: "0.5rem",
              background: section.align === "center" ? "#3b82f6" : "transparent",
              border: "none",
              borderLeft: `1px solid ${colors.border}`,
              borderRight: `1px solid ${colors.border}`,
              cursor: "pointer",
              color: section.align === "center" ? "white" : colors.textPrimary,
            }}
          >
            <AlignCenter style={{ margin: "0 auto" }} />
          </button>
          <button
            onClick={() => onUpdate({ align: "right" })}
            style={{
              flex: 1,
              padding: "0.5rem",
              background: section.align === "right" ? "#3b82f6" : "transparent",
              border: "none",
              cursor: "pointer",
              color: section.align === "right" ? "white" : colors.textPrimary,
            }}
          >
            <AlignRight style={{ margin: "0 auto" }} />
          </button>
        </div>
      </div>
    </div>
  )
}
