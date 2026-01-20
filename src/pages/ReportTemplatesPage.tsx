"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { API_CONFIG, getTenantHeaders } from "../config/api"
import {
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  CheckCircle2,
  XCircle,
  Filter,
  MoreVertical,
  FileCode,
  Receipt,
  Truck,
  ShoppingCart,
  Package,
  Factory,
  FileEdit,
  Warehouse,
  ClipboardList,
  ArrowRightLeft,
  BarChart3,
  FileSpreadsheet,
  ListChecks,
  PackageSearch
} from "lucide-react"
import Toast from "../components/Toast"
import { useNavigate } from "react-router-dom"
import { useCasl } from "../../context/casl"
import { ActionDropdown } from "../components/ActionDropdown"
import { CustomReportsService, CustomReportConfig } from "../services/customReports.service"
import ReportGenerateModal from "../components/reports/ReportGenerateModal"

// Types
interface ReportTemplate {
  id: number
  template_key: string
  template_name: string
  description?: string
  category_id?: number
  category_key?: string
  category_name?: string
  report_type: string
  source_model: string
  is_system_template: boolean
  is_default: boolean
  is_active: boolean
  version: number
  created_at: string
  updated_at: string
}

interface Category {
  id: number
  category_key: string
  category_name: string
  icon?: string
}

// Report type icons
const reportTypeIcons: Record<string, any> = {
  receipt: Receipt,
  delivery: Truck,
  quotation: ShoppingCart,
  purchase_order: Package,
  invoice: FileText,
  picking: Package,
  inventory: FileText,
  stock_transfer: Truck,
  production: Factory,
  custom: FileEdit
}

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

// Nav tabs removed as per request

export default function ReportTemplatesPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const navigate = useNavigate()
  const { canCreatePage, canEditPage, canDeletePage } = useCasl()

  // State
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  // Custom Reports State
  const [customReports, setCustomReports] = useState<CustomReportConfig[]>([])
  const [customReportsLoading, setCustomReportsLoading] = useState(true)
  const [selectedCustomReport, setSelectedCustomReport] = useState<CustomReportConfig | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  useEffect(() => {
    loadTemplates()
    loadCategories()
    loadCustomReports()
  }, [])

  const getHeaders = () => getTenantHeaders()

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/templates`, { headers: getHeaders() })
      const data = await response.json()
      if (data.success) setTemplates(data.templates || [])
    } catch {
      showToast("Failed to load templates", "error")
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/categories`, { headers: getHeaders() })
      const data = await response.json()
      if (data.success) setCategories(data.categories || [])
    } catch {
      console.error("Failed to load categories")
    }
  }

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

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/templates/${id}`, { 
        method: "DELETE", 
        headers: getHeaders() 
      })
      const data = await res.json()
      if (data.success) {
        showToast("Template deleted", "success")
        loadTemplates()
      } else {
        showToast(data.error || "Failed to delete", "error")
      }
    } catch { 
      showToast("Failed to delete", "error") 
    }
  }

  const handleCloneTemplate = async (id: number, name: string) => {
    const newKey = `${name.toLowerCase().replace(/\s+/g, '_')}_copy_${Date.now()}`
    const newName = `${name} (Copy)`
    
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/templates/${id}/clone`, {
        method: "POST",
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_key: newKey, template_name: newName })
      })
      const data = await res.json()
      if (data.success) {
        showToast("Template cloned", "success")
        loadTemplates()
      } else {
        showToast(data.error || "Failed to clone", "error")
      }
    } catch {
      showToast("Failed to clone", "error")
    }
  }

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
  }

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = 
        template.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.template_key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = selectedCategory === "all" || template.category_key === selectedCategory
      const matchesType = selectedType === "all" || template.report_type === selectedType
      
      return matchesSearch && matchesCategory && matchesType
    })
  }, [templates, searchQuery, selectedCategory, selectedType])

  const reportTypes = useMemo(() => {
    const types = new Set(templates.map(t => t.report_type))
    return Array.from(types)
  }, [templates])

  const getReportTypeIcon = (type: string) => {
    const Icon = reportTypeIcons[type] || FileText
    return Icon
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
              {t("Create and manage PDF report templates")}
            </p>
          </div>
          
          {/* Create Button */}
          {canCreatePage('report-templates') && (
            <button
              onClick={() => navigate('/report-template-editor')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              style={{ 
                backgroundColor: colors.action, 
                color: '#ffffff',
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              }}
            >
              <Plus className="w-5 h-5" />
              {t("Create Template")}
            </button>
          )}
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
              placeholder={t("Search templates...")}
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none bg-transparent cursor-pointer hover:opacity-80"
            style={{ 
              color: colors.textPrimary
            }}
          >
            <option value="all">{t("All Categories")}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.category_key}>{cat.category_name}</option>
            ))}
          </select>

          <div className="h-8 w-[1px]" style={{ background: colors.border }} />

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none bg-transparent cursor-pointer hover:opacity-80"
            style={{ 
              color: colors.textPrimary
            }}
          >
            <option value="all">{t("All Types")}</option>
            {reportTypes.map(type => (
              <option key={type} value={type}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>
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
              {customReports.map((report, index) => {
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
