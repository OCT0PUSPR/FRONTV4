"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { API_CONFIG } from "./config/api"
import {
  Users,
  Shield,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  UserPlus,
  Settings,
  Key,
  Eye,
  EyeOff,
  Save,
  RefreshCcw,
  AlertCircle,
  CheckCircle2,
  Building2,
  Layers,
  GitBranch,
  Lock,
  Unlock,
  MoreVertical,
  Copy,
  XCircle,
  Filter
} from "lucide-react"
import { Button } from "../@/components/ui/button"
import { Input } from "../@/components/ui/input"
import { Checkbox } from "../@/components/ui/checkbox"
import Toast from "./components/Toast"
import { StatCard } from "./components/StatCard"
import { useNavigate } from "react-router-dom"

// Types
interface User {
  id: number
  login: string
  name?: string
  email?: string
  active: boolean
  company_id?: number
  partner_id?: number
  roles?: Role[]
}

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
  is_active: boolean
}

interface Module {
  id: number
  module_key: string
  module_name: string
  icon?: string
  pages?: Page[]
}

interface Page {
  id: number
  page_key: string
  page_name: string
  route: string
  icon?: string
}

type TabType = "users" | "roles" | "policies"

// --- PREMIUM DROPDOWN COMPONENT ---
interface PremiumDropdownProps {
  label?: string
  options: { label: string; value: any }[]
  value: any | any[]
  onChange: (value: any) => void
  multi?: boolean
  placeholder?: string
  colors: any
}

