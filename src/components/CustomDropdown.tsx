"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Check } from "lucide-react"
import { useTheme } from "../../context/theme"

interface CustomDropdownProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function CustomDropdown({ options, value, onChange, placeholder, className = "" }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { colors } = useTheme()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left rounded-lg focus:outline-none transition-colors text-sm"
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          color: value ? colors.textPrimary : colors.textSecondary,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = colors.mutedBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = colors.card)}
      >
        <span className="block truncate">{value || placeholder}</span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className={`w-4 h-4`} style={{ color: colors.textSecondary }} />
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute z-20 w-full mt-1 rounded-lg shadow-lg"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <ul className="py-1 max-h-60 overflow-auto">
            {options.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option)
                    setIsOpen(false)
                  }}
                  className="w-full px-3 py-2 text-left flex items-center justify-between text-sm"
                  style={{ color: colors.textPrimary }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.mutedBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span>{option}</span>
                  {value === option && <Check className="w-4 h-4" style={{ color: colors.action }} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
