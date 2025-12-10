"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/theme';
import { useAuth } from '../../context/auth';
import { API_CONFIG } from '../config/api';
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Settings,
  Warehouse,
  Layers,
  Grid3X3,
  Box,
  Package,
  ChevronRight,
  ChevronDown,
  Edit3,
  Check,
  X,
  Upload,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Move,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Constants matching WarehouseCanvas
const CELL_SIZE = 40;
const CELL_GAP = 6;

// Types
interface Shelf {
  id?: number;
  shelf_name: string;
  shelf_order: number;
  shelf_level: number;
  shelf_height: number;
  max_weight: number;
  odoo_location_id?: number;
}

interface Rack {
  id?: number;
  rack_name: string;
  rack_order: number;
  rack_height: number;
  rack_width: number;
  rack_depth: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  odoo_location_id?: number;
  shelves: Shelf[];
}

interface Row {
  id?: number;
  row_name: string;
  row_order: number;
  row_side: 'left' | 'right';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  odoo_location_id?: number;
  racks: Rack[];
}

interface RowPair {
  id?: number;
  pair_name: string;
  pair_order: number;
  position_x: number;
  position_y: number;
  left_row: Row;
  right_row: Row;
  // Aisle spacing is automatically calculated between row pairs
}

interface WarehouseConfig {
  id: number;
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  stock_location_id?: number;
  canvas_width: number;
  canvas_height: number;
  grid_size: number;
  default_shelves_per_rack: number;
  is_synced_to_odoo: boolean;
  row_pairs: RowPair[];
  // Legacy support - will be migrated
  aisles?: any[];
  rows?: Row[];
}

