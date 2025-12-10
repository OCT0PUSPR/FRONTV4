"use client"

import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import { Box, Ruler, Scale, Truck, Package } from "lucide-react"

interface ProductPackageCardProps {
  pkg: any
  onClick?: () => void
  index: number
}

export function ProductPackageCard({ pkg, onClick, index }: ProductPackageCardProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  const displayName = pkg.display_name || pkg.name || (pkg.id ? `Package Type #${pkg.id}` : "Package Type")
  const barcode = pkg.barcode || pkg.x_barcode || "-"
  const carrier =
    pkg.carrier ||
    (Array.isArray(pkg.delivery_carrier_id) ? pkg.delivery_carrier_id[1] : "") ||
    "No carrier integration"

  const statusTheme = {
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    label: carrier !== "No carrier integration" ? t("Integrated") : t("Package"),
  }

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
              <Package className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>#{pkg.id}</span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {displayName}
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                {barcode}
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
                  {t("Dimensions")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                  {pkg.height ?? pkg.package_height ?? "-"} × {pkg.width ?? pkg.package_width ?? "-"} × {pkg.length ?? pkg.package_length ?? "-"} mm
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
                  {t("Weight")}
                </span>
                <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                  {pkg.weight ?? pkg.package_weight ?? "-"} / {pkg.maxWeight ?? pkg.max_weight ?? "-"} kg
                </p>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between pt-4 border-t"
            style={{ borderColor: colors.border }}
          >
            <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
              <Truck className="w-4 h-4" />
              <span className="text-xs font-medium">
                {carrier}
              </span>
            </div>

            <button
              onClick={onClick}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium"
              style={{
                background: colors.mutedBg,
                color: colors.textSecondary,
              }}
            >
              {t("View Details")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
