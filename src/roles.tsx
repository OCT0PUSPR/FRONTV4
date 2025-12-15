
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { API_CONFIG, getTenantHeaders } from "./config/api"
import {
  Shield,
  Search,
  Plus,
  RefreshCcw,
  Users,
  Key,
  Check,
  X,
  ChevronDown
} from "lucide-react"
import { Checkbox } from "../@/components/ui/checkbox"
import Toast from "./components/Toast"
import { useNavigate } from "react-router-dom"
import { useCasl } from "../context/casl"

// Types
interface Role {
  id: number
  role_key: string
  role_name: string
  description?: string
  is_system: boolean
  is_active: boolean
  users_count?: number
  policies_count?: number
}

interface User {
  id: number
  login: string
  name?: string
}

interface Policy {
  id: number
  policy_name: string
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

const NavTabs = ({ active, colors }: { active: 'users' | 'roles' | 'policies', colors: any }) => {
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

// Premium Dropdown (Local Definition)
const PremiumDropdown = ({ label, options, value, onChange, multi = false, placeholder = "Select...", colors, mode }: any) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (optionValue: any) => {
    if (multi) {
      const currentValues = Array.isArray(value) ? value : []
      if (currentValues.includes(optionValue)) {
        onChange(currentValues.filter((v: any) => v !== optionValue))
      } else {
        onChange([...currentValues, optionValue])
      }
    } else {
      onChange(optionValue)
      setIsOpen(false)
    }
  }

  const getDisplayValue = () => {
    if (multi) {
      const selected = Array.isArray(value) ? value : []
      if (selected.length === 0) return placeholder
      if (selected.length === 1) return options.find((o: any) => o.value === selected[0])?.label || placeholder
      return `${selected.length} selected`
    } else {
      return options.find((o: any) => o.value === value)?.label || placeholder
    }
  }

  return (
    <div className="relative group" ref={containerRef}>
      {label && <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border rounded-lg px-4 py-3 text-sm focus:outline-none transition-all"
        style={{
          backgroundColor: colors.mutedBg,
          border: `1px solid ${isOpen ? 'rgba(79, 172, 254, 0.5)' : colors.border}`,
          color: colors.textPrimary,
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = mode === 'dark' ? '#3f3f46' : colors.border
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = colors.border
          }
        }}
      >
        <span className="truncate">{getDisplayValue()}</span>
        <ChevronDown size={16} className="transition-transform" style={{ color: colors.textSecondary }} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
          <div className="p-1">
            {options.map((option: any) => {
              const isSelected = multi 
                ? (Array.isArray(value) && value.includes(option.value))
                : value === option.value
              
              return (
                <div
                  key={String(option.value)}
                  onClick={() => handleSelect(option.value)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors"
                  style={{
                    backgroundColor: isSelected ? 'rgba(79, 172, 254, 0.1)' : 'transparent',
                    color: isSelected ? '#4facfe' : colors.textPrimary,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = colors.mutedBg
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check size={14} />}
                </div>
              )
            })}
            {options.length === 0 && (
              <div className="px-3 py-4 text-center text-xs" style={{ color: colors.textSecondary }}>No options available</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RolesPage() {
  const { t } = useTranslation()
  const { colors, mode } = useTheme()
  const { canCreatePage, canEditPage } = useCasl()

  // State
  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [roleSearch, setRoleSearch] = useState("")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  // Selection & Modal
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [roleForm, setRoleForm] = useState({
    role_key: "",
    role_name: "",
    description: "",
    is_active: true,
    policy_ids: [] as number[],
    user_ids: [] as number[]
  })

  useEffect(() => {
    loadData()
  }, [])

  // Helper to get headers with tenant ID
  const getHeaders = () => getTenantHeaders()

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadRoles(), loadUsers(), loadPolicies()])
    } catch {
      showToast("Failed to load data", "error")
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles`, { headers: getHeaders() })
    const data = await res.json()
    if (data.success) setRoles(data.data || [])
  }

  const loadUsers = async () => {
    const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users`, { headers: getHeaders() })
    const data = await res.json()
    if (data.success) setUsers(data.data || [])
  }

  const loadPolicies = async () => {
    const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/policies`, { headers: getHeaders() })
    const data = await res.json()
    if (data.success) setPolicies(data.data || [])
  }

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
    setTimeout(() => setToast(null), 3000)
  }

  const filteredRoles = useMemo(() => {
    return roles.filter(role =>
      role.role_name?.toLowerCase().includes(roleSearch.toLowerCase()) ||
      role.role_key?.toLowerCase().includes(roleSearch.toLowerCase())
    )
  }, [roles, roleSearch])

  // CRUD Operations
  const handleCreateRole = async () => {
    if (!roleForm.role_key || !roleForm.role_name) {
      showToast("Role key and name are required", "error")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(roleForm)
      })
      const data = await res.json()
      if (data.success) {
        const roleId = data.data.id
        await Promise.all([
          ...roleForm.policy_ids.map(pid => fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${roleId}/policies`, { method: "POST", headers: getHeaders(), body: JSON.stringify({ policy_id: pid }) })),
          ...roleForm.user_ids.map(uid => fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users/${uid}/roles`, { method: "POST", headers: getHeaders(), body: JSON.stringify({ role_id: roleId }) }))
        ])
        showToast("Role created successfully", "success")
        setShowRoleModal(false)
        setRoleForm({ role_key: "", role_name: "", description: "", is_active: true, policy_ids: [], user_ids: [] })
        loadRoles()
      } else {
        showToast(data.message || "Failed", "error")
      }
    } catch { showToast("Failed", "error") }
    finally { setSaving(false) }
  }

  const handleUpdateRole = async () => {
    if (!selectedRole) return
    setSaving(true)
    try {
      // First, get current associations
      const [currentPoliciesRes, currentUsersRes] = await Promise.all([
        fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${selectedRole.id}/policies`, { headers: getHeaders() }),
        fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${selectedRole.id}/users`, { headers: getHeaders() })
      ])
      const currentPoliciesData = await currentPoliciesRes.json()
      const currentUsersData = await currentUsersRes.json()
      const currentPolicyIds = currentPoliciesData.success ? currentPoliciesData.data.map((p: any) => p.id) : []
      const currentUserIds = currentUsersData.success ? currentUsersData.data.map((u: any) => u.id) : []

      // Update role data
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${selectedRole.id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          role_key: roleForm.role_key,
          role_name: roleForm.role_name,
          description: roleForm.description,
          is_active: roleForm.is_active
        })
      })
      const data = await res.json()
      if (data.success) {
        // Update policies: use PUT to set all policies at once (atomic operation)
        const policiesRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${selectedRole.id}/policies`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({ policy_ids: roleForm.policy_ids })
        })
        const policiesData = await policiesRes.json()
        if (!policiesData.success) {
          console.error("Failed to update policies:", policiesData)
          showToast(policiesData.message || "Failed to update policies", "error")
          return
        }

