"use client"

import type React from "react"

import { useState } from "react"
import { useTheme } from "../../context/theme"

interface CustomInputProps {
  label: string
  type: "text" | "number" | "email" | "textarea"
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  suffix?: string
  maxLength?: number
}

export function CustomInput({ label, type, value, onChange, placeholder = "", disabled = false, suffix, maxLength }: CustomInputProps) {
  const { colors } = useTheme()
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value

    // Apply maxLength if specified
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.slice(0, maxLength)
    }

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
  const isTextarea = type === "textarea"

  const inputStyle = {
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
    ...(isTextarea && { minHeight: "100px", resize: "vertical" as const }),
  }

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

      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {isTextarea ? (
          <textarea
            value={value}
            onChange={(e) => {
              let newValue = e.target.value
              if (maxLength && newValue.length > maxLength) {
                newValue = newValue.slice(0, maxLength)
              }
              onChange(newValue)
            }}
            maxLength={maxLength}
            onFocus={() => !disabled && setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            style={inputStyle}
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
        ) : (
          <>
            <input
              type={type === "number" ? "text" : type === "email" ? "email" : "text"}
              value={value}
              onChange={handleChange}
              maxLength={maxLength}
              onFocus={() => !disabled && setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled}
              style={inputStyle}
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
            {suffix && (
              <span style={{ 
                position: "absolute", 
                right: "10px", 
                color: colors.textSecondary,
                fontSize: "12px",
                pointerEvents: "none"
              }}>
                {suffix}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
