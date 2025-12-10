"use client"

import { Card, CardContent } from "../../@/components/ui/card"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import {
  MapPin,
  Package,
  Box,
  User,
} from "lucide-react"

interface LocationCardProps {
  location: {
    id: string
    productName: string
    productImage?: string
    locationName: string
    packageName: string
    lotName: string
    ownerName: string
    onHand: number
    reserved: number
    uomName: string
  }
  onClick?: () => void
  index: number
}

export function LocationCard({ location, onClick, index }: LocationCardProps) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const isRTL = i18n?.dir() === "rtl"

  // Status theme - using blue gradient for location cards
  const statusTheme = {
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    icon: <MapPin className="w-5 h-5 text-white" />,
    label: t("Location"),
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
  }

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
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>#{location.id}</span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {location.productName}
              </h3>
              {location.locationName && (
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {location.locationName}
                </p>
              )}
            </div>
          </div>

          {/* Details Visualization */}
          <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Package */}
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
                    {t("Package")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{location.packageName || "—"}</p>
                </div>
              </div>

              {/* Lot/Serial */}
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
                    {t("Lot/Serial")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{location.lotName || "—"}</p>
                </div>
              </div>

              {/* Owner */}
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
                    {t("Owner")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{location.ownerName || "—"}</p>
                </div>
              </div>

              {/* Unit */}
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
                    {t("Unit")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{location.uomName || "—"}</p>
                </div>
              </div>

              {/* On Hand */}
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
                    {t("On hand")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{location.onHand.toLocaleString()}</p>
                </div>
              </div>

              {/* Reserved */}
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
                    {t("Reserved")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{location.reserved.toLocaleString()}</p>
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
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {location.onHand + location.reserved} {t("Total")}
                </span>
              </div>
            </div>

            {location.uomName && (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: colors.mutedBg,
                  color: colors.textSecondary,
                }}
              >
                {location.uomName}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

