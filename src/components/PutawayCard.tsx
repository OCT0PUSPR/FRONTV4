"use client"

import { MapPin, Package, Layers, Building2 } from "lucide-react"

interface PutawayCardProps {
  rule: any
  onClick: () => void
  index: number
  colors: any
  t: (key: string) => string
}

export function PutawayCard({ rule, onClick, index, colors, t }: PutawayCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: colors.card,
        borderRadius: "1rem",
        padding: "1.25rem",
        boxShadow: "0 2px 8px rgba(10, 25, 49, 0.08)",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.3s ease",
        animation: `fadeInUp 0.5s ease ${index * 0.05}s both`,
        border: `1px solid ${colors.border}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)"
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(10, 25, 49, 0.15)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)"
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(10, 25, 49, 0.08)"
      }}
    >
      {/* Header with gradient accent */}
      <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            width: "4px",
            height: "32px",
            background: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
            borderRadius: "2px",
          }}
        />
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color: colors.textPrimary,
            margin: 0,
            flex: 1,
          }}
        >
          {rule.title}
        </h3>
      </div>

      {/* Flow: From -> To with gradient background */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.mutedBg} 0%, ${colors.background} 100%)`,
          borderRadius: 12,
          padding: "1rem",
          marginBottom: "1rem",
          border: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
            <MapPin size={24} color="#4facfe" strokeWidth={1.5} />
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.textSecondary,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {t("From")}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{rule.from || "—"}</div>
            </div>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.action}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
            <MapPin size={24} color="#f59e0b" strokeWidth={1.5} />
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.textSecondary,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {t("To")}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{rule.to || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Product with avatar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "0.75rem",
          alignItems: "center",
          marginBottom: "1rem",
          padding: "0.75rem",
          background: colors.background,
          borderRadius: 8,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            overflow: "hidden",
            background: colors.mutedBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `2px solid ${colors.border}`,
          }}
        >
          {rule.productImg ? (
            <img
              src={rule.productImg || "/placeholder.svg"}
              alt={rule.productName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: 14, color: colors.textSecondary, fontWeight: 700 }}>
              {String(rule.productName || "?")
                .slice(0, 2)
                .toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, color: colors.textSecondary, fontWeight: 600, marginBottom: 2 }}>
            {t("Product")}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>{rule.productName || t("Any")}</div>
        </div>
      </div>

      {/* Details Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {/* Package type */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 flex justify-center pt-1">
            <div
              className="w-2.5 h-2.5 rounded-full ring-4"
              style={{
                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                boxShadow: `0 0 0 4px ${colors.border}`,
              }}
            ></div>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
              {t("Package type")}
            </span>
            <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
              {rule.pkgNames.length
                ? rule.pkgNames.slice(0, 2).join(", ") + (rule.pkgNames.length > 2 ? ` +${rule.pkgNames.length - 2}` : "")
                : t("None")}
            </p>
          </div>
        </div>

        {/* Sublocation */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 flex justify-center pt-1">
            <div
              className="w-2.5 h-2.5 rounded-full ring-4"
              style={{
                background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                boxShadow: `0 0 0 4px ${colors.border}`,
              }}
            ></div>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
              {t("Sublocation")}
            </span>
            <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{rule.subloc || t("No")}</p>
          </div>
        </div>

        {/* Category */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 flex justify-center pt-1">
            <div
              className="w-2.5 h-2.5 rounded-full ring-4"
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                boxShadow: `0 0 0 4px ${colors.border}`,
              }}
            ></div>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
              {t("Category")}
            </span>
            <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{rule.storageCat || "—"}</p>
          </div>
        </div>

        {/* Company */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 flex justify-center pt-1">
            <div
              className="w-2.5 h-2.5 rounded-full ring-4"
              style={{
                background: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
                boxShadow: `0 0 0 4px ${colors.border}`,
              }}
            ></div>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider mb-0.5 block" style={{ color: colors.textSecondary }}>
              {t("Company")}
            </span>
            <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{rule.company || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
