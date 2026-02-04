// Warehouse Navigator - Main Page Component
// 3D interactive visualization of warehouse storage locations

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useTheme } from '../../../context/theme';
import { useAuth } from '../../../context/auth';
import { CameraTarget, StockItem } from './types';
import { useWarehouseData } from './hooks/useWarehouseData';
import { useWebSocket } from './hooks/useWebSocket';
import { useDeliveryRouting } from './hooks/useDeliveryRouting';
import { findNodeById, getAncestorIds } from './utils/hierarchyBuilder';
import { getCameraPositionForWarehouse, calculateWarehouseBounds, calculatePosition, LAYOUT, getRowIndex, getLevelIndex } from './utils/positionCalculator';
import { Vector3 } from 'three';

// Components
import { Scene } from './components/Scene';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { Breadcrumbs } from './components/Breadcrumbs';
import { BinModal } from './components/BinModal';
import { BinDetailsSidebar } from './components/BinDetailsSidebar';
import { HelpTour } from './components/HelpTour';
import { EmptyState } from './components/EmptyState';
import { Minimap } from './components/Minimap';

export function WarehouseNavigator() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { sessionId } = useAuth();
  const navigate = useNavigate();

  // Data hooks
  const {
    warehouses,
    locations,
    isLoading,
    isLoadingStock,
    error,
    fetchWarehouses,
    fetchLocations,
    fetchStockForLocation,
  } = useWarehouseData();

  // State - define selected warehouse first so we can use it in routing hook
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

  // Get selected warehouse info for routing
  const selectedWarehouse = useMemo(() => {
    return warehouses.find(w => w.id === selectedWarehouseId);
  }, [warehouses, selectedWarehouseId]);

  // Delivery routing hook - pass warehouse context for filtering
  const {
    deliveries,
    isLoadingDeliveries,
    fetchDeliveries,
    selectedDelivery,
    moveLines,
    isLoadingMoveLines,
    selectDelivery,
    pickItems,
    isLoadingLocations: isLoadingPickLocations,
    currentRoute,
    routeAlgorithm,
    setRouteAlgorithm,
    calculateRoute,
    routeComparison,
    error: routingError,
    clearError: clearRoutingError,
  } = useDeliveryRouting(locations, selectedWarehouseId, selectedWarehouse?.code);

  // Routing UI state
  const [routingMode, setRoutingMode] = useState(false);
  const [highlightedRouteStep, setHighlightedRouteStep] = useState<number | undefined>(undefined);

  // State (continued)
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelpTour, setShowHelpTour] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([]);

  // Modal state
  const [binModalOpen, setBinModalOpen] = useState(false);
  const [binModalLocationId, setBinModalLocationId] = useState<number | null>(null);
  const [binStockItems, setBinStockItems] = useState<StockItem[]>([]);

  // Sidebar state for bin details
  const [binSidebarOpen, setBinSidebarOpen] = useState(false);
  const [binSidebarLocationId, setBinSidebarLocationId] = useState<number | null>(null);
  const [binSidebarStockItems, setBinSidebarStockItems] = useState<StockItem[]>([]);

  // WebSocket for real-time updates
  useWebSocket({
    warehouseId: selectedWarehouseId,
    onStockUpdate: (update) => {
      // Show toast notification
      toast.info(
        t('warehouse_navigator.stock_updated', 'Stock updated in {{location}}', {
          location: update.location_id,
        })
      );
    },
  });

  // Fetch warehouses on mount
  useEffect(() => {
    if (sessionId) {
      fetchWarehouses();
    }
  }, [sessionId, fetchWarehouses]);

  // Auto-select first warehouse
  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  // Fetch locations when warehouse changes
  useEffect(() => {
    if (selectedWarehouseId) {
      fetchLocations(selectedWarehouseId);
      setSelectedLocationId(null);
      setExpandedNodes(new Set());
      setNavigationHistory([]);
    }
  }, [selectedWarehouseId, fetchLocations]);

  // Handle warehouse change
  const handleWarehouseChange = useCallback((id: number) => {
    setSelectedWarehouseId(id);
  }, []);

  // Handle location selection - fly camera based on location type
  const handleLocationSelect = useCallback(async (id: number) => {
    setSelectedLocationId(id);

    // Add to navigation history
    if (selectedLocationId !== null) {
      setNavigationHistory(prev => [...prev, selectedLocationId]);
    }

    // Auto-expand ancestors
    const ancestorIds = getAncestorIds(locations, id);
    if (ancestorIds) {
      setExpandedNodes(prev => {
        const next = new Set(prev);
        ancestorIds.forEach(aid => next.add(aid));
        return next;
      });
    }

    // Fly camera to location based on type
    const node = findNodeById(locations, id);
    if (!node) return;

    let targetPosition: Vector3;
    let cameraPosition: Vector3;

    if (node.type === 'row') {
      // Row view - look at the row from the front
      // Use the row's name (e.g., "AG", "AH") to calculate position
      const rowCode = node.name;
      const rowIdx = getRowIndex(rowCode);
      const pairIndex = Math.floor(rowIdx / 2);
      const isSecondInPair = rowIdx % 2 === 1;
      const z = pairIndex * (LAYOUT.ROW_SPACING + LAYOUT.BACK_TO_BACK_GAP * 2) +
                (isSecondInPair ? LAYOUT.BACK_TO_BACK_GAP : 0);
      const centerX = (LAYOUT.BAYS_PER_ROW * LAYOUT.BAY_WIDTH) / 2;
      const centerY = (LAYOUT.LEVELS_PER_RACK * LAYOUT.LEVEL_HEIGHT) / 2;
      targetPosition = new Vector3(centerX, centerY, z);
      cameraPosition = new Vector3(centerX + 8, centerY + 5, z + 12);
      // Close sidebar when navigating to non-bin
      setBinSidebarOpen(false);
    } else if (node.type === 'bay') {
      // Rack/Bay view - look at the specific rack
      const bayNum = parseInt(node.name, 10) || 1;
      const parentRow = locations.find(r => r.children.some(c => c.id === id));
      const rowCode = parentRow?.name || 'AG';
      const rowIdx = getRowIndex(rowCode);
      const pairIndex = Math.floor(rowIdx / 2);
      const isSecondInPair = rowIdx % 2 === 1;
      const z = pairIndex * (LAYOUT.ROW_SPACING + LAYOUT.BACK_TO_BACK_GAP * 2) +
                (isSecondInPair ? LAYOUT.BACK_TO_BACK_GAP : 0);
      const x = (bayNum - 1) * LAYOUT.BAY_WIDTH + LAYOUT.BAY_WIDTH / 2;
      const centerY = (LAYOUT.LEVELS_PER_RACK * LAYOUT.LEVEL_HEIGHT) / 2;
      targetPosition = new Vector3(x, centerY, z);
      cameraPosition = new Vector3(x + 3, centerY + 3, z + 6);
      // Close sidebar when navigating to non-bin
      setBinSidebarOpen(false);
    } else if (node.type === 'level') {
      // Level view - look at the specific level of a rack
      const levelIdx = getLevelIndex(node.name);
      const levelY = levelIdx * LAYOUT.LEVEL_HEIGHT;
      // Find parent bay and row
      let bayNum = 1;
      let rowCode = 'AG';
      locations.forEach((row) => {
        row.children.forEach(bay => {
          if (bay.children.some(lvl => lvl.id === id)) {
            bayNum = parseInt(bay.name, 10) || 1;
            rowCode = row.name;
          }
        });
      });
      const rowIdx = getRowIndex(rowCode);
      const pairIndex = Math.floor(rowIdx / 2);
      const isSecondInPair = rowIdx % 2 === 1;
      const z = pairIndex * (LAYOUT.ROW_SPACING + LAYOUT.BACK_TO_BACK_GAP * 2) +
                (isSecondInPair ? LAYOUT.BACK_TO_BACK_GAP : 0);
      const x = (bayNum - 1) * LAYOUT.BAY_WIDTH + LAYOUT.BAY_WIDTH / 2;
      targetPosition = new Vector3(x, levelY + 0.4, z);
      cameraPosition = new Vector3(x + 2, levelY + 2, z + 4);
      // Close sidebar when navigating to non-bin
      setBinSidebarOpen(false);
    } else if (node.type === 'bin' && node.parsed) {
      // Bin view - zoom to specific bin
      targetPosition = calculatePosition(node.parsed);
      cameraPosition = new Vector3(
        targetPosition.x + 1.5,
        targetPosition.y + 1,
        targetPosition.z + 2
      );

      // Open sidebar with bin details
      setBinSidebarLocationId(id);
      setBinSidebarOpen(true);

      // Fetch stock for this bin
      const items = await fetchStockForLocation(id);
      setBinSidebarStockItems(items);
    } else {
      // Fallback for any other type
      targetPosition = new Vector3(5, 2, 0);
      cameraPosition = new Vector3(10, 8, 10);
      // Close sidebar when navigating to non-bin
      setBinSidebarOpen(false);
    }

    setCameraTarget({
      position: cameraPosition,
      lookAt: targetPosition,
      duration: 800,
    });
  }, [locations, selectedLocationId, fetchStockForLocation]);

  // Handle bin click in 3D scene
  const handleBinClick = useCallback((id: number) => {
    handleLocationSelect(id);
  }, [handleLocationSelect]);

  // Handle location double-click (open modal)
  const handleLocationDoubleClick = useCallback(async (id: number) => {
    const node = findNodeById(locations, id);
    if (node && node.type === 'bin') {
      setBinModalLocationId(id);
      setBinModalOpen(true);

      // Fetch stock for this bin
      const items = await fetchStockForLocation(id);
      setBinStockItems(items);
    }
  }, [locations, fetchStockForLocation]);

  // Handle tree node toggle
  const handleToggleNode = useCallback((id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Handle back button
  const handleBack = useCallback(() => {
    if (navigationHistory.length > 0) {
      const prevId = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setSelectedLocationId(prevId);

      // Fly to previous location
      const node = findNodeById(locations, prevId);
      if (node?.parsed) {
        const position = calculatePosition(node.parsed);
        setCameraTarget({
          position: new Vector3(position.x, position.y + 3, position.z + 5),
          lookAt: position,
          duration: 600,
        });
      }
    } else {
      setSelectedLocationId(null);
      // Return to warehouse overview
      const rowCount = locations.filter(l => l.type === 'row').length || 8;
      const bounds = calculateWarehouseBounds(rowCount);
      setCameraTarget({
        position: getCameraPositionForWarehouse(rowCount),
        lookAt: new Vector3(bounds.width / 2, bounds.height / 2, bounds.depth / 2),
        duration: 1000,
      });
    }
  }, [navigationHistory, locations]);

  // Handle home button
  const handleHome = useCallback(() => {
    setSelectedLocationId(null);
    setNavigationHistory([]);

    // Fly to warehouse overview
    const rowCount = locations.filter(l => l.type === 'row').length || 8;
    const bounds = calculateWarehouseBounds(rowCount);
    setCameraTarget({
      position: getCameraPositionForWarehouse(rowCount),
      lookAt: new Vector3(bounds.width / 2, bounds.height / 2, bounds.depth / 2),
      duration: 1000,
    });
  }, [locations]);

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback((id: number | null) => {
    if (id === null) {
      handleHome();
    } else {
      handleLocationSelect(id);
    }
  }, [handleHome, handleLocationSelect]);

  // Handle fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Handle minimap navigation
  const handleMinimapNavigate = useCallback((x: number, z: number) => {
    const rowCount = locations.filter(l => l.type === 'row').length || 8;
    const bounds = calculateWarehouseBounds(rowCount);

    setCameraTarget({
      position: new Vector3(x, bounds.height + 5, z + 10),
      lookAt: new Vector3(x, 0, z),
      duration: 600,
    });
  }, [locations]);

  // Close bin modal
  const handleCloseBinModal = useCallback(() => {
    setBinModalOpen(false);
    setBinModalLocationId(null);
    setBinStockItems([]);
  }, []);

  // Close bin sidebar
  const handleCloseBinSidebar = useCallback(() => {
    setBinSidebarOpen(false);
    setBinSidebarLocationId(null);
    setBinSidebarStockItems([]);
  }, []);

  // Handle configure click (empty state)
  const handleConfigureClick = useCallback(() => {
    navigate('/warehouse');
  }, [navigate]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Show routing error toast
  useEffect(() => {
    if (routingError) {
      toast.error(routingError);
      clearRoutingError();
    }
  }, [routingError, clearRoutingError]);

  // Handle calculate route - triggers route calculation
  const handleCalculateRoute = useCallback(() => {
    // Use a start position near the warehouse entrance (0, 0, 0)
    const startPosition = new Vector3(0, 0, 0);
    calculateRoute(startPosition);
  }, [calculateRoute]);

  // Fly camera to route overview when route is calculated
  useEffect(() => {
    if (currentRoute && currentRoute.steps.length > 0) {
      // Calculate bounds of all route steps
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      let maxY = 0;

      currentRoute.steps.forEach(step => {
        const pos = step.item.position;
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minZ = Math.min(minZ, pos.z);
        maxZ = Math.max(maxZ, pos.z);
        maxY = Math.max(maxY, pos.y);
      });

      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const width = maxX - minX + 10;
      const depth = maxZ - minZ + 10;
      const distance = Math.max(width, depth) * 1.2;

      setCameraTarget({
        position: new Vector3(centerX + distance * 0.5, maxY + distance * 0.8, centerZ + distance * 0.5),
        lookAt: new Vector3(centerX, maxY / 2, centerZ),
        duration: 1200,
      });
    }
  }, [currentRoute]);

  // Handle route step click - fly to that location
  const handleRouteStepClick = useCallback((stepIndex: number) => {
    setHighlightedRouteStep(stepIndex);

    if (currentRoute && currentRoute.steps[stepIndex]) {
      const step = currentRoute.steps[stepIndex];
      const pos = step.item.position;

      setCameraTarget({
        position: new Vector3(pos.x + 3, pos.y + 2, pos.z + 4),
        lookAt: pos.clone(),
        duration: 600,
      });
    }
  }, [currentRoute]);

  // Handle routing mode toggle
  const handleToggleRoutingMode = useCallback(() => {
    setRoutingMode(prev => {
      if (!prev) {
        // Entering routing mode - fetch deliveries
        fetchDeliveries();
      } else {
        // Exiting routing mode - clear selection
        selectDelivery(null);
        setHighlightedRouteStep(undefined);
      }
      return !prev;
    });
  }, [fetchDeliveries, selectDelivery]);

  // Calculate if we can go back
  const canGoBack = navigationHistory.length > 0 || selectedLocationId !== null;

  // Show empty state if no locations
  const showEmptyState = !isLoading && selectedWarehouseId && locations.length === 0;

  return (
    <div className="flex flex-col h-full" style={{ background: colors.background }}>
      {/* Top toolbar */}
      <div
        className="flex items-center border-b"
        style={{ borderColor: colors.border }}
      >
        <Toolbar
          onBack={handleBack}
          onHome={handleHome}
          onHelp={() => setShowHelpTour(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          canGoBack={canGoBack}
        />

        {/* Breadcrumbs */}
        <div className="flex-1 overflow-hidden">
          <Breadcrumbs
            locations={locations}
            selectedLocationId={selectedLocationId}
            warehouseName={selectedWarehouse?.name}
            onNavigate={handleBreadcrumbNavigate}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          warehouses={warehouses}
          selectedWarehouseId={selectedWarehouseId}
          onWarehouseChange={handleWarehouseChange}
          locations={locations}
          selectedLocationId={selectedLocationId}
          onLocationSelect={handleLocationSelect}
          expandedNodes={expandedNodes}
          onToggleNode={handleToggleNode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onLocationDoubleClick={handleLocationDoubleClick}
          isLoading={isLoading}
          // Routing props
          routingMode={routingMode}
          onToggleRoutingMode={handleToggleRoutingMode}
          deliveries={deliveries}
          isLoadingDeliveries={isLoadingDeliveries}
          onRefreshDeliveries={fetchDeliveries}
          selectedDelivery={selectedDelivery}
          onSelectDelivery={(d) => { selectDelivery(d); }}
          moveLines={moveLines}
          isLoadingMoveLines={isLoadingMoveLines}
          pickItems={pickItems}
          isLoadingPickLocations={isLoadingPickLocations}
          currentRoute={currentRoute}
          routeAlgorithm={routeAlgorithm}
          onAlgorithmChange={setRouteAlgorithm}
          onCalculateRoute={handleCalculateRoute}
          routeComparison={routeComparison}
          routingError={routingError}
          onClearRoutingError={clearRoutingError}
          onRouteStepClick={handleRouteStepClick}
        />

        {/* 3D Scene */}
        <div className="flex-1 relative">
          {showEmptyState ? (
            <EmptyState onConfigureClick={handleConfigureClick} />
          ) : (
            <>
              <Scene
                locations={locations}
                selectedLocationId={selectedLocationId}
                onBinClick={handleBinClick}
                searchQuery={searchQuery}
                cameraTarget={cameraTarget}
                onCameraAnimationComplete={() => setCameraTarget(null)}
                // Routing props
                currentRoute={currentRoute}
                highlightedRouteStep={highlightedRouteStep}
                onRouteStepClick={handleRouteStepClick}
              />

              {/* Minimap */}
              <Minimap
                locations={locations}
                selectedLocationId={selectedLocationId}
                onNavigate={handleMinimapNavigate}
              />
            </>
          )}
        </div>
      </div>

      {/* Bin detail modal */}
      <BinModal
        isOpen={binModalOpen}
        onClose={handleCloseBinModal}
        locationId={binModalLocationId}
        locations={locations}
        stockItems={binStockItems}
        isLoading={isLoadingStock}
      />

      {/* Help tour */}
      <HelpTour
        isOpen={showHelpTour}
        onClose={() => setShowHelpTour(false)}
      />

      {/* Bin details sidebar */}
      <BinDetailsSidebar
        isOpen={binSidebarOpen}
        onClose={handleCloseBinSidebar}
        locationId={binSidebarLocationId}
        locations={locations}
        stockItems={binSidebarStockItems}
        isLoading={isLoadingStock}
      />
    </div>
  );
}

export default WarehouseNavigator;
