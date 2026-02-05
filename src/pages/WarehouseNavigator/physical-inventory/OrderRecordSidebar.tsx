// Physical Inventory - Order Record Sidebar
// Sidebar panel for view/edit/create count orders

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Loader2,
  Calendar,
  MapPin,
  Package,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  Check,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTheme } from '../../../../context/theme';
import { PhysicalInventoryService } from '../../../services/physicalInventory.service';
import type {
  ScanOrder,
  CreateScanOrderRequest,
  ScopeType,
  LocationOption,
  CategoryOption,
  UserOption,
  ScanOrderStatus,
} from './types';

const RECURRING_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

interface OrderRecordSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  recordId?: string;
  isCreating?: boolean;
  onSave?: () => void;
}

// Sidebar wrapper
export function OrderSidebar({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { colors, mode } = useTheme();
  const { i18n } = useTranslation();
  const isDark = mode === 'dark';
  const isRTL = i18n.dir() === 'rtl';

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) onClose();
  }, [isOpen, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
            }}
          />
          <motion.div
            initial={{ x: isRTL ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRTL ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 0,
              [isRTL ? 'left' : 'right']: 0,
              bottom: 0,
              width: '600px',
              maxWidth: '100vw',
              background: colors.background,
              boxShadow: isDark
                ? `${isRTL ? '12px' : '-12px'} 0 48px rgba(0, 0, 0, 0.5)`
                : `${isRTL ? '12px' : '-12px'} 0 48px rgba(0, 0, 0, 0.12)`,
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Order Record Panel
export function OrderRecordPanel({
  recordId,
  isCreating,
  onClose,
  onSave,
}: {
  recordId?: string;
  isCreating?: boolean;
  onClose: () => void;
  onSave?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { colors, mode } = useTheme();
  const navigate = useNavigate();
  const isRTL = i18n.dir() === 'rtl';
  const isDark = mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<ScanOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateScanOrderRequest>({
    name: '',
    scope_type: 'full_warehouse',
    location_ids: [],
    category_ids: [],
    scheduled_date: '',
    recurring_rule: '',
    is_blind_count: false,
    timeout_days: undefined,
    responsible_user_id: undefined,
    assigned_counter_ids: [],
  });

  // Reference data
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [expandedLocations, setExpandedLocations] = useState<Set<number>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch reference data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locationsData, categoriesData, usersData] = await Promise.all([
          PhysicalInventoryService.getLocations(),
          PhysicalInventoryService.getCategories(),
          PhysicalInventoryService.getUsers(),
        ]);
        setLocations(locationsData);
        setCategories(categoriesData);
        setUsers(usersData);
      } catch (err) {
        console.error('Error fetching reference data:', err);
      }
    };
    fetchData();
  }, []);

  // Fetch order if editing/viewing
  useEffect(() => {
    const fetchOrder = async () => {
      if (isCreating || !recordId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const orderData = await PhysicalInventoryService.getOrder(Number(recordId));
        if (orderData) {
          setOrder(orderData);
          setFormData({
            name: orderData.name || '',
            scope_type: orderData.scope_type || 'full_warehouse',
            location_ids: orderData.location_ids || [],
            category_ids: orderData.category_ids || [],
            scheduled_date: orderData.scheduled_date || '',
            recurring_rule: orderData.recurring_rule || '',
            is_blind_count: orderData.is_blind_count || false,
            timeout_days: orderData.timeout_days,
            responsible_user_id: orderData.responsible_user_id,
            assigned_counter_ids: orderData.assigned_counter_ids || [],
          });
        } else {
          setError(t('physical_inventory.order_not_found', 'Order not found'));
        }
      } catch (err: any) {
        setError(err.message || t('physical_inventory.error_loading_order', 'Failed to load order'));
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [recordId, isCreating, t]);

  // Handle form submission
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error(t('physical_inventory.validation.name_required', 'Name is required'));
      return;
    }

    if (formData.scope_type === 'locations' && (!formData.location_ids || formData.location_ids.length === 0)) {
      toast.error(t('physical_inventory.validation.locations_required', 'Please select at least one location'));
      return;
    }

    if (formData.scope_type === 'categories' && (!formData.category_ids || formData.category_ids.length === 0)) {
      toast.error(t('physical_inventory.validation.categories_required', 'Please select at least one category'));
      return;
    }

    try {
      setSaving(true);
      const result = await PhysicalInventoryService.createOrder(formData);

      if (result.success && result.order) {
        toast.success(t('physical_inventory.order_created', 'Count order created successfully'));
        onSave?.();
        onClose();
      } else {
        toast.error(result.error || t('physical_inventory.error_creating_order', 'Failed to create order'));
      }
    } catch (err: any) {
      toast.error(err.message || t('physical_inventory.error_creating_order', 'Failed to create order'));
    } finally {
      setSaving(false);
    }
  };

  // Toggle location selection
  const toggleLocation = (id: number) => {
    setFormData(prev => {
      const current = prev.location_ids || [];
      const newIds = current.includes(id)
        ? current.filter(lid => lid !== id)
        : [...current, id];
      return { ...prev, location_ids: newIds };
    });
  };

  // Toggle location expansion
  const toggleExpand = (id: number) => {
    setExpandedLocations(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle category selection
  const toggleCategory = (id: number) => {
    setFormData(prev => {
      const current = prev.category_ids || [];
      const newIds = current.includes(id)
        ? current.filter(cid => cid !== id)
        : [...current, id];
      return { ...prev, category_ids: newIds };
    });
  };

  // Toggle counter assignment
  const toggleCounter = (id: number) => {
    setFormData(prev => {
      const current = prev.assigned_counter_ids || [];
      const newIds = current.includes(id)
        ? current.filter(uid => uid !== id)
        : [...current, id];
      return { ...prev, assigned_counter_ids: newIds };
    });
  };

  // Build location tree
  const buildLocationTree = (parentId: number | null = null): LocationOption[] => {
    return locations.filter(loc => loc.parent_id === parentId);
  };

  // Render location tree node
  const renderLocationNode = (location: LocationOption, depth: number = 0) => {
    const hasChildren = locations.some(l => l.parent_id === location.id);
    const isExpanded = expandedLocations.has(location.id);
    const isSelected = formData.location_ids?.includes(location.id);

    return (
      <div key={location.id}>
        <div
          onClick={() => toggleLocation(location.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            marginLeft: depth * 20,
            background: isSelected ? (isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)') : 'transparent',
            transition: 'background 0.2s',
          }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(location.id);
              }}
              style={{ padding: '2px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {isExpanded ? (
                <ChevronDown size={14} style={{ color: colors.textSecondary }} />
              ) : (
                <ChevronRight size={14} className={isRTL ? 'rotate-180' : ''} style={{ color: colors.textSecondary }} />
              )}
            </button>
          )}
          {!hasChildren && <div style={{ width: '20px' }} />}

          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              border: `2px solid ${isSelected ? colors.action : colors.border}`,
              background: isSelected ? colors.action : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSelected && <Check size={12} color="#fff" />}
          </div>

          <MapPin size={14} style={{ color: colors.textSecondary }} />
          <span style={{ fontSize: '0.875rem', color: colors.textPrimary }}>{location.name}</span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {locations.filter(l => l.parent_id === location.id).map(child => renderLocationNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Scope type options
  const scopeTypeOptions: { value: ScopeType; label: string; description: string; icon: typeof MapPin }[] = [
    { value: 'full_warehouse', label: t('physical_inventory.scope.full_warehouse', 'Full Warehouse'), description: t('physical_inventory.scope.full_warehouse_desc', 'Count all locations'), icon: Package },
    { value: 'locations', label: t('physical_inventory.scope.by_location', 'By Location'), description: t('physical_inventory.scope.by_location_desc', 'Select specific locations'), icon: MapPin },
    { value: 'categories', label: t('physical_inventory.scope.by_category', 'By Category'), description: t('physical_inventory.scope.by_category_desc', 'Count by categories'), icon: Package },
    { value: 'mixed', label: t('physical_inventory.scope.mixed', 'Mixed'), description: t('physical_inventory.scope.mixed_desc', 'Combine filters'), icon: Settings },
  ];

  // Get status badge
  const getStatusBadge = (status: ScanOrderStatus) => {
    const statusConfig: Record<ScanOrderStatus, { bg: string; color: string; icon: typeof Clock }> = {
      draft: { bg: isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)', color: '#64748b', icon: Clock },
      scheduled: { bg: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', icon: Calendar },
      in_progress: { bg: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', icon: Play },
      pending_review: { bg: isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)', color: '#f97316', icon: AlertTriangle },
      validated: { bg: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: CheckCircle2 },
      rejected: { bg: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)', color: '#ef4444', icon: XCircle },
      cancelled: { bg: isDark ? 'rgba(107, 114, 128, 0.2)' : 'rgba(107, 114, 128, 0.1)', color: '#6b7280', icon: XCircle },
    };
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '999px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          background: config.bg,
          color: config.color,
        }}
      >
        <Icon size={14} />
        {t(`physical_inventory.status.${status}`, status.replace('_', ' '))}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: colors.action }} />
      </div>
    );
  }

  const isViewMode = !isCreating && recordId;
  const canEdit = isCreating || (order && ['draft', 'scheduled'].includes(order.status));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.border}`,
        background: colors.card,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <Package size={24} color={colors.action} strokeWidth={2} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: colors.textPrimary,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {isCreating ? t('physical_inventory.create_order', 'Create Count Order') : (order?.name || t('physical_inventory.count_order', 'Count Order'))}
            </h2>
            {order && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.8125rem', color: colors.textSecondary }}>{order.reference}</span>
                {getStatusBadge(order.status)}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: '10px',
            color: colors.textSecondary,
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {error && (
          <div style={{
            padding: '12px 16px',
            background: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)'}`,
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <AlertTriangle size={18} color="#ef4444" />
            <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Basic Information */}
          <div style={{ padding: '16px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: colors.textPrimary, marginBottom: '16px' }}>
              {t('physical_inventory.basic_info', 'Basic Information')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>
                  {t('physical_inventory.order_name', 'Order Name')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!canEdit}
                  placeholder={t('physical_inventory.name_placeholder', 'e.g., Monthly Cycle Count')}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Scheduled Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>
                  {t('physical_inventory.scheduled_date', 'Scheduled Date')}
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isRTL ? 'right' : 'left']: '12px', color: colors.textSecondary }} />
                  <input
                    type="datetime-local"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    disabled={!canEdit}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      [isRTL ? 'paddingRight' : 'paddingLeft']: '40px',
                      borderRadius: '10px',
                      border: `1px solid ${colors.border}`,
                      background: colors.background,
                      color: colors.textPrimary,
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Recurring Rule */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>
                  {t('physical_inventory.recurring', 'Recurring Schedule')}
                </label>
                <select
                  value={formData.recurring_rule || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, recurring_rule: e.target.value || undefined }))}
                  disabled={!canEdit}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: colors.background,
                    color: colors.textPrimary,
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                >
                  {RECURRING_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {t(`physical_inventory.recurring.${opt.value || 'none'}`, opt.label)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Scope Selection */}
          <div style={{ padding: '16px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: colors.textPrimary, marginBottom: '16px' }}>
              {t('physical_inventory.scope', 'Count Scope')}
            </h3>

            {/* Scope Type */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {scopeTypeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.scope_type === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => canEdit && setFormData(prev => ({ ...prev, scope_type: option.value }))}
                    disabled={!canEdit}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      textAlign: 'left',
                      background: isSelected ? `${colors.action}15` : colors.background,
                      border: `1px solid ${isSelected ? colors.action : colors.border}`,
                      cursor: canEdit ? 'pointer' : 'default',
                      opacity: canEdit ? 1 : 0.6,
                    }}
                  >
                    <Icon size={20} style={{ color: isSelected ? colors.action : colors.textSecondary, marginBottom: '6px' }} />
                    <div style={{ fontWeight: '500', fontSize: '0.8125rem', color: colors.textPrimary }}>{option.label}</div>
                    <div style={{ fontSize: '0.6875rem', color: colors.textSecondary, marginTop: '2px' }}>{option.description}</div>
                  </button>
                );
              })}
            </div>

            {/* Location Selection */}
            {(formData.scope_type === 'locations' || formData.scope_type === 'mixed') && canEdit && (
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary, marginBottom: '8px' }}>
                  {t('physical_inventory.select_locations', 'Select Locations')}
                </label>
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  borderRadius: '10px',
                  padding: '8px',
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                }}>
                  {buildLocationTree(null).map(location => renderLocationNode(location))}
                  {locations.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px', color: colors.textSecondary, fontSize: '0.875rem' }}>
                      {t('physical_inventory.no_locations', 'No locations available')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Category Selection */}
            {(formData.scope_type === 'categories' || formData.scope_type === 'mixed') && canEdit && (
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary, marginBottom: '8px' }}>
                  {t('physical_inventory.select_categories', 'Select Categories')}
                </label>
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  borderRadius: '10px',
                  padding: '8px',
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                }}>
                  {categories.map(category => {
                    const isSelected = formData.category_ids?.includes(category.id);
                    return (
                      <div
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: isSelected ? (isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)') : 'transparent',
                        }}
                      >
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: `2px solid ${isSelected ? colors.action : colors.border}`,
                            background: isSelected ? colors.action : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && <Check size={12} color="#fff" />}
                        </div>
                        <Package size={14} style={{ color: colors.textSecondary }} />
                        <span style={{ fontSize: '0.875rem', color: colors.textPrimary }}>
                          {category.complete_name || category.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Assignment */}
          <div style={{ padding: '16px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: colors.textPrimary, marginBottom: '16px' }}>
              {t('physical_inventory.assignment', 'Assignment')}
            </h3>

            {/* Responsible User */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>
                {t('physical_inventory.responsible_user', 'Responsible User')}
              </label>
              <select
                value={formData.responsible_user_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, responsible_user_id: e.target.value ? Number(e.target.value) : undefined }))}
                disabled={!canEdit}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: colors.background,
                  color: colors.textPrimary,
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                <option value="">{t('common.none', 'None')}</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>

            {/* Assigned Counters */}
            {canEdit && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>
                  {t('physical_inventory.assigned_counters', 'Assigned Counters')}
                </label>
                <div style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  borderRadius: '10px',
                  padding: '8px',
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                }}>
                  {users.map(user => {
                    const isSelected = formData.assigned_counter_ids?.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleCounter(user.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isSelected ? (isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)') : 'transparent',
                        }}
                      >
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '3px',
                            border: `2px solid ${isSelected ? colors.action : colors.border}`,
                            background: isSelected ? colors.action : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && <Check size={10} color="#fff" />}
                        </div>
                        <Users size={12} style={{ color: colors.textSecondary }} />
                        <span style={{ fontSize: '0.8125rem', color: colors.textPrimary }}>{user.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          {canEdit && (
            <div style={{ borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: colors.textPrimary, margin: 0 }}>
                  {t('physical_inventory.advanced_settings', 'Advanced Settings')}
                </h3>
                <ChevronDown size={20} style={{ color: colors.textSecondary, transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {showAdvanced && (
                <div style={{ padding: '16px', paddingTop: '0' }}>
                  {/* Blind Count */}
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, is_blind_count: !prev.is_blind_count }))}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: formData.is_blind_count ? (isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)') : 'transparent',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: `2px solid ${formData.is_blind_count ? colors.action : colors.border}`,
                        background: formData.is_blind_count ? colors.action : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {formData.is_blind_count && <Check size={14} color="#fff" />}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '0.875rem', color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {formData.is_blind_count ? <EyeOff size={14} /> : <Eye size={14} />}
                        {t('physical_inventory.blind_count', 'Blind Count')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: colors.textSecondary, marginTop: '2px' }}>
                        {t('physical_inventory.blind_count_desc', 'Counters cannot see expected quantities')}
                      </div>
                    </div>
                  </div>

                  {/* Timeout Days */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>
                      {t('physical_inventory.timeout_days', 'Timeout (days)')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.timeout_days || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, timeout_days: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder={t('physical_inventory.timeout_placeholder', 'No timeout')}
                      style={{
                        width: '150px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: `1px solid ${colors.border}`,
                        background: colors.background,
                        color: colors.textPrimary,
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                    <p style={{ fontSize: '0.6875rem', color: colors.textSecondary, marginTop: '4px' }}>
                      {t('physical_inventory.timeout_help', 'Auto-cancel if not completed within this period')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {canEdit && (
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          background: colors.card,
          display: 'flex',
          gap: '12px',
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textPrimary,
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: colors.action,
              color: '#fff',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? t('common.saving', 'Saving...') : t('physical_inventory.create_order', 'Create Order')}
          </button>
        </div>
      )}
    </div>
  );
}

export default OrderRecordPanel;
