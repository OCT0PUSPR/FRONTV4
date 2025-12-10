import React from 'react';
import { useTheme } from '../../context/theme';
import './IOSCheckbox.css';

type IOSCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  name?: string;
  className?: string;
  color?: 'blue' | 'red';
  disabled?: boolean;
};

export const IOSCheckbox: React.FC<IOSCheckboxProps> = ({
  checked,
  onChange,
  label,
  name,
  className = '',
  color = 'blue',
  disabled = false,
}) => {
  const { mode, colors } = useTheme();
  const isDarkMode = mode === 'dark';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(e.target.checked);
    }
  };

  return (
    <label 
      className={`ios-checkbox ${color} ${className} ${disabled ? 'disabled' : ''} ${isDarkMode ? 'dark-mode' : ''}`}
      style={{
        '--checkbox-bg-dark': colors.card || '#18181b',
        '--checkbox-border-dark': colors.border || '#27272a',
        '--checkbox-text-dark': colors.textPrimary || '#f4f4f5',
      } as React.CSSProperties}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="checkbox-wrapper">
        <div className="checkbox-bg"></div>
        <svg
          className="checkbox-icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="check-path"
            d="M5 12l4 4 10-10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {label && <span className="checkbox-label">{label}</span>}
    </label>
  );
};

export default IOSCheckbox;

