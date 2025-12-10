"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/auth"
import { useState, useEffect } from "react"
import { EmailIcon } from "./components/emailIcon"
import { LockIcon } from "./components/LockIcon"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ArrowRight, XIcon, Eye, EyeOff, Building2, ChevronDown, Check } from "lucide-react"
import { Package, Truck, MapPin, BarChart3, ClipboardCheck, Boxes, Search, TrendingUp, Users, Settings } from "lucide-react"

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={`fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className || ""}`}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={`fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border p-6 shadow-lg duration-200 sm:max-w-lg bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className || ""}`}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
          >
            <XIcon className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={`flex flex-col gap-2 text-center sm:text-left ${className || ""}`}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={`text-3xl leading-none font-semibold ${className || ""}`}
      {...props}
    />
  )
}

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

function Signin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>("")
  const [isFetchingTenants, setIsFetchingTenants] = useState(false)
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false)
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

  // Redirect to overview if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/overview', { replace: true })
    }
  }, [isAuthenticated, authLoading, navigate])

  // Fetch tenants when modal opens
  useEffect(() => {
    if (isModalOpen) {
      fetchTenants()
      // Load previously selected tenant from localStorage
      const storedTenantId = localStorage.getItem('current_tenant_id')
      if (storedTenantId) {
        setSelectedTenantId(storedTenantId)
      }
    }
  }, [isModalOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isTenantDropdownOpen && !target.closest('.tenant-dropdown-container')) {
        setIsTenantDropdownOpen(false)
      }
    }

    if (isTenantDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isTenantDropdownOpen])

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

  const selectedTenant = tenants.find(t => t.id.toString() === selectedTenantId)
  const selectedTenantDisplay = selectedTenant 
    ? `${selectedTenant.instanceName}${selectedTenant.companyName ? ` (${selectedTenant.companyName})` : ''}`
    : "Select a tenant instance"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    const result = await signIn(email, password)
    setIsLoading(false)
    
    // Check if setup is required
    if (result.setupRequired || result.redirectTo === '/setup') {
      navigate('/setup', { replace: true })
      return
    }
    
    if (result.success) {
      console.log("success")
      navigate("/overview")
    } else {
      setError(result.error || "Sign in failed. Please try again.")
    }
  }

  const platformFeatures = [
    {
      title: "Inventory Management",
      items: [
        { icon: Package, label: "Stock Tracking" },
        { icon: Boxes, label: "Multi-Location Warehouses" },
        { icon: Search, label: "Real-Time Inventory Search" },
        { icon: BarChart3, label: "Inventory Analytics" },
      ],
    },
    {
      title: "Operations",
      items: [
        { icon: Truck, label: "Receipts & Deliveries" },
        { icon: MapPin, label: "Route Management" },
        { icon: ClipboardCheck, label: "Putaway Rules" },
        { icon: TrendingUp, label: "Stock Movements" },
      ],
    },
    {
      title: "System Features",
      items: [
        { icon: Users, label: "User Management" },
        { icon: Settings, label: "Configuration" },
        { icon: BarChart3, label: "Reports & Analytics" },
      ],
    },
  ]

  return (
    <div className="relative w-full min-h-screen overflow-y-auto">
      {/* Background Image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url(/man.jpg)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-start pt-8 sm:pt-12 md:pt-16 pb-8 px-4 sm:px-6 md:px-8">
        <div className="w-full max-w-4xl mx-auto sm:ml-[3%]">
          {/* Semi-transparent container for header and cards */}
          <div
            className="bg-[#0A1931]/30 backdrop-blur-sm rounded-3xl p-6 sm:p-8 md:p-10 lg:p-8 animate-fade-in-up"
            style={{ animationDelay: "0.15s", animationFillMode: "both" }}
          >
            {/* Header */}
            <div className="animate-fade-in-up text-center mb-6 sm:mb-8" style={{ animationDelay: "0.1s" }}>
              <p className="text-[#FDD835] text-lg sm:text-xl md:text-xl font-bold tracking-wider">WAREHOUSE MANAGEMENT SYSTEM</p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-4">
              {platformFeatures.map((category, categoryIndex) => (
                <div
                  key={category.title}
                  className="bg-[#1A3D63]/70 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-[#4A7FA7]/20 animate-slide-in-scale shadow-xl hover:shadow-2xl hover:scale-105 hover:-translate-y-2 transition-all duration-500 ease-out hover:border-[#4A7FA7]/50 hover:bg-[#1A3D63]/85 animate-float"
                  style={{
                    animationDelay: `${0.2 + categoryIndex * 0.15}s`,
                    animationFillMode: "both",
                  }}
                >
                  <p
                    className="text-[#FDD835] text-base sm:text-lg lg:text-2xl font-bold mb-3 sm:mb-4 animate-fade-in"
                    style={{ animationDelay: `${0.3 + categoryIndex * 0.15}s` }}
                  >
                    {category.title}
                  </p>
                  <div className="space-y-2 sm:space-y-3">
                    {category.items.map((item, itemIndex) => {
                      const Icon = item.icon
                      return (
                        <div
                          key={itemIndex}
                          className="flex items-center gap-2 sm:gap-3 text-white animate-fade-in-right hover:translate-x-1 transition-transform duration-300"
                          style={{
                            animationDelay: `${0.4 + categoryIndex * 0.15 + itemIndex * 0.1}s`,
                            animationFillMode: "both",
                          }}
                        >
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#6B9DC4]/40 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-[#4A7FA7]/30 hover:bg-[#6B9DC4]/60 hover:scale-110 transition-all duration-300">
                            <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                          </div>
                          <span className="text-sm sm:text-base lg:text-xl font-medium">{item.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sign In Button */}
          <div
            className="animate-fade-in-up text-center mt-6 sm:mt-8"
            style={{ animationDelay: "0.8s", animationFillMode: "both" }}
          >
            <button
              onClick={() => {
                setIsModalOpen(true)
                setError("")
              }}
              className="bg-[#4A7FA7] hover:bg-[#1A3D63] text-white font-semibold py-4 sm:py-5 px-6 sm:px-10 rounded-2xl text-base sm:text-lg transition-all duration-300 inline-flex items-center justify-center gap-2 sm:gap-3 shadow-lg hover:shadow-xl"
            >
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
              Sign In to Platform
            </button>
          </div>
        </div>
      </div>

      {/* Sign In Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open)
        if (!open) {
          setError("")
          setEmail("")
          setPassword("")
          setSelectedTenantId("")
          setIsTenantDropdownOpen(false)
        }
      }}>
        <DialogContent className="sm:max-w-md bg-white border-[#4A7FA7]/20 p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl font-bold text-[#0A1931] text-center mb-2">Sign In</DialogTitle>
            <p className="text-xs sm:text-sm text-gray-500 text-center">Welcome back! Please enter your credentials</p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 mt-4 sm:mt-6">
            <div className="space-y-4 sm:space-y-5">
              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-[#0A1931]">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <EmailIcon color="#4A7FA7" width={18} height={18} />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError("")
                    }}
                    placeholder="Enter your email"
                    required
                    disabled={isLoading}
                    className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7FA7] focus:border-[#4A7FA7] transition-all bg-gray-50 hover:bg-white hover:border-[#4A7FA7]/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-[#0A1931]">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <LockIcon color="#4A7FA7" width={18} height={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError("")
                    }}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                    className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7FA7] focus:border-[#4A7FA7] transition-all bg-gray-50 hover:bg-white hover:border-[#4A7FA7]/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[#4A7FA7] hover:text-[#1A3D63] transition-colors disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              {/* Tenant Selection */}
              <div className="space-y-2">
                <label htmlFor="tenant" className="text-sm font-medium text-[#0A1931]">
                  Tenant Instance
                </label>
                <div className="relative tenant-dropdown-container">
                  <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                    <Building2 className="w-5 h-5 text-[#4A7FA7]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => !isLoading && !isFetchingTenants && setIsTenantDropdownOpen(!isTenantDropdownOpen)}
                    disabled={isLoading || isFetchingTenants}
                    className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7FA7] focus:border-[#4A7FA7] transition-all bg-gray-50 hover:bg-white hover:border-[#4A7FA7]/40 disabled:opacity-50 disabled:cursor-not-allowed text-left flex items-center justify-between"
                  >
                    <span className={`truncate ${!selectedTenantId ? 'text-gray-400' : 'text-[#0A1931]'}`}>
                      {isFetchingTenants ? 'Loading tenants...' : selectedTenantDisplay}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#4A7FA7] transition-transform ${isTenantDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isTenantDropdownOpen && !isFetchingTenants && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                      <button
                        type="button"
                        onClick={() => handleTenantChange("")}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between border-b border-gray-100"
                      >
                        <span className="text-gray-400">Select a tenant instance</span>
                        {!selectedTenantId && <Check className="w-4 h-4 text-[#4A7FA7]" />}
                      </button>
                      {tenants.map((tenant) => (
                        <button
                          key={tenant.id}
                          type="button"
                          onClick={() => handleTenantChange(tenant.id.toString())}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[#0A1931] truncate">{tenant.instanceName}</div>
                            {tenant.companyName && (
                              <div className="text-xs text-gray-500 truncate">{tenant.companyName}</div>
                            )}
                          </div>
                          {selectedTenantId === tenant.id.toString() && (
                            <Check className="w-4 h-4 text-[#4A7FA7] ml-2 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 animate-fade-in">
                  {error}
                </div>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                className="text-xs sm:text-sm text-[#4A7FA7] hover:text-[#1A3D63] transition-colors font-medium"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#4A7FA7] hover:bg-[#1A3D63] text-white font-semibold py-3 sm:py-4 px-6 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? "Signing in..." : "Log In"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInScale {
          from {
            opacity: 0;
            transform: translateX(-80px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out;
        }

        .animate-slide-in-scale {
          animation: slideInScale 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
          animation-fill-mode: both;
        }

        .animate-fade-in-right {
          animation: fadeInRight 0.5s ease-out;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-float:nth-child(2) {
          animation-delay: 0.5s;
        }

        .animate-float:nth-child(3) {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  )
}

export default Signin
