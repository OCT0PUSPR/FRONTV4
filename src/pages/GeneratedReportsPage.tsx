"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { API_CONFIG, getTenantHeaders } from "../config/api"
import {
  FileText,
  Search,
  Download,
  Eye,
  Trash2,
  Truck,
  Receipt,
  ArrowRightLeft,
  ClipboardList,
  PackageSearch,
  ListChecks,
  BarChart3,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  RefreshCw,
  ChevronDown,
  User
} from "lucide-react"
import Toast from "../components/Toast"
import { useCasl } from "../../context/casl"
import { SimpleDateRangePicker } from "../components/SimpleDateRangePicker"

// Types
interface GeneratedReport {
  id: number
  report_uuid: string
  report_number?: string
  template_id: number
  template_key: string
  template_name: string
  report_type: string
  source_model: string
  source_record_id: number
  source_record_name?: string
  pdf_size?: number
  generation_trigger: string
  generation_time_ms?: number
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'expired'
  generated_by?: number
  generated_by_name?: string
  created_at: string
}

// Report types for filter dropdown
const reportTypes = [
  { key: 'delivery_note', name: 'Delivery Note' },
  { key: 'goods_receipt_note', name: 'Goods Receipt Note' },
  { key: 'stock_internal_transfer', name: 'Stock Internal Transfer' },
  { key: 'pick_list', name: 'Pick List' },
  { key: 'stock_card', name: 'Stock Card' },
  { key: 'physical_count_sheet', name: 'Physical Count Sheet' },
  { key: 'stock_summary', name: 'Stock Summary' },
  { key: 'stock_adjustments', name: 'Stock Adjustments' },
  { key: 'transfers_list', name: 'Transfers List' },
]

// Report icons mapping (matching ReportTemplatesPage)
const reportIcons: Record<string, any> = {
  delivery_note: Truck,
  goods_receipt_note: Receipt,
  stock_internal_transfer: ArrowRightLeft,
  pick_list: ClipboardList,
  stock_card: PackageSearch,
  physical_count_sheet: ListChecks,
  stock_summary: BarChart3,
  stock_adjustments: FileSpreadsheet,
  transfers_list: ArrowRightLeft
}

// Report colors mapping (matching ReportTemplatesPage)
const reportColors: Record<string, string> = {
  delivery_note: "#2563eb",
  goods_receipt_note: "#16a34a",
  stock_internal_transfer: "#7c3aed",
  pick_list: "#ea580c",
  stock_card: "#0891b2",
  physical_count_sheet: "#7c3aed",
  stock_summary: "#0d9488",
  stock_adjustments: "#dc2626",
  transfers_list: "#2563eb"
}

// Status configuration
const statusConfig: Record<string, { color: string, bg: string, icon: any, label: string }> = {
  completed: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle2, label: 'Completed' },
  pending: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: Clock, label: 'Pending' },
  generating: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: Loader2, label: 'Generating' },
  failed: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: XCircle, label: 'Failed' },
  expired: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', icon: Clock, label: 'Expired' }
}

