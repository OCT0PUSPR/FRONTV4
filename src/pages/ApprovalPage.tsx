import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, XCircle, ArrowLeft, Clock, User, Calendar, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react'
import Toast from '../components/Toast'
import Alert from '../components/Alert'
import { useTheme } from '../../context/theme'

interface PendingChange {
  id: string
  entity_type: string
  entity_id: number
  change_type: string
  original_data: any
  new_data: any
  changed_fields: string[]
  change_summary: string
  requested_by: number
  requested_at: string
  status: string
  workflow_instance_id: string
}

interface Task {
  id: string
  workflow_instance_id: string
  node_id: string
  assigned_to: number
  task_type: string
  title: string
  description: string
  priority: string
  status: string
  due_date: string | null
  created_at: string
}

export default function ApprovalPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { colors, mode } = useTheme()
  const isDark = mode === 'dark'
  
  const [task, setTask] = useState<Task | null>(null)
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [showSendBack, setShowSendBack] = useState(false)
  const [sendBackNote, setSendBackNote] = useState('')
  const [canSendBack, setCanSendBack] = useState(false)
  const [sendBackComment, setSendBackComment] = useState<string | null>(null)
  const [rejectionComment, setRejectionComment] = useState<string | null>(null)
  const [rejectionUserName, setRejectionUserName] = useState<string | null>(null)
  const [returnUserName, setReturnUserName] = useState<string | null>(null)
  const [workflowStatus, setWorkflowStatus] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState<{ text: string; state: 'success' | 'error' } | null>(null)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  const ROWS_PER_PAGE = 10

  useEffect(() => {
    if (taskId) {
      fetchTaskAndChanges()
    }
  }, [taskId])

  // Handle email actions from query params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const action = searchParams.get('action')
    const fromEmail = searchParams.get('fromEmail')
    
    if (fromEmail === 'true' && action) {
      if (action === 'approve') {
        // Auto-approve if coming from email (user already clicked approve in email)
        if (task && task.status === 'pending') {
          handleApprove()
        }
      } else if (action === 'reject') {
        setShowRejectInput(true)
      } else if (action === 'send-back') {
        setShowSendBack(true)
      }
    }
  }, [location.search, task])

  const fetchTaskAndChanges = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    try {
      // First, check if notification data was passed via location.state (when opened from notification)
      const notificationFromState = location.state?.notification
      
      // Get tenantId from URL query params first (for email links), then fallback to localStorage
      const searchParams = new URLSearchParams(location.search)
      const tenantIdFromUrl = searchParams.get('tenantId')
      const tenantId = tenantIdFromUrl || localStorage.getItem('current_tenant_id')
      
      // Store tenantId in localStorage if it came from URL (for future requests)
      if (tenantIdFromUrl && tenantIdFromUrl !== localStorage.getItem('current_tenant_id')) {
        localStorage.setItem('current_tenant_id', tenantIdFromUrl)
      }
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      }
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }
      
      const taskResponse = await fetch(`${API_BASE_URL}/workflow/tasks/${taskId}`, {
        headers
      })
      const taskData = await taskResponse.json()
      
      if (taskData.success) {
        setTask(taskData.data)
        
        // ALWAYS fetch notification from workflow_notifications by task_id
        // This is the source of truth for notification information
        let notificationData = notificationFromState
        if (!notificationData) {
          try {
            const partnerId = localStorage.getItem('partnerId')
            if (partnerId) {
              const notificationHeaders: Record<string, string> = {
                'Authorization': `Bearer ${token}`
              }
              if (tenantId) {
                notificationHeaders['X-Tenant-ID'] = tenantId
              }
              const notificationsResponse = await fetch(`${API_BASE_URL}/workflow/notifications/${partnerId}`, {
                headers: notificationHeaders
              })
              const notificationsData = await notificationsResponse.json()
              if (notificationsData.success && notificationsData.data) {
                // Find notification for this specific task_id (most specific match)
                notificationData = notificationsData.data.find((n: any) => 
                  n.task_id === taskId && 
                  (n.notification_type === 'returned' || n.notification_type === 'approval_rejected')
                )
                // If not found by task_id, try workflow_instance_id
                if (!notificationData) {
                  notificationData = notificationsData.data.find((n: any) => 
                    n.workflow_instance_id === taskData.data.workflow_instance_id && 
                    (n.notification_type === 'returned' || n.notification_type === 'approval_rejected')
                  )
                }
              }
            }
          } catch (error) {
            console.error('Error fetching notifications:', error)
          }
        }

        // Process notification data from workflow_notifications table
        if (notificationData) {
          const notificationType = notificationData.notification_type?.toLowerCase() || ''
          
          // Check if it's a returned notification
          if (notificationType === 'returned' || notificationType.includes('returned')) {
            if (notificationData.return_comment) {
              setSendBackComment(notificationData.return_comment)
              setReturnUserName(
                notificationData.metadata?.senderName || 
                notificationData.metadata?.returnUserName || 
                null
              )
            }
          }
          
          // Check if it's a rejected notification
          if (notificationType === 'approval_rejected' || notificationType.includes('rejected')) {
            if (notificationData.rejection_comment) {
              setRejectionComment(notificationData.rejection_comment)
              setRejectionUserName(
                notificationData.metadata?.rejectorName || 
                notificationData.metadata?.rejectionUserName || 
                null
              )
            }
          }
        }
        
        // Check if send back is available
        try {
          const canSendBackResponse = await fetch(`${API_BASE_URL}/workflow/tasks/${taskId}/can-send-back`, {
            headers
          })
          const canSendBackData = await canSendBackResponse.json()
          if (canSendBackData.success) {
            setCanSendBack(canSendBackData.canSendBack || false)
          }
        } catch (error) {
          console.error('Error checking if can send back:', error)
        }

        // Check workflow instance status
        try {
          const instanceResponse = await fetch(`${API_BASE_URL}/workflow/instances/${taskData.data.workflow_instance_id}`, {
            headers
          })
          const instanceData = await instanceResponse.json()
          if (instanceData.success && instanceData.data) {
            setWorkflowStatus(instanceData.data.status)
          }
        } catch (error) {
          console.error('Error fetching workflow instance:', error)
        }
        
        const changesResponse = await fetch(
          `${API_BASE_URL}/workflow/pending-changes/instance/${taskData.data.workflow_instance_id}`,
          {
            headers
          }
        )
        const changesData = await changesResponse.json()
        
        if (changesData.success) {
          setPendingChange(changesData.data)
        }
      }
    } catch (error) {
      console.error('Error fetching task and changes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!task) return
    
    const token = localStorage.getItem('token')
    const partnerId = localStorage.getItem('partnerId')
    
    if (!partnerId) {
      alert('User not found. Please log in again.')
      return
    }
    
    setSubmitting(true)
    try {
      // Get tenantId from URL query params first (for email links), then fallback to localStorage
      const searchParams = new URLSearchParams(location.search)
      const tenantIdFromUrl = searchParams.get('tenantId')
      const tenantId = tenantIdFromUrl || localStorage.getItem('current_tenant_id')
      
      const approveHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
      if (tenantId) {
        approveHeaders['X-Tenant-ID'] = tenantId
      }
      
      // Check if coming from email
      const fromEmail = searchParams.get('fromEmail')
      const endpoint = fromEmail === 'true' 
        ? `${API_BASE_URL}/workflow/tasks/${taskId}/approve-email-action`
        : `${API_BASE_URL}/workflow/tasks/${taskId}/approve-new`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: approveHeaders,
        body: JSON.stringify({
          userId: Number(partnerId)
        })
      })
      
      // If from email, might return HTML
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('text/html')) {
        // Show the HTML response in a new window or redirect
        const html = await response.text()
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(html)
        }
        setToast({ text: 'Approval submitted successfully', state: 'success' })
        setTimeout(() => {
          navigate('/')
        }, 1500)
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        setToast({ text: 'Approval submitted successfully', state: 'success' })
        setTimeout(() => {
          navigate('/')
        }, 1500)
      } else {
        setToast({ text: data.message || 'Failed to approve', state: 'error' })
      }
    } catch (error: any) {
      console.error('Error approving task:', error)
      setToast({ text: error?.message || 'Failed to approve task', state: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    const token = localStorage.getItem('token')
    const partnerId = localStorage.getItem('partnerId')
    
    if (!task || !partnerId) {
      alert('User not found. Please log in again.')
      return
    }
    
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }
    
    setSubmitting(true)
    try {
      // Get tenantId from URL query params first (for email links), then fallback to localStorage
      const searchParams = new URLSearchParams(location.search)
      const tenantIdFromUrl = searchParams.get('tenantId')
      const tenantId = tenantIdFromUrl || localStorage.getItem('current_tenant_id')
      
      const rejectHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
      if (tenantId) {
        rejectHeaders['X-Tenant-ID'] = tenantId
      }
      
      // Check if coming from email
      const fromEmail = searchParams.get('fromEmail')
      const endpoint = fromEmail === 'true' 
        ? `${API_BASE_URL}/workflow/tasks/${taskId}/reject-email-action`
        : `${API_BASE_URL}/workflow/tasks/${taskId}/reject-new`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: rejectHeaders,
        body: JSON.stringify({
          userId: Number(partnerId),
          reason: rejectionReason.trim()
        })
      })
      
      // If from email, might return HTML
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('text/html')) {
        // Redirect to the HTML response
        window.location.href = endpoint
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        setToast({ text: 'Rejection submitted successfully', state: 'success' })
        setTimeout(() => {
          navigate('/')
        }, 1500)
      } else {
        setToast({ text: data.message || 'Failed to reject', state: 'error' })
      }
    } catch (error: any) {
      console.error('Error rejecting task:', error)
      setToast({ text: error?.message || 'Failed to reject task', state: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendBack = async () => {
    const token = localStorage.getItem('token')
    const partnerId = localStorage.getItem('partnerId')
    
    if (!task || !partnerId) {
      alert('User not found. Please log in again.')
      return
    }
    
    if (!sendBackNote.trim()) {
      alert('Please provide a note for sending back')
      return
    }
    
    setSubmitting(true)
    try {
      // Get tenantId from URL query params first (for email links), then fallback to localStorage
      const searchParams = new URLSearchParams(location.search)
      const tenantIdFromUrl = searchParams.get('tenantId')
      const tenantId = tenantIdFromUrl || localStorage.getItem('current_tenant_id')
      
      const sendBackHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
      if (tenantId) {
        sendBackHeaders['X-Tenant-ID'] = tenantId
      }
      
      // Check if coming from email
      const fromEmail = searchParams.get('fromEmail')
      const endpoint = fromEmail === 'true' 
        ? `${API_BASE_URL}/workflow/tasks/${taskId}/send-back-email-action`
        : `${API_BASE_URL}/workflow/tasks/${taskId}/send-back`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: sendBackHeaders,
        body: JSON.stringify({
          userId: Number(partnerId),
          note: sendBackNote.trim()
        })
      })
      
      // If from email, might return HTML
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('text/html')) {
        // Redirect to the HTML response
        window.location.href = endpoint
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        setToast({ text: 'Change sent back successfully', state: 'success' })
        setTimeout(() => {
          navigate('/')
        }, 1500)
      } else {
        setToast({ text: data.message || 'Failed to send back', state: 'error' })
      }
    } catch (error: any) {
      console.error('Error sending back task:', error)
      setToast({ text: error?.message || 'Failed to send back task', state: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const formatFieldName = (field: string): string => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const isImageField = (fieldName: string): boolean => {
    const imageSizes = ['1920', '1024', '512', '256', '128']
    return imageSizes.some(size => fieldName.includes(size))
  }

  // Normalize value for display (extract ID from tuples, handle empty values)
  const normalizeValueForDisplay = (value: any): any => {
    // Handle tuples [id, name] - extract just the ID for display
    if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number') {
      return value[0]; // Return just the ID
    }
    
    // Handle Odoo command tuples like [[6, 0, [ids]]] - extract array of IDs
    if (Array.isArray(value) && value.length === 3 && Array.isArray(value[2])) {
      return value[2]; // Return array of IDs
    }
    
    // Return as-is for other values
    return value;
  }

  const formatValue = (value: any): string => {
    // Normalize before formatting
    const normalized = normalizeValueForDisplay(value);
    
    // Handle empty/null/undefined/false - return empty string instead of "N/A"
    if (normalized === null || normalized === undefined || normalized === false || normalized === '' || normalized === 'false') {
      return ''
    }
    
    if (typeof normalized === 'object') {
      if (Array.isArray(normalized)) {
        if (normalized.length === 0) return ''
        if (normalized.length <= 3) return normalized.join(', ')
        return `[${normalized.length} items]`
      }
      return JSON.stringify(normalized, null, 2)
    }
    if (typeof normalized === 'boolean') return normalized ? 'Yes' : 'No'
    return String(normalized)
  }

  const renderValueCell = (value: any, fieldName: string, isChanged: boolean, isOldValue: boolean) => {
    if (isImageField(fieldName) && value && typeof value === 'string' && value.trim() !== '') {
      const isBase64 = value.startsWith('data:image/') || value.startsWith('/9j/') || value.startsWith('iVBORw0KGgo')
      if (isBase64 || value.length > 100) {
        const imageSrc = value.startsWith('data:') ? value : `data:image/png;base64,${value}`
        const borderColor = isChanged 
          ? (isOldValue ? '#ef4444' : '#10b981')
          : '#e5e7eb'

    return (
          <img
            src={imageSrc}
            alt={fieldName}
        style={{
              maxWidth: '200px',
              maxHeight: '150px',
              objectFit: 'contain',
              borderRadius: '8px',
              border: `2px solid ${borderColor}`,
              display: 'block'
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        )
      }
    }
    
    const formatted = formatValue(value)
    return (
      <span style={{
        color: isChanged ? (isOldValue ? '#ef4444' : '#10b981') : colors.textPrimary,
        fontWeight: isChanged ? '600' : '400'
      }}>
        {formatted}
            </span>
    )
  }

  const getOrderedFields = useMemo(() => {
    const changeType = pendingChange?.change_type
    const originalData = pendingChange?.original_data
    const newData = pendingChange?.new_data
    
    // For create: use new_data, for delete: use original_data, for update: use both
    let dataToUse: any = {}
    if (changeType === 'create') {
      dataToUse = newData || {}
    } else if (changeType === 'delete') {
      dataToUse = originalData || {}
    } else {
      // Update: use both to get all fields
      dataToUse = { ...(originalData || {}), ...(newData || {}) }
    }
    
    if (!dataToUse || Object.keys(dataToUse).length === 0) return []
    
    const changedFields = pendingChange?.changed_fields || []
    const allFields = new Set(Object.keys(dataToUse))
    
    const priorityFields = ['id', 'name', 'display_name', 'image_1920']
    const ordered: string[] = []
    const rest: string[] = []
    
    priorityFields.forEach(field => {
      if (allFields.has(field)) {
        ordered.push(field)
        allFields.delete(field)
      }
    })
    
    changedFields.forEach(field => {
      if (allFields.has(field) && !ordered.includes(field)) {
        ordered.push(field)
        allFields.delete(field)
      }
    })
    
    allFields.forEach(field => {
      rest.push(field)
    })
    
    return [...ordered, ...rest.sort()]
  }, [pendingChange])

  const totalPages = Math.ceil(getOrderedFields.length / ROWS_PER_PAGE)
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedFields = getOrderedFields.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [pendingChange?.id])

  if (loading) {
    return (
      <div style={{ 
          minHeight: '100vh',
        backgroundColor: colors.background, 
          display: 'flex',
          alignItems: 'center',
        justifyContent: 'center' 
      }}>
        <div style={{ 
          color: colors.textSecondary, 
          fontSize: '0.875rem', 
          fontWeight: '500',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}>
          Loading approval details...
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    )
  }

  if (!task || !pendingChange) {
    return (
      <div style={{ 
          minHeight: '100vh',
        backgroundColor: colors.background, 
          display: 'flex',
          alignItems: 'center',
        justifyContent: 'center' 
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '0.875rem', fontWeight: '500' }}>
          Task or changes not found
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .btn-hover {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-hover:hover {
          transform: translateY(-1px);
        }
        .btn-hover:active {
          transform: translateY(0);
        }
      `}</style>

      {/* Header Section with Back Button and Status */}
      <div style={{ 
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.card,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: isDark ? '0 1px 3px 0 rgba(0, 0, 0, 0.3)' : '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '20px 32px'
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            animation: 'slideDown 0.4s ease-out'
          }}>
            {/* Left side: Back Button and Title */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <button 
                onClick={() => navigate('/')} 
                style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: colors.textSecondary,
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  marginTop: '2px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.mutedBg
                  e.currentTarget.style.borderColor = colors.border
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.borderColor = colors.border
                }}
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ 
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: colors.textPrimary,
                  margin: 0,
                  lineHeight: '1.3',
                  letterSpacing: '-0.02em'
                }}>
                  {sendBackComment ? (
                    'Change Returned for Correction'
                  ) : pendingChange ? (
                    `A ${(pendingChange.entity_type || '').replace(/\./g, ' ')} was ${pendingChange.change_type}d by user with ID ${pendingChange.requested_by}`
                  ) : (
                    'Loading...'
                  )}
                </h1>
                {sendBackComment ? (
                  <>
                    <p style={{ 
                      color: colors.textSecondary, 
                      fontSize: '0.875rem',
                      margin: '8px 0 4px 0',
                      fontWeight: '400'
                    }}>
                      {returnUserName || 'User'} has sent back your change for correction
                    </p>
                    <div style={{ 
                      marginTop: '12px',
                      padding: '12px 16px',
                      backgroundColor: isDark ? 'rgba(251, 146, 60, 0.15)' : '#fff7ed',
                      border: '1px solid #fb923c',
                      borderRadius: '8px',
                      color: isDark ? '#fb923c' : '#9a3412',
                      fontSize: '0.875rem',
                      lineHeight: '1.5'
                    }}>
                      {sendBackComment}
                    </div>
                  </>
                ) : (
                  <p style={{ 
                    color: colors.textSecondary, 
                    fontSize: '0.875rem',
                    margin: '8px 0 4px 0',
                    fontWeight: '400'
                  }}>
                    Please review these changes at your earliest convenience
                  </p>
                )}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  fontSize: '0.8125rem',
                  color: colors.textSecondary
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} />
                    {new Date(pendingChange.requested_at).toLocaleString()}
                  </span>
                  <span>•</span>
                  <span>Entity ID: #{pendingChange.entity_id}</span>
                </div>
              </div>
            </div>

            {/* Right side: Action Buttons or Status Pill */}
            {task.status === 'pending' && !showRejectInput && !showSendBack ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '8px',
                flexShrink: 0
              }}>
                {/* Approve and Reject on same row */}
                <div style={{ 
                  display: 'flex',
                  gap: '8px'
                }}>
                  <button 
                    onClick={handleApprove} 
                    disabled={submitting}
                    className="btn-hover"
                    style={{ 
                      backgroundColor: colors.action,
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      border: 'none',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}
                    onMouseEnter={(e) => !submitting && (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = submitting ? '0.6' : '1')}
                  >
                    <CheckCircle size={16} />
                    {submitting ? 'Approving...' : 'Approve'}
                  </button>
                  <button 
                    onClick={() => setShowRejectInput(true)} 
                    disabled={submitting}
                    className="btn-hover"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#ffffff',
                      color: '#ef4444',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5'}`,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}
                    onMouseEnter={(e) => { 
                      if (!submitting) { 
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2'
                      } 
                    }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.1)' : '#ffffff'
                    }}
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
                {/* Return for correction button below */}
                {canSendBack && (
                  <button 
                    onClick={() => setShowSendBack(true)} 
                    disabled={submitting}
                    className="btn-hover"
                    style={{ 
                      backgroundColor: colors.card,
                      color: colors.textPrimary,
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      border: `1px solid ${colors.border}`,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = colors.mutedBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.card)}
                  >
                    <Undo2 size={16} />
                    Return for correction
                  </button>
                )}
              </div>
            ) : task.status !== 'pending' || workflowStatus || sendBackComment || rejectionComment ? (
              <div style={{ flexShrink: 0, marginTop: '2px' }}>
                {/* Priority: Check for returned notification first */}
                {sendBackComment ? (
                  <div style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    backgroundColor: isDark ? 'rgba(251, 146, 60, 0.15)' : '#fff7ed',
                    border: '1px solid #fb923c',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDark ? '#fb923c' : '#9a3412'
                  }}>
                    Returned for Correction
                  </div>
                ) : rejectionComment ? (
                  <div style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                    border: '1px solid #ef4444',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDark ? '#ef4444' : '#991b1b'
                  }}>
                    Rejected
                  </div>
                ) : workflowStatus === 'Needs Correction' ? (
                  <div style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    backgroundColor: isDark ? 'rgba(251, 146, 60, 0.15)' : '#fff7ed',
                    border: '1px solid #fb923c',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDark ? '#fb923c' : '#9a3412'
                  }}>
                    Needs Correction
                  </div>
                ) : workflowStatus === 'Rejected' ? (
                  <div style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                    border: '1px solid #ef4444',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDark ? '#ef4444' : '#991b1b'
                  }}>
                    Rejected
                  </div>
                ) : workflowStatus === 'Completed' || workflowStatus === 'Approved' ? (
                  <div style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    backgroundColor: '#d1fae5',
                    border: '1px solid #10b981',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#065f46'
                  }}>
                    Approved
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {/* Only show rejection alert if there's actually a rejection (not a return) */}
      {rejectionComment && !sendBackComment && (
        <div style={{
          padding: '16px 24px',
          margin: '0 auto',
          maxWidth: '1200px',
          animation: 'slideDown 0.4s ease-out'
        }}>
          <div style={{
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
            border: '1px solid #ef4444',
            color: isDark ? '#ef4444' : '#991b1b'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: '600' }}>
              {rejectionUserName || 'User'} has rejected your request
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.5' }}>
              {rejectionComment}
            </p>
          </div>
        </div>
      )}

        {/* Main Content */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '32px',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        {/* Table Section */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '16px',
            gap: '16px'
          }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ 
                fontSize: '1.125rem',
                fontWeight: '600',
                color: colors.textPrimary,
                margin: 0,
                letterSpacing: '-0.01em'
              }}>
                Field Changes
              </h2>
            </div>
            <span style={{ 
              fontSize: '0.8125rem',
              fontWeight: '500',
              color: colors.textSecondary,
              backgroundColor: colors.mutedBg,
              padding: '4px 10px',
              borderRadius: '6px',
              border: `1px solid ${colors.border}`,
              flexShrink: 0
            }}>
              {pendingChange.changed_fields?.length || 0} modified
            </span>
          </div>
              
          <div style={{ 
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: colors.card
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem'
              }}>
                <thead>
                  <tr style={{ backgroundColor: colors.mutedBg }}>
                    <th style={{ 
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: colors.textPrimary,
                      fontSize: '0.8125rem',
                      borderBottom: `1px solid ${colors.border}`,
                      width: pendingChange?.change_type === 'update' ? '25%' : '30%'
                    }}>
                      Field
                    </th>
                    {pendingChange?.change_type === 'update' ? (
                      <>
                        <th style={{ 
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: colors.textPrimary,
                          fontSize: '0.8125rem',
                          borderBottom: `1px solid ${colors.border}`,
                          width: '37.5%'
                        }}>
                          Current Value
                        </th>
                        <th style={{ 
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: colors.textPrimary,
                          fontSize: '0.8125rem',
                          borderBottom: `1px solid ${colors.border}`,
                          width: '37.5%'
                        }}>
                          Proposed Value
                        </th>
                      </>
                    ) : (
                      <th style={{ 
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: colors.textPrimary,
                        fontSize: '0.8125rem',
                        borderBottom: `1px solid ${colors.border}`,
                        width: '70%'
                      }}>
                        Value
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedFields.map((field, index) => {
                    const changeType = pendingChange?.change_type
                    let value: any
                    let isChangedField = false
                    
                    if (changeType === 'create') {
                      // For create: use new_data
                      value = pendingChange.new_data?.[field]
                      isChangedField = false // No changes in create, all fields are new
                    } else if (changeType === 'delete') {
                      // For delete: use original_data
                      value = pendingChange.original_data?.[field]
                      isChangedField = false // No changes in delete, showing what will be deleted
                    } else {
                      // For update: show both old and new
                      const oldValue = pendingChange.original_data?.[field]
                      const newValue = pendingChange.new_data?.[field]
                      isChangedField = pendingChange.changed_fields?.includes(field) || false
                      
                      return (
                        <tr 
                          key={field}
                          style={{
                            borderBottom: index < paginatedFields.length - 1 ? `1px solid ${colors.border}` : 'none',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.mutedBg
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          <td style={{ 
                            padding: '14px 16px',
                            color: colors.textPrimary,
                            fontWeight: '500',
                            fontSize: '0.8125rem'
                          }}>
                            {formatFieldName(field)}
                          </td>
                          <td style={{ 
                            padding: '14px 16px',
                            wordBreak: 'break-word',
                            fontSize: '0.8125rem',
                            verticalAlign: 'middle'
                          }}>
                            {renderValueCell(oldValue, field, isChangedField, true)}
                          </td>
                          <td style={{ 
                            padding: '14px 16px',
                            wordBreak: 'break-word',
                            fontSize: '0.8125rem',
                            verticalAlign: 'middle'
                          }}>
                            {renderValueCell(newValue, field, isChangedField, false)}
                          </td>
                        </tr>
                      )
                    }

                    // For create/delete: show single value column
                    return (
                      <tr 
                        key={field}
                        style={{
                          borderBottom: index < paginatedFields.length - 1 ? `1px solid ${colors.border}` : 'none',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.mutedBg
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <td style={{ 
                          padding: '14px 16px',
                          color: colors.textPrimary,
                          fontWeight: '500',
                          fontSize: '0.8125rem'
                        }}>
                          {formatFieldName(field)}
                        </td>
                        <td style={{ 
                          padding: '14px 16px',
                          wordBreak: 'break-word',
                          fontSize: '0.8125rem',
                          verticalAlign: 'middle'
                        }}>
                          {renderValueCell(value, field, false, false)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
              
            {totalPages > 1 && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderTop: '1px solid #f3f4f6',
                backgroundColor: colors.mutedBg
              }}>
                <div style={{ 
                  fontSize: '0.8125rem',
                  color: colors.textSecondary
                }}>
                  {startIndex + 1}-{Math.min(endIndex, getOrderedFields.length)} of {getOrderedFields.length}
                </div>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-hover"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      fontSize: '0.8125rem',
                      fontWeight: '500',
                      color: currentPage === 1 ? colors.textSecondary : colors.textPrimary,
                      backgroundColor: colors.card,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronLeft size={14} />
                    Prev
                  </button>
                  <span style={{
                    fontSize: '0.8125rem',
                    color: colors.textSecondary,
                    padding: '0 8px'
                  }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-hover"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      fontSize: '0.8125rem',
                      fontWeight: '500',
                      color: currentPage === totalPages ? colors.textSecondary : colors.textPrimary,
                      backgroundColor: colors.card,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Reject Modal */}
      {showRejectInput && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => {
            if (!submitting) {
              setShowRejectInput(false)
              setRejectionReason('')
            }
          }}
        >
          <div
            style={{
              backgroundColor: colors.card,
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              padding: '24px',
              boxShadow: isDark ? '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              animation: 'slideDown 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '10px' }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: colors.textPrimary,
                margin: '0 0 8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <XCircle size={20} />
                Reject Request
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: colors.textSecondary,
                margin: 0
              }}>
                Please provide a reason for rejection
              </p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..." 
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5'}`,
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#ef4444'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#fca5a5'}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { 
                  setShowRejectInput(false)
                  setRejectionReason('')
                }}
                disabled={submitting}
                className="btn-hover"
                style={{
                  backgroundColor: colors.card,
                  color: colors.textPrimary,
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: `1px solid ${colors.border}`,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.backgroundColor = colors.mutedBg
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.card
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                disabled={submitting || !rejectionReason.trim()}
                className="btn-hover"
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: (submitting || !rejectionReason.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (submitting || !rejectionReason.trim()) ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!(submitting || !rejectionReason.trim())) {
                    e.currentTarget.style.backgroundColor = '#dc2626'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444'
                }}
              >
                {submitting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return for Correction Modal */}
      {showSendBack && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => {
            if (!submitting) {
              setShowSendBack(false)
              setSendBackNote('')
            }
          }}
        >
          <div
            style={{
              backgroundColor: colors.card, 
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              padding: '24px',
              boxShadow: isDark ? '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              animation: 'slideDown 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '10px' }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: colors.textPrimary,
                margin: '0 0 8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Undo2 size={20} />
                Return for Correction
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: colors.textSecondary,
                margin: 0
              }}>
                Please describe what needs to be corrected
              </p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <textarea 
                value={sendBackNote} 
                onChange={(e) => setSendBackNote(e.target.value)} 
                placeholder="Describe the corrections needed..." 
                style={{ 
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = colors.action}
                onBlur={(e) => e.currentTarget.style.borderColor = colors.border}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { 
                  setShowSendBack(false)
                  setSendBackNote('')
                }}
                disabled={submitting}
                className="btn-hover"
                style={{
                  backgroundColor: colors.card,
                  color: colors.textPrimary,
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: `1px solid ${colors.border}`,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.backgroundColor = colors.mutedBg
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.card
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSendBack} 
                disabled={submitting || !sendBackNote.trim()}
                className="btn-hover"
                style={{ 
                  backgroundColor: colors.action,
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: (submitting || !sendBackNote.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (submitting || !sendBackNote.trim()) ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!(submitting || !sendBackNote.trim())) {
                    e.currentTarget.style.opacity = '0.9'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = (submitting || !sendBackNote.trim()) ? '0.6' : '1'
                }}
              >
                {submitting ? 'Sending...' : 'Return for Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}