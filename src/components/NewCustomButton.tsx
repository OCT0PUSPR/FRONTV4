"use client"

import { LucideIcon } from "lucide-react"
import { useTheme } from "../../context/theme"

interface NewCustomButtonProps {
  label: string
  backgroundColor?: string
  icon?: LucideIcon
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit" | "reset"
  textColor?: string
}

export function NewCustomButton({
  label,
  backgroundColor = "#FFFFFF",
  icon: Icon,
  onClick,
  disabled = false,
  type = "button",
  textColor: customTextColor,
}: NewCustomButtonProps) {
  const { colors } = useTheme()

  // Check if background is white/light (for light mode card) or matches card color
  const isLightBackground = backgroundColor === "#FFFFFF" || 
                            backgroundColor === "#ffffff" || 
                            backgroundColor === "#FFF" ||
                            backgroundColor === "#fff" ||
                            backgroundColor === "white" ||
                            backgroundColor === colors.card

  const textColor = customTextColor || (isLightBackground
    ? colors.textPrimary
    : "#FFFFFF")

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: backgroundColor,
        color: textColor,
        border: "none",
        padding: "0.375rem 0.75rem",
        fontSize: 12,
        fontWeight: 600,
        borderRadius: "6px",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        opacity: disabled ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(-1px)"
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(0)"
          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)"
        }
      }}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  )
}

