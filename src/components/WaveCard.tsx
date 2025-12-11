"use client"

import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"
import {
  Calendar,
  User,
  MapPin,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  XCircle,
  Layers,
} from "lucide-react"

interface WaveCardProps {
  wave: {
    id: number
    batchTransfer: string
    description: string
    scheduledDate: string
    responsible: string
    operationType: string
    dockLocation: string
    vehicle: string
    vehicleCategory: string
    status: string
    transfers: any[]
  }
  onClick: () => void
  index: number
}

export function WaveCard({ wave, onClick, index }: WaveCardProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  // Status-specific gradients and styles
  const getStatusTheme = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/_/g, ' ')
    switch (normalizedStatus) {
      case "done":
        return {
          gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
          icon: <CheckCircle2 className="w-5 h-5 text-white" />,
          label: t("Completed"),
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          text: "text-emerald-600 dark:text-emerald-400",
        }
      case "in progress":
      case "ready":
        return {
          gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          icon: <Clock className="w-5 h-5 text-white" />,
          label: t("In Progress"),
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          text: "text-blue-600 dark:text-blue-400",
        }
      case "cancelled":
        return {
          gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          icon: <XCircle className="w-5 h-5 text-white" />,
          label: t("Cancelled"),
          bg: "bg-rose-500/10",
          border: "border-rose-500/20",
          text: "text-rose-600 dark:text-rose-400",
        }
      case "draft":
        return {
          gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
          icon: <FileText className="w-5 h-5 text-white" />,
          label: t("Draft"),
          bg: "bg-orange-500/10",
          border: "border-orange-500/20",
          text: "text-orange-600 dark:text-orange-400",
        }
      default:
        // Format status: replace underscores with spaces and capitalize each word
        const formattedStatus = status
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
        return {
          gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
          icon: <AlertCircle className="w-5 h-5 text-white" />,
          label: t(formattedStatus),
          bg: "bg-purple-500/10",
          border: "border-purple-500/20",
          text: "text-purple-600 dark:text-purple-400",
        }
    }
  }

  const statusTheme = getStatusTheme(wave.status)

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
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>{wave.batchTransfer}</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
                {wave.description || "—"}
              </h3>
            </div>
          </div>

          {/* Details Grid - 2 per row */}
          <div className="relative py-4 mb-6">
            <div className="grid grid-cols-2 gap-4" style={{ direction: isRTL ? "rtl" : "ltr" }}>
              {/* Responsible */}
              <div className="flex items-start relative" style={{ flexDirection: isRTL ? "row-reverse" : "row" }}>
                <div
                  className="flex justify-center pt-1 z-10"
                  style={{
                    flexShrink: 0,
                    marginRight: isRTL ? 0 : "0.75rem",
                    marginLeft: isRTL ? "0.75rem" : 0,
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
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                    {t("Responsible")}
                  </span>
                  <p className="text-sm font-medium truncate" style={{ color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }}>{wave.responsible}</p>
                </div>
              </div>

              {/* Scheduled Date */}
              <div className="flex items-start relative" style={{ flexDirection: isRTL ? "row-reverse" : "row" }}>
                <div
                  className="flex justify-center pt-1 z-10"
                  style={{
                    flexShrink: 0,
                    marginRight: isRTL ? 0 : "0.75rem",
                    marginLeft: isRTL ? "0.75rem" : 0,
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
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                    {t("Scheduled Date")}
                  </span>
                  <p className="text-sm font-medium truncate" style={{ color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }}>{wave.scheduledDate}</p>
                </div>
              </div>

              {/* Dock Location */}
              <div className="flex items-start relative" style={{ flexDirection: isRTL ? "row-reverse" : "row" }}>
                <div
                  className="flex justify-center pt-1 z-10"
                  style={{
                    flexShrink: 0,
                    marginRight: isRTL ? 0 : "0.75rem",
                    marginLeft: isRTL ? "0.75rem" : 0,
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
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                    {t("Dock Location")}
                  </span>
                  <p className="text-sm font-medium truncate" style={{ color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }}>{wave.dockLocation}</p>
                </div>
              </div>

              {/* Vehicle */}
              <div className="flex items-start relative" style={{ flexDirection: isRTL ? "row-reverse" : "row" }}>
                <div
                  className="flex justify-center pt-1 z-10"
                  style={{
                    flexShrink: 0,
                    marginRight: isRTL ? 0 : "0.75rem",
                    marginLeft: isRTL ? "0.75rem" : 0,
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
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                    {t("Vehicle")}
                  </span>
                  <p className="text-sm font-medium truncate" style={{ color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }}>{wave.vehicle} ({wave.vehicleCategory})</p>
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
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {wave.transfers.length} {wave.transfers.length === 1 ? t("Transfer") : t("Transfers")}
                </span>
              </div>
            </div>

            {wave.operationType && (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: colors.mutedBg,
                  color: colors.textSecondary,
                }}
              >
                {wave.operationType}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