export default function GeneratedReportsPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const { canDeletePage } = useCasl()

  // State
  const [reports, setReports] = useState<GeneratedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedReportType, setSelectedReportType] = useState<string>("all")
  const [dateRange, setDateRange] = useState<[string | null, string | null] | null>(null)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)

  useEffect(() => {
    loadReports()
  }, [page, selectedStatus, selectedReportType, dateRange])

  const getHeaders = () => getTenantHeaders()

  const loadReports = async () => {
    setLoading(true)
    try {
      let url = `${API_CONFIG.BACKEND_BASE_URL}/reports/generated?limit=50&offset=${page * 50}`
      if (selectedStatus !== 'all') url += `&status=${selectedStatus}`
      if (selectedReportType !== 'all') url += `&templateKey=${selectedReportType}`
      if (dateRange?.[0]) url += `&dateFrom=${dateRange[0]}`
      if (dateRange?.[1]) url += `&dateTo=${dateRange[1]}`

      const response = await fetch(url, { headers: getHeaders() })
      const data = await response.json()
      if (data.success) {
        setReports(data.reports || [])
        setTotal(data.total || 0)
      }
    } catch {
      showToast("Failed to load reports", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (report: GeneratedReport) => {
    try {
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/reports/generated/${report.id}/download`,
        { headers: getHeaders() }
      )

      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.source_record_name || 'report'}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast("Download started", "success")
    } catch {
      showToast("Failed to download", "error")
    }
  }

  const handleView = async (report: GeneratedReport) => {
    try {
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/reports/generated/${report.id}/download`,
        { headers: getHeaders() }
      )

      if (!response.ok) throw new Error('Failed to load PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(url), 60000)
    } catch {
      showToast("Failed to view report", "error")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this report?")) return
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/generated/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      })
      const data = await res.json()
      if (data.success) {
        showToast("Report deleted", "success")
        loadReports()
      } else {
        showToast(data.error || "Failed to delete", "error")
      }
    } catch {
      showToast("Failed to delete", "error")
    }
  }

  const clearFilters = () => {
    setSelectedStatus("all")
    setSelectedReportType("all")
    setDateRange(null)
    setSearchQuery("")
    setPage(0)
  }

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
  }

  // Filter reports based on search query (client-side additional filter)
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports

    const query = searchQuery.toLowerCase()
    return reports.filter(report =>
      report.source_record_name?.toLowerCase().includes(query) ||
      report.template_name?.toLowerCase().includes(query) ||
      report.template_key?.toLowerCase().includes(query) ||
      report.generated_by_name?.toLowerCase().includes(query) ||
      report.report_uuid?.toLowerCase().includes(query)
    )
  }, [reports, searchQuery])

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get icon and color for a report
  const getReportIcon = (templateKey: string) => {
    return reportIcons[templateKey] || FileText
  }

  const getReportColor = (templateKey: string) => {
    return reportColors[templateKey] || colors.action
  }

  const hasActiveFilters = selectedStatus !== 'all' || selectedReportType !== 'all' || (dateRange && (dateRange[0] || dateRange[1])) || searchQuery

  return (
    <div className="min-h-screen font-space selection:bg-blue-500/20" style={{ backgroundColor: colors.background, color: colors.textPrimary }}>
      <style>{`
        .font-space { font-family: 'Space Grotesk', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${mode === 'dark' ? '#3f3f46' : '#d1d5db'};
          border-radius: 3px;
        }
        @keyframes enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-enter { animation: enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      <div className="relative z-10 p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-6 animate-enter">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{t("Generated Reports")}</h1>
            <p className="text-lg opacity-80" style={{ color: colors.textSecondary }}>
              {t("View and download generated PDF reports")}
            </p>
          </div>

          <button
            onClick={loadReports}
            className="p-2.5 rounded-xl transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.textSecondary,
            }}
            title={t("Refresh")}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6 animate-enter" style={{ animationDelay: '100ms' }}>
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textSecondary }} />
            <input
              type="text"
              placeholder={t("Search...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
                '--tw-ring-color': colors.action
              } as any}
            />
          </div>

          {/* Report Type Filter */}
          <div className="relative">
            <select
              value={selectedReportType}
              onChange={(e) => { setSelectedReportType(e.target.value); setPage(0); }}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none cursor-pointer"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary
              }}
            >
              <option value="all">{t("All Types")}</option>
              {reportTypes.map(type => (
                <option key={type.key} value={type.key}>{type.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: colors.textSecondary }} />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(0); }}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none cursor-pointer"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary
              }}
            >
              <option value="all">{t("All Status")}</option>
              <option value="completed">{t("Completed")}</option>
              <option value="pending">{t("Pending")}</option>
              <option value="failed">{t("Failed")}</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: colors.textSecondary }} />
          </div>

          {/* Date Range */}
          <div style={{ width: "200px" }}>
            <SimpleDateRangePicker
              value={dateRange}
              onChange={(range) => { setDateRange(range); setPage(0); }}
              placeholder={[t("Start"), t("End")]}
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: colors.action }}
            >
              {t("Clear")}
            </button>
          )}

          {/* Results count */}
          <span className="text-sm ml-auto" style={{ color: colors.textSecondary }}>
            {filteredReports.length} {t("reports")}
          </span>
        </div>

        {/* Reports Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: colors.action, borderTopColor: 'transparent' }} />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-10 rounded-2xl" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: colors.textSecondary }} />
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              {hasActiveFilters ? t("No reports match your filters") : t("No reports generated yet")}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm font-medium"
                style={{ color: colors.action }}
              >
                {t("Clear filters")}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredReports.map((report) => {
              const ReportIcon = getReportIcon(report.template_key)
              const iconColor = getReportColor(report.template_key)
              const status = statusConfig[report.status] || statusConfig.pending
              const StatusIcon = status.icon

              return (
                <div
                  key={report.id}
                  className="group relative w-full rounded-[24px] p-[2px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
                  style={{ backgroundColor: colors.card }}
                >
                  {/* Gradient Border Effect on Hover */}
                  <div
                    className="absolute inset-0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: `linear-gradient(135deg, ${iconColor} 0%, ${iconColor}99 100%)` }}
                  />

                  <div
                    className="relative h-full rounded-[22px] overflow-hidden group-hover:border-transparent transition-colors p-5 flex flex-col"
                    style={{
                      backgroundColor: colors.card,
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    {/* Header - Icon, Name, and Status */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${iconColor}15` }}
                        >
                          <ReportIcon className="w-5 h-5" style={{ color: iconColor }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold tracking-tight truncate" style={{ color: colors.textPrimary }} title={report.template_name}>
                            {report.template_name}
                          </h4>
                          <p className="text-xs truncate" style={{ color: colors.textSecondary }} title={report.source_record_name}>
                            {report.source_record_name || `#${report.source_record_id}`}
                          </p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: status.bg }}
                      >
                        <StatusIcon className={`w-3 h-3 ${report.status === 'generating' ? 'animate-spin' : ''}`} style={{ color: status.color }} />
                      </div>
                    </div>

                    {/* Info Tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span
                        className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                        style={{
                          backgroundColor: colors.mutedBg,
                          color: colors.textSecondary
                        }}
                      >
                        {formatFileSize(report.pdf_size)}
                      </span>
                      <span
                        className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                        style={{
                          backgroundColor: colors.mutedBg,
                          color: colors.textSecondary
                        }}
                      >
                        {formatDate(report.created_at)}
                      </span>
                    </div>

                    {/* Requested By */}
                    {report.generated_by_name && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <User className="w-3 h-3" style={{ color: colors.textSecondary }} />
                        <span className="text-xs" style={{ color: colors.textSecondary }}>
                          {report.generated_by_name}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto pt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                      {report.status === 'completed' && (
                        <>
                          <button
                            onClick={() => handleView(report)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {t("View")}
                          </button>
                          <button
                            onClick={() => handleDownload(report)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{ backgroundColor: `${iconColor}15`, color: iconColor }}
                          >
                            <Download className="w-3.5 h-3.5" />
                            {t("Download")}
                          </button>
                        </>
                      )}
                      {report.status === 'failed' && (
                        <span className="text-xs" style={{ color: status.color }}>
                          {t("Generation failed")}
                        </span>
                      )}
                      {report.status === 'generating' && (
                        <span className="text-xs" style={{ color: status.color }}>
                          {t("Generating...")}
                        </span>
                      )}
                      {canDeletePage('generated-reports') && (
                        <button
                          onClick={() => handleDelete(report.id)}
                          className="ml-auto p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                          title={t("Delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              {t("Showing")} {page * 50 + 1} - {Math.min((page + 1) * 50, total)} {t("of")} {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: colors.mutedBg, color: colors.textPrimary }}
              >
                {t("Previous")}
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * 50 >= total}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: colors.mutedBg, color: colors.textPrimary }}
              >
                {t("Next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
    </div>
  )
}
