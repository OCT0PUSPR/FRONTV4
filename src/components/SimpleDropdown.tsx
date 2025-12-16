"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { useTheme } from "../../context/theme"

interface SimpleDropdownProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SimpleDropdown({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className = ""
}: SimpleDropdownProps) {
  const { colors, mode } = useTheme()
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

  const selectedOption = options.find(opt => opt.value === value)
  const displayText = selectedOption ? selectedOption.label : placeholder

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`} style={{ position: 'relative', zIndex: isOpen ? 50 : 'auto' }}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm rounded-lg border transition-all flex items-center justify-between outline-none focus:ring-2 focus:ring-opacity-50"
        style={{
          backgroundColor: disabled ? colors.mutedBg : colors.card,
          borderColor: isOpen ? colors.action : colors.border,
          color: value ? colors.textPrimary : colors.textSecondary,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxShadow: isOpen ? `0 0 0 3px ${colors.action}20` : 'none'
        }}
      >
        <span className="truncate text-left flex-1">{displayText}</span>
        <ChevronDown 
          size={16} 
          className="ml-2 flex-shrink-0 transition-transform duration-200"
          style={{ 
            color: colors.textSecondary,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute w-full mt-1 rounded-lg shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            maxHeight: '240px',
            overflowY: 'auto',
            zIndex: 100,
            top: '100%',
            left: 0,
            right: 0
          }}
        >
          {options.length === 0 ? (
            <div className="px-3 py-3 text-sm text-center" style={{ color: colors.textSecondary }}>
              No options available
            </div>
          ) : (
            <div className="py-1">
              {options.map((option) => {
                const isSelected = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onChange(option.value)
                      setIsOpen(false)
                    }}
                    className="w-full px-3 py-2 text-sm text-left flex items-center justify-between transition-colors hover:bg-opacity-10"
                    style={{
                      backgroundColor: isSelected 
                        ? (mode === 'dark' ? `${colors.action}30` : `${colors.action}15`)
                        : 'transparent',
                      color: isSelected ? colors.action : colors.textPrimary,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = colors.mutedBg
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <span className="truncate flex-1">{option.label}</span>
                    {isSelected && (
                      <Check size={14} className="ml-2 flex-shrink-0" style={{ color: colors.action }} />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
