// Physical Inventory - Create Order Page
// Form to create a new count order with scope selection

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Calendar,
  MapPin,
  Package,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Info,
} from 'lucide-react';
import { useTheme } from '../../../../context/theme';
import { PhysicalInventoryService } from '../../../services/physicalInventory.service';
import type {
  CreateScanOrderRequest,
  ScopeType,
  LocationOption,
  CategoryOption,
  UserOption,
} from './types';

const RECURRING_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function CreateOrderPage() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const isRTL = i18n?.dir() === 'rtl';

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
  const [isLoadingData, setIsLoadingData] = useState(true);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<Set<number>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch reference data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        const [locationsData, categoriesData, usersData] = await Promise.all([
          PhysicalInventoryService.getLocations(),
          PhysicalInventoryService.getCategories(),
          PhysicalInventoryService.getUsers(),
        ]);
        setLocations(locationsData);
        setCategories(categoriesData);
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching reference data:', error);
        toast.error(t('physical_inventory.error_loading_data', 'Failed to load form data'));
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [t]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
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
      setIsSaving(true);
      const result = await PhysicalInventoryService.createOrder(formData);

      if (result.success && result.order) {
        toast.success(t('physical_inventory.order_created', 'Count order created successfully'));
        navigate(`/physical-inventory/orders/${result.order.id}`);
      } else {
        toast.error(result.error || t('physical_inventory.error_creating_order', 'Failed to create order'));
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(t('physical_inventory.error_creating_order', 'Failed to create order'));
    } finally {
      setIsSaving(false);
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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
          className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
          }`}
          style={{ marginLeft: depth * 20 }}
          onClick={() => toggleLocation(location.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(location.id);
              }}
              className="p-0.5"
            >
              {isExpanded ? (
                <ChevronDown size={14} style={{ color: colors.textSecondary }} />
              ) : (
                <ChevronRight size={14} className={isRTL ? 'rotate-180' : ''} style={{ color: colors.textSecondary }} />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <div
            className={`w-5 h-5 rounded border flex items-center justify-center ${
              isSelected ? 'bg-blue-500 border-blue-500' : ''
            }`}
            style={{ borderColor: isSelected ? undefined : colors.border }}
          >
            {isSelected && <Check size={12} className="text-white" />}
          </div>

          <MapPin size={14} style={{ color: colors.textSecondary }} />
          <span className="text-sm" style={{ color: colors.textPrimary }}>
            {location.name}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {locations
              .filter(l => l.parent_id === location.id)
              .map(child => renderLocationNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Scope type options
  const scopeTypeOptions: { value: ScopeType; label: string; description: string; icon: typeof MapPin }[] = [
    {
      value: 'full_warehouse',
      label: t('physical_inventory.scope.full_warehouse', 'Full Warehouse'),
      description: t('physical_inventory.scope.full_warehouse_desc', 'Count all locations in the warehouse'),
      icon: Package,
    },
    {
      value: 'locations',
      label: t('physical_inventory.scope.by_location', 'By Location'),
      description: t('physical_inventory.scope.by_location_desc', 'Select specific locations to count'),
      icon: MapPin,
    },
    {
      value: 'categories',
      label: t('physical_inventory.scope.by_category', 'By Category'),
      description: t('physical_inventory.scope.by_category_desc', 'Count products in selected categories'),
      icon: Package,
    },
    {
      value: 'mixed',
      label: t('physical_inventory.scope.mixed', 'Mixed'),
      description: t('physical_inventory.scope.mixed_desc', 'Combine location and category filters'),
      icon: Settings,
    },
  ];

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.action }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: colors.background }}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/physical-inventory/orders')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft size={20} className={isRTL ? 'rotate-180' : ''} style={{ color: colors.textPrimary }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            {t('physical_inventory.create_order', 'Create Count Order')}
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            {t('physical_inventory.create_order_desc', 'Set up a new inventory count')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div
          className="rounded-xl p-6 space-y-4"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
            {t('physical_inventory.basic_info', 'Basic Information')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>
                {t('physical_inventory.order_name', 'Order Name')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('physical_inventory.name_placeholder', 'e.g., Monthly Cycle Count - January 2026')}
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                }}
              />
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>
                {t('physical_inventory.scheduled_date', 'Scheduled Date')}
              </label>
              <div className="relative">
                <Calendar
                  size={16}
                  className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`}
                  style={{ color: colors.textSecondary }}
                />
                <input
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  className={`w-full py-2 rounded-lg ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                  style={{
                    background: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  }}
                />
              </div>
            </div>

            {/* Recurring Rule */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>
                {t('physical_inventory.recurring', 'Recurring Schedule')}
              </label>
              <select
                value={formData.recurring_rule || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, recurring_rule: e.target.value || undefined }))}
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
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
        <div
          className="rounded-xl p-6 space-y-4"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
            {t('physical_inventory.scope', 'Count Scope')}
          </h2>

          {/* Scope Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {scopeTypeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = formData.scope_type === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, scope_type: option.value }))}
                  className={`p-4 rounded-xl text-left transition-all ${
                    isSelected ? 'ring-2' : ''
                  }`}
                  style={{
                    background: isSelected ? `${colors.action}10` : colors.background,
                    border: `1px solid ${isSelected ? colors.action : colors.border}`,
                    ...(isSelected ? { ringColor: colors.action } : {}),
                  }}
                >
                  <Icon
                    size={24}
                    className="mb-2"
                    style={{ color: isSelected ? colors.action : colors.textSecondary }}
                  />
                  <div className="font-medium" style={{ color: colors.textPrimary }}>
                    {option.label}
                  </div>
                  <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Location Selection */}
          {(formData.scope_type === 'locations' || formData.scope_type === 'mixed') && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                {t('physical_inventory.select_locations', 'Select Locations')}
              </label>
              <div
                className="max-h-64 overflow-y-auto rounded-lg p-2"
                style={{ background: colors.background, border: `1px solid ${colors.border}` }}
              >
                {buildLocationTree(null).map(location => renderLocationNode(location))}
                {locations.length === 0 && (
                  <div className="text-center py-4" style={{ color: colors.textSecondary }}>
                    {t('physical_inventory.no_locations', 'No locations available')}
                  </div>
                )}
              </div>
              {(formData.location_ids?.length || 0) > 0 && (
                <div className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
                  {t('physical_inventory.locations_selected', '{{count}} locations selected', {
                    count: formData.location_ids?.length || 0,
                  })}
                </div>
              )}
            </div>
          )}

          {/* Category Selection */}
          {(formData.scope_type === 'categories' || formData.scope_type === 'mixed') && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                {t('physical_inventory.select_categories', 'Select Categories')}
              </label>
              <div
                className="max-h-64 overflow-y-auto rounded-lg p-2"
                style={{ background: colors.background, border: `1px solid ${colors.border}` }}
              >
                {categories.map(category => {
                  const isSelected = formData.category_ids?.includes(category.id);
                  return (
                    <div
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : ''
                        }`}
                        style={{ borderColor: isSelected ? undefined : colors.border }}
                      >
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <Package size={14} style={{ color: colors.textSecondary }} />
                      <span className="text-sm" style={{ color: colors.textPrimary }}>
                        {category.complete_name || category.name}
                      </span>
                    </div>
                  );
                })}
                {categories.length === 0 && (
                  <div className="text-center py-4" style={{ color: colors.textSecondary }}>
                    {t('physical_inventory.no_categories', 'No categories available')}
                  </div>
                )}
              </div>
              {(formData.category_ids?.length || 0) > 0 && (
                <div className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
                  {t('physical_inventory.categories_selected', '{{count}} categories selected', {
                    count: formData.category_ids?.length || 0,
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Assignment */}
        <div
          className="rounded-xl p-6 space-y-4"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
            {t('physical_inventory.assignment', 'Assignment')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Responsible User */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>
                {t('physical_inventory.responsible_user', 'Responsible User')}
              </label>
              <select
                value={formData.responsible_user_id || ''}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    responsible_user_id: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                }}
              >
                <option value="">{t('common.none', 'None')}</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Counters */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>
                {t('physical_inventory.assigned_counters', 'Assigned Counters')}
              </label>
              <div
                className="max-h-40 overflow-y-auto rounded-lg p-2"
                style={{ background: colors.background, border: `1px solid ${colors.border}` }}
              >
                {users.map(user => {
                  const isSelected = formData.assigned_counter_ids?.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleCounter(user.id)}
                      className={`flex items-center gap-3 py-1.5 px-2 rounded cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : ''
                        }`}
                        style={{ borderColor: isSelected ? undefined : colors.border }}
                      >
                        {isSelected && <Check size={10} className="text-white" />}
                      </div>
                      <Users size={12} style={{ color: colors.textSecondary }} />
                      <span className="text-sm" style={{ color: colors.textPrimary }}>
                        {user.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: colors.card, border: `1px solid ${colors.border}` }}
        >
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-6"
          >
            <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
              {t('physical_inventory.advanced_settings', 'Advanced Settings')}
            </h2>
            <ChevronDown
              size={20}
              className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              style={{ color: colors.textSecondary }}
            />
          </button>

          {showAdvanced && (
            <div className="px-6 pb-6 space-y-4">
              {/* Blind Count */}
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_blind_count: !prev.is_blind_count }))}
                  className={`w-6 h-6 rounded border flex items-center justify-center mt-0.5 ${
                    formData.is_blind_count ? 'bg-blue-500 border-blue-500' : ''
                  }`}
                  style={{ borderColor: formData.is_blind_count ? undefined : colors.border }}
                >
                  {formData.is_blind_count && <Check size={14} className="text-white" />}
                </button>
                <div>
                  <div className="font-medium" style={{ color: colors.textPrimary }}>
                    {t('physical_inventory.blind_count', 'Blind Count')}
                  </div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>
                    {t('physical_inventory.blind_count_desc', 'Counters cannot see expected quantities during counting')}
                  </div>
                </div>
              </div>

              {/* Timeout Days */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>
                  {t('physical_inventory.timeout_days', 'Timeout (days)')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.timeout_days || ''}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      timeout_days: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  placeholder={t('physical_inventory.timeout_placeholder', 'No timeout')}
                  className="w-48 px-4 py-2 rounded-lg"
                  style={{
                    background: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  }}
                />
                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  {t('physical_inventory.timeout_help', 'Automatically cancel if not completed within this period')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/physical-inventory/orders')}
            className="px-4 py-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            style={{ border: `1px solid ${colors.border}`, color: colors.textPrimary }}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ background: colors.action }}
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Save size={18} />
            )}
            {t('physical_inventory.create_order', 'Create Order')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateOrderPage;
