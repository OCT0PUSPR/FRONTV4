"use client"

import { Package, Calendar } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"

interface OperationCardProps {
  operation: {
    id: string
    reference: string
    product: string
    quantity: number
    sourceLocation: string
    destinationLocation: string
    scheduledDate: string
    operationType: string
    responsible?: string
  }
  onClick: () => void
  index: number
}

export function OperationCard({ operation, onClick, index }: OperationCardProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  // Status gradient for operations
  const statusTheme = {
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    iconColor: "#4facfe",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    label: operation.operationType || t("Operation"),
  }

  return (
    <div
      className="group relative w-full rounded-[24px] p-[2px] cursor-pointer transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
      onClick={onClick}
      style={{
        animationDelay: `${index * 50}ms`,
        background: colors.card,
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
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
            <Package
              className="w-10 h-10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
              style={{ color: statusTheme.iconColor }}
              strokeWidth={1.5}
            />

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>{operation.reference}</span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {operation.product || operation.operationType}
              </h3>
              {operation.scheduledDate && (
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {operation.scheduledDate}
                </p>
              )}
            </div>
          </div>

          {/* Route Visualization */}
          <div className="relative py-4 mb-6">
            <div
              className="absolute top-6 bottom-6 w-0.5 border-dashed"
              style={{
                [isRTL ? 'right' : 'left']: '19px',
                borderLeft: isRTL ? 'none' : `2px dashed ${colors.border}`,
                borderRight: isRTL ? `2px dashed ${colors.border}` : 'none',
              }}
            ></div>

            <div className="flex flex-col gap-4">
              {/* Source Location */}
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
                    {t("Source")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{operation.sourceLocation || "—"}</p>
                </div>
              </div>

              {/* Destination Location */}
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
                    {t("Destination")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{operation.destinationLocation || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div
            className="flex items-center justify-between pt-4 border-t"
            style={{ borderColor: colors.border }}
          >
            <div className="flex items-center gap-4">
              {operation.scheduledDate && (
                <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    {operation.scheduledDate}
                  </span>
                </div>
              )}
            </div>

            {operation.quantity > 0 && (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: colors.mutedBg,
                  color: colors.textSecondary,
                }}
              >
                Qty: {operation.quantity}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
