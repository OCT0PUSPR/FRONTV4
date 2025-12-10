import React, { useState, useEffect } from 'react'
import { Bell, X, CheckCircle, XCircle, Clock, Undo2, NotebookPen, CircleX, PencilLine, CircleCheck } from 'lucide-react'
import { Button } from '../../@/components/ui/button'
import { useTheme } from '../../context/theme'
import { useNavigate } from 'react-router-dom'

interface Notification {
  id: string
  workflow_instance_id: string
  task_id: string
  recipient_id: number
  notification_type: string
  subject: string
  message: string
  metadata: any
  created_at: string
  read_at: string | null
}

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  userId: number
}

export function NotificationModal({ isOpen, onClose, userId }: NotificationModalProps) {
  const { colors } = useTheme()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL


  useEffect(() => {
    if (isOpen && userId) {
      fetchNotifications()
    }
  }, [isOpen, userId])

  const fetchNotifications = async () => {
    if (!userId) {
      console.warn('[NotificationModal] No userId provided, cannot fetch notifications')
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      console.log('[NotificationModal] Fetching notifications for userId:', userId)
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
      const tenantId = localStorage.getItem('current_tenant_id')
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }
      const response = await fetch(`${API_BASE_URL}/workflow/notifications/${userId}`, {
        headers
      })
      
      if (!response.ok) {
        console.error('[NotificationModal] Response not OK:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('[NotificationModal] Error response:', errorText)
        return
      }
      
      const data = await response.json()
      console.log('[NotificationModal] Received data:', data)
      
      if (data.success) {
        setNotifications(data.data || [])
        console.log('[NotificationModal] Set notifications:', data.data?.length || 0)
      } else {
        console.error('[NotificationModal] API returned success: false', data)
        setNotifications([])
      }
    } catch (error) {
      console.error('[NotificationModal] Error fetching notifications:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
      const tenantId = localStorage.getItem('current_tenant_id')
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }
      await fetch(`${API_BASE_URL}/workflow/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers
      })
      fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    navigate(`/approval/${notification.task_id}`, {
      state: { notification }
    })
    onClose()
  }

  if (!isOpen) return null

  const { mode } = useTheme()
  const isDark = mode === 'dark'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors.card,
          borderRadius: '1rem',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bell style={{ width: '1.5rem', height: '1.5rem', color: colors.action }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: colors.textPrimary }}>
              Notifications
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            style={{
              borderRadius: '0.5rem',
              color: colors.textSecondary,
            }}
          >
            <X style={{ width: '1.25rem', height: '1.25rem' }} />
          </Button>
        </div>

        {/* Notifications List */}
        <div
          style={{
            maxHeight: 'calc(80vh - 5rem)',
            overflowY: 'auto',
            padding: '1rem',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: colors.textSecondary }}>
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: colors.textSecondary }}>
              No notifications
            </div>
          ) : (
            notifications.map((notification) => {
              // Get icon and color for the circular icon div based on notification type
              const getNotificationIcon = () => {
                const type = notification.notification_type?.toLowerCase() || ''
                
                if (type === 'approval_returned' || type.includes('approval_returned') || type.includes('returned')) {
                  // Orange for returned
                  return {
                    Icon: PencilLine,
                    iconBg: isDark ? 'rgba(251, 146, 60, 0.2)' : '#fff7ed',
                    iconColor: '#fb923c'
                  }
                } else if (type === 'approval_rejected' || type.includes('rejected') || type.includes('reject')) {
                  // Red for rejection
                  return {
                    Icon: CircleX,
                    iconBg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
                    iconColor: '#ef4444'
                  }
                } else if (type.includes('completed') || type.includes('complete')) {
                  // Green for completed
                  return {
                    Icon: CircleCheck,
                    iconBg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5',
                    iconColor: '#10b981'
                  }
                } else if (type === 'approval_request' || type.includes('approval') || type.includes('approved') || type.includes('approve')) {
                  // Blue for approval request
                  return {
                    Icon: NotebookPen,
                    iconBg: isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe',
                    iconColor: '#3b82f6'
                  }
                }
                // Default
                return {
                  Icon: Clock,
                  iconBg: colors.pillInfoBg,
                  iconColor: colors.action
                }
              }

              const { Icon, iconBg, iconColor } = getNotificationIcon()

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.75rem',
                    borderRadius: '0.75rem',
                    backgroundColor: notification.read_at ? colors.card : (isDark ? colors.mutedBg : colors.pillInfoBg),
                    border: `1px solid ${colors.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)'
                    e.currentTarget.style.boxShadow = isDark ? '0 4px 6px rgba(0, 0, 0, 0.4)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                    <div
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        backgroundColor: iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon style={{ width: '1.25rem', height: '1.25rem', color: iconColor }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: notification.read_at ? '500' : '600',
                          color: colors.textPrimary,
                          marginBottom: '0.25rem',
                        }}
                      >
                        {notification.subject}
                      </h3>
                      <p
                        style={{
                          fontSize: '0.875rem',
                          color: colors.textSecondary,
                          marginBottom: '0.5rem',
                        }}
                      >
                        {notification.message}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>
                    {!notification.read_at && (
                      <div
                        style={{
                          width: '0.5rem',
                          height: '0.5rem',
                          borderRadius: '50%',
                          backgroundColor: colors.action,
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
