"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { useNavigate } from "react-router-dom"
import "./pages/DynamicRecordPage.css"
import {
  Settings,
  Globe,
  Building2,
  Database,
  ArrowRight,
  CheckCircle2,
  Command,
  Loader2,
  AlertCircle,
  Server,
  Plus,
  Link,
  Mail,
  Lock,
  RefreshCw,
  Sun,
  Moon,
  ArrowLeft,
  Zap,
  HardDrive,
  Trash2
} from "lucide-react"

import { Button } from "../@/components/ui/button"
import Alert from "./components/Alert"
import { ActionDropdown } from "./components/ActionDropdown"

interface Tenant {
  id: number
  instanceName: string
  companyName: string | null
  odooUrl: string
  odooDb: string
  email: string
  isActive: boolean
  createdAt: string
  lastSyncAt: string | null
}

type SetupMode = 'select' | 'create' | 'connect'
type SetupPhase = 'form' | 'creating' | 'syncing' | 'migrating' | 'complete' | 'error'

export default function SetupMultitenancyPage() {
  const { t } = useTranslation()
  const { mode: themeMode, setMode: setThemeMode, colors } = useTheme()
  const isDarkMode = themeMode === 'dark'
  const navigate = useNavigate()

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

  const toggleTheme = () => setThemeMode(isDarkMode ? 'light' : 'dark')

  // Mode selection
  const [mode, setMode] = useState<SetupMode>('select')

  // Existing tenants
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)

  // Form fields for creating new instance
  const [odooUrl, setOdooUrl] = useState("")
  const [odooDb, setOdooDb] = useState("")
  const [instanceName, setInstanceName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // State
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [setupPhase, setSetupPhase] = useState<SetupPhase>('form')
  const [error, setError] = useState<string | null>(null)
  const [createdTenant, setCreatedTenant] = useState<any>(null)
  const [deletingTenantId, setDeletingTenantId] = useState<number | null>(null)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<{ id: number; name: string } | null>(null)

  // Initialize master database and fetch existing tenants on load
  useEffect(() => {
    initializeMasterAndFetchTenants()
  }, [])

  const initializeMasterAndFetchTenants = async () => {
    setIsFetching(true)
    setError(null)
    
    try {
      console.log('[Setup] Initializing master database...')
      // First, ensure master database is initialized
      const initResponse = await fetch(`${API_BASE_URL}/tenants/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!initResponse.ok) {
        const errorText = await initResponse.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText || `HTTP ${initResponse.status}` }
        }
        throw new Error(errorData.message || 'Failed to initialize master database')
      }
      
      const initData = await initResponse.json()
      
      if (!initData.success) {
        throw new Error(initData.message || 'Failed to initialize master database')
      }
      
      console.log('[Setup] Master database initialized successfully', {
        setupAuthInitialized: initData.setupAuthInitialized
      })
      
      if (initData.setupAuthInitialized) {
        console.log('[Setup] Setup authentication initialized')
      }
    } catch (e: unknown) {
      console.error('[Setup] Failed to initialize master database:', e)
      const errorMessage = e instanceof Error ? e.message : 'Failed to initialize master database'
      // Don't set error state - just log it, as DB might already be initialized
      console.warn('[Setup] Continuing anyway - database might already be initialized')
    }
    
    // Then fetch tenants (will work if DB exists, even if init failed)
    await fetchTenants()
  }

  const fetchTenants = async () => {
    try {
      console.log('[Setup] Fetching tenants...')
      const res = await fetch(`${API_BASE_URL}/tenants/list`)
      
      if (!res.ok) {
        console.error('[Setup] Failed to fetch tenants:', res.status, res.statusText)
        throw new Error(`Failed to fetch tenants: ${res.status} ${res.statusText}`)
      }
      
      const data = await res.json()
      if (data.success) {
        setTenants(data.tenants || [])
        console.log('[Setup] Tenants fetched successfully:', data.tenants?.length || 0)
      } else {
        console.error('[Setup] Failed to fetch tenants:', data.message)
        setError(data.message || 'Failed to fetch tenants')
      }
    } catch (e) {
      console.error('[Setup] Error fetching tenants:', e)
      const errorMessage = e instanceof Error ? e.message : 'Failed to fetch tenants'
      setError(errorMessage)
      setTenants([]) // Set empty array on error
    } finally {
      setIsFetching(false)
    }
  }


  const handleDeleteConfirm = async () => {
    if (!tenantToDelete) return
    
    setShowDeleteAlert(false)
    setDeletingTenantId(tenantToDelete.id)
    setError(null)
    
    try {
      const res = await fetch(`${API_BASE_URL}/tenants/${tenantToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await res.json()
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete tenant')
      }
      
      // Refresh the tenants list
      await fetchTenants()
      
      // Clear selected tenant if it was deleted
      if (selectedTenant?.id === tenantToDelete.id) {
        setSelectedTenant(null)
      }
    } catch (e: any) {
      console.error('Failed to delete tenant:', e)
      setError(e.message || 'Failed to delete tenant')
    } finally {
      setDeletingTenantId(null)
      setTenantToDelete(null)
    }
  }

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!odooUrl || !odooDb || !email || !password || !instanceName) {
      setError('All fields are required')
      return
    }

    setIsLoading(true)
    setSetupPhase('creating')
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/tenants/full-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odooUrl: odooUrl.replace(/\/$/, ''),
          odooDb,
          instanceName: instanceName.trim(),
          companyName: companyName || null,
          email,
          password
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create instance')
      }

      setCreatedTenant(data.tenant)
      setSetupPhase('complete')

      localStorage.setItem('current_tenant_id', data.tenant.id.toString())
      localStorage.setItem('current_tenant_name', data.tenant.instanceName)
      localStorage.setItem('odoo_base_url', data.tenant.odooUrl)
      localStorage.setItem('odoo_db', data.tenant.odooDb)
      if (data.tenant.companyName) {
        localStorage.setItem('company_name', data.tenant.companyName)
      }

      if (data.session) {
        localStorage.setItem('sessionId', data.session.sessionId)
        localStorage.setItem('uid', data.session.uid.toString())
        localStorage.setItem('name', data.session.name)
      }

      if (data.needsLicense) {
        setTimeout(() => {
          navigate('/license', {
            replace: true,
            state: { tenantId: data.tenant.id, instanceName: data.tenant.instanceName }
          })
        }, 2500)
      } else {
        setTimeout(() => {
          navigate('/signin', { replace: true })
        }, 2500)
      }

    } catch (e: any) {
      console.error('Error creating instance:', e)
      setSetupPhase('error')
      setError(e.message || 'Failed to create instance')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectToInstance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenant || !email || !password) {
      setError('Please select an instance and enter credentials')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/tenants/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedTenant.id,
          email,
          password
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to connect to instance')
      }

      localStorage.setItem('current_tenant_id', data.tenant.id.toString())
      localStorage.setItem('current_tenant_name', data.tenant.instanceName)
      localStorage.setItem('odoo_base_url', data.tenant.odooUrl)
      localStorage.setItem('odoo_db', data.tenant.odooDb)

      if (data.session) {
        localStorage.setItem('sessionId', data.session.sessionId)
        localStorage.setItem('uid', data.session.uid.toString())
        localStorage.setItem('name', data.session.name)
      }

      navigate('/', { replace: true })

    } catch (e: any) {
      console.error('Error connecting to instance:', e)
      setError(e.message || 'Failed to connect to instance')
    } finally {
      setIsLoading(false)
    }
  }

  // --- Render Helpers ---

  const Header = () => (
    <div className="flex flex-col items-center mb-10 text-center">
      <div 
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg transform transition-transform hover:scale-105 duration-300 border"
        style={{
          backgroundColor: colors.card,
          color: colors.textPrimary,
          borderColor: colors.border
        }}
      >
        <Command className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: colors.textPrimary }}>
        Octopus WMS
      </h1>
      <p className="text-base" style={{ color: colors.textSecondary }}>
        Setup your warehouse management environment
      </p>
    </div>
  )

  const renderModeSelection = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-4">
        {/* Create New Instance Card */}
        <button
          onClick={() => setMode('create')}
          className="group relative w-full p-6 rounded-[24px] text-left transition-all duration-300 border hover:-translate-y-1 hover:shadow-lg"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = isDarkMode ? '#3f3f46' : '#cbd5e1'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.border
          }}
        >
          <div className="flex items-start gap-5">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors"
              style={{
                backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                color: isDarkMode ? '#60a5fa' : '#2563eb'
              }}
            >
              <Plus className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1" style={{ color: colors.textPrimary }}>
                Create Configuration
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                Connect to a new server and initialize the system.
              </p>
            </div>
            <ArrowRight 
              className="w-5 h-5 mt-1 transition-transform group-hover:translate-x-1"
              style={{ color: colors.textSecondary }}
            />
          </div>
        </button>

        {/* Connect to Existing Card */}
        <button
          onClick={() => setMode('connect')}
          disabled={tenants.length === 0}
          className="group relative w-full p-6 rounded-[24px] text-left transition-all duration-300 border hover:-translate-y-1"
          style={{
            backgroundColor: tenants.length === 0 ? colors.mutedBg : colors.card,
            borderColor: colors.border,
            opacity: tenants.length === 0 ? 0.6 : 1,
            cursor: tenants.length === 0 ? 'not-allowed' : 'pointer'
          }}
          onMouseEnter={(e) => {
            if (tenants.length > 0) {
              e.currentTarget.style.borderColor = isDarkMode ? '#3f3f46' : '#cbd5e1'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.border
          }}
        >
          <div className="flex items-start gap-5">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors"
              style={{
                backgroundColor: tenants.length === 0
                  ? colors.mutedBg
                  : (isDarkMode ? 'rgba(16, 185, 129, 0.1)' : '#d1fae5'),
                color: tenants.length === 0
                  ? colors.textSecondary
                  : (isDarkMode ? '#34d399' : '#059669')
              }}
            >
              <Link className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1" style={{ color: colors.textPrimary }}>
                Connect Existing
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                {tenants.length === 0
                  ? 'No configurations found.'
                  : `Select from ${tenants.length} available configuration${tenants.length !== 1 ? 's' : ''}.`}
              </p>
            </div>
             {tenants.length > 0 && (
              <ArrowRight 
                className="w-5 h-5 mt-1 transition-transform group-hover:translate-x-1"
                style={{ color: colors.textSecondary }}
              />
             )}
          </div>
        </button>
      </div>

      {tenants.length > 0 && (
        <div className="pt-6 mt-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4 pl-1" style={{ color: colors.textSecondary }}>
            Recent Configurations
          </p>
          <div className="grid grid-cols-1 gap-3">
            {tenants.slice(0, 4).map((tenant, idx) => (
              <div
                key={tenant.id}
                className="group relative p-4 rounded-xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  animationDelay: `${idx * 50}ms`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isDarkMode ? '#3f3f46' : '#cbd5e1'
                  e.currentTarget.style.backgroundColor = isDarkMode ? colors.mutedBg : '#f8fafc'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border
                  e.currentTarget.style.backgroundColor = colors.card
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon Container */}
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: tenant.isActive
                        ? (isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5')
                        : colors.mutedBg,
                      color: tenant.isActive
                        ? (isDarkMode ? '#34d399' : '#059669')
                        : colors.textSecondary
                    }}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  
                  {/* Content - Clickable */}
                  <button
                    onClick={() => {
                      setMode('connect')
                      setSelectedTenant(tenant)
                    }}
                    className="flex-1 min-w-0 pr-2 text-left"
                  >
                    <h4 className="text-sm font-bold mb-1.5 line-clamp-1" style={{ color: colors.textPrimary }}>
                      {tenant.instanceName}
                    </h4>
                    <div className="flex items-center gap-2 mb-1.5">
                      {tenant.isActive && (
                        <div 
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0"
                          style={{
                            backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5',
                            color: isDarkMode ? '#34d399' : '#059669'
                          }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </div>
                      )}
                    </div>
                    <p className="text-xs truncate" style={{ color: colors.textSecondary }}>
                      {tenant.odooUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </p>
                    {tenant.companyName && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: colors.textSecondary }}>
                        {tenant.companyName}
                      </p>
                    )}
                  </button>
                  
                  {/* Actions Dropdown */}
                  <div className="shrink-0">
                    <ActionDropdown
                      actions={[
                        {
                          key: 'enter',
                          label: 'Enter',
                          icon: ArrowRight,
                          onClick: () => {
                            setMode('connect')
                            setSelectedTenant(tenant)
                          },
                          disabled: deletingTenantId === tenant.id
                        },
                        {
                          key: 'delete',
                          label: 'Delete',
                          icon: Trash2,
                          onClick: () => {
                            setTenantToDelete({ id: tenant.id, name: tenant.instanceName })
                            setShowDeleteAlert(true)
                          },
                          danger: true,
                          disabled: deletingTenantId === tenant.id
                        }
                      ]}
                      iconOnly={true}
                      disabled={deletingTenantId === tenant.id}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderCreateForm = () => (
    <form onSubmit={handleCreateInstance} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => { setMode('select'); setError(null); }}
          className="p-2 rounded-full transition-colors"
          style={{
            color: colors.textSecondary,
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? colors.mutedBg : '#f1f5f9'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          New Configuration
        </h2>
      </div>

      {error && (
        <div 
          className="p-4 rounded-xl flex items-start gap-3 border text-sm"
          style={{
            backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
            borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fecaca',
            color: isDarkMode ? '#fca5a5' : '#991b1b'
          }}
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>Server URL</label>
          <div className="relative">
            <Globe className="absolute left-3 top-3 w-5 h-5" style={{ color: colors.textSecondary }} />
            <input
              type="url"
              placeholder="https://your-server.com"
              value={odooUrl}
              onChange={(e) => setOdooUrl(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border outline-none transition-all"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.textPrimary
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.border
              }}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>Database</label>
            <div className="relative">
              <Database className="absolute left-3 top-3 w-5 h-5" style={{ color: colors.textSecondary }} />
              <input
                type="text"
                placeholder="server_db"
                value={odooDb}
                onChange={(e) => setOdooDb(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border outline-none transition-all"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.textPrimary
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border
                }}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>Instance ID</label>
            <div className="relative">
              <HardDrive className="absolute left-3 top-3 w-5 h-5" style={{ color: colors.textSecondary }} />
              <input
                type="text"
                placeholder="Prod-01"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border outline-none transition-all"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.textPrimary
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border
                }}
                required
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-dashed" style={{ borderColor: colors.border }}>
           <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5" style={{ color: colors.textSecondary }} />
                  <input
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border outline-none transition-all"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.textPrimary
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.border
                    }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5" style={{ color: colors.textSecondary }} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border outline-none transition-all"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.textPrimary
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.border
                    }}
                    required
                  />
                </div>
              </div>
           </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading || !odooUrl || !odooDb || !instanceName || !email || !password}
        className="w-full h-12 text-base font-medium rounded-xl transition-all hover:scale-[1.02]"
        style={{
          backgroundColor: isDarkMode ? '#ffffff' : '#0f172a',
          color: isDarkMode ? '#0f172a' : '#ffffff',
          opacity: (isLoading || !odooUrl || !odooDb || !instanceName || !email || !password) ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.backgroundColor = isDarkMode ? '#f1f5f9' : '#1e293b'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isDarkMode ? '#ffffff' : '#0f172a'
        }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Creating...
          </>
        ) : (
          <>
            Create Configuration
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>
    </form>
  )

  const renderConnectForm = () => (
    <form onSubmit={handleConnectToInstance} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => { setMode('select'); setError(null); setSelectedTenant(null); }}
          className="p-2 rounded-full transition-colors"
          style={{
            color: colors.textSecondary,
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? colors.mutedBg : '#f1f5f9'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          Connect Instance
        </h2>
      </div>

      {error && (
        <div 
          className="p-4 rounded-xl flex items-start gap-3 border text-sm"
          style={{
            backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
            borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fecaca',
            color: isDarkMode ? '#fca5a5' : '#991b1b'
          }}
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>Select Instance</label>
          <div className="grid gap-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
            {tenants.map(tenant => (
              <button
                key={tenant.id}
                type="button"
                onClick={() => setSelectedTenant(tenant)}
                className="w-full p-4 rounded-xl border text-left transition-all relative overflow-hidden group"
                style={{
                  backgroundColor: selectedTenant?.id === tenant.id
                    ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff')
                    : colors.card,
                  borderColor: selectedTenant?.id === tenant.id
                    ? (isDarkMode ? 'rgba(59, 130, 246, 0.5)' : '#bfdbfe')
                    : colors.border
                }}
                onMouseEnter={(e) => {
                  if (selectedTenant?.id !== tenant.id) {
                    e.currentTarget.style.borderColor = isDarkMode ? '#3f3f46' : '#cbd5e1'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTenant?.id !== tenant.id) {
                    e.currentTarget.style.borderColor = colors.border
                  }
                }}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      backgroundColor: selectedTenant?.id === tenant.id
                        ? (isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe')
                        : colors.mutedBg,
                      color: selectedTenant?.id === tenant.id
                        ? (isDarkMode ? '#60a5fa' : '#2563eb')
                        : colors.textSecondary
                    }}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: colors.textPrimary }}>
                      {tenant.instanceName}
                    </p>
                    <p className="text-xs truncate" style={{ color: colors.textSecondary }}>
                      {tenant.odooUrl}
                    </p>
                  </div>
                  {selectedTenant?.id === tenant.id && (
                    <CheckCircle2 
                      className="w-5 h-5"
                      style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedTenant && (
          <div className="space-y-4 pt-4 border-t animate-in fade-in slide-in-from-top-2" style={{ borderColor: colors.border }}>
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5" style={{ color: colors.textSecondary }} />
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border outline-none transition-all"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.textPrimary
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                  }}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5" style={{ color: colors.textSecondary }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border outline-none transition-all"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.textPrimary
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                  }}
                  required
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading || !selectedTenant || !email || !password}
        className="w-full h-12 text-base font-medium rounded-xl transition-all hover:scale-[1.02]"
        style={{
          backgroundColor: isDarkMode ? '#ffffff' : '#0f172a',
          color: isDarkMode ? '#0f172a' : '#ffffff',
          opacity: (isLoading || !selectedTenant || !email || !password) ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.backgroundColor = isDarkMode ? '#f1f5f9' : '#1e293b'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isDarkMode ? '#ffffff' : '#0f172a'
        }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Connecting...
          </>
        ) : (
          <>
            Connect
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>
    </form>
  )

  const renderProgress = () => (
    <div className="py-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col items-center gap-6 mb-10">
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }} />
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2" style={{ color: colors.textPrimary }}>
            Setting Up
          </h3>
          <p style={{ color: colors.textSecondary }}>
            Please wait while we configure your instance...
          </p>
        </div>
      </div>

      <div className="space-y-4 max-w-sm mx-auto">
        {[
          { id: 'creating', label: 'Initializing instance', icon: Zap },
          { id: 'syncing', label: 'Creating database', icon: Database },
          { id: 'migrating', label: 'Installing services', icon: Server }
        ].map((step, index) => {
          const isActive = setupPhase === step.id
          const isCompleted = ['creating', 'syncing', 'migrating', 'complete'].indexOf(setupPhase) > index
          
          return (
            <div 
              key={step.id} 
              className="flex items-center gap-4 p-4 rounded-xl border transition-all duration-300"
              style={{
                backgroundColor: isActive 
                  ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff')
                  : isCompleted
                    ? (isDarkMode ? 'rgba(16, 185, 129, 0.05)' : 'rgba(209, 250, 229, 0.5)')
                    : colors.mutedBg,
                borderColor: isActive 
                  ? (isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe')
                  : isCompleted
                    ? (isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5')
                    : colors.border,
                opacity: (!isActive && !isCompleted) ? 0.6 : 1
              }}
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  color: isActive 
                    ? '#3b82f6' 
                    : isCompleted 
                      ? '#10b981' 
                      : colors.textSecondary
                }}
              >
                <step.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium flex-1" style={{ 
                color: (isActive || isCompleted) ? colors.textPrimary : colors.textSecondary 
              }}>
                {step.label}
              </span>
              {isActive && <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#3b82f6' }} />}
              {isCompleted && <CheckCircle2 className="w-5 h-5" style={{ color: '#10b981' }} />}
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderComplete = () => (
    <div className="py-8 text-center animate-in fade-in zoom-in-95 duration-500">
      <div 
        className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
        style={{
          backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5',
          color: isDarkMode ? '#34d399' : '#059669'
        }}
      >
        <CheckCircle2 className="w-10 h-10" />
      </div>
      
      <h3 className="text-2xl font-bold mb-2" style={{ color: colors.textPrimary }}>
        Setup Complete!
      </h3>
      <p className="mb-8" style={{ color: colors.textSecondary }}>
        Your instance is ready. Redirecting...
      </p>

      <div className="flex items-center justify-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading dashboard...
      </div>
    </div>
  )

  const renderError = () => (
    <div className="py-8 text-center animate-in fade-in zoom-in-95 duration-500">
      <div 
        className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
        style={{
          backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
          color: isDarkMode ? '#fca5a5' : '#dc2626'
        }}
      >
        <AlertCircle className="w-10 h-10" />
      </div>
      
      <h3 className="text-2xl font-bold mb-2" style={{ color: colors.textPrimary }}>
        Setup Failed
      </h3>
      <p className="mb-8 max-w-xs mx-auto" style={{ color: isDarkMode ? '#fca5a5' : '#dc2626' }}>
        {error}
      </p>

      <Button
        onClick={() => { setSetupPhase('form'); setMode('select'); setError(null); }}
        className="px-8"
        variant="outline"
      >
        Try Again
      </Button>
    </div>
  )

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 relative transition-colors duration-500"
      style={{ backgroundColor: colors.background }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.4] pointer-events-none" 
        style={{
          backgroundImage: isDarkMode 
            ? 'radial-gradient(#27272a 1px, transparent 1px)' 
            : 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} 
      />

      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.textSecondary
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.textPrimary
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.textSecondary
          }}
        >
          {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          <span className="text-xs font-medium">{isDarkMode ? 'Dark' : 'Light'}</span>
        </button>
      </div>

      {/* Main Card */}
      <div 
        className="relative z-10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: '1px',
          borderStyle: 'solid'
        }}
      >
        <div className="p-8 md:p-10">
          {setupPhase === 'form' && mode === 'select' && <Header />}
          
          {isFetching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className={`w-8 h-8 animate-spin mb-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading...</p>
            </div>
          ) : (
             <>
                {setupPhase === 'form' ? (
                  mode === 'select' ? renderModeSelection() :
                  mode === 'create' ? renderCreateForm() :
                  renderConnectForm()
                ) : setupPhase === 'complete' ? (
                  renderComplete()
                ) : setupPhase === 'error' ? (
                  renderError()
                ) : (
                  renderProgress()
                )}
             </>
          )}
        </div>
        
        {/* Footer in card */}
        <div 
          className="py-4 text-center text-xs border-t"
          style={{
            borderColor: colors.border,
            color: colors.textSecondary,
            backgroundColor: colors.mutedBg
          }}
        >
          &copy; {new Date().getFullYear()} Octopus WMS
        </div>
      </div>

      {/* Delete Confirmation Alert */}
      <Alert
        isOpen={showDeleteAlert}
        type="delete"
        title={`Delete "${tenantToDelete?.name}"?`}
        message={`This will permanently delete the tenant database and remove the tenant record from the master database. This action cannot be undone!`}
        onClose={() => {
          setShowDeleteAlert(false)
          setTenantToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  )
}
