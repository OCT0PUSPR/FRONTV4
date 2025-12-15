/**
 * Integrations Page
 * Redesigned to match modern card-based UI with categories and tabs
 */

import React, { useState, useEffect } from 'react'
import { useTheme } from '../../context/theme'
import { useTranslation } from 'react-i18next'
import { API_CONFIG, getTenantHeaders } from '../config/api'
import { CustomDropdown } from '../components/NewCustomDropdown'
import {
  Mail,
  Check,
  AlertCircle,
  Loader2,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  Settings,
  Power
} from 'lucide-react'

// --- Brand Icons (SVG Components) ---

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const ShopifyIcon = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" fill="#95BF47">
    <path d="M12.12 1.29C12.12 1.29 16 3.5 16 3.5C16 3.5 14.5 9 14.5 9L9.5 9C9.5 9 8 3.5 8 3.5C8 3.5 11.88 1.29 12.12 1.29ZM3.5 6L2 19.5L12 23L22 19.5L20.5 6H16.5L17.5 13H14.5L13.5 6H10.5L9.5 13H6.5L7.5 6H3.5Z"/>
  </svg>
)

const WooCommerceIcon = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" fill="#96588A">
    <path d="M21.9 12.53C21.9 15.63 19.26 19.29 14.16 19.29C12.35 19.29 10.77 18.72 9.55 17.76L8.43 19.29H5.5L8.03 15.72C6.46 14.28 5.75 12.29 5.75 10.15C5.75 5.56 9.8 1.5 15.17 1.5C18.91 1.5 21.9 3.99 21.9 7.42V12.53ZM13.82 10.63C13.82 11.41 14.18 11.82 14.86 11.82C15.54 11.82 15.89 11.41 15.89 10.63C15.89 9.87 15.54 9.47 14.86 9.47C14.18 9.47 13.82 9.87 13.82 10.63ZM9.94 10.63C9.94 11.41 10.3 11.82 10.98 11.82C11.66 11.82 12.01 11.41 12.01 10.63C12.01 9.87 11.66 9.47 10.98 9.47C10.3 9.47 9.94 9.87 9.94 10.63ZM16.61 5.48C12.43 5.48 9.27 8.1 9.27 11.53C9.27 12.28 9.4 13.01 9.61 13.7C10.18 15.01 11.37 15.73 12.91 15.73C14.45 15.73 15.64 15.01 16.21 13.7C16.42 13.01 16.55 12.28 16.55 11.53C16.55 8.1 13.39 5.48 9.21 5.48H16.61Z"/>
  </svg>
)

const ShipStationIcon = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" fill="#B1CC33">
     <path d="M12 2L2 7V17L12 22L22 17V7L12 2ZM19.5 15.5L12 19.5L4.5 15.5V8.5L12 4.5L19.5 8.5V15.5Z"/>
     <path d="M12 16L7 13.5V9.5L12 12L17 9.5V13.5L12 16Z" fill="#759718"/>
  </svg>
)

const SmtpIcon = () => (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#6366F1" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
    </svg>
)

// --- Types & Data ---

interface Integration {
  id: string
  name: string
  description: string
  icon: any
  category: string
  categoryTitle: string
  categoryDesc: string
  status: 'connected' | 'disconnected' | 'error'
  isAvailable: boolean
  color: string
}

interface SmtpConfig {
  name: string
  provider: string
  host: string
  port: number
  secure: boolean
  auth_user: string
  auth_pass: string
  from_email: string
  from_name: string
  is_default: boolean
}

