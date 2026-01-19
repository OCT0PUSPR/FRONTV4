"use client"

import { Package, Layers, Tag, CheckCircle2, XCircle } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import { useAuth } from "../../context/auth"

interface ProductRecordCardProps {
  product: {
    id: number
    name: string
    default_code: string
    qty_available: number
    list_price: number
    image_512?: string
    categ_id: [number, string]
    sale_ok: boolean
  }
  onClick: () => void
  index: number
}

export function ProductRecordCard({ product, onClick, index }: ProductRecordCardProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const { currencySymbol } = useAuth()
  const isRTL = i18n?.dir() === "rtl"

  // Status gradient based on availability
  const statusGradient = product.qty_available > 0
    ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
    : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"

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
        style={{ background: statusGradient }}
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
            ${product.qty_available > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}
          `}
          >
            {product.qty_available > 0 ? t("In Stock") : t("Out of Stock")}
          </div>
        </div>

        <div className="p-6">
          {/* Header Section */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-12 h-12 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 rounded-xl"
              style={{ 
                background: '#ffffff',
                border: `1px solid ${colors.border}`
              }}
            >
              {product.image_512 ? (
                <img
                  src={`data:image/webp;base64,${product.image_512}`}
                  alt={product.name}
                  className="w-full h-full object-contain rounded-xl p-1"
                />
              ) : (
                <Package className="w-6 h-6 text-white" />
              )}
            </div>

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>
                  {product.default_code || t("No code")}
                </span>
              </div>
              <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
                {product.name}
              </h3>
            </div>
          </div>

          {/* Details Grid - 2 per row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* In Stock */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                {t("In Stock")}
              </span>
              <p className="text-sm font-medium" style={{ color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }}>
                {product.qty_available.toLocaleString()}
              </p>
            </div>

            {/* Price */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                {t("Price")}
              </span>
              <p className="text-sm font-medium" style={{ color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }}>
                {currencySymbol}{product.list_price.toFixed(2)}
              </p>
            </div>

            {/* Category */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                {t("Category")}
              </span>
              <p className="text-sm font-medium" style={{ color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }}>
                {product.categ_id[1]}
              </p>
            </div>

            {/* Sale Status */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                {t("Status")}
              </span>
              <p className="text-sm font-medium" style={{ color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }}>
                {product.sale_ok ? t("For Sale") : t("Not for Sale")}
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
                <Layers className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {product.qty_available.toLocaleString()} {t("Units")}
                </span>
              </div>
              <div className="flex items-center" style={{ color: colors.textSecondary, flexDirection: isRTL ? "row-reverse" : "row" }}>
                <span className="text-xs font-medium">
                  {currencySymbol}{(product.list_price * product.qty_available).toLocaleString()}
                </span>
              </div>
            </div>

            {product.default_code && (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: colors.mutedBg,
                  color: colors.textSecondary,
                }}
              >
                {product.default_code}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
