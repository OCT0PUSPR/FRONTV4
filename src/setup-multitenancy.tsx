"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useTheme } from "../context/theme"
import { useNavigate } from "react-router-dom"
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
  Shield,
  Plus,
  Link,
  Users,
  ChevronDown,
  Mail,
  Lock,
  RefreshCw
} from "lucide-react"

import { Card, CardContent } from "../@/components/ui/card"
import { Input } from "../@/components/ui/input"
import { Button } from "../@/components/ui/button"

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
  const { colors } = useTheme()
  const navigate = useNavigate()

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

  // Mode selection
  const [mode, setMode] = useState<SetupMode>('select')
  
  // Existing tenants
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  
  // Form fields for creating new instance
  const [odooUrl, setOdooUrl] = useState("")
  const [odooDb, setOdooDb] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  
  // State
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [setupPhase, setSetupPhase] = useState<SetupPhase>('form')
  const [error, setError] = useState<string | null>(null)
  const [createdTenant, setCreatedTenant] = useState<any>(null)

  // Fetch existing tenants on load
  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    setIsFetching(true)
    try {
      const res = await fetch(`${API_BASE_URL}/tenants/list`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setTenants(data.tenants || [])
        }
      }
    } catch (e) {
      console.error('Failed to fetch tenants:', e)
    } finally {
      setIsFetching(false)
    }
  }

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!odooUrl || !odooDb || !email || !password) {
      setError('All fields are required')
      return
    }

    setIsLoading(true)
    setSetupPhase('creating')
    setError(null)

    try {
      // Call full-setup endpoint which creates tenant, syncs, and runs migrations
      const res = await fetch(`${API_BASE_URL}/tenants/full-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          odooUrl: odooUrl.replace(/\/$/, ''), 
          odooDb, 
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

      // Store tenant info for the app
      localStorage.setItem('current_tenant_id', data.tenant.id.toString())
      localStorage.setItem('current_tenant_name', data.tenant.instanceName)
      localStorage.setItem('odoo_base_url', data.tenant.odooUrl)
      localStorage.setItem('odoo_db', data.tenant.odooDb)
      if (data.tenant.companyName) {
        localStorage.setItem('company_name', data.tenant.companyName)
      }

      // Store session if available
      if (data.session) {
        localStorage.setItem('sessionId', data.session.sessionId)
        localStorage.setItem('uid', data.session.uid.toString())
        localStorage.setItem('name', data.session.name)
      }

      // Check if license activation is needed
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

      // Store tenant info
      localStorage.setItem('current_tenant_id', data.tenant.id.toString())
      localStorage.setItem('current_tenant_name', data.tenant.instanceName)
      localStorage.setItem('odoo_base_url', data.tenant.odooUrl)
      localStorage.setItem('odoo_db', data.tenant.odooDb)

      // Store session
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

  const renderModeSelection = () => (
    <div className="space-y-6 py-4">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Choose an Option</h2>
        <p className="text-sm text-slate-500">Create a new instance or connect to an existing one</p>
      </div>

      <div className="grid gap-4">
        {/* Create New Instance */}
        <button
          onClick={() => setMode('create')}
          className="group p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 hover:border-indigo-300 transition-all text-left"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
              <Plus size={24} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 mb-1">Create New Instance</h3>
              <p className="text-sm text-slate-500">Connect to a new ERP server and create a fresh database</p>
            </div>
            <ArrowRight size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors mt-1" />
          </div>
        </button>

        {/* Connect to Existing */}
        <button
          onClick={() => setMode('connect')}
          disabled={tenants.length === 0}
          className={`group p-6 rounded-2xl border transition-all text-left ${
            tenants.length === 0 
              ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
              : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              tenants.length === 0 ? 'bg-slate-100' : 'bg-emerald-100 group-hover:bg-emerald-200'
            }`}>
              <Link size={24} className={tenants.length === 0 ? 'text-slate-400' : 'text-emerald-600'} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 mb-1">Connect to Existing Instance</h3>
              <p className="text-sm text-slate-500">
                {tenants.length === 0 
                  ? 'No instances available yet' 
                  : `${tenants.length} instance${tenants.length > 1 ? 's' : ''} available`}
              </p>
            </div>
            <ArrowRight size={20} className={`mt-1 transition-colors ${
              tenants.length === 0 ? 'text-slate-300' : 'text-slate-400 group-hover:text-emerald-600'
            }`} />
          </div>
        </button>
      </div>

      {/* Existing Instances Preview */}
      {tenants.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Available Instances</h4>
          <div className="space-y-2">
            {tenants.slice(0, 3).map(tenant => (
              <div key={tenant.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                  <Building2 size={14} className="text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{tenant.instanceName}</p>
                  <p className="text-xs text-slate-500 truncate">{tenant.odooUrl}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  tenant.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tenant.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
            {tenants.length > 3 && (
              <p className="text-xs text-slate-500 text-center">+{tenants.length - 3} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const renderCreateForm = () => (
    <form onSubmit={handleCreateInstance} className="space-y-6 py-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => { setMode('select'); setError(null); }}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowRight size={18} className="text-slate-400 rotate-180" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Create New Instance</h2>
          <p className="text-sm text-slate-500">Connect to your ERP server</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Globe size={14} className="inline mr-2" />
            Server URL
          </label>
          <Input
            type="url"
            placeholder="https://your-server.com"
            value={odooUrl}
            onChange={(e) => setOdooUrl(e.target.value)}
            className="w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Database size={14} className="inline mr-2" />
            Database Name
          </label>
          <Input
            type="text"
            placeholder="database_name"
            value={odooDb}
            onChange={(e) => setOdooDb(e.target.value)}
            className="w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Building2 size={14} className="inline mr-2" />
            Company Name
          </label>
          <Input
            type="text"
            placeholder="Company Name LLC"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Mail size={14} className="inline mr-2" />
            Email
          </label>
          <Input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Lock size={14} className="inline mr-2" />
            Password
          </label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
            required
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading || !odooUrl || !odooDb || !email || !password}
        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl"
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin mr-2" />
            Creating Instance...
          </>
        ) : (
          <>
            Create Instance
            <ArrowRight size={18} className="ml-2" />
          </>
        )}
      </Button>
    </form>
  )

  const renderConnectForm = () => (
    <form onSubmit={handleConnectToInstance} className="space-y-6 py-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => { setMode('select'); setError(null); setSelectedTenant(null); }}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowRight size={18} className="text-slate-400 rotate-180" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Connect to Instance</h2>
          <p className="text-sm text-slate-500">Select an instance and sign in</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Building2 size={14} className="inline mr-2" />
            Select Instance
          </label>
          <div className="space-y-2">
            {tenants.map(tenant => (
              <button
                key={tenant.id}
                type="button"
                onClick={() => setSelectedTenant(tenant)}
                className={`w-full p-4 rounded-xl border transition-all text-left ${
                  selectedTenant?.id === tenant.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedTenant?.id === tenant.id ? 'bg-indigo-100' : 'bg-slate-100'
                  }`}>
                    <Building2 size={18} className={
                      selectedTenant?.id === tenant.id ? 'text-indigo-600' : 'text-slate-500'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{tenant.instanceName}</p>
                    <p className="text-xs text-slate-500 truncate">{tenant.odooUrl}</p>
                  </div>
                  {selectedTenant?.id === tenant.id && (
                    <CheckCircle2 size={20} className="text-indigo-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedTenant && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Mail size={14} className="inline mr-2" />
                Email
              </label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Lock size={14} className="inline mr-2" />
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                required
              />
            </div>
          </>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading || !selectedTenant || !email || !password}
        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl"
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin mr-2" />
            Connecting...
          </>
        ) : (
          <>
            Connect
            <ArrowRight size={18} className="ml-2" />
          </>
        )}
      </Button>
    </form>
  )

  const renderProgress = () => (
    <div className="space-y-6 py-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
          <Loader2 size={32} className="text-indigo-600 animate-spin" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Setting Up Instance</h3>
          <p className="text-sm text-slate-500">This may take a few minutes...</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className={`p-4 rounded-xl border ${
          setupPhase === 'creating' ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-3">
            <Database size={18} className={setupPhase === 'creating' ? 'text-indigo-600' : 'text-slate-400'} />
            <span className="text-sm font-medium">Creating database...</span>
            {setupPhase === 'creating' && <Loader2 size={14} className="text-indigo-500 animate-spin ml-auto" />}
            {(setupPhase === 'syncing' || setupPhase === 'migrating' || setupPhase === 'complete') && 
              <CheckCircle2 size={14} className="text-emerald-500 ml-auto" />}
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${
          setupPhase === 'syncing' ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-3">
            <RefreshCw size={18} className={setupPhase === 'syncing' ? 'text-indigo-600' : 'text-slate-400'} />
            <span className="text-sm font-medium">Syncing ERP data...</span>
            {setupPhase === 'syncing' && <Loader2 size={14} className="text-indigo-500 animate-spin ml-auto" />}
            {(setupPhase === 'migrating' || setupPhase === 'complete') && 
              <CheckCircle2 size={14} className="text-emerald-500 ml-auto" />}
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${
          setupPhase === 'migrating' ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-3">
            <Server size={18} className={setupPhase === 'migrating' ? 'text-indigo-600' : 'text-slate-400'} />
            <span className="text-sm font-medium">Installing microservices...</span>
            {setupPhase === 'migrating' && <Loader2 size={14} className="text-indigo-500 animate-spin ml-auto" />}
            {setupPhase === 'complete' && <CheckCircle2 size={14} className="text-emerald-500 ml-auto" />}
          </div>
        </div>
      </div>
      
      <p className="text-center text-xs text-slate-400">Please do not close this page</p>
    </div>
  )

  const renderComplete = () => (
    <div className="space-y-6 py-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Setup Complete!</h3>
          <p className="text-sm text-slate-500">
            Instance <span className="font-medium">{createdTenant?.instanceName}</span> is ready
          </p>
        </div>
      </div>
      
      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
        <div className="flex items-center gap-3">
          <Building2 size={18} className="text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-900">{createdTenant?.instanceName}</p>
            <p className="text-xs text-emerald-600">{createdTenant?.odooUrl}</p>
          </div>
        </div>
      </div>
      
      <p className="text-center text-sm text-slate-500">Redirecting to sign in...</p>
    </div>
  )

  const renderError = () => (
    <div className="space-y-6 py-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle size={32} className="text-red-600" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Setup Failed</h3>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
      
      <Button
        onClick={() => { setSetupPhase('form'); setMode('select'); setError(null); }}
        className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl"
      >
        Try Again
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full opacity-50 blur-3xl" />
      </div>

      {/* Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-4">
          <Command size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">System Setup</h1>
        <p className="text-slate-500">Multi-tenant instance management</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 relative z-10">
        {isFetching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="text-indigo-600 animate-spin" />
          </div>
        ) : setupPhase === 'form' ? (
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
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-slate-400 relative z-10">
        Powered by Octopus ERP
      </p>
    </div>
  )
}
