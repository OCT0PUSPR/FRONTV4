"use client"

import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '../../context/theme'
import { useTranslation } from 'react-i18next'
import { Settings2 } from 'lucide-react'

interface RangeSliderProps {
  value?: [number, number] | null
  onChange?: (value: [number, number] | null) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  disabled?: boolean
  label?: string
}

export function RangeSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  placeholder = "Range",
  disabled = false,
  label,
}: RangeSliderProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"
  const [isOpen, setIsOpen] = useState(false)
  const [localValue, setLocalValue] = useState<[number, number]>(
    value || [min, max]
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setLocalValue(value)
    } else {
      // Default to ends when no value is set
      setLocalValue([min, max])
    }
  }, [value, min, max])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        if (onChange && localValue) {
          onChange(localValue)
        }
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, localValue, onChange])

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, index: 0 | 1) => {
    const newValue = Number.parseFloat(e.target.value)
    let newRange: [number, number] = index === 0 
      ? [newValue, localValue[1]]
      : [localValue[0], newValue]
    
    // Ensure min <= max
    if (index === 0 && newValue > localValue[1]) {
      newRange = [localValue[1], localValue[1]]
    } else if (index === 1 && newValue < localValue[0]) {
      newRange = [localValue[0], localValue[0]]
    }
    
    setLocalValue(newRange)
  }
  
  const handleInputChange = (value: string, index: 0 | 1) => {
    const numValue = Number.parseFloat(value)
    if (isNaN(numValue)) return
    
    const clampedValue = Math.max(min, Math.min(max, numValue))
    let newRange: [number, number] = index === 0 
      ? [clampedValue, localValue[1]]
      : [localValue[0], clampedValue]
    
    // Ensure min <= max
    if (index === 0 && clampedValue > localValue[1]) {
      newRange = [localValue[1], localValue[1]]
    } else if (index === 1 && clampedValue < localValue[0]) {
      newRange = [localValue[0], localValue[0]]
    }
    
    setLocalValue(newRange)
  }

  const hasValue = value && value[0] !== min && value[1] !== max

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLocalValue([min, max])
    if (onChange) {
      onChange(null)
    }
    setIsOpen(false)
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
      }}
    >
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          width: "100%",
          height: "44px",
          padding: "0 12px",
          border: `2px solid ${colors.border}`,
          borderRadius: "8px",
          background: colors.card,
          color: colors.textPrimary,
          fontSize: "0.875rem",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "all 0.2s ease",
          opacity: disabled ? 0.5 : 1,
          textAlign: isRTL ? "right" : "left",
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = "#4facfe"
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 172, 254, 0.15)"
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = colors.border
            e.currentTarget.style.boxShadow = "none"
          }
        }}
      >
        <span
          style={{
            color: hasValue ? colors.textPrimary : colors.textSecondary,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {hasValue
            ? `${value![0]} - ${value![1]}`
            : label || placeholder}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {hasValue && !disabled && (
            <button
              onClick={handleClear}
              style={{
                background: "transparent",
                border: "none",
                color: colors.textSecondary,
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.mutedBg
                e.currentTarget.style.color = colors.textPrimary
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = colors.textSecondary
              }}
            >
              <span style={{ fontSize: "18px", lineHeight: 1 }}>×</span>
            </button>
          )}
          <div
            style={{
              width: "18px",
              height: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: hasValue ? "#4facfe" : "transparent",
              borderRadius: "4px",
              padding: "2px",
              transition: "all 0.2s ease",
            }}
          >
            <Settings2
              size={14}
              style={{
                color: hasValue ? "#FFFFFF" : colors.textSecondary,
              }}
            />
          </div>
        </div>
      </button>

      {isOpen && !disabled && (
        <div
          ref={sliderRef}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: "100%",
            marginTop: "8px",
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "1.5rem",
            zIndex: 99999,
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: colors.textSecondary,
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {label || placeholder}
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={localValue[0]}
                onChange={(e) => handleInputChange(e.target.value, 0)}
                style={{
                  width: "80px",
                  padding: "0.375rem 0.5rem",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "6px",
                  background: colors.background,
                  color: colors.textPrimary,
                  fontSize: 12,
                }}
              />
              <span style={{ color: colors.textSecondary, fontSize: 12 }}>-</span>
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={localValue[1]}
                onChange={(e) => handleInputChange(e.target.value, 1)}
                style={{
                  width: "80px",
                  padding: "0.375rem 0.5rem",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "6px",
                  background: colors.background,
                  color: colors.textPrimary,
                  fontSize: 12,
                }}
              />
            </div>
            <div style={{ position: "relative", padding: "1rem 0" }}>
              {/* Background track */}
              <div
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "6px",
                  background: colors.border,
                  borderRadius: "3px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              {/* Active range track */}
              <div
                style={{
                  position: "absolute",
                  left: `${((localValue[0] - min) / (max - min)) * 100}%`,
                  right: `${100 - ((localValue[1] - min) / (max - min)) * 100}%`,
                  height: "6px",
                  background: "#4facfe",
                  borderRadius: "3px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              {/* Min value range input (invisible thumb, only for interaction) */}
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={localValue[0]}
                onChange={(e) => handleSliderChange(e, 0)}
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "6px",
                  background: "transparent",
                  outline: "none",
                  zIndex: 2,
                  WebkitAppearance: "none",
                  appearance: "none",
                  pointerEvents: localValue[0] === localValue[1] && localValue[0] === min ? "none" : "auto",
                }}
              />
              {/* Max value range input (invisible thumb, only for interaction) */}
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={localValue[1]}
                onChange={(e) => handleSliderChange(e, 1)}
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "6px",
                  background: "transparent",
                  outline: "none",
                  zIndex: 2,
                  WebkitAppearance: "none",
                  appearance: "none",
                  pointerEvents: localValue[0] === localValue[1] && localValue[1] === max ? "none" : "auto",
                }}
              />
              {/* Min value circle */}
              <div
                style={{
                  position: "absolute",
                  left: `${((localValue[0] - min) / (max - min)) * 100}%`,
                  width: "18px",
                  height: "18px",
                  background: "#4facfe",
                  borderRadius: "50%",
                  border: "2px solid #FFFFFF",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  cursor: "grab",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  zIndex: 3,
                  pointerEvents: "none",
                }}
              />
              {/* Max value circle */}
              <div
                style={{
                  position: "absolute",
                  left: `${((localValue[1] - min) / (max - min)) * 100}%`,
                  width: "18px",
                  height: "18px",
                  background: "#4facfe",
                  borderRadius: "50%",
                  border: "2px solid #FFFFFF",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  cursor: "grab",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  zIndex: 3,
                  pointerEvents: "none",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "0.5rem",
                fontSize: "11px",
                color: colors.textSecondary,
              }}
            >
              <span>{min}</span>
              <span>{max}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              onClick={() => {
                setLocalValue([min, max])
                if (onChange) {
                  onChange(null)
                }
                setIsOpen(false)
              }}
              style={{
                padding: "0.375rem 0.75rem",
                border: `1px solid ${colors.border}`,
                borderRadius: "6px",
                background: colors.background,
                color: colors.textPrimary,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)"
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)"
              }}
            >
              {t("Clear")}
            </button>
            <button
              onClick={() => {
                if (onChange) {
                  onChange(localValue)
                }
                setIsOpen(false)
              }}
              style={{
                padding: "0.375rem 0.75rem",
                border: "none",
                borderRadius: "6px",
                background: "#4facfe",
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)"
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)"
              }}
            >
              {t("Apply")}
            </button>
          </div>
        </div>
      )}

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: transparent;
          border-radius: 50%;
          cursor: grab;
        }

        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: transparent;
          border-radius: 50%;
          cursor: grab;
          border: none;
        }

        input[type="range"]::-webkit-slider-runnable-track {
          height: 6px;
          background: transparent;
        }

        input[type="range"]::-moz-range-track {
          height: 6px;
          background: transparent;
        }
      `}</style>
    </div>
  )
}

