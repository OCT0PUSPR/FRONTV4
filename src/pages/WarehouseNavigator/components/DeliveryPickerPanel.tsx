// Delivery Picker Panel - Select delivery and view pick route

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Route,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Navigation,
  Layers,
  Zap,
} from 'lucide-react';
import { Vector3 } from 'three';
import { useTheme } from '../../../../context/theme';
import {
  DeliveryOrder,
  DeliveryMoveLine,
} from '../hooks/useDeliveryRouting';
import {
  PickItem,
  PickRoute,
  RoutingAlgorithm,
  formatEstimatedTime,
  formatDistance,
} from '../utils/routingAlgorithm';

interface DeliveryPickerPanelProps {
  deliveries: DeliveryOrder[];
  isLoadingDeliveries: boolean;
  onRefreshDeliveries: () => void;
  selectedDelivery: DeliveryOrder | null;
  onSelectDelivery: (delivery: DeliveryOrder | null) => void;
  moveLines: DeliveryMoveLine[];
  isLoadingMoveLines: boolean;
  pickItems: PickItem[];
  isLoadingLocations: boolean;
  currentRoute: PickRoute | null;
  routeAlgorithm: RoutingAlgorithm;
  onAlgorithmChange: (algo: RoutingAlgorithm) => void;
  onCalculateRoute: (startPosition: Vector3) => void;
  routeComparison: { algorithm: RoutingAlgorithm; distance: number; time: number }[] | null;
  error: string | null;
  onClearError: () => void;
  onStepClick?: (step: number) => void;
}

const ALGORITHM_LABELS: Record<RoutingAlgorithm, { label: string; description: string; icon: any }> = {
  nearest: {
    label: 'Nearest First',
    description: 'Always go to closest item',
    icon: Navigation,
  },
  sPattern: {
    label: 'S-Pattern',
    description: 'Serpentine through aisles',
    icon: Route,
  },
  levelFirst: {
    label: 'Level First',
    description: 'Complete each level before moving',
    icon: Layers,
  },
};

const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  assigned: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  confirmed: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  waiting: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
  draft: { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280' },
};

