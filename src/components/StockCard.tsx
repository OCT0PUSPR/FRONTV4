"use client"

import { useState } from "react"
import { Card, CardContent } from "../../@/components/ui/card"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import {
  Package,
  CheckCircle2,
  AlertCircle,
  XCircle,
  DollarSign,
  Box,
  TrendingUp,
  TrendingDown,
} from "lucide-react"

interface StockCardProps {
  stock: {
    quantId: number
    productId: number
    name: string
    category: string
    unitCost: number
    totalValue: number
    onHand: number
    freeToUse: number
    incoming: number
    outgoing: number
    uom: string
    image?: string
  }
  currency?: string
  onClick?: () => void
  index: number
}

export function StockCard({ stock, currency = 'LE', onClick, index }: StockCardProps) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const isRTL = i18n?.dir() === "rtl"
  const [imageError, setImageError] = useState(false)

  // Status-specific gradients and styles based on stock level
  const getStatusTheme = (onHand: number) => {
    if (onHand === 0) {
      return {
        gradient: "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)",
        icon: <XCircle className="w-5 h-5 text-white" />,
        label: t("Out of Stock"),
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        text: "text-rose-600 dark:text-rose-400",
      }
    }
    if (onHand < 100) {
      return {
        gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
        icon: <AlertCircle className="w-5 h-5 text-white" />,
        label: t("Low Stock"),
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
        text: "text-orange-600 dark:text-orange-400",
      }
    }
    return {
      gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      icon: <CheckCircle2 className="w-5 h-5 text-white" />,
      label: t("In Stock"),
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
    }
  }

  const statusTheme = getStatusTheme(stock.onHand)

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
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300 overflow-hidden"
              style={{ 
                background: (stock.image && !imageError) ? 'transparent' : statusTheme.gradient,
                border: (stock.image && !imageError) ? `1px solid ${colors.border}` : 'none'
              }}
            >
              {stock.image && !imageError ? (
                <img
                  src={
                    String(stock.image).startsWith("data:")
                      ? stock.image
                      : `data:image/png;base64,${stock.image}`
                  }
                  alt={stock.name}
                  className="w-full h-full object-cover rounded-2xl"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {statusTheme.icon}
                </div>
              )}
            </div>

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>#{stock.productId}</span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {stock.name}
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                {stock.category}
              </p>
            </div>
          </div>

          {/* Stock Metrics */}
          <div className="relative py-4 mb-6">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div
                style={{
                  background: `linear-gradient(135deg, ${colors.mutedBg}, ${colors.background})`,
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Box size={14} color={colors.textSecondary} />
                  <span style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: "500" }}>
                    {t("On Hand")}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    color: colors.textPrimary,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stock.onHand.toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  background: `linear-gradient(135deg, ${colors.mutedBg}, ${colors.background})`,
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <DollarSign size={14} color={colors.textSecondary} />
                  <span style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: "500" }}>
                    {t("Total Value")}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    color: colors.textPrimary,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {Math.round(stock.totalValue).toLocaleString()} {currency}
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
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">{stock.incoming} {t("Incoming")}</span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-medium">{stock.outgoing} {t("Outgoing")}</span>
              </div>
            </div>

            <div
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
              style={{
                background: colors.mutedBg,
                color: colors.textSecondary,
              }}
            >
              {stock.freeToUse} {t("Available")}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

