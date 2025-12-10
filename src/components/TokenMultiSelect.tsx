"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Check } from "lucide-react"
import { useTheme } from "../../context/theme"

interface TokenOption {
  id: number
  name: string
}

interface TokenMultiSelectProps {
  options: TokenOption[]
  values: number[]
  onChange: (ids: number[]) => void
  placeholder?: string
  className?: string
}

export function TokenMultiSelect({ options, values, onChange, placeholder, className = "" }: TokenMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { colors } = useTheme()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggle = (id: number) => {
    if (values.includes(id)) onChange(values.filter((v) => v !== id))
    else onChange([...values, id])
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left rounded-lg border text-sm"
        style={{ background: colors.card, borderColor: colors.border, color: colors.textPrimary }}
      >
        {values.length === 0 ? (
          <span style={{ color: colors.textSecondary }}>{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {values
              .map((id) => options.find((o) => o.id === id)?.name)
              .filter(Boolean)
              .map((name) => (
                <span
                  key={name}
                  className="px-2 py-0.5 rounded text-xs"
                  style={{ background: colors.mutedBg, color: colors.textPrimary }}
                >
                  {name}
                </span>
              ))}
          </div>
        )}
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="w-4 h-4" style={{ color: colors.textSecondary }} />
        </span>
      </button>
      {isOpen && (
        <div
          className="absolute z-20 w-full mt-1 rounded-lg shadow"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <ul className="max-h-56 overflow-auto py-1">
            {options.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className="w-full px-3 py-2 flex items-center justify-between text-sm"
                  style={{ color: colors.textPrimary }}
                >
                  <span>{opt.name}</span>
                  {values.includes(opt.id) && <Check className="w-4 h-4" style={{ color: colors.action }} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
