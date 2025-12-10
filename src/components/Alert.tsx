"use client"

import { useState, useEffect } from "react"
import { AlertCircle } from "lucide-react"

type AlertType = "delete" | "update"

interface AlertProps {
  isOpen: boolean
  type: AlertType
  title?: string
  message?: string
  onClose: () => void
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
  showDontShowAgain?: boolean
  onDontShowAgainChange?: (checked: boolean) => void
}

export default function Alert({
  isOpen,
  type,
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel,
  cancelLabel,
  showDontShowAgain = false,
  onDontShowAgainChange,
}: AlertProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Default messages based on type
  const defaultTitle = type === "delete" 
    ? "Delete this record?" 
    : "Update this record?"
  
  const defaultMessage = type === "delete"
    ? "This record will be permanently deleted and cannot be recovered."
    : "Are you sure you want to update this record?"

  const finalTitle = title || defaultTitle
  const finalMessage = message || defaultMessage
  const finalConfirmLabel = confirmLabel || (type === "delete" ? "Delete" : "Update")
  const finalCancelLabel = cancelLabel || "Cancel"

  const handleDontShowAgainChange = (checked: boolean) => {
    setDontShowAgain(checked)
    if (onDontShowAgainChange) {
      onDontShowAgainChange(checked)
    }
  }

  const handleConfirm = () => {
    onConfirm()
    if (dontShowAgain && onDontShowAgainChange) {
      onDontShowAgainChange(true)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
          width: "90%",
          maxWidth: "420px",
          padding: "32px 24px 24px 24px",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon with Pulsating Ring */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "20px",
            position: "relative",
          }}
        >
          {/* Pulsating Ring */}
          <div
            style={{
              position: "absolute",
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              border: `2px solid ${type === "delete" ? "#ef4444" : "#3b82f6"}`,
              opacity: isAnimating ? 0.3 : 0,
              animation: isAnimating ? "pulse 2s infinite" : "none",
            }}
          />
          {/* White Circle with Icon */}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${type === "delete" ? "#ef4444" : "#3b82f6"}`,
              position: "relative",
              zIndex: 1,
            }}
          >
            <AlertCircle
              size={28}
              color={type === "delete" ? "#ef4444" : "#3b82f6"}
              fill={type === "delete" ? "#ef4444" : "#3b82f6"}
            />
          </div>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#000000",
            margin: "0 0 12px 0",
            textAlign: "center",
          }}
        >
          {finalTitle}
        </h2>

        {/* Message */}
        <p
          style={{
            fontSize: "14px",
            color: "#000000",
            margin: "0 0 24px 0",
            textAlign: "center",
            lineHeight: "1.5",
          }}
        >
          {finalMessage}
        </p>

        {/* Don't Show Again Checkbox */}
        {showDontShowAgain && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <input
              type="checkbox"
              id="dontShowAgain"
              checked={dontShowAgain}
              onChange={(e) => handleDontShowAgainChange(e.target.checked)}
              style={{
                width: "16px",
                height: "16px",
                marginRight: "8px",
                cursor: "pointer",
              }}
            />
            <label
              htmlFor="dontShowAgain"
              style={{
                fontSize: "14px",
                color: "#000000",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              Don't show again
            </label>
          </div>
        )}

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#000000",
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f9fafb"
              e.currentTarget.style.borderColor = "#d1d5db"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#ffffff"
              e.currentTarget.style.borderColor = "#e5e7eb"
            }}
          >
            {finalCancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: type === "delete" ? "#ef4444" : "#3b82f6",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = type === "delete" ? "#dc2626" : "#2563eb"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = type === "delete" ? "#ef4444" : "#3b82f6"
            }}
          >
            {finalConfirmLabel}
          </button>
        </div>

        {/* CSS Animation */}
        <style>{`
          @keyframes pulse {
            0% {
              opacity: 0.3;
              transform: scale(1);
            }
            50% {
              opacity: 0.1;
              transform: scale(1.1);
            }
            100% {
              opacity: 0.3;
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    </div>
  )
}
