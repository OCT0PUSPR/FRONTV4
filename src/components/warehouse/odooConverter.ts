// Converter: Transforms Odoo LocationNode hierarchy to WarehouseCanvas format
// This bridges the WarehouseNavigator's Odoo data with the 2D warehouse view

import { AisleColumn, RackCell, RackStatus, Shelf, Item } from './types';
import { LocationNode } from '../../pages/WarehouseNavigator/types';
import { CELL_SIZE, CELL_GAP } from './constants';

// Layout constants for 2D view
const ROW_PAIR_GAP = 20;     // Gap between back-to-back rows
const AISLE_GAP = 80;        // Gap between row pairs (aisle width)
const START_X = 100;
const START_Y = 100;

/**
 * Determine rack status based on stock levels
 */
function getStatusFromStock(node: LocationNode): RackStatus {
  if (!node.hasStock || node.itemCount === 0) {
    return RackStatus.EMPTY;
  }

  // Calculate capacity based on item count
  // This is a heuristic - adjust thresholds based on your warehouse
  if (node.itemCount > 10 || node.totalQty > 500) {
    return RackStatus.FULL;
  }
  if (node.itemCount > 5 || node.totalQty > 200) {
    return RackStatus.PARTIAL;
  }
  return RackStatus.PARTIAL;
}

/**
 * Generate mock shelves for a bin/level
 * In a real implementation, this would come from Odoo stock data
 */
function generateShelvesFromNode(node: LocationNode): Shelf[] {
  const numShelves = 5; // Standard 5-tier rack
  const shelves: Shelf[] = [];

  for (let i = 0; i < numShelves; i++) {
    const level = i + 1;
    // Distribute stock across shelves proportionally
    const hasItems = node.hasStock && (i < Math.ceil(node.itemCount / 2));

    shelves.push({
      id: `${node.id}-S${level}`,
      level,
      capacityPercentage: hasItems ? Math.min(80, 30 + (node.totalQty / 10)) : 0,
      items: hasItems ? [{
        id: `item-${node.id}-${level}`,
        name: `Stock at ${node.name}`,
        sku: `SKU-${node.id}`,
        quantity: Math.round(node.totalQty / Math.ceil(node.itemCount / 2)),
        category: 'Inventory',
      }] : [],
    });
  }

  return shelves;
}

/**
 * Convert a bin/level node to a RackCell
 */
function nodeToRackCell(node: LocationNode, aisleId: string, columnId: string): RackCell {
  return {
    id: `odoo-${node.id}`,
    label: node.name,
    aisleId,
    columnId,
    status: getStatusFromStock(node),
    shelves: generateShelvesFromNode(node),
    temperature: 22,
    humidity: 45,
    lastUpdated: new Date().toISOString(),
    // Store original Odoo location ID for fetching details
    odooLocationId: node.id,
    odooLocationName: node.completeName,
  };
}

/**
 * Get all bins from a row node (traverses bays and levels)
 */
function collectBinsFromRow(rowNode: LocationNode): LocationNode[] {
  const bins: LocationNode[] = [];

  const collect = (node: LocationNode) => {
    if (node.type === 'bin') {
      bins.push(node);
    }
    node.children.forEach(collect);
  };

  rowNode.children.forEach(collect);

  // Sort bins by their parsed location (bay then level)
  bins.sort((a, b) => {
    if (a.parsed && b.parsed) {
      // Sort by bay first, then by level
      if (a.parsed.bay !== b.parsed.bay) {
        return a.parsed.bay - b.parsed.bay;
      }
      return a.parsed.level.localeCompare(b.parsed.level);
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });

  return bins;
}

/**
 * Convert Odoo LocationNode hierarchy to AisleColumn array for 2D canvas
 */
export function convertOdooToAisleColumns(locations: LocationNode[]): AisleColumn[] {
  const aisles: AisleColumn[] = [];

  // Filter to only row-level nodes
  const rows = locations.filter(node => node.type === 'row');

  if (rows.length === 0) {
    console.log('[odooConverter] No rows found in locations');
    return aisles;
  }

  // Sort rows alphabetically
  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  console.log('[odooConverter] Converting rows:', rows.map(r => r.name));

  // Position rows in pairs (back-to-back layout)
  let currentX = START_X;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pairIndex = Math.floor(i / 2);
    const isSecondInPair = i % 2 === 1;

    // Get all bins from this row
    const bins = collectBinsFromRow(row);

    if (bins.length === 0) {
      console.log(`[odooConverter] Row ${row.name} has no bins, skipping`);
      continue;
    }

    // Convert bins to RackCells
    const cells: RackCell[] = bins.map((bin, idx) =>
      nodeToRackCell(bin, row.name, `${row.name}-${idx}`)
    );

    // Calculate X position based on pair grouping
    if (i > 0 && !isSecondInPair) {
      // Start of a new pair - add aisle gap
      currentX += AISLE_GAP;
    } else if (isSecondInPair) {
      // Second in pair - small gap
      currentX += CELL_SIZE + ROW_PAIR_GAP;
    }

    const aisle: AisleColumn = {
      id: `odoo-row-${row.id}`,
      label: row.name,
      orientation: 'vertical', // Rows displayed vertically (bays going down)
      x: currentX,
      y: START_Y,
      cells,
    };

    aisles.push(aisle);

    // Move X for next column if first in pair
    if (!isSecondInPair && i === rows.length - 1) {
      // Last row was first in an incomplete pair
      currentX += CELL_SIZE;
    }
  }

  console.log('[odooConverter] Generated', aisles.length, 'aisle columns');

  return aisles;
}

