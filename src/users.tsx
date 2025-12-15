
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { API_CONFIG, getTenantHeaders } from "./config/api"
import {
  Users,
  Search,
  ChevronRight,
  RefreshCcw,
  Shield,
  Check,
  X,
  UserPlus
} from "lucide-react"
import { Checkbox } from "../@/components/ui/checkbox"
import Toast from "./components/Toast"
import { useNavigate, useLocation } from "react-router-dom"
import { useCasl } from "../context/casl"

// Types
interface User {
  id: number
  login: string
  name?: string
  email?: string
  active: boolean
  roles?: Role[]
}

interface Role {
  id: number
  role_key: string
  role_name: string
  is_system: boolean
}

// --- SHARED COMPONENTS ---

const ModalOverlay = ({ children, onClose, colors }: { children: React.ReactNode, onClose: () => void, colors: any }) => (
  <div 
    className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
    style={{ background: 'rgba(0,0,0,0.6)' }}
    onClick={onClose}
  >
    <div
      onClick={e => e.stopPropagation()}
      className="relative w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]"
      style={{ background: colors.card, border: `1px solid ${colors.border}` }}
    >
      {children}
    </div>
  </div>
)

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
              e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(39, 39, 42, 0.5)' : colors.mutedBg
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

export default function UsersPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const navigate = useNavigate()
  const { canEditPage } = useCasl()

  // State
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userSearch, setUserSearch] = useState("")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  // Selection
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false)
  const [userRoles, setUserRoles] = useState<number[]>([])

  useEffect(() => {
    loadData()
  }, [])

  // Helper to get headers with tenant ID
  const getHeaders = () => getTenantHeaders()

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadUsers(), loadRoles()])
    } catch (error) {
      console.error("Error loading data:", error)
      showToast("Failed to load data", "error")
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users`, {
      headers: getHeaders()
    })
    const data = await response.json()
    if (data.success && Array.isArray(data.data)) {
      const usersWithRoles = await Promise.all(
        data.data.map(async (user: User) => {
          try {
            const rolesRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users/${user.id}/roles`, { headers: getHeaders() })
            const rolesData = await rolesRes.json()
            return { ...user, roles: rolesData.success ? rolesData.data : [] }
          } catch {
            return { ...user, roles: [] }
          }
        })
      )
      setUsers(usersWithRoles)
    }
  }

  const loadRoles = async () => {
    const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles`, { headers: getHeaders() })
    const data = await response.json()
    if (data.success) setRoles(data.data || [])
  }

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
    setTimeout(() => setToast(null), 3000)
  }

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.login?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.name?.toLowerCase().includes(userSearch.toLowerCase())
    )
  }, [users, userSearch])

  const openAssignRoleModal = async (user: User) => {
    setSelectedUser(user)
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users/${user.id}/roles`, { headers: getHeaders() })
      const data = await response.json()
      if (data.success) {
        setUserRoles(data.data?.map((r: Role) => r.id) || [])
      }
    } catch {
      setUserRoles([])
    }
    setShowAssignRoleModal(true)
  }

  const handleAssignRoles = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users/${selectedUser.id}/roles`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ role_ids: userRoles })
        }
      )
      const data = await response.json()
      if (data.success) {
        showToast("Roles assigned successfully", "success")
        setShowAssignRoleModal(false)
        loadUsers()
      } else {
        showToast(data.message || "Failed to assign roles", "error")
      }
    } catch {
      showToast("Failed to assign roles", "error")
    } finally {
      setSaving(false)
    }
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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background: ${mode === 'dark' ? '#52525b' : '#9ca3af'}; 
        }
        @keyframes enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-enter { animation: enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .delay-100 { animation-delay: 100ms; }
      `}</style>


      <div className="relative z-10 p-6 md:p-10 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-12 animate-enter">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2" style={{ color: colors.textPrimary }}>
            {t("User Management")}
          </h1>
          <p className="font-light max-w-xl" style={{ color: colors.textSecondary }}>
            {t("Manage system access and assign roles to users.")}
          </p>
        </div>

        <NavTabs active="users" colors={colors} mode={mode} />

        <div className="space-y-6 animate-enter delay-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[300px] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" size={18} style={{ color: colors.textSecondary }} />
              <input
                placeholder={t("Search users...")}
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                }}
              />
            </div>
            <button
              onClick={() => loadData()}
              className="px-4 py-3 rounded-xl border transition-colors flex items-center gap-2"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.card,
                color: colors.textSecondary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.textPrimary
                e.currentTarget.style.backgroundColor = colors.mutedBg
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.textSecondary
                e.currentTarget.style.backgroundColor = colors.card
              }}
            >
              <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="rounded-2xl p-6 animate-pulse h-[200px]" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }} />
              ))
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="group relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-900/10"
                  style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div className={`absolute top-6 right-6 w-2 h-2 rounded-full ${user.active ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />

                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl border flex items-center justify-center text-lg font-bold" style={{ borderColor: colors.border, backgroundColor: colors.mutedBg, color: colors.textPrimary }}>
                      {(user.name || user.login).charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-semibold truncate" style={{ color: colors.textPrimary }}>{user.name || user.login}</h3>
                      <p className="text-xs truncate" style={{ color: colors.textSecondary }}>{user.login}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.slice(0, 2).map(role => (
                          <span
                            key={role.id}
                            className={`text-[10px] px-2 py-1 rounded-md font-medium uppercase tracking-wider border
                              ${role.role_key === 'super_admin' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                role.role_key === 'admin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                ''}
                            `}
                            style={role.role_key !== 'super_admin' && role.role_key !== 'admin' ? {
                              backgroundColor: colors.mutedBg,
                              color: colors.textSecondary,
                              borderColor: colors.border,
                            } : {}}
                          >
                            {role.role_name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] italic" style={{ color: colors.textSecondary }}>No roles assigned</span>
                      )}
                      {user.roles && user.roles.length > 2 && (
                        <span className="text-[10px] px-2 py-1 rounded-md border" style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary, borderColor: colors.border }}>
                          +{user.roles.length - 2}
                        </span>
                      )}
                    </div>

                    <div className="pt-4 flex justify-end" style={{ borderTop: `1px solid ${colors.border}` }}>
                      {canEditPage("users") && (
                        <button
                          onClick={() => openAssignRoleModal(user)}
                          className="text-xs font-semibold transition-colors flex items-center gap-1"
                          style={{ color: '#4facfe' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#3b82f6'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#4facfe'
                        }}
                      >
                        Manage Roles <ChevronRight size={12} />
                      </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Assign Role Modal */}
      {showAssignRoleModal && (
        <ModalOverlay onClose={() => setShowAssignRoleModal(false)} colors={colors}>
          <div className="p-6 flex justify-between items-start" style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.card }}>
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>{t("Assign Roles")}</h2>
              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>Assigning roles to: <span style={{ color: colors.textPrimary }}>{selectedUser?.name || selectedUser?.login}</span></p>
            </div>
            <button 
              onClick={() => setShowAssignRoleModal(false)} 
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
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto custom-scrollbar" style={{ backgroundColor: colors.card }}>
            <div className="space-y-2">
              {roles.map(role => {
                const isAssigned = userRoles.includes(role.id)
                return (
                  <div 
                    key={role.id}
                    onClick={() => {
                      if (isAssigned) setUserRoles(userRoles.filter(id => id !== role.id))
                      else setUserRoles([...userRoles, role.id])
                    }}
                    className="flex items-start gap-3 p-4 rounded-xl cursor-pointer border transition-all"
                    style={{
                      backgroundColor: isAssigned ? 'rgba(79, 172, 254, 0.1)' : colors.mutedBg,
                      border: `1px solid ${isAssigned ? 'rgba(79, 172, 254, 0.3)' : colors.border}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isAssigned) {
                        e.currentTarget.style.borderColor = mode === 'dark' ? '#3f3f46' : colors.border
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isAssigned) {
                        e.currentTarget.style.borderColor = colors.border
                      }
                    }}
                  >
                    <Checkbox checked={isAssigned} className="mt-1" />
                    <div>
                      <div className="font-semibold text-sm" style={{ color: isAssigned ? '#4facfe' : colors.textPrimary }}>
                        {role.role_name}
                        {role.is_system && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded uppercase border bg-amber-500/10 text-amber-500 border-amber-500/20">
                            System
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>{role.role_key}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-6 flex justify-end gap-3" style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.card }}>
            <button 
              onClick={() => setShowAssignRoleModal(false)} 
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: colors.textSecondary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.textPrimary
                e.currentTarget.style.backgroundColor = colors.mutedBg
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.textSecondary
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleAssignRoles} 
              disabled={saving}
              className="px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 text-white"
              style={{ backgroundColor: colors.action }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(79, 172, 254, 0.9)' : colors.action
                }
              }}
              onMouseLeave={(e) => {
                if (!saving) {
                  e.currentTarget.style.backgroundColor = colors.action
                }
              }}
            >
              {saving && <RefreshCcw size={14} className="animate-spin" />}
              Save Assignments
            </button>
          </div>
        </ModalOverlay>
      )}

      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
    </div>
  )
}
