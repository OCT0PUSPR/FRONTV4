"use client"

import { FileText, Eye, EyeOff, Grid3x3 } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"

interface AttributeCardProps {
  attribute: {
    id: string
    name: string
    displayType: string
    variantCreation: string
    filterVisibility: string
    values: Array<{ id: string; value: string; freeText: boolean; extraPrice: number }>
  }
  onClick?: () => void
  index: number
}

export function AttributeCard({ attribute, onClick, index }: AttributeCardProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  const statusTheme = {
    gradient:"linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    iconColor: "#4facfe",
    textColor: "#FFFFFF",
    label: attribute.filterVisibility === "Visible" ? t("Visible") : t("Hidden"),
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
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
            style={{
              background: statusTheme.bg,
              color: statusTheme.textColor,
            }}
          >
            {statusTheme.label}
          </div>
        </div>

        <div className="p-6">
          {/* Header Section */}
          <div className="flex items-start gap-4 mb-6">
            <FileText
              className="w-10 h-10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
              style={{ color: statusTheme.iconColor }}
              strokeWidth={1.5}
            />

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>#{attribute.id}</span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {attribute.name}
              </h3>
            </div>
          </div>

          {/* Route Visualization */}
          <div className="py-4 mb-6">
            <div className="flex gap-6">
              {/* Display Type */}
              <div className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    background: statusTheme.gradient,
                    boxShadow: `0 0 0 4px ${colors.border}`,
                  }}
                ></div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                    {t("Display Type")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{attribute.displayType}</p>
                </div>
              </div>

              {/* Variant Creation */}
              <div className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    background: statusTheme.gradient,
                    boxShadow: `0 0 0 4px ${colors.border}`,
                  }}
                ></div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
                    {t("Variant Creation")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{attribute.variantCreation}</p>
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
                {attribute.filterVisibility === "Visible" ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">
                  {t(attribute.filterVisibility)}
                </span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                <Grid3x3 className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {attribute.values.length} {attribute.values.length === 1 ? t("Value") : t("Values")}
                </span>
              </div>
            </div>

            {attribute.displayType && (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: colors.mutedBg,
                  color: colors.textSecondary,
                }}
              >
                {attribute.displayType}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
