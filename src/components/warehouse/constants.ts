import { RackStatus, AisleColumn, RackCell, Item, Warehouse, Orientation, InboundShipment, Shelf } from './types';

// Translation helper type
type TranslationFunction = (key: string) => string;

export const CELL_SIZE = 40;
export const CELL_GAP = 6;
export const MAX_ZOOM = 4;
export const MIN_ZOOM = 0.2;

const ITEM_NAMES = [
  "Quantum Processor X2", "Hydraulic Piston A", "Neural Interface Kit", 
  "Graphene Sheet", "Optical Sensor Array", "Fusion Cell Battery", 
  "Titanium Fastener", "Liquid Cooling Unit", "Positron Emitter", "Nano-Weave Fiber"
];

const CATEGORIES = ["Electronics", "Raw Materials", "Components", "Hazardous"];

const WARNINGS = [
  "Structural integrity warning: Support beam stress detected",
  "Ambient temperature threshold exceeded (Max: 24°C)",
  "Humidity levels critical (>65%)",
  "Weight distribution unbalanced: Top-heavy",
  "Sensor malfunction: Optical gate obscured",
  "Unauthorized access detected on rear panel"
];

const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const generateItems = (count: number): Item[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `ITEM-${Math.floor(Math.random() * 10000)}`,
    name: ITEM_NAMES[Math.floor(Math.random() * ITEM_NAMES.length)],
    sku: `SKU-${Math.floor(Math.random() * 8999) + 1000}`,
    // Realistic warehouse quantities: 50 to 500 units per specific item entry
    quantity: Math.floor(Math.random() * 450) + 50,
    category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
  }));
};

const generateShelves = (rackId: string): Shelf[] => {
  const numShelves = 5; // Standard 5-tier rack
  return Array.from({ length: numShelves }).map((_, i) => {
    const level = i + 1;
    // Randomly determine if shelf has items based on rack context
    const hash = simpleHash(`${rackId}-S${level}`);
    const hasItems = (hash % 10) > 2; // 70% chance of items
    
    const itemCount = hasItems ? Math.floor(Math.random() * 3) + 1 : 0;
    const items = generateItems(itemCount);
    
    // Calculate realistic capacity
    const capacityPercentage = hasItems 
        ? Math.min(100, Math.floor(Math.random() * 50) + 40) // 40-90% if items exist
        : 0;

    return {
      id: `${rackId}-S${level}`,
      level,
      capacityPercentage,
      items
    };
  });
};

const getStatusFromHash = (hash: number): RackStatus => {
  const mod = hash % 100;
  if (mod < 8) return RackStatus.CRITICAL; 
  if (mod < 35) return RackStatus.FULL;     
  if (mod < 75) return RackStatus.PARTIAL;  
  return RackStatus.EMPTY;                  
};

// --- Warehouse A: Standard Vertical Layout ---
const generateWarehouseA = (): AisleColumn[] => {
  const aisles: AisleColumn[] = [];
  const startX = 100;
  const startY = 100;
  const columnGap = 20;
  const aisleGap = 80;
  const numAisles = 10;
  const racksPerAisle = 2; // Pairs
  const cellsPerRack = 16;

  let currentX = startX;

  for (let a = 0; a < numAisles; a++) {
    const aisleLabel = `A${a + 1}`;
    
    for (let r = 0; r < racksPerAisle; r++) {
       const columnId = `${aisleLabel}-${r === 0 ? 'L' : 'R'}`;
       const cells: RackCell[] = [];
       
       for (let c = 0; c < cellsPerRack; c++) {
         const cellId = `${columnId}-${c + 1}`;
         const hash = simpleHash(cellId);
         const status = getStatusFromHash(hash);
         
         let issueDescription = undefined;
         if (status === RackStatus.CRITICAL) {
            issueDescription = WARNINGS[hash % WARNINGS.length];
         }

         cells.push({
           id: cellId,
           label: (c + 1).toString().padStart(2, '0'),
           aisleId: aisleLabel,
           columnId: columnId,
           status: status,
           shelves: generateShelves(cellId),
           temperature: 20 + (hash % 5),
           humidity: 40 + (hash % 10),
           issueDescription,
           lastUpdated: new Date().toISOString(),
         });
       }

       aisles.push({
         id: columnId,
         label: r === 0 ? `${aisleLabel}-L` : `${aisleLabel}-R`,
         orientation: 'vertical',
         x: currentX,
         y: startY,
         cells
       });

       currentX += (CELL_SIZE + columnGap); 
    }
    currentX += aisleGap;
  }
  return aisles;
};

