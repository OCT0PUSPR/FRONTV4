"use client"

import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import {
  Warehouse,
  Package,
  MapPin,
  Scale,
  Boxes,
} from "lucide-react"

interface StorageCategoryCardProps {
  category: any
  onClick?: () => void
  index: number
}

export function StorageCategoryCard({ category, onClick, index }: StorageCategoryCardProps) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const isRTL = i18n?.dir() === "rtl"

  const m2mSummary = (val: any): number => {
    if (Array.isArray(val)) return val.length
    return 0
  }

  // Policy-specific gradients and styles
  const getPolicyTheme = (policy: string) => {
    const normalizedPolicy = String(policy || 'mixed').toLowerCase()
    switch (normalizedPolicy) {
      case "mixed":
        return {
          gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          bg: "bg-blue-500/10",
          text: "text-blue-600 dark:text-blue-400",
          label: t("Mixed"),
        }
      case "same":
        return {
          gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
          bg: "bg-emerald-500/10",
          text: "text-emerald-600 dark:text-emerald-400",
          label: t("Same"),
        }
      case "empty":
        return {
          gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          bg: "bg-rose-500/10",
          text: "text-rose-600 dark:text-rose-400",
          label: t("Empty"),
        }
      default:
        return {
          gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          bg: "bg-blue-500/10",
          text: "text-blue-600 dark:text-blue-400",
          label: t("Mixed"),
        }
    }
  }

  const policy = String(category.raw?.allow_new_product || 'mixed')
  const policyTheme = getPolicyTheme(policy)
  const locationsCount = m2mSummary(category.raw?.location_ids)
  const packageCapsCount = m2mSummary(category.raw?.package_capacity_ids)
  const productCapsCount = m2mSummary(category.raw?.product_capacity_ids)
  const maxWeight = category.raw?.max_weight ?? null

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
        style={{ background: policyTheme.gradient }}
      />

      <div
        className="relative h-full rounded-[22px] overflow-hidden group-hover:border-transparent transition-colors"
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Policy Tab */}
        <div
          className="absolute top-0 p-4"
          style={{
            [isRTL ? 'left' : 'right']: 0,
          }}
        >
          <div
            className={`
            inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
            ${policyTheme.bg} ${policyTheme.text}
          `}
          >
            {policyTheme.label}
          </div>
        </div>

        <div className="p-6">
          {/* Header Section */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300"
              style={{ background: policyTheme.gradient }}
            >
              <Warehouse className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>#{category.id}</span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {category.title}
              </h3>
            </div>
          </div>

          {/* Details Visualization */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Left Column: Max Weight and Locations (no dotted lines) */}
            <div className="flex flex-col gap-4">
              {/* Max Weight */}
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 flex justify-center pt-1"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full ring-4"
                    style={{
                      background: policyTheme.gradient,
                      boxShadow: `0 0 0 4px ${colors.border}`,
                    }}
                  ></div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                    {t("Max Weight")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                    {maxWeight ? `${maxWeight} ${category.raw?.weight_uom_name || ''}` : "—"}
                  </p>
                </div>
              </div>

              {/* Locations */}
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 flex justify-center pt-1"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full ring-4"
                    style={{
                      background: policyTheme.gradient,
                      boxShadow: `0 0 0 4px ${colors.border}`,
                    }}
                  ></div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                    {t("Locations")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{locationsCount}</p>
                </div>
              </div>
            </div>

            {/* Right Column: Package Caps and Product Caps */}
            <div className="flex flex-col gap-4">
              {/* Package Caps */}
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 flex justify-center pt-1"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full ring-4"
                    style={{
                      background: policyTheme.gradient,
                      boxShadow: `0 0 0 4px ${colors.border}`,
                    }}
                  ></div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                    {t("Package Caps")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{packageCapsCount}</p>
                </div>
              </div>

              {/* Product Caps */}
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 flex justify-center pt-1"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full ring-4"
                    style={{
                      background: policyTheme.gradient,
                      boxShadow: `0 0 0 4px ${colors.border}`,
                    }}
                  ></div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                    {t("Product Caps")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{productCapsCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}