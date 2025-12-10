"use client"

import { useState, useRef, useEffect } from "react"
import { Settings, ChevronDown } from "lucide-react"

interface ActionsDropdownProps {
  colors: any
  onValidate?: () => void
  onPrint?: () => void
  onReturn?: () => void
  onCancel?: () => void
  t: (key: string) => string
}

export function ActionsDropdown({ colors, onValidate, onPrint, onReturn, onCancel, t }: ActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const actions = [
    { label: t("Validate"), onClick: onValidate, color: colors.success, textColor: "#0A0A0A" },
    { label: t("Print"), onClick: onPrint, color: colors.action, textColor: "#FFFFFF" },
    { label: t("Return"), onClick: onReturn, color: colors.inProgress, textColor: "#0A0A0A" },
    { label: t("Cancel"), onClick: onCancel, color: colors.cancel, textColor: "#FFFFFF" },
  ]

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: colors.card,
          color: colors.textPrimary,
          border: `2px solid ${colors.border}`,
          padding: "0.75rem 1.5rem",
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.background
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = colors.card
        }}
      >
        <Settings size={16} />
        {t("Actions")}
        <ChevronDown
          size={16}
          style={{ transition: "transform 0.2s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            minWidth: "200px",
            zIndex: 2002,
            overflow: "hidden",
          }}
        >
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick?.()
                setIsOpen(false)
              }}
              style={{
                width: "100%",
                padding: "0.875rem 1.25rem",
                border: "none",
                background: "transparent",
                color: colors.textPrimary,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
                borderBottom: index < actions.length - 1 ? `1px solid ${colors.border}` : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.background
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
