export enum RackStatus {
    EMPTY = 'EMPTY',
    PARTIAL = 'PARTIAL',
    FULL = 'FULL',
    CRITICAL = 'CRITICAL',
    RESERVED = 'RESERVED'
  }
  
  export interface Item {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    category: string;
  }
  
  export interface Shelf {
    id: string;
    level: number;
    capacityPercentage: number;
    items: Item[];
  }
  
  export interface RackCell {
    id: string;
    label: string; 
    aisleId: string;
    columnId: string;
    status: RackStatus;
    temperature?: number;
    humidity?: number;
    shelves: Shelf[];
    issueDescription?: string;
    lastUpdated: string;
  }
  
  export type Orientation = 'vertical' | 'horizontal';
  
  export interface AisleColumn {
    id: string; 
    label: string;
    x: number;      // Absolute grid X position
    y: number;      // Absolute grid Y position
    orientation: Orientation;
    cells: RackCell[];
  }
  
  export interface Warehouse {
    id: string;
    name: string;
    location: string;
    aisles: AisleColumn[];
  }
  
  export interface InboundShipment {
    id: string;
    poNumber: string;
    supplier: string;
    eta: string;
    items: number;
    status: 'Pending' | 'Arriving' | 'Delayed';
    dock: string;
  }
  
  export interface ViewState {
    scale: number;
    x: number;
    y: number;
  }
  
  export type TimeRange = 'Week' | 'Month' | 'Year';