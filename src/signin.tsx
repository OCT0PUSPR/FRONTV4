"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/auth"
import { useTranslation } from "react-i18next"
import {
  Eye,
  EyeOff,
  Building2,
  ChevronDown,
  Check,
  Mail,
  Lock,
  ArrowRight
} from "lucide-react"
import octLogo from "./assets/OCT.png"
import animationVideo from "./assets/animation.mp4"

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

const Signin: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>("")
  const [isFetchingTenants, setIsFetchingTenants] = useState(false)
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false)

  // Cast import.meta to any to bypass environment-specific type missing error
  const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL

  useEffect(() => {
    if (!authLoading && isAuthenticated && !isLoading) {
      navigate('/overview', { replace: true })
    }
  }, [isAuthenticated, authLoading, isLoading, navigate])

  useEffect(() => {
    fetchTenants()
    const storedTenantId = localStorage.getItem('current_tenant_id')
    if (storedTenantId) {
      setSelectedTenantId(storedTenantId)
    }
  }, [])

  useEffect(() => {
    if (tenants.length === 1 && !selectedTenantId) {
      const singleTenantId = tenants[0].id.toString()
      setSelectedTenantId(singleTenantId)
      localStorage.setItem('current_tenant_id', singleTenantId)
    }
  }, [tenants, selectedTenantId])

  const fetchTenants = async () => {
    setIsFetchingTenants(true)
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
      setIsFetchingTenants(false)
    }
  }

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId)
    setIsTenantDropdownOpen(false)
    if (tenantId) {
      localStorage.setItem('current_tenant_id', tenantId)
    } else {
      localStorage.removeItem('current_tenant_id')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsLoading(true)

    try {
      const result = await signIn(email, password)

      if (!result.success) {
        const defaultErrorMessage = "Invalid email or password. Please check your credentials."
        setErrorMsg(result.error || t(defaultErrorMessage))
        setIsLoading(false)
        return
      }

      if (result.setupRequired || result.redirectTo === '/setup') {
        setIsLoading(false)
        navigate('/setup', { replace: true })
        return
      }

      setIsLoading(false)
      navigate("/overview", { replace: true })
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.")
      setIsLoading(false)
    }
  }

  const selectedTenant = tenants.find(t => t.id.toString() === selectedTenantId)
  const selectedTenantDisplay = selectedTenant
    ? `${selectedTenant.instanceName}${selectedTenant.companyName ? ` (${selectedTenant.companyName})` : ''}`
    : "Select Instance"

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-white font-['Space_Grotesk'] overflow-hidden">
      <style>{`
        @keyframes blurIn {
          0% { filter: blur(10px); opacity: 0; transform: translateY(10px); }
          100% { filter: blur(0); opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideRight {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-blur-in { animation: blurIn 1s cubic-bezier(0.19, 1, 0.22, 1) both; }
        .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.19, 1, 0.22, 1) both; }
        .animate-slide-right { animation: slideRight 0.8s cubic-bezier(0.19, 1, 0.22, 1) both; }
        
        .input-focus-effect:focus-within {
          border-color: #000;
          box-shadow: 0 0 0 1px #000;
        }
        .premium-button {
          transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
        }
        .premium-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -10px rgba(0,0,0,0.3);
        }
        .premium-button:active {
          transform: translateY(0);
        }
      `}</style>

      {/* Left Section - Sign In Form (40%) */}
      <div className="w-full md:w-[40%] bg-white p-8 sm:p-12 lg:p-20 flex flex-col justify-center relative z-10">
        <div className="max-w-md w-full mx-auto">


          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-5xl font-['Space Grotesk'] font-bold mb-4 tracking-tight leading-none text-black">
              Sign In
            </h1>
            <p className="text-gray-500 mb-8 font-medium">
              Access your warehouse management dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Inline Error Message */}
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold animate-blur-in">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              {/* Email */}
              <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <label className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-1.5 block">
                  Email Address
                </label>
                <div className="relative input-focus-effect border-2 border-gray-100 rounded-xl transition-all bg-gray-50/50">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-12 pr-4 py-4 bg-transparent outline-none text-black font-medium placeholder:text-gray-300"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <label className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-1.5 block">
                  Password
                </label>
                <div className="relative input-focus-effect border-2 border-gray-100 rounded-xl transition-all bg-gray-50/50">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-transparent outline-none text-black font-medium placeholder:text-gray-300"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Tenant Selection */}
              {tenants.length > 1 && (
                <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
                  <label className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-1.5 block">
                    Select Instance
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => !isLoading && setIsTenantDropdownOpen(!isTenantDropdownOpen)}
                      className="w-full flex items-center justify-between border-2 border-gray-100 rounded-xl bg-gray-50/50 px-4 py-4 text-left outline-none hover:border-gray-200 transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Building2 size={18} className="text-gray-400 shrink-0" />
                        <span className="truncate font-medium text-black">
                          {isFetchingTenants ? "Fetching..." : selectedTenantDisplay}
                        </span>
                      </div>
                      <ChevronDown size={18} className={`text-gray-400 transition-transform ${isTenantDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isTenantDropdownOpen && (
                      <div className="absolute bottom-full mb-2 z-50 w-full bg-white border-2 border-gray-100 rounded-xl shadow-2xl overflow-hidden animate-blur-in">
                        <div className="max-h-48 overflow-y-auto">
                          {tenants.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleTenantChange(t.id.toString())}
                              className="w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                            >
                              <span className="font-semibold text-sm group-hover:text-black transition-colors">{t.instanceName}</span>
                              {selectedTenantId === t.id.toString() && <Check size={16} className="text-black" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white font-bold py-5 rounded-xl flex items-center justify-center gap-3 premium-button group"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="uppercase tracking-widest text-sm">Log Into OCTOPUS</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-50 animate-slide-up" style={{ animationDelay: '0.7s' }}>
            <p className="text-gray-400 text-xs text-center font-medium">
              &copy; 2024 Octopus platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Right Section - Video (60%) */}
      <div className="hidden md:block md:w-[60%] bg-[#f5f5f5] relative overflow-hidden animate-blur-in">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={animationVideo} type="video/mp4" />
        </video>
        {/* Subtle overlay for contrast */}
        <div className="absolute inset-0 bg-black/5" />

        {/* Floating Tagline with Glassmorphism */}
        <div className="absolute bottom-12 right-12 animate-slide-up" style={{ animationDelay: '0.8s' }}>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl">
            <p className="text-white font-['Syne'] font-extrabold text-xl leading-tight uppercase tracking-tighter drop-shadow-sm">
              Optimizing<br />Operations<br />At Scale
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signin