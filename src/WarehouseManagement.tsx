import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WarehouseCanvas } from './components/warehouse/WarehouseCanvas';
import { RackDetailsSidebar } from './components/warehouse/rackDetails';
import { AnalyticsPanel } from './components/warehouse/AnalyticsPortal';
import { InboundModal } from './components/warehouse/InboundModal';
import { Header } from './components/warehouse/Header';
import { RackCell, Warehouse, InboundShipment, TimeRange } from './components/warehouse/types';
import { WAREHOUSES } from './components/warehouse/constants';
import { useTheme } from '../context/theme';
import { AddWarehouseModal } from './components/warehouse/AddWarehouseModal';


interface WarehouseManagementProps {
  inboundShipments: InboundShipment[];
}

export const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ 
  inboundShipments 
}) => {
  const { colors } = useTheme();
  const navigate = useNavigate();
  
  // State for Global Navigation (Moved from App.tsx)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(WAREHOUSES[0].id);
  const [timeRange, setTimeRange] = useState<TimeRange>('Week');
  
  // Add warehouse modal state
  const [isAddWarehouseModalOpen, setIsAddWarehouseModalOpen] = useState(false);

  // Computed Warehouse Data
  const warehouse = useMemo(() => 
    WAREHOUSES.find(w => w.id === selectedWarehouseId) || WAREHOUSES[0]
  , [selectedWarehouseId]);

  // Local View States
  const [selectedRack, setSelectedRack] = useState<RackCell | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true);
  const [analyticsWidth, setAnalyticsWidth] = useState(320);
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);

  // Calculate detailed summary stats
  const stats = useMemo(() => {
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
  }, [warehouse]);

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
          <WarehouseCanvas 
            data={warehouse.aisles} 
            onRackSelect={setSelectedRack}
            selectedRackId={selectedRack?.id || null}
            colors={colors}
          />

          {/* Slide-over Sidebar (Right) */}
          <RackDetailsSidebar 
            rack={selectedRack} 
            onClose={() => setSelectedRack(null)}
            colors={colors}
          />

          {/* Modals - Positioned within the main content area */}
          <InboundModal 
            isOpen={isInboundModalOpen} 
            onClose={() => setIsInboundModalOpen(false)}
            shipments={inboundShipments}
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