const PremiumDropdown = ({ label, options, value, onChange, multi = false, placeholder = "Select...", colors }: PremiumDropdownProps) => {
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
        onChange(currentValues.filter(v => v !== optionValue))
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
      if (selected.length === 1) return options.find(o => o.value === selected[0])?.label || placeholder
      return `${selected.length} selected`
    } else {
      return options.find(o => o.value === value)?.label || placeholder
    }
  }

  return (
    <div className="relative group" ref={containerRef}>
      {label && <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm focus:outline-none transition-all"
        style={{ 
          background: colors.background, 
          border: `1px solid ${isOpen ? colors.action + '80' : colors.border}`,
          color: colors.textPrimary
        }}
      >
        <span className="truncate">{getDisplayValue()}</span>
        <ChevronDown size={16} style={{ color: colors.textSecondary, transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="p-1">
            {options.map((option) => {
              const isSelected = multi 
                ? (Array.isArray(value) && value.includes(option.value))
                : value === option.value
              
              return (
                <div
                  key={String(option.value)}
                  onClick={() => handleSelect(option.value)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors"
                  style={{
                    background: isSelected ? colors.action + '1A' : 'transparent',
                    color: isSelected ? colors.action : colors.textPrimary
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = colors.mutedBg
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
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

// --- MAIN COMPONENT ---

export default function UserManagementPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme() // Using theme context for light/dark toggle if needed, but styling heavily overrides
  const navigate = useNavigate()

  // State
  const [activeTab, setActiveTab] = useState<TabType>("users")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Data
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [modules, setModules] = useState<Module[]>([])

  // Search
  const [userSearch, setUserSearch] = useState("")
  const [roleSearch, setRoleSearch] = useState("")
  const [policySearch, setPolicySearch] = useState("")

  // Selected items
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null)

  // Modals
  const [showUserModal, setShowUserModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false)

  // Form data
  const [roleForm, setRoleForm] = useState({
    role_key: "",
    role_name: "",
    description: "",
    is_active: true,
    policy_ids: [] as number[],
    user_ids: [] as number[]
  })

  const [policyForm, setPolicyForm] = useState({
    policy_key: "",
    policy_name: "",
    description: "",
    target_type: "module" as string,
    target_key: "",
    actions: ["view"] as string[],
    effect: "allow" as "allow" | "deny",
    priority: 100
  })

  // User role assignment
  const [userRoles, setUserRoles] = useState<number[]>([])

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadUsers(),
        loadRoles(),
        loadPolicies(),
        loadModules()
      ])
    } catch (error) {
      console.error("Error loading data:", error)
      showToast("Failed to load data", "error")
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users`, {
        headers: { "Content-Type": "application/json" }
      })
      const data = await response.json()
      if (data.success && Array.isArray(data.data)) {
        const usersWithRoles = await Promise.all(
          data.data.map(async (user: User) => {
            try {
              const rolesRes = await fetch(
                `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users/${user.id}/roles`
              )
              const rolesData = await rolesRes.json()
              return {
                ...user,
                roles: rolesData.success ? rolesData.data : []
              }
            } catch {
              return { ...user, roles: [] }
            }
          })
        )
        setUsers(usersWithRoles)
      }
    } catch (error) {
      console.error("Error loading users:", error)
    }
  }

  const loadRoles = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles`)
      const data = await response.json()
      if (data.success) {
        setRoles(data.data || [])
      }
    } catch (error) {
      console.error("Error loading roles:", error)
    }
  }

  const loadPolicies = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/policies`)
      const data = await response.json()
      if (data.success) {
        setPolicies(data.data || [])
      }
    } catch (error) {
      console.error("Error loading policies:", error)
    }
  }

  const loadModules = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/registry/modules`)
      const data = await response.json()
      if (data.success) {
        const modulesWithPages = await Promise.all(
          (data.data || []).map(async (module: Module) => {
            try {
              const pagesRes = await fetch(
                `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/registry/pages?module_id=${module.id}`
              )
              const pagesData = await pagesRes.json()
              return {
                ...module,
                pages: pagesData.success ? pagesData.data : []
              }
            } catch {
              return { ...module, pages: [] }
            }
          })
        )
        setModules(modulesWithPages)
      }
    } catch (error) {
      console.error("Error loading modules:", error)
    }
  }

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
    setTimeout(() => setToast(null), 3000)
  }

  // Filtered data
  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.login?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.name?.toLowerCase().includes(userSearch.toLowerCase())
    )
  }, [users, userSearch])

  const filteredRoles = useMemo(() => {
    return roles.filter(role =>
      role.role_name?.toLowerCase().includes(roleSearch.toLowerCase()) ||
      role.role_key?.toLowerCase().includes(roleSearch.toLowerCase())
    )
  }, [roles, roleSearch])

  const filteredPolicies = useMemo(() => {
    return policies.filter(policy =>
      policy.policy_name?.toLowerCase().includes(policySearch.toLowerCase()) ||
      policy.policy_key?.toLowerCase().includes(policySearch.toLowerCase())
    )
  }, [policies, policySearch])

  // Role CRUD
  const handleCreateRole = async () => {
    if (!roleForm.role_key || !roleForm.role_name) {
      showToast("Role key and name are required", "error")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleForm)
      })
      const data = await response.json()
      if (data.success) {
        const roleId = data.data.id
        await Promise.all([
          ...roleForm.policy_ids.map(policyId =>
            fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${roleId}/policies`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ policy_id: policyId })
            })
          ),
          ...roleForm.user_ids.map(userId =>
            fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users/${userId}/roles`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role_id: roleId })
            })
          )
        ])
        
        showToast("Role created successfully", "success")
        setShowRoleModal(false)
        setRoleForm({ role_key: "", role_name: "", description: "", is_active: true, policy_ids: [], user_ids: [] })
        loadRoles()
        loadUsers()
      } else {
        showToast(data.message || "Failed to create role", "error")
      }
    } catch (error) {
      showToast("Failed to create role", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedRole) return

    setSaving(true)
    try {
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${selectedRole.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(roleForm)
        }
      )
      const data = await response.json()
      if (data.success) {
        const [existingPolicies, existingUsers] = await Promise.all([
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${selectedRole.id}/policies`).then(r => r.json()),
          fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${selectedRole.id}/users`).then(r => r.json())
        ])
        
        const currentPolicyIds = existingPolicies.success ? existingPolicies.data.map((p: any) => p.id) : []
        const currentUserIds = existingUsers.success ? existingUsers.data.map((u: any) => u.id) : []
        
        const policiesToAdd = roleForm.policy_ids.filter(id => !currentPolicyIds.includes(id))
        const policiesToRemove = currentPolicyIds.filter((id: number) => !roleForm.policy_ids.includes(id))
        
        const usersToAdd = roleForm.user_ids.filter(id => !currentUserIds.includes(id))
        const usersToRemove = currentUserIds.filter((id: number) => !roleForm.user_ids.includes(id))
        
        await Promise.all([
          ...policiesToAdd.map(policyId =>
            fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${selectedRole.id}/policies`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ policy_id: policyId })
            })
          ),
          ...policiesToRemove.map((policyId: number) =>
            fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${selectedRole.id}/policies/${policyId}`, {
              method: "DELETE"
            })
          ),
          ...usersToAdd.map(userId =>
            fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users/${userId}/roles`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role_id: selectedRole.id })
            })
          ),
          ...usersToRemove.map((userId: number) =>
            fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users/${userId}/roles/${selectedRole.id}`, {
              method: "DELETE"
            })
          )
        ])
        
        showToast("Role updated successfully", "success")
        setShowRoleModal(false)
        setSelectedRole(null)
        loadRoles()
        loadUsers()
      } else {
        showToast(data.message || "Failed to update role", "error")
      }
    } catch (error) {
      showToast("Failed to update role", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm("Are you sure you want to delete this role?")) return

    try {
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${roleId}`,
        { method: "DELETE" }
      )
      const data = await response.json()
      if (data.success) {
        showToast("Role deleted successfully", "success")
        loadRoles()
      } else {
        showToast(data.message || "Failed to delete role", "error")
      }
    } catch (error) {
      showToast("Failed to delete role", "error")
    }
  }

  // Policy CRUD
  const handleCreatePolicy = async () => {
    if (!policyForm.policy_key || !policyForm.policy_name || !policyForm.target_key) {
      showToast("Policy key, name, and target are required", "error")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/policies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policyForm)
      })
      const data = await response.json()
      if (data.success) {
        showToast("Policy created successfully", "success")
        setShowPolicyModal(false)
        setPolicyForm({
          policy_key: "",
          policy_name: "",
          description: "",
          target_type: "module",
          target_key: "",
          actions: ["view"],
          effect: "allow",
          priority: 100
        })
        loadPolicies()
      } else {
        showToast(data.message || "Failed to create policy", "error")
      }
    } catch (error) {
      showToast("Failed to create policy", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePolicy = async (policyId: number) => {
    if (!confirm("Are you sure you want to delete this policy?")) return

    try {
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/policies/${policyId}`,
        { method: "DELETE" }
      )
      const data = await response.json()
      if (data.success) {
        showToast("Policy deleted successfully", "success")
        loadPolicies()
      } else {
        showToast(data.message || "Failed to delete policy", "error")
      }
    } catch (error) {
      showToast("Failed to delete policy", "error")
    }
  }

  const openAssignRoleModal = async (user: User) => {
    setSelectedUser(user)
    try {
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/users/${user.id}/roles`
      )
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
          headers: { "Content-Type": "application/json" },
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
    } catch (error) {
      showToast("Failed to assign roles", "error")
    } finally {
      setSaving(false)
    }
  }

  const toggleAction = (action: string) => {
    if (policyForm.actions.includes(action)) {
      setPolicyForm({
        ...policyForm,
        actions: policyForm.actions.filter(a => a !== action)
      })
    } else {
      setPolicyForm({
        ...policyForm,
        actions: [...policyForm.actions, action]
      })
    }
  }

  // --- SKELETON LOADERS ---

  const UserCardSkeleton = () => (
    <div
      className="group relative rounded-2xl p-6 transition-all duration-300"
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`
      }}
    >
      {/* Status Indicator Skeleton */}
      <div className="absolute top-6 right-6 w-2 h-2 rounded-full animate-pulse" style={{ background: colors.border }} />

      <div className="flex items-center gap-4 mb-4">
        {/* Avatar Skeleton */}
        <div className="w-12 h-12 rounded-xl border animate-pulse" style={{ background: colors.mutedBg, borderColor: colors.border }} />
        <div className="flex-1">
          {/* Name Skeleton */}
          <div className="h-4 w-32 rounded mb-2 animate-pulse" style={{ background: colors.mutedBg }} />
          {/* Login Skeleton */}
          <div className="h-3 w-24 rounded animate-pulse" style={{ background: colors.mutedBg }} />
        </div>
      </div>

      <div className="space-y-3">
        {/* Roles Skeleton */}
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          <div className="h-5 w-16 rounded-md animate-pulse" style={{ background: colors.mutedBg }} />
          <div className="h-5 w-20 rounded-md animate-pulse" style={{ background: colors.mutedBg }} />
        </div>

        {/* Button Skeleton */}
        <div className="pt-4 border-t" style={{ borderColor: colors.border }}>
          <div className="h-4 w-24 rounded ml-auto animate-pulse" style={{ background: colors.mutedBg }} />
        </div>
      </div>
    </div>
  )

  const RoleCardSkeleton = () => (
    <div 
      className="group relative rounded-2xl p-6 transition-all duration-300"
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`
      }}
    >
      <div className="flex justify-between items-start mb-4">
        {/* Icon Skeleton */}
        <div className="w-12 h-12 rounded-xl animate-pulse" style={{ background: colors.mutedBg }} />
        {/* System Badge Skeleton */}
        <div className="h-5 w-12 rounded animate-pulse" style={{ background: colors.mutedBg }} />
      </div>

      {/* Title Skeleton */}
      <div className="h-6 w-40 rounded mb-2 animate-pulse" style={{ background: colors.mutedBg }} />
      {/* Key Skeleton */}
      <div className="h-4 w-32 rounded mb-4 animate-pulse" style={{ background: colors.mutedBg }} />
      {/* Description Skeleton */}
      <div className="h-10 w-full rounded mb-6 animate-pulse" style={{ background: colors.mutedBg }} />

      {/* Stats Skeleton */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-4 w-16 rounded animate-pulse" style={{ background: colors.mutedBg }} />
        <div className="h-4 w-20 rounded animate-pulse" style={{ background: colors.mutedBg }} />
      </div>

      {/* Buttons Skeleton */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
        <div className="h-8 rounded-lg animate-pulse" style={{ background: colors.mutedBg }} />
        <div className="h-8 rounded-lg animate-pulse" style={{ background: colors.mutedBg }} />
      </div>
    </div>
  )

  const PolicyItemSkeleton = () => (
    <div 
      className="group flex flex-col md:flex-row md:items-center justify-between rounded-xl p-4 transition-all duration-200"
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`
      }}
    >
      <div className="flex items-start gap-4 mb-4 md:mb-0">
        {/* Icon Skeleton */}
        <div className="w-10 h-10 rounded-lg animate-pulse" style={{ background: colors.mutedBg }} />
        <div className="flex-1">
          {/* Name and Key Skeleton */}
          <div className="flex items-center gap-2 mb-1">
            <div className="h-5 w-48 rounded animate-pulse" style={{ background: colors.mutedBg }} />
            <div className="h-4 w-24 rounded animate-pulse" style={{ background: colors.mutedBg }} />
          </div>
          {/* Target Skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 rounded animate-pulse" style={{ background: colors.mutedBg }} />
            <div className="h-4 w-32 rounded animate-pulse" style={{ background: colors.mutedBg }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Actions Skeleton */}
        <div className="flex gap-1.5">
          <div className="h-5 w-12 rounded animate-pulse" style={{ background: colors.mutedBg }} />
          <div className="h-5 w-12 rounded animate-pulse" style={{ background: colors.mutedBg }} />
        </div>
        
        {/* Priority Skeleton */}
        <div className="text-right min-w-[60px]">
          <div className="h-3 w-12 rounded mb-1 animate-pulse" style={{ background: colors.mutedBg }} />
          <div className="h-4 w-8 rounded animate-pulse ml-auto" style={{ background: colors.mutedBg }} />
        </div>

        {/* Buttons Skeleton */}
        <div className="flex items-center gap-2 pl-4 border-l" style={{ borderColor: colors.border }}>
          <div className="w-8 h-8 rounded-lg animate-pulse" style={{ background: colors.mutedBg }} />
          <div className="w-8 h-8 rounded-lg animate-pulse" style={{ background: colors.mutedBg }} />
        </div>
      </div>
    </div>
  )

  // --- RENDER HELPERS ---

  const renderTabs = () => (
    <div className="flex gap-2 p-1 rounded-xl w-fit mb-8 animate-enter" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
      {[
        { key: "users", label: t("Users"), icon: Users },
        { key: "roles", label: t("Roles"), icon: Shield },
        { key: "policies", label: t("Policies"), icon: Key }
      ].map(tab => {
        const isActive = activeTab === tab.key
        return (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key as TabType)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300"
          style={{
              background: isActive ? colors.mutedBg : 'transparent',
              color: isActive ? colors.textPrimary : colors.textSecondary,
              boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = colors.textPrimary
                e.currentTarget.style.background = colors.mutedBg + '80'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = colors.textSecondary
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <tab.icon size={16} style={{ color: isActive ? colors.action : colors.textSecondary }} />
          {tab.label}
        </button>
        )
      })}
    </div>
  )

  const renderUsersTab = () => (
    <div className="space-y-6 animate-enter delay-100">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" size={18} style={{ color: colors.textSecondary }} />
          <input
            placeholder={t("Search users...")}
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="w-full rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all"
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.action + '80'
              e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.action}80`
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
        <button
          onClick={() => loadData()}
          className="px-4 py-3 rounded-xl border transition-colors flex items-center gap-2"
        style={{
            background: colors.card,
            borderColor: colors.border,
            color: colors.textSecondary
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.mutedBg
            e.currentTarget.style.color = colors.textPrimary
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.card
            e.currentTarget.style.color = colors.textSecondary
          }}
        >
          <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          // Show 8 skeleton cards while loading
          Array.from({ length: 8 }).map((_, idx) => (
            <UserCardSkeleton key={`user-skeleton-${idx}`} />
          ))
        ) : (
          filteredUsers.map((user, idx) => (
          <div
            key={user.id}
            className="group relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.action + '50'
              e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.12)`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {/* Status Indicator */}
            <div className={`absolute top-6 right-6 w-2 h-2 rounded-full ${user.active ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl border flex items-center justify-center text-lg font-bold"
                style={{
                  background: `linear-gradient(135deg, ${colors.mutedBg} 0%, ${colors.background} 100%)`,
                  borderColor: colors.border,
                  color: colors.textPrimary
                }}
              >
                {(user.name || user.login).charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold truncate max-w-[150px]" style={{ color: colors.textPrimary }}>{user.name || user.login}</h3>
                <p className="text-xs truncate max-w-[150px]" style={{ color: colors.textSecondary }}>{user.login}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {user.roles && user.roles.length > 0 ? (
                  user.roles.slice(0, 2).map(role => (
                  <span
                    key={role.id}
                      className="text-[10px] px-2 py-1 rounded-md font-medium uppercase tracking-wider border"
                    style={{
                        background: role.role_key === 'super_admin' ? 'rgba(239, 68, 68, 0.1)' : 
                                   role.role_key === 'admin' ? 'rgba(245, 158, 11, 0.1)' : 
                                   colors.mutedBg,
                        color: role.role_key === 'super_admin' ? '#ef4444' : 
                               role.role_key === 'admin' ? '#f59e0b' : 
                               colors.textSecondary,
                        borderColor: role.role_key === 'super_admin' ? 'rgba(239, 68, 68, 0.2)' : 
                                    role.role_key === 'admin' ? 'rgba(245, 158, 11, 0.2)' : 
                                    colors.border
                    }}
                  >
                    {role.role_name}
                  </span>
                  ))
                ) : (
                  <span className="text-[10px] italic" style={{ color: colors.textSecondary }}>No roles assigned</span>
                )}
                {user.roles && user.roles.length > 2 && (
                  <span className="text-[10px] px-2 py-1 rounded-md border"
                    style={{
                      background: colors.mutedBg,
                      color: colors.textSecondary,
                      borderColor: colors.border
                    }}
                  >
                    +{user.roles.length - 2}
                  </span>
                )}
              </div>

              <div className="pt-4 border-t flex justify-end" style={{ borderColor: colors.border }}>
                <button
                onClick={() => openAssignRoleModal(user)}
                  className="text-xs font-semibold transition-colors flex items-center gap-1"
                  style={{ color: colors.action }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Manage Roles <ChevronRight size={12} />
                </button>
            </div>
          </div>
          </div>
          ))
        )}
      </div>
    </div>
  )

  const renderRolesTab = () => (
    <div className="space-y-6 animate-enter delay-100">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" size={18} style={{ color: colors.textSecondary }} />
          <input
            placeholder={t("Search roles...")}
            value={roleSearch}
            onChange={e => setRoleSearch(e.target.value)}
            className="w-full rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all"
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.action + '80'
              e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.action}80`
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
        <button
          onClick={() => {
            setSelectedRole(null)
            setRoleForm({ role_key: "", role_name: "", description: "", is_active: true, policy_ids: [], user_ids: [] })
            setShowRoleModal(true)
          }}
          className="px-6 py-3 rounded-xl font-semibold text-sm shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          style={{
            background: colors.action,
            color: "#FFFFFF"
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <Plus size={16} />
          {t("Create Role")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          // Show 6 skeleton cards while loading
          Array.from({ length: 6 }).map((_, idx) => (
            <RoleCardSkeleton key={`role-skeleton-${idx}`} />
          ))
        ) : (
          filteredRoles.map((role) => (
          <div 
            key={role.id}
            className="group relative rounded-2xl p-6 transition-all duration-300"
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.action + '50'
              e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.12)`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl" style={{ background: colors.action + '1A', color: colors.action }}>
                <Shield size={24} />
                </div>
                {role.is_system && (
                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border"
                    style={{
                    background: colors.action + '33',
                    color: colors.action,
                    borderColor: colors.action + '33'
                    }}
                  >
                    System
                  </span>
                )}
              </div>

            <h3 className="text-xl font-bold mb-1" style={{ color: colors.textPrimary }}>{role.role_name}</h3>
            <p className="text-xs font-mono mb-4 px-2 py-1 rounded w-fit" style={{ color: colors.textSecondary, background: colors.background }}>{role.role_key}</p>
            <p className="text-sm mb-6 line-clamp-2 h-10" style={{ color: colors.textSecondary }}>{role.description || "No description provided."}</p>

            <div className="flex items-center gap-4 mb-6 text-xs" style={{ color: colors.textSecondary }}>
              <div className="flex items-center gap-1.5">
                <Users size={14} />
                <span>{role.users_count || 0} users</span>
                </div>
              <div className="flex items-center gap-1.5">
                <Key size={14} />
                <span>{role.policies_count || 0} policies</span>
              </div>
            </div>

                {!role.is_system && (
              <div className="grid grid-cols-2 gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
                <button
                  onClick={async () => {
                        setSelectedRole(role)
                    try {
                      const [policiesRes, usersRes] = await Promise.all([
                        fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${role.id}/policies`),
                        fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${role.id}/users`)
                      ])
                      const policiesData = await policiesRes.json()
                      const usersData = await usersRes.json()
                        setRoleForm({
                          role_key: role.role_key,
                          role_name: role.role_name,
                          description: role.description || "",
                        is_active: role.is_active,
                        policy_ids: policiesData.success ? policiesData.data.map((p: any) => p.id) : [],
                        user_ids: usersData.success ? usersData.data.map((u: any) => u.id) : []
                        })
                        setShowRoleModal(true)
                    } catch {
                       // Error handling
                    }
                      }}
                  className="py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{
                    background: colors.mutedBg,
                    color: colors.textPrimary
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = colors.border}
                  onMouseLeave={(e) => e.currentTarget.style.background = colors.mutedBg}
                >
                  Edit
                </button>
                <button
                      onClick={() => handleDeleteRole(role.id)}
                  className="py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                >
                  Delete
                </button>
                  </div>
            )}
          </div>
          ))
        )}
      </div>
    </div>
  )

  const renderPoliciesTab = () => (
    <div className="space-y-6 animate-enter delay-100">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" size={18} style={{ color: colors.textSecondary }} />
          <input
            placeholder={t("Search policies...")}
            value={policySearch}
            onChange={e => setPolicySearch(e.target.value)}
            className="w-full rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all"
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.action + '80'
              e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.action}80`
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
        <div className="flex gap-2">
            <button
            onClick={() => navigate("/policy-editor")}
            className="px-6 py-3 rounded-xl font-semibold text-sm shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          style={{
            background: colors.action,
              color: "#FFFFFF"
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
            <Plus size={16} />
          {t("Create Policy")}
            </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          // Show 5 skeleton items while loading
          Array.from({ length: 5 }).map((_, idx) => (
            <PolicyItemSkeleton key={`policy-skeleton-${idx}`} />
          ))
        ) : (
          filteredPolicies.map((policy) => {
             const isSystemPolicy = policy.policy_key === "super_admin_full_access" || 
                                 policy.policy_key === "admin_full_access"

             return (
                <div 
                  key={policy.id}
                  className="group flex flex-col md:flex-row md:items-center justify-between rounded-xl p-4 transition-all duration-200"
        style={{
          background: colors.card,
                    border: `1px solid ${colors.border}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.action + '50'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                  }}
                >
                  <div className="flex items-start gap-4 mb-4 md:mb-0">
                    <div className="p-2 rounded-lg"
                        style={{
                        background: policy.effect === 'allow' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: policy.effect === 'allow' ? '#10b981' : '#ef4444'
                      }}
                    >
                       {policy.effect === 'allow' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                    </div>
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold" style={{ color: colors.textPrimary }}>{policy.policy_name}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: colors.background, color: colors.textSecondary }}>{policy.policy_key}</span>
                       </div>
                       <div className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
                          <span className="px-1.5 py-0.5 rounded border uppercase text-[10px] tracking-wider" style={{ background: colors.mutedBg, borderColor: colors.border }}>{policy.target_type}</span>
                          <ChevronRight size={10} />
                          <span className="font-mono" style={{ color: colors.textPrimary }}>{policy.target_key}</span>
                       </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex gap-1.5 flex-wrap md:justify-end max-w-[200px]">
                      {policy.actions.slice(0, 3).map(action => (
                         <span key={action} className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ background: colors.mutedBg, color: colors.textSecondary }}>
                        {action}
                      </span>
                    ))}
                      {policy.actions.length > 3 && <span className="text-[10px]" style={{ color: colors.textSecondary }}>+{policy.actions.length - 3}</span>}
                  </div>
                    
                    <div className="text-right min-w-[60px]">
                        <span className="block text-[10px] uppercase tracking-wider" style={{ color: colors.textSecondary }}>Priority</span>
                        <span className="text-sm font-mono" style={{ color: colors.textPrimary }}>{policy.priority}</span>
                    </div>

                    {!isSystemPolicy && (
                        <div className="flex items-center gap-2 pl-4 border-l" style={{ borderColor: colors.border }}>
                            <button 
                                onClick={() => navigate(`/policy-editor?id=${policy.id}`)}
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: colors.textSecondary }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = colors.mutedBg
                                  e.currentTarget.style.color = colors.textPrimary
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
             
                          e.currentTarget.style.color = colors.textSecondary
                                }}
                            >
                                <Edit size={16} />
                            </button>
                            <button 
                      onClick={() => handleDeletePolicy(policy.id)}
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: colors.textSecondary }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                                  e.currentTarget.style.color = '#ef4444'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
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
  )

  // --- MODALS ---

  const ModalOverlay = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
      style={{ background: 'rgba(0,0,0,0.5)' }}
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

  const ModalHeader = ({ title, subtitle, onClose }: { title: string, subtitle?: string, onClose: () => void }) => (
    <div className="p-6 border-b flex justify-between items-start" style={{ borderColor: colors.border, background: colors.card }}>
          <div>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>{title}</h2>
        {subtitle && <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>{subtitle}</p>}
          </div>
      <button 
        onClick={onClose} 
        className="p-2 rounded-lg transition-colors"
        style={{ color: colors.textSecondary }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.mutedBg
          e.currentTarget.style.color = colors.textPrimary
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = colors.textSecondary
        }}
      >
        <X size={20} />
      </button>
    </div>
  )

  const ModalFooter = ({ onCancel, onSave, isSaving, saveText = "Save" }: any) => (
    <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: colors.border, background: colors.card }}>
      <button 
        onClick={onCancel} 
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{ color: colors.textSecondary }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = colors.textPrimary
          e.currentTarget.style.background = colors.mutedBg
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = colors.textSecondary
          e.currentTarget.style.background = 'transparent'
        }}
      >
        Cancel
      </button>
      <button 
        onClick={onSave} 
        disabled={isSaving}
        className="px-6 py-2 rounded-lg text-white text-sm font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
        style={{ background: colors.action }}
        onMouseEnter={(e) => {
          if (!isSaving) e.currentTarget.style.opacity = '0.9'
        }}
        onMouseLeave={(e) => {
          if (!isSaving) e.currentTarget.style.opacity = '1'
        }}
      >
        {isSaving && <RefreshCcw size={14} className="animate-spin" />}
        {saveText}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen font-space selection:bg-blue-500/20" style={{ background: colors.background, color: colors.textPrimary }}>
      <style>{`
        .font-space { font-family: 'Space Grotesk', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 3px; }
        @keyframes enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-enter { animation: enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .delay-100 { animation-delay: 100ms; }
      `}</style>

      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
            </div>

      <div className="relative z-10 p-6 md:p-10 max-w-7xl mx-auto">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-enter">
            <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2" style={{ color: colors.textPrimary }}>
              {t("User Management")}
            </h1>
            <p className="font-light max-w-xl" style={{ color: colors.textSecondary }}>
              {t("Manage users, roles, and access control policies")}
            </p>
            </div>
          </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-enter">
            <StatCard label={t("Users")} value={users.length} icon={Users} gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" delay={0} />
            <StatCard label={t("Roles")} value={roles.length} icon={Shield} gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" delay={100} />
            <StatCard label={t("Policies")} value={policies.length} icon={Key} gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)" delay={200} />
            <StatCard label={t("Modules")} value={modules.length} icon={Layers} gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" delay={300} />
          </div>

        {/* Content Tabs */}
        {renderTabs()}
        {activeTab === "users" && renderUsersTab()}
        {activeTab === "roles" && renderRolesTab()}
        {activeTab === "policies" && renderPoliciesTab()}

      </div>

      {/* Role Modal */}
      {showRoleModal && (
        <ModalOverlay onClose={() => setShowRoleModal(false)}>
          <ModalHeader 
            title={selectedRole ? t("Edit Role") : t("Create Role")} 
            subtitle="Define role properties and assign permissions" 
            onClose={() => setShowRoleModal(false)} 
          />
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
            <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>{t("Role Key")} *</label>
                        <input 
                            value={roleForm.role_key}
                            onChange={e => setRoleForm({ ...roleForm, role_key: e.target.value.toLowerCase().replace(/\s/g, "_") })}
                            placeholder="e.g. warehouse_manager"
                            disabled={!!selectedRole}
                            className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 disabled:opacity-50 font-mono"
                style={{
                              background: colors.background,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary
                }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = colors.action + '80'
                              e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.action}80`
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = colors.border
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                        />
            </div>
            <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>{t("Role Name")} *</label>
                        <input 
                            value={roleForm.role_name}
                            onChange={e => setRoleForm({ ...roleForm, role_name: e.target.value })}
                            placeholder="e.g. Warehouse Manager"
                            className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1"
                  style={{
                              background: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary
                  }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = colors.action + '80'
                              e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.action}80`
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = colors.border
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                        />
            </div>
          </div>

          <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>{t("Description")}</label>
                    <textarea 
                        value={roleForm.description}
                        onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                        placeholder="Describe what this role can do..."
                        rows={3}
                        className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 resize-none"
                  style={{
                          background: colors.background,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary
                }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = colors.action + '80'
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.action}80`
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = colors.border
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                    />
        </div>

                <PremiumDropdown 
                    label={t("Assign Policies")}
                    multi={true}
                    options={policies.map(p => ({ label: p.policy_name, value: p.id }))}
                    value={roleForm.policy_ids}
                    onChange={(ids) => setRoleForm({ ...roleForm, policy_ids: ids })}
                    placeholder="Select policies..."
                    colors={colors}
                />

                <PremiumDropdown 
                    label={t("Assign Users")}
                    multi={true}
                    options={users.map(u => ({ label: u.name || u.login, value: u.id }))}
                    value={roleForm.user_ids}
                    onChange={(ids) => setRoleForm({ ...roleForm, user_ids: ids })}
                    placeholder="Select users..."
                    colors={colors}
                />

                <div className="flex items-center gap-3 pt-2">
                    <Checkbox checked={roleForm.is_active} onCheckedChange={checked => setRoleForm({ ...roleForm, is_active: !!checked })} />
                    <label className="text-sm" style={{ color: colors.textPrimary }}>{t("Role is Active")}</label>
        </div>
      </div>
    </div>
          <ModalFooter 
            onCancel={() => setShowRoleModal(false)} 
            onSave={selectedRole ? handleUpdateRole : handleCreateRole} 
            isSaving={saving} 
            saveText={selectedRole ? "Update Role" : "Create Role"} 
          />
        </ModalOverlay>
      )}

      {/* Assign Role Modal */}
      {showAssignRoleModal && (
        <ModalOverlay onClose={() => setShowAssignRoleModal(false)}>
            <ModalHeader 
                title={t("Assign Roles")} 
                subtitle={`Assigning roles to: ${selectedUser?.name || selectedUser?.login}`} 
                onClose={() => setShowAssignRoleModal(false)} 
            />
            <div className="p-6 overflow-y-auto custom-scrollbar">
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
                                  background: isAssigned ? colors.action + '1A' : colors.background,
                                  border: `1px solid ${isAssigned ? colors.action + '50' : colors.border}`
                                }}
                                onMouseEnter={(e) => {
                                  if (!isAssigned) e.currentTarget.style.borderColor = colors.border
                                }}
                                onMouseLeave={(e) => {
                                  if (!isAssigned) e.currentTarget.style.borderColor = colors.border
                                }}
                            >
                                <Checkbox checked={isAssigned} className="mt-1" />
                                <div>
                                    <div className="font-semibold text-sm" style={{ color: isAssigned ? colors.action : colors.textPrimary }}>
                  {role.role_name}
                  {role.is_system && (
                                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded uppercase border"
                      style={{
                                              background: colors.action + '33',
                                              color: colors.action,
                                              borderColor: colors.action + '33'
                      }}
                    >
                      System
                    </span>
                  )}
                </div>
                                    <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>{role.description || role.role_key}</div>
      </div>
    </div>
  )
                    })}
      </div>
            </div>
            <ModalFooter 
                onCancel={() => setShowAssignRoleModal(false)} 
                onSave={handleAssignRoles} 
                isSaving={saving} 
                saveText="Save Assignments"
            />
        </ModalOverlay>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}