/**
 * Setup Login Component
 * Login page for the setup authentication
 */

import { useState } from 'react'
import { useSetupAuth } from '../../context/setupAuth'
import { useTheme } from '../../context/theme'
import { Lock, User, Loader2, AlertCircle, Sun, Moon } from 'lucide-react'
import { Button } from '../../@/components/ui/button'
import { Input } from '../../@/components/ui/input'
import { Card, CardContent } from '../../@/components/ui/card'

export default function SetupLogin() {
  const { login, isLoading } = useSetupAuth()
  const { mode, setMode, colors } = useTheme()
  const isDarkMode = mode === 'dark'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleTheme = () => setMode(isDarkMode ? 'light' : 'dark')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username || !password) {
      setError('Please enter both username and password')
      return
    }

    setIsSubmitting(true)
    const result = await login(username, password)
    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error || 'Login failed')
    }
  }

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative"
      style={{ backgroundColor: colors.background }}
    >
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <Sun className={`w-4 h-4 transition-colors ${isDarkMode ? "text-zinc-600" : "text-amber-500"}`} />
        <button
          onClick={toggleTheme}
          className={`relative inline-flex h-6 w-11 rounded-full transition-all duration-300 shadow-inner ${
            isDarkMode ? "bg-zinc-700 shadow-zinc-900/50" : "bg-slate-200 shadow-slate-300/50"
          }`}
          aria-label="Toggle theme"
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full transition-all duration-300 shadow-md ${
              isDarkMode ? "bg-gradient-to-br from-blue-500 to-cyan-500 right-0.5" : "bg-white left-0.5"
            }`}
          />
        </button>
        <Moon className={`w-4 h-4 transition-colors ${isDarkMode ? "text-blue-400" : "text-zinc-400"}`} />
      </div>


      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <Card 
          className="shadow-xl"
          style={{ 
            backgroundColor: colors.card,
            borderColor: colors.border 
          }}
        >
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-4">
                <Lock size={28} className="text-white" />
              </div>
              <h1 
                className="text-2xl font-bold mb-2"
                style={{ color: colors.textPrimary }}
              >
                Setup Authentication
              </h1>
              <p 
                className="text-sm"
                style={{ color: colors.textSecondary }}
              >
                Enter your credentials to access the setup page
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div 
                className="mb-6 p-4 rounded-xl flex items-start gap-3"
                style={{ 
                  backgroundColor: isDarkMode ? '#7f1d1d' : '#fef2f2',
                  borderColor: isDarkMode ? '#991b1b' : '#fecaca',
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
              >
                <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p 
                  className="text-sm"
                  style={{ color: isDarkMode ? '#fca5a5' : '#991b1b' }}
                >
                  {error}
                </p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: colors.textPrimary }}
                >
                  <User size={14} className="inline mr-2" />
                  Username
                </label>
                <Input
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full"
                  disabled={isSubmitting || isLoading}
                  autoFocus
                  style={{
                    backgroundColor: colors.mutedBg,
                    color: colors.textPrimary,
                    borderColor: colors.border
                  }}
                />
              </div>

              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: colors.textPrimary }}
                >
                  <Lock size={14} className="inline mr-2" />
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full"
                  disabled={isSubmitting || isLoading}
                  style={{
                    backgroundColor: colors.mutedBg,
                    color: colors.textPrimary,
                    borderColor: colors.border
                  }}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || isLoading || !username || !password}
                className="w-full h-12 font-medium rounded-xl"
                style={{
                  backgroundColor: isSubmitting || isLoading || !username || !password 
                    ? colors.mutedBg 
                    : '#4facfe',
                  color: isSubmitting || isLoading || !username || !password 
                    ? colors.textSecondary 
                    : '#ffffff',
                  opacity: isSubmitting || isLoading || !username || !password ? 0.6 : 1
                }}
              >
                {isSubmitting || isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <Lock size={18} className="ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer */}
            <p 
              className="mt-6 text-xs text-center"
              style={{ color: colors.textSecondary }}
            >
              This authentication is separate from the main application
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



