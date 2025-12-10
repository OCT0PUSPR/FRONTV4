import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { AuthProvider } from '../context/auth.tsx';
import { SetupAuthProvider } from '../context/setupAuth';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

console.log('[MAIN] Starting application initialization...')

try {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  console.log('[MAIN] Root element found, creating React root...')

  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <SetupAuthProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </SetupAuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
  console.log('[MAIN] Application rendered successfully')
} catch (error) {
  console.error('[MAIN] Fatal error during initialization:', error)
  throw error
}
