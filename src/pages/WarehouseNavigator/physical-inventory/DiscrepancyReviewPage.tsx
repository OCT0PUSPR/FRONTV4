// Physical Inventory - Discrepancy Review Page
// Review, approve/reject discrepancies and validate orders

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  MapPin,
  History,
  Check,
  X,
  ChevronDown,
  MessageSquare,
  Filter,
  Search,
} from 'lucide-react';
import { useTheme } from '../../../../context/theme';
import { PhysicalInventoryService } from '../../../services/physicalInventory.service';
import type {
  ScanOrder,
  ScanOrderLine,
  ReasonCode,
  StockMovement,
} from './types';

export function DiscrepancyReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const isRTL = i18n?.dir() === 'rtl';

  const orderId = Number(id);

  // State
  const [order, setOrder] = useState<ScanOrder | null>(null);
  const [lines, setLines] = useState<ScanOrderLine[]>([]);
  const [reasonCodes, setReasonCodes] = useState<ReasonCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'shortage' | 'surplus' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [selectedReasonCode, setSelectedReasonCode] = useState<number | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [movementHistory, setMovementHistory] = useState<StockMovement[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Validation modal
  const [validateModalOpen, setValidateModalOpen] = useState(false);
  const [validationNotes, setValidationNotes] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!orderId) return;
    try {
      setIsLoading(true);
      const [orderData, linesResponse, codesData] = await Promise.all([
        PhysicalInventoryService.getOrder(orderId),
        PhysicalInventoryService.getOrderLines(orderId, { discrepancy_only: true }, { page: 1, limit: 500, sort_by: 'difference', sort_order: 'asc' }),
        PhysicalInventoryService.getReasonCodes(),
      ]);

      if (orderData) {
        setOrder(orderData);
      } else {
        toast.error(t('physical_inventory.order_not_found', 'Order not found'));
        navigate('/physical-inventory/orders');
        return;
      }

      if (linesResponse.success) {
        setLines(linesResponse.data);
      }

      setReasonCodes(codesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t('physical_inventory.error_loading', 'Failed to load data'));
    } finally {
      setIsLoading(false);
    }
  }, [orderId, navigate, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter lines
  const filteredLines = lines.filter((line) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !line.product_name?.toLowerCase().includes(query) &&
        !line.product_code?.toLowerCase().includes(query) &&
        !line.location_name?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Type filter
    if (filterType === 'shortage' && line.difference >= 0) return false;
    if (filterType === 'surplus' && line.difference <= 0) return false;
    if (filterType === 'pending' && line.discrepancy_status !== 'pending') return false;

    return true;
  });

  // Statistics
  const stats = {
    total: lines.length,
    shortages: lines.filter((l) => l.difference < 0).length,
    surpluses: lines.filter((l) => l.difference > 0).length,
    pending: lines.filter((l) => l.discrepancy_status === 'pending' || l.discrepancy_status === 'none').length,
    approved: lines.filter((l) => l.discrepancy_status === 'approved').length,
    rejected: lines.filter((l) => l.discrepancy_status === 'rejected').length,
  };

  // Open approve modal
  const openApproveModal = (lineId: number) => {
    setSelectedLineId(lineId);
    setSelectedReasonCode(null);
    setApprovalNotes('');
    setApproveModalOpen(true);
  };

  // Open reject modal
  const openRejectModal = (lineId: number) => {
    setSelectedLineId(lineId);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  // Open history modal
  const openHistoryModal = async (line: ScanOrderLine) => {
    setSelectedLineId(line.id);
    setHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const history = await PhysicalInventoryService.getMovementHistory(
        line.product_id,
        line.location_id,
        20
      );
      setMovementHistory(history);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Handle approve
  const handleApprove = async () => {
    if (!selectedLineId || !selectedReasonCode) {
      toast.error(t('physical_inventory.select_reason', 'Please select a reason code'));
      return;
    }

    const result = await PhysicalInventoryService.approveDiscrepancy({
      line_id: selectedLineId,
      reason_code_id: selectedReasonCode,
      notes: approvalNotes,
    });

    if (result.success) {
      toast.success(t('physical_inventory.discrepancy_approved', 'Discrepancy approved'));
      setApproveModalOpen(false);
      fetchData();
    } else {
      toast.error(result.error || t('physical_inventory.error_approving', 'Failed to approve'));
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!selectedLineId || !rejectionReason.trim()) {
      toast.error(t('physical_inventory.enter_reason', 'Please enter a reason'));
      return;
    }

    const result = await PhysicalInventoryService.rejectDiscrepancy({
      line_id: selectedLineId,
      rejection_reason: rejectionReason,
    });

    if (result.success) {
      toast.success(t('physical_inventory.discrepancy_rejected', 'Discrepancy rejected'));
      setRejectModalOpen(false);
      fetchData();
    } else {
      toast.error(result.error || t('physical_inventory.error_rejecting', 'Failed to reject'));
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (selectedLines.size === 0) {
      toast.error(t('physical_inventory.select_lines', 'Please select lines'));
      return;
    }
    if (!selectedReasonCode) {
      toast.error(t('physical_inventory.select_reason', 'Please select a reason code'));
      return;
    }

    const result = await PhysicalInventoryService.bulkDiscrepancyAction({
      line_ids: Array.from(selectedLines),
      action: 'approve',
      reason_code_id: selectedReasonCode,
      notes: approvalNotes,
    });

    if (result.success) {
      toast.success(t('physical_inventory.bulk_approved', '{{count}} discrepancies approved', { count: result.processed }));
      setSelectedLines(new Set());
      setApproveModalOpen(false);
      fetchData();
    } else {
      toast.error(result.errors?.[0] || t('physical_inventory.error_bulk_approve', 'Failed to approve'));
    }
  };

  // Handle validate order
  const handleValidateOrder = async () => {
    setIsValidating(true);
    try {
      const result = await PhysicalInventoryService.validateOrder({
        order_id: orderId,
        notes: validationNotes,
      });

      if (result.success) {
        toast.success(t('physical_inventory.order_validated', 'Order validated and adjustments applied'));
        setValidateModalOpen(false);
        navigate(`/physical-inventory/orders/${orderId}`);
      } else {
        toast.error(result.error || t('physical_inventory.error_validating', 'Failed to validate order'));
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Handle reject order
  const handleRejectOrder = async () => {
    const reason = prompt(t('physical_inventory.enter_rejection_reason', 'Enter rejection reason:'));
    if (!reason) return;

    const result = await PhysicalInventoryService.rejectOrder({
      order_id: orderId,
      reason,
    });

    if (result.success) {
      toast.success(t('physical_inventory.order_rejected', 'Order rejected'));
      navigate(`/physical-inventory/orders/${orderId}`);
    } else {
      toast.error(result.error || t('physical_inventory.error_rejecting_order', 'Failed to reject order'));
    }
  };

  // Format number
  const formatNumber = (num: number | null | undefined, decimals: number = 0) => {
    if (num === null || num === undefined) return '-';
    return new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get reason codes by category
  const getReasonCodesForLine = (line: ScanOrderLine) => {
    const category = line.difference < 0 ? 'shortage' : line.difference > 0 ? 'surplus' : 'other';
    return reasonCodes.filter((rc) => rc.category === category || rc.category === 'other');
  };

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

  const canValidate = stats.pending === 0;

  return (
    <div className="p-6 space-y-6" style={{ background: colors.background }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/physical-inventory/orders/${orderId}`)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft size={20} className={isRTL ? 'rotate-180' : ''} style={{ color: colors.textPrimary }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
              {t('physical_inventory.discrepancy_review', 'Discrepancy Review')}
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {order.reference} - {order.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRejectOrder}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border text-red-600 hover:bg-red-50"
            style={{ borderColor: colors.border }}
          >
            <XCircle size={18} />
            {t('physical_inventory.reject_order', 'Reject Order')}
          </button>
          <button
            onClick={() => setValidateModalOpen(true)}
            disabled={!canValidate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white disabled:opacity-50"
            style={{ background: canValidate ? '#43e97b' : colors.textSecondary }}
          >
            <CheckCircle2 size={18} />
            {t('physical_inventory.validate_order', 'Validate Order')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
          <div className="text-2xl font-bold" style={{ color: colors.textPrimary }}>{stats.total}</div>
          <div className="text-xs" style={{ color: colors.textSecondary }}>{t('physical_inventory.total_discrepancies', 'Total')}</div>
        </div>
        <div className="p-4 rounded-xl" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
          <div className="text-2xl font-bold text-red-500">{stats.shortages}</div>
          <div className="text-xs" style={{ color: colors.textSecondary }}>{t('physical_inventory.shortages', 'Shortages')}</div>
        </div>
        <div className="p-4 rounded-xl" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
          <div className="text-2xl font-bold text-green-500">{stats.surpluses}</div>
          <div className="text-xs" style={{ color: colors.textSecondary }}>{t('physical_inventory.surpluses', 'Surpluses')}</div>
        </div>
        <div className="p-4 rounded-xl" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
          <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
          <div className="text-xs" style={{ color: colors.textSecondary }}>{t('physical_inventory.pending_review', 'Pending')}</div>
        </div>
        <div className="p-4 rounded-xl" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
          <div className="text-2xl font-bold text-blue-500">{stats.approved}</div>
          <div className="text-xs" style={{ color: colors.textSecondary }}>{t('physical_inventory.approved', 'Approved')}</div>
        </div>
        <div className="p-4 rounded-xl" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
          <div className="text-2xl font-bold text-gray-500">{stats.rejected}</div>
          <div className="text-xs" style={{ color: colors.textSecondary }}>{t('physical_inventory.rejected', 'Rejected')}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-64 relative">
          <Search
            size={16}
            className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`}
            style={{ color: colors.textSecondary }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('physical_inventory.search', 'Search...')}
            className={`w-full py-2 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} rounded-lg text-sm`}
            style={{ background: colors.card, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'shortage', 'surplus', 'pending'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterType(filter)}
              className={`px-3 py-2 rounded-lg text-sm ${filterType === filter ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
              style={{
                border: `1px solid ${filterType === filter ? colors.action : colors.border}`,
                color: filterType === filter ? colors.action : colors.textSecondary,
              }}
            >
              {t(`physical_inventory.filter.${filter}`, filter)}
            </button>
          ))}
        </div>

        {selectedLines.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              {selectedLines.size} {t('physical_inventory.selected', 'selected')}
            </span>
            <button
              onClick={() => {
                setSelectedLineId(null);
                setApproveModalOpen(true);
              }}
              className="px-3 py-1.5 rounded text-sm bg-green-500 text-white"
            >
              {t('physical_inventory.bulk_approve', 'Bulk Approve')}
            </button>
          </div>
        )}
      </div>

      {/* Discrepancy List */}
      <div className="rounded-xl overflow-hidden" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={selectedLines.size === filteredLines.length && filteredLines.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLines(new Set(filteredLines.map((l) => l.id)));
                    } else {
                      setSelectedLines(new Set());
                    }
                  }}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                {t('physical_inventory.product', 'Product')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                {t('physical_inventory.location', 'Location')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                {t('physical_inventory.expected', 'Expected')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                {t('physical_inventory.counted', 'Counted')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                {t('physical_inventory.difference', 'Diff')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                {t('physical_inventory.status', 'Status')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                {t('physical_inventory.actions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLines.map((line) => (
              <tr key={line.id} className="hover:bg-gray-50 dark:hover:bg-gray-800" style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedLines.has(line.id)}
                    onChange={(e) => {
                      setSelectedLines((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) {
                          next.add(line.id);
                        } else {
                          next.delete(line.id);
                        }
                        return next;
                      });
                    }}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-sm" style={{ color: colors.textPrimary }}>{line.product_name}</div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>{line.product_code}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-sm" style={{ color: colors.textPrimary }}>
                    <MapPin size={12} />
                    {line.location_name}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm" style={{ color: colors.textPrimary }}>
                  {formatNumber(line.expected_qty)}
                </td>
                <td className="px-4 py-3 text-right text-sm" style={{ color: colors.textPrimary }}>
                  {formatNumber(line.counted_qty)}
                </td>
                <td
                  className="px-4 py-3 text-right text-sm font-bold"
                  style={{ color: line.difference < 0 ? '#f5576c' : '#43e97b' }}
                >
                  {line.difference > 0 ? '+' : ''}{formatNumber(line.difference)}
                </td>
                <td className="px-4 py-3">
                  {line.discrepancy_status === 'approved' ? (
                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">{t('physical_inventory.approved', 'Approved')}</span>
                  ) : line.discrepancy_status === 'rejected' ? (
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">{t('physical_inventory.rejected', 'Rejected')}</span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-700">{t('physical_inventory.pending', 'Pending')}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openHistoryModal(line)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      title={t('physical_inventory.view_history', 'View History')}
                    >
                      <History size={16} style={{ color: colors.textSecondary }} />
                    </button>
                    {line.discrepancy_status !== 'approved' && line.discrepancy_status !== 'rejected' && (
                      <>
                        <button
                          onClick={() => openApproveModal(line.id)}
                          className="p-1.5 rounded hover:bg-green-100 text-green-600"
                          title={t('physical_inventory.approve', 'Approve')}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => openRejectModal(line.id)}
                          className="p-1.5 rounded hover:bg-red-100 text-red-600"
                          title={t('physical_inventory.reject', 'Reject')}
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredLines.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center" style={{ color: colors.textSecondary }}>
                  {t('physical_inventory.no_discrepancies', 'No discrepancies found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Approve Modal */}
      {approveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-xl p-6" style={{ background: colors.card }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
              {selectedLineId ? t('physical_inventory.approve_discrepancy', 'Approve Discrepancy') : t('physical_inventory.bulk_approve', 'Bulk Approve')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                  {t('physical_inventory.reason_code', 'Reason Code')} *
                </label>
                <select
                  value={selectedReasonCode || ''}
                  onChange={(e) => setSelectedReasonCode(Number(e.target.value) || null)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ background: colors.background, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                >
                  <option value="">{t('physical_inventory.select_reason', 'Select a reason')}</option>
                  {reasonCodes.map((rc) => (
                    <option key={rc.id} value={rc.id}>{rc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                  {t('physical_inventory.notes', 'Notes')}
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg resize-none"
                  style={{ background: colors.background, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                  placeholder={t('physical_inventory.notes_placeholder', 'Optional notes...')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setApproveModalOpen(false)}
                className="px-4 py-2 rounded-lg"
                style={{ border: `1px solid ${colors.border}`, color: colors.textPrimary }}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={selectedLineId ? handleApprove : handleBulkApprove}
                disabled={!selectedReasonCode}
                className="px-4 py-2 rounded-lg bg-green-500 text-white disabled:opacity-50"
              >
                {t('physical_inventory.approve', 'Approve')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-xl p-6" style={{ background: colors.card }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
              {t('physical_inventory.reject_discrepancy', 'Reject Discrepancy')}
            </h3>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                {t('physical_inventory.rejection_reason', 'Rejection Reason')} *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-lg resize-none"
                style={{ background: colors.background, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                placeholder={t('physical_inventory.rejection_reason_placeholder', 'Enter reason for rejection...')}
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-lg"
                style={{ border: `1px solid ${colors.border}`, color: colors.textPrimary }}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 rounded-lg bg-red-500 text-white disabled:opacity-50"
              >
                {t('physical_inventory.reject', 'Reject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl rounded-xl p-6 max-h-[80vh] overflow-y-auto" style={{ background: colors.card }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                {t('physical_inventory.movement_history', 'Movement History')}
              </h3>
              <button onClick={() => setHistoryModalOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X size={20} style={{ color: colors.textSecondary }} />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: colors.action }} />
              </div>
            ) : movementHistory.length === 0 ? (
              <div className="text-center py-8" style={{ color: colors.textSecondary }}>
                {t('physical_inventory.no_history', 'No movement history found')}
              </div>
            ) : (
              <div className="space-y-3">
                {movementHistory.map((movement) => (
                  <div
                    key={movement.id}
                    className="p-3 rounded-lg"
                    style={{ background: colors.background, border: `1px solid ${colors.border}` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm" style={{ color: colors.textPrimary }}>{movement.reference}</span>
                      <span className="text-xs" style={{ color: colors.textSecondary }}>{formatDate(movement.date)}</span>
                    </div>
                    <div className="text-sm" style={{ color: colors.textSecondary }}>
                      {movement.location_from_name} → {movement.location_to_name}
                    </div>
                    <div className="text-sm font-medium mt-1" style={{ color: colors.textPrimary }}>
                      {formatNumber(movement.quantity)} units
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validate Modal */}
      {validateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-xl p-6" style={{ background: colors.card }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                  {t('physical_inventory.validate_order', 'Validate Order')}
                </h3>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  {t('physical_inventory.validate_confirm', 'This will apply all approved adjustments to Odoo.')}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg mb-4" style={{ background: colors.background, border: `1px solid ${colors.border}` }}>
              <div className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                {t('physical_inventory.adjustments_summary', 'Adjustments Summary')}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-2xl font-bold text-red-500">-{stats.shortages}</div>
                  <div style={{ color: colors.textSecondary }}>{t('physical_inventory.shortage_adjustments', 'Shortage adjustments')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">+{stats.surpluses}</div>
                  <div style={{ color: colors.textSecondary }}>{t('physical_inventory.surplus_adjustments', 'Surplus adjustments')}</div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                {t('physical_inventory.validation_notes', 'Validation Notes')}
              </label>
              <textarea
                value={validationNotes}
                onChange={(e) => setValidationNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-lg resize-none"
                style={{ background: colors.background, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                placeholder={t('physical_inventory.validation_notes_placeholder', 'Optional notes for audit trail...')}
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setValidateModalOpen(false)}
                className="px-4 py-2 rounded-lg"
                style={{ border: `1px solid ${colors.border}`, color: colors.textPrimary }}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleValidateOrder}
                disabled={isValidating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white disabled:opacity-50"
              >
                {isValidating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
                {t('physical_inventory.confirm_validate', 'Confirm & Validate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiscrepancyReviewPage;
