"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  gradient: string
  delay?: number
}

export function StatCard({ label, value, icon: Icon, gradient, delay = 0 }: StatCardProps) {
  const { i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  return (
    <div
      className="animate-fade-in-up stat-card-hover"
      style={{
        background: gradient,
        borderRadius: "1.25rem",
        padding: "1.5rem",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        animationDelay: `${delay * 0.1}s`,
        position: "relative",
        overflow: "hidden",
        minHeight: "120px",
      }}
    >
      {/* Decorative background elements */}
      <div
        style={{
          position: "absolute",
          top: 0,
          [isRTL ? 'left' : 'right']: 0,
          width: "140px",
          height: "140px",
          background: "rgba(255,255,255,0.15)",
          borderRadius: "50%",
          transform: isRTL ? "translate(-40%, -40%)" : "translate(40%, -40%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          [isRTL ? 'right' : 'left']: 0,
          width: "80px",
          height: "80px",
          background: "rgba(255,255,255,0.08)",
          borderRadius: "50%",
          transform: isRTL ? "translate(30%, 30%)" : "translate(-30%, 30%)",
        }}
      />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          {/* Text content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.85)",
                fontWeight: "500",
                letterSpacing: "0.02em",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: "700",
                color: "#FFFFFF",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                textShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              {value}
            </div>
          </div>

          {/* Icon */}
          <Icon
            size={56}
            strokeWidth={1.5}
            style={{
              color: "rgba(255,255,255,0.85)",
              flexShrink: 0,
              filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.15))",
            }}
          />
        </div>
      </div>
    </div>
  )
}