// --- Warehouse B: Mixed Layout (Horizontal & Vertical) ---
const generateWarehouseB = (): AisleColumn[] => {
  const aisles: AisleColumn[] = [];
  
  // Section 1: Top Horizontal Block (Back-to-back rows)
  const startY_H = 100;
  const startX_H = 150; 
  const rowPairGap = 20; 
  const rowAisleGap = 100; 
  
  let currentY = startY_H;
  
  for(let pair = 0; pair < 3; pair++) { 
    for(let r = 0; r < 2; r++) {
        const rowNum = (pair * 2) + r;
        const rowId = `H-R${rowNum}`;
        const cells: RackCell[] = [];
        const cellCount = 20;

        for(let c=0; c < cellCount; c++) {
            const cellId = `${rowId}-${c}`;
            const hash = simpleHash(cellId + "W2");
            const status = getStatusFromHash(hash);
            
            let issueDescription = undefined;
            if (status === RackStatus.CRITICAL) {
               issueDescription = WARNINGS[hash % WARNINGS.length];
            }

            cells.push({
                id: cellId,
                label: `Z${rowNum}-${c}`,
                aisleId: `Zone-A${pair+1}`,
                columnId: rowId,
                status: status,
                shelves: generateShelves(cellId),
                temperature: 18,
                humidity: 45,
                issueDescription,
                lastUpdated: new Date().toISOString(),
            });
        }

        aisles.push({
            id: rowId,
            label: `ROW ${rowNum + 1}`,
            orientation: 'horizontal',
            x: startX_H,
            y: currentY,
            cells
        });

        if (r === 0) {
            currentY += CELL_SIZE + rowPairGap; 
        } else {
            currentY += CELL_SIZE + rowAisleGap; 
        }
    }
  }

  // Section 2: Bottom Vertical Block (Back-to-back columns)
  const startY_V = currentY + 80; 
  const startX_V = 150;
  
  const colPairGap = 20;
  const colAisleGap = 80;
  let currentX = startX_V;

  for(let pair = 0; pair < 6; pair++) { 
     const pairLabel = pair + 1;
     
     for(let c = 0; c < 2; c++) {
         const colNum = (pair * 2) + c;
         const colId = `V-C${colNum}`;
         const cells: RackCell[] = [];
         const cellCount = 12;

         for(let cellIdx=0; cellIdx < cellCount; cellIdx++) {
            const cellId = `${colId}-${cellIdx}`;
            const hash = simpleHash(cellId + "W2V");
            const status = getStatusFromHash(hash);

            let issueDescription = undefined;
            if (status === RackStatus.CRITICAL) {
               issueDescription = WARNINGS[hash % WARNINGS.length];
            }

            cells.push({
                id: cellId,
                label: `B${colNum}-${cellIdx}`,
                aisleId: `Zone-B${pairLabel}`,
                columnId: colId,
                status: status,
                shelves: generateShelves(cellId),
                temperature: 22,
                humidity: 42,
                issueDescription,
                lastUpdated: new Date().toISOString(),
            });
         }

         aisles.push({
            id: colId,
            label: `COL ${colNum + 1}`,
            orientation: 'vertical',
            x: currentX,
            y: startY_V,
            cells
         });

         if (c === 0) {
             currentX += CELL_SIZE + colPairGap;
         } else {
             currentX += CELL_SIZE + colAisleGap;
         }
     }
  }

  return aisles;
};

