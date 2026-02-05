"use client"

import { Box, DollarSign, MapPin, Calendar, AlertTriangle, Wrench, CheckCircle2, XCircle, Clock, Package } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"

interface LotCardProps {
  lot: {
    id: string
    lotNumber: string
    internalReference: string
    product: string
    productCategory: string
    onHandQuantity: number
    totalValue: number
    location: string
    createdOn: string
    expiryDate?: string
    status: "Active" | "Expired" | "Reserved" | "Depleted"
  }
  onClick?: () => void
  index: number
  onRepairs?: () => void
  onLocations?: () => void
}

export function LotCard({ lot, onClick, index, onRepairs, onLocations }: LotCardProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  // Status-specific gradients and styles
  const getStatusTheme = (status: string) => {
    switch (status) {
      case "Active":
        return {
          gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
          icon: CheckCircle2,
          iconColor: "#43e97b",
          label: t("Active"),
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          text: "text-emerald-600 dark:text-emerald-400",
        }
      case "Reserved":
        return {
          gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          icon: Clock,
          iconColor: "#4facfe",
          label: t("Reserved"),
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          text: "text-blue-600 dark:text-blue-400",
        }
      case "Expired":
        return {
          gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          icon: XCircle,
          iconColor: "#f59e0b",
          label: t("Expired"),
          bg: "bg-rose-500/10",
          border: "border-rose-500/20",
          text: "text-rose-600 dark:text-rose-400",
        }
      case "Depleted":
        return {
          gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
          icon: Package,
          iconColor: "#dc2626",
          label: t("Depleted"),
          bg: "bg-orange-500/10",
          border: "border-orange-500/20",
          text: "text-orange-600 dark:text-orange-400",
        }
      default:
        return {
          gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          icon: Package,
          iconColor: "#4facfe",
          label: t("Active"),
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          text: "text-blue-600 dark:text-blue-400",
        }
    }
  }

  const statusTheme = getStatusTheme(lot.status)

  return (
    <div
      className={`group relative w-full rounded-[24px] p-[2px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}
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
            {statusTheme.label}
          </div>
        </div>

        <div className="p-6">
          {/* Header Section */}
          <div className="flex items-start gap-4 mb-6">
            <statusTheme.icon
              className="w-10 h-10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
              style={{ color: statusTheme.iconColor }}
              strokeWidth={1.5}
            />

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>{lot.lotNumber}</span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight group-hover:text-transparent group-hover:bg-clip-text transition-all"
                style={{ color: colors.textPrimary, backgroundImage: "none" }}
              >
                {lot.product}
              </h3>
            </div>
          </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
            
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "1.05rem",
                  fontWeight: "600",
                  color: colors.textPrimary,
                  marginBottom: "0.25rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {lot.lotNumber}
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: colors.textSecondary,
                  marginBottom: "0.25rem",
                }}
              >
                {lot.product}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: colors.textSecondary,
                  background: colors.mutedBg,
                  padding: "0.25rem 0.625rem",
                  borderRadius: "0.375rem",
                  display: "inline-block",
                  fontWeight: "500",
                }}
              >
                {lot.status}
              </div>
            </div>
          </div>
        </div>

          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
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
                {lot.onHandQuantity.toLocaleString()}
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
                <span style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: "500" }}>{t("Value")}</span>
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: colors.textPrimary,
                  letterSpacing: "-0.02em",
                }}
              >
                ${((lot.totalValue || 0) / 1000).toFixed(0)}K
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div
            className="flex items-center justify-between pt-4 border-t mb-4"
            style={{ borderColor: colors.border }}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium">{lot.location}</span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">{lot.createdOn}</span>
              </div>
            </div>

            {lot.expiryDate && (
              <div className="flex items-center gap-1.5" style={{ color: colors.cancel }}>
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">{lot.expiryDate}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={(e)=>{ e.stopPropagation(); onRepairs && onRepairs() }}
              style={{
                display:'inline-flex', alignItems:'center', gap:8,
                padding:'8px 12px', border:`1px solid ${colors.border}`, borderRadius:8,
                background: colors.mutedBg, color: colors.textPrimary, cursor:'pointer', fontWeight:600, fontSize:13
              }}
            >
              <Wrench size={16} />
              {t('Repairs')}
            </button>
            <button
              onClick={(e)=>{ e.stopPropagation(); onLocations && onLocations() }}
              style={{
                display:'inline-flex', alignItems:'center', gap:8,
                padding:'8px 12px', border:`1px solid ${colors.border}`, borderRadius:8,
                background: colors.mutedBg, color: colors.textPrimary, cursor:'pointer', fontWeight:600, fontSize:13
              }}
            >
              <MapPin size={16} />
              {t('Locations')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
