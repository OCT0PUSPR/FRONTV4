"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import {
  FileText,
  Warehouse,
  Receipt,
  Truck,
  ClipboardList,
  ArrowRightLeft,
  BarChart3,
  FileSpreadsheet,
  ListChecks,
  PackageSearch
} from "lucide-react"
import Toast from "../components/Toast"
import { CustomReportsService, CustomReportConfig } from "../services/customReports.service"
import ReportGenerateModal from "../components/reports/ReportGenerateModal"

// Custom warehouse report icons
const customReportIcons: Record<string, any> = {
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

// Custom report icon colors (matching template card style)
const customReportColors: Record<string, string> = {
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

export default function ReportTemplatesPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()

  // State
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  // Custom Reports State
  const [customReports, setCustomReports] = useState<CustomReportConfig[]>([])
  const [customReportsLoading, setCustomReportsLoading] = useState(true)
  const [selectedCustomReport, setSelectedCustomReport] = useState<CustomReportConfig | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  useEffect(() => {
    loadCustomReports()
  }, [])

  const loadCustomReports = async () => {
    setCustomReportsLoading(true)
    try {
      const reports = await CustomReportsService.listReports()
      setCustomReports(reports)
    } catch {
      console.error("Failed to load custom reports")
    } finally {
      setCustomReportsLoading(false)
    }
  }

  const handleOpenReportModal = (report: CustomReportConfig) => {
    setSelectedCustomReport(report)
    setReportModalOpen(true)
  }

  const handleCloseReportModal = () => {
    setReportModalOpen(false)
    setSelectedCustomReport(null)
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
            <h1 className="text-3xl font-bold tracking-tight mb-2">{t("Report Templates")}</h1>
            <p className="text-lg opacity-80" style={{ color: colors.textSecondary }}>
              {t("Generate warehouse documents and PDF reports")}
            </p>
          </div>
        </div>

        {/* Warehouse Reports Section */}
        <div className="mb-10 animate-enter" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <Warehouse className="w-6 h-6" style={{ color: colors.action }} />
            <div>
              <h2 className="text-xl font-bold tracking-tight">{t("Warehouse Reports")}</h2>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {t("Generate warehouse documents and reports")}
              </p>
            </div>
          </div>

          {customReportsLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: colors.action, borderTopColor: 'transparent' }} />
            </div>
          ) : customReports.length === 0 ? (
            <div className="text-center py-10 rounded-2xl" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
              <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: colors.textSecondary }} />
              <p className="text-sm" style={{ color: colors.textSecondary }}>{t("No warehouse reports available")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {customReports.map((report) => {
                const ReportIcon = customReportIcons[report.report_key] || FileText
                const iconColor = customReportColors[report.report_key] || colors.action

                return (
                  <div
                    key={report.id}
                    onClick={() => handleOpenReportModal(report)}
                    className="group relative w-full rounded-[24px] p-[2px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 cursor-pointer"
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
                      {/* Header - Icon and Name */}
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${iconColor}15` }}
                        >
                          <ReportIcon className="w-5 h-5" style={{ color: iconColor }} />
                        </div>
                        <h4 className="text-sm font-bold tracking-tight truncate" style={{ color: colors.textPrimary }}>
                          {report.report_name}
                        </h4>
                      </div>

                      {/* Description */}
                      {report.description && (
                        <p className="text-xs line-clamp-2 mb-3 flex-1" style={{ color: colors.textSecondary }}>
                          {report.description}
                        </p>
                      )}

                      {/* Tags */}
                      <div className="flex items-center gap-2 mt-auto">
                        <span
                          className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                          style={{
                            backgroundColor: colors.mutedBg,
                            color: colors.textSecondary
                          }}
                        >
                          {report.report_category === 'single_record' ? 'Single Record' : 'List Report'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* Toast */}
      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}

      {/* Report Generate Modal */}
      <ReportGenerateModal
        open={reportModalOpen}
        onClose={handleCloseReportModal}
        report={selectedCustomReport}
      />
    </div>
  )
}
