"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronUp, X } from "lucide-react"
import { useTheme } from "../../context/theme"
import { IOSCheckbox } from "./IOSCheckbox"

interface CustomDropdownProps {
  label: string
  values: string[]
  type: "single" | "multi"
  onChange: (selected: string | string[]) => void
  placeholder?: string
  defaultValue?: string | string[]
  disabled?: boolean
}

export function CustomDropdown({
  label,
  values,
  type,
  onChange,
  placeholder = "Select",
  defaultValue,
  disabled = false,
}: CustomDropdownProps) {
  const { colors } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedSingle, setSelectedSingle] = useState<string | null>(
    type === "single" && typeof defaultValue === "string" ? defaultValue : null,
  )
  const [selectedMulti, setSelectedMulti] = useState<string[]>(
    type === "multi" && Array.isArray(defaultValue) ? defaultValue : [],
  )
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync internal state with defaultValue changes
  useEffect(() => {
    if (type === "single") {
      if (typeof defaultValue === "string") {
        setSelectedSingle(defaultValue)
      } else if (defaultValue === undefined || defaultValue === null) {
        setSelectedSingle(null)
      }
    } else if (type === "multi") {
      if (Array.isArray(defaultValue)) {
        setSelectedMulti(defaultValue)
      } else {
        setSelectedMulti([])
      }
    }
  }, [defaultValue, type])

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

  // Update parent wrapper z-index when open to ensure dropdown appears above other grid items
  useEffect(() => {
    if (dropdownRef.current?.parentElement) {
      const parentWrapper = dropdownRef.current.parentElement
      if (isOpen) {
        parentWrapper.style.zIndex = '9999'
        parentWrapper.style.position = 'relative'
      } else {
        parentWrapper.style.zIndex = ''
      }
    }
  }, [isOpen])

  const handleSingleSelect = (value: string) => {
    setSelectedSingle(value)
    onChange(value)
    setIsOpen(false)
  }

  const handleMultiSelect = (value: string) => {
    const newSelected = selectedMulti.includes(value)
      ? selectedMulti.filter((v) => v !== value)
      : [...selectedMulti, value]
    setSelectedMulti(newSelected)
    onChange(newSelected)
  }

  const handleRemoveTag = (value: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent dropdown from opening/closing
    const newSelected = selectedMulti.filter((v) => v !== value)
    setSelectedMulti(newSelected)
    onChange(newSelected)
  }

  // Extract display name from value (handles "id::displayName" format)
  const getDisplayName = (value: string) => {
    if (value.includes('::')) {
      return value.split('::')[1];
    }
    return value;
  };

  const getDisplayText = () => {
    if (type === "single") {
      return selectedSingle ? getDisplayName(selectedSingle) : placeholder
    }
    if (selectedMulti.length === 0) {
      return placeholder
    }
    return "" // Will be replaced by tags display
  }

  const hasSelection = type === "single" ? selectedSingle !== null : selectedMulti.length > 0

  // Update parent wrapper z-index when open to ensure dropdown appears above other grid items
  useEffect(() => {
    if (dropdownRef.current) {
      // Find the premium-field-wrapper parent (might be direct parent or grandparent)
      let parent = dropdownRef.current.parentElement
      while (parent && !parent.classList.contains('premium-field-wrapper')) {
        parent = parent.parentElement
      }
      
      if (parent) {
        if (isOpen) {
          parent.style.zIndex = '9999'
          parent.style.position = 'relative'
        } else {
          parent.style.zIndex = ''
        }
      }
    }
  }, [isOpen])

  return (
    <div 
      style={{ 
        position: "relative", 
        width: "100%", 
        marginBottom: "1rem"
      }} 
      ref={dropdownRef}
    >
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

      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          width: "100%",
          minHeight: "40px",
          padding: type === "multi" && selectedMulti.length > 0 ? "8px 10px" : "10px 10px",
          background: disabled ? colors.background : colors.card,
          border: `1px solid ${isOpen ? '#60a5fa' : colors.border}`,
          borderRadius: "0.75rem",
          fontSize: "12px",
          color: disabled ? colors.textSecondary : (hasSelection ? colors.textPrimary : colors.textSecondary),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: type === "multi" && selectedMulti.length > 0 ? "wrap" : "nowrap",
          gap: type === "multi" && selectedMulti.length > 0 ? "6px" : "0",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          fontWeight: hasSelection ? "500" : "400",
          opacity: disabled ? 0.6 : 1,
          boxShadow: isOpen ? '0 0 0 4px rgba(96, 165, 250, 0.1)' : 'inset 0 2px 4px rgba(0,0,0,0.02)',
        }}
        onMouseEnter={(e) => {
          if (!disabled && !hasSelection) {
            e.currentTarget.style.backgroundColor = isOpen ? colors.card : 'rgba(0,0,0,0.05)'
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !hasSelection) {
             e.currentTarget.style.backgroundColor = colors.card
          }
        }}
      >
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          flexWrap: "wrap", 
          gap: "6px",
          flex: 1,
          minWidth: 0
        }}>
          {type === "multi" && selectedMulti.length > 0 ? (
            selectedMulti.map((value) => (
              <span
                key={value}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  background: colors.action + "15",
                  color: colors.action,
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "500",
                  whiteSpace: "nowrap",
                }}
              >
                {getDisplayName(value)}
                <X 
                  size={12} 
                  onClick={(e) => handleRemoveTag(value, e)}
                  style={{ 
                    cursor: "pointer",
                    flexShrink: 0
                  }} 
                />
              </span>
            ))
          ) : (
            <span style={{ 
              color: hasSelection ? colors.textPrimary : colors.textSecondary 
            }}>
              {getDisplayText()}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp size={18} color={hasSelection ? colors.action : colors.textSecondary} style={{ flexShrink: 0 }} />
        ) : (
          <ChevronDown size={18} color={hasSelection ? colors.action : colors.textSecondary} style={{ flexShrink: 0 }} />
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 0.5rem)",
            left: 0,
            right: 0,
            background: colors.card,
            borderRadius: "0.75rem",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 10000,
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {values.map((value, index) => {
            const isSelected = type === "single" ? selectedSingle === value : selectedMulti.includes(value)
            // Use index + value for unique key to handle duplicate values
            const uniqueKey = `${value}-${index}`

            return (
              <div
                key={uniqueKey}
                onClick={() => {
                  if (type === "single") {
                    handleSingleSelect(value)
                  } else {
                    // For multi-select, clicking anywhere on the row toggles selection but doesn't close
                    handleMultiSelect(value)
                  }
                }}
                style={{
                  padding: "10px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  background: isSelected
                    ? `linear-gradient(135deg, ${colors.action}15, ${colors.action}08)`
                    : "transparent",
                  borderBottom: index < values.length - 1 ? `1px solid ${colors.border}` : "none",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = colors.mutedBg
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent"
                  }
                }}
              >
                {type === "multi" ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <IOSCheckbox
                      checked={isSelected}
                      onChange={() => handleMultiSelect(value)}
                      color="blue"
                    />
                  </div>
                ) : null}
                <span
                  style={{
                    fontSize: "12px",
                    color: isSelected ? colors.textPrimary : colors.textSecondary,
                    fontWeight: isSelected ? "500" : "400",
                    flex: 1,
                  }}
                >
                  {getDisplayName(value)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
