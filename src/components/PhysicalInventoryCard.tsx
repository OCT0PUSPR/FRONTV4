"use client"

import { useState } from "react"
import { Package, MapPin, User, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertCircle, DollarSign } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"

interface PhysicalInventoryCardProps {
  item: {
    display_name:string
    id: number
    location: string
    product: string
    lotSerialNumber: string
    package: string
    owner: string
    onHandQuantity: number
    uom: string
    countedQuantity: number
    difference: number
    scheduledDate: string
    user: string
    unitPrice: number
    productImage?: string
  }
  onClick?: () => void
  onCountChange?: (id: number, value: number) => void
  index: number
}

export function PhysicalInventoryCard({ item, onClick, onCountChange, index }: PhysicalInventoryCardProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"
  const [imageError, setImageError] = useState(false)

  // Status-specific gradients and styles based on difference
  const getStatusTheme = (difference: number) => {
    if (difference > 0) {
      return {
        gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
        icon: TrendingUp,
        iconColor: "#43e97b",
        label: t("Surplus"),
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        text: "text-emerald-600 dark:text-emerald-400",
      }
    }
    if (difference < 0) {
      return {
        gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        icon: TrendingDown,
        iconColor: "#4facfe",
        label: t("Shortage"),
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        text: "text-blue-600 dark:text-blue-400",
      }
    }
    return {
      gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
      icon: CheckCircle2,
      iconColor: "#a18cd1",
      label: t("Exact Match"),
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      text: "text-purple-600 dark:text-purple-400",
    }
  }

  const statusTheme = getStatusTheme(item.difference)

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

        <div className="p-6">
          {/* Header Section */}
          <div className="flex items-start gap-4 mb-6">
            {item.productImage && !imageError ? (
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden transform group-hover:scale-110 transition-transform duration-300">
                <img
                  src={
                    item.productImage.startsWith('data:')
                      ? item.productImage
                      : `data:image/webp;base64,${item.productImage}`
                  }
                  alt={item.product}
                  className="w-full h-full object-cover rounded-xl"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <statusTheme.icon
                className="w-10 h-10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
                style={{ color: statusTheme.iconColor }}
                strokeWidth={1.5}
              />
            )}

            <div className="flex-1 pt-1">
              {item.lotSerialNumber && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>{item.display_name}</span>
                </div>
              )}
              <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
                {item.product}
              </h3>
            </div>
          </div>

          {/* Details Visualization */}
          <div className="relative py-4 mb-6">
            <div className="flex flex-col gap-4">
              {/* On Hand */}
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
                    {t("On Hand")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                    {item.onHandQuantity} {item.uom}
                  </p>
                </div>
              </div>

              {/* Counted */}
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
                    {t("Counted")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                    {item.countedQuantity} {item.uom}
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
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium">{item.location}</span>
              </div>
              {item.owner && (
                <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                  <User className="w-4 h-4" />
                  <span className="text-xs font-medium">{item.owner}</span>
                </div>
              )}
            </div>

            <div
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
              style={{
                background: colors.mutedBg,
                color: colors.textSecondary,
              }}
            >
              LE {(item.onHandQuantity * item.unitPrice).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
