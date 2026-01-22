import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import { Check, X, AlertCircle, Info } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ToastProps {
  text: string
  state?: "success" | "error" | "info" | "warning"
  onClose: () => void
  duration?: number
}

export default function Toast({
  text,
  state = "success",
  onClose,
  duration = 4000,
}: ToastProps) {
  const { colors, mode } = useTheme()
  const { i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"
  const [mounted, setMounted] = useState(false)
  const isDark = mode === "dark"

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => onClose(), duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  // Config per state
  const config = {
    success: {
      icon: Check,
      bg: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
      border: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#10b981',
      accent: '#10b981',
    },
    error: {
      icon: X,
      bg: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
      border: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.25)',
      iconBg: 'rgba(239, 68, 68, 0.15)',
      iconColor: '#ef4444',
      accent: '#ef4444',
    },
    warning: {
      icon: AlertCircle,
      bg: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
      border: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.25)',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#f59e0b',
      accent: '#f59e0b',
    },
    info: {
      icon: Info,
      bg: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
      border: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.25)',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      iconColor: '#3b82f6',
      accent: '#3b82f6',
    },
  }

  const currentConfig = config[state]
  const IconComponent = currentConfig.icon

  const toastContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.9 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: "fixed",
          top: 32,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99999,
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 24px",
            background: isDark ? colors.card : "#fff",
            borderRadius: "14px",
            border: `1.5px solid ${currentConfig.border}`,
            boxShadow: isDark
              ? "0 12px 48px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.4)"
              : "0 12px 48px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)",
            minWidth: 380,
            maxWidth: 560,
            direction: isRTL ? "rtl" : "ltr",
            position: "relative",
            overflow: "hidden",
          }}
          role="status"
          aria-live="polite"
        >
          {/* Accent line */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 5,
              background: currentConfig.accent,
              borderRadius: "14px 0 0 14px",
            }}
          />

          {/* Icon */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "12px",
              background: currentConfig.iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconComponent size={24} color={currentConfig.iconColor} strokeWidth={2.5} />
          </div>

          {/* Text */}
          <span
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: 500,
              color: colors.textPrimary,
              lineHeight: 1.5,
              textAlign: isRTL ? "right" : "left",
              letterSpacing: "-0.01em",
            }}
          >
            {text}
          </span>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              color: colors.textSecondary,
              transition: "all 0.15s ease",
              flexShrink: 0,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.background
              e.currentTarget.style.color = colors.textPrimary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = colors.textSecondary
            }}
            aria-label="Close notification"
          >
            <X size={18} strokeWidth={2} />
          </button>

          {/* Progress bar */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: duration / 1000, ease: "linear" }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: currentConfig.accent,
              transformOrigin: "left",
              opacity: 0.6,
            }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )

  if (!mounted || typeof window === "undefined") {
    return null
  }

  return createPortal(toastContent, document.body)
}
