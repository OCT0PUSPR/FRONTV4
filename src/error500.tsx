"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { RefreshCcw, Home, ServerOff } from "lucide-react"
import { API_CONFIG } from "./config/api"

export default function Error500() {
  const navigate = useNavigate()
  const [isRetrying, setIsRetrying] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)

  // Get theme from localStorage (can't use context on error page as providers may have failed)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme_mode')
      return savedTheme === 'dark'
    }
    return false
  })

  // Theme colors based on mode
  const colors = isDark
    ? {
        background: '#09090b',
        textPrimary: '#fafafa',
        textSecondary: '#a1a1aa',
        card: '#18181b',
        border: '#27272a',
        action: '#3b82f6',
        actionHover: '#2563eb',
        muted: '#27272a',
      }
    : {
        background: '#ffffff',
        textPrimary: '#09090b',
        textSecondary: '#71717a',
        card: '#f4f4f5',
        border: '#e4e4e7',
        action: '#3b82f6',
        actionHover: '#2563eb',
        muted: '#f4f4f5',
      }

  useEffect(() => {
    setIsLoaded(true)

    // Check backend connection on mount
    const checkConnection = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)

        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/health`, {
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

      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/health`, {
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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.background,
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: `2px solid ${colors.border}`,
            borderTopColor: colors.action,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: colors.background,
      }}
    >
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.15; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
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
        .delay-4 { animation-delay: 0.4s; opacity: 0; }
      `}</style>

      {/* Server Icon */}
      <div
        className={isLoaded ? 'animate-fade-in' : ''}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '20px',
          background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          opacity: isLoaded ? 1 : 0,
        }}
      >
        <ServerOff size={40} color="#ef4444" strokeWidth={1.5} />
      </div>

      {/* 500 Number */}
      <h1
        className={isLoaded ? 'animate-fade-in animate-pulse-slow delay-1' : ''}
        style={{
          fontSize: 'clamp(120px, 25vw, 200px)',
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-0.05em',
          color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: '-20px 0 0 0',
          animationFillMode: 'forwards',
        }}
      >
        500
      </h1>

      {/* Title */}
      <h2
        className={isLoaded ? 'animate-fade-in delay-2' : ''}
        style={{
          fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
          fontWeight: 600,
          marginTop: '-10px',
          marginBottom: '12px',
          color: colors.textPrimary,
          animationFillMode: 'forwards',
        }}
      >
        Server Unavailable
      </h2>

      {/* Description */}
      <p
        className={isLoaded ? 'animate-fade-in delay-3' : ''}
        style={{
          fontSize: '1rem',
          textAlign: 'center',
          maxWidth: '400px',
          marginBottom: '32px',
          color: colors.textSecondary,
          lineHeight: 1.6,
          animationFillMode: 'forwards',
        }}
      >
        We're having trouble connecting to the server. This might be a temporary issue. Please try again in a moment.
      </p>

      {/* Buttons */}
      <div
        className={isLoaded ? 'animate-fade-in delay-4' : ''}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          animationFillMode: 'forwards',
        }}
      >
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '0.9375rem',
            color: '#ffffff',
            background: colors.action,
            border: 'none',
            cursor: isRetrying ? 'wait' : 'pointer',
            opacity: isRetrying ? 0.7 : 1,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isRetrying) (e.currentTarget as HTMLButtonElement).style.background = colors.actionHover
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = colors.action
          }}
        >
          <RefreshCcw
            size={18}
            style={{
              animation: isRetrying ? 'spin 1s linear infinite' : 'none',
            }}
          />
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>

        <button
          onClick={() => navigate('/signin')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '0.9375rem',
            color: colors.textPrimary,
            background: colors.muted,
            border: `1px solid ${colors.border}`,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1'
          }}
        >
          <Home size={18} />
          Sign In
        </button>
      </div>
    </div>
  )
}