export function WarehouseConfigurationPage() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { sessionId } = useAuth();
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  // State
  const [config, setConfig] = useState<WarehouseConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Canvas state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Selection state
  const [selectedItem, setSelectedItem] = useState<{
    type: 'aisle' | 'row' | 'rack' | 'shelf';
    id: number | string;
    data: any;
  } | null>(null);

  // Sidebar state
  const [sidebarTab, setSidebarTab] = useState<'structure' | 'properties'>('structure');
  const [expandedAisles, setExpandedAisles] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedRacks, setExpandedRacks] = useState<Set<string>>(new Set());

  const getTenantId = () => localStorage.getItem('current_tenant_id');

  // Migration helper: Convert old aisles/rows structure to row_pairs
  const migrateConfigToRowPairs = (configData: any): WarehouseConfig => {
    // If already has row_pairs at top level, return as is
    if (configData.row_pairs && Array.isArray(configData.row_pairs)) {
      return configData as WarehouseConfig;
    }

    const allRowPairs: RowPair[] = [];

    // If has aisles structure, extract row_pairs from all aisles
    if (configData.aisles && Array.isArray(configData.aisles)) {
      configData.aisles.forEach((aisle: any) => {
        if (aisle.row_pairs && Array.isArray(aisle.row_pairs)) {
          // Aisle already has row_pairs, add them
          allRowPairs.push(...aisle.row_pairs);
        } else if (aisle.rows && Array.isArray(aisle.rows)) {
          // Convert rows to row_pairs
          const leftRows = aisle.rows.filter((r: Row) => r.row_side === 'left').sort((a, b) => a.row_order - b.row_order);
          const rightRows = aisle.rows.filter((r: Row) => r.row_side === 'right').sort((a, b) => a.row_order - b.row_order);

          const maxPairs = Math.max(leftRows.length, rightRows.length);
          for (let i = 0; i < maxPairs; i++) {
            const leftRow = leftRows[i];
            const rightRow = rightRows[i];
            
            if (leftRow || rightRow) {
              allRowPairs.push({
                pair_name: `P${allRowPairs.length + 1}`,
                pair_order: allRowPairs.length,
                position_x: leftRow?.position_x || (aisle.position_x - CELL_SIZE - CELL_GAP * 2),
                position_y: leftRow?.position_y || (aisle.position_y + i * (CELL_SIZE + CELL_GAP)),
                left_row: leftRow || {
                  row_name: `L${i + 1}`,
                  row_order: i * 2,
                  row_side: 'left' as const,
                  position_x: aisle.position_x - CELL_SIZE - CELL_GAP * 2,
                  position_y: aisle.position_y + i * (CELL_SIZE + CELL_GAP),
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  racks: []
                },
                right_row: rightRow || {
                  row_name: `R${i + 1}`,
                  row_order: i * 2 + 1,
                  row_side: 'right' as const,
                  position_x: aisle.position_x + (aisle.width || CELL_SIZE) + CELL_GAP * 2,
                  position_y: aisle.position_y + i * (CELL_SIZE + CELL_GAP),
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  racks: []
                }
              });
            }
          }
        }
      });
    }

    return {
      ...configData,
      row_pairs: allRowPairs
    } as WarehouseConfig;
  };

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch warehouse config
  useEffect(() => {
    console.log('[WarehouseConfigurationPage] useEffect triggered, warehouseId:', warehouseId);
    if (warehouseId) {
      console.log('[WarehouseConfigurationPage] Calling fetchConfig for warehouseId:', warehouseId);
      fetchConfig();
    } else {
      console.warn('[WarehouseConfigurationPage] No warehouseId provided, skipping fetchConfig');
    }
  }, [warehouseId]);

  const fetchConfig = async () => {
    console.log('[WarehouseConfigurationPage] fetchConfig started for warehouseId:', warehouseId);
    setLoading(true);
    try {
      const tenantId = getTenantId();
      console.log('[WarehouseConfigurationPage] Tenant ID:', tenantId, 'Session ID:', sessionId ? 'present' : 'missing');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tenantId) headers['X-Tenant-ID'] = tenantId;
      if (sessionId) headers['X-Odoo-Session'] = sessionId;

      const layoutUrl = `${API_CONFIG.BACKEND_BASE_URL}/warehouse-config/${warehouseId}/layout`;
      console.log('[WarehouseConfigurationPage] Fetching layout from:', layoutUrl);

      // First try to get existing config
      let response = await fetch(layoutUrl, { headers });
      console.log('[WarehouseConfigurationPage] Layout response status:', response.status, response.statusText);
      console.log('[WarehouseConfigurationPage] Response OK:', response.ok);
      
      let data;
      // Handle 404 or other non-OK responses
      if (!response.ok) {
        console.log('[WarehouseConfigurationPage] Response not OK, attempting to parse error response');
        // Try to parse JSON error response
        try {
          data = await response.json();
          console.log('[WarehouseConfigurationPage] Parsed error response:', data);
        } catch (parseError) {
          console.warn('[WarehouseConfigurationPage] Failed to parse error response as JSON:', parseError);
          // If JSON parsing fails, create default error object
          data = { success: false, error: 'Warehouse configuration not found', canCreate: true };
          console.log('[WarehouseConfigurationPage] Created default error object:', data);
        }
      } else {
        console.log('[WarehouseConfigurationPage] Response OK, parsing JSON');
        data = await response.json();
        console.log('[WarehouseConfigurationPage] Parsed success response:', data);
      }

      // If config doesn't exist (404 or success: false), initialize with empty structure
      if (!response.ok || !data.success || !data.data) {
        console.log('[WarehouseConfigurationPage] Config does not exist, initializing empty structure');
        console.log('[WarehouseConfigurationPage] Response details - OK:', response.ok, 'Data success:', data.success, 'Has data:', !!data.data);
        
        // Get warehouse info from Odoo to initialize the config
        const warehouseUrl = `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.warehouse/${warehouseId}`;
        console.log('[WarehouseConfigurationPage] Fetching warehouse info from:', warehouseUrl);
        
        const whResponse = await fetch(warehouseUrl, { headers });
        console.log('[WarehouseConfigurationPage] Warehouse info response status:', whResponse.status);
        
        const whData = await whResponse.json();
        console.log('[WarehouseConfigurationPage] Warehouse info response:', whData);

        if (whData.success && whData.data) {
          console.log('[WarehouseConfigurationPage] Warehouse info loaded successfully, initializing empty config');
          // Initialize with empty config structure so user can start creating layout
          const emptyConfig: WarehouseConfig = {
            id: 0,
            warehouse_id: parseInt(warehouseId!),
            warehouse_name: whData.data.name,
            warehouse_code: whData.data.code,
            stock_location_id: whData.data.lot_stock_id?.[0] || null,
            default_shelves_per_rack: 4,
            canvas_width: 1200,
            canvas_height: 800,
            grid_size: 20,
            is_synced_to_odoo: false,
            row_pairs: []
          };
          console.log('[WarehouseConfigurationPage] Setting empty config:', emptyConfig);
          setConfig(emptyConfig);
          // Don't show error - this is expected when creating a new layout
          console.log('[WarehouseConfigurationPage] Empty config initialized successfully');
          return;
        } else {
          // Failed to get warehouse info from Odoo
          console.error('[WarehouseConfigurationPage] Failed to get warehouse info from Odoo:', whData);
          setToast({ text: 'Failed to load warehouse information', type: 'error' });
          return;
        }
      }

      // Config exists, set it
      if (data.success && data.data) {
        console.log('[WarehouseConfigurationPage] Config exists, setting config with', data.data.aisles?.length || 0, 'aisles');
        
        // Migrate old structure (rows) to new structure (row_pairs) if needed
        const migratedData = migrateConfigToRowPairs(data.data);
        
        setConfig(migratedData);
        // Expand all row pairs by default
        const pairIds = migratedData.row_pairs?.map((p: RowPair, i: number) => `pair-${i}`) || [];
        console.log('[WarehouseConfigurationPage] Expanding row pairs:', pairIds);
        setExpandedRows(new Set(pairIds));
        console.log('[WarehouseConfigurationPage] Config loaded successfully');
      } else {
        // Unexpected error
        console.error('[WarehouseConfigurationPage] Unexpected error - data.success:', data.success, 'data:', data);
        setToast({ text: 'Failed to load warehouse configuration', type: 'error' });
      }
    } catch (error) {
      console.error('[WarehouseConfigurationPage] Error in fetchConfig:', error);
      console.error('[WarehouseConfigurationPage] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Try to initialize with empty config even on error
      console.log('[WarehouseConfigurationPage] Attempting fallback initialization');
      try {
        const tenantId = getTenantId();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (tenantId) headers['X-Tenant-ID'] = tenantId;
        if (sessionId) headers['X-Odoo-Session'] = sessionId;

        const whResponse = await fetch(
          `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.warehouse/${warehouseId}`,
          { headers }
        );
        console.log('[WarehouseConfigurationPage] Fallback warehouse info response status:', whResponse.status);
        
        const whData = await whResponse.json();
        console.log('[WarehouseConfigurationPage] Fallback warehouse info:', whData);

        if (whData.success && whData.data) {
          console.log('[WarehouseConfigurationPage] Fallback: Initializing empty config');
          // Initialize with empty config structure
          const emptyConfig: WarehouseConfig = {
            id: 0,
            warehouse_id: parseInt(warehouseId!),
            warehouse_name: whData.data.name,
            warehouse_code: whData.data.code,
            stock_location_id: whData.data.lot_stock_id?.[0] || null,
            default_shelves_per_rack: 4,
            canvas_width: 1200,
            canvas_height: 800,
            grid_size: 20,
            is_synced_to_odoo: false,
            row_pairs: []
          };
          console.log('[WarehouseConfigurationPage] Fallback: Setting empty config:', emptyConfig);
          setConfig(emptyConfig);
        } else {
          console.error('[WarehouseConfigurationPage] Fallback: Failed to get warehouse info');
          setToast({ text: 'Failed to load warehouse configuration', type: 'error' });
        }
      } catch (fallbackError) {
        console.error('[WarehouseConfigurationPage] Fallback error:', fallbackError);
        setToast({ text: 'Failed to load warehouse configuration', type: 'error' });
      }
    } finally {
      console.log('[WarehouseConfigurationPage] fetchConfig completed, setting loading to false');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const tenantId = getTenantId();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tenantId) headers['X-Tenant-ID'] = tenantId;
      if (sessionId) headers['X-Odoo-Session'] = sessionId;

      let configId = config.id;

      // If config doesn't exist yet (id is 0), create it first
      if (config.id === 0) {
        // Ensure we have stock_location_id - if not, fetch it from warehouse
        let stockLocationId = config.stock_location_id;
        if (!stockLocationId) {
          try {
            const whResponse = await fetch(
              `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.warehouse/${config.warehouse_id}`,
              { headers }
            );
            const whData = await whResponse.json();
            if (whData.success && whData.data) {
              // lot_stock_id is a many2one field, returns [id, name]
              stockLocationId = whData.data.lot_stock_id?.[0] || whData.data.lot_stock_id || null;
            }
          } catch (error) {
            console.error('Error fetching warehouse stock location:', error);
          }
        }

        const createResponse = await fetch(
          `${API_CONFIG.BACKEND_BASE_URL}/warehouse-config`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              warehouse_id: config.warehouse_id,
              warehouse_name: config.warehouse_name,
              warehouse_code: config.warehouse_code,
              stock_location_id: stockLocationId,
              default_shelves_per_rack: config.default_shelves_per_rack,
              canvas_width: config.canvas_width,
              canvas_height: config.canvas_height,
              grid_size: config.grid_size,
            }),
          }
        );

        const createData = await createResponse.json();
        if (!createData.success) {
          setToast({ text: createData.error || 'Failed to create warehouse configuration', type: 'error' });
          return;
        }

        // Update config with the new ID and stock_location_id
        configId = createData.data.id;
        setConfig(prev => prev ? { 
          ...prev, 
          id: configId,
          stock_location_id: stockLocationId || prev.stock_location_id
        } : null);
      }

      // Now save the layout
      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/warehouse-config/${configId}/layout`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ row_pairs: config.row_pairs }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setToast({ text: 'Layout saved successfully', type: 'success' });
        setHasChanges(false);
        // Refresh config to get updated data
        if (config.id === 0) {
          fetchConfig();
        }
      } else {
        setToast({ text: data.error || 'Failed to save layout', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving:', error);
      setToast({ text: 'Failed to save layout', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToOdoo = async () => {
    if (!config) return;

    // Check if config is saved first
    if (config.id === 0) {
      setToast({ 
        text: 'Please save the layout first before syncing to Odoo', 
        type: 'error' 
      });
      return;
    }

    // Check if stock_location_id is set
    if (!config.stock_location_id) {
      setToast({ 
        text: 'Stock location ID is missing. Please ensure the warehouse is properly configured.', 
        type: 'error' 
      });
      return;
    }

    setSyncing(true);
    try {
      const tenantId = getTenantId();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tenantId) headers['X-Tenant-ID'] = tenantId;
      if (sessionId) headers['X-Odoo-Session'] = sessionId;

      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/warehouse-config/${config.id}/sync`,
        {
          method: 'POST',
          headers,
        }
      );

      const data = await response.json();
      if (data.success) {
        setToast({ 
          text: `Synced to Odoo: ${data.locationsCreated} locations created`, 
          type: 'success' 
        });
        fetchConfig(); // Refresh to get updated Odoo IDs
      } else {
        setToast({ text: data.error || 'Failed to sync to Odoo', type: 'error' });
      }
    } catch (error) {
      console.error('Error syncing:', error);
      setToast({ text: 'Failed to sync to Odoo', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  // Row pair management - adds a pair of rows with automatic aisle spacing
  const addRowPair = () => {
    if (!config) return;
    
    const pairCount = config.row_pairs?.length || 0;
    
    // Calculate positions with automatic aisle spacing
    // Structure: [Left Row] [Aisle Gap] [Right Row] ... [Aisle Gap] [Left Row] [Aisle Gap] [Right Row]
    const ROW_WIDTH = CELL_SIZE;
    const AISLE_WIDTH = CELL_SIZE + CELL_GAP * 2; // Space for aisle between row pairs
    const ROW_PAIR_WIDTH = ROW_WIDTH * 2 + AISLE_WIDTH; // Total width of one row pair (left + aisle + right)
    const START_X = 100;
    const START_Y = 100;
    const VERTICAL_SPACING = CELL_SIZE + CELL_GAP; // Vertical spacing between racks in a row
    
    // Calculate X positions for this row pair
    const leftRowX = START_X + pairCount * ROW_PAIR_WIDTH;
    const rightRowX = leftRowX + ROW_WIDTH + AISLE_WIDTH;
    
    const leftRow: Row = {
      row_name: `L${pairCount + 1}`,
      row_order: pairCount * 2,
      row_side: 'left',
      position_x: leftRowX,
      position_y: START_Y,
      width: CELL_SIZE,
      height: CELL_SIZE,
      racks: [],
    };

    const rightRow: Row = {
      row_name: `R${pairCount + 1}`,
      row_order: pairCount * 2 + 1,
      row_side: 'right',
      position_x: rightRowX,
      position_y: START_Y,
      width: CELL_SIZE,
      height: CELL_SIZE,
      racks: [],
    };

    const newRowPair: RowPair = {
      pair_name: `P${pairCount + 1}`,
      pair_order: pairCount,
      position_x: leftRowX,
      position_y: START_Y,
      left_row: leftRow,
      right_row: rightRow,
    };

    setConfig(prev => prev ? {
      ...prev,
      row_pairs: [...(prev.row_pairs || []), newRowPair]
    } : null);
    setHasChanges(true);
  };

  const deleteRowPair = (pairIndex: number) => {
    if (!config) return;
    
    setConfig(prev => prev ? {
      ...prev,
      row_pairs: (prev.row_pairs || []).filter((_, i) => i !== pairIndex)
    } : null);
    setHasChanges(true);
    setSelectedItem(null);
  };

  // Rack management - adds rack to both rows in a pair
  const addRack = (pairIndex: number) => {
    if (!config) return;

    const rowPair = config.row_pairs?.[pairIndex];
    if (!rowPair) return;

    const row = rowPair.left_row; // Use left row for reference
    const rackCount = row.racks.length;
    
    // Calculate position - racks are stacked vertically in a row
    const newRack: Rack = {
      rack_name: `${rackCount + 1}`.padStart(2, '0'),
      rack_order: rackCount,
      rack_height: 3.0,
      rack_width: 1.0,
      rack_depth: 1.0,
      position_x: row.position_x,
      position_y: row.position_y + rackCount * (CELL_SIZE + CELL_GAP),
      width: CELL_SIZE,
      height: CELL_SIZE,
      shelves: [],
    };

    // Add default shelves
    const defaultShelves = config.default_shelves_per_rack || 4;
    for (let i = 0; i < defaultShelves; i++) {
      newRack.shelves.push({
        shelf_name: `S${i + 1}`,
        shelf_order: i,
        shelf_level: i + 1,
        shelf_height: 0.5,
        max_weight: 100,
      });
    }

    // Add to both rows in the pair
    setConfig(prev => {
      if (!prev) return null;
      const pair = prev.row_pairs?.[pairIndex];
      if (!pair) return prev;
      
      const updatedPair: RowPair = {
        ...pair,
        left_row: {
          ...pair.left_row,
          racks: [...pair.left_row.racks, { ...newRack }]
        },
        right_row: {
          ...pair.right_row,
          racks: [...pair.right_row.racks, { 
            ...newRack,
            position_x: pair.right_row.position_x 
          }]
        }
      };

      return {
        ...prev,
        row_pairs: prev.row_pairs?.map((p, i) => 
          i === pairIndex ? updatedPair : p
        ) || []
      };
    });
    setHasChanges(true);
  };

  const deleteRack = (pairIndex: number, rackIndex: number) => {
    if (!config) return;

    // Delete from both rows in the pair
    setConfig(prev => {
      if (!prev) return null;
      const pair = prev.row_pairs?.[pairIndex];
      if (!pair) return prev;

      const updatedPair: RowPair = {
        ...pair,
        left_row: {
          ...pair.left_row,
          racks: pair.left_row.racks.filter((_, ri) => ri !== rackIndex)
        },
        right_row: {
          ...pair.right_row,
          racks: pair.right_row.racks.filter((_, ri) => ri !== rackIndex)
        }
      };

      return {
        ...prev,
        row_pairs: prev.row_pairs?.map((p, i) => 
          i === pairIndex ? updatedPair : p
        ) || []
      };
    });
    setHasChanges(true);
    setSelectedItem(null);
  };

  // Shelf management
  const addShelf = (pairIndex: number, rackIndex: number) => {
    if (!config) return;

    const rowPair = config.row_pairs?.[pairIndex];
    if (!rowPair) return;

    const rack = rowPair.left_row.racks[rackIndex];
    const newShelf: Shelf = {
      shelf_name: `S${rack.shelves.length + 1}`,
      shelf_order: rack.shelves.length,
      shelf_level: rack.shelves.length + 1,
      shelf_height: 0.5,
      max_weight: 100,
    };

    setConfig(prev => {
      if (!prev) return null;
      const pair = prev.row_pairs?.[pairIndex];
      if (!pair) return prev;

      const updatedLeftRacks = pair.left_row.racks.map((r, ri) => 
        ri === rackIndex ? { ...r, shelves: [...r.shelves, newShelf] } : r
      );
      const updatedRightRacks = pair.right_row.racks.map((r, ri) => 
        ri === rackIndex ? { ...r, shelves: [...r.shelves, newShelf] } : r
      );

      const updatedPair: RowPair = {
        ...pair,
        left_row: {
          ...pair.left_row,
          racks: updatedLeftRacks
        },
        right_row: {
          ...pair.right_row,
          racks: updatedRightRacks
        }
      };

      return {
        ...prev,
        row_pairs: prev.row_pairs?.map((p, i) => 
          i === pairIndex ? updatedPair : p
        ) || []
      };
    });
    setHasChanges(true);
  };

  const deleteShelf = (pairIndex: number, rackIndex: number, shelfIndex: number) => {
    if (!config) return;

    setConfig(prev => {
      if (!prev) return null;
      const pair = prev.row_pairs?.[pairIndex];
      if (!pair) return prev;

      const updatedLeftRacks = pair.left_row.racks.map((r, ri) => 
        ri === rackIndex ? { ...r, shelves: r.shelves.filter((_, si) => si !== shelfIndex) } : r
      );
      const updatedRightRacks = pair.right_row.racks.map((r, ri) => 
        ri === rackIndex ? { ...r, shelves: r.shelves.filter((_, si) => si !== shelfIndex) } : r
      );

      const updatedPair: RowPair = {
        ...pair,
        left_row: {
          ...pair.left_row,
          racks: updatedLeftRacks
        },
        right_row: {
          ...pair.right_row,
          racks: updatedRightRacks
        }
      };

      return {
        ...prev,
        row_pairs: prev.row_pairs?.map((p, i) => 
          i === pairIndex ? updatedPair : p
        ) || []
      };
    });
    setHasChanges(true);
  };

  // Keyboard handlers for space+drag panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Canvas interactions - similar to WarehouseCanvas
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Pan with left mouse button (like WarehouseCanvas)
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  // Mouse wheel zoom - similar to WarehouseCanvas
  const handleWheel = (e: React.WheelEvent) => {
    const container = canvasRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - pan.x) / zoom;
    const worldY = (mouseY - pan.y) / zoom;

    const scaleAmount = -e.deltaY * 0.0015;
    const newZoom = Math.max(0.25, Math.min(3, zoom + scaleAmount));

    const newX = mouseX - worldX * newZoom;
    const newY = mouseY - worldY * newZoom;

    setZoom(newZoom);
    setPan({ x: newX, y: newY });
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.1, 3);
    setZoom(newZoom);
  };
  
  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.1, 0.25);
    setZoom(newZoom);
  };
  
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Toggle expansion
  const toggleAisle = (id: string) => {
    setExpandedAisles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRack = (id: string) => {
    setExpandedRacks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Loader2 size={32} className="animate-spin" style={{ color: colors.textSecondary }} />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: colors.background }}>
        <AlertCircle size={48} style={{ color: colors.textSecondary }} />
        <p style={{ color: colors.textPrimary }}>Warehouse configuration not found</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-xl"
          style={{ backgroundColor: colors.mutedBg, color: colors.textPrimary }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.background }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2"
            style={{
              backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
              color: 'white'
            }}
          >
            {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            style={{ color: colors.textSecondary }}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}
            >
              <Warehouse size={20} style={{ color: 'white' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                {config.warehouse_name}
              </h1>
              <p className="text-xs" style={{ color: colors.textSecondary }}>
                {t("Configure warehouse layout")} • Code: {config.warehouse_code}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSyncToOdoo}
            disabled={syncing || hasChanges}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: colors.mutedBg, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
          >
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {t("Sync to Odoo")}
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#4FACFE', color: 'white' }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {t("Save Layout")}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Structure Tree */}
        <div 
          className="w-80 shrink-0 flex flex-col overflow-hidden"
          style={{ borderRight: `1px solid ${colors.border}` }}
        >
          {/* Sidebar Header */}
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <h3 className="font-medium flex items-center gap-2" style={{ color: colors.textPrimary }}>
              <Layers size={16} />
              {t("Structure")}
            </h3>
            <button
              onClick={addRowPair}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: '#4facfe20', color: '#4facfe' }}
            >
              <Plus size={12} />
              {t("Add Row Pair")}
            </button>
          </div>

          {/* Tree View */}
          <div className="flex-1 overflow-y-auto p-2">
            {!config.row_pairs || config.row_pairs.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: colors.textSecondary }}>
                {t("No row pairs yet. Click 'Add Row Pair' to start.")}
              </div>
            ) : (
              <div className="space-y-1">
                {(config.row_pairs || []).map((rowPair, pairIndex) => {
                  const pairId = `pair-${pairIndex}`;
                  const isPairExpanded = expandedRows.has(pairId);
                  const rackCount = rowPair.left_row.racks.length; // Both rows have same count

                  return (
                    <div key={pairId}>
                      {/* Row Pair */}
                      <div 
                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer group"
                        style={{ 
                          backgroundColor: selectedItem?.type === 'row' && selectedItem.id === pairId 
                            ? colors.mutedBg : 'transparent'
                        }}
                        onClick={() => {
                          toggleRow(pairId);
                          setSelectedItem({ type: 'row', id: pairId, data: { pairIndex, rowPair } });
                        }}
                      >
                        {isPairExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  <Box size={14} style={{ color: '#3b82f6' }} />
                                  <span className="flex-1 text-sm" style={{ color: colors.textPrimary }}>
                          {rowPair.pair_name || `Pair ${pairIndex + 1}`}
                        </span>
                        <span className="text-xs" style={{ color: colors.textSecondary }}>
                          {rackCount} racks
                                  </span>
                                  <button
                          onClick={(e) => { e.stopPropagation(); deleteRowPair(pairIndex); }}
                                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20"
                                    style={{ color: '#ef4444' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>

                      {/* Racks - Show from left row (both rows have same racks) */}
                      {isPairExpanded && (
                                  <div className="ml-4 space-y-1">
                                    <button
                            onClick={() => addRack(pairIndex)}
                                      className="w-full flex items-center justify-center gap-1 py-1 rounded text-xs"
                                      style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}
                                    >
                            <Plus size={10} /> Add Rack (to both rows)
                                    </button>

                          {rowPair.left_row.racks.map((rack, rackIndex) => {
                            const rackId = `${pairId}-rack-${rackIndex}`;
                                      const isRackExpanded = expandedRacks.has(rackId);

                                      return (
                                        <div key={rackId}>
                                          <div 
                                            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer group"
                                            style={{ 
                                    backgroundColor: selectedItem?.type === 'rack' && String(selectedItem.id || '').includes(rackId)
                                                ? colors.mutedBg : 'transparent'
                                            }}
                                            onClick={() => {
                                              toggleRack(rackId);
                                              setSelectedItem({ 
                                                type: 'rack', 
                                      id: `${pairId}-L-${rackIndex}`, 
                                      data: { pairIndex, side: 'left', rackIndex, rack } 
                                              });
                                            }}
                                          >
                                            {isRackExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            <Package size={14} style={{ color: '#10b981' }} />
                                            <span className="flex-1 text-sm" style={{ color: colors.textPrimary }}>
                                              {rack.rack_name}
                                            </span>
                                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                                              {rack.shelves.length} shelves
                                            </span>
                                            <button
                                    onClick={(e) => { e.stopPropagation(); deleteRack(pairIndex, rackIndex); }}
                                              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20"
                                              style={{ color: '#ef4444' }}
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>

                                          {/* Shelves */}
                                          {isRackExpanded && (
                                            <div className="ml-6 space-y-1">
                                              <button
                                      onClick={() => addShelf(pairIndex, rackIndex)}
                                                className="w-full flex items-center justify-center gap-1 py-1 rounded text-xs"
                                                style={{ backgroundColor: colors.mutedBg, color: colors.textSecondary }}
                                              >
                                                <Plus size={10} /> Add Shelf
                                              </button>

                                              {rack.shelves.map((shelf, shelfIndex) => (
                                                <div
                                                  key={shelfIndex}
                                                  className="flex items-center gap-2 p-1.5 rounded text-xs group"
                                                  style={{ 
                                                    backgroundColor: selectedItem?.type === 'shelf' && selectedItem.id === `${rackId}-shelf-${shelfIndex}`
                                                      ? colors.mutedBg : 'transparent'
                                                  }}
                                                  onClick={() => setSelectedItem({
                                                    type: 'shelf',
                                                    id: `${rackId}-shelf-${shelfIndex}`,
                                          data: { pairIndex, rackIndex, shelfIndex, shelf }
                                                  })}
                                                >
                                                  <Layers size={12} style={{ color: '#8b5cf6' }} />
                                                  <span className="flex-1" style={{ color: colors.textPrimary }}>
                                                    {shelf.shelf_name} (Level {shelf.shelf_level})
                                                  </span>
                                                  <button
                                          onClick={(e) => { e.stopPropagation(); deleteShelf(pairIndex, rackIndex, shelfIndex); }}
                                                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20"
                                                    style={{ color: '#ef4444' }}
                                                  >
                                                    <Trash2 size={10} />
                                                  </button>
                                                </div>
                                              ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: colors.card }}>
          {/* Canvas Controls - Matching WarehouseCanvas style */}
          <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-2 backdrop-blur p-2 rounded-lg shadow-xl" style={{ 
            background: colors.background === '#ffffff' || colors.background === '#FFFFFF' ? '#ffffffE6' : colors.card,
            border: `1px solid ${colors.border}`
          }}>
            <button 
              className="w-8 h-8 flex items-center justify-center rounded font-bold transition-colors"
              style={{ color: colors.textPrimary }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.mutedBg}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              onClick={handleZoomIn}
              title="Zoom In"
            >+</button>
            <div 
              className="w-8 text-center text-[10px] font-mono py-1"
              style={{ color: colors.textSecondary }}
            >
              {Math.round(zoom * 100)}%
            </div>
            <button 
              className="w-8 h-8 flex items-center justify-center rounded font-bold transition-colors"
              style={{ color: colors.textPrimary }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.mutedBg}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              onClick={handleZoomOut}
              title="Zoom Out"
            >-</button>
            <button 
              className="w-8 h-8 flex items-center justify-center rounded font-bold transition-colors mt-1"
              style={{ color: colors.textPrimary }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.mutedBg}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              onClick={handleResetView}
              title="Reset View"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
            style={{
              background: colors.card
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onWheel={handleWheel}
          >
            {/* Grid - Radial gradient dots like WarehouseCanvas */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{
                backgroundImage: `radial-gradient(${colors.textPrimary} 1px, transparent 1px)`,
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`
              }}
            />

            <div
              className="absolute top-0 left-0 transition-transform duration-[50ms] ease-out origin-top-left will-change-transform"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                width: config.canvas_width,
                height: config.canvas_height,
                position: 'relative',
              }}
            >

              {/* Row Pairs with Racks */}
              {(config.row_pairs || []).map((rowPair, pairIndex) => {
                const pairId = `pair-${pairIndex}`;
                const AISLE_WIDTH = CELL_SIZE + CELL_GAP * 2;
                const aisleCenterX = rowPair.left_row.position_x + CELL_SIZE + AISLE_WIDTH / 2;
                
                return (
                  <div key={pairId}>
                    {/* Aisle Label (between left and right rows) */}
                    <div 
                      className="absolute text-[10px] font-bold tracking-wider uppercase whitespace-nowrap"
                  style={{
                        left: aisleCenterX,
                        top: rowPair.position_y - 20,
                        transform: 'translateX(-50%)',
                        color: colors.textSecondary 
                      }}
                    >
                      {rowPair.pair_name || `Pair ${pairIndex + 1}`}
                </div>

                    {/* Left Row - Vertical column of racks */}
                  <div
                      className="absolute flex flex-col"
                    style={{
                        left: rowPair.left_row.position_x,
                        top: rowPair.left_row.position_y,
                        gap: CELL_GAP
                      }}
                    >
                      {rowPair.left_row.racks.map((rack, rackIndex) => {
                        const rackId = `${pairId}-L-${rackIndex}`;
                        const isSelected = selectedItem?.type === 'rack' && selectedItem.id === rackId;
                        
                        return (
                          <div
                            key={rackId}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem({ 
                                type: 'rack', 
                                id: rackId, 
                                data: { pairIndex, side: 'left', rackIndex, rack } 
                              });
                            }}
                            className={`rounded-[4px] flex items-center justify-center text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                              isSelected 
                                ? 'bg-zinc-900 ring-2 ring-zinc-900 ring-offset-2 z-10 text-white' 
                                : 'bg-zinc-300 hover:bg-zinc-400 text-zinc-600'
                            }`}
                            style={{ 
                              width: CELL_SIZE, 
                              height: CELL_SIZE,
                            }}
                          >
                            {rack.rack_name}
                  </div>
                        );
                      })}
                    </div>

                    {/* Right Row - Vertical column of racks */}
                    <div
                      className="absolute flex flex-col"
                      style={{
                        left: rowPair.right_row.position_x,
                        top: rowPair.right_row.position_y,
                        gap: CELL_GAP
                      }}
                    >
                      {rowPair.right_row.racks.map((rack, rackIndex) => {
                        const rackId = `${pairId}-R-${rackIndex}`;
                        const isSelected = selectedItem?.type === 'rack' && selectedItem.id === rackId;
                        
                        return (
                          <div
                            key={rackId}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem({ 
                        type: 'rack', 
                                id: rackId, 
                                data: { pairIndex, side: 'right', rackIndex, rack } 
                              });
                            }}
                            className={`rounded-[4px] flex items-center justify-center text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                              isSelected 
                                ? 'bg-zinc-900 ring-2 ring-zinc-900 ring-offset-2 z-10 text-white' 
                                : 'bg-zinc-300 hover:bg-zinc-400 text-zinc-600'
                            }`}
                            style={{ 
                              width: CELL_SIZE, 
                              height: CELL_SIZE,
                            }}
                          >
                        {rack.rack_name}
                    </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WarehouseConfigurationPage;
