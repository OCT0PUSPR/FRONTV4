import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en/translation.json'
import ar from './locales/ar/translation.json'

const resources = {
  en: { translation: en },
  ar: { translation: ar },
}

try {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      supportedLngs: ['en', 'ar'],
      nonExplicitSupportedLngs: true,
      load: 'languageOnly',
      interpolation: { escapeValue: false },
      detection: {
        // localStorage first, then navigator
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage']
      }
    })
} catch (error) {
  console.error('[I18N] Fatal error during i18n initialization:', error)
  throw error
}

// Set document direction/lang and font on load and language change
const setDir = (lng: string) => {
  const dir = i18n.dir(lng)
  document.documentElement.setAttribute('dir', dir)
  document.documentElement.setAttribute('lang', lng)
  
  // Set font family based on language - apply to body and root
  const rootElement = document.getElementById('root')
  if (lng === 'ar') {
    document.body.style.fontFamily = '"Cairo", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    if (rootElement) {
      rootElement.style.fontFamily = '"Cairo", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }
    // Add class to html for CSS targeting
    document.documentElement.classList.add('arabic-font')
    document.documentElement.classList.remove('english-font')
  } else {
    document.body.style.fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    if (rootElement) {
      rootElement.style.fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }
    // Add class to html for CSS targeting
    document.documentElement.classList.add('english-font')
    document.documentElement.classList.remove('arabic-font')
  }
}

try {
  const initialLang = i18n.resolvedLanguage || i18n.language || 'en'
  setDir(initialLang)
  
  i18n.on('languageChanged', (lng) => {
    setDir(lng)
  })
} catch (error) {
}

export default i18n