const INTEGRATIONS: Integration[] = [
  // Communication & Collaboration
  {
    id: 'smtp',
    name: 'SMTP Server',
    description: 'Configure your custom SMTP server for transactional email delivery.',
    icon: SmtpIcon,
    category: 'communication',
    categoryTitle: 'Communication & Collaboration',
    categoryDesc: 'Enhancing the efficiency and effectiveness of team interactions and workflows',
    status: 'disconnected',
    isAvailable: true,
    color: '#6366F1'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Connect WhatsApp to send alerts and communicate with customers.',
    icon: WhatsAppIcon,
    category: 'communication',
    categoryTitle: 'Communication & Collaboration',
    categoryDesc: 'Enhancing the efficiency and effectiveness of team interactions and workflows',
    status: 'disconnected',
    isAvailable: false,
    color: '#25D366'
  },
  {
    id: 'google',
    name: 'Gmail / Google Workspace',
    description: 'Enhances communication and scheduling within the CRM.',
    icon: GoogleIcon,
    category: 'communication',
    categoryTitle: 'Communication & Collaboration',
    categoryDesc: 'Enhancing the efficiency and effectiveness of team interactions and workflows',
    status: 'disconnected',
    isAvailable: false,
    color: '#4285F4'
  },
  
  // Inventory & Sales (Using "Sales & Marketing Tools" header from image reference for grouping)
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Sync products, inventory, and orders with your Shopify store.',
    icon: ShopifyIcon,
    category: 'sales',
    categoryTitle: 'Inventory & Sales Channels',
    categoryDesc: 'Streamline your operations by connecting your sales channels',
    status: 'disconnected',
    isAvailable: false,
    color: '#95BF47'
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Integrate your WooCommerce store for unified inventory management.',
    icon: WooCommerceIcon,
    category: 'sales',
    categoryTitle: 'Inventory & Sales Channels',
    categoryDesc: 'Streamline your operations by connecting your sales channels',
    status: 'disconnected',
    isAvailable: false,
    color: '#96588A'
  },
  {
    id: 'shipstation',
    name: 'ShipStation',
    description: 'Streamline shipping, label generation, and order tracking.',
    icon: ShipStationIcon,
    category: 'sales',
    categoryTitle: 'Inventory & Sales Channels',
    categoryDesc: 'Streamline your operations by connecting your sales channels',
    status: 'disconnected',
    isAvailable: false,
    color: '#B1CC33'
  }
]

const SMTP_PROVIDERS = [
  { value: 'smtp', label: 'Custom SMTP' },
  { value: 'gmail', label: 'Gmail' },
  { value: 'outlook', label: 'Outlook / Office 365' },
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'mailgun', label: 'Mailgun' },
  { value: 'aws_ses', label: 'Amazon SES' }
]

const PROVIDER_DEFAULTS: Record<string, Partial<SmtpConfig>> = {
  gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
  outlook: { host: 'smtp.office365.com', port: 587, secure: false },
  sendgrid: { host: 'smtp.sendgrid.net', port: 587, secure: false },
  mailgun: { host: 'smtp.mailgun.org', port: 587, secure: false },
  aws_ses: { host: 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false }
}

// --- Components ---

