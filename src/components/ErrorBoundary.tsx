"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    // Clear caches and reload
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name)
        })
      })
    }
    
    // Clear localStorage caches
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('vite') || key.includes('cache')) {
        localStorage.removeItem(key)
      }
    })
    
    // Reload the page
    window.location.reload()
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
            padding: '2rem',
            background: '#f9fafb',
            color: '#1f2937',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <AlertTriangle size={48} style={{ color: '#ef4444' }} />
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Something went wrong</h1>
            </div>
            
            <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
              An error occurred while loading the page. This might be due to a cached file issue.
            </p>
            
            {this.state.error && (
              <details style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Error Details
                </summary>
                <pre style={{ fontSize: '0.875rem', overflow: 'auto', margin: 0 }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <button
              onClick={this.handleReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              <RefreshCcw size={20} />
              Clear Cache & Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}