/**
 * Convert zones to AisleColumns (for displaying non-rack areas)
 */
export function convertZonesToAisleColumns(
  locations: LocationNode[],
  offsetY: number = 0
): AisleColumn[] {
  const aisles: AisleColumn[] = [];

  // Find all zone nodes
  const zones: LocationNode[] = [];
  const findZones = (node: LocationNode) => {
    if (node.type === 'zone') {
      zones.push(node);
    }
    node.children.forEach(findZones);
  };
  locations.forEach(findZones);

  if (zones.length === 0) {
    return aisles;
  }

  // Group zones by type for positioning
  const zonesByType: Record<string, LocationNode[]> = {};
  zones.forEach(zone => {
    const type = zone.zoneType || 'floor';
    if (!zonesByType[type]) {
      zonesByType[type] = [];
    }
    zonesByType[type].push(zone);
  });

  // Position zones - docks at the front, others to the side
  let dockX = START_X;
  const dockY = START_Y + offsetY + 100; // Below the racks

  // Docks
  (zonesByType['dock'] || []).forEach((zone, idx) => {
    const width = zone.zoneWidth || 6;
    const cells: RackCell[] = [{
      id: `zone-${zone.id}`,
      label: zone.name,
      aisleId: 'DOCKS',
      columnId: `dock-${idx}`,
      status: zone.hasStock ? RackStatus.PARTIAL : RackStatus.EMPTY,
      shelves: [],
      lastUpdated: new Date().toISOString(),
    }];

    aisles.push({
      id: `zone-dock-${zone.id}`,
      label: `DOCK ${idx + 1}`,
      orientation: 'horizontal',
      x: dockX,
      y: dockY,
      cells,
    });

    dockX += (width * CELL_SIZE) + AISLE_GAP;
  });

  // Staging areas
  let stagingX = START_X;
  const stagingY = dockY + CELL_SIZE + 40;

  (zonesByType['staging'] || []).forEach((zone, idx) => {
    const width = zone.zoneWidth || 4;
    const cells: RackCell[] = [{
      id: `zone-${zone.id}`,
      label: zone.name,
      aisleId: 'STAGING',
      columnId: `staging-${idx}`,
      status: zone.hasStock ? RackStatus.PARTIAL : RackStatus.EMPTY,
      shelves: [],
      lastUpdated: new Date().toISOString(),
    }];

    aisles.push({
      id: `zone-staging-${zone.id}`,
      label: zone.name,
      orientation: 'horizontal',
      x: stagingX,
      y: stagingY,
      cells,
    });

    stagingX += (width * CELL_SIZE) + 20;
  });

  return aisles;
}

/**
 * Calculate statistics from Odoo location data
 */
export function calculateOdooStats(locations: LocationNode[]) {
  let totalUnits = 0;
  let totalCells = 0;
  let critical = 0;
  let full = 0;
  let partial = 0;
  let empty = 0;

  const processNode = (node: LocationNode) => {
    if (node.type === 'bin') {
      totalCells++;
      totalUnits += node.totalQty;

      const status = getStatusFromStock(node);
      switch (status) {
        case RackStatus.CRITICAL:
          critical++;
          break;
        case RackStatus.FULL:
          full++;
          break;
        case RackStatus.PARTIAL:
          partial++;
          break;
        case RackStatus.EMPTY:
          empty++;
          break;
      }
    }
    node.children.forEach(processNode);
  };

  locations.forEach(processNode);

  // Calculate utilization percentage
  const occupiedCells = full + partial + critical;
  const utilization = totalCells > 0 ? Math.round((occupiedCells / totalCells) * 100) : 0;

  return {
    totalUnits: Math.round(totalUnits),
    totalCells,
    critical,
    full,
    utilization,
  };
}