const ToggleSwitch = ({ checked, onChange, disabled, mode }: { checked: boolean; onChange: () => void; disabled?: boolean; mode?: string }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`
      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
    style={{
      backgroundColor: checked 
        ? '#16A34A' 
        : (mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#E5E7EB')
    }}
  >
    <span
      className="pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out"
      style={{
        backgroundColor: mode === 'dark' ? '#FFFFFF' : '#FFFFFF',
        transform: checked ? 'translateX(1.25rem)' : 'translateX(0)'
      }}
    />
  </button>
)

export default function IntegrationsPage() {
  const { colors, mode } = useTheme()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'all' | 'connected' | 'disconnected'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [existingConfigs, setExistingConfigs] = useState<any[]>([])
  
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    name: 'Primary SMTP',
    provider: 'smtp',
    host: '',
    port: 587,
    secure: false,
    auth_user: '',
    auth_pass: '',
    from_email: '',
    from_name: '',
    is_default: true
  })

  // Load existing SMTP configs
  useEffect(() => {
    loadSmtpConfigs()
  }, [])

  const loadSmtpConfigs = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/mailer/smtp`, {
        headers: getTenantHeaders()
      })
      if (response.ok) {
        const configs = await response.json()
        setExistingConfigs(configs)
        // Update SMTP integration status
        if (configs.length > 0) {
          setIntegrations(prev => prev.map(i => 
            i.id === 'smtp' ? { ...i, status: 'connected' as const } : i
          ))
        }
      }
    } catch (error) {
      console.error('Failed to load SMTP configs:', error)
    }
  }

  const handleProviderChange = (provider: string) => {
    const defaults = PROVIDER_DEFAULTS[provider] || {}
    setSmtpConfig(prev => ({
      ...prev,
      provider,
      ...defaults
    }))
  }

  const testSmtpConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/mailer/smtp/test-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify({
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          auth_user: smtpConfig.auth_user,
          auth_pass: smtpConfig.auth_pass
        })
      })
      
      const result = await response.json()
      setTestResult(result)
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Connection failed' })
    } finally {
      setIsTesting(false)
    }
  }

  const saveSmtpConfig = async () => {
    setIsLoading(true)
    setTestResult(null)
    
    try {
      // Test connection first
      const testResponse = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/mailer/smtp/test-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify({
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          auth_user: smtpConfig.auth_user,
          auth_pass: smtpConfig.auth_pass
        })
      })
      
      const testResult = await testResponse.json()
      
      if (!testResult.success) {
        setTestResult(testResult)
        setIsLoading(false)
        return
      }
      
      // Save the config
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/mailer/smtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify(smtpConfig)
      })
      
      if (response.ok) {
        setTestResult({ success: true, message: 'SMTP configuration saved successfully!' })
        setIntegrations(prev => prev.map(i => 
          i.id === 'smtp' ? { ...i, status: 'connected' as const } : i
        ))
        loadSmtpConfigs()
        setTimeout(() => {
          setIsModalOpen(false)
          setTestResult(null)
        }, 1500)
      } else {
        const error = await response.json()
        setTestResult({ success: false, message: error.message || 'Failed to save configuration' })
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Failed to save configuration' })
    } finally {
      setIsLoading(false)
    }
  }

  const openIntegrationModal = async (integration: Integration) => {
    if (!integration.isAvailable) return
    setSelectedIntegration(integration)
    setIsModalOpen(true)
    setTestResult(null)
    
    // Load existing SMTP config if available
    if (integration.id === 'smtp') {
      // Reload configs to ensure we have the latest data
      try {
        const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/mailer/smtp`, {
          headers: getTenantHeaders()
        })
        if (response.ok) {
          const configs = await response.json()
          setExistingConfigs(configs)
          
          if (configs.length > 0) {
            // Find default config or use first one
            const existingConfig = configs.find(c => c.is_default) || configs[0]
            if (existingConfig) {
              setSmtpConfig({
                name: existingConfig.name || 'Primary SMTP',
                provider: existingConfig.provider || 'smtp',
                host: existingConfig.host || '',
                port: existingConfig.port || 587,
                secure: existingConfig.secure !== undefined ? existingConfig.secure : false,
                auth_user: existingConfig.auth_user || '',
                auth_pass: existingConfig.auth_pass || '', // Note: password might not be returned for security
                from_email: existingConfig.from_email || '',
                from_name: existingConfig.from_name || '',
                is_default: existingConfig.is_default !== undefined ? existingConfig.is_default : true
              })
              return
            }
          }
        }
      } catch (error) {
        console.error('Failed to load SMTP configs:', error)
      }
      
      // Reset to defaults if no existing config
      setSmtpConfig({
        name: 'Primary SMTP',
        provider: 'smtp',
        host: '',
        port: 587,
        secure: false,
        auth_user: '',
        auth_pass: '',
        from_email: '',
        from_name: '',
        is_default: true
      })
    }
  }

  // Filter integrations based on tab and search
  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab = 
      activeTab === 'all' ? true :
      activeTab === 'connected' ? integration.status === 'connected' :
      integration.status === 'disconnected'
    
    return matchesSearch && matchesTab
  })

  // Group by category
  const groupedIntegrations = filteredIntegrations.reduce((acc, integration) => {
    const key = integration.categoryTitle
    if (!acc[key]) {
      acc[key] = {
        title: integration.categoryTitle,
        desc: integration.categoryDesc,
        items: []
      }
    }
    acc[key].items.push(integration)
    return acc
  }, {} as Record<string, { title: string; desc: string; items: Integration[] }>)

  return (
    <div 
      className="min-h-screen p-8"
      style={{ backgroundColor: colors.background }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h1 className="text-2xl font-bold mb-8" style={{ color: colors.textPrimary }}>
          Integrations
        </h1>

        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div className="flex p-1 rounded-lg bg-gray-100" style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }}>
            {['all', 'connected', 'disconnected'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all"
                style={{
                  backgroundColor: activeTab === tab ? colors.card : 'transparent',
                  color: activeTab === tab ? colors.textPrimary : colors.textSecondary,
                  boxShadow: activeTab === tab ? (mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.05)') : 'none'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.color = colors.textPrimary
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.color = colors.textSecondary
                  }
                }}
              >
                {tab === 'all' ? 'All Applications' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", width: "100%", maxWidth: "256px" }}>
            <Search 
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "16px",
                height: "16px",
                color: colors.textSecondary,
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 10px",
                paddingLeft: "36px",
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: "0.75rem",
                fontSize: "12px",
                color: colors.textPrimary,
                outline: "none",
                transition: "all 0.2s ease",
                fontWeight: searchTerm ? "500" : "400",
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                cursor: "text",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#ec4899'
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(236, 72, 153, 0.1)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.border
                e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={(e) => {
                if (document.activeElement !== e.currentTarget && !searchTerm) {
                  e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (document.activeElement !== e.currentTarget) {
                  e.currentTarget.style.backgroundColor = colors.card
                }
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-12">
          {Object.entries(groupedIntegrations).map(([key, group]) => (
            <div key={key}>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1" style={{ color: colors.textPrimary }}>
                  {group.title}
                </h2>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  {group.desc}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.items.map(integration => (
                  <div
                    key={integration.id}
                    className="flex flex-col rounded-xl border transition-all duration-200 hover:shadow-md"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border
                    }}
                  >
                    <div className="p-6 flex-1">
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 border p-2"
                          style={{
                            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                            borderColor: colors.border
                          }}
                        >
                          <integration.icon />
                        </div>
                        <div>
                          <h3 className="font-bold text-base mb-1" style={{ color: colors.textPrimary }}>
                            {integration.name}
                          </h3>
                          <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                            {integration.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div 
                      className="px-6 py-4 border-t flex items-center justify-between"
                      style={{ borderColor: colors.border }}
                    >
                      <div className="flex gap-2">
                        <button 
                          className="px-4 py-1.5 rounded border text-sm font-medium transition-colors"
                          style={{
                            borderColor: colors.border,
                            color: colors.textPrimary,
                            backgroundColor: 'transparent'
                          }}
                          onClick={() => openIntegrationModal(integration)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F9FAFB'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          Details
                        </button>
                        {integration.status === 'connected' && (
                          <button 
                            className="px-4 py-1.5 rounded border text-sm font-medium transition-colors"
                            style={{
                              borderColor: colors.border,
                              color: colors.textSecondary,
                              backgroundColor: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2'
                              e.currentTarget.style.borderColor = mode === 'dark' ? 'rgba(239, 68, 68, 0.5)' : '#FECACA'
                              e.currentTarget.style.color = mode === 'dark' ? '#FCA5A5' : '#DC2626'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                              e.currentTarget.style.borderColor = colors.border
                              e.currentTarget.style.color = colors.textSecondary
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <ToggleSwitch 
                        checked={integration.status === 'connected'} 
                        onChange={() => openIntegrationModal(integration)}
                        disabled={!integration.isAvailable}
                        mode={mode}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {filteredIntegrations.length === 0 && (
            <div className="text-center py-20 opacity-60">
              <Search size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
              <p className="text-lg" style={{ color: colors.textSecondary }}>No integrations found matching your criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Modern Configuration Modal */}
      {isModalOpen && selectedIntegration?.id === 'smtp' && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{ backgroundColor: colors.card }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-8 py-6 border-b flex justify-between items-start" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center p-2.5 border"
                  style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F8F9FA', borderColor: colors.border }}
                >
                  <selectedIntegration.icon />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                    Connect SMTP
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
                    Enter your SMTP server details to enable email sending
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full transition-colors"
                style={{ 
                  color: colors.textSecondary,
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-8 py-6 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-6">
                
                {/* Section 1: Provider */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider opacity-60" style={{ color: colors.textPrimary }}>
                    Provider Settings
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <CustomDropdown
                        label="Email Provider"
                        values={SMTP_PROVIDERS.map(p => `${p.value}::${p.label}`)}
                        type="single"
                        defaultValue={smtpConfig.provider ? `${smtpConfig.provider}::${SMTP_PROVIDERS.find(p => p.value === smtpConfig.provider)?.label || smtpConfig.provider}` : undefined}
                        onChange={(v) => {
                          const provider = typeof v === 'string' ? v.split('::')[0] : smtpConfig.provider
                          handleProviderChange(provider)
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Server Details */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider opacity-60" style={{ color: colors.textPrimary }}>
                    Server Configuration
                  </h3>
                  
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8">
                      <label 
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: colors.textPrimary,
                          marginBottom: "0.5rem",
                        }}
                      >
                        Host
                      </label>
                      <input
                        type="text"
                        value={smtpConfig.host}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                        placeholder="smtp.example.com"
                        style={{ 
                          width: "100%",
                          padding: "10px 10px",
                          background: colors.card,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "0.75rem",
                          fontSize: "12px",
                          color: colors.textPrimary,
                          outline: "none",
                          transition: "all 0.2s ease",
                          fontWeight: smtpConfig.host ? "500" : "400",
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                          cursor: "text",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#ec4899'
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(236, 72, 153, 0.1)'
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = colors.border
                          e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={(e) => {
                          if (document.activeElement !== e.currentTarget && !smtpConfig.host) {
                            e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (document.activeElement !== e.currentTarget) {
                            e.currentTarget.style.backgroundColor = colors.card
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-4">
                      <label 
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: colors.textPrimary,
                          marginBottom: "0.5rem",
                        }}
                      >
                        Port
                      </label>
                      <input
                        type="number"
                        value={smtpConfig.port}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                        style={{ 
                          width: "100%",
                          padding: "10px 10px",
                          background: colors.card,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "0.75rem",
                          fontSize: "12px",
                          color: colors.textPrimary,
                          outline: "none",
                          transition: "all 0.2s ease",
                          fontWeight: smtpConfig.port ? "500" : "400",
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                          cursor: "text",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#ec4899'
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(236, 72, 153, 0.1)'
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = colors.border
                          e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={(e) => {
                          if (document.activeElement !== e.currentTarget && !smtpConfig.port) {
                            e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (document.activeElement !== e.currentTarget) {
                            e.currentTarget.style.backgroundColor = colors.card
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <ToggleSwitch 
                       checked={smtpConfig.secure} 
                       onChange={() => setSmtpConfig(prev => ({ ...prev, secure: !prev.secure }))}
                       mode={mode}
                     />
                     <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>Use Secure Connection (SSL/TLS)</span>
                  </div>
                </div>

                {/* Section 3: Authentication */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider opacity-60" style={{ color: colors.textPrimary }}>
                    Authentication
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label 
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: colors.textPrimary,
                          marginBottom: "0.5rem",
                        }}
                      >
                        Username / Email
                      </label>
                      <input
                        type="text"
                        value={smtpConfig.auth_user}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, auth_user: e.target.value }))}
                        style={{ 
                          width: "100%",
                          padding: "10px 10px",
                          background: colors.card,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "0.75rem",
                          fontSize: "12px",
                          color: colors.textPrimary,
                          outline: "none",
                          transition: "all 0.2s ease",
                          fontWeight: smtpConfig.auth_user ? "500" : "400",
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                          cursor: "text",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#ec4899'
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(236, 72, 153, 0.1)'
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = colors.border
                          e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={(e) => {
                          if (document.activeElement !== e.currentTarget && !smtpConfig.auth_user) {
                            e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (document.activeElement !== e.currentTarget) {
                            e.currentTarget.style.backgroundColor = colors.card
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label 
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: colors.textPrimary,
                          marginBottom: "0.5rem",
                        }}
                      >
                        Password
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={smtpConfig.auth_pass}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, auth_pass: e.target.value }))}
                          style={{ 
                            width: "100%",
                            padding: "10px 10px",
                            paddingRight: "40px",
                            background: colors.card,
                            border: `1px solid ${colors.border}`,
                            borderRadius: "0.75rem",
                            fontSize: "12px",
                            color: colors.textPrimary,
                            outline: "none",
                            transition: "all 0.2s ease",
                            fontWeight: smtpConfig.auth_pass ? "500" : "400",
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                            cursor: "text",
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#ec4899'
                            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(236, 72, 153, 0.1)'
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = colors.border
                            e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'
                          }}
                          onMouseEnter={(e) => {
                            if (document.activeElement !== e.currentTarget && !smtpConfig.auth_pass) {
                              e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (document.activeElement !== e.currentTarget) {
                              e.currentTarget.style.backgroundColor = colors.card
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            opacity: 0.5,
                            cursor: "pointer",
                            background: "transparent",
                            border: "none",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "1"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "0.5"
                          }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Sender Info */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider opacity-60" style={{ color: colors.textPrimary }}>
                    Sender Information
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label 
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: colors.textPrimary,
                          marginBottom: "0.5rem",
                        }}
                      >
                        From Name
                      </label>
                      <input
                        type="text"
                        value={smtpConfig.from_name}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, from_name: e.target.value }))}
                        placeholder="Company Name"
                        style={{ 
                          width: "100%",
                          padding: "10px 10px",
                          background: colors.card,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "0.75rem",
                          fontSize: "12px",
                          color: colors.textPrimary,
                          outline: "none",
                          transition: "all 0.2s ease",
                          fontWeight: smtpConfig.from_name ? "500" : "400",
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                          cursor: "text",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#ec4899'
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(236, 72, 153, 0.1)'
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = colors.border
                          e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={(e) => {
                          if (document.activeElement !== e.currentTarget && !smtpConfig.from_name) {
                            e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (document.activeElement !== e.currentTarget) {
                            e.currentTarget.style.backgroundColor = colors.card
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label 
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: colors.textPrimary,
                          marginBottom: "0.5rem",
                        }}
                      >
                        From Email
                      </label>
                      <input
                        type="email"
                        value={smtpConfig.from_email}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, from_email: e.target.value }))}
                        placeholder="noreply@company.com"
                        style={{ 
                          width: "100%",
                          padding: "10px 10px",
                          background: colors.card,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "0.75rem",
                          fontSize: "12px",
                          color: colors.textPrimary,
                          outline: "none",
                          transition: "all 0.2s ease",
                          fontWeight: smtpConfig.from_email ? "500" : "400",
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                          cursor: "text",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#ec4899'
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(236, 72, 153, 0.1)'
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = colors.border
                          e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={(e) => {
                          if (document.activeElement !== e.currentTarget && !smtpConfig.from_email) {
                            e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (document.activeElement !== e.currentTarget) {
                            e.currentTarget.style.backgroundColor = colors.card
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Test Result Feedback */}
                {testResult && (
                  <div 
                    className="p-4 rounded-lg flex items-start gap-3 text-sm"
                    style={{
                      backgroundColor: testResult.success 
                        ? (mode === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#F0FDF4')
                        : (mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2'),
                      color: testResult.success
                        ? (mode === 'dark' ? '#86EFAC' : '#166534')
                        : (mode === 'dark' ? '#FCA5A5' : '#991B1B'),
                      border: `1px solid ${testResult.success
                        ? (mode === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#BBF7D0')
                        : (mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#FECACA')
                      }`
                    }}
                  >
                    {testResult.success ? <Check size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t flex justify-end gap-3 bg-gray-50" style={{ borderColor: colors.border, backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#F9FAFB' }}>
              <button
                onClick={testSmtpConnection}
                disabled={isTesting}
                className="px-5 py-2.5 rounded-lg border font-medium text-sm transition-colors focus:ring-2"
                style={{ 
                  borderColor: colors.border, 
                  color: colors.textPrimary,
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isTesting) {
                    e.currentTarget.style.backgroundColor = mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={saveSmtpConfig}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-lg font-medium text-sm text-white shadow-lg shadow-blue-500/20 transition-all hover:translate-y-px focus:ring-2 focus:ring-offset-2"
                style={{ backgroundColor: colors.action }}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </div>
                ) : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
