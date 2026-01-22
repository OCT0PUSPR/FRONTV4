"use client"

import { Search, LayoutGrid, List, ChevronDown } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import { SimpleDateRangePicker } from "./SimpleDateRangePicker"

interface TransferFiltersBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  statusFilter: string[]
  onStatusChange: (value: string[]) => void
  statusOptions: string[]
  toFilter: string[]
  onToChange: (value: string[]) => void
  toOptions: string[]
  fromFilter: string[]
  onFromChange: (value: string[]) => void
  fromOptions: string[]
  dateRange?: [string | null, string | null] | null
  onDateRangeChange?: (dates: [string | null, string | null] | null) => void
  showDateRange?: boolean
  isMobile?: boolean
  toPlaceholder?: string
  fromPlaceholder?: string
  statusPlaceholder?: string
  statusLabelMap?: Record<string, string>
  toLabelMap?: Record<string, string>
  fromLabelMap?: Record<string, string>
  viewMode?: "cards" | "table"
  onViewModeChange?: (mode: "cards" | "table") => void
  showViewToggle?: boolean
  rangeSliderValue?: [number, number] | null
  onRangeSliderChange?: (value: [number, number] | null) => void
  rangeSliderMin?: number
  rangeSliderMax?: number
  rangeSliderStep?: number
  rangeSliderLabel?: string
  rangeSliderPlaceholder?: string
  showRangeSlider?: boolean
  rulesCountFilter?: string[]
  onRulesCountChange?: (value: string[]) => void
  rulesCountOptions?: string[]
  rulesCountPlaceholder?: string
  rulesCountLabelMap?: Record<string, string>
  showRulesCountFilter?: boolean
}

