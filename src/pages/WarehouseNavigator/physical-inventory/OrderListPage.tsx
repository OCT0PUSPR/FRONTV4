// Physical Inventory Order List Page
// Premium production-grade UI with refined aesthetics

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Play,
  Eye,
  Trash2,
  XCircle,
  Calendar,
  User,
  Grid,
  List,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Archive,
  TrendingUp,
  RefreshCw,
  Download,
  SlidersHorizontal,
} from 'lucide-react';
import { useTheme } from '../../../../context/theme';
import { PhysicalInventoryService } from '../../../services/physicalInventory.service';
import { StatCard } from '../../../components/StatCard';
import type {
  ScanOrder,
  ScanOrderStatus,
  ScanOrderFilters,
} from './types';
import { SCAN_ORDER_STATUSES } from './types';

type ViewMode = 'table' | 'card';

// Gradient colors for stat cards - deeper, more saturated colors
const STAT_GRADIENTS = {
  total: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
  inProgress: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  pending: 'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)',
  completed: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
};

// Default status config for unknown statuses
const DEFAULT_STATUS_CONFIG = {
  bg: 'bg-gray-100 dark:bg-gray-800',
  text: 'text-gray-500 dark:text-gray-400',
  border: 'border-gray-200 dark:border-gray-700',
  gradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
  icon: Clock,
};

// Status configuration with colors and icons
const STATUS_CONFIG: Record<ScanOrderStatus, {
  bg: string;
  text: string;
  border: string;
  gradient: string;
  icon: typeof Clock;
}> = {
  draft: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    icon: Archive,
  },
  scheduled: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    icon: Calendar,
  },
  in_progress: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    icon: Clock,
  },
  pending_review: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
    icon: AlertTriangle,
  },
  validated: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    icon: CheckCircle2,
  },
  rejected: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
    icon: XCircle,
  },
  cancelled: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
    gradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
    icon: XCircle,
  },
};

// Helper function to get status config with fallback
const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status as ScanOrderStatus] || DEFAULT_STATUS_CONFIG;
};

