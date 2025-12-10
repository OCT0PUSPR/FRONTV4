"use client"

import React from 'react'
import { DatePicker } from 'antd'
import type { RangePickerProps } from 'antd/es/date-picker'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useTheme } from '../../context/theme'
import { Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const { RangePicker } = DatePicker

interface RangeDatePickerProps {
  value?: [string | null, string | null] | null // [startDate, endDate] in YYYY-MM-DD format
  onChange?: (dates: [string | null, string | null] | null) => void
  placeholder?: [string, string]
  disabled?: boolean
}

export function RangeDatePicker({
  value,
  onChange,
  placeholder = ['Start date', 'End date'],
  disabled = false,
}: RangeDatePickerProps) {
  const { colors, mode } = useTheme()
  const { i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  const handleChange: RangePickerProps['onChange'] = (dates) => {
    if (onChange) {
      if (dates && dates[0] && dates[1]) {
        onChange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')])
      } else {
        onChange(null)
      }
    }
  }

  // Convert string values to Dayjs objects
  const dayjsValue: [Dayjs | null, Dayjs | null] | null = value
    ? [value[0] ? dayjs(value[0]) : null, value[1] ? dayjs(value[1]) : null]
    : null

  const hasValue = !!(value && value[0] && value[1])

  // Gradient similar to ReceiptCard - using a nice gradient
  const gradient = "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"

  return (
    <div 
      className="range-date-picker-container group"
      style={{ 
        position: 'relative', 
        width: '100%',
        padding: '2px',
        borderRadius: '10px',
        background: 'transparent',
        transition: 'all 0.3s ease',
      }}
    >
      <style>{`
        .range-date-picker-container:hover {
          background: ${gradient} !important;
          opacity: 0.8;
        }
        .range-date-picker-wrapper .ant-picker {
          width: 100% !important;
          min-height: 44px !important;
          padding: 8px 12px !important;
          background: ${colors.card} !important;
          border: 2px solid ${colors.border} !important;
          border-radius: 8px !important;
          font-size: 0.875rem !important;
          color: ${hasValue ? colors.textPrimary : colors.textSecondary} !important;
          font-weight: ${hasValue ? '500' : '400'} !important;
          transition: all 0.2s ease !important;
        }
        .range-date-picker-container:hover .ant-picker {
          border-color: transparent !important;
        }
        .range-date-picker-wrapper .ant-picker:hover {
          border-color: ${hasValue ? '#4facfe' : colors.border} !important;
        }
        .range-date-picker-wrapper .ant-picker-focused {
          border-color: #4facfe !important;
          box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.15) !important;
        }
        .range-date-picker-container:hover .ant-picker-focused {
          border-color: transparent !important;
          box-shadow: none !important;
        }
        .range-date-picker-wrapper .ant-picker-input > input {
          color: ${hasValue ? colors.textPrimary : colors.textSecondary} !important;
          font-weight: ${hasValue ? '500' : '400'} !important;
        }
        .range-date-picker-wrapper .ant-picker-input > input::placeholder {
          color: ${colors.textSecondary} !important;
        }
        .range-date-picker-wrapper .ant-picker-separator {
          color: ${colors.textSecondary} !important;
        }
        .range-date-picker-wrapper .ant-picker-suffix {
          display: flex !important;
          align-items: center !important;
          ${isRTL ? 'left: 12px !important; right: auto !important;' : 'right: 12px !important; left: auto !important;'}
        }
        .range-date-picker-wrapper .ant-picker-clear {
          color: ${colors.textSecondary} !important;
        }
        .range-date-picker-wrapper .ant-picker-clear:hover {
          color: ${colors.textPrimary} !important;
        }
        /* Popup calendar panel styles for dark mode */
        .ant-picker-dropdown {
          z-index: 1200 !important;
        }
        .ant-picker-dropdown .ant-picker-panel-container {
          background: ${colors.card} !important;
          border: 1px solid ${colors.border} !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, ${mode === 'dark' ? '0.5' : '0.15'}) !important;
        }
        .ant-picker-dropdown .ant-picker-panel {
          background: ${colors.card} !important;
          border: none !important;
        }
        .ant-picker-dropdown .ant-picker-header {
          border-bottom: 1px solid ${colors.border} !important;
        }
        .ant-picker-dropdown .ant-picker-header button {
          color: ${colors.textPrimary} !important;
        }
        .ant-picker-dropdown .ant-picker-header button:hover {
          color: ${colors.action} !important;
        }
        .ant-picker-dropdown .ant-picker-header-view button {
          color: ${colors.textPrimary} !important;
        }
        .ant-picker-dropdown .ant-picker-header-view button:hover {
          color: ${colors.action} !important;
        }
        .ant-picker-dropdown .ant-picker-content th {
          color: ${colors.textSecondary} !important;
        }
        .ant-picker-dropdown .ant-picker-cell {
          color: ${colors.textPrimary} !important;
        }
        .ant-picker-dropdown .ant-picker-cell:hover:not(.ant-picker-cell-disabled):not(.ant-picker-cell-selected) .ant-picker-cell-inner {
          background: ${colors.mutedBg} !important;
        }
        .ant-picker-dropdown .ant-picker-cell-disabled .ant-picker-cell-inner {
          color: ${colors.textSecondary} !important;
          opacity: 0.3 !important;
        }
        .ant-picker-dropdown .ant-picker-cell-in-view.ant-picker-cell-today .ant-picker-cell-inner {
          border-color: ${colors.action} !important;
        }
        .ant-picker-dropdown .ant-picker-cell-in-view.ant-picker-cell-selected .ant-picker-cell-inner,
        .ant-picker-dropdown .ant-picker-cell-in-view.ant-picker-cell-range-start .ant-picker-cell-inner,
        .ant-picker-dropdown .ant-picker-cell-in-view.ant-picker-cell-range-end .ant-picker-cell-inner {
          background: ${colors.action} !important;
          color: #FFFFFF !important;
        }
        .ant-picker-dropdown .ant-picker-cell-in-view.ant-picker-cell-in-range::before {
          background: ${mode === 'dark' ? 'rgba(79, 172, 254, 0.2)' : 'rgba(79, 172, 254, 0.1)'} !important;
        }
        .ant-picker-dropdown .ant-picker-cell-in-view.ant-picker-cell-range-hover-start::before,
        .ant-picker-dropdown .ant-picker-cell-in-view.ant-picker-cell-range-hover-end::before,
        .ant-picker-dropdown .ant-picker-cell-in-view.ant-picker-cell-range-hover::before {
          background: ${mode === 'dark' ? 'rgba(79, 172, 254, 0.15)' : 'rgba(79, 172, 254, 0.08)'} !important;
        }
        .ant-picker-dropdown .ant-picker-footer {
          border-top: 1px solid ${colors.border} !important;
        }
        .ant-picker-dropdown .ant-picker-footer .ant-picker-now-btn,
        .ant-picker-dropdown .ant-picker-footer .ant-picker-today-btn {
          color: ${colors.action} !important;
        }
        .ant-picker-dropdown .ant-picker-footer .ant-picker-now-btn:hover,
        .ant-picker-dropdown .ant-picker-footer .ant-picker-today-btn:hover {
          color: ${colors.action} !important;
        }
        .ant-picker-dropdown .ant-picker-ranges {
          background: ${colors.card} !important;
        }
        .ant-picker-dropdown .ant-picker-ok button {
          background: ${colors.action} !important;
          border-color: ${colors.action} !important;
          color: #FFFFFF !important;
        }
        .ant-picker-dropdown .ant-picker-ok button:hover {
          background: ${colors.action} !important;
          border-color: ${colors.action} !important;
          opacity: 0.9 !important;
        }
      `}</style>
      <div className="range-date-picker-wrapper" style={{ position: 'relative', width: '100%' }}>
        <RangePicker
          value={dayjsValue as [Dayjs, Dayjs] | null}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          format="YYYY-MM-DD"
          getPopupContainer={() => document.body}
          popupStyle={{ zIndex: 1200 }}
          direction={isRTL ? 'rtl' : 'ltr'}
          suffixIcon={
            <div
              style={{
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: hasValue ? gradient : 'transparent',
                borderRadius: '4px',
                padding: '2px',
                transition: 'all 0.2s ease',
              }}
            >
              <Calendar
                size={14}
                style={{
                  color: hasValue ? '#FFFFFF' : colors.textSecondary,
                }}
              />
            </div>
          }
        />
      </div>
    </div>
  )
}

