"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { Trash2, AlertTriangle, X, Loader2 } from "lucide-react"

interface BulkDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number // Records selected on current page
  totalCount: number // Total records matching filter (all pages)
  isSelectAll: boolean // Whether "select all" checkbox is checked
  onDeleteSelected: () => Promise<void> // Delete only selected on current page
  onDeleteAll: () => Promise<void> // Delete all records matching filter
  modelLabel?: string // e.g., "receipts", "deliveries"
}

export function BulkDeleteModal({
  isOpen,
  onClose,
  selectedCount,
  totalCount,
  isSelectAll,
  onDeleteSelected,
  onDeleteAll,
  modelLabel = "records"
}: BulkDeleteModalProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const [deleting, setDeleting] = useState<'selected' | 'all' | null>(null)

  if (!isOpen) return null

  const handleDeleteSelected = async () => {
    setDeleting('selected')
    try {
      await onDeleteSelected()
      onClose()
    } catch (error) {
      console.error('Delete selected failed:', error)
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteAll = async () => {
    setDeleting('all')
    try {
      await onDeleteAll()
      onClose()
    } catch (error) {
      console.error('Delete all failed:', error)
    } finally {
      setDeleting(null)
    }
  }

  const showDeleteAllOption = isSelectAll && totalCount > selectedCount

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.card,
          borderRadius: "16px",
          width: "min(100%, 480px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
                {t("Delete Records")}
              </h3>
              <p style={{ fontSize: "0.875rem", color: colors.textSecondary, margin: 0 }}>
                {t("Choose which records to delete")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting !== null}
            style={{
              background: "transparent",
              border: "none",
              cursor: deleting ? "not-allowed" : "pointer",
              padding: "0.5rem",
              borderRadius: "8px",
              color: colors.textSecondary,
              opacity: deleting ? 0.5 : 1,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem" }}>
          {/* Warning */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              padding: "1rem",
              background: "rgba(239, 68, 68, 0.1)",
              borderRadius: "10px",
              marginBottom: "1.5rem",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: 500, margin: "0 0 0.25rem 0" }}>
                {t("This action cannot be undone")}
              </p>
              <p style={{ fontSize: "0.8125rem", color: colors.textSecondary, margin: 0 }}>
                {t("Deleted records will be permanently removed from the system.")}
              </p>
            </div>
          </div>

          {/* Delete Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* Delete Selected (Primary Option) */}
            <button
              onClick={handleDeleteSelected}
              disabled={deleting !== null || selectedCount === 0}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                background: deleting === 'selected' ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.08)",
                border: `2px solid ${deleting === 'selected' ? "#ef4444" : "rgba(239, 68, 68, 0.3)"}`,
                borderRadius: "12px",
                cursor: deleting !== null || selectedCount === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: deleting !== null && deleting !== 'selected' ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!deleting && selectedCount > 0) {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"
                  e.currentTarget.style.borderColor = "#ef4444"
                }
              }}
              onMouseLeave={(e) => {
                if (!deleting) {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)"
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {deleting === 'selected' ? (
                  <Loader2 size={20} color="#ef4444" className="animate-spin" />
                ) : (
                  <Trash2 size={20} color="#ef4444" />
                )}
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#ef4444", margin: 0 }}>
                    {t("Delete selected on this page")}
                  </p>
                  <p style={{ fontSize: "0.8125rem", color: colors.textSecondary, margin: "0.125rem 0 0 0" }}>
                    {t("{{count}} {{label}} will be deleted", { count: selectedCount, label: modelLabel })}
                  </p>
                </div>
              </div>
              <div
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                }}
              >
                {selectedCount}
              </div>
            </button>

            {/* Delete All (Secondary Option - only shown when select all is checked) */}
            {showDeleteAllOption && (
              <button
                onClick={handleDeleteAll}
                disabled={deleting !== null}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  background: deleting === 'all' ? colors.mutedBg : colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "12px",
                  cursor: deleting !== null ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  opacity: deleting !== null && deleting !== 'all' ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!deleting) {
                    e.currentTarget.style.background = colors.mutedBg
                  }
                }}
                onMouseLeave={(e) => {
                  if (!deleting) {
                    e.currentTarget.style.background = colors.background
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {deleting === 'all' ? (
                    <Loader2 size={20} color={colors.textSecondary} className="animate-spin" />
                  ) : (
                    <Trash2 size={20} color={colors.textSecondary} />
                  )}
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: "0.9375rem", fontWeight: 500, color: colors.textPrimary, margin: 0 }}>
                      {t("Delete all matching records")}
                    </p>
                    <p style={{ fontSize: "0.8125rem", color: colors.textSecondary, margin: "0.125rem 0 0 0" }}>
                      {t("All {{count}} {{label}} across all pages", { count: totalCount, label: modelLabel })}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    background: colors.mutedBg,
                    color: colors.textSecondary,
                    padding: "0.25rem 0.75rem",
                    borderRadius: "999px",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {totalCount}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            disabled={deleting !== null}
            style={{
              padding: "0.625rem 1.25rem",
              background: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              color: colors.textPrimary,
              fontWeight: 500,
              cursor: deleting !== null ? "not-allowed" : "pointer",
              opacity: deleting !== null ? 0.5 : 1,
            }}
          >
            {t("Cancel")}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
