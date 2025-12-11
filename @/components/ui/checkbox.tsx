"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { useTheme } from "../../../context/theme"

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'checked'> {
  checked?: boolean | "indeterminate"
  onCheckedChange?: (checked: boolean) => void
  checkboxStyle?: React.CSSProperties
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, checkboxStyle, ...props }, ref) => {
    const { colors } = useTheme()
    const [internalChecked, setInternalChecked] = React.useState(checked === true)
    const isIndeterminate = checked === "indeterminate"
    const isChecked = checked === true || internalChecked

    // Sync internal state with checked prop
    React.useEffect(() => {
      if (checked !== undefined && checked !== "indeterminate") {
        setInternalChecked(checked === true)
      }
    }, [checked])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = e.target.checked
      setInternalChecked(newChecked)
      onCheckedChange?.(newChecked)
    }

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={ref}
          className="sr-only"
          checked={isChecked}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded border-2",
            className
          )}
          onClick={() => {
            if (!props.disabled) {
              const newChecked = !isChecked
              setInternalChecked(newChecked)
              onCheckedChange?.(newChecked)
            }
          }}
          style={{
            cursor: props.disabled ? "not-allowed" : "pointer",
            opacity: props.disabled ? 0.5 : 1,
            borderColor: isChecked || isIndeterminate ? (checkboxStyle?.borderColor || colors.action) : (checkboxStyle?.borderColor || colors.border),
            background: isChecked || isIndeterminate ? (checkboxStyle?.background || colors.action) : (checkboxStyle?.background || "transparent"),
            transition: checkboxStyle?.transition || "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            ...checkboxStyle,
          }}
        >
          {isIndeterminate && (
            <div style={{ height: "2px", width: "8px", background: "#FFFFFF" }} />
          )}
          {isChecked && !isIndeterminate && (
            <Check className="h-3 w-3" style={{ color: "#FFFFFF" }} />
          )}
        </div>
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }

