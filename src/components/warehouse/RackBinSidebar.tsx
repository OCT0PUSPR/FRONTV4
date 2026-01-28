/**
 * RackBinSidebar - Drill-down sidebar for warehouse rack navigation
 * Structure: Rack -> Levels (collapsible) -> Bins -> Items
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, ChevronLeft, ChevronDown, ChevronRight, Package, Layers, Box,
  Thermometer, Droplets, AlertTriangle, ArrowRight
} from 'lucide-react';
import { RackCell, RackStatus } from './types';
import { LocationNode, StockItem } from '../../pages/WarehouseNavigator/types';

interface RackBinSidebarProps {
  rack: RackCell | null;
  onClose: () => void;
  colors: any;
  odooLocations?: LocationNode[];
  fetchStockForLocation?: (locationId: number) => Promise<StockItem[]>;
}

type ViewState = 'levels' | 'items';

interface LevelData {
  id: number;
  name: string;
  bins: BinData[];
  hasStock: boolean;
  itemCount: number;
  totalQty: number;
}

interface BinData {
  id: number;
  name: string;
  hasStock: boolean;
  itemCount: number;
  totalQty: number;
}

export const RackBinSidebar: React.FC<RackBinSidebarProps> = ({
  rack,
  onClose,
  colors,
  odooLocations = [],
  fetchStockForLocation
}) => {
  const { t } = useTranslation();
  const [viewState, setViewState] = useState<ViewState>('levels');
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set());
  const [selectedBin, setSelectedBin] = useState<BinData | null>(null);
  const [binItems, setBinItems] = useState<StockItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Reset state when rack changes
  useEffect(() => {
    setViewState('levels');
    setExpandedLevels(new Set());
    setSelectedBin(null);
    setBinItems([]);
  }, [rack?.id]);

  // Find the bay node in the location tree
  const bayNode = useMemo((): LocationNode | null => {
    if (!rack?.odooLocationId || odooLocations.length === 0) return null;

    const findNode = (nodes: LocationNode[], id: number): LocationNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNode(node.children, id);
        if (found) return found;
      }
      return null;
    };

    return findNode(odooLocations, rack.odooLocationId);
  }, [rack?.odooLocationId, odooLocations]);

  // Extract levels and their bins from the bay node
  const levelsData = useMemo((): LevelData[] => {
    if (!bayNode) return [];

    const levels: LevelData[] = [];

    // Bay's children are levels (AA, AB, AC, etc.)
    bayNode.children.forEach(levelNode => {
      if (levelNode.type === 'level') {
        // Level's children are bins (01, 02, etc.)
        const bins: BinData[] = levelNode.children
          .filter(child => child.type === 'bin')
          .map(binNode => ({
            id: binNode.id,
            name: binNode.name,
            hasStock: binNode.hasStock,
            itemCount: binNode.itemCount,
            totalQty: binNode.totalQty,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        levels.push({
          id: levelNode.id,
          name: levelNode.name,
          bins,
          hasStock: levelNode.hasStock || bins.some(b => b.hasStock),
          itemCount: bins.reduce((sum, b) => sum + b.itemCount, 0),
          totalQty: bins.reduce((sum, b) => sum + b.totalQty, 0),
        });
      }
    });

    // Sort levels by name
    levels.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    return levels;
  }, [bayNode]);

  // Toggle level expansion
  const toggleLevel = (levelId: number) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(levelId)) {
        next.delete(levelId);
      } else {
        next.add(levelId);
      }
      return next;
    });
  };

  // Handle bin click - fetch items and show items view
  const handleBinClick = async (bin: BinData) => {
    setSelectedBin(bin);
    setViewState('items');
    setLoadingItems(true);
    setBinItems([]);

    try {
      if (fetchStockForLocation) {
        const items = await fetchStockForLocation(bin.id);
        setBinItems(items);
      }
    } catch (error) {
      console.error('Error fetching bin items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  // Handle back button
  const handleBack = () => {
    setViewState('levels');
    setSelectedBin(null);
    setBinItems([]);
  };

  const getCapacityColor = (hasStock: boolean, itemCount: number) => {
    if (!hasStock || itemCount === 0) return colors.textSecondary;
    if (itemCount > 10) return '#22c55e';
    if (itemCount > 5) return '#f59e0b';
    return '#22c55e';
  };

  if (!rack) return null;

  const totalBins = levelsData.reduce((sum, l) => sum + l.bins.length, 0);
  const totalItems = levelsData.reduce((sum, l) => sum + l.itemCount, 0);

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-40 w-[380px] shadow-2xl flex flex-col h-full animate-slide-in"
      style={{
        background: colors.card,
        borderLeft: `1px solid ${colors.border}`
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 shrink-0"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center gap-3">
          {viewState === 'items' ? (
            <button
              onClick={handleBack}
              className="p-2 rounded-lg transition-colors"
              style={{ color: colors.textPrimary }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.mutedBg}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <ChevronLeft size={20} />
            </button>
          ) : null}
          <div>
            <h2 className="text-lg font-bold tracking-tight" style={{ color: colors.textPrimary }}>
              {viewState === 'levels' ? (
                <span className="flex items-center gap-2">
                  <Layers size={18} />
                  {t("Rack")} {rack.label}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Box size={18} />
                  {t("Bin")} {selectedBin?.name}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="px-2 py-0.5 rounded text-xs font-mono font-bold"
                style={{ background: colors.mutedBg, color: colors.textSecondary }}
              >
                {rack.aisleId}
              </span>
              {viewState === 'items' && selectedBin && (
                <span className="text-xs" style={{ color: colors.textSecondary }}>
                  {selectedBin.itemCount} {t("items")}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full transition-colors"
          style={{ color: colors.textSecondary }}
          onMouseEnter={(e) => e.currentTarget.style.background = colors.mutedBg}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewState === 'levels' ? (
          // LEVELS VIEW - Collapsible levels with bins underneath
          <div className="space-y-4">
            {/* Rack Status Alert */}
            {rack.status === RackStatus.CRITICAL && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <div>
                  <h4 className="font-bold text-red-900 text-sm">{t("Action Required")}</h4>
                  <p className="text-xs text-red-700 mt-1">
                    {rack.issueDescription || t("Unspecified critical error.")}
                  </p>
                </div>
              </div>
            )}

            {/* Telemetry */}
            {(rack.temperature !== undefined || rack.humidity !== undefined) && (
              <div className="grid grid-cols-2 gap-3">
                {rack.temperature !== undefined && (
                  <div
                    className="p-3 rounded-lg border"
                    style={{ background: colors.mutedBg, borderColor: colors.border }}
                  >
                    <div className="flex items-center gap-1.5 mb-1" style={{ color: colors.textSecondary }}>
                      <Thermometer size={14} />
                      <span className="text-xs font-medium">{t("Temp")}</span>
                    </div>
                    <span className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                      {rack.temperature}°C
                    </span>
                  </div>
                )}
                {rack.humidity !== undefined && (
                  <div
                    className="p-3 rounded-lg border"
                    style={{ background: colors.mutedBg, borderColor: colors.border }}
                  >
                    <div className="flex items-center gap-1.5 mb-1" style={{ color: colors.textSecondary }}>
                      <Droplets size={14} />
                      <span className="text-xs font-medium">{t("Humidity")}</span>
                    </div>
                    <span className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                      {rack.humidity}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div
              className="p-3 rounded-lg border"
              style={{ background: colors.mutedBg, borderColor: colors.border }}
            >
              <div className="flex justify-between text-sm">
                <span style={{ color: colors.textSecondary }}>{t("Levels")}</span>
                <span className="font-bold" style={{ color: colors.textPrimary }}>{levelsData.length}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span style={{ color: colors.textSecondary }}>{t("Total Bins")}</span>
                <span className="font-bold" style={{ color: colors.textPrimary }}>{totalBins}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span style={{ color: colors.textSecondary }}>{t("Total Items")}</span>
                <span className="font-bold" style={{ color: colors.textPrimary }}>{totalItems}</span>
              </div>
            </div>

            {/* Levels List */}
            {levelsData.length === 0 ? (
              <div
                className="text-center py-8 rounded-lg border border-dashed"
                style={{ background: colors.mutedBg, borderColor: colors.border }}
              >
                <Layers size={32} className="mx-auto mb-2" style={{ color: colors.textSecondary }} />
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  {t("No levels configured")}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {levelsData.map((level) => {
                  const isExpanded = expandedLevels.has(level.id);
                  return (
                    <div
                      key={level.id}
                      className="rounded-lg border overflow-hidden"
                      style={{ borderColor: colors.border }}
                    >
                      {/* Level Header - Clickable to expand */}
                      <button
                        onClick={() => toggleLevel(level.id)}
                        className="w-full p-3 flex items-center justify-between transition-colors"
                        style={{ background: colors.mutedBg }}
                        onMouseEnter={(e) => e.currentTarget.style.background = colors.background}
                        onMouseLeave={(e) => e.currentTarget.style.background = colors.mutedBg}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown size={16} style={{ color: colors.textSecondary }} />
                          ) : (
                            <ChevronRight size={16} style={{ color: colors.textSecondary }} />
                          )}
                          <span className="font-bold" style={{ color: colors.textPrimary }}>
                            {t("Level")} {level.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: colors.textSecondary }}>
                            {level.bins.length} {t("bins")}
                          </span>
                          {level.hasStock && (
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: getCapacityColor(level.hasStock, level.itemCount) }}
                            />
                          )}
                        </div>
                      </button>

                      {/* Bins Grid - Shown when expanded */}
                      {isExpanded && (
                        <div
                          className="p-3 grid grid-cols-4 gap-2"
                          style={{ background: colors.card }}
                        >
                          {level.bins.map((bin) => (
                            <button
                              key={bin.id}
                              onClick={() => handleBinClick(bin)}
                              className="p-2 rounded-lg border text-center transition-all hover:scale-105 active:scale-95"
                              style={{
                                background: bin.hasStock ? colors.mutedBg : colors.card,
                                borderColor: bin.hasStock ? getCapacityColor(bin.hasStock, bin.itemCount) : colors.border,
                                borderWidth: bin.hasStock ? 2 : 1
                              }}
                            >
                              <span
                                className="font-bold text-sm block"
                                style={{ color: colors.textPrimary }}
                              >
                                {bin.name}
                              </span>
                              {bin.hasStock && (
                                <span
                                  className="text-[10px] block mt-0.5"
                                  style={{ color: colors.textSecondary }}
                                >
                                  {bin.itemCount} {t("items")}
                                </span>
                              )}
                            </button>
                          ))}
                          {level.bins.length === 0 && (
                            <div
                              className="col-span-4 text-center py-4 text-xs"
                              style={{ color: colors.textSecondary }}
                            >
                              {t("No bins in this level")}
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
        ) : (
          // ITEMS VIEW - List of items in selected bin
          <div className="space-y-4">
            {/* Bin Summary */}
            <div
              className="p-4 rounded-xl border"
              style={{ background: colors.mutedBg, borderColor: colors.border }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                  {t("Total Quantity")}
                </span>
                <span className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                  {selectedBin?.totalQty.toLocaleString() || 0}
                </span>
              </div>
            </div>

            {/* Items List Title */}
            <div className="flex items-center justify-between">
              <h3
                className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"
                style={{ color: colors.textPrimary }}
              >
                <Package size={14} style={{ color: colors.textSecondary }} />
                {t("Items")}
              </h3>
              <span className="text-xs" style={{ color: colors.textSecondary }}>
                {binItems.length} {t("products")}
              </span>
            </div>

            {/* Items List */}
            {loadingItems ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
                  style={{ borderColor: colors.action }}
                />
              </div>
            ) : binItems.length === 0 ? (
              <div
                className="text-center py-8 rounded-lg border border-dashed"
                style={{ background: colors.mutedBg, borderColor: colors.border }}
              >
                <Package size={32} className="mx-auto mb-2" style={{ color: colors.textSecondary }} />
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  {t("No items in this bin")}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {binItems.map((item, idx) => (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="p-3 rounded-lg border transition-colors"
                    style={{ background: colors.card, borderColor: colors.border }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium text-sm truncate"
                          title={item.productName}
                          style={{ color: colors.textPrimary }}
                        >
                          {item.productName}
                        </p>
                        {item.lotName && (
                          <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                            {t("Lot")}: {item.lotName}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <span
                          className="px-2 py-1 rounded-lg text-sm font-bold"
                          style={{ background: colors.mutedBg, color: colors.textPrimary }}
                        >
                          {item.quantity.toLocaleString()}
                        </span>
                        <span className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                          {item.uomName}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RackBinSidebar;
