/**
 * Tenant Check Component
 * Checks if tenants exist and redirects to setup if none found
 */

import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Lottie from 'lottie-react'
import loadingAnimation from '../assets/Loading.json'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3006'

interface TenantCheckProps {
  children: React.ReactNode
}

export default function TenantCheck({ children }: TenantCheckProps) {
  const [isChecking, setIsChecking] = useState(true)
  const [hasTenants, setHasTenants] = useState<boolean | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const checkTenants = async () => {
      // Don't check if we're already on setup, signin, or license page
      // License is system-wide and doesn't require tenants
      if (location.pathname === '/setup' || location.pathname === '/signin' || location.pathname === '/license') {
        setIsChecking(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/setup-auth/check-tenants`)
        const data = await response.json()

        if (data.success) {
          setHasTenants(data.hasTenants)
          
          // If no tenants exist and we're not on setup or license page, redirect to setup
          if (!data.hasTenants && location.pathname !== '/setup' && location.pathname !== '/license') {
            navigate('/setup', { replace: true })
          }
        } else {
          // On error, assume tenants exist to avoid blocking the app
          setHasTenants(true)
        }
      } catch (error) {
        console.error('[TenantCheck] Error checking tenants:', error)
        // On error, assume tenants exist to avoid blocking the app
        setHasTenants(true)
      } finally {
        setIsChecking(false)
      }
    }

    checkTenants()
  }, [location.pathname, navigate])

  if (isChecking) {
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
        backgroundColor: '#ffffff'
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



