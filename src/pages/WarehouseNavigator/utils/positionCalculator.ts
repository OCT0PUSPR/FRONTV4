// Position Calculator for 3D Warehouse Layout
// Converts location codes to 3D positions

import { Vector3 } from 'three';
import { ParsedLocation, LayoutConstants, LEVEL_CODES, ZoneType } from '../types';

// Re-export LEVEL_CODES for convenience
export { LEVEL_CODES };

// Default layout constants based on specification
export const LAYOUT: LayoutConstants = {
  ROW_SPACING: 3.0,         // Space between non-back-to-back rows (aisle width)
  BACK_TO_BACK_GAP: 0.3,    // Small gap between back-to-back pairs
  BAY_WIDTH: 1.2,           // Width of each bay
  LEVEL_HEIGHT: 0.8,        // Height of each shelf level
  BIN_WIDTH: 0.5,           // Width of individual bin
  BIN_DEPTH: 0.8,           // Depth of bin
  BAYS_PER_ROW: 20,         // Bays per row (01-20)
  LEVELS_PER_RACK: 7,       // Levels (AA-AG)
  BINS_PER_LEVEL: 2,        // Bins per level (left/right)
};

// Known row identifiers - can be extended
const ROW_CODES = ['AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV'];

/**
 * Parse a location code like "AR14AF01" into its components
 */
export function parseLocationCode(code: string): ParsedLocation | null {
  // Pattern: [ROW: 2 letters][BAY: 2 digits][LEVEL: 2 letters][SIDE: 2 digits]
  const pattern = /^([A-Z]{2})(\d{2})([A-Z]{2})(\d{2})$/;
  const match = code.match(pattern);

  if (!match) {
    return null;
  }

  const [, row, bayStr, level, sideStr] = match;
  const bay = parseInt(bayStr, 10);
  const side = parseInt(sideStr, 10);

  // Validate level is in our known levels
  if (!LEVEL_CODES.includes(level as typeof LEVEL_CODES[number])) {
    return null;
  }

  // Validate bay is in range
  if (bay < 1 || bay > LAYOUT.BAYS_PER_ROW) {
    return null;
  }

  // Validate side
  if (side !== 1 && side !== 2) {
    return null;
  }

  return { row, bay, level, side };
}

/**
 * Get the index of a row (0-based)
 * Rows are paired back-to-back: AG+AH, AI+AJ, etc.
 */
export function getRowIndex(row: string): number {
  const index = ROW_CODES.indexOf(row);
  return index >= 0 ? index : 0;
}

/**
 * Get the index of a level (0-based, AA=0, AG=6)
 */
export function getLevelIndex(level: string): number {
  const index = LEVEL_CODES.indexOf(level as typeof LEVEL_CODES[number]);
  return index >= 0 ? index : 0;
}

/**
 * Calculate 3D position from parsed location
 */
export function calculatePosition(loc: ParsedLocation): Vector3 {
  const { ROW_SPACING, BACK_TO_BACK_GAP, BAY_WIDTH, LEVEL_HEIGHT, BIN_WIDTH } = LAYOUT;

  // Calculate row index and pair grouping
  const rowIndex = getRowIndex(loc.row);
  const pairIndex = Math.floor(rowIndex / 2);
  const isSecondInPair = rowIndex % 2 === 1;

  // X position: based on bay and side
  // Bay 1 starts at x=0, each bay is BAY_WIDTH wide
  // Side 1 (left) is at start of bin, Side 2 (right) is at BIN_WIDTH offset
  const x = (loc.bay - 1) * BAY_WIDTH + (loc.side - 1) * BIN_WIDTH;

  // Y position: based on level (height)
  const y = getLevelIndex(loc.level) * LEVEL_HEIGHT;

  // Z position: based on row pairs
  // Each pair takes: BACK_TO_BACK_GAP (between pair) + ROW_SPACING (aisle after pair)
  // First row of pair is at start, second row is at BACK_TO_BACK_GAP
  const z = pairIndex * (ROW_SPACING + BACK_TO_BACK_GAP * 2) +
            (isSecondInPair ? BACK_TO_BACK_GAP : 0);

  return new Vector3(x, y, z);
}

/**
 * Calculate the center position of a rack (row)
 */
export function calculateRowCenter(row: string): Vector3 {
  const { BAY_WIDTH, LEVEL_HEIGHT, BAYS_PER_ROW, LEVELS_PER_RACK, ROW_SPACING, BACK_TO_BACK_GAP } = LAYOUT;

  const rowIndex = getRowIndex(row);
  const pairIndex = Math.floor(rowIndex / 2);
  const isSecondInPair = rowIndex % 2 === 1;

  // Center X is middle of all bays
  const x = (BAYS_PER_ROW * BAY_WIDTH) / 2;

  // Center Y is middle height
  const y = (LEVELS_PER_RACK * LEVEL_HEIGHT) / 2;

  // Z position same as individual calculation
  const z = pairIndex * (ROW_SPACING + BACK_TO_BACK_GAP * 2) +
            (isSecondInPair ? BACK_TO_BACK_GAP : 0);

  return new Vector3(x, y, z);
}