export function DeliveryPickerPanel({
  deliveries,
  isLoadingDeliveries,
  onRefreshDeliveries,
  selectedDelivery,
  onSelectDelivery,
  moveLines,
  isLoadingMoveLines,
  pickItems,
  isLoadingLocations,
  currentRoute,
  routeAlgorithm,
  onAlgorithmChange,
  onCalculateRoute,
  routeComparison,
  error,
  onClearError,
  onStepClick,
}: DeliveryPickerPanelProps) {
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  // Hover colors for dark/light mode
  const hoverBg = isDark ? '#27272a' : '#f3f4f6'; // zinc-800 or gray-100

  const [isExpanded, setIsExpanded] = useState(true);
  const [showDeliveryList, setShowDeliveryList] = useState(true);
  const [showAlgorithmPicker, setShowAlgorithmPicker] = useState(false);
  const [hoveredDeliveryId, setHoveredDeliveryId] = useState<number | null>(null);
  const [hoveredStepIdx, setHoveredStepIdx] = useState<number | null>(null);
  const [hoveredAlgoIdx, setHoveredAlgoIdx] = useState<number | null>(null);
  const [isRefreshHovered, setIsRefreshHovered] = useState(false);

  // Auto-fetch deliveries on mount
  useEffect(() => {
    if (deliveries.length === 0 && !isLoadingDeliveries) {
      onRefreshDeliveries();
    }
  }, []);

  const handleCalculateRoute = () => {
    // Default start position (entrance/dock area)
    const startPosition = new Vector3(0, 0, -5);
    onCalculateRoute(startPosition);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        background: colors.card,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            }}
          >
            <Route className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
              {t('warehouse_navigator.pick_routing', 'Pick Routing')}
            </h3>
            <p className="text-xs" style={{ color: colors.textSecondary }}>
              {selectedDelivery ? selectedDelivery.name : t('warehouse_navigator.select_delivery', 'Select a delivery')}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: colors.textSecondary }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: colors.textSecondary }} />
        )}
      </button>

      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Error/Warning message */}
          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-600 dark:text-amber-400">Location Issue</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1 text-xs whitespace-pre-wrap">{error}</p>
                  <p className="text-amber-600 dark:text-amber-400 mt-2 text-xs">
                    Tip: Move products to specific bin locations (e.g., WH/Stock/AG/01/AA/01) to enable pick routing.
                  </p>
                </div>
                <button onClick={onClearError} className="text-amber-500 hover:text-amber-600">
                  &times;
                </button>
              </div>
            </div>
          )}

          {/* Show items without bin locations */}
          {selectedDelivery && moveLines.length > 0 && pickItems.length === 0 && !isLoadingLocations && !error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-600 dark:text-red-400">No Bin Locations Found</p>
                  <p className="text-red-700 dark:text-red-300 mt-1 text-xs">
                    The {moveLines.length} item(s) in this delivery are stored at general locations (like "Stock") instead of specific bin locations.
                  </p>
                  <p className="text-red-600 dark:text-red-400 mt-2 text-xs">
                    To use pick routing, products must be stored in specific bin locations (e.g., AG/01/AA/01).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                {t('warehouse_navigator.deliveries', 'Deliveries')}
              </label>
              <button
                onClick={onRefreshDeliveries}
                disabled={isLoadingDeliveries}
                className="p-1 rounded transition-colors"
                style={{ backgroundColor: isRefreshHovered ? hoverBg : 'transparent' }}
                onMouseEnter={() => setIsRefreshHovered(true)}
                onMouseLeave={() => setIsRefreshHovered(false)}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoadingDeliveries ? 'animate-spin' : ''}`}
                  style={{ color: colors.textSecondary }}
                />
              </button>
            </div>

            {/* Delivery list toggle */}
            <button
              onClick={() => setShowDeliveryList(!showDeliveryList)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg border transition-colors"
              style={{
                background: selectedDelivery ? 'rgba(59, 130, 246, 0.08)' : colors.background,
                borderColor: selectedDelivery ? '#3b82f6' : colors.border,
              }}
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" style={{ color: selectedDelivery ? '#3b82f6' : colors.textSecondary }} />
                <span className="text-sm" style={{ color: colors.textPrimary }}>
                  {selectedDelivery ? selectedDelivery.name : t('warehouse_navigator.select_delivery', 'Select delivery...')}
                </span>
              </div>
              <ChevronDown className="w-4 h-4" style={{ color: colors.textSecondary }} />
            </button>

            {/* Delivery dropdown list */}
            {showDeliveryList && (
              <div
                className="mt-1 max-h-48 overflow-y-auto rounded-lg border"
                style={{ background: colors.card, borderColor: colors.border }}
              >
                {isLoadingDeliveries ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.textSecondary }} />
                  </div>
                ) : deliveries.length === 0 ? (
                  <div className="text-center py-4 text-sm" style={{ color: colors.textSecondary }}>
                    {t('warehouse_navigator.no_deliveries', 'No deliveries found')}
                  </div>
                ) : (
                  deliveries.map((delivery) => {
                    const stateStyle = STATE_COLORS[delivery.state] || STATE_COLORS.draft;
                    const isSelected = selectedDelivery?.id === delivery.id;

                    const isHovered = hoveredDeliveryId === delivery.id;
                    const getBgColor = () => {
                      if (isSelected) return isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff';
                      if (isHovered) return hoverBg;
                      return 'transparent';
                    };

                    return (
                      <button
                        key={delivery.id}
                        onClick={() => {
                          onSelectDelivery(isSelected ? null : delivery);
                          setShowDeliveryList(false);
                        }}
                        className="w-full text-left p-2.5 border-b last:border-b-0 transition-colors"
                        style={{ borderColor: colors.border, backgroundColor: getBgColor() }}
                        onMouseEnter={() => setHoveredDeliveryId(delivery.id)}
                        onMouseLeave={() => setHoveredDeliveryId(null)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                            {delivery.name}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: stateStyle.bg, color: stateStyle.text }}
                          >
                            {delivery.state}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs" style={{ color: colors.textSecondary }}>
                            {delivery.partnerName}
                          </span>
                          <span className="text-xs" style={{ color: colors.textSecondary }}>
                            {delivery.moveLineCount} items
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Selected delivery details */}
          {selectedDelivery && (
            <>
              {/* Items to pick */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                    {t('warehouse_navigator.items_to_pick', 'Items to Pick')}
                  </label>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: pickItems.length > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: pickItems.length > 0 ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {pickItems.length} with bin location
                    </span>
                    {moveLines.length > pickItems.length && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}
                      >
                        {moveLines.length - pickItems.length} at general location
                      </span>
                    )}
                  </div>
                </div>

                {isLoadingMoveLines || isLoadingLocations ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.textSecondary }} />
                  </div>
                ) : (
                  <div
                    className="max-h-40 overflow-y-auto rounded-lg border"
                    style={{ background: colors.background, borderColor: colors.border }}
                  >
                    {pickItems.map((item, idx) => {
                      // Extract location code from full path (e.g., "WH/Stock/AR/14/AF/01" -> "AR14AF01")
                      const pathParts = item.locationName.split('/');
                      const locationCode = pathParts.length >= 4
                        ? pathParts.slice(-4).join('')
                        : pathParts[pathParts.length - 1];
                      const levelCode = item.parsed?.level || '';

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2.5 border-b last:border-b-0 cursor-pointer transition-colors"
                          style={{
                            borderColor: colors.border,
                            backgroundColor: hoveredStepIdx === idx ? hoverBg : 'transparent',
                          }}
                          onClick={() => onStepClick?.(idx)}
                          onMouseEnter={() => setHoveredStepIdx(idx)}
                          onMouseLeave={() => setHoveredStepIdx(null)}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: '#3b82f6', color: '#ffffff' }}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs font-bold px-1.5 py-0.5 rounded"
                                style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}
                              >
                                {locationCode}
                              </span>
                              {levelCode && (
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}
                                >
                                  Level {levelCode}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium truncate mt-1" style={{ color: colors.textPrimary }}>
                              {item.productName}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-sm font-bold" style={{ color: '#3b82f6' }}>
                              {item.quantity}
                            </span>
                            <p className="text-xs" style={{ color: colors.textSecondary }}>qty</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Algorithm selector */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: colors.textSecondary }}>
                  {t('warehouse_navigator.routing_algorithm', 'Routing Algorithm')}
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(ALGORITHM_LABELS) as RoutingAlgorithm[]).map((algo) => {
                    const { label, icon: Icon } = ALGORITHM_LABELS[algo];
                    const isActive = routeAlgorithm === algo;

                    return (
                      <button
                        key={algo}
                        onClick={() => onAlgorithmChange(algo)}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          isActive ? 'border-blue-500' : ''
                        }`}
                        style={{
                          background: isActive ? 'rgba(59, 130, 246, 0.1)' : colors.background,
                          borderColor: isActive ? '#3b82f6' : colors.border,
                        }}
                      >
                        <Icon
                          className="w-4 h-4 mx-auto mb-1"
                          style={{ color: isActive ? '#3b82f6' : colors.textSecondary }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: isActive ? '#3b82f6' : colors.textPrimary }}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calculate route button */}
              <button
                onClick={handleCalculateRoute}
                disabled={pickItems.length === 0 || isLoadingLocations}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                  color: '#ffffff',
                }}
              >
                <Play className="w-4 h-4" />
                {t('warehouse_navigator.calculate_route', 'Calculate Route')}
              </button>

              {/* Route results */}
              {currentRoute && (
                <div
                  className="p-3 rounded-lg border"
                  style={{ background: 'rgba(34, 197, 94, 0.05)', borderColor: 'rgba(34, 197, 94, 0.3)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">
                      {t('warehouse_navigator.route_calculated', 'Route Calculated')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span style={{ color: colors.textSecondary }}>Distance:</span>
                      <span className="ml-1 font-medium" style={{ color: colors.textPrimary }}>
                        {formatDistance(currentRoute.totalDistance)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: colors.textSecondary }}>Est. Time:</span>
                      <span className="ml-1 font-medium" style={{ color: colors.textPrimary }}>
                        {formatEstimatedTime(currentRoute.estimatedTime)}
                      </span>
                    </div>
                  </div>

                  {/* Route steps */}
                  <div className="mt-3 space-y-1">
                    <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                      {t('warehouse_navigator.pick_sequence', 'Pick Sequence')}
                    </label>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {currentRoute.steps.map((step, idx) => (
                        <button
                          key={step.index}
                          onClick={() => onStepClick?.(idx)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg transition-colors"
                          style={{ background: hoveredAlgoIdx === idx ? hoverBg : colors.background }}
                          onMouseEnter={() => setHoveredAlgoIdx(idx)}
                          onMouseLeave={() => setHoveredAlgoIdx(null)}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                              color: '#ffffff',
                            }}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: colors.textPrimary }}>
                              {step.item.productName}
                            </p>
                            <p className="text-xs truncate" style={{ color: colors.textSecondary }}>
                              {step.item.locationName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium" style={{ color: '#3b82f6' }}>
                              x{step.item.quantity}
                            </p>
                            <p className="text-xs" style={{ color: colors.textSecondary }}>
                              +{formatDistance(step.distanceFromPrevious)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Algorithm comparison */}
                  {routeComparison && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                      <label className="text-xs font-medium mb-1 block" style={{ color: colors.textSecondary }}>
                        {t('warehouse_navigator.algorithm_comparison', 'Algorithm Comparison')}
                      </label>
                      <div className="space-y-1">
                        {routeComparison.map((comp) => {
                          const isBest = comp.distance === Math.min(...routeComparison.map(c => c.distance));
                          return (
                            <div
                              key={comp.algorithm}
                              className="flex items-center justify-between text-xs p-1.5 rounded"
                              style={{
                                background: isBest ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                              }}
                            >
                              <span style={{ color: isBest ? '#22c55e' : colors.textSecondary }}>
                                {ALGORITHM_LABELS[comp.algorithm].label}
                                {isBest && ' (Best)'}
                              </span>
                              <span style={{ color: colors.textPrimary }}>
                                {formatDistance(comp.distance)} / {formatEstimatedTime(comp.time)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
