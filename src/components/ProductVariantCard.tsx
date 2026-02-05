"use client"

import { useState } from "react"
import { Package, DollarSign, Archive, Tag, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import React from "react"

interface ProductVariantCardProps {
  variant: {
    id: number
    internalReference: string
    name: string
    category: string
    salesPrice: number
    cost: number
    onHand: number
    barcode?: string
    productImage?: string
    favorite?: boolean
  }
  onClick: () => void
  index: number
}

export function ProductVariantCard({ variant, onClick, index }: ProductVariantCardProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"
  const [imageError, setImageError] = useState(false)

  // Status gradient based on stock level
  const getStatusTheme = (onHand: number) => {
    if (onHand === 0) {
      return {
        gradient: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
        icon: XCircle,
        iconColor: "#d97706",
        label: t("Out of Stock"),
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        text: "text-rose-600 dark:text-rose-400",
      }
    }
    if (onHand < 100) {
      return {
        gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
        icon: AlertCircle,
        iconColor: "#dc2626",
        label: t("Low Stock"),
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
        text: "text-orange-600 dark:text-orange-400",
      }
    }
    return {
      gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      icon: CheckCircle2,
      iconColor: "#43e97b",
      label: t("In Stock"),
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
    }
  }

  const statusTheme = getStatusTheme(variant.onHand)
  const margin = variant.salesPrice > 0 
    ? (((variant.salesPrice - variant.cost) / variant.salesPrice) * 100).toFixed(1)
    : "0"

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
        {/* Status Badge */}
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
            {variant.productImage && !imageError ? (
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden transform group-hover:scale-110 transition-transform duration-300">
                <img
                  src={
                    variant.productImage.startsWith('data:')
                      ? variant.productImage
                      : `data:image/webp;base64,${variant.productImage}`
                  }
                  alt={variant.name}
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
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>
                  {variant.internalReference || t("No code")}
                </span>
              </div>
              <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
                {variant.name}
              </h3>
            </div>
          </div>

          {/* Details Grid - 2 per row */}
          <div className="grid grid-cols-2 gap-4 mb-6" style={{ direction: isRTL ? "rtl" : "ltr" }}>
            {/* Sales Price */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                {t("Sales Price")}
              </span>
              <p className="text-sm font-medium" style={{ color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }}>
                ${variant.salesPrice.toFixed(2)}
              </p>
            </div>

            {/* On Hand */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                {t("On Hand")}
              </span>
              <p className="text-sm font-medium" style={{ color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }}>
                {variant.onHand.toLocaleString()}
              </p>
            </div>

            {/* Category */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                {t("Category")}
              </span>
              <p className="text-sm font-medium truncate" style={{ color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }}>
                {variant.category || t("N/A")}
              </p>
            </div>

            {/* Margin */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                {t("Margin")}
              </span>
              <p className="text-sm font-medium" style={{ color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }}>
                {margin}%
              </p>
            </div>
          </div>

          {/* Footer Metadata */}
          <div
            className="flex items-center justify-between pt-4 border-t"
            style={{ borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }}
          >
            <div className="flex items-center gap-4" style={{ flexDirection: isRTL ? "row-reverse" : "row" }}>
              <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary, flexDirection: isRTL ? "row-reverse" : "row" }}>
                <Archive className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {variant.onHand.toLocaleString()} {t("Units")}
                </span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary, flexDirection: isRTL ? "row-reverse" : "row" }}>
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {t("Cost")}: ${variant.cost.toFixed(2)}
                </span>
              </div>
            </div>

            {variant.barcode && (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: colors.mutedBg,
                  color: colors.textSecondary,
                }}
              >
                {variant.barcode}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

