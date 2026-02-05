"use client"

import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import {
  DollarSign,
  Package,
  TrendingUp,
  Calendar,
} from "lucide-react"

interface ValuationCardProps {
  date: string
  reference: string
  product: string
  quantity: number
  totalValue: number
  category: string
  unitValue: number
  imageBase64?: string
  currency?: string
  onClick?: () => void
  index: number
}

export function ValuationCard({
  date,
  reference,
  product,
  quantity,
  totalValue,
  category,
  unitValue,
  currency = 'LE',
  onClick,
  index,
}: ValuationCardProps) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const isRTL = i18n?.dir() === "rtl"

  // Status theme - using orange/yellow gradient for valuation cards
  const statusTheme = {
    gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
    icon: DollarSign,
    iconColor: "#dc2626",
    label: t("Valuation"),
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
  }

  const sku = product.match(/\[(.*?)\]/)?.[1] || "N/A"
  const productName = product.split("]")[1]?.trim() || product

  return (
    <div
      className="group relative w-full rounded-[24px] p-[2px] cursor-pointer transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
      onClick={onClick}
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
            {category}
          </div>
        </div>

        <div className="p-6" style={{ paddingTop: "2.6rem" }}>
          {/* Header Section */}
          <div className="flex items-start gap-4 mb-6">
            <statusTheme.icon
              className="w-10 h-10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
              style={{ color: statusTheme.iconColor }}
              strokeWidth={1.5}
            />

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>{sku}</span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {productName}
              </h3>
              {reference && (
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {reference}
                </p>
              )}
            </div>
          </div>

          {/* Details Visualization */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Unit Value */}
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
                  {t("Unit Value")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{unitValue.toLocaleString()} {currency}</p>
              </div>
            </div>

            {/* Quantity */}
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
                  {t("Quantity")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{quantity.toFixed(2)}</p>
              </div>
            </div>

            {/* Total Value */}
            <div className="flex items-start gap-3 col-span-2">
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
                  {t("Total Value")}
                </span>
                <p className="text-lg font-bold" style={{ color: colors.textPrimary }}>{totalValue.toLocaleString()} {currency}</p>
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
                  {date ? new Date(date).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>

            {totalValue > 0 && (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: statusTheme.gradient,
                  color: "#FFFFFF",
                }}
              >
                {t("Valuation")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
