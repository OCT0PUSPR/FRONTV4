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
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  FileCode
} from "lucide-react"
import Toast from "../components/Toast"
import { useNavigate } from "react-router-dom"
import { useCasl } from "../../context/casl"

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
  created_at: string
}

// Nav tabs removed as per request

const statusConfig: Record<string, { color: string, bg: string, icon: any }> = {
  completed: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle2 },
  pending: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: Clock },
  generating: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: Loader2 },
  failed: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: XCircle },
  expired: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', icon: Clock }
}

export default function GeneratedReportsPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const navigate = useNavigate()
  const { canDeletePage } = useCasl()

  // State
  const [reports, setReports] = useState<GeneratedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedModel, setSelectedModel] = useState<string>("all")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [previewReport, setPreviewReport] = useState<GeneratedReport | null>(null)

  useEffect(() => {
    loadReports()
  }, [page, selectedStatus, selectedModel])

  const getHeaders = () => getTenantHeaders()

  const loadReports = async () => {
    setLoading(true)
    try {
      let url = `${API_CONFIG.BACKEND_BASE_URL}/reports/generated?limit=20&offset=${page * 20}`
      if (selectedStatus !== 'all') url += `&status=${selectedStatus}`
      if (selectedModel !== 'all') url += `&sourceModel=${selectedModel}`
      
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
      // Fetch PDF with proper auth headers
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/reports/generated/${report.id}/download`,
        { headers: getHeaders() }
      )

      if (!response.ok) throw new Error('Failed to load PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      // Open PDF in new tab
      window.open(url, '_blank')

      // Clean up after a delay
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

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
  }

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = 
        report.source_record_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.report_uuid?.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesSearch
    })
  }, [reports, searchQuery])

  const sourceModels = useMemo(() => {
    const models = new Set(reports.map(r => r.source_model))
    return Array.from(models)
  }, [reports])

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

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
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8 animate-enter">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{t("Generated Reports")}</h1>
            <p className="text-lg opacity-80" style={{ color: colors.textSecondary }}>
              {t("View and download generated PDF reports")}
            </p>
          </div>

          <button
            onClick={loadReports}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            style={{ 
              backgroundColor: colors.card, 
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t("Refresh")}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8 animate-enter p-1.5 rounded-2xl" 
          style={{ 
            animationDelay: '100ms',
            background: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${colors.border}`
          }}
        >
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: colors.textSecondary }} />
            <input
              type="text"
              placeholder={t("Search reports...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 bg-transparent"
              style={{ 
                color: colors.textPrimary
              }}
            />
          </div>

          <div className="h-8 w-[1px]" style={{ background: colors.border }} />

          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(0); }}
            className="px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none bg-transparent cursor-pointer hover:opacity-80"
            style={{ 
              color: colors.textPrimary
            }}
          >
            <option value="all">{t("All Status")}</option>
            <option value="completed">{t("Completed")}</option>
            <option value="pending">{t("Pending")}</option>
            <option value="generating">{t("Generating")}</option>
            <option value="failed">{t("Failed")}</option>
          </select>

          <div className="h-8 w-[1px]" style={{ background: colors.border }} />

          <select
            value={selectedModel}
            onChange={(e) => { setSelectedModel(e.target.value); setPage(0); }}
            className="px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none bg-transparent cursor-pointer hover:opacity-80"
            style={{ 
              color: colors.textPrimary
            }}
          >
            <option value="all">{t("All Models")}</option>
            {sourceModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        {/* Reports Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" 
              style={{ borderColor: colors.action, borderTopColor: 'transparent' }} />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-20" style={{ color: colors.textSecondary }}>
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">{t("No reports found")}</p>
            <p className="text-sm mt-2">{t("Generate reports from templates to see them here")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredReports.map((report, index) => {
              const status = statusConfig[report.status] || statusConfig.pending
              const StatusIcon = status.icon
              
              // Map status to gradients
              let gradient = "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"
              if (report.status === 'completed') gradient = "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              if (report.status === 'failed') gradient = "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)"
              if (report.status === 'generating') gradient = "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"

              return (
                <div 
                  key={report.id}
                  className="group relative w-full rounded-[24px] p-[2px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
                  style={{ 
                    animationDelay: `${index * 30}ms`,
                    backgroundColor: colors.card,
                  }}
                >
                   {/* Gradient Border Effect */}
                  <div
                    className="absolute inset-0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: gradient }}
                  />

                  <div 
                    className="relative h-full rounded-[22px] overflow-hidden group-hover:border-transparent transition-colors p-6 flex flex-col"
                    style={{ 
                      backgroundColor: colors.card,
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300"
                        style={{ background: gradient }}
                      >
                        <StatusIcon className={`w-6 h-6 text-white ${report.status === 'generating' ? 'animate-spin' : ''}`} />
                      </div>

                      <div 
                        className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                        style={{ backgroundColor: status.bg, color: status.color }}
                      >
                        {report.status}
                      </div>
                    </div>

                    <div className="flex-1 mb-4">
                      <h3 className="text-xl font-bold tracking-tight mb-1 transition-all truncate"
                        style={{ color: colors.textPrimary }}
                        title={report.source_record_name}
                      >
                        {report.source_record_name || `Record #${report.source_record_id}`}
                      </h3>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                          {report.template_name}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                         <span 
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-opacity-10"
                            style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}
                          >
                            {report.source_model}
                          </span>
                          <span 
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-opacity-10"
                            style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}
                          >
                            {formatFileSize(report.pdf_size)}
                          </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t mt-auto" style={{ borderColor: colors.border }}>
                      <span className="text-xs" style={{ color: colors.textSecondary }}>
                        {formatDate(report.created_at)}
                      </span>

                      <div className="flex items-center gap-1">
                        {report.status === 'completed' && (
                          <>
                            <button
                              onClick={() => handleView(report)}
                              className="p-2 rounded-full transition-colors hover:bg-opacity-10"
                              style={{ color: colors.textSecondary, backgroundColor: colors.mutedBg }}
                              title={t("View")}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(report)}
                              className="p-2 rounded-full transition-colors hover:bg-opacity-10"
                              style={{ color: colors.action, backgroundColor: `${colors.action}15` }}
                              title={t("Download")}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {canDeletePage('generated-reports') && (
                          <button
                            onClick={() => handleDelete(report.id)}
                            className="p-2 rounded-full transition-colors hover:bg-red-500/10 text-red-500"
                            title={t("Delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t" style={{ borderColor: colors.border }}>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              {t("Showing")} {page * 20 + 1} - {Math.min((page + 1) * 20, total)} {t("of")} {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: colors.mutedBg, color: colors.textPrimary }}
              >
                {t("Previous")}
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * 20 >= total}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
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
