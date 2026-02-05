"use client"

import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import {
  ArrowRight,
  Package,
  Box,
  MapPin,
} from "lucide-react"

interface MoveCardProps {
  move: {
    id: number | string
    reference: string
    product: string
    from: string
    to: string
    quantity: number
    unit: string
    date: string
    lotSerial?: string
    status: string
  }
  onClick?: () => void
  index: number
}

export function MoveCard({ move, onClick, index }: MoveCardProps) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const isRTL = i18n?.dir() === "rtl"

  // Status-specific gradients and styles
  const getStatusTheme = (status: string) => {
    const normalizedStatus = status.toLowerCase()
    switch (normalizedStatus) {
      case "done":
        return {
          gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
          iconColor: "#43e97b",
          bg: "bg-emerald-500/10",
          text: "text-emerald-600 dark:text-emerald-400",
          label: t("Done"),
        }
      case "cancelled":
        return {
          gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          iconColor: "#f59e0b",
          bg: "bg-rose-500/10",
          text: "text-rose-600 dark:text-rose-400",
          label: t("Cancelled"),
        }
      case "pending":
      default:
        return {
          gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          iconColor: "#4facfe",
          bg: "bg-blue-500/10",
          text: "text-blue-600 dark:text-blue-400",
          label: t("Pending"),
        }
    }
  }

  const statusTheme = getStatusTheme(move.status)

  return (
    <div
      className="group relative w-full rounded-[24px] p-[2px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        animationDelay: `${index * 50}ms`,
        background: colors.card,
      }}
    >
      {/* Gradient Border Effect */}
      <div
        className="absolute inset-0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: statusTheme.gradient }}
      />

      <div
        className="relative h-full rounded-[22px] overflow-hidden group-hover:border-transparent transition-colors"
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Status Tab */}
        <div
          className="absolute top-0 p-4"
          style={{
            [isRTL ? 'left' : 'right']: 0,
          }}
        >
          <div
            className={`
            inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
            ${statusTheme.bg} ${statusTheme.text}
          `}
          >
            {statusTheme.label}
          </div>
        </div>

        <div className="p-6">
          {/* Header Section */}
          <div className="flex items-start gap-4 mb-6">
            <ArrowRight
              className="w-10 h-10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
              style={{ color: statusTheme.iconColor }}
              strokeWidth={1.5}
            />

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>{move.reference}</span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {move.product}
              </h3>
              {move.date && (
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {move.date}
                </p>
              )}
            </div>
          </div>

          {/* Details Visualization */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Left Column: From -> To with dotted line */}
            <div className="relative py-4">
              <div
                className="absolute top-6 bottom-6 w-0.5 border-dashed"
                style={{
                  [isRTL ? 'right' : 'left']: '19px',
                  borderLeft: isRTL ? 'none' : `2px dashed ${colors.border}`,
                  borderRight: isRTL ? `2px dashed ${colors.border}` : 'none',
                }}
              ></div>

              <div className="flex flex-col gap-4">
                {/* From */}
                <div className="flex items-start relative" style={{ paddingLeft: isRTL ? 0 : '2.5rem', paddingRight: isRTL ? '2.5rem' : 0 }}>
                  <div
                    className="absolute flex justify-center pt-1 z-10"
                    style={{
                      width: '2.5rem',
                      [isRTL ? 'right' : 'left']: '19px',
                      transform: isRTL ? 'translateX(50%)' : 'translateX(-50%)',
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full ring-4"
                      style={{
                        background: colors.mutedBg,
                        boxShadow: `0 0 0 4px ${colors.border}`,
                      }}
                    ></div>
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                      {t("From")}
                    </span>
                    <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{move.from || "—"}</p>
                  </div>
                </div>

                {/* To */}
                <div className="flex items-start relative" style={{ paddingLeft: isRTL ? 0 : '2.5rem', paddingRight: isRTL ? '2.5rem' : 0 }}>
                  <div
                    className="absolute flex justify-center pt-1 z-10"
                    style={{
                      width: '2.5rem',
                      [isRTL ? 'right' : 'left']: '19px',
                      transform: isRTL ? 'translateX(50%)' : 'translateX(-50%)',
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full ring-4"
                      style={{
                        background: statusTheme.gradient,
                        boxShadow: `0 0 0 4px ${colors.border}`,
                      }}
                    ></div>
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                      {t("To")}
                    </span>
                    <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{move.to || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Quantity and Lot/Serial */}
            <div className="flex flex-col gap-4">
              {/* Quantity */}
              <div className="flex items-start relative" style={{ paddingLeft: isRTL ? 0 : '2.5rem', paddingRight: isRTL ? '2.5rem' : 0 }}>
                <div
                  className="absolute flex justify-center z-10"
                  style={{
                    width: '2.5rem',
                    [isRTL ? 'right' : 'left']: '19px',
                    transform: isRTL ? 'translateX(50%)' : 'translateX(-50%)',
                    paddingTop: '0.25rem',
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full ring-4"
                    style={{
                      background: statusTheme.gradient,
                      boxShadow: `0 0 0 4px ${colors.border}`,
                    }}
                  ></div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                    {t("Quantity")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{move.quantity.toFixed(2)} {move.unit}</p>
                </div>
              </div>

              {/* Lot/Serial */}
              <div className="flex items-start relative" style={{ paddingLeft: isRTL ? 0 : '2.5rem', paddingRight: isRTL ? '2.5rem' : 0 }}>
                <div
                  className="absolute flex justify-center z-10"
                  style={{
                    width: '2.5rem',
                    [isRTL ? 'right' : 'left']: '19px',
                    transform: isRTL ? 'translateX(50%)' : 'translateX(-50%)',
                    paddingTop: '0.25rem',
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full ring-4"
                    style={{
                      background: statusTheme.gradient,
                      boxShadow: `0 0 0 4px ${colors.border}`,
                    }}
                  ></div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                    {t("Lot/Serial")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{move.lotSerial || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

