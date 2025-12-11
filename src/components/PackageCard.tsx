"use client"

import { Package, Weight, RulerDimensionLine, CheckCircle2 } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"

interface PackageCardProps {
  pkg: {
    id: number
    name?: string
    display_name?: string
    sequence?: number
    height?: number
    width?: number
    packaging_length?: number
    weight?: number
    max_weight?: number
    barcode?: string
    weight_uom_name?: string
    length_uom_name?: string
    company_id?: any
    storage_category_capacity_ids?: any[]
    create_uid?: any
    create_date?: string
    write_uid?: any
    write_date?: string
    shipper_package_code?: string
    package_carrier_type?: string
    package_type_id?: string
    shipping_weight?:string
  }
  onClick?: () => void
  index: number
}

export function PackageCard({ pkg, onClick, index }: PackageCardProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  const title = pkg.display_name || pkg.name || `#${pkg.id}`
  const lengthUnit = pkg.length_uom_name || ""
  const weightUnit = pkg.weight_uom_name || ""
  const typeName = Array.isArray(pkg.package_type_id)
    ? pkg.package_type_id[1]
    : typeof pkg.package_type_id === "string"
      ? pkg.package_type_id.replace(/^[0-9]+\s*/, "").trim()
      : ""
  const weightVal = [pkg.shipping_weight, (pkg as any).shipping_weight, pkg.shipping_weight, pkg.weight]
    .map((v) => (v === undefined || v === null ? undefined : Number(v)))
    .find((v) => typeof v === "number" && v > 0)
  const dimsAvailable = [pkg.width, pkg.height, pkg.packaging_length].some((v) => typeof v === "number")
  const dimsText = dimsAvailable
    ? `${pkg.width ?? "-"}×${pkg.height ?? "-"}×${pkg.packaging_length ?? "-"} ${lengthUnit}`
    : t("No dimensions")

  // Status theme similar to ReceiptCard
  const statusTheme = {
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    icon: <Package className="w-5 h-5 text-white" />,
    label: t("Package"),
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
  }

  return (
    <div
      className="group relative w-full rounded-[24px] p-[2px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
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
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>#{pkg.id}</span>
                {typeof pkg.sequence === "number" && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: colors.mutedBg, color: colors.textSecondary }}>
                    {t("Seq")} #{pkg.sequence}
                  </span>
                )}
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {title}
              </h3>
              {typeName && (
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {typeName}
                </p>
              )}
            </div>
          </div>

          {/* Weight and Dimensions Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div
              className="rounded-xl p-4 border"
              style={{
                background: `linear-gradient(135deg, ${colors.mutedBg}, ${colors.background})`,
                borderColor: colors.border,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Weight className="w-4 h-4" style={{ color: colors.textSecondary }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                  {t("Weight")}
                </span>
              </div>
              <div className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                {weightVal !== undefined ? weightVal : "-"} {weightUnit}
              </div>
              {typeof pkg.max_weight === "number" && pkg.max_weight > 0 && (
                <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  {t("Max")}: {pkg.max_weight} {weightUnit}
                </div>
              )}
            </div>
            <div
              className="rounded-xl p-4 border"
              style={{
                background: `linear-gradient(135deg, ${colors.mutedBg}, ${colors.background})`,
                borderColor: colors.border,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <RulerDimensionLine className="w-4 h-4" style={{ color: colors.textSecondary }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                  {t("Dimensions")}
                </span>
              </div>
              <div className="text-base font-bold" style={{ color: colors.textPrimary }}>
                {dimsText}
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div
            className="flex items-center justify-between pt-4 border-t"
            style={{ borderColor: colors.border }}
          >
            <div className="flex items-center gap-4">
              {pkg.barcode && (
                <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                  <Package className="w-4 h-4" />
                  <span className="text-xs font-mono font-medium">{pkg.barcode}</span>
                </div>
              )}
            </div>

            {(pkg.package_carrier_type || pkg.shipper_package_code) && (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: colors.mutedBg,
                  color: colors.textSecondary,
                }}
              >
                {pkg.package_carrier_type || ""} {pkg.shipper_package_code ? `• ${pkg.shipper_package_code}` : ""}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
