import React from 'react'
import { X } from 'lucide-react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Warning',
  message = 'Are you sure about this action?'
}: ConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          width: '90%',
          maxWidth: '420px',
          padding: '24px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            color: '#6b7280',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <X size={18} />
        </button>

        {/* Warning icon */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              border: '2px solid #d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: '32px',
                color: '#d97706',
                fontWeight: 'bold',
              }}
            >
              !
            </span>
          </div>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#111827',
            textAlign: 'center',
            marginBottom: '12px',
            marginTop: 0,
          }}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          style={{
            fontSize: '14px',
            color: '#374151',
            textAlign: 'center',
            marginBottom: '24px',
            marginTop: 0,
            lineHeight: '1.5',
          }}
        >
          {message}
        </p>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#111827',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb'
              e.currentTarget.style.borderColor = '#d1d5db'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff'
              e.currentTarget.style.borderColor = '#e5e7eb'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffffff',
              backgroundColor: '#d97706',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b45309'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#d97706'
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

