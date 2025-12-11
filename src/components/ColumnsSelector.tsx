"use client"

import { useState, useRef, useEffect, CSSProperties } from "react"
import { ChevronDown, Columns } from "lucide-react"
import { useTheme } from "../../context/theme"
import { Checkbox } from "../../@/components/ui/checkbox"

interface ColumnOption {
  id: string
  label: string
}

interface ColumnsSelectorProps {
  columns: ColumnOption[]
  selectedColumns: string[]
  onSelectionChange: (selectedIds: string[]) => void
  label?: string
  disabled?: boolean
  placement?: "bottom" | "top"
  align?: "left" | "center" | "right"
}

export function ColumnsSelector({
  columns,
  selectedColumns,
  onSelectionChange,
  label,
  disabled = false,
  placement = "bottom",
  align = "right",
}: ColumnsSelectorProps) {
  const { colors } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(undefined)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      // Calculate dropdown width based on button width
      if (buttonRef.current) {
        const buttonWidth = buttonRef.current.offsetWidth
        const maxWidth = buttonWidth * 1.5
        
        // Create a temporary element to measure text width accurately
        const measureEl = document.createElement("span")
        measureEl.style.visibility = "hidden"
        measureEl.style.position = "absolute"
        measureEl.style.fontSize = "11px"
        measureEl.style.fontWeight = "600"
        measureEl.style.whiteSpace = "nowrap"
        document.body.appendChild(measureEl)
        
        // Find the longest label
        const longestLabel = columns.reduce((longest, col) => 
          col.label.length > longest.length ? col.label : longest, ""
        )
        measureEl.textContent = longestLabel
        const textWidth = measureEl.offsetWidth
        document.body.removeChild(measureEl)
        
        // Calculate total width: checkbox (16px) + gap (8px) + text width + padding (24px total: 12px each side)
        const contentWidth = 16 + 8 + textWidth + 24
        const finalWidth = Math.min(Math.max(contentWidth, buttonWidth), maxWidth)
        setDropdownWidth(finalWidth)
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, columns])

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const getAlignmentStyles = (): CSSProperties => {
    const baseStyles: CSSProperties = {}
    switch (align) {
      case "left":
        baseStyles.left = 0
        baseStyles.right = "auto"
        break
      case "center":
        baseStyles.left = "50%"
        baseStyles.right = "auto"
        baseStyles.transform = "translateX(-50%)"
        break
      case "right":
      default:
        baseStyles.right = 0
        baseStyles.left = "auto"
        break
    }
    return baseStyles
  }

  const handleColumnToggle = (columnId: string) => {
    if (selectedColumns.includes(columnId)) {
      onSelectionChange(selectedColumns.filter((id) => id !== columnId))
    } else {
      onSelectionChange([...selectedColumns, columnId])
    }
  }

  return (
    <div
      ref={dropdownRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={disabled}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          border: `1px solid ${colors.border}`,
          borderRadius: "6px",
          background: colors.card,
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          opacity: disabled ? 0.5 : 1,
          padding: 0,
          width: "100%",
        }}
      >
        {/* Label section */}
        {label && (
          <div
            style={{
              padding: "0.375rem 0.75rem",
              fontSize: 12,
              fontWeight: 500,
              color: colors.textPrimary,
              display: "flex",
              alignItems: "center",
              borderRight: `1px solid ${colors.border}`,
            }}
          >
            {label}
          </div>
        )}
        {/* Icon/Chevron section */}
        <div
          style={{
            padding: "0.375rem 0.5rem",
            borderRadius: label ? "0 6px 6px 0" : "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Columns size={14} color={colors.textPrimary} />
        </div>
      </button>

      {isOpen && columns.length > 0 && (
        <div
          style={{
            position: "absolute",
            [placement === "bottom" ? "top" : "bottom"]: "100%",
            marginTop: placement === "bottom" ? "2px" : "0",
            marginBottom: placement === "top" ? "2px" : "0",
            ...getAlignmentStyles(),
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            width: dropdownWidth ? `${dropdownWidth}px` : "auto",
            maxHeight: "400px",
            overflowY: "auto",
            overflowX: "hidden",
            zIndex: 99999,
            whiteSpace: "nowrap",
          }}
        >
          {columns.map((column) => {
            const isSelected = selectedColumns.includes(column.id)
            return (
              <div
                key={column.id}
                style={{
                  padding: "0.25rem 0.25rem",
                }}
              >
                <button
                  onClick={() => handleColumnToggle(column.id)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "none",
                    background: "transparent",
                    color: colors.textPrimary,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    borderRadius: "4px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.mutedBg
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent"
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleColumnToggle(column.id)}
                    checkboxStyle={{
                      borderColor: isSelected ? "#4facfe" : colors.border,
                      background: isSelected ? "#4facfe" : "transparent",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                  {column.label}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

