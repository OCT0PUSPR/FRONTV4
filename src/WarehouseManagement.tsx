import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WarehouseCanvas } from './components/warehouse/WarehouseCanvas';
import { RackBinSidebar } from './components/warehouse/RackBinSidebar';
import { AnalyticsPanel } from './components/warehouse/AnalyticsPortal';
import { InboundModal } from './components/warehouse/InboundModal';
import { Header } from './components/warehouse/Header';
import { RackCell, Warehouse, TimeRange, AisleColumn } from './components/warehouse/types';
import { WAREHOUSES } from './components/warehouse/constants';
import { useTheme } from '../context/theme';
import { AddWarehouseModal } from './components/warehouse/AddWarehouseModal';
import { useWarehouseData } from './pages/WarehouseNavigator/hooks/useWarehouseData';
import { convertOdooToAisleColumns, convertZonesToAisleColumns, calculateOdooStats } from './components/warehouse/odooConverter';


interface WarehouseManagementProps {
  // Props can be extended as needed
}

export const WarehouseManagement: React.FC<WarehouseManagementProps> = () => {
  const { colors } = useTheme();
  const navigate = useNavigate();

  // Odoo warehouse data hook
  const {
    warehouses: odooWarehouses,
    locations: odooLocations,
    isLoading,
    error,
    fetchWarehouses,
    fetchLocations,
    fetchStockForLocation,
  } = useWarehouseData();

  // State for Global Navigation
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>('Week');

  // Add warehouse modal state
  const [isAddWarehouseModalOpen, setIsAddWarehouseModalOpen] = useState(false);

  // Fetch warehouses on mount
  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // Auto-select first warehouse when loaded
  useEffect(() => {
    if (odooWarehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(odooWarehouses[0].id.toString());
    }
  }, [odooWarehouses, selectedWarehouseId]);

  // Fetch locations when warehouse is selected
  useEffect(() => {
    if (selectedWarehouseId && odooWarehouses.length > 0) {
      const warehouseIdNum = parseInt(selectedWarehouseId, 10);
      if (!isNaN(warehouseIdNum)) {
        fetchLocations(warehouseIdNum);
      }
    }
  }, [selectedWarehouseId, odooWarehouses, fetchLocations]);

  // Convert Odoo locations to AisleColumn format for the canvas
  const odooAisles = useMemo(() => {
    if (odooLocations.length === 0) return [];

    // Get rack aisles
    const rackAisles = convertOdooToAisleColumns(odooLocations);

    // Get zone aisles (docks, staging, etc.)
    // Calculate offset based on rack layout
    const maxY = rackAisles.reduce((max, aisle) => {
      const aisleBottom = aisle.y + (aisle.cells.length * 46); // CELL_SIZE + CELL_GAP
      return Math.max(max, aisleBottom);
    }, 0);
    const zoneAisles = convertZonesToAisleColumns(odooLocations, maxY);

    return [...rackAisles, ...zoneAisles];
  }, [odooLocations]);

  // Create warehouse object for canvas (combining Odoo data with expected format)
  const warehouse: Warehouse = useMemo(() => {
    const selectedOdoo = odooWarehouses.find(w => w.id.toString() === selectedWarehouseId);

    if (selectedOdoo && odooAisles.length > 0) {
      return {
        id: selectedOdoo.id.toString(),
        name: selectedOdoo.name,
        location: selectedOdoo.code || '',
        aisles: odooAisles,
      };
    }

    // Fallback to mock data if no Odoo data
    return WAREHOUSES.find(w => w.id === selectedWarehouseId) || WAREHOUSES[0];
  }, [selectedWarehouseId, odooWarehouses, odooAisles]);

  // Local View States
  const [selectedRack, setSelectedRack] = useState<RackCell | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true);
  const [analyticsWidth, setAnalyticsWidth] = useState(320);
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);

  // Calculate detailed summary stats - use Odoo data when available
  const stats = useMemo(() => {
    // If we have Odoo locations, calculate from them directly
    if (odooLocations.length > 0) {
      return calculateOdooStats(odooLocations);
    }

    // Fallback to calculating from warehouse aisles (mock data)
    let totalUnits = 0;
    let totalCells = 0;
    let critical = 0;
    let full = 0;
    let totalCapacityPercentage = 0;
    let totalShelves = 0;

    warehouse.aisles.forEach(col => {
      col.cells.forEach(cell => {
        totalCells++;

        // Sum items from all shelves
        cell.shelves.forEach(shelf => {
          totalShelves++;
          totalCapacityPercentage += shelf.capacityPercentage;
          shelf.items.forEach(item => {
            totalUnits += item.quantity;
          });
        });

        if (cell.status === 'CRITICAL') critical++;
        if (cell.status === 'FULL') full++;
      });
    });

    // Calculate average capacity utilization across all shelves in the warehouse
    const utilization = totalShelves > 0 ? Math.round(totalCapacityPercentage / totalShelves) : 0;

    return {
      totalUnits,
      totalCells,
      critical,
      full,
      utilization
    };
  }, [warehouse, odooLocations]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: colors.background }}>
      <style>{`
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${colors.textSecondary}; }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-slide-in { animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
      
      {/* Integrated Header */}
      
      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Analytics Sidebar */}
        <AnalyticsPanel 
          stats={stats} 
          isOpen={isAnalyticsOpen}
          width={analyticsWidth}
          onToggle={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
          onResize={setAnalyticsWidth}
          onOpenInbound={() => setIsInboundModalOpen(true)}
          selectedWarehouseId={selectedWarehouseId}
          onSelectWarehouse={setSelectedWarehouseId}
          onAddWarehouse={() => setIsAddWarehouseModalOpen(true)}
          onConfigureWarehouse={(warehouseId) => navigate(`/warehouse-configuration/${warehouseId}`)}
          colors={colors}
        />

        {/* Canvas & Details Area */}
        <main className="flex-1 relative h-full overflow-hidden" style={{ background: colors.background }}>
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 p-6 rounded-lg" style={{ background: colors.card }}>
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: colors.action }} />
                <span style={{ color: colors.textSecondary }}>Loading warehouse data...</span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <span className="text-red-500 text-sm">{error}</span>
            </div>
          )}

          <WarehouseCanvas
            data={warehouse.aisles}
            onRackSelect={setSelectedRack}
            selectedRackId={selectedRack?.id || null}
            colors={colors}
          />

          {/* Slide-over Sidebar (Right) - Rack > Bins > Items drill-down */}
          <RackBinSidebar
            rack={selectedRack}
            onClose={() => setSelectedRack(null)}
            colors={colors}
            odooLocations={odooLocations}
            fetchStockForLocation={fetchStockForLocation}
          />

          {/* Modals - Positioned within the main content area */}
          <InboundModal
            isOpen={isInboundModalOpen}
            onClose={() => setIsInboundModalOpen(false)}
            warehouseId={selectedWarehouseId}
            colors={colors}
          />
          
          {/* Add Warehouse Modal */}
          <AddWarehouseModal
            isOpen={isAddWarehouseModalOpen}
            onClose={() => setIsAddWarehouseModalOpen(false)}
            onSuccess={(warehouse) => {
              console.log('Warehouse created:', warehouse);
              // Optionally navigate to configure the new warehouse
              navigate(`/warehouse-configuration/${warehouse.id}`);
            }}
            colors={colors}
          />
        </main>
      </div>
    </div>
  );
};