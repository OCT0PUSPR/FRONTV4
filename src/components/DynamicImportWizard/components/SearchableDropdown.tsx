"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, ChevronDown, Check, X } from "lucide-react"
import { useTheme } from "../../../../context/theme"

interface Option {
  value: string
  label: string
  description?: string
}

interface SearchableDropdownProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found",
  disabled = false,
  className = "",
}: SearchableDropdownProps) {
  const { colors, mode } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchQuery("")
  }, [onChange])

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(prev => !prev)
      if (isOpen) {
        setSearchQuery("")
      }
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
    setSearchQuery("")
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 transition-all"
        style={{
          padding: "0.5rem 0.75rem",
          borderRadius: "8px",
          border: `1px solid ${isOpen ? (mode === 'dark' ? '#3b82f6' : '#3b82f6') : colors.border}`,
          background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : colors.card,
          color: selectedOption ? colors.textPrimary : colors.textSecondary,
          fontSize: "0.875rem",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          boxShadow: isOpen ? `0 0 0 3px ${mode === 'dark' ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.15)'}` : 'none',
        }}
      >
        <span className="truncate flex-1 text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X size={14} color={colors.textSecondary} />
            </button>
          )}
          <ChevronDown
            size={16}
            color={colors.textSecondary}
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute mt-1"
          style={{
            borderRadius: "12px",
            border: `1px solid ${colors.border}`,
            background: colors.card,
            boxShadow: mode === 'dark'
              ? '0 10px 40px -10px rgba(0,0,0,0.5)'
              : '0 10px 40px -10px rgba(0,0,0,0.15)',
            minWidth: "220px",
            width: "max-content",
            maxWidth: "320px",
            right: 0,
            zIndex: 9999,
          }}
        >
          {/* Search Input */}
          <div
            className="p-2"
            style={{ borderBottom: `1px solid ${colors.border}` }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              }}
            >
              <Search size={16} color={colors.textSecondary} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: colors.textPrimary }}
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSearchQuery("")
                  }}
                  className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X size={14} color={colors.textSecondary} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: "240px" }}
          >
            {filteredOptions.length === 0 ? (
              <div
                className="flex items-center justify-center py-6 text-sm"
                style={{ color: colors.textSecondary }}
              >
                {emptyMessage}
              </div>
            ) : (
              <div className="py-1">
                {filteredOptions.map((option) => {
                  const isSelected = option.value === value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                      style={{
                        background: isSelected
                          ? (mode === 'dark' ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)')
                          : 'transparent',
                        color: isSelected ? '#3b82f6' : colors.textPrimary,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-medium truncate"
                          style={{
                            fontFamily: option.value.startsWith('x_') ? 'monospace' : 'inherit',
                          }}
                        >
                          {option.label}
                        </div>
                        {option.description && (
                          <div
                            className="text-xs truncate mt-0.5"
                            style={{ color: colors.textSecondary }}
                          >
                            {option.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check size={16} color="#3b82f6" className="flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchableDropdown
