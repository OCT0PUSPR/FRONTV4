"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { RefreshCcw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
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

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            background: '#f9fafb',
          }}
        >
          <style>{`
            @keyframes fade-in {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse-slow {
              0%, 100% { opacity: 0.06; }
              50% { opacity: 0.1; }
            }
            .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
            .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
            .delay-1 { animation-delay: 0.1s; opacity: 0; }
            .delay-2 { animation-delay: 0.2s; opacity: 0; }
            .delay-3 { animation-delay: 0.3s; opacity: 0; }
            @media (prefers-color-scheme: dark) {
              .error-bg { background: #111827 !important; }
              .error-title { color: #fff !important; }
              .error-desc { color: #9ca3af !important; }
              .error-number { color: rgba(255,255,255,0.1) !important; }
              .error-btn-secondary { background: #1f2937 !important; color: #fff !important; }
            }
          `}</style>

          {/* Error Number */}
          <h1
            className="animate-fade-in animate-pulse-slow error-number"
            style={{
              fontSize: 'clamp(120px, 25vw, 240px)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.05em',
              color: 'rgba(0,0,0,0.06)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            500
          </h1>

          {/* Title */}
          <h2
            className="animate-fade-in delay-1 error-title"
            style={{
              fontSize: '1.75rem',
              fontWeight: 600,
              marginTop: '-2rem',
              marginBottom: '0.75rem',
              color: '#111827',
              animationFillMode: 'forwards',
            }}
          >
            Something Went Wrong
          </h2>

          {/* Description */}
          <p
            className="animate-fade-in delay-2 error-desc"
            style={{
              fontSize: '1rem',
              textAlign: 'center',
              maxWidth: '400px',
              marginBottom: '2rem',
              color: '#6b7280',
              animationFillMode: 'forwards',
            }}
          >
            An unexpected error occurred. Please reload the page.
          </p>

          {/* Buttons */}
          <div
            className="animate-fade-in delay-3"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              animationFillMode: 'forwards',
            }}
          >
            <button
              onClick={this.handleReload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                fontWeight: 500,
                fontSize: '0.875rem',
                color: '#fff',
                background: '#2563eb',
                border: 'none',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              <RefreshCcw size={16} />
              Reload
            </button>

            <button
              onClick={this.handleGoHome}
              className="error-btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                fontWeight: 500,
                fontSize: '0.875rem',
                color: '#111827',
                background: '#f3f4f6',
                border: 'none',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              <Home size={16} />
              Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
