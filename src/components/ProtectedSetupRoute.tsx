/**
 * Protected Setup Route Component
 * Protects the setup page with setup authentication
 */

import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useSetupAuth } from '../../context/setupAuth'
import SetupLogin from './SetupLogin'
import Lottie from 'lottie-react'
import loadingAnimation from '../assets/loading.json'

interface ProtectedSetupRouteProps {
  children: React.ReactNode
}

export default function ProtectedSetupRoute({ children }: ProtectedSetupRouteProps) {
  const { isAuthenticated, isLoading, validateSession, token } = useSetupAuth()
  const [isValidating, setIsValidating] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      if (token) {
        await validateSession()
      }
      setIsValidating(false)
    }
    checkSession()
  }, [token, validateSession])

  if (isLoading || isValidating) {
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

  if (!isAuthenticated) {
    return <SetupLogin />
  }

  return <>{children}</>
}



