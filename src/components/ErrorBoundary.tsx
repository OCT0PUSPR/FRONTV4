"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { RefreshCcw, Home, AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  isDark: boolean
  isLoaded: boolean
}

// Theme colors based on mode (same as error500.tsx for consistency)
const getColors = (isDark: boolean) =>
  isDark
    ? {
        background: '#09090b',
        textPrimary: '#fafafa',
        textSecondary: '#a1a1aa',
        card: '#18181b',
        border: '#27272a',
        action: '#3b82f6',
        actionHover: '#2563eb',
        muted: '#27272a',
        errorBg: 'rgba(239, 68, 68, 0.15)',
        errorNumber: 'rgba(255, 255, 255, 0.08)',
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
        errorBg: 'rgba(239, 68, 68, 0.1)',
        errorNumber: 'rgba(0, 0, 0, 0.06)',
      }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    // Get theme from localStorage (can't use context on error page as providers may have failed)
    let isDark = false
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme_mode')
      isDark = savedTheme === 'dark'
    }
    this.state = { hasError: false, error: null, isDark, isLoaded: false }
  }

  componentDidMount() {
    this.setState({ isLoaded: true })
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/overview'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { isDark, isLoaded } = this.state
      const colors = getColors(isDark)

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

          {/* Error Icon */}
          <div
            className={isLoaded ? 'animate-fade-in' : ''}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: colors.errorBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              opacity: isLoaded ? 1 : 0,
            }}
          >
            <AlertTriangle size={40} color="#ef4444" strokeWidth={1.5} />
          </div>

          {/* Error Number */}
          <h1
            className={isLoaded ? 'animate-fade-in animate-pulse-slow delay-1' : ''}
            style={{
              fontSize: 'clamp(120px, 25vw, 200px)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.05em',
              color: colors.errorNumber,
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
            Something Went Wrong
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
            An unexpected error occurred in the application. Please try reloading the page or go back to the home page.
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
              onClick={this.handleReload}
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
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = colors.actionHover
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = colors.action
              }}
            >
              <RefreshCcw size={18} />
              Reload
            </button>

            <button
              onClick={this.handleGoHome}
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
              Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
