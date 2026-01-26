// Physical Inventory Dashboard
// Displays key metrics, charts, inventory list from stock.quant, and quick actions

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowRight,
  TrendingUp,
  Package,
  MapPin,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Boxes,
  LayoutGrid,
  List,
  ImageOff,
} from 'lucide-react';
import { useTheme } from '../../../../context/theme';
import { useData } from '../../../../context/data';
import { PhysicalInventoryService } from '../../../services/physicalInventory.service';
import { StatCard } from '../../../components/StatCard';
import type {
  DashboardStats,
  ScanOrder,
} from './types';

// Gradient colors for stat cards (matching receipts.tsx style)
const STAT_GRADIENTS = {
  active: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
  pending: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  scheduled: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  adjustments: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
};

type InventoryViewMode = 'table' | 'card';
type GroupByMode = 'none' | 'location' | 'product';

export function PhysicalInventoryDashboard() {
  const { t, i18n } = useTranslation();
  const { colors, mode } = useTheme();
  const navigate = useNavigate();
  const isRTL = i18n?.dir() === 'rtl';

  // Get quants, products, locations from data context
  const { quants, products, locations, fetchData, loading } = useData();

  // State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<ScanOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Inventory list state
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryViewMode, setInventoryViewMode] = useState<InventoryViewMode>('card');
  const [groupBy, setGroupBy] = useState<GroupByMode>('location');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const itemsPerPage = 12;

  // Fetch data context if not loaded
  useEffect(() => {
    if (!quants?.length) fetchData('quants');
    if (!products?.length) fetchData('products');
    if (!locations?.length) fetchData('locations');
  }, []);

  // Build product and location maps
  const productMap = useMemo(() => {
    const map = new Map<number, any>();
    for (const p of products || []) {
      const id = typeof p.id === 'number' ? p.id : (Array.isArray(p.id) ? p.id[0] : p.id);
      if (id) map.set(id, p);
    }
    return map;
  }, [products]);

  const locationMap = useMemo(() => {
    const map = new Map<number, any>();
    for (const l of locations || []) {
      const id = typeof l.id === 'number' ? l.id : (Array.isArray(l.id) ? l.id[0] : l.id);
      if (id) map.set(id, l);
    }
    return map;
  }, [locations]);

  // Build location usage map for filtering
  const locationUsageMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const l of locations || []) {
      const id = typeof l.id === 'number' ? l.id : (Array.isArray(l.id) ? l.id[0] : l.id);
      if (id) map.set(id, l.usage || 'internal');
    }
    return map;
  }, [locations]);

  // Transform quants into inventory items (filtered to internal locations with positive quantity)
  const inventoryItems = useMemo(() => {
    return (quants || [])
      .filter((q: any) => {
        const locId = Array.isArray(q.location_id) ? q.location_id[0] : q.location_id;
        const usage = locationUsageMap.get(locId);
        const available = Number(q.available_quantity ?? q.quantity ?? 0);
        return (locationUsageMap.size === 0 || usage === 'internal') && available > 0;
      })
      .map((q: any) => {
        const productId = Array.isArray(q.product_id) ? q.product_id[0] : q.product_id;
        const locationId = Array.isArray(q.location_id) ? q.location_id[0] : q.location_id;
        const product = productMap.get(productId);
        const location = locationMap.get(locationId);

        return {
          id: q.id,
          product_id: productId,
          product_name: Array.isArray(q.product_id) ? q.product_id[1] : (product?.name || product?.display_name || `Product #${productId}`),
          product_code: product?.default_code || '',
          product_image: product?.image_1920 || product?.image_1024 || product?.image_512 || product?.image_256 || null,
          location_id: locationId,
          location_name: Array.isArray(q.location_id) ? q.location_id[1] : (location?.complete_name || location?.display_name || location?.name || `Location #${locationId}`),
          quantity: q.quantity || 0,
          available_quantity: q.available_quantity ?? q.quantity ?? 0,
          reserved_quantity: q.reserved_quantity || 0,
          uom: Array.isArray(q.product_uom_id) ? q.product_uom_id[1] : 'Units',
          lot_name: Array.isArray(q.lot_id) ? q.lot_id[1] : null,
        };
      });
  }, [quants, productMap, locationMap, locationUsageMap]);

  // Filter inventory items
  const filteredInventory = useMemo(() => {
    if (!inventorySearch.trim()) return inventoryItems;
    const search = inventorySearch.toLowerCase();
    return inventoryItems.filter(item =>
      item.product_name?.toLowerCase().includes(search) ||
      item.product_code?.toLowerCase().includes(search) ||
      item.location_name?.toLowerCase().includes(search) ||
      item.lot_name?.toLowerCase().includes(search)
    );
  }, [inventoryItems, inventorySearch]);

  // Group inventory by location or product
  const groupedInventory = useMemo(() => {
    if (groupBy === 'none') {
      return { ungrouped: filteredInventory };
    }

    const groups: Record<string, typeof filteredInventory> = {};

    for (const item of filteredInventory) {
      const key = groupBy === 'location'
        ? `${item.location_id}::${item.location_name}`
        : `${item.product_id}::${item.product_name}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }

    return groups;
  }, [filteredInventory, groupBy]);

  // Get group stats
  const getGroupStats = (items: typeof filteredInventory) => {
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAvailable = items.reduce((sum, item) => sum + item.available_quantity, 0);
    const totalReserved = items.reduce((sum, item) => sum + item.reserved_quantity, 0);
    return { totalQty, totalAvailable, totalReserved, count: items.length };
  };

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Expand all groups initially
  useEffect(() => {
    if (Object.keys(groupedInventory).length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(Object.keys(groupedInventory).slice(0, 3)));
    }
  }, [groupedInventory]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsRefreshing(true);
      const [statsData, ordersData] = await Promise.all([
        PhysicalInventoryService.getDashboardStats(),
        PhysicalInventoryService.listOrders(
          { status: ['in_progress', 'pending_review', 'scheduled'] },
          { page: 1, limit: 5, sort_by: 'created_at', sort_order: 'desc' }
        ),
      ]);

      if (statsData) {
        setStats(statsData);
      }
      if (ordersData.success) {
        setRecentOrders(ordersData.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error(t('physical_inventory.error_loading_dashboard', 'Failed to load dashboard'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Quick actions
  const handleCreateOrder = () => {
    navigate('/physical-inventory/orders/create');
  };

  const handleViewOrders = () => {
    navigate('/physical-inventory/orders');
  };

  const handleViewPendingValidation = () => {
    navigate('/physical-inventory/orders?status=pending_review');
  };

  // Format number with locale
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(i18n.language).format(num);
  };

  // Product image component
  const ProductImage = ({ src, name, size = 48 }: { src: string | null; name: string; size?: number }) => {
    if (src) {
      const imgSrc = src.startsWith('data:') ? src : `data:image/png;base64,${src}`;
      return (
        <img
          src={imgSrc}
          alt={name}
          className="object-cover rounded-lg"
          style={{ width: size, height: size }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    return (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{
          width: size,
          height: size,
          background: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        }}
      >
        <ImageOff size={size * 0.4} style={{ color: colors.textSecondary, opacity: 0.5 }} />
      </div>
    );
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusColors: Record<string, { bg: string; text: string }> = {
      draft: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
      scheduled: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
      in_progress: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300' },
      pending_review: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-700 dark:text-orange-300' },
      validated: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
      rejected: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
      cancelled: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-500 dark:text-slate-400' },
    };

    const statusColor = statusColors[status] || statusColors.draft;
    const label = t(`physical_inventory.status.${status}`, status);

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
        {label}
      </span>
    );
  };

  if (isLoading && !quants?.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.action }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: colors.background }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            {t('physical_inventory.dashboard.title', 'Physical Inventory')}
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            {t('physical_inventory.dashboard.subtitle', 'Manage inventory counts and audits')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ borderColor: colors.border, color: colors.textSecondary }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            {t('common.refresh', 'Refresh')}
          </button>
          <button
            onClick={handleCreateOrder}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ background: colors.action }}
          >
            <Plus size={18} />
            {t('physical_inventory.create_order', 'Create Count Order')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('physical_inventory.stats.active_orders', 'Active Orders')}
          value={formatNumber(stats?.active_orders || 0)}
          icon={ClipboardList}
          gradient={STAT_GRADIENTS.active}
          delay={0}
        />
        <StatCard
          label={t('physical_inventory.stats.pending_validation', 'Pending Validation')}
          value={formatNumber(stats?.pending_validation || 0)}
          icon={AlertTriangle}
          gradient={STAT_GRADIENTS.pending}
          delay={1}
        />
        <StatCard
          label={t('physical_inventory.stats.scheduled', 'Scheduled')}
          value={formatNumber(stats?.scheduled_upcoming || 0)}
          icon={Clock}
          gradient={STAT_GRADIENTS.scheduled}
          delay={2}
        />
        <StatCard
          label={t('physical_inventory.stats.adjustments_month', 'Adjustments (Month)')}
          value={formatNumber(stats?.total_adjustments_month || 0)}
          icon={CheckCircle2}
          gradient={STAT_GRADIENTS.adjustments}
          delay={3}
        />
      </div>

      {/* Current Inventory Section */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: colors.card, border: `1px solid ${colors.border}` }}
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: colors.border }}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Boxes size={24} style={{ color: colors.action }} />
              <div>
                <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                  {t('physical_inventory.current_inventory', 'Current Inventory')}
                </h2>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  {formatNumber(filteredInventory.length)} {t('physical_inventory.items', 'items')}
                  {inventorySearch && ` ${t('physical_inventory.matching_search', 'matching search')}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Group By Dropdown */}
              <div className="relative">
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupByMode)}
                  className="appearance-none px-3 py-2 pr-8 rounded-lg text-sm cursor-pointer"
                  style={{
                    background: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  }}
                >
                  <option value="location">{t('physical_inventory.by_location', 'By Location')}</option>
                  <option value="product">{t('physical_inventory.by_product', 'By Product')}</option>
                  <option value="none">{t('physical_inventory.items', 'All Items')}</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: colors.textSecondary }}
                />
              </div>

              {/* Search */}
              <div className="relative">
                <Search
                  size={16}
                  className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`}
                  style={{ color: colors.textSecondary }}
                />
                <input
                  type="text"
                  value={inventorySearch}
                  onChange={(e) => {
                    setInventorySearch(e.target.value);
                    setInventoryPage(1);
                  }}
                  placeholder={t('physical_inventory.search_inventory', 'Search products, locations...')}
                  className={`py-2 ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} rounded-lg text-sm w-64`}
                  style={{
                    background: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  }}
                />
              </div>

              {/* View Mode Toggle */}
              <div
                className="flex items-center rounded-lg p-1"
                style={{ background: colors.background, border: `1px solid ${colors.border}` }}
              >
                <button
                  onClick={() => setInventoryViewMode('table')}
                  className="p-2 rounded transition-colors"
                  style={{
                    background: inventoryViewMode === 'table' ? (mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                  }}
                >
                  <List size={16} style={{ color: inventoryViewMode === 'table' ? colors.action : colors.textSecondary }} />
                </button>
                <button
                  onClick={() => setInventoryViewMode('card')}
                  className="p-2 rounded transition-colors"
                  style={{
                    background: inventoryViewMode === 'card' ? (mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                  }}
                >
                  <LayoutGrid size={16} style={{ color: inventoryViewMode === 'card' ? colors.action : colors.textSecondary }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {loading.quants ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.action }} />
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto mb-3 opacity-30" style={{ color: colors.textSecondary }} />
              <p style={{ color: colors.textSecondary }}>
                {inventorySearch
                  ? t('physical_inventory.no_inventory_match', 'No inventory items match your search')
                  : t('physical_inventory.no_inventory', 'No inventory data available')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedInventory).map(([groupKey, items]) => {
                const [id, name] = groupKey.split('::');
                const isExpanded = expandedGroups.has(groupKey) || groupBy === 'none';
                const stats = getGroupStats(items);
                const firstItem = items[0];
                const groupImage = groupBy === 'product' ? firstItem?.product_image : null;

                return (
                  <div
                    key={groupKey}
                    className="rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${colors.border}` }}
                  >
                    {/* Group Header */}
                    {groupBy !== 'none' && (
                      <button
                        onClick={() => toggleGroup(groupKey)}
                        className="w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                        style={{ background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                      >
                        <div className="flex items-center gap-3">
                          {groupBy === 'product' && groupImage ? (
                            <ProductImage src={groupImage} name={name} size={40} />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ background: `${colors.action}15` }}
                            >
                              {groupBy === 'location' ? (
                                <MapPin size={20} style={{ color: colors.action }} />
                              ) : (
                                <Package size={20} style={{ color: colors.action }} />
                              )}
                            </div>
                          )}
                          <div className="text-left">
                            <div className="font-medium" style={{ color: colors.textPrimary }}>
                              {name || `ID: ${id}`}
                            </div>
                            <div className="text-xs" style={{ color: colors.textSecondary }}>
                              {groupBy === 'location'
                                ? `${stats.count} ${t('physical_inventory.products', 'products')}`
                                : `${stats.count} ${t('physical_inventory.locations', 'locations')}`}
                              {' • '}
                              {formatNumber(stats.totalQty)} {t('physical_inventory.on_hand', 'on hand')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <div className="text-sm font-medium" style={{ color: '#10b981' }}>
                              {formatNumber(stats.totalAvailable)} {t('physical_inventory.available', 'available')}
                            </div>
                            {stats.totalReserved > 0 && (
                              <div className="text-xs" style={{ color: '#f59e0b' }}>
                                {formatNumber(stats.totalReserved)} {t('physical_inventory.reserved', 'reserved')}
                              </div>
                            )}
                          </div>
                          <ChevronDown
                            size={20}
                            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            style={{ color: colors.textSecondary }}
                          />
                        </div>
                      </button>
                    )}

                    {/* Group Content */}
                    {isExpanded && (
                      <div className={groupBy !== 'none' ? 'border-t' : ''} style={{ borderColor: colors.border }}>
                        {inventoryViewMode === 'card' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-xl p-4 transition-all duration-200 hover:shadow-md"
                                style={{
                                  background: colors.background,
                                  border: `1px solid ${colors.border}`,
                                }}
                              >
                                <div className="flex items-start gap-3 mb-3">
                                  <ProductImage src={item.product_image} name={item.product_name} size={56} />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate" style={{ color: colors.textPrimary }}>
                                      {item.product_name}
                                    </div>
                                    {item.product_code && (
                                      <div className="text-xs font-mono" style={{ color: colors.textSecondary }}>
                                        {item.product_code}
                                      </div>
                                    )}
                                    {groupBy !== 'location' && (
                                      <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: colors.textSecondary }}>
                                        <MapPin size={10} />
                                        <span className="truncate">{item.location_name}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div
                                    className="rounded-lg py-2 px-1"
                                    style={{ background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                                  >
                                    <div className="text-xs" style={{ color: colors.textSecondary }}>
                                      {t('physical_inventory.on_hand', 'On Hand')}
                                    </div>
                                    <div className="font-semibold text-sm" style={{ color: colors.textPrimary }}>
                                      {formatNumber(item.quantity)}
                                    </div>
                                  </div>
                                  <div
                                    className="rounded-lg py-2 px-1"
                                    style={{ background: 'rgba(16, 185, 129, 0.1)' }}
                                  >
                                    <div className="text-xs" style={{ color: colors.textSecondary }}>
                                      {t('physical_inventory.available', 'Avail.')}
                                    </div>
                                    <div className="font-semibold text-sm" style={{ color: '#10b981' }}>
                                      {formatNumber(item.available_quantity)}
                                    </div>
                                  </div>
                                  <div
                                    className="rounded-lg py-2 px-1"
                                    style={{ background: item.reserved_quantity > 0 ? 'rgba(245, 158, 11, 0.1)' : (mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') }}
                                  >
                                    <div className="text-xs" style={{ color: colors.textSecondary }}>
                                      {t('physical_inventory.reserved', 'Rsrvd')}
                                    </div>
                                    <div className="font-semibold text-sm" style={{ color: item.reserved_quantity > 0 ? '#f59e0b' : colors.textSecondary }}>
                                      {item.reserved_quantity > 0 ? formatNumber(item.reserved_quantity) : '—'}
                                    </div>
                                  </div>
                                </div>

                                {item.lot_name && (
                                  <div className="mt-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                                    <span
                                      className="inline-block px-2 py-0.5 rounded text-xs"
                                      style={{ background: `${colors.action}15`, color: colors.action }}
                                    >
                                      {item.lot_name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr style={{ background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                    {t('physical_inventory.product', 'Product')}
                                  </th>
                                  {groupBy !== 'location' && (
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                      {t('physical_inventory.location', 'Location')}
                                    </th>
                                  )}
                                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                    {t('physical_inventory.on_hand', 'On Hand')}
                                  </th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                    {t('physical_inventory.available', 'Available')}
                                  </th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                    {t('physical_inventory.reserved', 'Reserved')}
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                    {t('physical_inventory.lot_serial', 'Lot/Serial')}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item) => (
                                  <tr
                                    key={item.id}
                                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                                    style={{ borderTop: `1px solid ${colors.border}` }}
                                  >
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-3">
                                        <ProductImage src={item.product_image} name={item.product_name} size={36} />
                                        <div className="min-w-0">
                                          <div className="font-medium text-sm truncate" style={{ color: colors.textPrimary }}>
                                            {item.product_name}
                                          </div>
                                          {item.product_code && (
                                            <div className="text-xs font-mono" style={{ color: colors.textSecondary }}>
                                              {item.product_code}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    {groupBy !== 'location' && (
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-sm" style={{ color: colors.textSecondary }}>
                                          <MapPin size={12} />
                                          <span className="truncate max-w-[150px]">{item.location_name}</span>
                                        </div>
                                      </td>
                                    )}
                                    <td className="px-4 py-3 text-right">
                                      <span className="font-medium text-sm" style={{ color: colors.textPrimary }}>
                                        {formatNumber(item.quantity)} <span className="text-xs font-normal" style={{ color: colors.textSecondary }}>{item.uom}</span>
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="font-medium text-sm" style={{ color: '#10b981' }}>
                                        {formatNumber(item.available_quantity)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="text-sm" style={{ color: item.reserved_quantity > 0 ? '#f59e0b' : colors.textSecondary }}>
                                        {item.reserved_quantity > 0 ? formatNumber(item.reserved_quantity) : '—'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      {item.lot_name ? (
                                        <span
                                          className="px-2 py-0.5 rounded text-xs"
                                          style={{ background: `${colors.action}15`, color: colors.action }}
                                        >
                                          {item.lot_name}
                                        </span>
                                      ) : (
                                        <span style={{ color: colors.textSecondary }}>—</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div
          className="lg:col-span-2 rounded-xl p-6"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
              {t('physical_inventory.recent_orders', 'Recent Count Orders')}
            </h2>
            <button
              onClick={handleViewOrders}
              className="flex items-center gap-1 text-sm font-medium hover:underline"
              style={{ color: colors.action }}
            >
              {t('common.view_all', 'View All')}
              <ArrowRight size={14} className={isRTL ? 'rotate-180' : ''} />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList size={48} className="mx-auto mb-3 opacity-30" style={{ color: colors.textSecondary }} />
              <p style={{ color: colors.textSecondary }}>
                {t('physical_inventory.no_orders', 'No count orders yet')}
              </p>
              <button
                onClick={handleCreateOrder}
                className="mt-3 text-sm font-medium hover:underline"
                style={{ color: colors.action }}
              >
                {t('physical_inventory.create_first_order', 'Create your first count order')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/physical-inventory/orders/${order.id}`)}
                  className="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  style={{ border: `1px solid ${colors.border}` }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${colors.action}15` }}
                    >
                      <ClipboardList size={20} style={{ color: colors.action }} />
                    </div>
                    <div>
                      <div className="font-medium" style={{ color: colors.textPrimary }}>
                        {order.reference}
                      </div>
                      <div className="text-sm" style={{ color: colors.textSecondary }}>
                        {order.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {order.progress_percent !== undefined && (
                      <div className="text-sm" style={{ color: colors.textSecondary }}>
                        {order.progress_percent}%
                      </div>
                    )}
                    <StatusBadge status={order.status} />
                    <ArrowRight size={16} className={`opacity-50 ${isRTL ? 'rotate-180' : ''}`} style={{ color: colors.textSecondary }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions & Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div
            className="rounded-xl p-6"
            style={{ background: colors.card, border: `1px solid ${colors.border}` }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
              {t('physical_inventory.quick_actions', 'Quick Actions')}
            </h2>
            <div className="space-y-3">
              <button
                onClick={handleCreateOrder}
                className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                style={{ border: `1px solid ${colors.border}` }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${colors.action}15` }}
                >
                  <Plus size={20} style={{ color: colors.action }} />
                </div>
                <div>
                  <div className="font-medium" style={{ color: colors.textPrimary }}>
                    {t('physical_inventory.new_count_order', 'New Count Order')}
                  </div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    {t('physical_inventory.create_inventory_count', 'Create a new inventory count')}
                  </div>
                </div>
              </button>

              <button
                onClick={handleViewPendingValidation}
                className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                style={{ border: `1px solid ${colors.border}` }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(245, 87, 108, 0.15)' }}
                >
                  <AlertTriangle size={20} style={{ color: '#f5576c' }} />
                </div>
                <div>
                  <div className="font-medium" style={{ color: colors.textPrimary }}>
                    {t('physical_inventory.review_discrepancies', 'Review Discrepancies')}
                  </div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    {stats?.pending_validation || 0} {t('physical_inventory.orders_pending', 'orders pending')}
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/physical-inventory/reports')}
                className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                style={{ border: `1px solid ${colors.border}` }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(67, 233, 123, 0.15)' }}
                >
                  <TrendingUp size={20} style={{ color: '#43e97b' }} />
                </div>
                <div>
                  <div className="font-medium" style={{ color: colors.textPrimary }}>
                    {t('physical_inventory.view_reports', 'View Reports')}
                  </div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    {t('physical_inventory.accuracy_analytics', 'Accuracy & analytics')}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Discrepancies by Reason - Only show if there are actual discrepancies */}
          {stats?.discrepancies_by_reason && stats.discrepancies_by_reason.length > 0 &&
           stats.discrepancies_by_reason.some(item => item.count > 0) && (
            <div
              className="rounded-xl p-6"
              style={{ background: colors.card, border: `1px solid ${colors.border}` }}
            >
              <h2 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
                {t('physical_inventory.discrepancies_by_reason', 'Discrepancies by Reason')}
              </h2>
              <div className="space-y-3">
                {stats.discrepancies_by_reason
                  .filter(item => item.count > 0)
                  .slice(0, 5)
                  .map((item, index) => {
                    const total = stats.discrepancies_by_reason.reduce((sum, i) => sum + i.count, 0);
                    const percentage = total > 0 ? (item.count / total) * 100 : 0;

                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: [
                                colors.action,
                                '#f5576c',
                                '#4facfe',
                                '#43e97b',
                                '#dc2626',
                              ][index % 5],
                            }}
                          />
                          <span className="text-sm" style={{ color: colors.textPrimary }}>
                            {item.reason_name}
                          </span>
                        </div>
                        <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                          {item.count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accuracy Trend Chart Placeholder */}
      {stats?.accuracy_trend && stats.accuracy_trend.length > 0 && (
        <div
          className="rounded-xl p-6"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
            {t('physical_inventory.accuracy_trend', 'Inventory Accuracy Trend')}
          </h2>
          <div className="h-64 flex items-center justify-center">
            <p style={{ color: colors.textSecondary }}>
              {t('physical_inventory.chart_coming_soon', 'Chart visualization coming soon')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PhysicalInventoryDashboard;