export function OrderListPage() {
  const { t, i18n } = useTranslation();
  const { colors, mode } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isRTL = i18n?.dir() === 'rtl';

  // State
  const [orders, setOrders] = useState<ScanOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });

  // Filters
  const [filters, setFilters] = useState<ScanOrderFilters>({
    status: searchParams.get('status')?.split(',') as ScanOrderStatus[] || [],
    search: searchParams.get('search') || '',
    date_from: searchParams.get('date_from') || '',
    date_to: searchParams.get('date_to') || '',
  });

  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Stats calculations
  const stats = useMemo(() => {
    const total = orders.length;
    const inProgress = orders.filter(o => o.status === 'in_progress').length;
    const pendingReview = orders.filter(o => o.status === 'pending_review').length;
    const completed = orders.filter(o => o.status === 'validated').length;
    return { total, inProgress, pendingReview, completed };
  }, [orders]);

  // Fetch orders
  const fetchOrders = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const response = await PhysicalInventoryService.listOrders(
        filters,
        {
          page: pagination.page,
          limit: pagination.limit,
          sort_by: 'created_at',
          sort_order: 'desc',
        }
      );

      if (response.success) {
        setOrders(response.data);
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total,
          total_pages: response.pagination.total_pages,
        }));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error(t('physical_inventory.error_loading_orders', 'Failed to load orders'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters, pagination.page, pagination.limit, t]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status?.length) params.set('status', filters.status.join(','));
    if (filters.search) params.set('search', filters.search);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Search handler with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Toggle status filter
  const toggleStatusFilter = (status: ScanOrderStatus) => {
    setFilters(prev => {
      const currentStatuses = prev.status || [];
      const newStatuses = currentStatuses.includes(status)
        ? currentStatuses.filter(s => s !== status)
        : [...currentStatuses, status];
      return { ...prev, status: newStatuses };
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ status: [], search: '', date_from: '', date_to: '' });
    setSearchInput('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle order actions
  const handleViewOrder = (id: number) => {
    navigate(`/physical-inventory/orders/${id}`);
  };

  const handleStartOrder = async (id: number) => {
    const result = await PhysicalInventoryService.startOrder(id);
    if (result.success) {
      toast.success(t('physical_inventory.order_started', 'Count order started'));
      fetchOrders(true);
    } else {
      toast.error(result.error || t('physical_inventory.error_starting_order', 'Failed to start order'));
    }
    setMenuOpenId(null);
  };

  const handleCancelOrder = async (id: number) => {
    if (!confirm(t('physical_inventory.confirm_cancel', 'Are you sure you want to cancel this order?'))) {
      return;
    }
    const result = await PhysicalInventoryService.cancelOrder(id);
    if (result.success) {
      toast.success(t('physical_inventory.order_cancelled', 'Count order cancelled'));
      fetchOrders(true);
    } else {
      toast.error(result.error || t('physical_inventory.error_cancelling_order', 'Failed to cancel order'));
    }
    setMenuOpenId(null);
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm(t('physical_inventory.confirm_delete', 'Are you sure you want to delete this order? This cannot be undone.'))) {
      return;
    }
    const result = await PhysicalInventoryService.deleteOrder(id);
    if (result.success) {
      toast.success(t('physical_inventory.order_deleted', 'Count order deleted'));
      fetchOrders(true);
    } else {
      toast.error(result.error || t('physical_inventory.error_deleting_order', 'Failed to delete order'));
    }
    setMenuOpenId(null);
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

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const config = getStatusConfig(status);
    const Icon = config.icon;
    const label = t(`physical_inventory.status.${status}`, status.replace('_', ' '));

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}
        style={{
          textTransform: 'capitalize',
          letterSpacing: '0.025em',
        }}
      >
        <Icon size={12} />
        {label}
      </span>
    );
  };

  // Progress bar with animated gradient
  const ProgressBar = ({ percent }: { percent: number }) => (
    <div className="relative w-28 h-2.5 rounded-full overflow-hidden" style={{ background: `${colors.border}` }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${percent}%`,
          background: percent === 100
            ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
            : percent > 50
              ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
              : 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.3)',
        }}
      />
      {/* Shimmer effect */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
          animation: 'shimmer 2s infinite',
        }}
      />
    </div>
  );

  // Render table row with hover effects
  const renderTableRow = (order: ScanOrder, index: number) => (
    <tr
      key={order.id}
      onClick={() => handleViewOrder(order.id)}
      className="group cursor-pointer transition-all duration-200"
      style={{
        borderBottom: `1px solid ${colors.border}`,
        animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
      }}
    >
      <td className="px-5 py-4">
        <input
          type="checkbox"
          checked={selectedOrders.has(order.id)}
          onChange={(e) => {
            e.stopPropagation();
            setSelectedOrders(prev => {
              const next = new Set(prev);
              if (next.has(order.id)) {
                next.delete(order.id);
              } else {
                next.add(order.id);
              }
              return next;
            });
          }}
          className="w-4 h-4 rounded border-2 transition-colors"
          style={{
            borderColor: colors.border,
            accentColor: colors.action,
          }}
        />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105"
            style={{
              background: mode === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
            }}
          >
            <ClipboardList
              size={20}
              strokeWidth={1.75}
              style={{
                color: '#3b82f6',
              }}
            />
          </div>
          <div>
            <div
              className="font-semibold text-sm tracking-tight"
              style={{ color: colors.textPrimary }}
            >
              {order.reference}
            </div>
            <div
              className="text-xs opacity-70"
              style={{ color: colors.textSecondary }}
            >
              ID: {order.id}
            </div>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <div
          className="font-medium text-sm max-w-xs truncate"
          style={{ color: colors.textPrimary }}
        >
          {order.name}
        </div>
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={order.status} />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <ProgressBar percent={order.progress_percent || 0} />
          <span
            className="text-xs font-bold tabular-nums"
            style={{
              color: (order.progress_percent || 0) === 100 ? '#10b981' : colors.textSecondary,
            }}
          >
            {order.progress_percent || 0}%
          </span>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: colors.textSecondary }} />
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            {formatDate(order.scheduled_date)}
          </span>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: colors.action + '20',
              color: colors.action,
            }}
          >
            {order.responsible_user_name?.[0] || '?'}
          </div>
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            {order.responsible_user_name || '-'}
          </span>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpenId(menuOpenId === order.id ? null : order.id);
            }}
            className="p-2 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MoreVertical size={16} style={{ color: colors.textSecondary }} />
          </button>

          {menuOpenId === order.id && (
            <div
              className="absolute z-20 mt-1 w-52 rounded-xl shadow-2xl py-2 animate-fade-in"
              style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                [isRTL ? 'left' : 'right']: 0,
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewOrder(order.id);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                style={{ color: colors.textPrimary }}
              >
                <Eye size={16} style={{ color: colors.action }} />
                {t('common.view', 'View Details')}
              </button>

              {(order.status === 'draft' || order.status === 'scheduled') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartOrder(order.id);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  style={{ color: colors.textPrimary }}
                >
                  <Play size={16} className="text-emerald-500" />
                  {t('physical_inventory.start_counting', 'Start Counting')}
                </button>
              )}

              {order.status !== 'validated' && order.status !== 'cancelled' && (
                <>
                  <div className="my-1 border-t" style={{ borderColor: colors.border }} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelOrder(order.id);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-orange-600"
                  >
                    <XCircle size={16} />
                    {t('common.cancel', 'Cancel Order')}
                  </button>
                </>
              )}

              {order.status === 'draft' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOrder(order.id);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600"
                >
                  <Trash2 size={16} />
                  {t('common.delete', 'Delete Order')}
                </button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );

  // Render premium card view
  const renderCard = (order: ScanOrder, index: number) => {
    const statusConfig = getStatusConfig(order.status);
    const StatusIcon = statusConfig.icon;
    const isDark = mode === 'dark';

    // Get status-specific accent color for the icon
    const getStatusAccentColor = (status: string) => {
      const colors: Record<string, string> = {
        draft: '#64748b',
        scheduled: '#3b82f6',
        in_progress: '#f59e0b',
        pending_review: '#f97316',
        validated: '#10b981',
        rejected: '#ef4444',
        cancelled: '#6b7280',
      };
      return colors[status] || '#3b82f6';
    };

    const accentColor = getStatusAccentColor(order.status);

    return (
      <div
        key={order.id}
        onClick={() => handleViewOrder(order.id)}
        className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1"
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          animation: `fadeInUp 0.4s ease-out ${index * 0.08}s both`,
          boxShadow: isDark
            ? '0 4px 20px rgba(0,0,0,0.3)'
            : '0 4px 20px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = isDark
            ? '0 12px 40px rgba(0,0,0,0.5)'
            : '0 12px 40px rgba(0,0,0,0.12)';
          e.currentTarget.style.borderColor = accentColor + '40';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = isDark
            ? '0 4px 20px rgba(0,0,0,0.3)'
            : '0 4px 20px rgba(0,0,0,0.06)';
          e.currentTarget.style.borderColor = colors.border;
        }}
      >
        {/* Subtle accent line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: accentColor }}
        />

        {/* Content */}
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105"
                style={{
                  background: isDark ? `${accentColor}15` : `${accentColor}10`,
                }}
              >
                <ClipboardList
                  size={22}
                  strokeWidth={1.75}
                  style={{ color: accentColor }}
                />
              </div>
              <div>
                <div
                  className="font-semibold text-[15px] tracking-tight"
                  style={{ color: colors.textPrimary }}
                >
                  {order.reference}
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: colors.textSecondary }}
                >
                  {order.name}
                </div>
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>

          {/* Meta info */}
          <div className="space-y-2.5 mb-4">
            <div className="flex items-center gap-2.5 text-sm" style={{ color: colors.textSecondary }}>
              <Calendar size={15} strokeWidth={1.75} style={{ color: accentColor, opacity: 0.7 }} />
              <span>{formatDate(order.scheduled_date) || t('physical_inventory.not_scheduled', 'Not scheduled')}</span>
            </div>
            {order.responsible_user_name && (
              <div className="flex items-center gap-2.5 text-sm" style={{ color: colors.textSecondary }}>
                <User size={15} strokeWidth={1.75} style={{ color: accentColor, opacity: 0.7 }} />
                <span>{order.responsible_user_name}</span>
              </div>
            )}
          </div>

          {/* Progress section */}
          {order.progress_percent !== undefined && (
            <div
              className="pt-4 mt-2 border-t"
              style={{ borderColor: isDark ? colors.border : `${colors.border}80` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                  {t('physical_inventory.progress', 'Progress')}
                </span>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{
                    color: order.progress_percent === 100 ? '#10b981' : accentColor,
                  }}
                >
                  {order.progress_percent}%
                </span>
              </div>
              <div
                className="relative w-full h-2 rounded-full overflow-hidden"
                style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${order.progress_percent}%`,
                    background: order.progress_percent === 100
                      ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                      : `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}99 100%)`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add keyframe animations
  const styleTag = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .animate-fade-in {
      animation: fadeInUp 0.3s ease-out;
    }
  `;

  return (
    <>
      <style>{styleTag}</style>
      <div
        className="min-h-screen p-6 lg:p-8"
        style={{ background: colors.background }}
      >
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1
                className="text-3xl font-bold tracking-tight mb-1"
                style={{
                  color: colors.textPrimary,
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                }}
              >
                {t('physical_inventory.orders.title', 'Count Orders')}
              </h1>
              <p
                className="text-base"
                style={{ color: colors.textSecondary }}
              >
                {t('physical_inventory.orders.subtitle', 'Manage and track your inventory count orders')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchOrders(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 hover:scale-105"
                style={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                }}
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                {t('common.refresh', 'Refresh')}
              </button>
              <button
                onClick={() => navigate('/physical-inventory/orders/create')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                }}
              >
                <Plus size={18} />
                {t('physical_inventory.create_order', 'Create Order')}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          style={{ marginBottom: '2rem' }}
        >
          <StatCard
            label={t('physical_inventory.stats.total_orders', 'Total Orders')}
            value={stats.total}
            icon={ClipboardList}
            gradient={STAT_GRADIENTS.total}
            delay={0}
          />
          <StatCard
            label={t('physical_inventory.stats.in_progress', 'In Progress')}
            value={stats.inProgress}
            icon={Clock}
            gradient={STAT_GRADIENTS.inProgress}
            delay={1}
          />
          <StatCard
            label={t('physical_inventory.stats.pending_review', 'Pending Review')}
            value={stats.pendingReview}
            icon={AlertTriangle}
            gradient={STAT_GRADIENTS.pending}
            delay={2}
          />
          <StatCard
            label={t('physical_inventory.stats.completed', 'Completed')}
            value={stats.completed}
            icon={CheckCircle2}
            gradient={STAT_GRADIENTS.completed}
            delay={3}
          />
        </div>

        {/* Search and Filters Bar */}
        <div
          className="flex flex-col lg:flex-row gap-4 mb-6 p-4 rounded-2xl"
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
        >
          {/* Search */}
          <div className="flex-1 relative">
            <Search
              size={20}
              className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-4' : 'left-4'}`}
              style={{ color: colors.textSecondary }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('physical_inventory.search_orders', 'Search by reference, name...')}
              className={`w-full py-3 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} rounded-xl text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-0`}
              style={{
                background: colors.background,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
                outline: 'none',
              }}
            />
          </div>

          {/* View Mode Toggle */}
          <div
            className="flex items-center rounded-xl p-1"
            style={{
              background: colors.background,
              border: `1px solid ${colors.border}`,
            }}
          >
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-lg transition-all duration-200 ${viewMode === 'table' ? 'shadow-md' : ''}`}
              style={{
                background: viewMode === 'table' ? colors.card : 'transparent',
              }}
            >
              <List size={18} style={{ color: viewMode === 'table' ? colors.action : colors.textSecondary }} />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-2.5 rounded-lg transition-all duration-200 ${viewMode === 'card' ? 'shadow-md' : ''}`}
              style={{
                background: viewMode === 'card' ? colors.card : 'transparent',
              }}
            >
              <Grid size={18} style={{ color: viewMode === 'card' ? colors.action : colors.textSecondary }} />
            </button>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-200 ${
              showFilters ? 'ring-2' : ''
            }`}
            style={{
              background: showFilters ? `${colors.action}15` : colors.background,
              border: `1px solid ${showFilters ? colors.action : colors.border}`,
              color: showFilters ? colors.action : colors.textPrimary,
            }}
          >
            <SlidersHorizontal size={18} />
            {t('common.filters', 'Filters')}
            {(filters.status?.length || 0) > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                style={{ background: colors.action }}
              >
                {filters.status?.length || 0}
              </span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div
            className="mb-6 p-6 rounded-2xl animate-fade-in"
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="font-semibold text-lg"
                style={{ color: colors.textPrimary }}
              >
                {t('physical_inventory.filter_by_status', 'Filter by Status')}
              </h3>
              {((filters.status?.length || 0) > 0 || filters.date_from || filters.date_to) && (
                <button
                  onClick={clearFilters}
                  className="text-sm font-medium hover:underline flex items-center gap-1"
                  style={{ color: colors.action }}
                >
                  <XCircle size={14} />
                  {t('common.clear_all', 'Clear All')}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {SCAN_ORDER_STATUSES.map((status) => {
                const isActive = filters.status?.includes(status);
                const config = getStatusConfig(status);
                const Icon = config.icon;

                return (
                  <button
                    key={status}
                    onClick={() => toggleStatusFilter(status)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive ? 'ring-2 ring-offset-2' : 'hover:scale-105'
                    }`}
                    style={{
                      background: isActive ? config.gradient : colors.background,
                      border: `1px solid ${isActive ? 'transparent' : colors.border}`,
                      color: isActive ? '#FFFFFF' : colors.textSecondary,
                    }}
                  >
                    <Icon size={14} />
                    {t(`physical_inventory.status.${status}`, status.replace('_', ' '))}
                  </button>
                );
              })}
            </div>

            {/* Date filters */}
            <div className="flex flex-wrap gap-4 pt-4 border-t" style={{ borderColor: colors.border }}>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: colors.textSecondary }}
                >
                  {t('common.from_date', 'From Date')}
                </label>
                <input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                  className="px-4 py-2.5 rounded-xl text-sm"
                  style={{
                    background: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: colors.textSecondary }}
                >
                  {t('common.to_date', 'To Date')}
                </label>
                <input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                  className="px-4 py-2.5 rounded-xl text-sm"
                  style={{
                    background: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mb-4"
              style={{ borderColor: `${colors.border}`, borderTopColor: colors.action }}
            />
            <p style={{ color: colors.textSecondary }}>
              {t('common.loading', 'Loading...')}
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{
              background: `linear-gradient(180deg, ${colors.card} 0%, ${colors.background} 100%)`,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
              }}
            >
              <ClipboardList size={36} className="text-white" />
            </div>
            <h3
              className="text-xl font-bold mb-2"
              style={{ color: colors.textPrimary }}
            >
              {t('physical_inventory.no_orders_found', 'No orders found')}
            </h3>
            <p
              className="text-sm mb-6 text-center max-w-md"
              style={{ color: colors.textSecondary }}
            >
              {filters.status?.length || filters.search
                ? t('physical_inventory.try_different_filters', 'Try adjusting your filters or search query')
                : t('physical_inventory.create_first_order_desc', 'Get started by creating your first inventory count order')}
            </p>
            <button
              onClick={() => navigate('/physical-inventory/orders/create')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
              }}
            >
              <Plus size={18} />
              {t('physical_inventory.create_order', 'Create Order')}
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div
            className="overflow-hidden rounded-2xl"
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      borderBottom: `2px solid ${colors.border}`,
                      background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <th className="px-5 py-4 text-left w-12">
                      <input
                        type="checkbox"
                        checked={selectedOrders.size === orders.length && orders.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrders(new Set(orders.map(o => o.id)));
                          } else {
                            setSelectedOrders(new Set());
                          }
                        }}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: colors.action }}
                      />
                    </th>
                    {[
                      { label: t('physical_inventory.orders.reference', 'Reference'), width: 'auto' },
                      { label: t('physical_inventory.orders.name', 'Name'), width: 'auto' },
                      { label: t('physical_inventory.orders.status', 'Status'), width: 'auto' },
                      { label: t('physical_inventory.orders.progress', 'Progress'), width: 'auto' },
                      { label: t('physical_inventory.orders.scheduled_date', 'Scheduled'), width: 'auto' },
                      { label: t('physical_inventory.orders.assigned_to', 'Responsible'), width: 'auto' },
                    ].map((col, idx) => (
                      <th
                        key={idx}
                        className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider"
                        style={{ color: colors.textSecondary }}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="px-5 py-4 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => renderTableRow(order, index))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {orders.map((order, index) => renderCard(order, index))}
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 p-4 rounded-2xl"
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              className="text-sm font-medium"
              style={{ color: colors.textSecondary }}
            >
              {t('common.showing_of', 'Showing {{from}}-{{to}} of {{total}} orders', {
                from: (pagination.page - 1) * pagination.limit + 1,
                to: Math.min(pagination.page * pagination.limit, pagination.total),
                total: pagination.total,
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                style={{
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <ChevronLeft size={18} className={isRTL ? 'rotate-180' : ''} style={{ color: colors.textPrimary }} />
              </button>

              <div
                className="flex items-center gap-1 px-4 py-2 rounded-xl"
                style={{ background: colors.background }}
              >
                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                  let pageNum;
                  if (pagination.total_pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.total_pages - 2) {
                    pageNum = pagination.total_pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                      className="w-9 h-9 rounded-lg text-sm font-semibold transition-all duration-200"
                      style={{
                        background: pagination.page === pageNum ? colors.action : 'transparent',
                        color: pagination.page === pageNum ? '#FFFFFF' : colors.textSecondary,
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.total_pages}
                className="p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                style={{
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <ChevronRight size={18} className={isRTL ? 'rotate-180' : ''} style={{ color: colors.textPrimary }} />
              </button>
            </div>
          </div>
        )}

        {/* Click outside handler for menu */}
        {menuOpenId !== null && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpenId(null)}
          />
        )}
      </div>
    </>
  );
}

export default OrderListPage;
