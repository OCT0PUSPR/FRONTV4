
"use client"

import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { 
  RefreshCcw, 
  MessageSquare,
  AlertTriangle,
  ArrowRight
} from "lucide-react"
import { API_CONFIG } from "./config/api"

export default function Error500() {
  const navigate = useNavigate()
  const [isRetrying, setIsRetrying] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)

  // Check backend connection on mount/refresh
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/license/check`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // If we get a response (even if not ok), backend is accessible
        if (res && res.status !== 0) {
          // Backend is accessible, redirect to overview
          navigate('/overview', { replace: true })
          return
        }
      } catch (error: any) {
        // Connection still failed, stay on error500 page
        console.log('Backend still unavailable:', error)
      } finally {
        setIsCheckingConnection(false)
      }
    }

    checkBackendConnection()
  }, [navigate])

  const handleRetry = async () => {
    setIsRetrying(true)
    
    // Check backend connection before reloading
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/license/check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res && res.status !== 0) {
        // Backend is accessible, redirect to overview
        navigate('/overview', { replace: true })
        return
      }
    } catch (error) {
      // Connection still failed, reload page
      console.log('Backend still unavailable, reloading...')
    }
    
    // If still not connected, reload the page
    setTimeout(() => {
      setIsRetrying(false)
      window.location.reload()
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-white text-black font-space overflow-hidden flex flex-col items-center justify-center relative selection:bg-black/10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        .font-space { font-family: 'Space Grotesk', sans-serif; }
        
        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.05); }
          70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(0, 0, 0, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
        }

        .animate-fade-up { animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-ring { animation: pulse-ring 3s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
        
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }

        .premium-shadow {
          box-shadow: 
            0 20px 40px -4px rgba(0, 0, 0, 0.08),
            0 8px 16px -4px rgba(0, 0, 0, 0.04);
        }
      `}</style>

      {/* Clean Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Blurs */}
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-gray-100 blur-[100px] rounded-full mix-blend-multiply opacity-60" />
        <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-blue-50 blur-[120px] rounded-full mix-blend-multiply opacity-50" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center">
        {isCheckingConnection ? (
          <div className="text-center">
            <div className="mb-8 relative">
              <div className="relative w-24 h-24 flex items-center justify-center mx-auto">
                <div className="absolute inset-0 bg-gray-50 rounded-full animate-pulse-ring" />
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-xl relative z-10">
                  <RefreshCcw className="w-10 h-10 text-black animate-spin" strokeWidth={1.5} />
                </div>
              </div>
            </div>
            <p className="text-lg text-gray-500 font-medium">
              Checking connection...
            </p>
          </div>
        ) : (
          <>
            {/* Icon Element */}
            <div className="mb-12 relative animate-fade-up">
               <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gray-50 rounded-full animate-pulse-ring" />
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-xl relative z-10 animate-float">
                     <AlertTriangle className="w-10 h-10 text-black" strokeWidth={1.5} />
                  </div>
               </div>
            </div>

            {/* Text Content */}
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-black mb-6 animate-fade-up delay-100">
                System Unavailable
              </h1>
              
              <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-md mx-auto animate-fade-up delay-200">
                Our server is currently unavailable. Please try refreshing the page or contact our support team for immediate assistance.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full animate-fade-up delay-300">
              <button 
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex-1 h-14 rounded-2xl bg-black text-white font-bold text-sm tracking-wide transition-all hover:bg-gray-900 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2 premium-shadow"
              >
                 <RefreshCcw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                 <span>{isRetrying ? 'Retrying...' : 'Refresh Page'}</span>
              </button>

              <button 
                onClick={() => window.open('mailto:support@example.com')}
                className="flex-1 h-14 rounded-2xl bg-white border border-gray-200 text-black font-bold text-sm tracking-wide transition-all hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center gap-2 group premium-shadow"
              >
                <span>Contact Support</span>
                <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
