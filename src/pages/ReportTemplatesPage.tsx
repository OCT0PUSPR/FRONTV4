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
  FileEdit
} from "lucide-react"
import Toast from "../components/Toast"
import { useNavigate } from "react-router-dom"
import { useCasl } from "../../context/casl"

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
  const [menuOpen, setMenuOpen] = useState<number | null>(null)

  useEffect(() => {
    loadTemplates()
    loadCategories()
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
    setMenuOpen(null)
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
    setMenuOpen(null)
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

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" 
              style={{ borderColor: colors.action, borderTopColor: 'transparent' }} />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20" style={{ color: colors.textSecondary }}>
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">{t("No templates found")}</p>
            <p className="text-sm mt-2">{t("Create your first template to get started")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template, index) => {
              const TypeIcon = getReportTypeIcon(template.report_type)
              
              // Determine gradient based on type or status
              const gradient = template.is_active 
                ? "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" // Active blue
                : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" // Inactive red/pink
              
              return (
                <div
                  key={template.id}
                  className="group relative w-full rounded-[24px] p-[2px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                    backgroundColor: colors.card
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
                        <TypeIcon className="w-6 h-6 text-white" />
                      </div>

                      {/* Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === template.id ? null : template.id)}
                          className="p-2 rounded-full transition-colors hover:bg-opacity-10"
                          style={{ color: colors.textSecondary, backgroundColor: colors.mutedBg }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {menuOpen === template.id && (
                          <div 
                            className="absolute right-0 top-10 w-48 rounded-xl shadow-xl z-50 overflow-hidden py-1"
                            style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/report-template-editor/${template.id}`); setMenuOpen(null); }}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-opacity-50"
                              style={{ color: colors.textPrimary }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.mutedBg}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Edit className="w-4 h-4" /> {t("Edit")}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCloneTemplate(template.id, template.template_name); }}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-opacity-50"
                              style={{ color: colors.textPrimary }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.mutedBg}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Copy className="w-4 h-4" /> {t("Clone")}
                            </button>
                            {!template.is_system_template && canDeletePage('report-templates') && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors text-red-500 hover:bg-opacity-50"
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.mutedBg}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Trash2 className="w-4 h-4" /> {t("Delete")}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 mb-4">
                      <h3 className="text-xl font-bold tracking-tight mb-1 transition-all"
                        style={{ color: colors.textPrimary }}
                      >
                        {template.template_name}
                      </h3>
                      <p className="text-sm font-mono mb-3" style={{ color: colors.textSecondary }}>
                        {template.template_key}
                      </p>
                      
                      {template.description && (
                        <p className="text-sm line-clamp-2" style={{ color: colors.textSecondary }}>
                          {template.description}
                        </p>
                      )}
                    </div>

                    {/* Meta Info Tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span 
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-opacity-10"
                        style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}
                      >
                        {template.source_model}
                      </span>
                      {template.category_name && (
                        <span 
                          className="px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}
                        >
                          {template.category_name}
                        </span>
                      )}
                      {template.is_system_template && (
                        <span 
                          className="px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: `${colors.pillInfoText}15`, color: colors.pillInfoText }}
                        >
                          System
                        </span>
                      )}
                      {template.is_default && (
                        <span 
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-green-500/15 text-green-500"
                        >
                          Default
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t mt-auto" style={{ borderColor: colors.border }}>
                      <div className="flex items-center gap-2">
                        {template.is_active ? (
                          <div className="flex items-center gap-1.5 text-green-500">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs font-bold">{t("Active")}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-red-500">
                            <XCircle className="w-4 h-4" />
                            <span className="text-xs font-bold">{t("Inactive")}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}>
                        v{template.version}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Click outside to close menu - rendered before content so it doesn't block clicks */}
      {menuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setMenuOpen(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
    </div>
  )
}
