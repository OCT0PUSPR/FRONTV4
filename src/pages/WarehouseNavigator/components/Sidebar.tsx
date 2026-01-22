// Sidebar Component - Left panel with warehouse selector, search, filters, and tree

import { useMemo } from 'react';
import { ChevronDown, Warehouse } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme';
import { OdooWarehouse, LocationNode, LEVEL_CODES } from '../types';
import { SearchInput } from './SearchInput';
import { LevelToggles } from './LevelToggles';
import { LocationTree } from './LocationTree';
import { useResizable } from '../hooks/useResizable';
import { filterLocationTree, filterByVisibleLevels } from '../utils/hierarchyBuilder';

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
  visibleLevels: Set<string>;
  onToggleLevel: (level: string) => void;
  onLocationDoubleClick?: (id: number) => void;
  isLoading?: boolean;
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
  visibleLevels,
  onToggleLevel,
  onLocationDoubleClick,
  isLoading,
}: SidebarProps) {
  const { t, i18n } = useTranslation();
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const isRTL = i18n.dir() === 'rtl';

  // Resizable sidebar
  const { width, isResizing, startResize } = useResizable({
    minWidth: 240,
    maxWidth: 480,
    defaultWidth: 300,
  });

  // Filter locations by search and visible levels
  const filteredLocations = useMemo(() => {
    let filtered = locations;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filterLocationTree(filtered, searchQuery);
    }

    // Apply level filter
    if (visibleLevels.size > 0 && visibleLevels.size < LEVEL_CODES.length) {
      filtered = filterByVisibleLevels(filtered, visibleLevels);
    }

    return filtered;
  }, [locations, searchQuery, visibleLevels]);

  return (
    <div
      className={`
        flex flex-col h-full
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
              focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
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

      {/* Search */}
      <div className="p-3 border-b" style={{ borderColor: colors.border }}>
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
        />
      </div>

      {/* Level toggles */}
      <div className="p-3 border-b" style={{ borderColor: colors.border }}>
        <LevelToggles
          visibleLevels={visibleLevels}
          onToggle={onToggleLevel}
        />
      </div>

      {/* Location tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent" />
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

      {/* Resize handle */}
      <div
        className={`
          absolute top-0 h-full w-1 cursor-col-resize
          hover:bg-orange-500 active:bg-orange-500
          transition-colors duration-150
          ${isRTL ? 'left-0' : 'right-0'}
        `}
        onMouseDown={startResize}
        onTouchStart={startResize}
        style={{
          backgroundColor: isResizing ? '#e07020' : 'transparent',
        }}
      />
    </div>
  );
}
