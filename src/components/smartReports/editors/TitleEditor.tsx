/**
 * Title Editor Component
 *
 * Provides editing interface for the Title section type.
 * Title sections display document titles with optional reference, date, and partner fields.
 */

import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TitleSection, ModelField } from "../types"

interface TitleEditorProps {
  section: TitleSection
  colors: any
  t: any
  onUpdate: (updates: Partial<TitleSection>) => void
  modelFields: ModelField[]
}

export function TitleEditor({
  section,
  colors,
  onUpdate,
  modelFields,
}: TitleEditorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <Label style={{ fontSize: "0.8rem" }}>Document Title</Label>
        <Input
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="e.g., RECEIPT, INVOICE"
        />
      </div>

      <div>
        <Label style={{ fontSize: "0.8rem" }}>Title Field (Optional)</Label>
        <p
          style={{
            fontSize: "0.75rem",
            color: colors.textSecondary,
            marginBottom: "0.25rem",
          }}
        >
          Use a field from the bound model
        </p>
        <Select
          value={section.titleField || "__static__"}
          onValueChange={(v) =>
            onUpdate({ titleField: v === "__static__" ? undefined : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Static title..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__static__">Static Title</SelectItem>
            {modelFields
              .filter((f) => f.type === "char" || f.type === "text")
              .map((field) => (
                <SelectItem key={field.name} value={field.name}>
                  {field.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Switch
            checked={section.showReference}
            onCheckedChange={(v) => onUpdate({ showReference: v })}
          />
          <Label style={{ fontSize: "0.85rem" }}>Show Reference</Label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Switch
            checked={section.showDate}
            onCheckedChange={(v) => onUpdate({ showDate: v })}
          />
          <Label style={{ fontSize: "0.85rem" }}>Show Date</Label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Switch
            checked={section.showPartner}
            onCheckedChange={(v) => onUpdate({ showPartner: v })}
          />
          <Label style={{ fontSize: "0.85rem" }}>Show Customer/Partner</Label>
        </div>
        {section.showPartner && (
          <div>
            <Label style={{ fontSize: "0.8rem" }}>Partner Field</Label>
            <Select
              value={section.partnerField || ""}
              onValueChange={(v) => onUpdate({ partnerField: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modelFields
                  .filter(
                    (f) => f.relation === "res.partner" || f.name.includes("partner")
                  )
                  .map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
