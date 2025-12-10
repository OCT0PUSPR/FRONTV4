/**
 * Setup Authentication Context
 * Separate authentication context for the setup page
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface SetupAuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  username: string | null
  token: string | null
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  validateSession: () => Promise<boolean>
}

const SetupAuthContext = createContext<SetupAuthContextType | null>(null)

// Use buildApiUrl helper to avoid double /api issue
import { buildApiUrl } from '../src/config/api'
const SETUP_TOKEN_KEY = 'setup_auth_token'
const SETUP_USERNAME_KEY = 'setup_auth_username'

export const SetupAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Load session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(SETUP_TOKEN_KEY)
    const storedUsername = localStorage.getItem(SETUP_USERNAME_KEY)

    if (storedToken && storedUsername) {
      setToken(storedToken)
      setUsername(storedUsername)
      // Validate the session
      validateSession(storedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  // Validate session token
  const validateSession = useCallback(async (tokenToValidate?: string): Promise<boolean> => {
    const tokenToCheck = tokenToValidate || token
    if (!tokenToCheck) {
      setIsAuthenticated(false)
      setIsLoading(false)
      return false
    }

    try {
      const response = await fetch(buildApiUrl('/setup-auth/validate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Setup-Token': tokenToCheck,
        },
      })

      const data = await response.json()

      if (data.success && data.valid) {
        setIsAuthenticated(true)
        setIsLoading(false)
        if (data.username) {
          setUsername(data.username)
          localStorage.setItem(SETUP_USERNAME_KEY, data.username)
        }
        return true
      } else {
        // Session invalid, clear storage
        setIsAuthenticated(false)
        setIsLoading(false)
        localStorage.removeItem(SETUP_TOKEN_KEY)
        localStorage.removeItem(SETUP_USERNAME_KEY)
        setToken(null)
        setUsername(null)
        return false
      }
    } catch (error) {
      console.error('[SetupAuth] Session validation error:', error)
      setIsAuthenticated(false)
      setIsLoading(false)
      localStorage.removeItem(SETUP_TOKEN_KEY)
      localStorage.removeItem(SETUP_USERNAME_KEY)
      setToken(null)
      setUsername(null)
      return false
    }
  }, [token])

  // Login
  const login = useCallback(async (username: string, password: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(buildApiUrl('/setup-auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (data.success && data.token) {
        setToken(data.token)
        setUsername(data.username)
        setIsAuthenticated(true)
        setIsLoading(false)
        
        // Store in localStorage
        localStorage.setItem(SETUP_TOKEN_KEY, data.token)
        localStorage.setItem(SETUP_USERNAME_KEY, data.username)
        
        return { success: true }
      } else {
        setIsAuthenticated(false)
        setIsLoading(false)
        return { success: false, error: data.message || 'Login failed' }
      }
    } catch (error: any) {
      console.error('[SetupAuth] Login error:', error)
      setIsAuthenticated(false)
      setIsLoading(false)
      return { success: false, error: error.message || 'Network error' }
    }
  }, [])

  // Logout
  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch(buildApiUrl('/setup-auth/logout'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Setup-Token': token,
          },
        })
      }
    } catch (error) {
      console.error('[SetupAuth] Logout error:', error)
    } finally {
      setIsAuthenticated(false)
      setToken(null)
      setUsername(null)
      localStorage.removeItem(SETUP_TOKEN_KEY)
      localStorage.removeItem(SETUP_USERNAME_KEY)
    }
  }, [token])

  return (
    <SetupAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        username,
        token,
        login,
        logout,
        validateSession,
      }}
    >
      {children}
    </SetupAuthContext.Provider>
  )
}

export const useSetupAuth = () => {
  const context = useContext(SetupAuthContext)
  if (!context) {
    throw new Error('useSetupAuth must be used within SetupAuthProvider')
  }
  return context
}



