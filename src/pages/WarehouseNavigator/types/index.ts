// Warehouse Navigator TypeScript Interfaces

import { Vector3 } from 'three';

// Location Types
export type LocationType = 'row' | 'bay' | 'level' | 'bin';
export type LocationUsage = 'internal' | 'view' | 'supplier' | 'customer' | 'inventory' | 'production' | 'transit';

// Parsed location from code pattern like AR14AF01
export interface ParsedLocation {
  row: string;      // AG, AH, etc.
  bay: number;      // 1-20
  level: string;    // AA-AG
  side: number;     // 1 or 2
}

// Odoo stock.location record
export interface OdooLocation {
  id: number;
  name: string;
  complete_name: string;
  usage: LocationUsage;
  location_id: [number, string] | false;
  parent_id?: [number, string] | false;
  child_ids?: number[];
  warehouse_id?: [number, string] | false;
  barcode?: string;
  posx?: number;
  posy?: number;
  posz?: number;
  active?: boolean;
  company_id?: [number, string] | false;
  scrap_location?: boolean;
  is_a_dock?: boolean;
  replenish_location?: boolean;
}

// Hierarchical location node for tree display
export interface LocationNode {
  id: number;
  name: string;
  completeName: string;
  usage: LocationUsage;
  type: LocationType;
  parentId: number | null;
  children: LocationNode[];
  hasStock: boolean;
  itemCount: number;
  totalQty: number;
  depth: number;
  position?: Vector3;
  parsed?: ParsedLocation;
}

// Odoo stock.warehouse record
export interface OdooWarehouse {
  id: number;
  name: string;
  code: string;
  lot_stock_id: [number, string] | false;
  view_location_id: [number, string] | false;
  company_id?: [number, string] | false;
  active?: boolean;
}

// Odoo stock.quant record
export interface OdooQuant {
  id: number;
  product_id: [number, string];
  location_id: [number, string];
  lot_id: [number, string] | false;
  quantity: number;
  reserved_quantity?: number;
  product_uom_id: [number, string];
  in_date?: string;
  inventory_quantity?: number;
}

// Stock item for display
export interface StockItem {
  productId: number;
  productName: string;
  quantity: number;
  lotId?: number;
  lotName?: string;
  uomId: number;
  uomName: string;
}

// Camera target for animations
export interface CameraTarget {
  position: Vector3;
  lookAt: Vector3;
  duration: number;
}

// WebSocket message types
export interface StockUpdateMessage {
  type: 'stock_update';
  location_id: number;
  warehouse_id: number;
  changes: {
    product_id: number;
    product_name: string;
    old_qty: number;
    new_qty: number;
    lot_id?: number;
  }[];
  timestamp: string;
}

// Connection status
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

// Global state interface
export interface WarehouseNavigatorState {
  // Data
  warehouses: OdooWarehouse[];
  selectedWarehouseId: number | null;
  locations: LocationNode[];
  stockCache: Map<number, StockItem[]>;

  // UI State
  selectedLocationId: number | null;
  expandedTreeNodes: Set<number>;
  searchQuery: string;
  visibleLevels: Set<string>;
  sidebarWidth: number;

  // Camera
  cameraPosition: Vector3;
  cameraTarget: Vector3;
  isAnimating: boolean;

  // Connection
  wsStatus: ConnectionStatus;

  // Modal
  binModalOpen: boolean;
  binModalLocationId: number | null;
}

// Context actions
export interface WarehouseNavigatorActions {
  setSelectedWarehouse: (id: number | null) => void;
  setSelectedLocation: (id: number | null) => void;
  toggleTreeNode: (id: number) => void;
  setSearchQuery: (query: string) => void;
  toggleLevelVisibility: (level: string) => void;
  setSidebarWidth: (width: number) => void;
  openBinModal: (locationId: number) => void;
  closeBinModal: () => void;
  flyToLocation: (target: CameraTarget) => void;
  fetchStockForLocation: (locationId: number) => Promise<void>;
}

// Color theme constants
export interface ColorTheme {
  floor: string;
  walls: string;
  rackStructure: string;
  binEmpty: string;
  binOccupied: string;
  aisles: string;
  selectionHighlight: string;
  background: string;
}

// Level codes
export const LEVEL_CODES = ['AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG'] as const;
export type LevelCode = typeof LEVEL_CODES[number];

// Layout constants
export interface LayoutConstants {
  ROW_SPACING: number;
  BACK_TO_BACK_GAP: number;
  BAY_WIDTH: number;
  LEVEL_HEIGHT: number;
  BIN_WIDTH: number;
  BIN_DEPTH: number;
  BAYS_PER_ROW: number;
  LEVELS_PER_RACK: number;
  BINS_PER_LEVEL: number;
}
