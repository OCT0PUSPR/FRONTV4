"use client"

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, ArrowLeft } from 'lucide-react'
import { useTheme } from '../../../context/theme'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { colors, mode } = useTheme()
  const isRTL = i18n?.dir() === 'rtl'
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: colors.background }}
    >
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }

        .delay-1 { animation-delay: 0.1s; opacity: 0; }
        .delay-2 { animation-delay: 0.2s; opacity: 0; }
        .delay-3 { animation-delay: 0.3s; opacity: 0; }
      `}</style>

      {/* 404 Number */}
      <h1
        className={`text-[180px] md:text-[240px] font-black leading-none tracking-tighter ${isLoaded ? 'animate-fade-in animate-bounce-gentle' : 'opacity-0'}`}
        style={{
          color: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        404
      </h1>

      {/* Title */}
      <h2
        className={`text-2xl md:text-3xl font-semibold -mt-8 mb-3 ${isLoaded ? 'animate-fade-in delay-1' : 'opacity-0'}`}
        style={{ color: colors.textPrimary, animationFillMode: 'forwards' }}
      >
        {t('errors.page_not_found', 'Page Not Found')}
      </h2>

      {/* Description */}
      <p
        className={`text-base text-center max-w-md mb-8 ${isLoaded ? 'animate-fade-in delay-2' : 'opacity-0'}`}
        style={{ color: colors.textSecondary, animationFillMode: 'forwards' }}
      >
        {t('errors.page_not_found_desc', "The page you're looking for doesn't exist or has been moved.")}
      </p>

      {/* Buttons */}
      <div
        className={`flex items-center gap-4 ${isLoaded ? 'animate-fade-in delay-3' : 'opacity-0'}`}
        style={{ animationFillMode: 'forwards' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-80"
          style={{
            background: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            color: colors.textPrimary,
          }}
        >
          <ArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
          {t('common.go_back', 'Go Back')}
        </button>

        <button
          onClick={() => navigate('/overview')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white transition-all hover:opacity-90"
          style={{ background: colors.action }}
        >
          <Home size={18} />
          {t('common.home', 'Home')}
        </button>
      </div>
    </div>
  )
}