        // Update users: remove old ones, add new ones
        const usersToRemove = currentUserIds.filter((id: number) => !roleForm.user_ids.includes(id))
        const usersToAdd = roleForm.user_ids.filter((id: number) => !currentUserIds.includes(id))
        
        // Remove roles from users
        const removePromises = usersToRemove.map(async (uid: number) => {
          const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users/${uid}/roles/${selectedRole.id}`, { 
            method: "DELETE",
            headers: getHeaders()
          })
          const data = await res.json()
          if (!data.success) {
            console.error(`Failed to remove role from user ${uid}:`, data)
          }
          return data
        })
        
        // Add roles to users
        const addPromises = usersToAdd.map(async (uid: number) => {
          const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users/${uid}/roles`, { 
            method: "POST", 
            headers: getHeaders(), 
            body: JSON.stringify({ role_id: selectedRole.id }) 
          })
          const data = await res.json()
          if (!data.success) {
            console.error(`Failed to add role to user ${uid}:`, data)
          }
          return data
        })
        
        await Promise.all([...removePromises, ...addPromises])

        showToast("Role updated successfully", "success")
        setShowRoleModal(false)
        setSelectedRole(null)
        setRoleForm({ role_key: "", role_name: "", description: "", is_active: true, policy_ids: [], user_ids: [] })
        loadRoles()
      } else {
        showToast(data.message || "Failed to update role", "error")
      }
    } catch (error) {
      console.error("Update role error:", error)
      showToast("Failed to update role", "error")
    }
    finally { setSaving(false) }
  }

  const handleDeleteRole = async (id: number) => {
    if (!confirm("Delete this role?")) return
    try {
      await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${id}`, { method: "DELETE", headers: getHeaders() })
      showToast("Deleted", "success")
      loadRoles()
    } catch { showToast("Failed", "error") }
  }

  const openEditModal = async (role: Role) => {
    // Check edit permission before opening modal
    if (!canEditPage("roles")) {
      return
    }
    setSelectedRole(role)
    setShowRoleModal(true) // Open modal immediately
    try {
      const [pRes, uRes] = await Promise.all([
        fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${role.id}/policies`, { headers: getHeaders() }),
        fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${role.id}/users`, { headers: getHeaders() })
      ])
      const pData = await pRes.json()
      const uData = await uRes.json()
      setRoleForm({
        role_key: role.role_key,
        role_name: role.role_name,
        description: role.description || "",
        is_active: role.is_active,
        policy_ids: pData.success ? pData.data.map((p: any) => p.id) : [],
        user_ids: uData.success ? uData.data.map((u: any) => u.id) : []
      })
    } catch (error) {
      console.error("Error loading role data:", error)
      // Still set basic form data even if fetch fails
      setRoleForm({
        role_key: role.role_key,
        role_name: role.role_name,
        description: role.description || "",
        is_active: role.is_active,
        policy_ids: [],
        user_ids: []
      })
      showToast("Failed to load role associations", "error")
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
        <div className="mb-12 animate-enter">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2" style={{ color: colors.textPrimary }}>{t("Role Management")}</h1>
          <p className="font-light max-w-xl" style={{ color: colors.textSecondary }}>{t("Define roles and permissions structure.")}</p>
        </div>

        <NavTabs active="roles" colors={colors} />

        <div className="space-y-6 animate-enter delay-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[300px] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" size={18} style={{ color: colors.textSecondary }} />
              <input
                placeholder={t("Search roles...")}
                value={roleSearch}
                onChange={e => setRoleSearch(e.target.value)}
                className="w-full rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                }}
              />
            </div>
            {canCreatePage("roles") && (
              <button
                onClick={() => {
                  setSelectedRole(null)
                  setRoleForm({ role_key: "", role_name: "", description: "", is_active: true, policy_ids: [], user_ids: [] })
                  setShowRoleModal(true)
                }}
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
                {t("Create Role")}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="rounded-2xl p-6 animate-pulse h-[200px]" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }} />
              ))
            ) : (
              filteredRoles.map((role) => (
                <div 
                  key={role.id}
                  className="group relative flex flex-col rounded-2xl p-6 transition-all duration-500 hover:border-blue-500/50 hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.15)]"
                  style={{
                    backgroundColor: colors.mutedBg,
                    border: `1px solid ${colors.border}`,
                  }}
                >

                  {/* Header */}
                  <div className="relative z-10 flex justify-between items-start mb-6">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg border transition-colors duration-300"
                      style={{
                        backgroundColor: role.is_system ? 'rgba(245, 158, 11, 0.1)' : colors.card,
                        border: `1px solid ${role.is_system ? 'rgba(245, 158, 11, 0.2)' : colors.border}`,
                        color: role.is_system ? '#f59e0b' : colors.textPrimary,
                      }}
                      onMouseEnter={(e) => {
                        if (!role.is_system) {
                          e.currentTarget.style.backgroundColor = 'rgba(79, 172, 254, 0.1)'
                          e.currentTarget.style.borderColor = 'rgba(79, 172, 254, 0.2)'
                          e.currentTarget.style.color = '#4facfe'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!role.is_system) {
                          e.currentTarget.style.backgroundColor = colors.card
                          e.currentTarget.style.borderColor = colors.border
                          e.currentTarget.style.color = colors.textPrimary
                        }
                      }}
                    >
                      <Shield size={20} />
                    </div>
                    {role.is_system && (
                      <div className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                        System
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="relative z-10 flex-1">
                    <h3 className="text-xl font-bold mb-2 transition-colors" style={{ color: colors.textPrimary }}>
                      {role.role_name}
                    </h3>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ backgroundColor: colors.card, color: colors.textSecondary, border: `1px solid ${colors.border}` }}>
                        {role.role_key}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed mb-6 line-clamp-2 min-h-[40px]" style={{ color: colors.textSecondary }}>
                      {role.description || "No description provided for this role."}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="relative z-10 pt-6 mt-auto" style={{ borderTop: `1px solid ${colors.border}` }}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: colors.textSecondary }}>
                        <Users size={14} />
                        <span>{role.users_count || 0} Users</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: colors.textSecondary }}>
                        <Key size={14} />
                        <span>{role.policies_count || 0} Policies</span>
                      </div>
                    </div>

                    {/* Actions */}
                    {!role.is_system ? (
                      <div className="grid grid-cols-2 gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                        {canEditPage("roles") && (
                          <button
                            onClick={() => openEditModal(role)}
                            className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all"
                            style={{
                              backgroundColor: colors.card,
                              color: colors.textPrimary,
                              border: `1px solid ${colors.border}`,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = mode === 'dark' ? '#ffffff' : colors.textPrimary
                              e.currentTarget.style.color = mode === 'dark' ? '#000000' : '#ffffff'
                              e.currentTarget.style.borderColor = mode === 'dark' ? '#ffffff' : colors.textPrimary
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = colors.card
                              e.currentTarget.style.color = colors.textPrimary
                              e.currentTarget.style.borderColor = colors.border
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all"
                          style={{
                            backgroundColor: colors.card,
                            color: '#ef4444',
                            border: `1px solid ${colors.border}`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#ef4444'
                            e.currentTarget.style.color = '#ffffff'
                            e.currentTarget.style.borderColor = '#ef4444'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = colors.card
                            e.currentTarget.style.color = '#ef4444'
                            e.currentTarget.style.borderColor = colors.border
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <div className="py-2 text-center text-[10px] font-bold uppercase tracking-widest select-none" style={{ color: colors.textSecondary }}>
                        Locked Role
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showRoleModal && (
        <ModalOverlay onClose={() => setShowRoleModal(false)} colors={colors}>
          <div className="p-6 flex justify-between items-start" style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.card }}>
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>{selectedRole ? t("Edit Role") : t("Create Role")}</h2>
              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>{t("Define properties and assign policies")}</p>
            </div>
            <button 
              onClick={() => setShowRoleModal(false)} 
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
          
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar" style={{ backgroundColor: colors.card }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>{t("Role Key")} *</label>
                <input 
                  value={roleForm.role_key}
                  onChange={e => setRoleForm({ ...roleForm, role_key: e.target.value.toLowerCase().replace(/\s/g, "_") })}
                  disabled={!!selectedRole}
                  className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50 font-mono"
                  style={{
                    backgroundColor: colors.mutedBg,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  }}
                  placeholder="e.g. manager"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>{t("Role Name")} *</label>
                <input 
                  value={roleForm.role_name}
                  onChange={e => setRoleForm({ ...roleForm, role_name: e.target.value })}
                  className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                  style={{
                    backgroundColor: colors.mutedBg,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  }}
                  placeholder="e.g. Manager"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>{t("Description")}</label>
              <textarea 
                value={roleForm.description}
                onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none"
                style={{
                  backgroundColor: colors.mutedBg,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                }}
                placeholder="Description..."
              />
            </div>

            <PremiumDropdown 
              label={t("Assign Policies")}
              multi={true}
              options={policies.map(p => ({ label: p.policy_name, value: p.id }))}
              value={roleForm.policy_ids}
              onChange={(ids: any) => setRoleForm({ ...roleForm, policy_ids: ids })}
              placeholder="Select policies..."
              colors={colors}
              mode={mode}
            />

            <PremiumDropdown 
              label={t("Assign Users")}
              multi={true}
              options={users.map(u => ({ label: u.name || u.login, value: u.id }))}
              value={roleForm.user_ids}
              onChange={(ids: any) => setRoleForm({ ...roleForm, user_ids: ids })}
              placeholder="Select users..."
              colors={colors}
              mode={mode}
            />

            <div className="flex items-center gap-3">
              <Checkbox checked={roleForm.is_active} onCheckedChange={c => setRoleForm({ ...roleForm, is_active: !!c })} />
              <label className="text-sm" style={{ color: colors.textPrimary }}>{t("Role is Active")}</label>
            </div>
          </div>

          <div className="p-6 flex justify-end gap-3" style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.card }}>
            <button 
              onClick={() => setShowRoleModal(false)} 
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
              onClick={selectedRole ? handleUpdateRole : handleCreateRole} 
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
              {selectedRole ? "Update" : "Create"}
            </button>
          </div>
        </ModalOverlay>
      )}

      {toast && <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />}
    </div>
  )
}
