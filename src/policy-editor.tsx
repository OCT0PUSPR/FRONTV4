"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { useNavigate, useLocation } from "react-router"
import { API_CONFIG, getTenantHeaders } from "./config/api"
import {
  ArrowLeft,
  Save,
  RefreshCcw,
  ChevronDown,
  ChevronRight,
  Shield,
  Layout,
  FileText,
  Check,
  X
} from "lucide-react"
import Toast from "./components/Toast"

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
  module_id: number
  model_name?: string
}

interface Permission {
  target_type: "module" | "page"
  target_id: number
  target_key: string
  can_read: boolean
  can_edit: boolean
  can_create: boolean
  can_delete: boolean
  can_export: boolean
}

interface SmartField {
  id: number
  field_name: string
  field_label: string
  field_type: string
  is_required: boolean
  is_readonly: boolean
  display_group: string
}

interface FieldPermission {
  field_id: number
  can_view: boolean
  can_edit: boolean
}

interface PolicyData {
  id?: number
  policy_key: string
  policy_name: string
  description: string
  effect: "allow" | "deny"
  priority: number
}

export default function PolicyEditorPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors, mode } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const policyId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)

  const [modules, setModules] = useState<Module[]>([])
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())

  const [policyForm, setPolicyForm] = useState<PolicyData>({
    policy_key: "",
    policy_name: "",
    description: "",
    effect: "allow",
    priority: 100,
  })

  // Permissions state: key is "module_${id}" or "page_${id}"
  const [permissions, setPermissions] = useState<Record<string, Permission>>({})

  // Field permissions state: key is page_key, value is map of field_id -> FieldPermission
  const [fieldPermissions, setFieldPermissions] = useState<Record<string, Record<number, FieldPermission>>>({})
  
  // Smart fields per page: key is page_key
  const [pageSmartFields, setPageSmartFields] = useState<Record<string, SmartField[]>>({})
  
  // Expanded pages for field-level permissions
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set())

  const permissionColumns = [
    { key: "can_read", label: t("Read") },
    { key: "can_edit", label: t("Edit") },
    { key: "can_create", label: t("Create") },
    { key: "can_delete", label: t("Delete") },
    { key: "can_export", label: t("Export") },
  ]

  useEffect(() => {
    loadData()
  }, [policyId])

  // Helper to get headers with tenant ID
  const getHeaders = () => getTenantHeaders()

  const loadData = async () => {
    setLoading(true)
    try {
      // Load modules with pages
      const modulesRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/registry/modules`, { headers: getHeaders() })
      const modulesData = await modulesRes.json()
      
      let modulesWithPages: Module[] = []
      if (modulesData.success) {
        // Load pages for each module
        modulesWithPages = await Promise.all(
          (modulesData.data || []).map(async (module: Module) => {
            const pagesRes = await fetch(
              `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/registry/modules/${module.id}/pages`,
              { headers: getHeaders() }
            )
            const pagesData = await pagesRes.json()
            return {
              ...module,
              pages: pagesData.success ? pagesData.data : []
            }
          })
        )
        setModules(modulesWithPages)
      }

      // If editing existing policy, load it and its permissions
      if (policyId) {
        const policyRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/policies/${policyId}`, { headers: getHeaders() })
        const policyData = await policyRes.json()
        if (policyData.success) {
          const policy = policyData.data
          setPolicyForm({
            id: policy.id,
            policy_key: policy.policy_key,
            policy_name: policy.policy_name,
            description: policy.description || "",
            effect: policy.effect,
            priority: policy.priority,
          })
          
          // Load existing permissions
          const permsRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/policies/${policyId}/permissions`, { headers: getHeaders() })
          const permsData = await permsRes.json()
          if (permsData.success && permsData.data) {
            const loadedPerms: Record<string, Permission> = {}
            for (const perm of permsData.data) {
              const key = `${perm.target_type}_${perm.target_id}`
              loadedPerms[key] = {
                target_type: perm.target_type,
                target_id: perm.target_id,
                target_key: perm.target_key,
                can_read: Boolean(perm.can_read),
                can_edit: Boolean(perm.can_edit),
                can_create: Boolean(perm.can_create),
                can_delete: Boolean(perm.can_delete),
                can_export: Boolean(perm.can_export),
              }
            }
            setPermissions(loadedPerms)
            
            // Expand modules that have permissions
            const modulesWithPerms = new Set<number>()
            for (const perm of permsData.data) {
              if (perm.target_type === "page") {
                // Find the module for this page
                for (const mod of modulesWithPages) {
                  if (mod.pages?.some((p: Page) => p.id === perm.target_id)) {
                    modulesWithPerms.add(mod.id)
                  }
                }
              }
            }
            setExpandedModules(modulesWithPerms)
          }
          
          // Load field permissions (only if policy exists)
          try {
            const fieldsRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/policies/${policyId}/fields`, { headers: getHeaders() })
            if (fieldsRes.ok) {
              const fieldsData = await fieldsRes.json()
              if (fieldsData.success && fieldsData.data) {
                const loadedFieldPerms: Record<string, Record<number, FieldPermission>> = {}
                for (const fp of fieldsData.data) {
                  // Group by model_name (we'll map to page_key later)
                  const modelName = fp.model_name
                  // Find the page key for this model
                  for (const mod of modulesWithPages) {
                    const page = mod.pages?.find((p: any) => p.model_name === modelName)
                    if (page) {
                      if (!loadedFieldPerms[page.page_key]) {
                        loadedFieldPerms[page.page_key] = {}
                      }
                      loadedFieldPerms[page.page_key][fp.field_id] = {
                        field_id: fp.field_id,
                        can_view: Boolean(fp.can_view),
                        can_edit: Boolean(fp.can_edit),
                      }
                      break
                    }
                  }
                }
                setFieldPermissions(loadedFieldPerms)
              }
            }
          } catch (fieldError) {
            console.warn("Could not load field permissions:", fieldError)
            // Don't fail the whole load if field permissions fail
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error)
      showToast("Failed to load data", "error")
    } finally {
      setLoading(false)
    }
  }

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
    setTimeout(() => setToast(null), 3000)
  }

  const toggleModule = (moduleId: number) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  // Load smart fields for a page when expanding field permissions
  const loadPageSmartFields = async (pageKey: string, pageId: number) => {
    if (pageSmartFields[pageKey]) return // Already loaded
    
    try {
      const res = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/registry/pages/${pageId}/smart-fields`,
        { headers: getHeaders() }
      )
      const data = await res.json()
      if (data.success) {
        setPageSmartFields(prev => ({
          ...prev,
          [pageKey]: data.data || []
        }))
      }
    } catch (error) {
      console.error("Error loading smart fields:", error)
    }
  }

  // Toggle expanded state for page field permissions
  const togglePageFields = async (pageKey: string, pageId: number) => {
    const newExpanded = new Set(expandedPages)
    if (newExpanded.has(pageKey)) {
      newExpanded.delete(pageKey)
    } else {
      newExpanded.add(pageKey)
      // Load smart fields if not already loaded
      await loadPageSmartFields(pageKey, pageId)
    }
    setExpandedPages(newExpanded)
  }

  // Toggle field permission
  const toggleFieldPermission = (pageKey: string, fieldId: number, permType: 'can_view' | 'can_edit') => {
    setFieldPermissions(prev => {
      const pagePerms = prev[pageKey] || {}
      const fieldPerm = pagePerms[fieldId] || { field_id: fieldId, can_view: true, can_edit: true }
      
      return {
        ...prev,
        [pageKey]: {
          ...pagePerms,
          [fieldId]: {
            ...fieldPerm,
            [permType]: !fieldPerm[permType]
          }
        }
      }
    })
  }

  // Set all field permissions for a page
  const setAllFieldPermissions = (pageKey: string, permType: 'can_view' | 'can_edit', value: boolean) => {
    const fields = pageSmartFields[pageKey] || []
    if (fields.length === 0) return
    
    setFieldPermissions(prev => {
      const pagePerms = { ...(prev[pageKey] || {}) }
      fields.forEach(field => {
        pagePerms[field.id] = {
          field_id: field.id,
          can_view: permType === 'can_view' ? value : (pagePerms[field.id]?.can_view ?? true),
          can_edit: permType === 'can_edit' ? value : (pagePerms[field.id]?.can_edit ?? true),
        }
      })
      return { ...prev, [pageKey]: pagePerms }
    })
  }

  // Check if page has any field restrictions
  const hasFieldRestrictions = (pageKey: string): boolean => {
    const perms = fieldPermissions[pageKey]
    if (!perms) return false
    return Object.values(perms).some(fp => !fp.can_view || !fp.can_edit)
  }

  const getPermissionKey = (type: "module" | "page", id: number) => `${type}_${id}`

  const hasAnyPermission = (type: "module" | "page", id: number): boolean => {
    const key = getPermissionKey(type, id)
    const perm = permissions[key]
    if (!perm) return false
    return perm.can_read || perm.can_edit || perm.can_create || perm.can_delete || perm.can_export
  }

  const togglePermission = (
    type: "module" | "page",
    id: number,
    targetKey: string,
    permissionKey: string
  ) => {
    const key = getPermissionKey(type, id)
    const currentPerm = permissions[key] || {
      target_type: type,
      target_id: id,
      target_key: targetKey,
      can_read: false,
      can_edit: false,
      can_create: false,
      can_delete: false,
      can_export: false,
    }

    const newPermValue = !currentPerm[permissionKey as keyof Permission]
    const updatedPermissions = {
      ...permissions,
      [key]: {
        ...currentPerm,
        [permissionKey]: newPermValue,
      },
    }

    // If this is a module permission change
    if (type === "module") {
      const module = modules.find(m => m.id === id)
      if (module && module.pages) {
        // When ANY permission is checked on module, automatically check that same permission for ALL pages
        if (newPermValue) {
          module.pages.forEach((page) => {
            const pageKey = getPermissionKey("page", page.id)
            const currentPagePerm = updatedPermissions[pageKey] || {
              target_type: "page" as const,
              target_id: page.id,
              target_key: page.page_key,
              can_read: false,
              can_edit: false,
              can_create: false,
              can_delete: false,
              can_export: false,
            }
            updatedPermissions[pageKey] = {
              ...currentPagePerm,
              [permissionKey]: true, // Automatically set to true when module permission is checked
            }
          })
        }
        
        // For modules with only one page, sync all permissions (existing behavior)
        // This is already handled above, but keeping for clarity
        if (module.pages.length === 1) {
          const singlePage = module.pages[0]
          const pageKey = getPermissionKey("page", singlePage.id)
          const currentPagePerm = updatedPermissions[pageKey] || {
            target_type: "page" as const,
            target_id: singlePage.id,
            target_key: singlePage.page_key,
            can_read: false,
            can_edit: false,
            can_create: false,
            can_delete: false,
            can_export: false,
          }
          updatedPermissions[pageKey] = {
            ...currentPagePerm,
            [permissionKey]: newPermValue,
          }
        }
      }
    }

    setPermissions(updatedPermissions)
  }

  const handleSave = async () => {
    if (!policyForm.policy_key || !policyForm.policy_name) {
      showToast("Policy key and name are required", "error")
      return
    }

    // Check if at least one permission is set
    const hasPermissions = Object.values(permissions).some(
      p => p.can_read || p.can_edit || p.can_create || p.can_delete || p.can_export
    )
    if (!hasPermissions) {
      showToast("Please set at least one permission", "error")
      return
    }

    setSaving(true)
    try {
      const method = policyId ? "PUT" : "POST"
      const url = policyId
        ? `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/policies/${policyId}`
        : `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/policies`

      // Build permissions array, including automatic page permissions for single-page modules
      const permissionsToSave: Permission[] = []
      
      // Add all explicit permissions
      for (const perm of Object.values(permissions)) {
        if (perm.can_read || perm.can_edit || perm.can_create || perm.can_delete || perm.can_export) {
          permissionsToSave.push(perm)
        }
      }

      // For modules with only one page, ensure the page permissions are included
      // (they should already be synced, but this ensures they're saved)
      for (const module of modules) {
        if (module.pages && module.pages.length === 1) {
          const moduleKey = getPermissionKey("module", module.id)
          const modulePerm = permissions[moduleKey]
          if (modulePerm && (modulePerm.can_read || modulePerm.can_edit || modulePerm.can_create || modulePerm.can_delete || modulePerm.can_export)) {
            const singlePage = module.pages[0]
            const pageKey = getPermissionKey("page", singlePage.id)
            // Check if page permission already exists, if not create it from module permission
            if (!permissionsToSave.some(p => p.target_type === "page" && p.target_id === singlePage.id)) {
              permissionsToSave.push({
                target_type: "page",
                target_id: singlePage.id,
                target_key: singlePage.page_key,
                can_read: modulePerm.can_read,
                can_edit: modulePerm.can_edit,
                can_create: modulePerm.can_create,
                can_delete: modulePerm.can_delete,
                can_export: modulePerm.can_export,
              })
            }
          }
        }
      }

      // Build actions array based on permissions
      const actionsSet = new Set<string>()
      for (const perm of permissionsToSave) {
        if (perm.can_read) actionsSet.add("view")
        if (perm.can_edit) actionsSet.add("edit")
        if (perm.can_create) actionsSet.add("create")
        if (perm.can_delete) actionsSet.add("delete")
        if (perm.can_export) actionsSet.add("export")
      }
      const actionsArray = Array.from(actionsSet)
      
      // If no actions found, default to view (shouldn't happen due to validation above)
      if (actionsArray.length === 0) {
        actionsArray.push("view")
      }

      // Build policy data with permissions
      const policyData = {
        ...policyForm,
        target_type: "module", // Default target type
        target_key: "*", // Will be overridden by permissions
        actions: actionsArray, // Dynamically generated from permissions
        permissions: permissionsToSave,
      }

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(policyData)
      })

      const data = await response.json()
      if (data.success) {
        // Get the policy ID (either from response or existing)
        const savedPolicyId = data.data?.id || policyId
        
        // Save field permissions if any are configured
        if (savedPolicyId) {
          console.log('[POLICY_EDITOR] Starting to save field permissions...')
          console.log('[POLICY_EDITOR] Policy ID:', savedPolicyId)
          console.log('[POLICY_EDITOR] Field permissions state:', fieldPermissions)
          
          const fieldsToSave: FieldPermission[] = []
          for (const [pageKey, perms] of Object.entries(fieldPermissions)) {
            console.log(`[POLICY_EDITOR] Processing page: ${pageKey}, fields:`, Object.keys(perms))
            for (const fp of Object.values(perms)) {
              // Save all field permissions, not just restrictions
              // This ensures we can track which fields have been explicitly configured
              fieldsToSave.push({
                field_id: fp.field_id,
                can_view: fp.can_view,
                can_edit: fp.can_edit
              })
            }
          }
          
          console.log('[POLICY_EDITOR] Fields to save:', fieldsToSave)
          console.log('[POLICY_EDITOR] Total fields to save:', fieldsToSave.length)
          console.log('[POLICY_EDITOR] Headers:', getHeaders())
          console.log('[POLICY_EDITOR] API URL:', `${API_CONFIG.BACKEND_BASE_URL}/v1/abac/policies/${savedPolicyId}/fields`)
          
          // Save field permissions (even if empty array to clear existing permissions)
          try {
            const fieldsResponse = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/v1/abac/policies/${savedPolicyId}/fields`, {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify({ fields: fieldsToSave })
            })
            
            console.log('[POLICY_EDITOR] Field save response status:', fieldsResponse.status)
            console.log('[POLICY_EDITOR] Field save response ok:', fieldsResponse.ok)
            
            const fieldsData = await fieldsResponse.json()
            console.log('[POLICY_EDITOR] Field save response data:', fieldsData)
            
            if (!fieldsData.success) {
              console.error('[POLICY_EDITOR] Failed to save field permissions:', fieldsData.message)
              showToast("Policy saved but field permissions failed to save", "error")
            } else {
              console.log('[POLICY_EDITOR] Field permissions saved successfully!')
            }
          } catch (error) {
            console.error('[POLICY_EDITOR] Error saving field permissions:', error)
            showToast("Policy saved but field permissions failed to save", "error")
          }
        } else {
          console.warn('[POLICY_EDITOR] No savedPolicyId, skipping field permissions save')
        }
        
        showToast(policyId ? "Policy updated successfully" : "Policy created successfully", "success")
        setTimeout(() => {
          navigate("/policies")
        }, 1000)
      } else {
        showToast(data.message || "Failed to save policy", "error")
      }
    } catch (error) {
      showToast("Failed to save policy", "error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: colors.background }}>
        <RefreshCcw className="animate-spin" style={{ width: "32px", height: "32px", color: colors.action }} />
      </div>
    )
  }

  return (
    <div style={{ height: "100%", background: colors.background, color: colors.textPrimary, display: "flex", flexDirection: "column", overflow: "hidden" }} className="font-space selection:bg-blue-500/20">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        .font-space { font-family: 'Space Grotesk', sans-serif; }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: ${colors.background}; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${colors.mutedBg}; }

        @keyframes enter-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-enter { animation: enter-slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }

        /* Custom Checkbox Animation */
        .custom-checkbox {
          appearance: none;
          background-color: transparent;
          margin: 0;
          font: inherit;
          color: currentColor;
          width: 1.15em;
          height: 1.15em;
          border: 2px solid ${colors.border};
          border-radius: 0.25em;
          display: grid;
          place-content: center;
          transition: all 0.2s;
          cursor: pointer;
        }
        .custom-checkbox::before {
          content: "";
          width: 0.65em;
          height: 0.65em;
          transform: scale(0);
          transition: 120ms transform ease-in-out;
          box-shadow: inset 1em 1em ${mode === 'dark' ? '#ffffff' : '#000000'};
          transform-origin: center;
          clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
        }
        .custom-checkbox:checked {
          background-color: ${colors.action};
          border-color: ${colors.action};
        }
        .custom-checkbox:checked::before {
          transform: scale(1);
        }
        
        /* Placeholder color */
        input::placeholder,
        textarea::placeholder {
          color: ${colors.textSecondary};
          opacity: 0.6;
        }
      `}</style>

      {/* Background Noise & ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex flex-col" style={{ height: "100%", overflow: "hidden" }}>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-enter flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/policies")}
              className="group flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: colors.textSecondary }}
              onMouseEnter={(e) => e.currentTarget.style.color = colors.textPrimary}
              onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
            >
              <div 
                className="p-1 rounded-md transition-colors border"
                style={{ 
                  background: colors.mutedBg, 
                  borderColor: colors.border 
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.border}
                onMouseLeave={(e) => e.currentTarget.style.background = colors.mutedBg}
              >
                <ArrowLeft size={14} />
              </div>
              {t("Back to Policies")}
            </button>
            <div className="h-6 w-px" style={{ background: colors.border }}></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
                {policyId ? t("Edit Policy") : t("Create Policy")}
              </h1>
              <p className="text-sm font-light" style={{ color: colors.textSecondary }}>
                {t("Define granular access controls and permissions for your organizational roles.")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button
               onClick={() => navigate("/policies")}
               className="rounded-lg border transition-all font-medium text-sm flex items-center gap-2"
               style={{ 
                 borderColor: colors.border, 
                 color: colors.textSecondary,
                 background: "transparent",
                 padding: "0.75rem 1.5rem"
               }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.color = colors.textPrimary
                 e.currentTarget.style.background = colors.mutedBg
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.color = colors.textSecondary
                 e.currentTarget.style.background = "transparent"
               }}
             >
               {t("Cancel")}
             </button>
             <button
               onClick={handleSave}
               disabled={saving}
               className="rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
               style={{ 
                 background: colors.action, 
                 color: "#FFFFFF",
                 padding: "0.75rem 1.5rem",
                 border: "none",
                 boxShadow: "0 4px 12px rgba(0,0,0,0.12)"
               }}
               onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
               onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
             >
               {saving ? <RefreshCcw className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
               {t("Save Changes")}
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0" style={{ marginBottom: "1.5rem" }}>
          
          {/* Left Column: Configuration */}
          <div className="lg:col-span-1 flex flex-col min-h-0 animate-enter delay-100">
            <div className="rounded-2xl p-6 shadow-xl overflow-auto" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 rounded-lg" style={{ background: mode === 'dark' ? 'rgba(79, 172, 254, 0.1)' : 'rgba(79, 172, 254, 0.1)', color: colors.action }}>
                    <Shield size={20} />
                 </div>
                 <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>{t("Configuration")}</h2>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                    {t("Policy Key")} <span style={{ color: "#FA8787" }}>*</span>
                  </label>
                  <input
                    value={policyForm.policy_key}
                    onChange={e => setPolicyForm({ ...policyForm, policy_key: e.target.value.toLowerCase().replace(/\s/g, "_") })}
                    placeholder="e.g. warehouse_admin"
                    disabled={!!policyId}
                    className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all disabled:opacity-50 font-mono"
                    style={{ 
                      background: colors.background, 
                      border: `1px solid ${colors.border}`, 
                      color: colors.textPrimary
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = `${colors.action}80`
                      e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.action}80`
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.border
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                    {t("Display Name")} <span style={{ color: "#FA8787" }}>*</span>
                  </label>
                  <input
                    value={policyForm.policy_name}
                    onChange={e => setPolicyForm({ ...policyForm, policy_name: e.target.value })}
                    placeholder="e.g. Warehouse Administrator"
                    className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all"
                    style={{ 
                      background: colors.background, 
                      border: `1px solid ${colors.border}`, 
                      color: colors.textPrimary
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = `${colors.action}80`
                      e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.action}80`
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.border
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                      {t("Effect")}
                    </label>
                    <div className="relative">
                      <select
                        value={policyForm.effect}
                        onChange={e => setPolicyForm({ ...policyForm, effect: e.target.value as "allow" | "deny" })}
                        className="w-full appearance-none rounded-lg px-4 py-3 text-sm focus:outline-none transition-all"
                        style={{ 
                          background: colors.background, 
                          border: `1px solid ${colors.border}`, 
                          color: colors.textPrimary
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = `${colors.action}80`
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = colors.border
                        }}
                      >
                        <option value="allow">{t("Allow")}</option>
                        <option value="deny">{t("Deny")}</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: colors.textSecondary }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                      {t("Priority")}
                    </label>
                    <input
                      type="number"
                      value={policyForm.priority}
                      onChange={e => setPolicyForm({ ...policyForm, priority: parseInt(e.target.value) || 100 })}
                      className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition-all"
                      style={{ 
                        background: colors.background, 
                        border: `1px solid ${colors.border}`, 
                        color: colors.textPrimary
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = `${colors.action}80`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = colors.border
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                    {t("Description")}
                  </label>
                  <textarea
                    value={policyForm.description}
                    onChange={e => setPolicyForm({ ...policyForm, description: e.target.value })}
                    placeholder={t("Briefly describe the purpose of this policy...")}
                    rows={4}
                    className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all resize-none"
                    style={{ 
                      background: colors.background, 
                      border: `1px solid ${colors.border}`, 
                      color: colors.textPrimary
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = `${colors.action}80`
                      e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.action}80`
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.border
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Permissions Table */}
          <div className="lg:col-span-2 animate-enter delay-200 flex flex-col min-h-0">
            <div className="rounded-2xl shadow-xl overflow-hidden flex flex-col h-full" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
              <div className="p-6 border-b backdrop-blur-md flex-shrink-0 flex justify-between items-center" style={{ borderColor: colors.border, background: mode === 'dark' ? `${colors.card}80` : colors.card }}>
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ background: mode === 'dark' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.1)', color: mode === 'dark' ? '#a855f7' : '#9333ea' }}>
                        <Layout size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>{t("Access Control")}</h2>
                        <p className="text-xs" style={{ color: colors.textSecondary }}>{t("Manage read/write access per module")}</p>
                    </div>
                 </div>
              </div>

              <div className="overflow-auto custom-scrollbar flex-1 min-h-0">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead style={{ background: colors.background }}>
                    <tr>
                      <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-wider border-b w-[35%] sticky left-0 z-10" style={{ color: colors.textSecondary, borderColor: colors.border, background: colors.background }}>
                        {t("Resource")}
                      </th>
                      {permissionColumns.map(col => (
                        <th key={col.key} className="text-center py-4 px-2 text-xs font-bold uppercase tracking-wider border-b" style={{ color: colors.textSecondary, borderColor: colors.border }}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody style={{ borderColor: colors.border }}>
                    {modules.map((module) => {
                      const moduleKey = getPermissionKey("module", module.id)
                      const modulePerm = permissions[moduleKey]
                      const isExpanded = expandedModules.has(module.id)
                      const hasModulePermission = hasAnyPermission("module", module.id)
                      const hasPagePermissions = module.pages?.some(p => hasAnyPermission("page", p.id))
                      const hasAnyActivity = hasModulePermission || hasPagePermissions
                      const hasMultiplePages = module.pages && module.pages.length > 1

                      return (
                        <React.Fragment key={module.id}>
                          {/* Module Row */}
                          <tr 
                            className="group transition-colors"
                            style={{ 
                              background: hasAnyActivity ? colors.card : colors.background
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = mode === 'dark' ? '#121215' : colors.mutedBg}
                            onMouseLeave={(e) => e.currentTarget.style.background = hasAnyActivity ? colors.card : colors.background}
                          >
                            <td 
                              className="py-4 px-6 sticky left-0 z-10 bg-inherit border-r" 
                              style={{ borderColor: `${colors.border}80` }}
                            >
                              <div 
                                className="flex items-center justify-between gap-3"
                                onClick={(e) => {
                                  // Toggle expand for any module with pages
                                  if (module.pages && module.pages.length > 0 && !(e.target as HTMLElement).closest('input[type="checkbox"]') && !(e.target as HTMLElement).closest('button')) {
                                    toggleModule(module.id)
                                  }
                                }}
                                style={{ 
                                  cursor: module.pages && module.pages.length > 0 ? 'pointer' : 'default'
                                }}
                                onMouseEnter={(e) => {
                                  if (module.pages && module.pages.length > 0) {
                                    e.currentTarget.style.opacity = '0.8'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = '1'
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-medium" style={{ color: hasAnyActivity ? colors.textPrimary : colors.textSecondary }}>
                                    {module.module_name}
                                  </span>
                                  {hasAnyActivity && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded ml-2" style={{ background: `${colors.action}33`, color: colors.action }}>Active</span>
                                  )}
                                  {module.pages && module.pages.length > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: colors.mutedBg, color: colors.textSecondary }}>
                                      {module.pages.length} {module.pages.length === 1 ? t("page") : t("pages")}
                                    </span>
                                  )}
                                </div>
                                {/* Show chevron for any module with pages */}
                                {module.pages && module.pages.length > 0 && (
                                  <div
                                    className="p-1 rounded transition-colors flex-shrink-0"
                                    style={{ color: hasAnyActivity ? colors.textPrimary : colors.textSecondary }}
                                  >
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </div>
                                )}
                              </div>
                            </td>
                            {permissionColumns.map(col => (
                              <td key={col.key} className="py-3 px-2 text-center">
                                <div className="flex justify-center">
                                  <input
                                    type="checkbox"
                                    className="custom-checkbox"
                                    checked={modulePerm?.[col.key as keyof Permission] === true}
                                    onChange={() => togglePermission("module", module.id, module.module_key, col.key)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </td>
                            ))}
                          </tr>

                          {/* Page Rows - Show for ALL modules when expanded */}
                          {isExpanded && module.pages && module.pages.map((page) => {
                            const pageKey = getPermissionKey("page", page.id)
                            const pagePerm = permissions[pageKey]
                            const isActive = hasAnyPermission("page", page.id)
                            const isFieldsExpanded = expandedPages.has(page.page_key)
                            const hasRestrictions = hasFieldRestrictions(page.page_key)
                            const smartFields = pageSmartFields[page.page_key] || []

                            return (
                              <React.Fragment key={page.id}>
                                <tr 
                                  className="transition-colors"
                                  style={{ 
                                    background: isActive ? (mode === 'dark' ? '#121215' : colors.mutedBg) : colors.background
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = mode === 'dark' ? '#121215' : colors.mutedBg}
                                  onMouseLeave={(e) => e.currentTarget.style.background = isActive ? (mode === 'dark' ? '#121215' : colors.mutedBg) : colors.background}
                                >
                                  <td className="py-3 px-6 pl-14 sticky left-0 z-10 bg-inherit border-r" style={{ borderColor: `${colors.border}50` }}>
                                    <div className="flex items-center gap-2 relative">
                                      <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-3 h-px" style={{ background: colors.border }}></div>
                                      <FileText size={14} style={{ color: isActive ? colors.textSecondary : colors.border }} />
                                      <span className="text-sm" style={{ color: isActive ? colors.textPrimary : colors.textSecondary }}>
                                        {page.page_name}
                                      </span>
                                      {hasRestrictions && (
                                        <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                                          {t("Field Restrictions")}
                                        </span>
                                      )}
                                      {/* Field permissions toggle button - only show if page has model_name */}
                                      {page.model_name && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            togglePageFields(page.page_key, page.id)
                                          }}
                                          className="ml-auto text-[10px] px-2 py-1 rounded transition-colors"
                                          style={{ 
                                            background: isFieldsExpanded ? `${colors.action}20` : colors.mutedBg,
                                            color: isFieldsExpanded ? colors.action : colors.textSecondary,
                                            border: `1px solid ${isFieldsExpanded ? colors.action : colors.border}`
                                          }}
                                        >
                                          {isFieldsExpanded ? t("Hide Fields") : t("Field Permissions")}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  {permissionColumns.map(col => (
                                    <td key={col.key} className="py-2 px-2 text-center">
                                      <div className="flex justify-center">
                                        <input
                                          type="checkbox"
                                          className="custom-checkbox"
                                          style={{ width: '1em', height: '1em', opacity: 0.8 }}
                                          checked={pagePerm?.[col.key as keyof Permission] === true}
                                          onChange={() => togglePermission("page", page.id, page.page_key, col.key)}
                                        />
                                      </div>
                                    </td>
                                  ))}
                                </tr>
                                
                                {/* Field Permissions Section */}
                                {isFieldsExpanded && (
                                  <tr>
                                    <td colSpan={6} className="p-0">
                                      <div 
                                        className="mx-6 my-2 rounded-lg overflow-hidden"
                                        style={{ 
                                          background: mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.02)',
                                          border: `1px solid ${colors.border}`
                                        }}
                                      >
                                        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: colors.border }}>
                                          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                            {t("Field-Level Permissions")} ({smartFields.length} {t("fields")})
                                          </span>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => setAllFieldPermissions(page.page_key, 'can_view', true)}
                                              className="text-[10px] px-2 py-1 rounded"
                                              style={{ background: colors.mutedBg, color: colors.textSecondary }}
                                            >
                                              {t("View All")}
                                            </button>
                                            <button
                                              onClick={() => setAllFieldPermissions(page.page_key, 'can_edit', true)}
                                              className="text-[10px] px-2 py-1 rounded"
                                              style={{ background: colors.mutedBg, color: colors.textSecondary }}
                                            >
                                              {t("Edit All")}
                                            </button>
                                          </div>
                                        </div>
                                        
                                        {smartFields.length === 0 ? (
                                          <div className="p-4 text-center text-sm" style={{ color: colors.textSecondary }}>
                                            {t("No fields configured for this page. Run Smart Field Sync first.")}
                                          </div>
                                        ) : (
                                          <div className="max-h-64 overflow-auto">
                                            <table className="w-full text-sm">
                                              <thead>
                                                <tr style={{ background: colors.background }}>
                                                  <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: colors.textSecondary }}>{t("Field")}</th>
                                                  <th className="text-center py-2 px-3 text-xs font-medium w-20" style={{ color: colors.textSecondary }}>{t("View")}</th>
                                                  <th className="text-center py-2 px-3 text-xs font-medium w-20" style={{ color: colors.textSecondary }}>{t("Edit")}</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {smartFields.map((field) => {
                                                  const fp = fieldPermissions[page.page_key]?.[field.id] || { field_id: field.id, can_view: true, can_edit: true }
                                                  return (
                                                    <tr 
                                                      key={field.id} 
                                                      className="border-t transition-colors" 
                                                      style={{ borderColor: `${colors.border}50` }}
                                                      onMouseEnter={(e) => e.currentTarget.style.background = mode === 'dark' ? '#121215' : colors.mutedBg}
                                                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                      <td className="py-2 px-3">
                                                        <div className="flex flex-col">
                                                          <span style={{ color: colors.textPrimary }}>{field.field_label || field.field_name}</span>
                                                          <span className="text-[10px]" style={{ color: colors.textSecondary }}>
                                                            {field.field_name} • {field.field_type}
                                                          </span>
                                                        </div>
                                                      </td>
                                                      <td className="py-2 px-3 text-center">
                                                        <input
                                                          type="checkbox"
                                                          className="custom-checkbox"
                                                          style={{ width: '0.9em', height: '0.9em' }}
                                                          checked={fp.can_view}
                                                          onChange={() => toggleFieldPermission(page.page_key, field.id, 'can_view')}
                                                        />
                                                      </td>
                                                      <td className="py-2 px-3 text-center">
                                                        <input
                                                          type="checkbox"
                                                          className="custom-checkbox"
                                                          style={{ width: '0.9em', height: '0.9em' }}
                                                          checked={fp.can_edit}
                                                          onChange={() => toggleFieldPermission(page.page_key, field.id, 'can_edit')}
                                                        />
                                                      </td>
                                                    </tr>
                                                  )
                                                })}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Toast Notification */}
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