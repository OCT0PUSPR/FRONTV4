"use client"

import { Calendar, User, Factory, CheckCircle2, Clock, FileText, AlertCircle, XCircle, Package } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useTranslation } from "react-i18next"

interface ManufacturingOperation {
  name: string
  workCenter: string
  duration: number
  status: string
}

interface ManufacturingOrderCardProps {
  order: {
    id: number
    name: string
    reference: string
    product: string
    quantity: number
    uom: string
    scheduledDate: string
    responsible: string
    status: string
    operations: ManufacturingOperation[]
  }
  onClick?: () => void
  index: number
}

export function ManufacturingOrderCard({ order, onClick, index }: ManufacturingOrderCardProps) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"

  // Status-specific gradients and styles
  const getStatusTheme = (status: string) => {
    switch (status.toLowerCase()) {
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
        return {
          gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          icon: <Clock className="w-5 h-5 text-white" />,
          label: t("In Progress"),
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          text: "text-blue-600 dark:text-blue-400",
        }
      case "planned":
        return {
          gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          icon: <Clock className="w-5 h-5 text-white" />,
          label: t("Planned"),
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          text: "text-blue-600 dark:text-blue-400",
        }
      case "ready":
        return {
          gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          icon: <Clock className="w-5 h-5 text-white" />,
          label: t("Ready"),
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          text: "text-blue-600 dark:text-blue-400",
        }
      case "draft":
        return {
          gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
          icon: <FileText className="w-5 h-5 text-white" />,
          label: t("Draft"),
          bg: "bg-orange-500/10",
          border: "border-orange-500/20",
          text: "text-orange-600 dark:text-orange-400",
        }
      default:
        return {
          gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
          icon: <AlertCircle className="w-5 h-5 text-white" />,
          label: t(status.charAt(0).toUpperCase() + status.slice(1)),
          bg: "bg-purple-500/10",
          border: "border-purple-500/20",
          text: "text-purple-600 dark:text-purple-400",
        }
    }
  }

  const statusTheme = getStatusTheme(order.status)

  return (
    <div
      className={`group relative w-full rounded-[24px] p-[2px] transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1' : 'cursor-default'}`}
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
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300"
              style={{ background: statusTheme.gradient }}
            >
              {statusTheme.icon}
            </div>

            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>{order.name}</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
                {order.product}
              </h3>
            </div>
          </div>

          {/* Product/Quantity Visualization */}
          <div className="relative py-4 mb-6">
            <div className="flex flex-col gap-4">
              {/* Product */}
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
                    {t("Product")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{order.product}</p>
                </div>
              </div>

              {/* Quantity */}
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
                    {t("Quantity")}
                  </span>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                    {order.quantity} {order.uom}
                  </p>
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
                <span className="text-xs font-medium">{order.scheduledDate || "—"}</span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {order.operations.length} {order.operations.length === 1 ? t("Operation") : t("Operations")}
                </span>
              </div>
            </div>

            {order.responsible && (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{
                  background: colors.mutedBg,
                  color: colors.textSecondary,
                }}
              >
                {order.responsible}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