export function TransferFiltersBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  statusFilter,
  onStatusChange,
  statusOptions,
  toFilter,
  onToChange,
  toOptions,
  fromFilter,
  onFromChange,
  fromOptions,
  dateRange,
  onDateRangeChange,
  showDateRange = true,
  isMobile = false,
  toPlaceholder,
  fromPlaceholder,
  statusPlaceholder,
  statusLabelMap,
  toLabelMap,
  fromLabelMap,
  viewMode = "cards",
  onViewModeChange,
  showViewToggle = false,
  rangeSliderValue,
  onRangeSliderChange,
  rangeSliderMin = 0,
  rangeSliderMax = 100,
  rangeSliderStep = 1,
  rangeSliderLabel,
  rangeSliderPlaceholder,
  showRangeSlider = false,
  rulesCountFilter = [],
  onRulesCountChange,
  rulesCountOptions = [],
  rulesCountPlaceholder,
  rulesCountLabelMap,
  showRulesCountFilter = false,
}: TransferFiltersBarProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  const hasActiveFilters = statusFilter.length > 0 || toFilter.length > 0 || fromFilter.length > 0 ||
    (dateRange && (dateRange[0] || dateRange[1])) || searchQuery || rulesCountFilter.length > 0 ||
    (rangeSliderValue && (rangeSliderValue[0] !== null || rangeSliderValue[1] !== null))

  const clearFilters = () => {
    onSearchChange("")
    onStatusChange([])
    onToChange([])
    onFromChange([])
    if (onDateRangeChange) onDateRangeChange(null)
    if (onRulesCountChange) onRulesCountChange([])
    if (onRangeSliderChange) onRangeSliderChange(null)
  }

  const selectStyle: React.CSSProperties = {
    appearance: "none" as const,
    padding: "0.5rem 2rem 0.5rem 0.75rem",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    color: colors.textPrimary,
    cursor: "pointer",
    transition: "all 0.2s ease",
    minWidth: "120px",
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "0.75rem",
        marginBottom: "1.5rem",
      }}
    >
      {/* Search Input */}
      <div style={{ position: "relative", flex: "1 1 180px", minWidth: "180px", maxWidth: isMobile ? "100%" : "280px" }}>
        <Search
          size={16}
          style={{
            position: "absolute",
            [isRTL ? 'right' : 'left']: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: colors.textSecondary
          }}
        />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: "100%",
            [isRTL ? 'paddingRight' : 'paddingLeft']: "2.25rem",
            [isRTL ? 'paddingLeft' : 'paddingRight']: "0.75rem",
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            color: colors.textPrimary,
            transition: "all 0.2s ease",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.action
            e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.action}20`
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = colors.border
            e.currentTarget.style.boxShadow = "none"
          }}
        />
      </div>

      {/* Status Filter */}
      {statusOptions.length > 0 && (
        <div style={{ position: "relative" }}>
          <select
            value={statusFilter[0] || ""}
            onChange={(e) => onStatusChange(e.target.value ? [e.target.value] : [])}
            style={selectStyle}
          >
            <option value="">{statusPlaceholder || t("Status")}</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabelMap?.[status] || t(status.charAt(0).toUpperCase() + status.slice(1))}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            style={{
              position: "absolute",
              right: "0.625rem",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: colors.textSecondary
            }}
          />
        </div>
      )}

      {/* To Filter */}
      {toOptions.length > 0 && (
        <div style={{ position: "relative" }}>
          <select
            value={toFilter[0] || ""}
            onChange={(e) => onToChange(e.target.value ? [e.target.value] : [])}
            style={selectStyle}
          >
            <option value="">{toPlaceholder || t("To")}</option>
            {toOptions.map((destination) => (
              <option key={destination} value={destination}>
                {toLabelMap?.[destination] || destination}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            style={{
              position: "absolute",
              right: "0.625rem",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: colors.textSecondary
            }}
          />
        </div>
      )}

      {/* From Filter */}
      {fromOptions.length > 0 && (
        <div style={{ position: "relative" }}>
          <select
            value={fromFilter[0] || ""}
            onChange={(e) => onFromChange(e.target.value ? [e.target.value] : [])}
            style={selectStyle}
          >
            <option value="">{fromPlaceholder || t("From")}</option>
            {fromOptions.map((source) => (
              <option key={source} value={source}>
                {fromLabelMap?.[source] || source}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            style={{
              position: "absolute",
              right: "0.625rem",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: colors.textSecondary
            }}
          />
        </div>
      )}

      {/* Date Range Picker */}
      {showDateRange && onDateRangeChange && (
        <div style={{ width: isMobile ? "100%" : "200px" }}>
          <SimpleDateRangePicker
            value={dateRange || null}
            onChange={onDateRangeChange}
            placeholder={[t("Start"), t("End")]}
          />
        </div>
      )}

      {/* Range Slider */}
      {showRangeSlider && onRangeSliderChange && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: colors.textSecondary, whiteSpace: "nowrap" }}>
            {rangeSliderLabel || t("Range")}:
          </span>
          <input
            type="number"
            placeholder={t("Min")}
            value={rangeSliderValue?.[0] ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseFloat(e.target.value) : null
              onRangeSliderChange(val !== null ? [val, rangeSliderValue?.[1] ?? rangeSliderMax] : null)
            }}
            style={{
              width: "70px",
              padding: "0.5rem",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              outline: "none",
            }}
            min={rangeSliderMin}
            max={rangeSliderMax}
            step={rangeSliderStep}
          />
          <span style={{ color: colors.textSecondary }}>-</span>
          <input
            type="number"
            placeholder={t("Max")}
            value={rangeSliderValue?.[1] ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseFloat(e.target.value) : null
              onRangeSliderChange(val !== null ? [rangeSliderValue?.[0] ?? rangeSliderMin, val] : null)
            }}
            style={{
              width: "70px",
              padding: "0.5rem",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              outline: "none",
            }}
            min={rangeSliderMin}
            max={rangeSliderMax}
            step={rangeSliderStep}
          />
        </div>
      )}

      {/* Rules Count Filter */}
      {showRulesCountFilter && onRulesCountChange && rulesCountOptions.length > 0 && (
        <div style={{ position: "relative" }}>
          <select
            value={rulesCountFilter[0] || ""}
            onChange={(e) => onRulesCountChange(e.target.value ? [e.target.value] : [])}
            style={selectStyle}
          >
            <option value="">{rulesCountPlaceholder || t("Rules Count")}</option>
            {rulesCountOptions.map((option) => (
              <option key={option} value={option}>
                {rulesCountLabelMap?.[option] || option}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            style={{
              position: "absolute",
              right: "0.625rem",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: colors.textSecondary
            }}
          />
        </div>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            background: "transparent",
            border: "none",
            color: colors.action,
            cursor: "pointer",
            transition: "opacity 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8" }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
        >
          {t("Clear")}
        </button>
      )}

      {/* View Toggle */}
      {showViewToggle && onViewModeChange && (
        <button
          onClick={() => onViewModeChange(viewMode === "cards" ? "table" : "cards")}
          style={{
            padding: "0.5rem",
            borderRadius: "0.75rem",
            border: `1px solid ${colors.border}`,
            background: colors.card,
            color: colors.textPrimary,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            marginLeft: "auto",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.mutedBg
            e.currentTarget.style.borderColor = colors.action
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.card
            e.currentTarget.style.borderColor = colors.border
          }}
          title={viewMode === "cards" ? t("Switch to Table View") : t("Switch to Cards View")}
        >
          {viewMode === "cards" ? <List size={18} /> : <LayoutGrid size={18} />}
        </button>
      )}
    </div>
  )
}

