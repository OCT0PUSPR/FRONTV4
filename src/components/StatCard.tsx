"use client"

import type { LucideIcon } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  gradient: string
  delay?: number
}

export function StatCard({ label, value, icon: Icon, gradient, delay = 0 }: StatCardProps) {
  const { colors } = useTheme()
  const { i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  return (
    <div
      className="animate-fade-in-up stat-card-hover"
      style={{
        background: colors.card,
        borderRadius: "1rem",
        padding: "1.5rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: `1px solid ${colors.border}`,
        animationDelay: `${delay * 0.1}s`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          [isRTL ? 'left' : 'right']: 0,
          width: "120px",
          height: "120px",
          background: gradient,
          opacity: 0.1,
          borderRadius: "50%",
          transform: isRTL ? "translate(-30%, -30%)" : "translate(30%, -30%)",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "0.75rem",
              background: gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={28} color="white" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.8rem",
                color: colors.textSecondary,
                fontWeight: "500",
                letterSpacing: "0.02em",
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: "700", color: colors.textPrimary, letterSpacing: "-0.02em" }}>
              {value}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
