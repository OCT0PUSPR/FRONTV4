import React, { useRef, useEffect } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

interface CustomTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  minRows?: number
  maxRows?: number
  disabled?: boolean
  className?: string
  label?: string
  required?: boolean
}

export function CustomTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  minRows = 2,
  maxRows = 10,
  disabled = false,
  className = "",
  label,
  required = false
}: CustomTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isResizing, setIsResizing] = React.useState(false)
  const [currentRows, setCurrentRows] = React.useState(rows)

  const adjustHeight = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight)
      const newRows = Math.max(minRows, Math.min(maxRows, Math.ceil(scrollHeight / lineHeight)))
      
      textarea.style.height = `${newRows * lineHeight}px`
      setCurrentRows(newRows)
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  const handleResize = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    
    const startY = e.clientY
    const startHeight = textareaRef.current?.offsetHeight || 0
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startY
      const newHeight = Math.max(60, Math.min(400, startHeight + deltaY))
      const lineHeight = parseInt(getComputedStyle(textareaRef.current!).lineHeight)
      const newRows = Math.max(minRows, Math.min(maxRows, Math.round(newHeight / lineHeight)))
      
      if (textareaRef.current) {
        textareaRef.current.style.height = `${newRows * lineHeight}px`
        setCurrentRows(newRows)
      }
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={currentRows}
          className={`
            w-full px-4 py-3 border border-gray-200 rounded-lg text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            hover:border-gray-300 transition-colors resize-none
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}
          `}
          style={{ minHeight: `${minRows * 24}px` }}
        />
        
        {/* Resize Handle */}
        <div
          className={`
            absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center
            cursor-ns-resize opacity-0 hover:opacity-100 transition-opacity
            ${isResizing ? 'opacity-100' : ''}
          `}
          onMouseDown={handleResize}
        >
          <div className="w-4 h-4 bg-gray-300 rounded-sm flex items-center justify-center">
            {currentRows >= maxRows ? (
              <Minimize2 className="w-2 h-2 text-gray-600" />
            ) : (
              <Maximize2 className="w-2 h-2 text-gray-600" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
