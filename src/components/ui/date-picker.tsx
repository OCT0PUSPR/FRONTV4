"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface DatePickerProps {
  value: string // YYYY-MM-DD format
  onChange: (date: string) => void
  colors: {
    action: string
    background: string
    card: string
    border: string
    textPrimary: string
    textSecondary: string
  }
  minDate?: Date
}

export function DatePicker({ value, onChange, colors, minDate }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const d = new Date(value)
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })

  const selectedDate = value ? new Date(value) : null

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sat", "Su"]

  const calendarDays = useMemo(() => {
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

  const formatDate = (date: Date | null) => {
    if (!date) return ""
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const year = date.getFullYear()
    return `${month}/${day}/${year}`
  }

  const handleDateSelect = (fullDate: Date) => {
    if (minDate) {
      const d = new Date(fullDate.getFullYear(), fullDate.getMonth(), fullDate.getDate())
      const m = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
      if (d < m) return
    }
    const year = fullDate.getFullYear()
    const month = String(fullDate.getMonth() + 1).padStart(2, "0")
    const day = String(fullDate.getDate()).padStart(2, "0")
    onChange(`${year}-${month}-${day}`)
  }

  const handleToday = () => {
    const today = new Date()
    handleDateSelect(today)
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const handleApply = () => {
    setIsOpen(false)
  }

  const handleCancel = () => {
    setIsOpen(false)
  }

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isSelected = (date: Date) => {
    if (!selectedDate) return false
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={formatDate(selectedDate)}
        onClick={() => setIsOpen(!isOpen)}
        readOnly
        placeholder="Select date"
        style={{
          width: "100%",
          border: `2px solid ${colors.border}`,
          borderRadius: 10,
          background: colors.background,
          color: colors.textPrimary,
          padding: "0.75rem 1rem",
          fontSize: 14,
          cursor: "pointer",
          outline: "none",
        }}
      />

      {isOpen && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2000,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              zIndex: 2001,
              background: colors.card,
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              padding: "1.5rem",
              width: "320px",
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
                onClick={prevMonth}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.5rem",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.background
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent"
                }}
              >
                <ChevronLeft size={20} color={colors.textPrimary} />
              </button>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: colors.textPrimary,
                }}
              >
                {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
              </div>
              <button
                onClick={nextMonth}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.5rem",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.background
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent"
                }}
              >
                <ChevronRight size={20} color={colors.textPrimary} />
              </button>
            </div>

            {/* Date input and Today button */}
            

            {/* Days of week */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "0.25rem",
                marginBottom: "0.5rem",
              }}
            >
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    color: colors.textSecondary,
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
                marginBottom: "1rem",
              }}
            >
              {calendarDays.map((day, idx) => {
                const isDisabled = (() => {
                  if (!minDate) return false
                  const d = new Date(day.fullDate.getFullYear(), day.fullDate.getMonth(), day.fullDate.getDate())
                  const m = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
                  return d < m
                })()
                const selected = isSelected(day.fullDate)
                const today = isToday(day.fullDate)
                return (
                  <button
                    key={idx}
                    onClick={() => !isDisabled && handleDateSelect(day.fullDate)}
                    style={{
                      aspectRatio: "1",
                      border: "none",
                      borderRadius: 8,
                      background: selected ? colors.action : "transparent",
                      color: isDisabled
                        ? '#9CA3AF'
                        : selected
                          ? '#FFFFFF'
                          : (day.isCurrentMonth ? colors.textPrimary : colors.textSecondary),
                      fontSize: 14,
                      fontWeight: selected ? 600 : 400,
                      cursor: "pointer",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: isDisabled ? 0.6 : 1,
                      pointerEvents: isDisabled ? 'none' : 'auto',
                    }}
                    onMouseEnter={(e) => {
                      if (!selected && !isDisabled) {
                        e.currentTarget.style.background = colors.background
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selected && !isDisabled) {
                        e.currentTarget.style.background = "transparent"
                      }
                    }}
                  >
                    {day.date}
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
                          background: colors.action,
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer buttons */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleCancel}
                style={{
                  flex: 1,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  background: colors.card,
                  color: colors.textPrimary,
                  padding: "0.625rem",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.background
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.card
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 8,
                  background: colors.action,
                  color: "#FFFFFF",
                  padding: "0.625rem",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.9"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1"
                }}
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
