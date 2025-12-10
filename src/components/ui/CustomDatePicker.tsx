"use client"

import * as React from "react"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "../../../@/components/ui/input"
import { useTranslation } from "react-i18next"

// Convert English numbers to Arabic numerals
function toArabicNumerals(str: string): string {
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]
  return str.replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)])
}

function formatDate(date: Date | undefined, locale: string, getMonthName: (month: number) => string) {
  if (!date) {
    return ""
  }
  // Always use Gregorian calendar, just translate month names
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()
  const monthName = getMonthName(month)
  // Convert numbers to Arabic if locale is Arabic
  const dayStr = locale === "ar" ? toArabicNumerals(String(day)) : String(day)
  const yearStr = locale === "ar" ? toArabicNumerals(String(year)) : String(year)
  return `${monthName} ${dayStr}, ${yearStr}`
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false
  }
  return !isNaN(date.getTime())
}

interface CustomDatePickerProps {
  value: string // YYYY-MM-DD format
  onChange: (date: string) => void
  label?: string
  placeholder?: string
  colors?: {
    action: string
    background: string
    card: string
    border: string
    textPrimary: string
    textSecondary: string
  }
}

export function CustomDatePicker({ 
  value, 
  onChange, 
  label, 
  placeholder = "Select date",
  colors 
}: CustomDatePickerProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const isRTL = i18n.dir() === "rtl"
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  )
  const [viewDate, setViewDate] = React.useState<Date>(() => {
    if (value) {
      const d = new Date(value)
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })
  
  // Memoize month names to prevent infinite loop - only depend on locale
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const monthNames = React.useMemo(() => [
    t("January"), t("February"), t("March"), t("April"), t("May"), t("June"),
    t("July"), t("August"), t("September"), t("October"), t("November"), t("December")
  ], [locale])
  
  // Helper function to get month name by index
  const getMonthName = React.useCallback((monthIndex: number) => monthNames[monthIndex], [monthNames])
  
  const [inputValue, setInputValue] = React.useState("")

  // Initialize input value when date or locale changes
  React.useEffect(() => {
    if (date) {
      setInputValue(formatDate(date, locale, getMonthName))
    } else {
      setInputValue("")
    }
  }, [date, locale, getMonthName])

  // Update date when value prop changes
  React.useEffect(() => {
    if (value) {
      const newDate = new Date(value)
      if (isValidDate(newDate)) {
        setDate(newDate)
        setViewDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1))
      }
    } else {
      setDate(undefined)
    }
  }, [value])

  const daysOfWeek = [
    t("Monday"), t("Tuesday"), t("Wednesday"), t("Thursday"), 
    t("Friday"), t("Saturday"), t("Sunday")
  ]
  
  // Short day names for calendar header
  const daysOfWeekShort = locale === "ar" 
    ? ["ح", "ن", "ث", "ر", "خ", "ج", "س"]
    : ["Mo", "Tu", "We", "Th", "Fr", "Sat", "Su"]

  const calendarDays = React.useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

    const days: Array<{ date: number; isCurrentMonth: boolean; fullDate: Date }> = []

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLastDay - i,
        isCurrentMonth: false,
        fullDate: new Date(year, month - 1, prevMonthLastDay - i),
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        isCurrentMonth: true,
        fullDate: new Date(year, month, i),
      })
    }

    // Next month days
    const remainingDays = 35 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        isCurrentMonth: false,
        fullDate: new Date(year, month + 1, i),
      })
    }

    return days
  }, [viewDate])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value
    setInputValue(inputVal)
    
    // Try to parse the input - could be in format "Month DD, YYYY" or other formats
    // First try direct Date parsing
    let parsedDate = new Date(inputVal)
    
    // If that fails, try to parse month name from input
    if (!isValidDate(parsedDate)) {
      // Try to find month name in the input
      const monthIndex = monthNames.findIndex(m => 
        inputVal.toLowerCase().includes(m.toLowerCase())
      )
      if (monthIndex !== -1) {
        // Extract day and year from input
        const numbers = inputVal.replace(/[^\d]/g, ' ').trim().split(/\s+/)
        if (numbers.length >= 2) {
          const day = parseInt(numbers[0])
          const year = parseInt(numbers[numbers.length - 1])
          if (day > 0 && day <= 31 && year > 1900 && year < 2100) {
            parsedDate = new Date(year, monthIndex, day)
          }
        }
      }
    }
    
    if (isValidDate(parsedDate)) {
      setDate(parsedDate)
      setViewDate(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1))
      // Format as YYYY-MM-DD
      const year = parsedDate.getFullYear()
      const month = String(parsedDate.getMonth() + 1).padStart(2, "0")
      const day = String(parsedDate.getDate()).padStart(2, "0")
      onChange(`${year}-${month}-${day}`)
      setInputValue(formatDate(parsedDate, locale, getMonthName))
    }
  }

  const handleDateSelect = (fullDate: Date) => {
    setDate(fullDate)
    setInputValue(formatDate(fullDate, locale, getMonthName))
    
    // Format as YYYY-MM-DD
    const year = fullDate.getFullYear()
    const month = String(fullDate.getMonth() + 1).padStart(2, "0")
    const day = String(fullDate.getDate()).padStart(2, "0")
    onChange(`${year}-${month}-${day}`)
    setOpen(false)
  }
  
  // Convert number to Arabic numerals if needed
  const formatNumber = (num: number): string => {
    const str = String(num)
    return locale === "ar" ? toArabicNumerals(str) : str
  }

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  const isToday = (d: Date) => {
    const today = new Date()
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    )
  }

  const isSelected = (d: Date) => {
    if (!date) return false
    return (
      d.getDate() === date.getDate() &&
      d.getMonth() === date.getMonth() &&
      d.getFullYear() === date.getFullYear()
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {label && (
        <label htmlFor="date" style={{ paddingLeft: "0.25rem", color: colors?.textPrimary, fontSize: "12px", fontWeight: 600 }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex", gap: "0.5rem" }}>
        <Input
          id="date"
          value={inputValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setOpen(true)
            }
          }}
          style={{
            color: colors?.textPrimary,
            borderColor: colors?.border,
            backgroundColor: colors?.background,
            paddingRight: "2.5rem",
          }}
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{
            position: "absolute",
            top: "50%",
            right: "0.5rem",
            transform: "translateY(-50%)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "0.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors?.textSecondary,
          }}
        >
          <CalendarIcon size={14} />
          <span style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0,0,0,0)" }}>
            Select date
          </span>
        </button>

        {open && (
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 2000,
              }}
              onClick={() => setOpen(false)}
            />
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                zIndex: 2001,
                background: colors?.card,
                borderRadius: 16,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                padding: "1.5rem",
                width: "320px",
                border: `1px solid ${colors?.border}`,
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <button
                  type="button"
                  onClick={isRTL ? nextMonth : prevMonth}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.5rem",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: colors?.textPrimary,
                  }}
                >
                  {isRTL ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: colors?.textPrimary,
                  }}
                >
                  {monthNames[viewDate.getMonth()]} {formatNumber(viewDate.getFullYear())}
                </div>
                <button
                  type="button"
                  onClick={isRTL ? prevMonth : nextMonth}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.5rem",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: colors?.textPrimary,
                  }}
                >
                  {isRTL ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
              </div>

              {/* Days of week */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "0.25rem",
                  marginBottom: "0.5rem",
                }}
              >
                {daysOfWeekShort.map((day, idx) => (
                  <div
                    key={idx}
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      color: colors?.textSecondary,
                      padding: "0.5rem 0",
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "0.25rem",
                }}
              >
                {calendarDays.map((day, idx) => {
                  const selected = isSelected(day.fullDate)
                  const today = isToday(day.fullDate)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDateSelect(day.fullDate)}
                      style={{
                        aspectRatio: "1",
                        border: "none",
                        borderRadius: 8,
                        background: selected ? colors?.action : "transparent",
                        color: selected
                          ? "#FFFFFF"
                          : day.isCurrentMonth
                            ? colors?.textPrimary
                            : colors?.textSecondary,
                        fontSize: 14,
                        fontWeight: selected ? 600 : 400,
                        cursor: "pointer",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: day.isCurrentMonth ? 1 : 0.5,
                      }}
                      onMouseEnter={(e) => {
                        if (!selected) {
                          e.currentTarget.style.background = colors?.background
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selected) {
                          e.currentTarget.style.background = "transparent"
                        }
                      }}
                    >
                      {formatNumber(day.date)}
                      {today && !selected && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 4,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: colors?.action,
                          }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

