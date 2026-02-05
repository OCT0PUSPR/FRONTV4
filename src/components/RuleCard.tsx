"use client"

import { ArrowRight, Settings } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"

interface RuleCardProps {
  rule: {
    id: string | number
    name: string
    action: string
    operationType: string
    sourceLocation: string
    destinationLocation: string
    supplyMethod: string
    route: string
    leadTime: number
    raw?: any
  }
  onClick?: () => void
  index: number
}

export function RuleCard({ rule, onClick, index }: RuleCardProps) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const isRTL = i18n?.dir() === "rtl"

  // Status-specific gradients and styles
  const getStatusTheme = (action: string) => {
    const normalizedAction = action.toLowerCase()
    switch (normalizedAction) {
      case "pull from":
        return {
          gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
          iconColor: "#43e97b",
          bg: "bg-emerald-500/10",
          text: "text-emerald-600 dark:text-emerald-400",
          label: action,
        }
      case "push to":
        return {
          gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          iconColor: "#f59e0b",
          bg: "bg-rose-500/10",
          text: "text-rose-600 dark:text-rose-400",
          label: action,
        }
      case "buy":
        return {
          gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
          iconColor: "#dc2626",
          bg: "bg-yellow-500/10",
          text: "text-yellow-600 dark:text-yellow-400",
          label: action,
        }
      case "manufacture":
        return {
          gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          iconColor: "#667eea",
          bg: "bg-purple-500/10",
          text: "text-purple-600 dark:text-purple-400",
          label: action,
        }
      default:
        return {
          gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          iconColor: "#4facfe",
          bg: "bg-blue-500/10",
          text: "text-blue-600 dark:text-blue-400",
          label: action,
        }
    }
  }

  const statusTheme = getStatusTheme(rule.action)

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

        <div className="p-6" style={{ paddingTop: "2.25rem" }}>
          {/* Header Section */}
          <div className="flex items-start gap-4 mb-6">
            <Settings
              className="w-10 h-10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
              style={{ color: statusTheme.iconColor }}
              strokeWidth={1.5}
            />

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>#{rule.id}</span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {rule.name}
              </h3>
              {rule.route && (
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {rule.route}
                </p>
              )}
            </div>
          </div>

          {/* Details Visualization */}
          <div className="grid grid-cols-2 gap-4 mb-0">
            {/* From */}
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 flex justify-center pt-1"
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
                  {t("From")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{rule.sourceLocation || "—"}</p>
              </div>
            </div>

            {/* To */}
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 flex justify-center pt-1"
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
                  {t("To")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{rule.destinationLocation || "—"}</p>
              </div>
            </div>

            {/* Supply Method */}
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 flex justify-center pt-1"
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
                  {t("Supply Method")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{rule.supplyMethod || "—"}</p>
              </div>
            </div>

            {/* Lead Time */}
            {rule.leadTime !== undefined && (
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 flex justify-center pt-1"
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
                    {t("Lead Time")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{rule.leadTime} {t("days")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
