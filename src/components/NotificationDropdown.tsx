"use client"

import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { X, NotebookPen, CircleX, PencilLine, CircleCheck, Clock } from "lucide-react"
import { useTheme } from "../../context/theme"
import { useAuth } from "../../context/auth"

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

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
  userId: number
}

export default function NotificationDropdown({ isOpen, onClose, userId }: NotificationDropdownProps) {
  const { colors } = useTheme()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

  const fetchNotifications = async () => {
    if (!userId) return
    setLoading(true)
    try {
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
      const data = await response.json()
      if (data.success) {
        setNotifications(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      fetchNotifications()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId])

  const unreadCount = notifications.filter((n) => !n.read_at).length

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

  const markAllAsRead = async () => {
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
      const tenantId = localStorage.getItem('current_tenant_id')
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }
      const unreadNotifications = notifications.filter((n) => !n.read_at)
      await Promise.all(
        unreadNotifications.map((n) =>
          fetch(`${API_BASE_URL}/workflow/notifications/${n.id}/read`, {
            method: 'PUT',
            headers
          })
        )
      )
      fetchNotifications()
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id)
    }
    navigate(`/approval/${notification.task_id}`, {
      state: { notification }
    })
    onClose()
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const getNotificationIcon = (notification: Notification) => {
    const type = notification.notification_type?.toLowerCase() || ''
    
    if (type === 'approval_returned' || type.includes('approval_returned') || type.includes('returned')) {
      // Orange for returned
      return {
        Icon: PencilLine,
        iconBg: '#fff7ed',
        iconColor: '#fb923c'
      }
    } else if (type === 'approval_rejected' || type.includes('rejected') || type.includes('reject')) {
      // Red for rejection
      return {
        Icon: CircleX,
        iconBg: '#fee2e2',
        iconColor: '#ef4444'
      }
    } else if (type.includes('completed') || type.includes('complete')) {
      // Green for completed
      return {
        Icon: CircleCheck,
        iconBg: '#d1fae5',
        iconColor: '#10b981'
      }
    } else if (type === 'approval_request' || type.includes('approval') || type.includes('approved') || type.includes('approve')) {
      // Blue for approval request
      return {
        Icon: NotebookPen,
        iconBg: '#dbeafe',
        iconColor: '#3b82f6'
      }
    }
    // Default
    return {
      Icon: Clock,
      iconBg: '#F3F4F6',
      iconColor: '#6B7280'
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 0.5rem)',
        right: 0,
        width: '420px',
        maxWidth: '90vw',
        background: '#FFFFFF',
        borderRadius: '0.75rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        zIndex: 1000,
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: '700',
            color: '#111827',
          }}
        >
          Notifications
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                fontSize: '0.8125rem',
                fontWeight: '500',
                color: '#3B82F6',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none'
              }}
            >
              Mark all as read
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.375rem',
              color: '#6B7280',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F3F4F6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div
        style={{
          maxHeight: '500px',
          overflowY: 'auto',
          padding: '0.5rem',
        }}
      >
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: '#6B7280',
              fontSize: '0.875rem',
            }}
          >
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: '#6B7280',
              fontSize: '0.875rem',
            }}
          >
            No notifications
          </div>
        ) : (
          notifications.map((notification) => {
            const isUnread = !notification.read_at
            const { Icon, iconBg, iconColor } = getNotificationIcon(notification)

            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  position: 'relative',
                  backgroundColor: '#FFFFFF',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF'
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  <Icon style={{ width: '1.25rem', height: '1.25rem', color: iconColor }} />
                  {isUnread && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#F97316',
                        border: '2px solid #FFFFFF',
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: isUnread ? '600' : '500',
                      color: '#111827',
                      marginBottom: '0.25rem',
                      lineHeight: '1.4',
                    }}
                  >
                    {notification.subject}
                  </p>
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: '#6B7280',
                      marginBottom: '0.25rem',
                      lineHeight: '1.4',
                    }}
                  >
                    {notification.message}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#9CA3AF' }}>
                    <span>{formatTimeAgo(notification.created_at)}</span>
                    {notification.metadata?.workflow_name && (
                      <>
                        <span>•</span>
                        <span>{notification.metadata.workflow_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

