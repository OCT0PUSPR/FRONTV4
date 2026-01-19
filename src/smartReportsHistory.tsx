"use client"

import { useMemo, useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/theme"
import { FileText, Download, Trash2, RefreshCcw } from "lucide-react"
import { Card } from "../@/components/ui/card"
import { Button } from "../@/components/ui/button"
import { useAuth } from "../context/auth"
import { API_CONFIG } from "./config/api"
import { StatCard } from "./components/StatCard"
import { TransferFiltersBar } from "./components/TransferFiltersBar"
import { DataTable, ColumnDef } from "./components/DataTable"
import Toast from "./components/Toast"
import Alert from "./components/Alert"

interface GeneratedReport {
  id: number
  report_uuid: string
  report_number?: string
  template_id: number
  template_name: string
  report_type: string
  source_model: string
  source_record_id: number
  source_record_name?: string
  pdf_size?: number
  generation_trigger: string
  generation_time_ms?: number
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'expired'
  generated_by?: number
  created_at: string
  completed_at?: string
  error_message?: string
}

// Icons as components - defined before use
const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
)

const Clock = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
)

const XCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
)

const statusConfig = {
  completed: { color: '#10b981', label: 'Completed', icon: CheckCircle2 },
  pending: { color: '#f59e0b', label: 'Pending', icon: Clock },
  generating: { color: '#3b82f6', label: 'Generating', icon: RefreshCcw },
  failed: { color: '#ef4444', label: 'Failed', icon: XCircle },
  expired: { color: '#6b7280', label: 'Expired', icon: Clock }
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function SmartReportsHistoryPage() {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const { sessionId } = useAuth()

  const [reports, setReports] = useState<GeneratedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sourceModelFilter, setSourceModelFilter] = useState<string>("all")
  const [currentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [viewMode, setViewMode] = useState<"cards" | "table">("table")
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<number | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0
  })
  const isRTL = i18n.dir() === "rtl"
  const navigate = useNavigate()

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state })
    setTimeout(() => setToast(null), 3000)
  }

  // Fetch reports
  const fetchReports = async () => {
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

      const params = new URLSearchParams({
        limit: String(itemsPerPage),
        offset: String((currentPage - 1) * itemsPerPage)
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/reports?${params}`, {
        method: 'GET',
        headers
      })

      if (response.ok) {
        const result = await response.json()
        setReports(result.data?.reports || result.reports || [])
        setStats({
          total: result.data?.total || result.total || 0,
          completed: result.data?.stats?.completed || 0,
          pending: result.data?.stats?.pending || 0,
          failed: result.data?.stats?.failed || 0
        })
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
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
        setStats(result.data || result)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  useEffect(() => {
    fetchReports()
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentPage, itemsPerPage, statusFilter])

  // Download report
  const handleDownload = async (reportId: number) => {
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const headers: Record<string, string> = {}
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/reports/${reportId}/download`, {
        method: 'GET',
        headers
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `report_${reportId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showToast(t('Report downloaded successfully'), 'success')
      } else {
        showToast(t('Failed to download report'), 'error')
      }
    } catch (error) {
      console.error('Error downloading report:', error)
      showToast(t('Error downloading report'), 'error')
    }
  }

  // Delete report
  const handleDelete = async (reportId: number) => {
    try {
      const tenantId = localStorage.getItem('current_tenant_id')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }

      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/smart-reports/reports/${reportId}`, {
        method: 'DELETE',
        headers
      })

      if (response.ok) {
        setReports(reports.filter(r => r.id !== reportId))
        showToast(t('Report deleted successfully'), 'success')
        fetchStats()
      } else {
        showToast(t('Failed to delete report'), 'error')
      }
    } catch (error) {
      console.error('Error deleting report:', error)
      showToast(t('Error deleting report'), 'error')
    }
    setDeleteAlertOpen(false)
    setReportToDelete(null)
  }

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = !searchQuery ||
        report.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.report_uuid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.source_record_name?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || report.status === statusFilter

      const matchesSource = sourceModelFilter === 'all' || report.source_model === sourceModelFilter

      return matchesSearch && matchesStatus && matchesSource
    })
  }, [reports, searchQuery, statusFilter, sourceModelFilter])

  // Table columns
  const columns: ColumnDef<GeneratedReport>[] = [
    {
      id: 'template_name',
      header: t('Template'),
      cell: (row) => (
        <div className="flex items-center gap-2">
          <FileText size={16} style={{ color: colors.textSecondary }} />
          <span className="font-medium">{row.template_name}</span>
        </div>
      )
    },
    {
      id: 'source_record_name',
      header: t('Source Record'),
      cell: (row) => row.source_record_name || `${row.source_model} #${row.source_record_id}`
    },
    {
      id: 'status',
      header: t('Status'),
      cell: (row) => {
        const config = statusConfig[row.status] || statusConfig.pending
        const Icon = config.icon
        return (
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" style={{ color: config.color }} />
            <span style={{ color: config.color }}>{config.label}</span>
          </div>
        )
      }
    },
    {
      id: 'created_at',
      header: t('Created'),
      cell: (row) => new Date(row.created_at).toLocaleDateString()
    },
    {
      id: 'pdf_size',
      header: t('Size'),
      cell: (row) => formatFileSize(row.pdf_size)
    },
    {
      id: 'actions',
      header: t('Actions'),
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'completed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(row.id)}
              title={t('Download')}
            >
              <Download size={16} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setReportToDelete(row.id)
              setDeleteAlertOpen(true)
            }}
            title={t('Delete')}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ]

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
              {t('Report History')}
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '0.875rem' }}>
              {t('View and download your generated reports')}
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
              onClick={() => navigate('/smart-reports/builder')}
              style={{
                backgroundColor: colors.action,
                color: '#fff',
              }}
            >
              <FileText size={18} className={isRTL ? 'ml-2' : 'mr-2'} />
              {t('New Report')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ marginBottom: '2rem' }}>
        <StatCard
          title={t('Total Reports')}
          value={stats.total}
          icon={FileText}
          color={colors.action}
          trend=""
          colors={colors}
        />
        <StatCard
          title={t('Completed')}
          value={stats.completed}
          icon={CheckCircle2}
          color="#10b981"
          trend=""
          colors={colors}
        />
        <StatCard
          title={t('Pending')}
          value={stats.pending}
          icon={Clock}
          color="#f59e0b"
          trend=""
          colors={colors}
        />
        <StatCard
          title={t('Failed')}
          value={stats.failed}
          icon={XCircle}
          color="#ef4444"
          trend=""
          colors={colors}
        />
      </div>

      {/* Filters */}
      <TransferFiltersBar
        searchPlaceholder={t('Search reports...')}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            type: 'select',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: t('All Status') },
              { value: 'completed', label: t('Completed') },
              { value: 'pending', label: t('Pending') },
              { value: 'generating', label: t('Generating') },
              { value: 'failed', label: t('Failed') }
            ]
          },
          {
            type: 'select',
            value: sourceModelFilter,
            onChange: setSourceModelFilter,
            options: [
              { value: 'all', label: t('All Sources') }
            ]
          }
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReports}
            style={{
              borderColor: colors.border,
              color: colors.textPrimary,
            }}
          >
            <RefreshCcw size={16} className={isRTL ? 'ml-2' : 'mr-2'} />
            {t('Refresh')}
          </Button>
        }
        colors={colors}
      />

      {/* Content */}
      {loading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ backgroundColor: colors.card, borderRadius: '16px', height: '100px' }} />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <Card
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '3rem',
            textAlign: 'center',
          }}
        >
          <FileText size={48} style={{ color: colors.textSecondary, marginBottom: '1rem' }} />
          <h3 style={{ color: colors.textPrimary, marginBottom: '0.5rem' }}>
            {t('No reports found')}
          </h3>
          <p style={{ color: colors.textSecondary, marginBottom: '1.5rem' }}>
            {t('Generate your first report to see it here')}
          </p>
          <Button
            onClick={() => navigate('/smart-reports/builder')}
            style={{
              backgroundColor: colors.action,
              color: '#fff',
            }}
          >
            <FileText size={18} className={isRTL ? 'ml-2' : 'mr-2'} />
            {t('Create Report')}
          </Button>
        </Card>
      ) : (
        <DataTable
          data={filteredReports}
          columns={columns}
          colors={colors}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
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
        title={t('Delete Report?')}
        description={t('This action cannot be undone. The report will be permanently deleted.')}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        onConfirm={() => reportToDelete && handleDelete(reportToDelete)}
        onCancel={() => {
          setDeleteAlertOpen(false)
          setReportToDelete(null)
        }}
        colors={colors}
      />
    </div>
  )
}
