"use client"

import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import { Truck, DollarSign, Package, TrendingUp, MapPin } from "lucide-react"

interface DeliveryMethodCardProps {
  method: {
    id: number
    name: string
    delivery_type: string
    fixed_price?: number
    margin?: number
    fixed_margin?: number
    tracking_url?: string
    website_published?: boolean
    active?: boolean
  }
  onClick?: () => void
  index: number
  currencySymbol: string
}

export function DeliveryMethodCard({ method, onClick, index, currencySymbol }: DeliveryMethodCardProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  const isPublished = method.website_published || method.active !== false

  const statusTheme = {
    gradient: isPublished 
      ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
      : "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    bg: isPublished ? "bg-emerald-500/10" : "bg-blue-500/10",
    text: isPublished ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400",
    label: isPublished ? t("Published") : t("Draft"),
  }

  return (
    <div
      className="group relative w-full rounded-[24px] p-[2px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
      onClick={onClick}
      style={{
        animationDelay: `${index * 50}ms`,
        cursor: onClick ? 'pointer' : 'default',
        background: colors.card,
      }}
    >
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
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300"
              style={{ background: statusTheme.gradient }}
            >
              <Truck className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>#{method.id}</span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {method.name}
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                {method.delivery_type === "base_on_rule" ? t("Based on Rules") : t("Fixed Price")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex justify-center pt-1">
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
                  {t("Fixed Price")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                  {currencySymbol}{Number(method.fixed_price || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex justify-center pt-1">
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
                  {t("Margin")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{Number(method.margin || 0)}%</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex justify-center pt-1">
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
                  {t("Fixed Margin")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                  {currencySymbol}{Number(method.fixed_margin || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {method.tracking_url && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex justify-center pt-1">
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
                    {t("Tracking")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{t("Available")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
