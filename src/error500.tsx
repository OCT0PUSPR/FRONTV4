"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { RefreshCcw, Home } from "lucide-react"
import { API_CONFIG } from "./config/api"

export default function Error500() {
  const navigate = useNavigate()
  const [isRetrying, setIsRetrying] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)

    // Check backend connection on mount
    const checkConnection = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)

        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/license/check`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (res && res.status !== 0) {
          navigate('/overview', { replace: true })
          return
        }
      } catch (error) {
        console.log('Backend unavailable')
      } finally {
        setIsChecking(false)
      }
    }

    checkConnection()
  }, [navigate])

  const handleRetry = async () => {
    setIsRetrying(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/license/check`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res && res.status !== 0) {
        navigate('/overview', { replace: true })
        return
      }
    } catch (error) {
      console.log('Backend still unavailable')
    }

    setTimeout(() => {
      setIsRetrying(false)
      window.location.reload()
    }, 500)
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50 dark:bg-gray-900">
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.1; }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .delay-1 { animation-delay: 0.1s; opacity: 0; }
        .delay-2 { animation-delay: 0.2s; opacity: 0; }
        .delay-3 { animation-delay: 0.3s; opacity: 0; }
      `}</style>

      {/* 500 Number */}
      <h1
        className={`text-[180px] md:text-[240px] font-black leading-none tracking-tighter ${isLoaded ? 'animate-fade-in animate-pulse-slow' : 'opacity-0'}`}
        style={{
          color: 'rgba(0,0,0,0.06)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <span className="dark:text-white/10">500</span>
      </h1>

      {/* Title */}
      <h2
        className={`text-2xl md:text-3xl font-semibold -mt-8 mb-3 text-gray-900 dark:text-white ${isLoaded ? 'animate-fade-in delay-1' : 'opacity-0'}`}
        style={{ animationFillMode: 'forwards' }}
      >
        Server Unavailable
      </h2>

      {/* Description */}
      <p
        className={`text-base text-center max-w-md mb-8 text-gray-500 dark:text-gray-400 ${isLoaded ? 'animate-fade-in delay-2' : 'opacity-0'}`}
        style={{ animationFillMode: 'forwards' }}
      >
        The server is currently unavailable. Please try again.
      </p>

      {/* Buttons */}
      <div
        className={`flex items-center gap-4 ${isLoaded ? 'animate-fade-in delay-3' : 'opacity-0'}`}
        style={{ animationFillMode: 'forwards' }}
      >
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-60"
        >
          <RefreshCcw size={18} className={isRetrying ? 'animate-spin' : ''} />
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>

        <button
          onClick={() => navigate('/overview')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:opacity-80 transition-all"
        >
          <Home size={18} />
          Home
        </button>
      </div>
    </div>
  )
}
