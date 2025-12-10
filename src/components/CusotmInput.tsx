"use client"

import type React from "react"

import { useState } from "react"
import { useTheme } from "../../context/theme"

interface CustomInputProps {
  label: string
  type: "text" | "number"
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function CustomInput({ label, type, value, onChange, placeholder = "", disabled = false }: CustomInputProps) {
  const { colors } = useTheme()
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    // For number type, only allow numeric input
    if (type === "number") {
      // Allow empty string, numbers, and decimal point
      if (newValue === "" || /^\d*\.?\d*$/.test(newValue)) {
        onChange(newValue)
      }
    } else {
      onChange(newValue)
    }
  }

  const hasValue = value.length > 0

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <label
        style={{
          display: "block",
          fontSize: "12px",
          fontWeight: "600",
          color: colors.textPrimary,
          marginBottom: "0.5rem",
        }}
      >
        {label}
      </label>

      <input
        type={type === "number" ? "text" : "text"}
        value={value}
        onChange={handleChange}
        onFocus={() => !disabled && setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "10px 10px",
          background: disabled ? colors.background : colors.card,
          border: `1px solid ${isFocused ? '#60a5fa' : colors.border}`,
          borderRadius: "0.75rem",
          fontSize: "12px",
          color: disabled ? colors.textSecondary : colors.textPrimary,
          outline: "none",
          transition: "all 0.2s ease",
          fontWeight: hasValue ? "500" : "400",
          cursor: disabled ? "not-allowed" : "text",
          opacity: disabled ? 0.6 : 1,
          boxShadow: isFocused ? '0 0 0 4px rgba(96, 165, 250, 0.1)' : 'inset 0 2px 4px rgba(0,0,0,0.02)',
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isFocused && !hasValue) {
            e.currentTarget.style.backgroundColor = isFocused ? colors.card : 'rgba(0,0,0,0.05)'
          }
        }}
        onMouseLeave={(e) => {
           if (!disabled && !isFocused) {
             e.currentTarget.style.backgroundColor = colors.card
           }
        }}
      />
    </div>
  )
}
