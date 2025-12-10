"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../context/theme"
import { API_CONFIG, getTenantHeaders } from "../config/api"
import {
  Zap,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  Settings,
  FileText,
  Clock
} from "lucide-react"
import Toast from "../components/Toast"
import { useNavigate } from "react-router-dom"
import { useCasl } from "../../context/casl"

// Types
interface AutoRule {
  id: number
  rule_name: string
  description?: string
  template_id: number
  template_key?: string
  template_name?: string
  report_type?: string
  trigger_model: string
  trigger_action: 'create' | 'update' | 'state_change'
  trigger_conditions?: any
  trigger_state_field?: string
  trigger_state_values?: string[]
  replace_existing: boolean
  notify_user: boolean
  is_active: boolean
  execution_count: number
  last_executed_at?: string
  created_at: string
}

interface Template {
  id: number
  template_key: string
  template_name: string
  report_type: string
  source_model: string
}

// Nav tabs removed as per request

const TRIGGER_ACTIONS = [
  { value: 'create', label: 'On Create' },
  { value: 'update', label: 'On Update' },
  { value: 'state_change', label: 'On State Change' }
]

const SOURCE_MODELS = [
  { value: 'stock.picking', label: 'Stock Picking' },
  { value: 'sale.order', label: 'Sale Order' },
  { value: 'purchase.order', label: 'Purchase Order' },
  { value: 'account.move', label: 'Invoice/Bill' },
  { value: 'mrp.production', label: 'Manufacturing Order' }
]

