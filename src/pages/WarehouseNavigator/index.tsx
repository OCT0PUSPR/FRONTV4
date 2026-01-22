// Warehouse Navigator - Main Page Component
// 3D interactive visualization of warehouse storage locations

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useTheme } from '../../../context/theme';
import { useAuth } from '../../../context/auth';
import { CameraTarget, StockItem, LEVEL_CODES } from './types';
import { useWarehouseData } from './hooks/useWarehouseData';
import { useWebSocket } from './hooks/useWebSocket';
import { findNodeById, getAncestorIds } from './utils/hierarchyBuilder';
import { getCameraPositionForWarehouse, calculateWarehouseBounds, calculatePosition } from './utils/positionCalculator';
import { Vector3 } from 'three';

// Components
import { Scene } from './components/Scene';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { Breadcrumbs } from './components/Breadcrumbs';
import { BinModal } from './components/BinModal';
import { ConnectionStatus } from './components/ConnectionStatus';
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

  // State
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleLevels, setVisibleLevels] = useState<Set<string>>(new Set(LEVEL_CODES));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelpTour, setShowHelpTour] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([]);

  // Modal state
  const [binModalOpen, setBinModalOpen] = useState(false);
  const [binModalLocationId, setBinModalLocationId] = useState<number | null>(null);
  const [binStockItems, setBinStockItems] = useState<StockItem[]>([]);

  // WebSocket for real-time updates
  const { status: wsStatus } = useWebSocket({
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

  // Get selected warehouse
  const selectedWarehouse = useMemo(() => {
    return warehouses.find(w => w.id === selectedWarehouseId);
  }, [warehouses, selectedWarehouseId]);

  // Handle warehouse change
  const handleWarehouseChange = useCallback((id: number) => {
    setSelectedWarehouseId(id);
  }, []);

  // Handle location selection
  const handleLocationSelect = useCallback((id: number) => {
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

    // Fly camera to location
    const node = findNodeById(locations, id);
    if (node?.parsed) {
      const position = calculatePosition(node.parsed);
      const cameraPosition = new Vector3(
        position.x,
        position.y + 3,
        position.z + 5
      );
      setCameraTarget({
        position: cameraPosition,
        lookAt: position,
        duration: 800,
      });
    }
  }, [locations, selectedLocationId]);

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

  // Handle level toggle
  const handleToggleLevel = useCallback((level: string) => {
    setVisibleLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
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
          visibleLevels={visibleLevels}
          onToggleLevel={handleToggleLevel}
          onLocationDoubleClick={handleLocationDoubleClick}
          isLoading={isLoading}
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
                visibleLevels={visibleLevels}
                searchQuery={searchQuery}
                cameraTarget={cameraTarget}
                onCameraAnimationComplete={() => setCameraTarget(null)}
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

      {/* Status bar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-t text-xs"
        style={{ borderColor: colors.border, color: colors.textSecondary }}
      >
        <ConnectionStatus status={wsStatus} />
        <span>
          {t('warehouse_navigator.stock_updates', 'Stock updates')}: {wsStatus === 'connected' ? t('warehouse_navigator.live', 'Live') : '—'}
        </span>
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
    </div>
  );
}

export default WarehouseNavigator;
