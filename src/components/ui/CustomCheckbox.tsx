import React from 'react'
import { Check } from 'lucide-react'

interface CustomCheckboxProps {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}

export function CustomCheckbox({ 
  id, 
  checked, 
  onChange, 
  label, 
  disabled = false, 
  className = "" 
}: CustomCheckboxProps) {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <label
          htmlFor={checkboxId}
          className={`
            flex items-center justify-center w-5 h-5 border-2 rounded cursor-pointer transition-all duration-200
            ${checked 
              ? 'bg-blue-600 border-blue-600 shadow-sm' 
              : 'bg-white border-gray-300 hover:border-gray-400'
            }
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:shadow-sm'
            }
          `}
        >
          {checked && (
            <Check className="w-3 h-3 text-white" />
          )}
        </label>
      </div>
      {label && (
        <label 
          htmlFor={checkboxId}
          className={`ml-3 text-sm font-medium cursor-pointer select-none ${
            disabled ? 'text-gray-400' : 'text-gray-900'
          }`}
        >
          {label}
        </label>
      )}
    </div>
  )
}
