"use client"

import React, { useState, useEffect } from "react"
import { LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
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
  PackageSearch,
  Plus,
  Star,
  Clock,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Download,
  Layout
} from "lucide-react"
import Toast from "../components/Toast"
import { CustomReportsService, CustomReportConfig } from "../services/customReports.service"
import ReportGenerateModal from "../components/reports/ReportGenerateModal"
import * as templateBuilderService from "../services/templateBuilder.service"
import { XmlTemplateListItem, DocumentType } from "../types/templateBuilder.types"

// Custom warehouse report icons
const customReportIcons: Record<string, LucideIcon> = {
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

// Document type icons
const documentTypeIcons: Record<DocumentType, LucideIcon> = {
  delivery_note: Truck,
  goods_receipt: Receipt,
  internal_transfer: ArrowRightLeft,
  pick_list: ClipboardList,
  stock_summary: BarChart3,
  stock_card: PackageSearch,
  physical_count_sheet: ListChecks,
  stock_adjustments: FileSpreadsheet,
  transfers_list: ArrowRightLeft,
  scrap_document: Trash2
}

// Document type colors
const documentTypeColors: Record<DocumentType, string> = {
  delivery_note: "#2563eb",
  goods_receipt: "#16a34a",
  internal_transfer: "#7c3aed",
  pick_list: "#ea580c",
  stock_summary: "#0d9488",
  stock_card: "#0891b2",
  physical_count_sheet: "#7c3aed",
  stock_adjustments: "#dc2626",
  transfers_list: "#2563eb",
  scrap_document: "#71717a"
}

export default function ReportTemplatesPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const navigate = useNavigate()

  // State
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  // Custom Reports State
  const [customReports, setCustomReports] = useState<CustomReportConfig[]>([])
  const [customReportsLoading, setCustomReportsLoading] = useState(true)
  const [selectedCustomReport, setSelectedCustomReport] = useState<CustomReportConfig | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  // XML Templates State
  const [xmlTemplates, setXmlTemplates] = useState<XmlTemplateListItem[]>([])
  const [favoriteTemplates, setFavoriteTemplates] = useState<XmlTemplateListItem[]>([])
  const [recentTemplates, setRecentTemplates] = useState<XmlTemplateListItem[]>([])
  const [xmlTemplatesLoading, setXmlTemplatesLoading] = useState(true)
  const [xmlSearchQuery, setXmlSearchQuery] = useState("")
  const [xmlViewMode, setXmlViewMode] = useState<"grid" | "list">("grid")
  const [activeMenu, setActiveMenu] = useState<number | null>(null)

  useEffect(() => {
    loadCustomReports()
    loadXmlTemplates()
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

  const loadXmlTemplates = async () => {
    setXmlTemplatesLoading(true)
    try {
      const [templates, favorites, recent] = await Promise.all([
        templateBuilderService.listTemplates(),
        templateBuilderService.getFavoriteTemplates(),
        templateBuilderService.getRecentTemplates(5)
      ])
      setXmlTemplates(templates)
      setFavoriteTemplates(favorites)
      setRecentTemplates(recent)
    } catch (err) {
      console.error("Failed to load XML templates:", err)
    } finally {
      setXmlTemplatesLoading(false)
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

  const handleCreateTemplate = () => {
    navigate("/template-builder/new")
  }

  const handleEditTemplate = (templateId: number) => {
    navigate(`/template-builder/${templateId}`)
    setActiveMenu(null)
  }

  const handleToggleFavorite = async (templateId: number) => {
    try {
      await templateBuilderService.toggleFavorite(templateId)
      loadXmlTemplates()
    } catch {
      setToast({ text: "Failed to update favorite", state: "error" })
    }
    setActiveMenu(null)
  }

  const handleDuplicateTemplate = async (templateId: number) => {
    try {
      await templateBuilderService.duplicateTemplate(templateId)
      loadXmlTemplates()
      setToast({ text: "Template duplicated successfully", state: "success" })
    } catch {
      setToast({ text: "Failed to duplicate template", state: "error" })
    }
    setActiveMenu(null)
  }

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return

    try {
      await templateBuilderService.deleteTemplate(templateId)
      loadXmlTemplates()
      setToast({ text: "Template deleted successfully", state: "success" })
    } catch {
      setToast({ text: "Failed to delete template", state: "error" })
    }
    setActiveMenu(null)
  }

  const handleExportTemplate = async (templateId: number) => {
    try {
      const blob = await templateBuilderService.exportTemplate(templateId)
      const template = xmlTemplates.find(t => t.id === templateId)
      templateBuilderService.downloadBlob(blob, `${template?.template_key || 'template'}.xml`)
    } catch {
      setToast({ text: "Failed to export template", state: "error" })
    }
    setActiveMenu(null)
  }

  // Filter templates based on search
  const filteredXmlTemplates = xmlTemplates.filter(t =>
    t.template_name.toLowerCase().includes(xmlSearchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(xmlSearchQuery.toLowerCase())
  )

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

        {/* Custom Templates Section */}
        <div className="mb-10 animate-enter" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Layout className="w-6 h-6" style={{ color: colors.action }} />
              <div>
                <h2 className="text-xl font-bold tracking-tight">{t("Custom Templates")}</h2>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  {t("Build custom report templates with the visual editor")}
                </p>
              </div>
            </div>

            <button
              onClick={handleCreateTemplate}
              className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all hover:shadow-lg"
              style={{ background: colors.action, color: "#fff" }}
            >
              <Plus className="w-4 h-4" />
              {t("New Template")}
            </button>
          </div>

          {/* Search and View Toggle */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textSecondary }} />
              <input
                type="text"
                value={xmlSearchQuery}
                onChange={(e) => setXmlSearchQuery(e.target.value)}
                placeholder={t("Search templates...")}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: colors.card,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
              />
            </div>

            <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
              <button
                onClick={() => setXmlViewMode("grid")}
                className="p-2.5 transition-colors"
                style={{
                  background: xmlViewMode === "grid" ? colors.action : colors.card,
                  color: xmlViewMode === "grid" ? "#fff" : colors.textSecondary
                }}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setXmlViewMode("list")}
                className="p-2.5 transition-colors"
                style={{
                  background: xmlViewMode === "list" ? colors.action : colors.card,
                  color: xmlViewMode === "list" ? "#fff" : colors.textSecondary
                }}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Favorites Section */}
          {favoriteTemplates.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4" style={{ color: "#eab308" }} />
                <span className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                  {t("Favorites")}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                {favoriteTemplates.map((template) => {
                  const Icon = documentTypeIcons[template.document_type] || FileText
                  const iconColor = documentTypeColors[template.document_type] || colors.action

                  return (
                    <div
                      key={template.id}
                      onClick={() => handleEditTemplate(template.id)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer shrink-0 transition-all hover:shadow-md"
                      style={{
                        background: colors.card,
                        border: `1px solid ${colors.border}`
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${iconColor}15` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: iconColor }} />
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap" style={{ color: colors.textPrimary }}>
                        {template.template_name}
                      </span>
                      <Star className="w-4 h-4" style={{ color: "#eab308" }} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent Section */}
          {recentTemplates.length > 0 && favoriteTemplates.length === 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4" style={{ color: colors.textSecondary }} />
                <span className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                  {t("Recently Used")}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                {recentTemplates.map((template) => {
                  const Icon = documentTypeIcons[template.document_type] || FileText
                  const iconColor = documentTypeColors[template.document_type] || colors.action

                  return (
                    <div
                      key={template.id}
                      onClick={() => handleEditTemplate(template.id)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer shrink-0 transition-all hover:shadow-md"
                      style={{
                        background: colors.card,
                        border: `1px solid ${colors.border}`
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${iconColor}15` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: iconColor }} />
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap" style={{ color: colors.textPrimary }}>
                        {template.template_name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Templates Grid/List */}
          {xmlTemplatesLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: colors.action, borderTopColor: 'transparent' }} />
            </div>
          ) : filteredXmlTemplates.length === 0 ? (
            <div className="text-center py-10 rounded-2xl" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
              <Layout className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: colors.textSecondary }} />
              <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                {xmlSearchQuery ? t("No templates match your search") : t("No custom templates yet")}
              </p>
              {!xmlSearchQuery && (
                <button
                  onClick={handleCreateTemplate}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: `${colors.action}15`, color: colors.action }}
                >
                  {t("Create your first template")}
                </button>
              )}
            </div>
          ) : xmlViewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredXmlTemplates.map((template) => {
                const Icon = documentTypeIcons[template.document_type] || FileText
                const iconColor = documentTypeColors[template.document_type] || colors.action

                return (
                  <div
                    key={template.id}
                    className="group relative w-full rounded-[24px] p-[2px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
                    style={{ backgroundColor: colors.card }}
                  >
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
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${iconColor}15` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: iconColor }} />
                          </div>
                          <h4 className="text-sm font-bold tracking-tight truncate" style={{ color: colors.textPrimary }}>
                            {template.template_name}
                          </h4>
                        </div>

                        {/* Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveMenu(activeMenu === template.id ? null : template.id)
                            }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            style={{ background: colors.mutedBg }}
                          >
                            <MoreVertical className="w-4 h-4" style={{ color: colors.textSecondary }} />
                          </button>

                          {activeMenu === template.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-40 rounded-xl shadow-xl overflow-hidden z-50"
                              style={{ background: colors.card, border: `1px solid ${colors.border}` }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleEditTemplate(template.id)}
                                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-black/5"
                                style={{ color: colors.textPrimary }}
                              >
                                <Pencil className="w-4 h-4" /> {t("Edit")}
                              </button>
                              <button
                                onClick={() => handleToggleFavorite(template.id)}
                                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-black/5"
                                style={{ color: colors.textPrimary }}
                              >
                                <Star className="w-4 h-4" /> {template.is_favorite ? t("Unfavorite") : t("Favorite")}
                              </button>
                              <button
                                onClick={() => handleDuplicateTemplate(template.id)}
                                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-black/5"
                                style={{ color: colors.textPrimary }}
                              >
                                <Copy className="w-4 h-4" /> {t("Duplicate")}
                              </button>
                              <button
                                onClick={() => handleExportTemplate(template.id)}
                                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-black/5"
                                style={{ color: colors.textPrimary }}
                              >
                                <Download className="w-4 h-4" /> {t("Export")}
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-red-500/10"
                                style={{ color: "#ef4444" }}
                              >
                                <Trash2 className="w-4 h-4" /> {t("Delete")}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {template.description && (
                        <p className="text-xs line-clamp-2 mb-3 flex-1" style={{ color: colors.textSecondary }}>
                          {template.description}
                        </p>
                      )}

                      {/* Tags */}
                      <div className="flex items-center gap-2 mt-auto">
                        <span
                          className="px-2.5 py-1 rounded-lg text-[10px] font-medium capitalize"
                          style={{
                            backgroundColor: colors.mutedBg,
                            color: colors.textSecondary
                          }}
                        >
                          {template.document_type.replace(/_/g, ' ')}
                        </span>
                        {template.is_favorite && (
                          <Star className="w-3.5 h-3.5" style={{ color: "#eab308" }} />
                        )}
                      </div>

                      {/* Click overlay */}
                      <div
                        className="absolute inset-0 cursor-pointer"
                        onClick={() => handleEditTemplate(template.id)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredXmlTemplates.map((template) => {
                const Icon = documentTypeIcons[template.document_type] || FileText
                const iconColor = documentTypeColors[template.document_type] || colors.action

                return (
                  <div
                    key={template.id}
                    onClick={() => handleEditTemplate(template.id)}
                    className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                    style={{
                      background: colors.card,
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${iconColor}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: iconColor }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold truncate" style={{ color: colors.textPrimary }}>
                          {template.template_name}
                        </h4>
                        {template.is_favorite && (
                          <Star className="w-4 h-4 shrink-0" style={{ color: "#eab308" }} />
                        )}
                      </div>
                      {template.description && (
                        <p className="text-xs truncate mt-0.5" style={{ color: colors.textSecondary }}>
                          {template.description}
                        </p>
                      )}
                    </div>

                    <span
                      className="px-2.5 py-1 rounded-lg text-[10px] font-medium capitalize shrink-0"
                      style={{
                        backgroundColor: colors.mutedBg,
                        color: colors.textSecondary
                      }}
                    >
                      {template.document_type.replace(/_/g, ' ')}
                    </span>

                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveMenu(activeMenu === template.id ? null : template.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ background: colors.mutedBg }}
                      >
                        <MoreVertical className="w-4 h-4" style={{ color: colors.textSecondary }} />
                      </button>

                      {activeMenu === template.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-40 rounded-xl shadow-xl overflow-hidden z-50"
                          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
                        >
                          <button
                            onClick={() => handleEditTemplate(template.id)}
                            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-black/5"
                            style={{ color: colors.textPrimary }}
                          >
                            <Pencil className="w-4 h-4" /> {t("Edit")}
                          </button>
                          <button
                            onClick={() => handleToggleFavorite(template.id)}
                            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-black/5"
                            style={{ color: colors.textPrimary }}
                          >
                            <Star className="w-4 h-4" /> {template.is_favorite ? t("Unfavorite") : t("Favorite")}
                          </button>
                          <button
                            onClick={() => handleDuplicateTemplate(template.id)}
                            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-black/5"
                            style={{ color: colors.textPrimary }}
                          >
                            <Copy className="w-4 h-4" /> {t("Duplicate")}
                          </button>
                          <button
                            onClick={() => handleExportTemplate(template.id)}
                            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-black/5"
                            style={{ color: colors.textPrimary }}
                          >
                            <Download className="w-4 h-4" /> {t("Export")}
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-red-500/10"
                            style={{ color: "#ef4444" }}
                          >
                            <Trash2 className="w-4 h-4" /> {t("Delete")}
                          </button>
                        </div>
                      )}
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

      {/* Click outside to close menu */}
      {activeMenu !== null && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  )
}