export const WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-001',
    name: 'Logistics Hub Alpha',
    //location: 'San Francisco, CA',
    location: '',
    aisles: generateWarehouseA()
  },
  {
    id: 'wh-002',
    name: 'Distribution Center Beta',
    location: '',
    //location: 'Austin, TX',
    aisles: generateWarehouseB()
  }
];

export const INBOUND_SHIPMENTS: InboundShipment[] = [
  { id: 'S-1001', poNumber: 'PO-8832', supplier: 'Cyberdyne Systems', eta: '10:30 AM', items: 1500, status: 'Arriving', dock: 'Dock 4' },
  { id: 'S-1002', poNumber: 'PO-9941', supplier: 'Massive Dynamic', eta: '11:15 AM', items: 4200, status: 'Pending', dock: 'Dock 2' },
  { id: 'S-1003', poNumber: 'PO-7721', supplier: 'Aperture Science', eta: '02:00 PM', items: 850, status: 'Delayed', dock: 'Dock 1' },
  { id: 'S-1004', poNumber: 'PO-3321', supplier: 'Wayne Enterprises', eta: '04:45 PM', items: 12000, status: 'Pending', dock: 'Dock 5' },
  { id: 'S-1005', poNumber: 'PO-1123', supplier: 'Stark Industries', eta: '09:00 AM', items: 500, status: 'Arriving', dock: 'Dock 3' },
];

// Translation helper functions
export const getTranslatedItemName = (itemName: string, t: TranslationFunction): string => {
  return t(itemName) || itemName;
};

export const getTranslatedCategory = (category: string, t: TranslationFunction): string => {
  return t(category) || category;
};

export const getTranslatedWarning = (warning: string, t: TranslationFunction): string => {
  return t(warning) || warning;
};

export const getTranslatedWarehouseName = (name: string, t: TranslationFunction): string => {
  return t(name) || name;
};

export const getTranslatedWarehouseLocation = (location: string, t: TranslationFunction): string => {
  return t(location) || location;
};

export const getTranslatedSupplier = (supplier: string, t: TranslationFunction): string => {
  return t(supplier) || supplier;
};

export const getTranslatedStatus = (status: string, t: TranslationFunction): string => {
  return t(status) || status;
};

export const getTranslatedDock = (dock: string, t: TranslationFunction): string => {
  return t(dock) || dock;
};

// Helper to get translated warehouses
export const getTranslatedWarehouses = (t: TranslationFunction): Warehouse[] => {
  return WAREHOUSES.map(warehouse => ({
    ...warehouse,
    name: getTranslatedWarehouseName(warehouse.name, t),
    location: getTranslatedWarehouseLocation(warehouse.location, t),
    aisles: warehouse.aisles.map(aisle => ({
      ...aisle,
      cells: aisle.cells.map(cell => ({
        ...cell,
        shelves: cell.shelves.map(shelf => ({
          ...shelf,
          items: shelf.items.map(item => ({
            ...item,
            name: getTranslatedItemName(item.name, t),
            category: getTranslatedCategory(item.category, t),
          })),
        })),
        issueDescription: cell.issueDescription 
          ? getTranslatedWarning(cell.issueDescription, t)
          : undefined,
      })),
    })),
  }));
};

// Helper to get translated inbound shipments
export const getTranslatedInboundShipments = (t: TranslationFunction): InboundShipment[] => {
  return INBOUND_SHIPMENTS.map(shipment => ({
    ...shipment,
    supplier: getTranslatedSupplier(shipment.supplier, t),
    status: getTranslatedStatus(shipment.status, t) as InboundShipment['status'],
    dock: getTranslatedDock(shipment.dock, t),
  }));
};