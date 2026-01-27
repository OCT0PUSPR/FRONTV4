// Sidebar Component - Left panel with warehouse selector, search, filters, and tree

import { useMemo, useState } from 'react';
import { ChevronDown, Warehouse, MapPin, Route } from 'lucide-react';
import { Vector3 } from 'three';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme';
import { OdooWarehouse, LocationNode } from '../types';
import { SearchInput } from './SearchInput';
import { LocationTree } from './LocationTree';
import { DeliveryPickerPanel } from './DeliveryPickerPanel';
import { useResizable } from '../hooks/useResizable';
import { filterLocationTree } from '../utils/hierarchyBuilder';
import { PickRoute, RoutingAlgorithm, PickItem } from '../utils/routingAlgorithm';
import { DeliveryOrder, DeliveryMoveLine } from '../hooks/useDeliveryRouting';

interface SidebarProps {
  warehouses: OdooWarehouse[];
  selectedWarehouseId: number | null;
  onWarehouseChange: (id: number) => void;
  locations: LocationNode[];
  selectedLocationId: number | null;
  onLocationSelect: (id: number) => void;
  expandedNodes: Set<number>;
  onToggleNode: (id: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLocationDoubleClick?: (id: number) => void;
  isLoading?: boolean;
  // Routing props
  routingMode?: boolean;
  onToggleRoutingMode?: () => void;
  deliveries?: DeliveryOrder[];
  isLoadingDeliveries?: boolean;
  onRefreshDeliveries?: () => void;
  selectedDelivery?: DeliveryOrder | null;
  onSelectDelivery?: (delivery: DeliveryOrder | null) => void;
  moveLines?: DeliveryMoveLine[];
  isLoadingMoveLines?: boolean;
  pickItems?: PickItem[];
  isLoadingPickLocations?: boolean;
  currentRoute?: PickRoute | null;
  routeAlgorithm?: RoutingAlgorithm;
  onAlgorithmChange?: (algo: RoutingAlgorithm) => void;
  onCalculateRoute?: (startPosition: Vector3) => void;
  routeComparison?: { algorithm: RoutingAlgorithm; distance: number; time: number }[] | null;
  routingError?: string | null;
  onClearRoutingError?: () => void;
  onRouteStepClick?: (stepIndex: number) => void;
}

export function Sidebar({
  warehouses,
  selectedWarehouseId,
  onWarehouseChange,
  locations,
  selectedLocationId,
  onLocationSelect,
  expandedNodes,
  onToggleNode,
  searchQuery,
  onSearchChange,
  onLocationDoubleClick,
  isLoading,
  // Routing props
  routingMode = false,
  onToggleRoutingMode,
  deliveries = [],
  isLoadingDeliveries = false,
  onRefreshDeliveries,
  selectedDelivery = null,
  onSelectDelivery,
  moveLines = [],
  isLoadingMoveLines = false,
  pickItems = [],
  isLoadingPickLocations = false,
  currentRoute = null,
  routeAlgorithm = 'nearest',
  onAlgorithmChange,
  onCalculateRoute,
  routeComparison = null,
  routingError = null,
  onClearRoutingError,
  onRouteStepClick,
}: SidebarProps) {
  const { t, i18n } = useTranslation();
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const isRTL = i18n.dir() === 'rtl';

  // Tab state (locations or routing)
  const [activeTab, setActiveTab] = useState<'locations' | 'routing'>('locations');

  // Resizable sidebar
  const { width, isResizing, startResize } = useResizable({
    minWidth: 240,
    maxWidth: 480,
    defaultWidth: 340,
  });

  // Filter locations by search
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) {
      return locations;
    }
    return filterLocationTree(locations, searchQuery);
  }, [locations, searchQuery]);

  // Handle tab change and toggle routing mode
  const handleTabChange = (tab: 'locations' | 'routing') => {
    setActiveTab(tab);
    if (tab === 'routing' && !routingMode) {
      onToggleRoutingMode?.();
    } else if (tab === 'locations' && routingMode) {
      onToggleRoutingMode?.();
    }
  };

  return (
    <div
      className={`
        flex flex-col h-full relative
        ${isRTL ? 'border-l' : 'border-r'}
      `}
      style={{
        width: `${width}px`,
        borderColor: colors.border,
        backgroundColor: colors.card,
        transition: isResizing ? 'none' : 'width 0.1s ease',
      }}
    >
      {/* Warehouse selector */}
      <div className="p-3 border-b" style={{ borderColor: colors.border }}>
        <div className="relative">
          <Warehouse
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: colors.textSecondary }}
          />
          <select
            value={selectedWarehouseId || ''}
            onChange={(e) => onWarehouseChange(Number(e.target.value))}
            className="
              w-full appearance-none pl-10 pr-8 py-2 text-sm rounded-lg border
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              cursor-pointer
            "
            style={{
              backgroundColor: colors.mutedBg,
              borderColor: colors.border,
              color: colors.textPrimary,
            }}
            disabled={isLoading || warehouses.length === 0}
          >
            <option value="" disabled style={{ backgroundColor: isDark ? '#27272a' : '#ffffff', color: colors.textPrimary }}>
              {t('warehouse_navigator.select_warehouse', 'Select Warehouse')}
            </option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id} style={{ backgroundColor: isDark ? '#27272a' : '#ffffff', color: colors.textPrimary }}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: colors.textSecondary }}
          />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b" style={{ borderColor: colors.border }}>
        <button
          onClick={() => handleTabChange('locations')}
          className={`
            flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium
            transition-colors duration-150 border-b-2
          `}
          style={{
            color: activeTab === 'locations' ? '#3b82f6' : colors.textSecondary,
            borderColor: activeTab === 'locations' ? '#3b82f6' : 'transparent',
            backgroundColor: activeTab === 'locations' ? (isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
          }}
        >
          <MapPin className="h-4 w-4" />
          {t('warehouse_navigator.locations', 'Locations')}
        </button>
        <button
          onClick={() => handleTabChange('routing')}
          className={`
            flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium
            transition-colors duration-150 border-b-2
          `}
          style={{
            color: activeTab === 'routing' ? '#3b82f6' : colors.textSecondary,
            borderColor: activeTab === 'routing' ? '#3b82f6' : 'transparent',
            backgroundColor: activeTab === 'routing' ? (isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
          }}
        >
          <Route className="h-4 w-4" />
          {t('warehouse_navigator.pick_routing', 'Pick Routing')}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'locations' ? (
        <>
          {/* Search */}
          <div className="p-3 border-b" style={{ borderColor: colors.border }}>
            <SearchInput
              value={searchQuery}
              onChange={onSearchChange}
            />
          </div>

          {/* Location tree */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : (
              <LocationTree
                locations={filteredLocations}
                selectedId={selectedLocationId}
                expandedNodes={expandedNodes}
                onSelect={onLocationSelect}
                onToggle={onToggleNode}
                onDoubleClick={onLocationDoubleClick}
              />
            )}
          </div>
        </>
      ) : (
        /* Routing tab content */
        <DeliveryPickerPanel
          deliveries={deliveries}
          isLoadingDeliveries={isLoadingDeliveries}
          onRefreshDeliveries={onRefreshDeliveries || (() => {})}
          selectedDelivery={selectedDelivery}
          onSelectDelivery={onSelectDelivery || (() => {})}
          moveLines={moveLines}
          isLoadingMoveLines={isLoadingMoveLines}
          pickItems={pickItems}
          isLoadingLocations={isLoadingPickLocations}
          currentRoute={currentRoute}
          routeAlgorithm={routeAlgorithm}
          onAlgorithmChange={onAlgorithmChange || (() => {})}
          onCalculateRoute={onCalculateRoute || (() => {})}
          routeComparison={routeComparison}
          error={routingError}
          onClearError={onClearRoutingError || (() => {})}
          onStepClick={onRouteStepClick}
        />
      )}

      {/* Resize handle */}
      <div
        className={`
          absolute top-0 h-full w-1 cursor-col-resize
          hover:bg-blue-500 active:bg-blue-500
          transition-colors duration-150
          ${isRTL ? 'left-0' : 'right-0'}
        `}
        onMouseDown={startResize}
        onTouchStart={startResize}
        style={{
          backgroundColor: isResizing ? '#2563eb' : 'transparent',
        }}
      />
    </div>
  );
}
