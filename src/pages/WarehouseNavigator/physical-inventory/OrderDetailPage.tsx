// Physical Inventory - Order Detail Page
// Displays order details, lines, progress, and actions

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  MapPin,
  Package,
  RefreshCw,
  Download,
  History,
  FileText,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
} from 'lucide-react';
import { useTheme } from '../../../../context/theme';
import { PhysicalInventoryService } from '../../../services/physicalInventory.service';
import type {
  ScanOrder,
  ScanOrderLine,
  ScanUpload,
  UnknownTag,
  InventoryAuditLog,
  ScanOrderStatus,
} from './types';
import { STATUS_COLORS } from './types';

type TabType = 'lines' | 'uploads' | 'unknown' | 'audit';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const isRTL = i18n?.dir() === 'rtl';

  // State
  const [order, setOrder] = useState<ScanOrder | null>(null);
  const [lines, setLines] = useState<ScanOrderLine[]>([]);
  const [uploads, setUploads] = useState<ScanUpload[]>([]);
  const [unknownTags, setUnknownTags] = useState<UnknownTag[]>([]);
  const [auditLogs, setAuditLogs] = useState<InventoryAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('lines');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Lines state
  const [linesPage, setLinesPage] = useState(1);
  const [linesTotalPages, setLinesTotalPages] = useState(1);
  const [linesFilter, setLinesFilter] = useState<'all' | 'discrepancy' | 'counted' | 'uncounted'>('all');
  const [linesSearch, setLinesSearch] = useState('');
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());

  const orderId = Number(id);

  // Fetch order data
  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const orderData = await PhysicalInventoryService.getOrder(orderId);
      if (orderData) {
        setOrder(orderData);
      } else {
        toast.error(t('physical_inventory.order_not_found', 'Order not found'));
        navigate('/physical-inventory/orders');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error(t('physical_inventory.error_loading_order', 'Failed to load order'));
    }
  }, [orderId, navigate, t]);

  // Fetch lines
  const fetchLines = useCallback(async () => {
    if (!orderId) return;
    try {
      const response = await PhysicalInventoryService.getOrderLines(
        orderId,
        {
          discrepancy_only: linesFilter === 'discrepancy',
          is_counted: linesFilter === 'counted' ? true : linesFilter === 'uncounted' ? false : undefined,
          search: linesSearch,
        },
        { page: linesPage, limit: 50, sort_by: 'product_name', sort_order: 'asc' }
      );
      if (response.success) {
        setLines(response.data);
        setLinesTotalPages(response.pagination.total_pages);
      }
    } catch (error) {
      console.error('Error fetching lines:', error);
    }
  }, [orderId, linesPage, linesFilter, linesSearch]);

  // Fetch uploads
  const fetchUploads = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await PhysicalInventoryService.getUploadHistory(orderId);
      setUploads(data);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    }
  }, [orderId]);

  // Fetch unknown tags
  const fetchUnknownTags = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await PhysicalInventoryService.getUnknownTags(orderId);
      setUnknownTags(data);
    } catch (error) {
      console.error('Error fetching unknown tags:', error);
    }
  }, [orderId]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await PhysicalInventoryService.getAuditLog(orderId);
      setAuditLogs(data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  }, [orderId]);

  // Initial fetch
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      await fetchOrder();
      await Promise.all([fetchLines(), fetchUploads(), fetchUnknownTags(), fetchAuditLogs()]);
      setIsLoading(false);
    };
    fetchAll();
  }, [fetchOrder, fetchLines, fetchUploads, fetchUnknownTags, fetchAuditLogs]);

  // Refetch lines when filter/page changes
  useEffect(() => {
    if (!isLoading) {
      fetchLines();
    }
  }, [linesFilter, linesPage, fetchLines, isLoading]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading) {
        setLinesPage(1);
        fetchLines();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [linesSearch]);

  // Action handlers
  const handleStartOrder = async () => {
    const result = await PhysicalInventoryService.startOrder(orderId);
    if (result.success) {
      toast.success(t('physical_inventory.order_started', 'Count order started'));
      fetchOrder();
    } else {
      toast.error(result.error || t('physical_inventory.error_starting', 'Failed to start order'));
    }
    setShowActionsMenu(false);
  };

  const handleCompleteOrder = async () => {
    const result = await PhysicalInventoryService.completeOrder(orderId);
    if (result.success) {
      toast.success(t('physical_inventory.order_completed', 'Counting completed'));
      fetchOrder();
    } else {
      toast.error(result.error || t('physical_inventory.error_completing', 'Failed to complete order'));
    }
    setShowActionsMenu(false);
  };

  const handleCancelOrder = async () => {
    if (!confirm(t('physical_inventory.confirm_cancel', 'Are you sure you want to cancel this order?'))) {
      return;
    }
    const result = await PhysicalInventoryService.cancelOrder(orderId);
    if (result.success) {
      toast.success(t('physical_inventory.order_cancelled', 'Order cancelled'));
      fetchOrder();
    } else {
      toast.error(result.error || t('physical_inventory.error_cancelling', 'Failed to cancel order'));
    }
    setShowActionsMenu(false);
  };

  const handleValidateOrder = async () => {
    navigate(`/physical-inventory/orders/${orderId}/review`);
  };

  const handleExportPDF = async () => {
    const blob = await PhysicalInventoryService.exportOrderPDF(orderId);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `count-order-${order?.reference || orderId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      toast.error(t('physical_inventory.export_failed', 'Export failed'));
    }
    setShowActionsMenu(false);
  };

  const handleExportExcel = async () => {
    const blob = await PhysicalInventoryService.exportOrderExcel(orderId);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `count-order-${order?.reference || orderId}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      toast.error(t('physical_inventory.export_failed', 'Export failed'));
    }
    setShowActionsMenu(false);
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format number
  const formatNumber = (num: number | null | undefined, decimals: number = 0) => {
    if (num === null || num === undefined) return '-';
    return new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  // Status badge
  const StatusBadge = ({ status }: { status: ScanOrderStatus }) => {
    const statusConfig = STATUS_COLORS[status];
    const label = t(`physical_inventory.status.${status}`, status.replace('_', ' '));

    return (
      <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
        {label}
      </span>
    );
  };

  // Get status icon
  const getStatusIcon = (status: ScanOrderStatus) => {
    switch (status) {
      case 'validated':
        return <CheckCircle2 className="text-green-500" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="text-red-500" />;
      case 'pending_review':
        return <AlertTriangle className="text-orange-500" />;
      case 'in_progress':
        return <Play className="text-yellow-500" />;
      default:
        return <Clock className="text-gray-500" />;
    }
  };

  // Progress bar
  const ProgressBar = ({ percent, showLabel = true }: { percent: number; showLabel?: boolean }) => (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: colors.border }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${percent}%`,
            background: percent === 100 ? '#43e97b' : colors.action,
          }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
          {percent}%
        </span>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.action }} />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const canStart = order.status === 'draft' || order.status === 'scheduled';
  const canComplete = order.status === 'in_progress';
  const canValidate = order.status === 'pending_review';
  const canCancel = !['validated', 'cancelled'].includes(order.status);

  return (
    <div className="p-6 space-y-6" style={{ background: colors.background }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/physical-inventory/orders')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft size={20} className={isRTL ? 'rotate-180' : ''} style={{ color: colors.textPrimary }} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              {getStatusIcon(order.status)}
              <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                {order.reference}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {order.name}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={() => setShowActionsMenu(!showActionsMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ background: colors.action, color: '#fff' }}
          >
            {t('common.actions', 'Actions')}
            <ChevronDown size={16} />
          </button>

          {showActionsMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-lg z-20 py-2"
              style={{ background: colors.card, border: `1px solid ${colors.border}` }}
            >
              {canStart && (
                <button
                  onClick={handleStartOrder}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  style={{ color: colors.textPrimary }}
                >
                  <Play size={16} />
                  {t('physical_inventory.start_counting', 'Start Counting')}
                </button>
              )}

              {canComplete && (
                <button
                  onClick={handleCompleteOrder}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  style={{ color: colors.textPrimary }}
                >
                  <CheckCircle2 size={16} />
                  {t('physical_inventory.complete_counting', 'Complete Counting')}
                </button>
              )}

              {canValidate && (
                <button
                  onClick={handleValidateOrder}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  style={{ color: colors.textPrimary }}
                >
                  <AlertTriangle size={16} />
                  {t('physical_inventory.review_validate', 'Review & Validate')}
                </button>
              )}

              <hr style={{ borderColor: colors.border }} className="my-2" />

              <button
                onClick={handleExportPDF}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{ color: colors.textPrimary }}
              >
                <Download size={16} />
                {t('physical_inventory.export_pdf', 'Export PDF')}
              </button>

              <button
                onClick={handleExportExcel}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{ color: colors.textPrimary }}
              >
                <FileText size={16} />
                {t('physical_inventory.export_excel', 'Export Excel')}
              </button>

              {canCancel && (
                <>
                  <hr style={{ borderColor: colors.border }} className="my-2" />
                  <button
                    onClick={handleCancelOrder}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600"
                  >
                    <XCircle size={16} />
                    {t('common.cancel', 'Cancel Order')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress */}
        <div
          className="p-4 rounded-xl"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="text-sm mb-2" style={{ color: colors.textSecondary }}>
            {t('physical_inventory.progress', 'Progress')}
          </div>
          <ProgressBar percent={order.progress_percent || 0} />
          <div className="text-xs mt-2" style={{ color: colors.textSecondary }}>
            {order.counted_lines || 0} / {order.total_lines || 0} {t('physical_inventory.lines_counted', 'lines counted')}
          </div>
        </div>

        {/* Discrepancies */}
        <div
          className="p-4 rounded-xl"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="text-sm mb-1" style={{ color: colors.textSecondary }}>
            {t('physical_inventory.discrepancies', 'Discrepancies')}
          </div>
          <div className="text-2xl font-bold" style={{ color: (order.discrepancy_count || 0) > 0 ? '#f5576c' : colors.textPrimary }}>
            {order.discrepancy_count || 0}
          </div>
          <div className="text-xs" style={{ color: colors.textSecondary }}>
            {t('physical_inventory.items_with_variance', 'items with variance')}
          </div>
        </div>

        {/* Scheduled Date */}
        <div
          className="p-4 rounded-xl"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="text-sm mb-1" style={{ color: colors.textSecondary }}>
            {t('physical_inventory.scheduled', 'Scheduled')}
          </div>
          <div className="text-sm font-medium" style={{ color: colors.textPrimary }}>
            {formatDate(order.scheduled_date)}
          </div>
        </div>

        {/* Responsible */}
        <div
          className="p-4 rounded-xl"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="text-sm mb-1" style={{ color: colors.textSecondary }}>
            {t('physical_inventory.responsible', 'Responsible')}
          </div>
          <div className="flex items-center gap-2">
            <User size={16} style={{ color: colors.textSecondary }} />
            <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
              {order.responsible_user_name || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: colors.card, border: `1px solid ${colors.border}` }}
      >
        {/* Tab Headers */}
        <div className="flex border-b" style={{ borderColor: colors.border }}>
          {(['lines', 'uploads', 'unknown', 'audit'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab ? 'border-b-2' : ''
              }`}
              style={{
                color: activeTab === tab ? colors.action : colors.textSecondary,
                borderColor: activeTab === tab ? colors.action : 'transparent',
              }}
            >
              {t(`physical_inventory.tabs.${tab}`, tab)}
              {tab === 'unknown' && unknownTags.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-600">
                  {unknownTags.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* Lines Tab */}
          {activeTab === 'lines' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-64 relative">
                  <Search
                    size={16}
                    className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`}
                    style={{ color: colors.textSecondary }}
                  />
                  <input
                    type="text"
                    value={linesSearch}
                    onChange={(e) => setLinesSearch(e.target.value)}
                    placeholder={t('physical_inventory.search_products', 'Search products...')}
                    className={`w-full py-2 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} rounded-lg text-sm`}
                    style={{
                      background: colors.background,
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'discrepancy', 'counted', 'uncounted'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        setLinesFilter(filter);
                        setLinesPage(1);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        linesFilter === filter ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                      style={{
                        border: `1px solid ${linesFilter === filter ? colors.action : colors.border}`,
                        color: linesFilter === filter ? colors.action : colors.textSecondary,
                      }}
                    >
                      {t(`physical_inventory.filter.${filter}`, filter)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lines Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                        {t('physical_inventory.product', 'Product')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                        {t('physical_inventory.location', 'Location')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                        {t('physical_inventory.expected', 'Expected')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                        {t('physical_inventory.counted', 'Counted')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                        {t('physical_inventory.difference', 'Diff')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                        {t('physical_inventory.status', 'Status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr
                        key={line.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                        style={{ borderBottom: `1px solid ${colors.border}` }}
                      >
                        <td className="px-3 py-3">
                          <div className="font-medium text-sm" style={{ color: colors.textPrimary }}>
                            {line.product_name}
                          </div>
                          <div className="text-xs" style={{ color: colors.textSecondary }}>
                            {line.product_code}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 text-sm" style={{ color: colors.textPrimary }}>
                            <MapPin size={12} />
                            {line.location_name}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-sm" style={{ color: colors.textPrimary }}>
                          {formatNumber(line.expected_qty)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm" style={{ color: colors.textPrimary }}>
                          {line.counted_qty !== null ? formatNumber(line.counted_qty) : '-'}
                        </td>
                        <td
                          className="px-3 py-3 text-right text-sm font-medium"
                          style={{
                            color:
                              line.difference === 0
                                ? colors.textPrimary
                                : line.difference > 0
                                ? '#43e97b'
                                : '#f5576c',
                          }}
                        >
                          {line.difference > 0 ? '+' : ''}
                          {formatNumber(line.difference)}
                        </td>
                        <td className="px-3 py-3">
                          {line.is_counted ? (
                            line.difference !== 0 ? (
                              <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                                {t('physical_inventory.discrepancy', 'Discrepancy')}
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                {t('physical_inventory.matched', 'Matched')}
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                              {t('physical_inventory.pending', 'Pending')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {lines.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center" style={{ color: colors.textSecondary }}>
                          {t('physical_inventory.no_lines', 'No items found')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {linesTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setLinesPage((p) => Math.max(1, p - 1))}
                    disabled={linesPage === 1}
                    className="px-3 py-1 rounded text-sm disabled:opacity-50"
                    style={{ border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                  >
                    {t('common.previous', 'Previous')}
                  </button>
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    {linesPage} / {linesTotalPages}
                  </span>
                  <button
                    onClick={() => setLinesPage((p) => Math.min(linesTotalPages, p + 1))}
                    disabled={linesPage === linesTotalPages}
                    className="px-3 py-1 rounded text-sm disabled:opacity-50"
                    style={{ border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                  >
                    {t('common.next', 'Next')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Uploads Tab */}
          {activeTab === 'uploads' && (
            <div className="space-y-3">
              {uploads.length === 0 ? (
                <div className="text-center py-8" style={{ color: colors.textSecondary }}>
                  {t('physical_inventory.no_uploads', 'No scan uploads yet')}
                </div>
              ) : (
                uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="p-4 rounded-lg"
                    style={{ background: colors.background, border: `1px solid ${colors.border}` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium" style={{ color: colors.textPrimary }}>
                        {upload.upload_reference || `Upload #${upload.id}`}
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          upload.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : upload.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {upload.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div style={{ color: colors.textSecondary }}>{t('physical_inventory.total_scans', 'Total Scans')}</div>
                        <div style={{ color: colors.textPrimary }}>{upload.total_scans}</div>
                      </div>
                      <div>
                        <div style={{ color: colors.textSecondary }}>{t('physical_inventory.matched', 'Matched')}</div>
                        <div style={{ color: colors.textPrimary }}>{upload.matched_scans}</div>
                      </div>
                      <div>
                        <div style={{ color: colors.textSecondary }}>{t('physical_inventory.unknown', 'Unknown')}</div>
                        <div style={{ color: upload.unknown_scans > 0 ? '#f5576c' : colors.textPrimary }}>
                          {upload.unknown_scans}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: colors.textSecondary }}>{t('physical_inventory.uploaded_at', 'Uploaded')}</div>
                        <div style={{ color: colors.textPrimary }}>{formatDate(upload.uploaded_at)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Unknown Tags Tab */}
          {activeTab === 'unknown' && (
            <div className="space-y-3">
              {unknownTags.length === 0 ? (
                <div className="text-center py-8" style={{ color: colors.textSecondary }}>
                  {t('physical_inventory.no_unknown_tags', 'No unknown tags')}
                </div>
              ) : (
                unknownTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-4 rounded-lg"
                    style={{ background: colors.background, border: `1px solid ${colors.border}` }}
                  >
                    <div>
                      <div className="font-mono text-sm" style={{ color: colors.textPrimary }}>
                        {tag.rfid_tag_id}
                      </div>
                      <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                        {tag.scanned_location_name || t('physical_inventory.unknown_location', 'Unknown location')} •{' '}
                        {formatDate(tag.scanned_at)}
                      </div>
                    </div>
                    {tag.is_resolved ? (
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                        {t('physical_inventory.resolved', 'Resolved')}
                      </span>
                    ) : (
                      <button
                        className="px-3 py-1 rounded text-xs"
                        style={{ background: colors.action, color: '#fff' }}
                      >
                        {t('physical_inventory.resolve', 'Resolve')}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Audit Log Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8" style={{ color: colors.textSecondary }}>
                  {t('physical_inventory.no_audit_logs', 'No audit logs')}
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: colors.background }}
                  >
                    <History size={16} className="mt-0.5" style={{ color: colors.textSecondary }} />
                    <div className="flex-1">
                      <div className="text-sm" style={{ color: colors.textPrimary }}>
                        <span className="font-medium">{log.performed_by_name}</span>{' '}
                        {t(`physical_inventory.action.${log.action}`, log.action)}{' '}
                        {log.entity_type}
                      </div>
                      {log.reason && (
                        <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                          {log.reason}
                        </div>
                      )}
                      <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                        {formatDate(log.performed_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Click outside handler */}
      {showActionsMenu && <div className="fixed inset-0 z-10" onClick={() => setShowActionsMenu(false)} />}
    </div>
  );
}

export default OrderDetailPage;
