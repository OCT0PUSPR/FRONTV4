import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import { CheckCircle2, XCircle } from "lucide-react"

export default function Toast({
  text,
  state = "success",
  onClose,
  duration = 5000,
}: { text: string; state?: "success" | "error"; onClose: () => void; duration?: number }) {
  const { colors, mode } = useTheme()
  const { i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => onClose(), duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  // Gradient for progress bar
  const progressGradient =
    state === "success"
      ? "linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)"
      : "linear-gradient(90deg, #f093fb 0%, #f5576c 100%)"

  // Icon colors
  const iconColor = state === "success" ? "#10b981" : "#ef4444"
  const iconBg = state === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)"

  const toastContent = (
    <>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes progressBar {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          top: 16,
          [isRTL ? 'left' : 'right']: 16,
          zIndex: 99999,
          background: mode === "dark" ? colors.card : "#FFFFFF",
          color: colors.textPrimary,
          padding: "14px 18px",
          borderRadius: "8px",
          boxShadow: mode === "dark" 
            ? "0 20px 60px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)" 
            : "0 10px 40px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15)",
          fontSize: 14,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 12,
          minWidth: 300,
          maxWidth: 400,
          border: `1px solid ${colors.border}`,
          animation: isRTL ? "slideInLeft 0.3s ease-out" : "slideInRight 0.3s ease-out",
          direction: isRTL ? "rtl" : "ltr",
          overflow: "hidden",
          pointerEvents: "auto",
        }}
        role="status"
        aria-live="polite"
      >
        {/* Progress bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            [isRTL ? 'right' : 'left']: 0,
            height: "3px",
            background: progressGradient,
            width: 0,
            animation: `progressBar ${duration}ms linear forwards`,
            ...(isRTL ? { animationDirection: 'reverse' } : {}),
          }}
        />
        
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          {state === "success" ? (
            <CheckCircle2 size={16} color={iconColor} strokeWidth={2.5} />
          ) : (
            <XCircle size={16} color={iconColor} strokeWidth={2.5} />
          )}
        </div>
        <span style={{ flex: 1, lineHeight: 1.5, textAlign: isRTL ? "right" : "left" }}>{text}</span>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            borderRadius: 8,
            padding: 0,
            cursor: "pointer",
            color: colors.textSecondary,
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1,
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            flexShrink: 0,
            [isRTL ? 'order' : '']: isRTL ? -1 : undefined,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.mutedBg
            e.currentTarget.style.color = colors.textPrimary
            e.currentTarget.style.transform = "scale(1.1)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = colors.textSecondary
            e.currentTarget.style.transform = "scale(1)"
          }}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </>
  )

  // Use portal to render at document body level for proper floating
  if (!mounted || typeof window === "undefined") {
    return null
  }
  
  return createPortal(toastContent, document.body)
}
