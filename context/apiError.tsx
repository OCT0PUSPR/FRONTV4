/**
 * API Error Context
 * Handles global API errors like session expiration and connection failures
 */
"use client"

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface ApiErrorContextType {
  // Connection state
  isBackendConnected: boolean
  // Session state
  isSessionExpired: boolean
  // Methods to handle errors
  handleApiError: (error: any, response?: Response | null) => void
  handleConnectionError: () => void
  handleSessionExpired: () => void
  // Reset methods
  resetConnectionError: () => void
  resetSessionExpired: () => void
}

const ApiErrorContext = createContext<ApiErrorContextType | null>(null)

export function useApiError() {
  const context = useContext(ApiErrorContext)
  if (!context) {
    throw new Error('useApiError must be used within ApiErrorProvider')
  }
  return context
}

interface ApiErrorProviderProps {
  children: ReactNode
  onSignOut: () => void
}

export function ApiErrorProvider({ children, onSignOut }: ApiErrorProviderProps) {
  const navigate = useNavigate()
  const [isBackendConnected, setIsBackendConnected] = useState(true)
  const [isSessionExpired, setIsSessionExpired] = useState(false)

  // Prevent multiple redirects
  const hasRedirectedRef = useRef(false)
  const sessionExpiredHandledRef = useRef(false)

  /**
   * Handle session expiration
   * Clears session and redirects to sign in
   */
  const handleSessionExpired = useCallback(() => {
    if (sessionExpiredHandledRef.current) return
    sessionExpiredHandledRef.current = true

    console.log('[ApiError] Session expired, signing out...')
    setIsSessionExpired(true)

    // Clear session data
    onSignOut()

    // Redirect to sign in
    navigate('/signin', { replace: true })

    // Reset flag after a delay to allow re-triggering if needed
    setTimeout(() => {
      sessionExpiredHandledRef.current = false
    }, 2000)
  }, [onSignOut, navigate])

  /**
   * Handle backend connection error
   * Redirects to error500 page
   */
  const handleConnectionError = useCallback(() => {
    if (hasRedirectedRef.current) return

    // Don't redirect if already on error500 or signin
    const currentPath = window.location.pathname
    if (currentPath === '/error500' || currentPath === '/signin') return

    hasRedirectedRef.current = true
    console.log('[ApiError] Backend connection lost, redirecting to error page...')
    setIsBackendConnected(false)

    navigate('/error500', { replace: true })

    // Reset flag after navigation
    setTimeout(() => {
      hasRedirectedRef.current = false
    }, 2000)
  }, [navigate])

  /**
   * Handle API errors
   * Detects session expiration (401) and connection errors
   */
  const handleApiError = useCallback((error: any, response?: Response | null) => {
    // Check for 401 Unauthorized (session expired)
    if (response?.status === 401) {
      handleSessionExpired()
      return
    }

    // Check error message for session-related errors
    const errorMessage = error?.message?.toLowerCase() || ''
    if (
      errorMessage.includes('session') && (errorMessage.includes('expired') || errorMessage.includes('invalid')) ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('not authenticated') ||
      errorMessage.includes('access denied')
    ) {
      handleSessionExpired()
      return
    }

    // Check for network/connection errors
    if (
      error?.name === 'TypeError' && errorMessage.includes('fetch') ||
      error?.name === 'AbortError' ||
      errorMessage.includes('network') ||
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('connection') && errorMessage.includes('refused')
    ) {
      handleConnectionError()
      return
    }

    // Log other errors for debugging
    console.error('[ApiError] Unhandled API error:', error)
  }, [handleSessionExpired, handleConnectionError])

  /**
   * Reset connection error state (called when backend comes back online)
   */
  const resetConnectionError = useCallback(() => {
    setIsBackendConnected(true)
    hasRedirectedRef.current = false
  }, [])

  /**
   * Reset session expired state
   */
  const resetSessionExpired = useCallback(() => {
    setIsSessionExpired(false)
    sessionExpiredHandledRef.current = false
  }, [])

  const value: ApiErrorContextType = {
    isBackendConnected,
    isSessionExpired,
    handleApiError,
    handleConnectionError,
    handleSessionExpired,
    resetConnectionError,
    resetSessionExpired,
  }

  return (
    <ApiErrorContext.Provider value={value}>
      {children}
    </ApiErrorContext.Provider>
  )
}

/**
 * Helper function to wrap fetch calls with error handling
 * Use this in data fetching hooks/contexts
 */
export function createApiErrorHandler(handleApiError: ApiErrorContextType['handleApiError']) {
  return async function fetchWithErrorHandling(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    try {
      const response = await fetch(url, options)

      // Check for session expiration
      if (response.status === 401) {
        handleApiError(new Error('Session expired'), response)
        throw new Error('Session expired')
      }

      return response
    } catch (error: any) {
      handleApiError(error, null)
      throw error
    }
  }
}
