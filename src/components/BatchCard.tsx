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

interface BatchCardProps {
  batch: {
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

export function BatchCard({ batch, onClick, index }: BatchCardProps) {
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
          icon: CheckCircle2,
          iconColor: "#43e97b",
          label: t("Completed"),
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          text: "text-emerald-600 dark:text-emerald-400",
        }
      case "in progress":
      case "ready":
        return {
          gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          icon: Clock,
          iconColor: "#4facfe",
          label: t("In Progress"),
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          text: "text-blue-600 dark:text-blue-400",
        }
      case "cancelled":
        return {
          gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          icon: XCircle,
          iconColor: "#f59e0b",
          label: t("Cancelled"),
          bg: "bg-rose-500/10",
          border: "border-rose-500/20",
          text: "text-rose-600 dark:text-rose-400",
        }
      case "draft":
        return {
          gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
          icon: FileText,
          iconColor: "#dc2626",
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
          icon: AlertCircle,
          iconColor: "#a18cd1",
          label: t(formattedStatus),
          bg: "bg-purple-500/10",
          border: "border-purple-500/20",
          text: "text-purple-600 dark:text-purple-400",
        }
    }
  }

  const statusTheme = getStatusTheme(batch.status)

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
            <statusTheme.icon
              className="w-10 h-10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
              style={{ color: statusTheme.iconColor }}
              strokeWidth={1.5}
            />

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>{batch.batchTransfer}</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
                {batch.description || "—"}
              </h3>
            </div>
          </div>

          {/* Details Visualization */}
          <div className="relative py-4 mb-6">
            <div className="flex flex-col gap-4">
              {/* Responsible */}
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
                    {t("Responsible")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{batch.responsible}</p>
                </div>
              </div>

              {/* Operation Type */}
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
                    {t("Operation Type")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{batch.operationType}</p>
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
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {batch.scheduledDate === "2025-10-18" ? t("Today") : batch.scheduledDate ? new Date(batch.scheduledDate).toLocaleDateString() : "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {batch.transfers.length} {batch.transfers.length === 1 ? t("Transfer") : t("Transfers")}
                </span>
              </div>
            </div>

            {batch.dockLocation && (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: colors.mutedBg,
                  color: colors.textSecondary,
                }}
              >
                {batch.dockLocation}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

