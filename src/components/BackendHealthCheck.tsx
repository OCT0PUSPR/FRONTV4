"use client"

import { useState, useEffect, useRef, ReactNode } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { API_CONFIG } from "../config/api"
import Lottie from 'lottie-react'
import loadingAnimation from '../assets/Loading.json'

interface BackendHealthCheckProps {
  children: ReactNode
}

// Routes that don't require backend connectivity
const OFFLINE_ROUTES = ['/error500', '/signin']

export function BackendHealthCheck({ children }: BackendHealthCheckProps) {
  const [isChecking, setIsChecking] = useState(true)
  const [isBackendAvailable, setIsBackendAvailable] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasCheckedRef = useRef(false)

  // Check if current route allows offline access
  const isOfflineRoute = OFFLINE_ROUTES.some(route => location.pathname === route)

  useEffect(() => {
    // Skip check for offline routes
    if (isOfflineRoute) {
      setIsChecking(false)
      return
    }

    // Only run initial check once
    if (hasCheckedRef.current) {
      return
    }

    const checkBackendHealth = async (): Promise<boolean> => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/health`, {
          method: 'GET',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Any response means backend is up (even error responses)
        return response.status > 0
      } catch (error: any) {
        // Check if it's a network error (backend unreachable)
        if (error.name === 'AbortError' || error.name === 'TypeError' || error.message?.includes('fetch')) {
          return false
        }
        // Other errors might still mean backend is up
        return true
      }
    }

    const runHealthCheck = async () => {
      hasCheckedRef.current = true
      const isAvailable = await checkBackendHealth()

      setIsBackendAvailable(isAvailable)
      setIsChecking(false)

      if (!isAvailable) {
        navigate('/error500', { replace: true })
      }
    }

    runHealthCheck()

    // Set up periodic health checks (every 30 seconds)
    checkIntervalRef.current = setInterval(async () => {
      const isAvailable = await checkBackendHealth()

      if (!isAvailable && !OFFLINE_ROUTES.includes(location.pathname)) {
        setIsBackendAvailable(false)
        navigate('/error500', { replace: true })
      } else if (isAvailable && location.pathname === '/error500') {
        // Backend came back online, redirect to home
        setIsBackendAvailable(true)
        navigate('/overview', { replace: true })
      }
    }, 30000)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [navigate, location.pathname, isOfflineRoute])

  // Show loading while checking (except for offline routes)
  if (isChecking && !isOfflineRoute) {
    const savedTheme = localStorage.getItem('theme_mode') || 'light'
    const isDark = savedTheme === 'dark'

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: isDark ? '#09090b' : '#ffffff'
      }}>
        <div style={{
          width: '300px',
          height: '300px',
          maxWidth: '90vw',
          maxHeight: '90vh'
        }}>
          <Lottie
            animationData={loadingAnimation}
            loop={true}
            style={{
              width: '100%',
              height: '100%'
            }}
          />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
