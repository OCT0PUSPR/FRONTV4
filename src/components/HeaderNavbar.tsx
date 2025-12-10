"use client"

import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ChevronDown, Moon, Sun, Bell, Globe } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"
import { io, Socket } from "socket.io-client"
import NotificationDropdown from "./NotificationDropdown"

export default function HeaderNavbar() {
  const { t, i18n } = useTranslation()
  const { mode, setMode, colors } = useTheme()
  const isDarkMode = mode === "dark"
  const { name, signOut, partnerId } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const userRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const navigate = useNavigate()
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

  const toggleTheme = () => setMode(isDarkMode ? "light" : "dark")

  const handleSignOut = () => {
    signOut()
    navigate("/signin", { replace: true })
  }

  const firstLetter = (name || "?").toString().charAt(0).toUpperCase()

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!partnerId) return
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
      const tenantId = localStorage.getItem('current_tenant_id')
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }
      const response = await fetch(`${API_BASE_URL}/workflow/notifications/${partnerId}`, {
        headers
      })
      const data = await response.json()
      if (data.success) {
        const notificationsList = data.data || []
        setNotifications(notificationsList)
        const unread = notificationsList.filter((n: any) => !n.read_at).length
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  // Initialize socket.io connection for real-time notifications
  useEffect(() => {
    if (!partnerId) return

    // Connect to socket.io server
    const socket = io(API_BASE_URL || 'http://localhost:3007', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      auth: {
        userId: partnerId,
        token: localStorage.getItem('token')
      }
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[HeaderNavbar] Socket connected')
      // Join user-specific room
      socket.emit('join-user-room', { userId: partnerId })
    })

    socket.on('new-notification', (notification: any) => {
      console.log('[HeaderNavbar] New notification received:', notification)
      // Add new notification to the list
      setNotifications((prev) => [notification, ...prev])
      // Increment unread count
      setUnreadCount((prev) => prev + 1)
    })

    socket.on('notification-updated', (updatedNotification: any) => {
      console.log('[HeaderNavbar] Notification updated:', updatedNotification)
      // Update notification in the list using functional update to get latest state
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
        // Recalculate unread count from updated list
        const unread = updated.filter((n: any) => !n.read_at).length
        setUnreadCount(unread)
        return updated
      })
    })

    socket.on('disconnect', () => {
      console.log('[HeaderNavbar] Socket disconnected')
    })

    socket.on('error', (error) => {
      console.error('[HeaderNavbar] Socket error:', error)
    })

    // Fetch initial notifications
    fetchNotifications()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [partnerId])

  // Update unread count when notifications change
  useEffect(() => {
    const unread = notifications.filter((n: any) => !n.read_at).length
    setUnreadCount(unread)
  }, [notifications])

  // Close menus on outside click and Esc key
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (showUserMenu && userRef.current && !userRef.current.contains(target)) setShowUserMenu(false)
      if (showNotificationDropdown && notificationRef.current && !notificationRef.current.contains(target)) {
        setShowNotificationDropdown(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowUserMenu(false)
        setShowNotificationDropdown(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [showUserMenu, showNotificationDropdown])

  return (
    <div
      className={`sticky top-0 z-40 w-full shadow-sm`} // sticky keeps it fixed when scrolling
      style={{
        background: colors.background,
      }}
    >
      <div className="px-4 py-3 flex items-center justify-end gap-3">
        {/* Language Switcher */}
        <div className="relative inline-block">
          <button
            onClick={() => {
              setShowNotificationDropdown(false)
              setShowUserMenu(false)
              // Toggle language directly without dropdown
              i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')
            }}
            style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              borderRadius: '0.75rem',
              background: colors.card,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.mutedBg
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.card
              e.currentTarget.style.transform = 'scale(1)'
            }}
            title={i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
          >
            <Globe 
              size={20} 
              style={{ 
                color: colors.textPrimary,
                transition: 'transform 0.3s ease',
                transform: i18n.language === 'ar' ? 'rotate(180deg)' : 'rotate(0deg)'
              }} 
            />
          </button>
        </div>

        {/* Notification Bell */}
        <div ref={notificationRef} className="relative inline-block">
          <button
            onClick={() => {
              setShowUserMenu(false)
              setShowNotificationDropdown(!showNotificationDropdown)
              if (!showNotificationDropdown && notifications.length === 0) {
                fetchNotifications()
              }
            }}
            style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              borderRadius: '0.75rem',
              background: showNotificationDropdown ? colors.mutedBg : colors.card,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!showNotificationDropdown) {
                e.currentTarget.style.background = colors.mutedBg
              }
            }}
            onMouseLeave={(e) => {
              if (!showNotificationDropdown) {
                e.currentTarget.style.background = colors.card
              }
            }}
          >
            <Bell size={20} color={colors.textSecondary} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#F97316',
                  border: `2px solid ${colors.card}`,
                }}
              />
            )}
          </button>

          {showNotificationDropdown && (
            <NotificationDropdown
              isOpen={showNotificationDropdown}
              onClose={() => setShowNotificationDropdown(false)}
              userId={Number(partnerId)}
            />
          )}
        </div>

        {/* Theme toggle */}
        <div className="flex items-center gap-2">
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

        {/* User menu */}
        <div ref={userRef} className="relative inline-block">
          <button
            onClick={() => {
              setShowNotificationDropdown(false)
              setShowUserMenu((v) => !v)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              border: `1px solid ${colors.border}`,
              background: colors.card,
              color: colors.textPrimary,
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <div className="w-6 h-6 bg-gradient-to-br from-[#4facfe] to-[#00f2fe] rounded-full flex items-center justify-center">
              <span className="text-[12px] font-medium text-white">{firstLetter}</span>
            </div>
            <span className="text-[12px] font-medium truncate" style={{ color: colors.textPrimary }}>{name || t("Guest")}</span>
            <ChevronDown className="w-4 h-4" style={{ color: colors.textSecondary }} />
          </button>

          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                marginTop: '0.25rem',
                borderRadius: '0.375rem',
                border: `1px solid ${colors.border}`,
                zIndex: 50,
                overflow: 'hidden',
                background: colors.card,
                color: colors.textPrimary,
                boxShadow: isDarkMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  navigate("/settings")
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s',
                  color: colors.textPrimary,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.mutedBg
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {t("Settings")}
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s',
                  color: '#ef4444',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.mutedBg
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {t("Sign Out")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
