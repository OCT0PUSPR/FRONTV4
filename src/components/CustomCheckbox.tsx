"use client"
import { Check } from "lucide-react"

interface CustomCheckboxProps {
  label?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  className?: string
}

export function CustomCheckbox({
  label,
  checked,
  onChange,
  disabled = false,
  id,
  className = "",
}: CustomCheckboxProps) {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <label
          htmlFor={checkboxId}
          className={`
            relative flex items-center justify-center w-5 h-5 rounded-md
            border-2 transition-all duration-200 cursor-pointer
            ${
              checked
                ? "border-transparent bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-blue-500/25"
                : "border-gray-300 bg-white hover:border-gray-400"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}
            peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2
          `}
        >
          <Check
            className={`
              w-3.5 h-3.5 text-white transition-all duration-200
              ${checked ? "scale-100 opacity-100" : "scale-0 opacity-0"}
            `}
            strokeWidth={3}
          />
        </label>
      </div>
      {label && (
        <label
          htmlFor={checkboxId}
          className={`
            text-sm font-medium text-gray-700 cursor-pointer select-none
            ${disabled ? "opacity-50 cursor-not-allowed" : "hover:text-gray-900"}
          `}
        >
          {label}
        </label>
      )}
    </div>
  )
}
