"use client"

import { useMemo, useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/theme"
import { Clock, Play, Pause, Trash2, Plus, Edit, FileText, CheckCircle2, XCircle, AlertCircle, RefreshCcw } from "lucide-react"
import { Card } from "../@/components/ui/card"
import { Button } from "../@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../@/components/ui/select"
import { Input } from "../@/components/ui/input"
import { Label } from "../@/components/ui/label"
import { useAuth } from "../context/auth"
import { API_CONFIG } from "./config/api"
import { StatCard } from "./components/StatCard"
import { Skeleton } from "@mui/material"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import Toast from "./components/Toast"
import Alert from "./components/Alert"

interface ScheduledReport {
  id: number
  name: string
  description?: string
  template_id: number
  template_name?: string
  report_type?: string
  schedule_type: 'cron' | 'event' | 'hybrid'
  cron_expression?: string
  event_config?: Record<string, unknown>
  is_active: boolean
  next_run_at?: string
  last_run_at?: string
  last_run_status?: 'success' | 'failed' | 'pending'
  execution_count: number
  created_by?: number
  created_at: string
  recipients?: Array<{ type: 'user' | 'email' | 'role'; value: string }>
  notify_on_complete: boolean
}

const statusConfig = {
  success: { color: '#10b981', label: 'Success', icon: CheckCircle2 },
  failed: { color: '#ef4444', label: 'Failed', icon: XCircle },
  pending: { color: '#f59e0b', label: 'Pending', icon: AlertCircle }
}

const scheduleTypeLabels = {
  cron: 'Recurring',
  event: 'Event Triggered',
  hybrid: 'Hybrid'
}

export default function SmartReportsScheduledPage() {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const { sessionId } = useAuth()

  const [schedules, setSchedules] = useState<ScheduledReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [scheduleToDelete, setScheduleToDelete] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    runs_today: 0
  })
  const isRTL = i18n.dir() === "rtl"
  const navigate = useNavigate()

  // Modal form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_id: 0,
    schedule_type: 'cron' as 'cron' | 'event' | 'hybrid',
    cron_expression: '0 0 * * *', // Daily at midnight
    notify_on_complete: true,
    recipients: [] as Array<{ type: 'user' | 'email' | 'role'; value: string }>
  })

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
    setTimeout(() => setToast(null), 3000)
  }

  // Fetch scheduled reports
  const fetchSchedules = async () => {
    if (!sessionId) return

    setLoading(true)
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/scheduled`, {
        method: 'GET',
        headers
      })

      if (response.ok) {
        const result = await response.json()
        setSchedules(result.data?.scheduled_reports || result.scheduled_reports || result.data || [])
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    if (!sessionId) return

    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/stats`, {
        method: 'GET',
        headers
      })

      if (response.ok) {
        const result = await response.json()
        const data = result.data || result
        setStats({
          total: data.scheduled_reports || 0,
          active: data.active_schedules || 0,
          paused: data.paused_schedules || 0,
          runs_today: data.runs_today || 0
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  useEffect(() => {
    fetchSchedules()
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Pause/Resume schedule
  const handleToggleSchedule = async (scheduleId: number, isActive: boolean) => {
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }

      const endpoint = isActive ? '/pause' : '/resume'
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/scheduled/${scheduleId}${endpoint}`, {
        method: 'POST',
        headers
      })

      if (response.ok) {
        setSchedules(schedules.map(s =>
          s.id === scheduleId ? { ...s, is_active: !isActive } : s
        ))
        showToast(isActive ? t('Schedule paused') : t('Schedule resumed'), 'success')
        fetchStats()
      } else {
        showToast(t('Failed to update schedule'), 'error')
      }
    } catch (error) {
      console.error('Error toggling schedule:', error)
      showToast(t('Error updating schedule'), 'error')
    }
  }

  // Delete schedule
  const handleDelete = async (scheduleId: number) => {
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/scheduled/${scheduleId}`, {
        method: 'DELETE',
        headers
      })

      if (response.ok) {
        setSchedules(schedules.filter(s => s.id !== scheduleId))
        showToast(t('Schedule deleted successfully'), 'success')
        fetchStats()
      } else {
        showToast(t('Failed to delete schedule'), 'error')
      }
    } catch (error) {
      console.error('Error deleting schedule:', error)
      showToast(t('Error deleting schedule'), 'error')
    }
    setDeleteAlertOpen(false)
    setScheduleToDelete(null)
  }

  // Save schedule (create or update)
  const handleSave = async () => {
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }

      const endpoint = editingSchedule ? `/smart-reports/scheduled/${editingSchedule.id}` : '/smart-reports/scheduled'
      const method = editingSchedule ? 'PUT' : 'POST'

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}${endpoint}`, {
        method,
        headers,
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        showToast(editingSchedule ? t('Schedule updated') : t('Schedule created'), 'success')
        setIsModalOpen(false)
        setEditingSchedule(null)
        setFormData({
          name: '',
          description: '',
          template_id: 0,
          schedule_type: 'cron',
          cron_expression: '0 0 * * *',
          notify_on_complete: true,
          recipients: []
        })
        fetchSchedules()
        fetchStats()
      } else {
        showToast(t('Failed to save schedule'), 'error')
      }
    } catch (error) {
      console.error('Error saving schedule:', error)
      showToast(t('Error saving schedule'), 'error')
    }
  }

  // Edit schedule
  const handleEdit = (schedule: ScheduledReport) => {
    setEditingSchedule(schedule)
    setFormData({
      name: schedule.name,
      description: schedule.description || '',
      template_id: schedule.template_id,
      schedule_type: schedule.schedule_type,
      cron_expression: schedule.cron_expression || '0 0 * * *',
      notify_on_complete: schedule.notify_on_complete,
      recipients: schedule.recipients || []
    })
    setIsModalOpen(true)
  }

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      const matchesSearch = !searchQuery ||
        schedule.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        schedule.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && schedule.is_active) ||
        (statusFilter === 'paused' && !schedule.is_active)

      return matchesSearch && matchesStatus
    })
  }, [schedules, searchQuery, statusFilter])

  // Get cron expression label
  const getCronLabel = (expression?: string): string => {
    if (!expression) return t('Custom')

    // Simple mapping for common expressions
    const commonExpressions: Record<string, string> = {
      '0 0 * * *': t('Daily at midnight'),
      '0 0 * * 1': t('Weekly on Monday'),
      '0 0 1 * *': t('Monthly on 1st'),
      '0 * * * *': t('Every hour'),
      '*/30 * * * *': t('Every 30 minutes')
    }

    return commonExpressions[expression] || expression
  }

  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: colors.background,
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                color: colors.textPrimary,
                marginBottom: '0.5rem',
              }}
            >
              {t('Scheduled Reports')}
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '0.875rem' }}>
              {t('Automate report generation with schedules')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/smart-reports')}
              style={{
                borderColor: colors.border,
                color: colors.textPrimary,
              }}
            >
              <FileText size={18} className={isRTL ? 'ml-2' : 'mr-2'} />
              {t('Templates')}
            </Button>
            <Button
              onClick={() => {
                setEditingSchedule(null)
                setFormData({
                  name: '',
                  description: '',
                  template_id: 0,
                  schedule_type: 'cron',
                  cron_expression: '0 0 * * *',
                  notify_on_complete: true,
                  recipients: []
                })
                setIsModalOpen(true)
              }}
              style={{
                backgroundColor: colors.action,
                color: '#fff',
              }}
            >
              <Plus size={18} className={isRTL ? 'ml-2' : 'mr-2'} />
              {t('New Schedule')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ marginBottom: '2rem' }}>
        <StatCard
          title={t('Total Schedules')}
          value={stats.total}
          icon={Clock}
          color={colors.action}
          trend=""
          colors={colors}
        />
        <StatCard
          title={t('Active')}
          value={stats.active}
          icon={Play}
          color="#10b981"
          trend=""
          colors={colors}
        />
        <StatCard
          title={t('Paused')}
          value={stats.paused}
          icon={Pause}
          color="#f59e0b"
          trend=""
          colors={colors}
        />
        <StatCard
          title={t('Runs Today')}
          value={stats.runs_today}
          icon={RefreshCcw}
          color="#3b82f6"
          trend=""
          colors={colors}
        />
      </div>

      {/* Filters */}
      <TransferFiltersBar
        searchPlaceholder={t('Search schedules...')}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            type: 'select',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: t('All Status') },
              { value: 'active', label: t('Active') },
              { value: 'paused', label: t('Paused') }
            ]
          }
        ]}
        colors={colors}
      />

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={200} style={{ borderRadius: '16px' }} />
          ))}
        </div>
      ) : filteredSchedules.length === 0 ? (
        <Card
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '3rem',
            textAlign: 'center',
          }}
        >
          <Clock size={48} style={{ color: colors.textSecondary, marginBottom: '1rem' }} />
          <h3 style={{ color: colors.textPrimary, marginBottom: '0.5rem' }}>
            {t('No scheduled reports')}
          </h3>
          <p style={{ color: colors.textSecondary, marginBottom: '1.5rem' }}>
            {t('Create a schedule to automatically generate reports')}
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            style={{
              backgroundColor: colors.action,
              color: '#fff',
            }}
          >
            <Plus size={18} className={isRTL ? 'ml-2' : 'mr-2'} />
            {t('Create Schedule')}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchedules.map((schedule) => (
            <Card
              key={schedule.id}
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '16px',
                padding: '1.5rem',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              className="hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-xl"
                    style={{
                      background: schedule.is_active
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                    }}
                  >
                    <Clock size={20} color="#fff" />
                  </div>
                  <div>
                    <h3
                      style={{
                        color: colors.textPrimary,
                        fontWeight: '600',
                        fontSize: '1rem',
                      }}
                    >
                      {schedule.name}
                    </h3>
                    {schedule.template_name && (
                      <p style={{ color: colors.textSecondary, fontSize: '0.75rem' }}>
                        {schedule.template_name}
                      </p>
                    )}
                  </div>
                </div>
                <div
                  className={`px-2 py-1 rounded-full text-xs font-medium ${schedule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  {schedule.is_active ? t('Active') : t('Paused')}
                </div>
              </div>

              {schedule.description && (
                <p
                  style={{
                    color: colors.textSecondary,
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                    lineHeight: '1.5',
                  }}
                >
                  {schedule.description}
                </p>
              )}

              <div className="space-y-2" style={{ marginBottom: '1rem' }}>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: colors.textSecondary }}>{t('Type')}</span>
                  <span style={{ color: colors.textPrimary, fontWeight: '500' }}>
                    {scheduleTypeLabels[schedule.schedule_type]}
                  </span>
                </div>

                {schedule.schedule_type === 'cron' && schedule.cron_expression && (
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: colors.textSecondary }}>{t('Schedule')}</span>
                    <span style={{ color: colors.textPrimary, fontWeight: '500' }}>
                      {getCronLabel(schedule.cron_expression)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: colors.textSecondary }}>{t('Total Runs')}</span>
                  <span style={{ color: colors.textPrimary, fontWeight: '500' }}>
                    {schedule.execution_count}
                  </span>
                </div>

                {schedule.last_run_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: colors.textSecondary }}>{t('Last Run')}</span>
                    <div className="flex items-center gap-2">
                      {schedule.last_run_status && (
                        <span style={{ color: statusConfig[schedule.last_run_status]?.color || '#6b7280' }}>
                          {statusConfig[schedule.last_run_status]?.label || '-'}
                        </span>
                      )}
                      <span style={{ color: colors.textPrimary, fontWeight: '500' }}>
                        {new Date(schedule.last_run_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {schedule.is_active && schedule.next_run_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: colors.textSecondary }}>{t('Next Run')}</span>
                    <span style={{ color: colors.textPrimary, fontWeight: '500' }}>
                      {new Date(schedule.next_run_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleSchedule(schedule.id, schedule.is_active)}
                  className="flex-1"
                  style={{
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  }}
                >
                  {schedule.is_active ? (
                    <Pause size={16} className={isRTL ? 'ml-1' : 'mr-1'} />
                  ) : (
                    <Play size={16} className={isRTL ? 'ml-1' : 'mr-1'} />
                  )}
                  {schedule.is_active ? t('Pause') : t('Resume')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(schedule)}
                  style={{
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  }}
                >
                  <Edit size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setScheduleToDelete(schedule.id)
                    setDeleteAlertOpen(true)
                  }}
                  style={{
                    borderColor: colors.border,
                    color: '#ef4444',
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setIsModalOpen(false)}
        >
          <Card
            style={{
              backgroundColor: colors.card,
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2
                style={{
                  color: colors.textPrimary,
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  marginBottom: '1.5rem',
                }}
              >
                {editingSchedule ? t('Edit Schedule') : t('New Schedule')}
              </h2>

              <div className="space-y-4">
                <div>
                  <Label style={{ color: colors.textSecondary }}>{t('Name')} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('Enter schedule name')}
                    style={{
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                    }}
                  />
                </div>

                <div>
                  <Label style={{ color: colors.textSecondary }}>{t('Description')}</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('Enter description')}
                    style={{
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                    }}
                  />
                </div>

                <div>
                  <Label style={{ color: colors.textSecondary }}>{t('Schedule Type')}</Label>
                  <Select
                    value={formData.schedule_type}
                    onValueChange={(value) => setFormData({ ...formData, schedule_type: value as 'cron' | 'event' | 'hybrid' })}
                  >
                    <SelectTrigger
                      style={{
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        color: colors.textPrimary,
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cron">{t('Recurring')}</SelectItem>
                      <SelectItem value="event">{t('Event Triggered')}</SelectItem>
                      <SelectItem value="hybrid">{t('Hybrid')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.schedule_type === 'cron' && (
                  <div>
                    <Label style={{ color: colors.textSecondary }}>{t('Cron Expression')}</Label>
                    <Input
                      value={formData.cron_expression}
                      onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                      placeholder="0 0 * * *"
                      style={{
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        color: colors.textPrimary,
                      }}
                    />
                    <p style={{ color: colors.textSecondary, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {t('Format: minute hour day month weekday')}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notify"
                    checked={formData.notify_on_complete}
                    onChange={(e) => setFormData({ ...formData, notify_on_complete: e.target.checked })}
                  />
                  <Label htmlFor="notify" style={{ color: colors.textSecondary }}>
                    {t('Notify on completion')}
                  </Label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  }}
                >
                  {t('Cancel')}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!formData.name}
                  style={{
                    backgroundColor: colors.action,
                    color: '#fff',
                  }}
                >
                  {editingSchedule ? t('Update') : t('Create')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete Alert */}
      <Alert
        isOpen={deleteAlertOpen}
        title={t('Delete Schedule?')}
        description={t('This action cannot be undone. The schedule will be permanently deleted.')}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        onConfirm={() => scheduleToDelete && handleDelete(scheduleToDelete)}
        onCancel={() => {
          setDeleteAlertOpen(false)
          setScheduleToDelete(null)
        }}
        colors={colors}
      />
    </div>
  )
}