export default function ReportRulesPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const navigate = useNavigate()
  const { canCreatePage, canEditPage, canDeletePage } = useCasl()

  // State
  const [rules, setRules] = useState<AutoRule[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<AutoRule | null>(null)
  const [formData, setFormData] = useState({
    rule_name: '',
    description: '',
    template_id: '',
    trigger_model: 'stock.picking',
    trigger_action: 'state_change' as 'create' | 'update' | 'state_change',
    trigger_state_field: 'state',
    trigger_state_values: ['done'],
    replace_existing: false,
    notify_user: false,
    is_active: true
  })

  useEffect(() => {
    loadRules()
    loadTemplates()
  }, [])

  const getHeaders = () => getTenantHeaders()

  const loadRules = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/auto-rules`, { headers: getHeaders() })
      const data = await response.json()
      if (data.success) setRules(data.rules || [])
    } catch {
      showToast("Failed to load rules", "error")
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/templates`, { headers: getHeaders() })
      const data = await response.json()
      if (data.success) setTemplates(data.templates || [])
    } catch {
      console.error("Failed to load templates")
    }
  }

  const handleSaveRule = async () => {
    if (!formData.rule_name || !formData.template_id) {
      showToast("Rule name and template are required", "error")
      return
    }

    try {
      const url = editingRule 
        ? `${API_CONFIG.BACKEND_BASE_URL}/reports/auto-rules/${editingRule.id}`
        : `${API_CONFIG.BACKEND_BASE_URL}/reports/auto-rules`
      
      const response = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          template_id: parseInt(formData.template_id)
        })
      })

      const data = await response.json()
      if (data.success) {
        showToast(editingRule ? "Rule updated" : "Rule created", "success")
        setShowModal(false)
        resetForm()
        loadRules()
      } else {
        showToast(data.error || "Failed to save", "error")
      }
    } catch {
      showToast("Failed to save rule", "error")
    }
  }

  const handleDeleteRule = async (id: number) => {
    if (!confirm("Are you sure you want to delete this rule?")) return
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/auto-rules/${id}`, { 
        method: "DELETE", 
        headers: getHeaders() 
      })
      const data = await res.json()
      if (data.success) {
        showToast("Rule deleted", "success")
        loadRules()
      } else {
        showToast(data.error || "Failed to delete", "error")
      }
    } catch { 
      showToast("Failed to delete", "error") 
    }
  }

  const handleToggleActive = async (rule: AutoRule) => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/reports/auto-rules/${rule.id}`, {
        method: 'PUT',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active })
      })

      const data = await response.json()
      if (data.success) {
        showToast(rule.is_active ? "Rule disabled" : "Rule enabled", "success")
        loadRules()
      }
    } catch {
      showToast("Failed to update rule", "error")
    }
  }

  const handleEditRule = (rule: AutoRule) => {
    setEditingRule(rule)
    setFormData({
      rule_name: rule.rule_name,
      description: rule.description || '',
      template_id: String(rule.template_id),
      trigger_model: rule.trigger_model,
      trigger_action: rule.trigger_action,
      trigger_state_field: rule.trigger_state_field || 'state',
      trigger_state_values: rule.trigger_state_values || ['done'],
      replace_existing: rule.replace_existing,
      notify_user: rule.notify_user,
      is_active: rule.is_active
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingRule(null)
    setFormData({
      rule_name: '',
      description: '',
      template_id: '',
      trigger_model: 'stock.picking',
      trigger_action: 'state_change',
      trigger_state_field: 'state',
      trigger_state_values: ['done'],
      replace_existing: false,
      notify_user: false,
      is_active: true
    })
  }

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
  }

  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      const matchesSearch = 
        rule.rule_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.trigger_model?.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesSearch
    })
  }, [rules, searchQuery])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
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
            <h1 className="text-3xl font-bold tracking-tight mb-2">{t("Auto-Generation Rules")}</h1>
            <p className="text-lg opacity-80" style={{ color: colors.textSecondary }}>
              {t("Configure automatic report generation based on events")}
            </p>
          </div>

          {/* Create Button */}
          {canCreatePage('report-rules') && (
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              style={{ 
                backgroundColor: colors.action, 
                color: '#ffffff',
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              }}
            >
              <Plus className="w-5 h-5" />
              {t("Create Rule")}
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
              placeholder={t("Search rules...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 bg-transparent"
              style={{ 
                color: colors.textPrimary
              }}
            />
          </div>
        </div>

        {/* Rules Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" 
              style={{ borderColor: colors.action, borderTopColor: 'transparent' }} />
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-20" style={{ color: colors.textSecondary }}>
            <Zap className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">{t("No rules found")}</p>
            <p className="text-sm mt-2">{t("Create rules to automatically generate reports")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredRules.map((rule, index) => {
              // Determine gradient based on active status
              const gradient = rule.is_active 
                ? "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" // Active orange/pink
                : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" // Inactive
              
              return (
                <div
                  key={rule.id}
                  className="group relative w-full rounded-[24px] p-[2px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1"
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                    backgroundColor: colors.card,
                    opacity: rule.is_active ? 1 : 0.8
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
                        <Zap className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(rule)}
                          className={`p-2 rounded-full transition-colors ${rule.is_active ? 'text-green-500 hover:bg-green-500/10' : 'text-gray-400 hover:bg-gray-500/10'}`}
                          title={rule.is_active ? t("Disable") : t("Enable")}
                        >
                          {rule.is_active ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                        
                        {canEditPage('report-rules') && (
                          <button
                            onClick={() => handleEditRule(rule)}
                            className="p-2 rounded-full transition-colors hover:bg-opacity-10"
                            style={{ color: colors.textSecondary, backgroundColor: colors.mutedBg }}
                            title={t("Edit")}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDeletePage('report-rules') && (
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-2 rounded-full transition-colors hover:bg-red-500/10 text-red-500"
                            title={t("Delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 mb-4">
                      <h3 className="text-xl font-bold tracking-tight mb-1 transition-all"
                        style={{ color: colors.textPrimary }}
                      >
                        {rule.rule_name}
                      </h3>
                      
                      {rule.description && (
                        <p className="text-sm line-clamp-2 mb-3" style={{ color: colors.textSecondary }}>
                          {rule.description}
                        </p>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-col gap-3 mb-6">
                      <div className="flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
                        <FileText className="w-4 h-4" />
                        <span className="font-medium truncate">{rule.template_name || `Template #${rule.template_id}`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
                        <Settings className="w-4 h-4" />
                        <span className="font-medium">{rule.trigger_model}</span>
                        <span className="opacity-50">→</span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-opacity-10" style={{ backgroundColor: colors.action, color: colors.action }}>
                          {rule.trigger_action.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t mt-auto" style={{ borderColor: colors.border }}>
                      <div className="flex items-center gap-2" style={{ color: colors.textSecondary }}>
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium">{rule.execution_count} runs</span>
                      </div>
                      
                      {rule.last_executed_at && (
                        <span className="text-xs" style={{ color: colors.textSecondary }}>
                          {formatDate(rule.last_executed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            style={{ backgroundColor: colors.card }}
          >
            <h2 className="text-xl font-bold mb-6">
              {editingRule ? t("Edit Rule") : t("Create Rule")}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                  {t("Rule Name")} *
                </label>
                <input
                  type="text"
                  value={formData.rule_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, rule_name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm"
                  style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                  {t("Description")}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl text-sm resize-none"
                  style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                  {t("Template")} *
                </label>
                <select
                  value={formData.template_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, template_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm"
                  style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                >
                  <option value="">{t("Select Template")}</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.template_name} ({t.report_type})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                    {t("Trigger Model")}
                  </label>
                  <select
                    value={formData.trigger_model}
                    onChange={(e) => setFormData(prev => ({ ...prev, trigger_model: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm"
                    style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                  >
                    {SOURCE_MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                    {t("Trigger Action")}
                  </label>
                  <select
                    value={formData.trigger_action}
                    onChange={(e) => setFormData(prev => ({ ...prev, trigger_action: e.target.value as any }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm"
                    style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                  >
                    {TRIGGER_ACTIONS.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.trigger_action === 'state_change' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                      {t("State Field")}
                    </label>
                    <input
                      type="text"
                      value={formData.trigger_state_field}
                      onChange={(e) => setFormData(prev => ({ ...prev, trigger_state_field: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm"
                      style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                      {t("Trigger States")}
                    </label>
                    <input
                      type="text"
                      value={formData.trigger_state_values.join(', ')}
                      onChange={(e) => setFormData(prev => ({ ...prev, trigger_state_values: e.target.value.split(',').map(s => s.trim()) }))}
                      placeholder="done, confirmed"
                      className="w-full px-4 py-2.5 rounded-xl text-sm"
                      style={{ backgroundColor: colors.mutedBg, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.replace_existing}
                    onChange={(e) => setFormData(prev => ({ ...prev, replace_existing: e.target.checked }))}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm">{t("Replace existing reports")}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm">{t("Active")}</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ backgroundColor: colors.mutedBg, color: colors.textPrimary }}
              >
                {t("Cancel")}
              </button>
              <button
                onClick={handleSaveRule}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{ backgroundColor: colors.action, color: '#fff' }}
              >
                {editingRule ? t("Update") : t("Create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
    </div>
  )
}
