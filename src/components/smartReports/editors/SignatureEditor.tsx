/**
 * Signature Editor Component
 *
 * Provides editing interface for the Signature section type.
 * Signature sections display signature blocks with configurable layout and options.
 */

import { Plus, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SignatureSection, SignatureBlock } from "../types"

interface SignatureEditorProps {
  section: SignatureSection
  colors: any
  t: any
  onUpdate: (updates: Partial<SignatureSection>) => void
}

export function SignatureEditor({
  section,
  colors,
  onUpdate,
}: SignatureEditorProps) {
  const addSignature = () => {
    onUpdate({
      signatures: [
        ...section.signatures,
        {
          id: `sig_${Date.now()}`,
          label: "",
          required: false,
          showDate: true,
          showPrintedName: false,
        },
      ],
    })
  }

  const updateSignature = (sigId: string, updates: Partial<SignatureBlock>) => {
    onUpdate({
      signatures: section.signatures.map((s) =>
        s.id === sigId ? { ...s, ...updates } : s
      ),
    })
  }

  const removeSignature = (sigId: string) => {
    onUpdate({ signatures: section.signatures.filter((s) => s.id !== sigId) })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <Label style={{ fontSize: "0.8rem" }}>Section Title</Label>
        <Input
          value={section.title || ""}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="e.g., Acknowledgements"
        />
      </div>

      <div>
        <Label style={{ fontSize: "0.8rem" }}>Layout</Label>
        <Select
          value={section.layout}
          onValueChange={(v) => onUpdate({ layout: v as "horizontal" | "vertical" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="horizontal">Horizontal</SelectItem>
            <SelectItem value="vertical">Vertical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={addSignature}
        style={{ width: "100%" }}
      >
        <Plus className="w-4 h-4" style={{ marginRight: "0.5rem" }} />
        Add Signature
      </Button>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {section.signatures.map((sig, index) => (
          <div
            key={sig.id}
            style={{
              padding: "0.75rem",
              background: colors.mutedBg,
              borderRadius: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                Signature {index + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSignature(sig.id)}
              >
                <Trash2 className="w-3 h-3" style={{ color: "#ef4444" }} />
              </Button>
            </div>
            <Input
              value={sig.label}
              onChange={(e) => updateSignature(sig.id, { label: e.target.value })}
              placeholder="e.g., Warehouse Manager"
              style={{ marginBottom: "0.5rem" }}
            />
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Switch
                  checked={sig.required}
                  onCheckedChange={(v) => updateSignature(sig.id, { required: v })}
                />
                <span style={{ fontSize: "0.85rem" }}>Required</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Switch
                  checked={sig.showDate}
                  onCheckedChange={(v) => updateSignature(sig.id, { showDate: v })}
                />
                <span style={{ fontSize: "0.85rem" }}>Date</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Switch
                  checked={sig.showPrintedName}
                  onCheckedChange={(v) =>
                    updateSignature(sig.id, { showPrintedName: v })
                  }
                />
                <span style={{ fontSize: "0.85rem" }}>Printed Name</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
