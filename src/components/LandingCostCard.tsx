"use client"

import { FileText, Calendar, Package, Building2, DollarSign, CheckCircle2, Clock } from "lucide-react"
import { Badge } from "../../@/components/ui/badge"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"

interface LandingCostCardProps {
  cost: any
  onClick: () => void
  index: number
}

export function LandingCostCard({ cost, onClick, index }: LandingCostCardProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  // Status-specific gradients and styles
  const getStatusTheme = (state: string) => {
    switch (state?.toLowerCase()) {
      case "posted":
        return {
          gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
          textGradient: "bg-gradient-to-br from-[#43e97b] to-[#38f9d7]",
          icon: <CheckCircle2 className="w-5 h-5 text-white" />,
          label: t("Posted"),
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          text: "text-emerald-600 dark:text-emerald-400",
        }
      case "draft":
        return {
          gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
          textGradient: "bg-gradient-to-br from-[#fa709a] to-[#fee140]",
          icon: <FileText className="w-5 h-5 text-white" />,
          label: t("Draft"),
          bg: "bg-orange-500/10",
          border: "border-orange-500/20",
          text: "text-orange-600 dark:text-orange-400",
        }
      default:
        return {
          gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          textGradient: "bg-gradient-to-br from-[#4facfe] to-[#00f2fe]",
          icon: <Clock className="w-5 h-5 text-white" />,
          label: t(state || ""),
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          text: "text-blue-600 dark:text-blue-400",
        }
    }
  }

  const statusTheme = getStatusTheme(cost.state)
  const applyOn = cost.applyOn || (cost.picking_ids?.length ? "Transfers" : "Manufacturing Orders")

  return (
    <div
      className="group relative w-full rounded-[24px] p-[2px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      style={{
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
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300"
              style={{ background: statusTheme.gradient }}
            >
              {statusTheme.icon}
            </div>

            <div className="flex-1 pt-1">
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {cost.name}
              </h3>
            </div>
          </div>

          {/* Cost Visualization */}
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
              {/* Total Cost */}
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
                    {t("Total Cost")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                    {(cost.totalCost || cost.amount_total || 0).toLocaleString()} {cost.currency || "LE"}
                  </p>
                </div>
              </div>

              {/* Apply On */}
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
                    {t("Apply On")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                    {t(applyOn)}
                  </p>
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
              <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {cost.date ? new Date(cost.date).toLocaleDateString() : "—"}
                </span>
              </div>
              {cost.vendorBill || cost.account_move_id?.[1] ? (
                <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    {cost.vendorBill || cost.account_move_id?.[1] || "—"}
                  </span>
                </div>
              ) : null}
            </div>

            {applyOn === "Transfers" ? (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: colors.mutedBg,
                  color: colors.textSecondary,
                }}
              >
                <Package className="w-4 h-4 inline mr-1" />
                {t("Transfers")}
              </div>
            ) : (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: colors.mutedBg,
                  color: colors.textSecondary,
                }}
              >
                <Building2 className="w-4 h-4 inline mr-1" />
                {t("Manufacturing")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
