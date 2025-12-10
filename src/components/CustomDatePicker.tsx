import React from 'react';
import type { DatePickerProps } from 'antd';
import { DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useTheme } from '../../context/theme';

interface CustomDatePickerProps {
  value?: string; // YYYY-MM-DD format or datetime string
  onChange?: (date: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  needConfirm?: boolean;
  showTime?: boolean;
  format?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = "Select date",
  disabled = false,
  needConfirm = false,
  showTime = false,
  format,
}) => {
  const { colors } = useTheme();

  const handleChange: DatePickerProps<Dayjs>['onChange'] = (date) => {
    if (onChange) {
      if (date) {
        if (showTime) {
          // When showTime is true, format as datetime (ISO format)
          const isoString = date.format('YYYY-MM-DDTHH:mm:ss');
          onChange(isoString);
        } else {
          // When showTime is false, format as date only
          const dateOnly = date.format('YYYY-MM-DD');
          onChange(dateOnly);
        }
      } else {
        onChange(null);
      }
    }
  };

  // Convert string value to Dayjs object
  const dayjsValue = value ? dayjs(value) : undefined;

  // Determine format based on showTime
  const dateFormat = format || (showTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD');
  
  // Configure showTime prop for Ant Design DatePicker
  const showTimeConfig = showTime ? {
    format: 'HH:mm',
  } : false;

  const hasValue = !!value;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {label && (
        <label style={{ 
          fontSize: '12px', 
          fontWeight: 600, 
          color: colors.textPrimary,
          marginBottom: '0.5rem'
        }}>
          {label}
        </label>
      )}
      <div style={{
        width: '100%',
      }}>
        <style>{`
          .custom-date-picker .ant-picker {
            width: 100% !important;
            min-height: 36px !important;
            padding: 8px 10px !important;
            background: ${colors.card} !important;
            border: 2px solid ${colors.border} !important;
            border-radius: 0.75rem !important;
            font-size: 12px !important;
            color: ${hasValue ? colors.textPrimary : colors.textSecondary} !important;
            font-weight: ${hasValue ? '500' : '400'} !important;
          }
          .custom-date-picker .ant-picker:hover {
            border-color: ${colors.action} !important;
          }
          .custom-date-picker .ant-picker-focused {
            border-color: ${colors.action} !important;
            box-shadow: 0 0 0 2px ${colors.action}20 !important;
          }
          .custom-date-picker .ant-picker-input > input {
            color: ${hasValue ? colors.textPrimary : colors.textSecondary} !important;
            font-weight: ${hasValue ? '500' : '400'} !important;
          }
          .custom-date-picker .ant-picker-input > input::placeholder {
            color: ${colors.textSecondary} !important;
          }
        `}</style>
        <div className="custom-date-picker">
          <DatePicker
            value={dayjsValue}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            needConfirm={needConfirm}
            showTime={showTimeConfig}
            format={dateFormat}
            getPopupContainer={() => document.body}
            popupStyle={{ zIndex: 1200 }}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomDatePicker;

