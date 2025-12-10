"use client"

import { ArrowRight, RouteIcon, Settings } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"

interface Route {
  id: string
  name: string
  type: string
  sourceLocation: string
  destinationLocation: string
  rulesCount: number
  status: "active" | "inactive"
}

interface RouteCardProps {
  route: Route
  onClick?: () => void
  index: number
}

export function RouteCard({ route, onClick, index }: RouteCardProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()

  // Status-specific gradients and styles
  const getStatusTheme = (status: string) => {
    const normalizedStatus = status.toLowerCase()
    switch (normalizedStatus) {
      case "active":
        return {
          gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
          bg: "bg-emerald-500/10",
          text: "text-emerald-600 dark:text-emerald-400",
          label: t("Active"),
        }
      case "inactive":
      default:
        return {
          gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          bg: "bg-rose-500/10",
          text: "text-rose-600 dark:text-rose-400",
          label: t("Inactive"),
        }
    }
  }

  const statusTheme = getStatusTheme(route.status)

  return (
    <div
      className="group relative w-full rounded-[24px] p-[2px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
      onClick={onClick}
      style={{
        animationDelay: `${index * 50}ms`,
        background: colors.card,
        cursor: onClick ? 'pointer' : 'default',
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
        <div className="p-6">
          {/* Header Section */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300"
              style={{ background: statusTheme.gradient }}
            >
              <RouteIcon className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>#{route.id}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3
                    className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                    style={{ color: colors.textPrimary, backgroundImage: "none" }}
                  >
                    {route.name}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                    {route.type}
                  </p>
                </div>
                {/* Rules Count under the status pill */}
                <div className="flex flex-col items-end gap-1">
                  <div
                    className={`
                    inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                    ${statusTheme.bg} ${statusTheme.text}
                  `}
                  >
                    {statusTheme.label}
                  </div>
                  <div className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                    {route.rulesCount} {route.rulesCount === 1 ? t("Rule") : t("Rules")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Route Visualization */}
          <div className="relative py-4 mb-0">
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
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{route.sourceLocation || "—"}</p>
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
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{route.destinationLocation || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
