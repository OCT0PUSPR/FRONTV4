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

interface SimpleDateRangePickerProps {
  value?: [string | null, string | null] | null
  onChange?: (dates: [string | null, string | null] | null) => void
  placeholder?: [string, string]
  disabled?: boolean
}

export function SimpleDateRangePicker({
  value,
  onChange,
  placeholder = ['Start', 'End'],
  disabled = false,
}: SimpleDateRangePickerProps) {
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

  const dayjsValue: [Dayjs | null, Dayjs | null] | null = value
    ? [value[0] ? dayjs(value[0]) : null, value[1] ? dayjs(value[1]) : null]
    : null

  const hasValue = !!(value && value[0] && value[1])

  return (
    <div className="simple-date-range-picker" style={{ position: 'relative' }}>
      <style>{`
        .simple-date-range-picker .ant-picker {
          width: 100% !important;
          min-height: 36px !important;
          padding: 4px 8px !important;
          background: ${colors.card} !important;
          border: 1px solid ${colors.border} !important;
          border-radius: 0.75rem !important;
          font-size: 0.875rem !important;
          color: ${colors.textPrimary} !important;
          transition: all 0.2s ease !important;
        }
        .simple-date-range-picker .ant-picker:hover {
          border-color: ${colors.action} !important;
        }
        .simple-date-range-picker .ant-picker-focused {
          border-color: ${colors.action} !important;
          box-shadow: 0 0 0 2px ${colors.action}20 !important;
        }
        .simple-date-range-picker .ant-picker-input > input {
          color: ${colors.textPrimary} !important;
          font-size: 0.75rem !important;
        }
        .simple-date-range-picker .ant-picker-input > input::placeholder {
          color: ${colors.textSecondary} !important;
          font-size: 0.75rem !important;
        }
        .simple-date-range-picker .ant-picker-separator {
          color: ${colors.textSecondary} !important;
          padding: 0 4px !important;
        }
        .simple-date-range-picker .ant-picker-suffix {
          color: ${colors.textSecondary} !important;
        }
        .simple-date-range-picker .ant-picker-clear {
          color: ${colors.textSecondary} !important;
          background: ${colors.card} !important;
        }
        .simple-date-range-picker .ant-picker-clear:hover {
          color: ${colors.textPrimary} !important;
        }
        .simple-date-range-picker .ant-picker-active-bar {
          background: ${colors.action} !important;
        }
        /* Popup styles */
        .ant-picker-dropdown .ant-picker-panel-container {
          background: ${colors.card} !important;
          border: 1px solid ${colors.border} !important;
          border-radius: 0.75rem !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, ${mode === 'dark' ? '0.4' : '0.12'}) !important;
        }
        .ant-picker-dropdown .ant-picker-panel {
          background: ${colors.card} !important;
          border: none !important;
        }
        .ant-picker-dropdown .ant-picker-header {
          border-bottom: 1px solid ${colors.border} !important;
          color: ${colors.textPrimary} !important;
        }
        .ant-picker-dropdown .ant-picker-header button {
          color: ${colors.textSecondary} !important;
        }
        .ant-picker-dropdown .ant-picker-header button:hover {
          color: ${colors.action} !important;
        }
        .ant-picker-dropdown .ant-picker-header-view button {
          color: ${colors.textPrimary} !important;
        }
        .ant-picker-dropdown .ant-picker-content th {
          color: ${colors.textSecondary} !important;
        }
        .ant-picker-dropdown .ant-picker-cell {
          color: ${colors.textSecondary} !important;
        }
        .ant-picker-dropdown .ant-picker-cell-in-view {
          color: ${colors.textPrimary} !important;
        }
        .ant-picker-dropdown .ant-picker-cell:hover:not(.ant-picker-cell-disabled):not(.ant-picker-cell-selected) .ant-picker-cell-inner {
          background: ${colors.mutedBg} !important;
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
        .ant-picker-dropdown .ant-picker-footer {
          border-top: 1px solid ${colors.border} !important;
        }
      `}</style>
      <RangePicker
        value={dayjsValue as [Dayjs, Dayjs] | null}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        format="MM/DD"
        getPopupContainer={() => document.body}
        popupStyle={{ zIndex: 1200 }}
        direction={isRTL ? 'rtl' : 'ltr'}
        size="small"
        suffixIcon={
          <Calendar
            size={14}
            style={{ color: hasValue ? colors.action : colors.textSecondary }}
          />
        }
      />
    </div>
  )
}
