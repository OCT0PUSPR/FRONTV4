"use client"

import { Search, LayoutGrid, List } from "lucide-react"
import { Input } from "../../@/components/ui/input"
import { EnhancedSelect, SelectOption } from "../../@/components/ui/select"
import { Card, CardContent } from "../../@/components/ui/card"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import { RangeDatePicker } from "./RangeDatePicker"
import { RangeSlider } from "./RangeSlider"

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

  const statusOptionObjects: SelectOption[] = statusOptions.map((status) => ({
    value: status,
    label: statusLabelMap?.[status] || t(status.charAt(0).toUpperCase() + status.slice(1)),
  }))

  const toOptionObjects: SelectOption[] = toOptions.map((destination) => ({
    value: destination,
    label: toLabelMap?.[destination] || destination,
  }))

  const fromOptionObjects: SelectOption[] = fromOptions.map((source) => ({
    value: source,
    label: fromLabelMap?.[source] || source,
  }))

  const rulesCountOptionObjects: SelectOption[] = rulesCountOptions.map((option) => ({
    value: option,
    label: rulesCountLabelMap?.[option] || option,
  }))

  return (
    <Card
      style={{
        marginBottom: "2rem",
        border: "none",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        background: colors.card,
        borderRadius: "1rem",
      }}
    >
      <CardContent style={{ padding: isMobile ? "1rem" : "1.5rem" }}>
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? "0.75rem" : "1rem",
            alignItems: isMobile ? "stretch" : "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              position: "relative",
              flex: "1 1 300px",
              minWidth: "0",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <Search
              size={20}
              style={{
                position: "absolute",
                [isRTL ? 'right' : 'left']: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: colors.textSecondary,
              }}
            />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#4facfe"
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 172, 254, 0.15)"
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.border
                e.currentTarget.style.boxShadow = "none"
              }}
              style={{
                [isRTL ? 'paddingRight' : 'paddingLeft']: "3rem",
                [isRTL ? 'paddingLeft' : 'paddingRight']: "12px",
                border: `2px solid ${colors.border}`,
                borderRadius: "8px",
                fontSize: isMobile ? "0.875rem" : "0.875rem",
                background: colors.card,
                color: colors.textPrimary,
                height: "44px",
                paddingTop: "8px",
                paddingBottom: "8px",
                transition: "all 0.2s ease",
                width: "100%",
                textAlign: isRTL ? "right" : "left",
              }}
            />
          </div>

          <div style={{ width: isMobile ? "100%" : "180px" }}>
            <EnhancedSelect
              mode="multiple"
              options={statusOptionObjects}
              placeholder={statusPlaceholder || t("Status")}
              value={statusFilter}
              onChange={onStatusChange}
            />
          </div>

          {toOptions.length > 0 && (
            <div style={{ width: isMobile ? "100%" : "180px" }}>
              <EnhancedSelect
                mode="multiple"
                options={toOptionObjects}
                placeholder={toPlaceholder || t("To")}
                value={toFilter}
                onChange={onToChange}
              />
            </div>
          )}

          {fromOptions.length > 0 && (
            <div style={{ width: isMobile ? "100%" : "180px" }}>
              <EnhancedSelect
                mode="multiple"
                options={fromOptionObjects}
                placeholder={fromPlaceholder || t("From")}
                value={fromFilter}
                onChange={onFromChange}
              />
            </div>
          )}

          {showDateRange && onDateRangeChange && (
            <div style={{ width: isMobile ? "100%" : "280px" }}>
              <RangeDatePicker
                value={dateRange || null}
                onChange={onDateRangeChange}
                placeholder={[t("Start date"), t("End date")]}
              />
            </div>
          )}

          {showRangeSlider && onRangeSliderChange && (
            <div style={{ width: isMobile ? "100%" : "200px" }}>
              <RangeSlider
                value={rangeSliderValue || null}
                onChange={onRangeSliderChange}
                min={rangeSliderMin}
                max={rangeSliderMax}
                step={rangeSliderStep}
                label={rangeSliderLabel}
                placeholder={rangeSliderPlaceholder}
              />
            </div>
          )}

          {showRulesCountFilter && onRulesCountChange && rulesCountOptions.length > 0 && (
            <div style={{ width: isMobile ? "100%" : "180px" }}>
              <EnhancedSelect
                mode="multiple"
                options={rulesCountOptionObjects}
                placeholder={rulesCountPlaceholder || t("Rules Count")}
                value={rulesCountFilter}
                onChange={onRulesCountChange}
              />
            </div>
          )}

          {showViewToggle && onViewModeChange && (
            <button
              onClick={() => onViewModeChange(viewMode === "cards" ? "table" : "cards")}
              style={{
                padding: "0.5rem",
                borderRadius: "8px",
                border: `1px solid ${colors.border}`,
                background: colors.card,
                color: colors.textPrimary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                width: isMobile ? "44px" : "44px",
                height: "44px",
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
              {viewMode === "cards" ? <List size={20} /> : <LayoutGrid size={20} />}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