/**
 * Calculate warehouse bounds for floor/ceiling
 */
export function calculateWarehouseBounds(rowCount: number): {
  width: number;
  depth: number;
  height: number;
} {
  const { BAY_WIDTH, LEVEL_HEIGHT, BAYS_PER_ROW, LEVELS_PER_RACK, ROW_SPACING, BACK_TO_BACK_GAP } = LAYOUT;

  // Width: all bays across
  const width = BAYS_PER_ROW * BAY_WIDTH;

  // Height: all levels
  const height = LEVELS_PER_RACK * LEVEL_HEIGHT;

  // Depth: all row pairs with aisles
  const pairCount = Math.ceil(rowCount / 2);
  const depth = pairCount * (ROW_SPACING + BACK_TO_BACK_GAP * 2);

  return { width, depth, height };
}

/**
 * Get camera position to view a specific location
 */
export function getCameraPositionForLocation(
  loc: ParsedLocation,
  distance: number = 5
): Vector3 {
  const position = calculatePosition(loc);

  // Position camera in front and slightly above
  return new Vector3(
    position.x,
    position.y + 2,
    position.z + distance
  );
}

/**
 * Get camera position for row overview
 */
export function getCameraPositionForRow(row: string, distance: number = 15): Vector3 {
  const center = calculateRowCenter(row);

  return new Vector3(
    center.x,
    center.y + 3,
    center.z + distance
  );
}

/**
 * Get camera position for full warehouse overview
 */
export function getCameraPositionForWarehouse(rowCount: number = 8): Vector3 {
  const bounds = calculateWarehouseBounds(rowCount);

  return new Vector3(
    bounds.width / 2,
    bounds.height + 5,
    bounds.depth + 10
  );
}

// Zone layout defaults (can be customized per zone)
export const ZONE_DEFAULTS = {
  dock: { width: 6, depth: 8 },
  staging: { width: 8, depth: 6 },
  scrap: { width: 4, depth: 4 },
  qc: { width: 5, depth: 5 },
  packing: { width: 6, depth: 5 },
  floor: { width: 5, depth: 5 },
};

/**
 * Calculate position for a zone based on its type and index
 * Zones are placed around the rack area perimeter
 */
export function calculateZonePosition(
  zoneType: ZoneType,
  zoneIndex: number,
  rowCount: number = 8
): Vector3 {
  const bounds = calculateWarehouseBounds(rowCount);
  const defaults = ZONE_DEFAULTS[zoneType];

  // Position zones around warehouse perimeter based on type
  switch (zoneType) {
    case 'dock':
      // Docks are at the front (negative Z), spaced along X
      return new Vector3(
        zoneIndex * (defaults.width + 2) + defaults.width / 2,
        0,
        -defaults.depth - 2
      );

    case 'staging':
      // Staging areas near docks, slightly further back
      return new Vector3(
        zoneIndex * (defaults.width + 2) + defaults.width / 2,
        0,
        -defaults.depth / 2 - 1
      );

    case 'scrap':
      // Scrap areas on the right side of warehouse
      return new Vector3(
        bounds.width + 2,
        0,
        zoneIndex * (defaults.depth + 2) + defaults.depth / 2
      );

    case 'qc':
      // QC areas on the left side
      return new Vector3(
        -defaults.width - 2,
        0,
        bounds.depth / 2 + zoneIndex * (defaults.depth + 2)
      );

    case 'packing':
      // Packing near shipping/docks area
      return new Vector3(
        bounds.width / 2 + zoneIndex * (defaults.width + 2),
        0,
        -defaults.depth - 2
      );

    case 'floor':
    default:
      // Floor areas fill remaining space
      return new Vector3(
        bounds.width / 2 + zoneIndex * (defaults.width + 1),
        0,
        bounds.depth + defaults.depth / 2 + 2
      );
  }
}

/**
 * Get camera position for viewing a zone
 */
export function getCameraPositionForZone(
  position: Vector3,
  zoneWidth: number,
  zoneDepth: number
): Vector3 {
  const maxDim = Math.max(zoneWidth, zoneDepth);
  const distance = maxDim * 1.5;

  return new Vector3(
    position.x + zoneWidth / 2,
    distance / 2 + 3,
    position.z + zoneDepth / 2 + distance
  );
}
