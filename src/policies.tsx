
"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { API_CONFIG, getTenantHeaders } from "./config/api"
import {
  Key,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Edit,
  Trash2
} from "lucide-react"
import Toast from "./components/Toast"
import { useNavigate } from "react-router-dom"
import { useCasl } from "../context/casl"

// Types
interface Policy {
  id: number
  policy_key: string
  policy_name: string
  description?: string
  target_type: string
  target_key: string
  actions: string[]
  effect: "allow" | "deny"
  priority: number
}

// --- SHARED COMPONENTS ---
const NavTabs = ({ active, colors, mode }: { active: 'users' | 'roles' | 'policies', colors: any, mode: string }) => {
  const navigate = useNavigate();
  const tabs = [
    { key: 'users', label: 'Users', path: '/users' },
    { key: 'roles', label: 'Roles', path: '/roles' },
    { key: 'policies', label: 'Policies', path: '/policies' },
  ];

  return (
    <div className="flex gap-2 p-1 rounded-xl w-fit mb-8" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => navigate(tab.path)}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300"
          style={{
            backgroundColor: active === tab.key ? colors.mutedBg : 'transparent',
            color: active === tab.key ? colors.textPrimary : colors.textSecondary,
            boxShadow: active === tab.key ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (active !== tab.key) {
              e.currentTarget.style.color = colors.textPrimary
              e.currentTarget.style.backgroundColor = colors.mode === 'dark' ? 'rgba(39, 39, 42, 0.5)' : colors.mutedBg
            }
          }}
          onMouseLeave={(e) => {
            if (active !== tab.key) {
              e.currentTarget.style.color = colors.textSecondary
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default function PoliciesPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const navigate = useNavigate()
  const { canCreatePage, canEditPage } = useCasl()

  // State
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [policySearch, setPolicySearch] = useState("")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  useEffect(() => {
    loadPolicies()
  }, [])

  // Helper to get headers with tenant ID
  const getHeaders = () => getTenantHeaders()

  const loadPolicies = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/policies`, { headers: getHeaders() })
      const data = await response.json()
      if (data.success) setPolicies(data.data || [])
    } catch {
      showToast("Failed to load policies", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePolicy = async (id: number) => {
    if (!confirm("Are you sure?")) return
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/policies/${id}`, { method: "DELETE", headers: getHeaders() })
      if ((await res.json()).success) {
        showToast("Policy deleted", "success")
        loadPolicies()
      }
    } catch { showToast("Failed to delete", "error") }
  }

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
    setTimeout(() => setToast(null), 3000)
  }

  const filteredPolicies = useMemo(() => {
    return policies.filter(policy =>
      policy.policy_name?.toLowerCase().includes(policySearch.toLowerCase()) ||
      policy.policy_key?.toLowerCase().includes(policySearch.toLowerCase())
    )
  }, [policies, policySearch])

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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background: ${mode === 'dark' ? '#52525b' : '#9ca3af'}; 
        }
        @keyframes enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-enter { animation: enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .delay-100 { animation-delay: 100ms; }
      `}</style>


      <div className="relative z-10 p-6 md:p-10 max-w-7xl mx-auto">
        <div className="mb-12 animate-enter">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2" style={{ color: colors.textPrimary }}>{t("Access Policies")}</h1>
          <p className="font-light max-w-xl" style={{ color: colors.textSecondary }}>{t("Manage granular permissions and access controls.")}</p>
        </div>

        <NavTabs active="policies" colors={colors} mode={mode} />

        <div className="space-y-6 animate-enter delay-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[300px] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" size={18} style={{ color: colors.textSecondary }} />
              <input
                placeholder={t("Search policies...")}
                value={policySearch}
                onChange={e => setPolicySearch(e.target.value)}
                className="w-full rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                }}
              />
            </div>
            {canCreatePage("policies") && (
              <button
                onClick={() => navigate("/policy-editor")}
                className="px-6 py-3 rounded-xl font-semibold text-sm shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-white"
                style={{ backgroundColor: colors.action }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(79, 172, 254, 0.9)' : colors.action
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.action
                }}
              >
                <Plus size={16} />
                {t("Create Policy")}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="rounded-xl p-4 animate-pulse h-[80px]" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }} />
              ))
            ) : (
              filteredPolicies.map((policy) => {
                const isSystem = policy.policy_key.includes("full_access");
                return (
                  <div 
                    key={policy.id}
                    className="group flex flex-col md:flex-row md:items-center justify-between rounded-xl p-4 transition-all duration-200 hover:border-blue-500/30"
                    style={{
                      backgroundColor: colors.card,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div className="flex items-start gap-4 mb-4 md:mb-0">
                      <div className={`p-2 rounded-lg ${policy.effect === 'allow' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {policy.effect === 'allow' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold" style={{ color: colors.textPrimary }}>{policy.policy_name}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}>{policy.policy_key}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
                          <span className="px-1.5 py-0.5 rounded border uppercase text-[10px] tracking-wider" style={{ borderColor: colors.border, backgroundColor: colors.mutedBg }}>{policy.target_type}</span>
                          <ChevronRight size={10} />
                          <span className="font-mono" style={{ color: colors.textPrimary }}>{policy.target_key}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex gap-1.5 flex-wrap md:justify-end max-w-[200px]">
                        {policy.actions.slice(0, 3).map(action => (
                          <span key={action} className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}>
                            {action}
                          </span>
                        ))}
                        {policy.actions.length > 3 && <span className="text-[10px]" style={{ color: colors.textSecondary }}>+{policy.actions.length - 3}</span>}
                      </div>
                      
                      <div className="text-right min-w-[60px]">
                        <span className="block text-[10px] uppercase tracking-wider" style={{ color: colors.textSecondary }}>Priority</span>
                        <span className="text-sm font-mono" style={{ color: colors.textPrimary }}>{policy.priority}</span>
                      </div>

                      {!isSystem && (
                        <div className="flex items-center gap-2 pl-4" style={{ borderLeft: `1px solid ${colors.border}` }}>
                          {canEditPage("policies") && (
                            <button 
                              onClick={() => navigate(`/policy-editor?id=${policy.id}`)}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: colors.textSecondary }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.mutedBg
                                e.currentTarget.style.color = colors.textPrimary
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.color = colors.textSecondary
                              }}
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeletePolicy(policy.id)}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: colors.textSecondary }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                              e.currentTarget.style.color = '#ef4444'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                              e.currentTarget.style.color = colors.textSecondary
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      
      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
    </div>
  )
}
