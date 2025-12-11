"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { useAuth } from "../context/auth"
import { API_CONFIG } from "./config/api"
import {
  XCircle,
  Users,
  Shield,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Key,
  Save,
  RefreshCcw,
  CheckCircle2,
  Layers,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../@/components/ui/card"
import { Button } from "../@/components/ui/button"
import { Input } from "../@/components/ui/input"
import { Checkbox } from "../@/components/ui/checkbox"
import Toast from "./components/Toast"
import { StatCard } from "./components/StatCard"
import { DataTable } from "./components/DataTable"

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

export default function UserManagementPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const { sessionId, uid } = useAuth()

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
    is_active: true
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
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/users`, {
        headers: { "Content-Type": "application/json" }
      })
      const data = await response.json()
      if (data.success && Array.isArray(data.users)) {
        // Also load roles for each user
        const usersWithRoles = await Promise.all(
          data.users.map(async (user: User) => {
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
        // Also load pages for each module
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
        showToast("Role created successfully", "success")
        setShowRoleModal(false)
        setRoleForm({ role_key: "", role_name: "", description: "", is_active: true })
        loadRoles()
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
        showToast("Role updated successfully", "success")
        setShowRoleModal(false)
        setSelectedRole(null)
        loadRoles()
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

  // User role assignment
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

  // Assign policy to role
  const handleAssignPolicyToRole = async (roleId: number, policyId: number) => {
    try {
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/roles/${roleId}/policies`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ policy_ids: [policyId] })
        }
      )
      const data = await response.json()
      if (data.success) {
        showToast("Policy assigned to role", "success")
        loadRoles()
      } else {
        showToast(data.message || "Failed to assign policy", "error")
      }
    } catch (error) {
      showToast("Failed to assign policy", "error")
    }
  }

  // Actions toggle
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

  // Render tabs
  const renderTabs = () => (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        borderBottom: `1px solid ${colors.border}`,
        marginBottom: "1.5rem",
        paddingBottom: "0.5rem"
      }}
    >
      {[
        { key: "users", label: t("Users"), icon: Users },
        { key: "roles", label: t("Roles"), icon: Shield },
        { key: "policies", label: t("Policies"), icon: Key }
      ].map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key as TabType)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1.25rem",
            borderRadius: "0.5rem 0.5rem 0 0",
            border: "none",
            background: activeTab === tab.key ? colors.action : "transparent",
            color: activeTab === tab.key ? "#FFFFFF" : colors.textSecondary,
            fontWeight: activeTab === tab.key ? 600 : 500,
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          <tab.icon size={18} />
          {tab.label}
        </button>
      ))}
    </div>
  )

  // Render Users Tab
  const renderUsersTab = () => (
    <div>
      {/* Search and Actions */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.textSecondary
            }}
          />
          <Input
            placeholder={t("Search users...")}
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            style={{
              paddingLeft: "40px",
              background: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => loadData()}
          disabled={loading}
          className="gap-2 font-semibold border"
        style={{
              background: colors.card,
            color: colors.textPrimary,
            borderColor: colors.border,
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? t("Loading...") : t("Refresh")}
        </Button>
              </div>

      {/* Users DataTable */}
      <DataTable
        data={filteredUsers}
        isLoading={loading}
        showPagination={true}
        defaultItemsPerPage={10}
        columns={[
          {
            id: "user",
            header: t("User"),
            cell: ({ row }) => {
              const user = row.original as User
              return (
              <div>
                  <div style={{ fontWeight: 600, color: colors.textPrimary, fontSize: "0.875rem" }}>
                  {user.name || user.login}
                </div>
                  <div style={{ fontSize: "0.75rem", color: colors.textSecondary }}>
                  {user.login}
                </div>
              </div>
              )
            },
          },
          {
            id: "roles",
            header: t("Roles"),
            cell: ({ row }) => {
              const user = row.original as User
              return (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {user.roles?.slice(0, 3).map(role => (
                  <span
                    key={role.id}
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "1rem",
                      background: role.role_key === "super_admin" 
                        ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                        : role.role_key === "admin"
                        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        : colors.mutedBg,
                      color: role.role_key === "super_admin" || role.role_key === "admin" 
                        ? "#FFFFFF" 
                        : colors.textPrimary,
                      fontSize: "0.75rem",
                      fontWeight: 500
                    }}
                  >
                    {role.role_name}
                  </span>
                ))}
                {(user.roles?.length || 0) > 3 && (
                  <span
                    style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "1rem",
                      background: colors.mutedBg,
                      color: colors.textSecondary,
                      fontSize: "0.75rem"
                    }}
                  >
                    +{(user.roles?.length || 0) - 3}
                  </span>
                )}
              </div>
              )
            },
          },
          {
            id: "status",
            header: t("Status"),
            cell: ({ row }) => {
              const user = row.original as User
              const statusColor = user.active
                ? { bg: colors.tableDoneBg, text: colors.tableDoneText }
                : { bg: colors.tableCancelledBg, text: colors.tableCancelledText }
              return (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
              <span
                style={{
                      display: "inline-flex",
                      alignItems: "center",
                  padding: "0.25rem 0.75rem",
                      borderRadius: "999px",
                      background: statusColor.bg,
                      color: statusColor.text,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                }}
              >
                {user.active ? t("Active") : t("Inactive")}
              </span>
                </div>
              )
            },
          },
        ]}
        actions={(user) => [
          {
            key: "manage",
            label: t("Manage Roles"),
            icon: Shield,
            onClick: () => openAssignRoleModal(user as User),
          },
        ]}
        actionsLabel={t("Actions")}
        isRTL={isRTL}
        getRowIcon={(user) => {
          const u = user as User
          if (u.active) {
            return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
          }
          return { icon: XCircle, gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }
        }}
      />
    </div>
  )

  // Render Roles Tab
  const renderRolesTab = () => (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto", flexWrap: isMobile ? "wrap" : "nowrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.textSecondary
            }}
          />
          <Input
            placeholder={t("Search roles...")}
            value={roleSearch}
            onChange={e => setRoleSearch(e.target.value)}
            style={{
              paddingLeft: "40px",
              background: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary
            }}
          />
        </div>
        <Button
          onClick={() => {
            setSelectedRole(null)
            setRoleForm({ role_key: "", role_name: "", description: "", is_active: true })
            setShowRoleModal(true)
          }}
          style={{
            background: colors.action,
            color: "#FFFFFF",
            padding: isMobile ? "0.625rem 1rem" : "0.75rem 1.5rem",
            borderRadius: "8px",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            width: isMobile ? "100%" : "auto",
            justifyContent: "center",
          }}
        >
          <Plus size={isMobile ? 18 : 20} />
          {t("Create Role")}
        </Button>
      </div>

      {/* Roles DataTable */}
      <DataTable
        data={filteredRoles}
        isLoading={loading}
        showPagination={true}
        defaultItemsPerPage={10}
        columns={[
          {
            id: "role",
            header: t("Role"),
            cell: ({ row }) => {
              const role = row.original as Role
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Shield size={20} style={{ color: role.is_system ? colors.action : colors.textSecondary }} />
                  <div>
                    <div style={{ fontWeight: 600, color: colors.textPrimary, fontSize: "0.875rem" }}>
                      {role.role_name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: colors.textSecondary }}>
                      {role.role_key}
                    </div>
                  </div>
                </div>
              )
            },
          },
          {
            id: "description",
            header: t("Description"),
            cell: ({ row }) => {
              const role = row.original as Role
              return (
                <span style={{ fontSize: "0.875rem", color: colors.textSecondary }}>
                  {role.description || t("No description")}
                </span>
              )
            },
          },
          {
            id: "stats",
            header: t("Statistics"),
            cell: ({ row }) => {
              const role = row.original as Role
              return (
                <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: colors.textSecondary }}>
                  <span><Users size={14} style={{ display: "inline", marginRight: "0.25rem" }} />{role.users_count || 0} {t("users")}</span>
                  <span><Key size={14} style={{ display: "inline", marginRight: "0.25rem" }} />{role.policies_count || 0} {t("policies")}</span>
                </div>
              )
            },
          },
          {
            id: "system",
            header: t("Type"),
            cell: ({ row }) => {
              const role = row.original as Role
              if (role.is_system) {
                return (
                  <span
                    style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.25rem",
                      background: colors.action,
                      color: "#FFFFFF",
                      fontSize: "0.625rem",
                      fontWeight: 600,
                      textTransform: "uppercase"
                    }}
                  >
                    {t("System")}
                  </span>
                )
              }
              return <span style={{ fontSize: "0.875rem", color: colors.textSecondary }}>—</span>
            },
          },
        ]}
        actions={(role) => {
          const r = role as Role
          if (r.is_system) return []
          return [
            {
              key: "edit",
              label: t("Edit"),
              icon: Edit,
              onClick: () => {
                setSelectedRole(r)
                        setRoleForm({
                  role_key: r.role_key,
                  role_name: r.role_name,
                  description: r.description || "",
                  is_active: r.is_active
                        })
                        setShowRoleModal(true)
              },
            },
            {
              key: "delete",
              label: t("Delete"),
              icon: Trash2,
              onClick: () => handleDeleteRole(r.id),
              danger: true,
            },
          ]
        }}
        actionsLabel={t("Actions")}
        isRTL={isRTL}
        getRowIcon={(role) => {
          const r = role as Role
          if (r.is_system) {
            return { icon: Shield, gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" }
          }
          return { icon: Shield, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }
        }}
      />
    </div>
  )

  // Render Policies Tab
  const renderPoliciesTab = () => (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "center", width: isMobile ? "100%" : "auto", flexWrap: isMobile ? "wrap" : "nowrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.textSecondary
            }}
          />
          <Input
            placeholder={t("Search policies...")}
            value={policySearch}
            onChange={e => setPolicySearch(e.target.value)}
            style={{
              paddingLeft: "40px",
              background: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary
            }}
          />
        </div>
        <Button
          onClick={() => {
            setSelectedPolicy(null)
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
            setShowPolicyModal(true)
          }}
          style={{
            background: colors.action,
            color: "#FFFFFF",
            padding: isMobile ? "0.625rem 1rem" : "0.75rem 1.5rem",
            borderRadius: "8px",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            width: isMobile ? "100%" : "auto",
            justifyContent: "center",
          }}
        >
          <Plus size={isMobile ? 18 : 20} />
          {t("Create Policy")}
        </Button>
      </div>

      {/* Policies DataTable */}
      <DataTable
        data={filteredPolicies}
        isLoading={loading}
        showPagination={true}
        defaultItemsPerPage={10}
        columns={[
          {
            id: "policy",
            header: t("Policy"),
            cell: ({ row }) => {
              const policy = row.original as Policy
              return (
                <div>
                  <div style={{ fontWeight: 600, color: colors.textPrimary, fontSize: "0.875rem" }}>
                    {policy.policy_name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: colors.textSecondary }}>
                    {policy.policy_key}
                  </div>
                </div>
              )
            },
          },
          {
            id: "target",
            header: t("Target"),
            cell: ({ row }) => {
              const policy = row.original as Policy
              return (
                  <span
                    style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.25rem",
                      background: colors.mutedBg,
                      color: colors.textPrimary,
                      fontSize: "0.75rem"
                    }}
                  >
                    {policy.target_type}: {policy.target_key}
                  </span>
              )
            },
          },
          {
            id: "actions",
            header: t("Actions"),
            cell: ({ row }) => {
              const policy = row.original as Policy
              return (
                  <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                    {policy.actions?.map(action => (
                      <span
                        key={action}
                        style={{
                          padding: "0.125rem 0.375rem",
                          borderRadius: "0.25rem",
                          background: colors.action + "20",
                          color: colors.action,
                          fontSize: "0.625rem",
                          fontWeight: 500
                        }}
                      >
                        {action}
                      </span>
                    ))}
                  </div>
              )
            },
          },
          {
            id: "effect",
            header: t("Effect"),
            cell: ({ row }) => {
              const policy = row.original as Policy
              const effectColor = policy.effect === "allow"
                ? { bg: colors.tableDoneBg, text: colors.tableDoneText }
                : { bg: colors.tableCancelledBg, text: colors.tableCancelledText }
              return (
                  <span
                    style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "999px",
                    background: effectColor.bg,
                    color: effectColor.text,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    }}
                  >
                    {policy.effect}
                  </span>
              )
            },
          },
          {
            id: "priority",
            header: t("Priority"),
            cell: ({ row }) => {
              const policy = row.original as Policy
              return (
                <span style={{ fontSize: "0.875rem", color: colors.textSecondary }}>
                  {policy.priority}
                </span>
              )
            },
          },
        ]}
        actions={(policy) => [
          {
            key: "delete",
            label: t("Delete"),
            icon: Trash2,
            onClick: () => handleDeletePolicy((policy as Policy).id),
            danger: true,
          },
        ]}
        actionsLabel={t("Actions")}
        isRTL={isRTL}
        getRowIcon={(policy) => {
          const p = policy as Policy
          if (p.effect === "allow") {
            return { icon: CheckCircle2, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }
          }
          return { icon: XCircle, gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }
        }}
      />
    </div>
  )

  // Role Modal
  const renderRoleModal = () => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "1rem",
      }}
      onClick={() => setShowRoleModal(false)}
    >
      <Card
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.card,
          borderRadius: 16,
          width: "min(100%, 500px)",
          maxHeight: "95vh",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "-1.5rem -1.5rem 1.5rem -1.5rem",
          }}
        >
          <h2 style={{ color: colors.textPrimary, fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
          {selectedRole ? t("Edit Role") : t("Create Role")}
        </h2>
          <Button
            onClick={() => setShowRoleModal(false)}
            style={{
              padding: "0.5rem",
              background: "transparent",
              border: "none",
              color: colors.textSecondary,
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </Button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: colors.textSecondary, fontSize: "0.875rem" }}>
              {t("Role Key")} *
            </label>
            <Input
              value={roleForm.role_key}
              onChange={e => setRoleForm({ ...roleForm, role_key: e.target.value.toLowerCase().replace(/\s/g, "_") })}
              placeholder="e.g., warehouse_manager"
              disabled={!!selectedRole}
              style={{
                background: colors.mutedBg,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: colors.textSecondary, fontSize: "0.875rem" }}>
              {t("Role Name")} *
            </label>
            <Input
              value={roleForm.role_name}
              onChange={e => setRoleForm({ ...roleForm, role_name: e.target.value })}
              placeholder="e.g., Warehouse Manager"
              style={{
                background: colors.mutedBg,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: colors.textSecondary, fontSize: "0.875rem" }}>
              {t("Description")}
            </label>
            <textarea
              value={roleForm.description}
              onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
              placeholder="Describe what this role can do..."
              rows={3}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                background: colors.mutedBg,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
                resize: "none"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Checkbox
              checked={roleForm.is_active}
              onCheckedChange={checked => setRoleForm({ ...roleForm, is_active: !!checked })}
            />
            <label style={{ color: colors.textPrimary, fontSize: "0.875rem" }}>
              {t("Active")}
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
          <Button
            onClick={() => setShowRoleModal(false)}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              borderRadius: "0.5rem"
            }}
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={selectedRole ? handleUpdateRole : handleCreateRole}
            disabled={saving}
            style={{
              padding: "0.5rem 1rem",
              background: colors.action,
              color: "#FFFFFF",
              border: "none",
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            {saving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
            {selectedRole ? t("Update") : t("Create")}
          </Button>
        </div>
      </Card>
    </div>
  )

  // Policy Modal
  const renderPolicyModal = () => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "1rem",
      }}
      onClick={() => setShowPolicyModal(false)}
    >
      <Card
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.card,
          borderRadius: 16,
          width: "min(100%, 600px)",
          maxHeight: "95vh",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "-1.5rem -1.5rem 1.5rem -1.5rem",
          }}
        >
          <h2 style={{ color: colors.textPrimary, fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
          {t("Create Policy")}
        </h2>
          <Button
            onClick={() => setShowPolicyModal(false)}
            style={{
              padding: "0.5rem",
              background: "transparent",
              border: "none",
              color: colors.textSecondary,
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </Button>
        </div>
        <div style={{ overflow: "auto", flex: 1 }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: colors.textSecondary, fontSize: "0.875rem" }}>
                {t("Policy Key")} *
              </label>
              <Input
                value={policyForm.policy_key}
                onChange={e => setPolicyForm({ ...policyForm, policy_key: e.target.value.toLowerCase().replace(/\s/g, "-") })}
                placeholder="e.g., manager-view-products"
                style={{
                  background: colors.mutedBg,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: colors.textSecondary, fontSize: "0.875rem" }}>
                {t("Policy Name")} *
              </label>
              <Input
                value={policyForm.policy_name}
                onChange={e => setPolicyForm({ ...policyForm, policy_name: e.target.value })}
                placeholder="e.g., Manager - View Products"
                style={{
                  background: colors.mutedBg,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: colors.textSecondary, fontSize: "0.875rem" }}>
              {t("Description")}
            </label>
            <textarea
              value={policyForm.description}
              onChange={e => setPolicyForm({ ...policyForm, description: e.target.value })}
              placeholder="Describe what this policy grants or denies..."
              rows={2}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                background: colors.mutedBg,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
                resize: "none"
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: colors.textSecondary, fontSize: "0.875rem" }}>
                {t("Target Type")} *
              </label>
              <select
                value={policyForm.target_type}
                onChange={e => setPolicyForm({ ...policyForm, target_type: e.target.value, target_key: "" })}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  background: colors.mutedBg,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary
                }}
              >
                <option value="module">Module</option>
                <option value="page">Page</option>
                <option value="section">Section</option>
                <option value="field">Field</option>
                <option value="resource">Resource</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: colors.textSecondary, fontSize: "0.875rem" }}>
                {t("Target")} *
              </label>
              {policyForm.target_type === "module" ? (
                <select
                  value={policyForm.target_key}
                  onChange={e => setPolicyForm({ ...policyForm, target_key: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    background: colors.mutedBg,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary
                  }}
                >
                  <option value="">Select module...</option>
                  <option value="*">All Modules (*)</option>
                  {modules.map(m => (
                    <option key={m.id} value={m.module_key}>{m.module_name}</option>
                  ))}
                </select>
              ) : policyForm.target_type === "page" ? (
                <select
                  value={policyForm.target_key}
                  onChange={e => setPolicyForm({ ...policyForm, target_key: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    background: colors.mutedBg,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary
                  }}
                >
                  <option value="">Select page...</option>
                  <option value="*">All Pages (*)</option>
                  {modules.flatMap(m => m.pages || []).map(p => (
                    <option key={p.id} value={p.page_key}>{p.page_name}</option>
                  ))}
                </select>
              ) : (
                <Input
                  value={policyForm.target_key}
                  onChange={e => setPolicyForm({ ...policyForm, target_key: e.target.value })}
                  placeholder="Enter target key..."
                  style={{
                    background: colors.mutedBg,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary
                  }}
                />
              )}
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: colors.textSecondary, fontSize: "0.875rem" }}>
              {t("Allowed Actions")} *
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {["view", "edit", "create", "delete", "export", "import", "execute"].map(action => (
                <button
                  key={action}
                  onClick={() => toggleAction(action)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: `1px solid ${policyForm.actions.includes(action) ? colors.action : colors.border}`,
                    background: policyForm.actions.includes(action) ? colors.action : "transparent",
                    color: policyForm.actions.includes(action) ? "#FFFFFF" : colors.textPrimary,
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: colors.textSecondary, fontSize: "0.875rem" }}>
                {t("Effect")} *
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setPolicyForm({ ...policyForm, effect: "allow" })}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: `1px solid ${policyForm.effect === "allow" ? "#22c55e" : colors.border}`,
                    background: policyForm.effect === "allow" ? "rgba(34, 197, 94, 0.1)" : "transparent",
                    color: policyForm.effect === "allow" ? "#22c55e" : colors.textPrimary,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem"
                  }}
                >
                  <CheckCircle2 size={18} />
                  Allow
                </button>
                <button
                  onClick={() => setPolicyForm({ ...policyForm, effect: "deny" })}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: `1px solid ${policyForm.effect === "deny" ? "#ef4444" : colors.border}`,
                    background: policyForm.effect === "deny" ? "rgba(239, 68, 68, 0.1)" : "transparent",
                    color: policyForm.effect === "deny" ? "#ef4444" : colors.textPrimary,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem"
                  }}
                >
                  <X size={18} />
                  Deny
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: colors.textSecondary, fontSize: "0.875rem" }}>
                {t("Priority")}
              </label>
              <Input
                type="number"
                value={policyForm.priority}
                onChange={e => setPolicyForm({ ...policyForm, priority: parseInt(e.target.value) || 100 })}
                placeholder="100"
                style={{
                  background: colors.mutedBg,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary
                }}
              />
              <p style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: colors.textSecondary }}>
                Lower = higher priority
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
          <Button
            onClick={() => setShowPolicyModal(false)}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              borderRadius: "0.5rem"
            }}
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleCreatePolicy}
            disabled={saving}
            style={{
              padding: "0.5rem 1rem",
              background: colors.action,
              color: "#FFFFFF",
              border: "none",
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            {saving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
            {t("Create")}
          </Button>
        </div>
      </div>
      </Card>
    </div>
  )

  // Assign Role Modal
  const renderAssignRoleModal = () => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "1rem",
      }}
      onClick={() => setShowAssignRoleModal(false)}
    >
      <Card
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.card,
          borderRadius: 16,
          width: "min(100%, 500px)",
          maxHeight: "95vh",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "-1.5rem -1.5rem 1.5rem -1.5rem",
          }}
        >
          <div>
            <h2 style={{ color: colors.textPrimary, fontSize: "1.25rem", fontWeight: 600, margin: 0, marginBottom: "0.25rem" }}>
          {t("Manage User Roles")}
        </h2>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: "0.875rem" }}>
          {t("Assigning roles to")}: <strong>{selectedUser?.name || selectedUser?.login}</strong>
        </p>
          </div>
          <Button
            onClick={() => setShowAssignRoleModal(false)}
            style={{
              padding: "0.5rem",
              background: "transparent",
              border: "none",
              color: colors.textSecondary,
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </Button>
        </div>
        <div style={{ overflow: "auto", flex: 1 }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {roles.map(role => (
            <label
              key={role.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                background: userRoles.includes(role.id) ? colors.action + "15" : colors.mutedBg,
                border: `1px solid ${userRoles.includes(role.id) ? colors.action : colors.border}`,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <Checkbox
                checked={userRoles.includes(role.id)}
                onCheckedChange={checked => {
                  if (checked) {
                    setUserRoles([...userRoles, role.id])
                  } else {
                    setUserRoles(userRoles.filter(id => id !== role.id))
                  }
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: colors.textPrimary, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {role.role_name}
                  {role.is_system && (
                    <span
                      style={{
                        padding: "0.125rem 0.375rem",
                        borderRadius: "0.25rem",
                        background: colors.action,
                        color: "#FFFFFF",
                        fontSize: "0.625rem",
                        fontWeight: 600
                      }}
                    >
                      System
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.75rem", color: colors.textSecondary }}>
                  {role.description || role.role_key}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
          <Button
            onClick={() => setShowAssignRoleModal(false)}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              borderRadius: "0.5rem"
            }}
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleAssignRoles}
            disabled={saving}
            style={{
              padding: "0.5rem 1rem",
              background: colors.action,
              color: "#FFFFFF",
              border: "none",
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            {saving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
            {t("Save")}
          </Button>
        </div>
      </div>
      </Card>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: colors.background }}>
      <div
        style={{
          background: colors.background,
          padding: isMobile ? "1rem" : "2rem",
          color: colors.textPrimary,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? "1rem" : "0",
            marginBottom: "2rem"
          }}>
            <div>
              <h1 style={{
                fontSize: isMobile ? "1.5rem" : "2rem",
                fontWeight: "700",
                marginBottom: "0.5rem",
                color: colors.textPrimary
              }}>
          {t("User Management")}
        </h1>
              <p style={{ fontSize: isMobile ? "0.875rem" : "1rem", opacity: 0.9, color: colors.textSecondary }}>
          {t("Manage users, roles, and access control policies")}
        </p>
            </div>
      </div>

      {/* Stats Cards */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <StatCard
              label={t("Users")}
              value={users.length}
              icon={Users}
              gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
              delay={0}
            />
            <StatCard
              label={t("Roles")}
              value={roles.length}
              icon={Shield}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              delay={1}
            />
            <StatCard
              label={t("Policies")}
              value={policies.length}
              icon={Key}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              delay={2}
            />
            <StatCard
              label={t("Modules")}
              value={modules.length}
              icon={Layers}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              delay={3}
            />
      </div>

      {/* Main Content */}
      <Card style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "0.75rem" }}>
        <CardContent style={{ padding: "1.5rem" }}>
          {renderTabs()}
          
              {activeTab === "users" && renderUsersTab()}
              {activeTab === "roles" && renderRolesTab()}
              {activeTab === "policies" && renderPoliciesTab()}
        </CardContent>
      </Card>

      {/* Modals */}
      {showRoleModal && renderRoleModal()}
      {showPolicyModal && renderPolicyModal()}
      {showAssignRoleModal && renderAssignRoleModal()}

      {/* Toast */}
      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}
        </div>
      </div>
    </div>
  )
}

