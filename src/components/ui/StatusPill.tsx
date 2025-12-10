import React from 'react'

interface StatusPillProps {
  value: string
  backgroundColor: string
  borderColor?: string
  textColor: string
  className?: string
}

export function StatusPill({ 
  value, 
  backgroundColor, 
  borderColor, 
  textColor, 
  className = "" 
}: StatusPillProps) {
  return (
    <span 
      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${backgroundColor} ${textColor} ${borderColor ? `border ${borderColor}` : ''} ${className}`}
    >
      {value}
    </span>
  )
}
