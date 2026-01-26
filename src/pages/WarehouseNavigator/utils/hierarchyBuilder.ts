// Hierarchy Builder - converts flat Odoo locations to hierarchical tree

import { OdooLocation, LocationNode, LocationType, ParsedLocation, LEVEL_CODES, ZoneType } from '../types';
import { parseLocationCode, calculatePosition, calculateZonePosition, ZONE_DEFAULTS } from './positionCalculator';
import { Vector3 } from 'three';

/**
 * Determine location type from path depth
 * Supports two hierarchy formats:
 * 1. WH/Stock/Row/Bay/Level (level IS the bin) - depth 3
 * 2. WH/Stock/Row/Bay/Level/Side (with side 01/02) - depth 4
 */
export function getLocationType(path: string[], hasChildren: boolean = true): LocationType {
  // Remove WH and Stock from path
  const depth = path.length - 2;

  switch (depth) {
    case 1: return 'row';    // AG
    case 2: return 'bay';    // AG/01
    case 3:
      // If this level node has no children, it IS the bin
      // Otherwise it's a level containing bins
      return hasChildren ? 'level' : 'bin';
    case 4: return 'bin';    // AG/01/AF/01
    default: return 'bin';
  }
}

/**
 * Parse complete_name to path array
 * "WH/Stock/AG/14/AF/01" → ["WH", "Stock", "AG", "14", "AF", "01"]
 */
export function parseLocationPath(completeName: string): string[] {
  return completeName.split('/').map(s => s.trim()).filter(Boolean);
}

/**
 * Build a location code from path components
 * Supports both 3-part and 4-part structures
 */
export function buildLocationCode(path: string[]): string | null {
  // Remove WH and Stock prefix
  const parts = path.slice(2);

  if (parts.length === 4) {
    // Full bin path with side: [Row, Bay, Level, Side]
    const [row, bay, level, side] = parts;
    const bayPadded = bay.padStart(2, '0');
    const sidePadded = side.padStart(2, '0');
    return `${row}${bayPadded}${level}${sidePadded}`;
  }

  if (parts.length === 3) {
    // Level IS the bin: [Row, Bay, Level]
    // Treat as side 01 (single bin per level)
    const [row, bay, level] = parts;
    const bayPadded = bay.padStart(2, '0');
    return `${row}${bayPadded}${level}01`;
  }

  return null;
}

/**
 * Convert flat Odoo locations to hierarchical tree structure
 * @param locations - All locations from Odoo
 * @param warehouseId - The warehouse ID to filter by
 * @param warehouseCode - The warehouse short code (e.g., "AE") used in location paths
 */
export function buildLocationHierarchy(
  locations: OdooLocation[],
  warehouseId: number,
  warehouseCode?: string
): LocationNode[] {
  // Filter to locations for this warehouse
  // Include both 'internal' (bins) and 'view' (rows/bays/levels) usage types
  // Match either by warehouse_id OR by complete_name starting with warehouse code
  const warehouseLocations = locations.filter(loc => {
    // Include internal and view usages (exclude supplier, customer, transit, etc.)
    if (loc.usage !== 'internal' && loc.usage !== 'view') return false;

    // Check if belongs to warehouse by warehouse_id
    const belongsByWarehouseId = loc.warehouse_id &&
      Array.isArray(loc.warehouse_id) &&
      loc.warehouse_id[0] === warehouseId;

    // Check if belongs to warehouse by complete_name path starting with warehouse code
    const belongsByPath = warehouseCode &&
      loc.complete_name &&
      (loc.complete_name.startsWith(`${warehouseCode}/`) ||
       loc.complete_name === warehouseCode);

    if (!belongsByWarehouseId && !belongsByPath) return false;

    // Exclude the Stock location itself (e.g., "AE/Stock") - we want rows to be roots
    // Stock location is path length 2: [WH, Stock]
    const path = parseLocationPath(loc.complete_name);
    if (path.length <= 2) return false;

    return true;
  });

  console.log('[hierarchyBuilder] Warehouse locations count:', warehouseLocations.length);
  console.log('[hierarchyBuilder] Sample locations:', warehouseLocations.slice(0, 5).map(l => ({
    name: l.name,
    complete_name: l.complete_name,
    usage: l.usage,
  })));

  // Build a map for quick lookup
  const locationMap = new Map<number, OdooLocation>();
  locations.forEach(loc => locationMap.set(loc.id, loc));

  // Create node map
  const nodeMap = new Map<number, LocationNode>();

  // Track zone indices for auto-positioning (fallback when no explicit position)
  const zoneIndices: Record<ZoneType, number> = {
    dock: 0,
    staging: 0,
    scrap: 0,
    qc: 0,
    packing: 0,
    floor: 0,
  };

  // First pass: create all nodes (with temporary type assignment)
  warehouseLocations.forEach(loc => {
    const path = parseLocationPath(loc.complete_name);
    const depth = path.length - 2; // Depth after WH/Stock

    // Check if this is a zone location (has x_zone_type or detected from name/fields)
    const detectedZoneType = detectZoneType(loc);
    const isZone = detectedZoneType !== null;
    const zoneType = detectedZoneType || undefined;

    // Determine location type
    let type: LocationType;
    if (isZone && zoneType) {
      type = 'zone';
    } else {
      // Initially set type without knowing children status
      type = getLocationType(path, true);
    }

    // Try to parse as bin code for position (for rack locations)
    const code = buildLocationCode(path);
    let parsed: ParsedLocation | undefined;
    if (code && !isZone) {
      const result = parseLocationCode(code);
      if (result) {
        parsed = result;
      }
    }

    // Calculate position based on type
    let position: Vector3 | undefined;
    if (isZone && zoneType) {
      // Check if explicit position is set in Odoo (posx, posz)
      const hasExplicitPosition = (loc.posx !== undefined && loc.posx !== 0) ||
                                   (loc.posz !== undefined && loc.posz !== 0);

      if (hasExplicitPosition) {
        // Use Odoo's position fields directly (posx = X, posz = Z, posy could be elevation)
        position = new Vector3(
          loc.posx || 0,
          loc.posy || 0,  // Y is typically 0 for floor zones
          loc.posz || 0
        );
        console.log(`[hierarchyBuilder] Zone "${loc.name}" using explicit position:`, position);
      } else {
        // Fallback to auto-calculated position based on zone type
        position = calculateZonePosition(zoneType, zoneIndices[zoneType], warehouseLocations.length);
        zoneIndices[zoneType]++;
        console.log(`[hierarchyBuilder] Zone "${loc.name}" using auto position:`, position);
      }
    } else if (parsed) {
      position = calculatePosition(parsed);
    }

    const node: LocationNode = {
      id: loc.id,
      name: loc.name,
      completeName: loc.complete_name,
      usage: loc.usage,
      type,
      parentId: loc.location_id && Array.isArray(loc.location_id) ? loc.location_id[0] : null,
      children: [],
      hasStock: false, // Will be updated when stock is loaded
      itemCount: 0,
      totalQty: 0,
      depth,
      parsed,
      position,
      // Zone-specific properties
      zoneType: zoneType,
      zoneWidth: isZone && zoneType ? (loc.x_zone_width || ZONE_DEFAULTS[zoneType].width) : undefined,
      zoneDepth: isZone && zoneType ? (loc.x_zone_depth || ZONE_DEFAULTS[zoneType].depth) : undefined,
    };

    nodeMap.set(loc.id, node);
  });

  // Second pass: build parent-child relationships
  const rootNodes: LocationNode[] = [];

  nodeMap.forEach(node => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      parent.children.push(node);
    } else {
      // Parent not in nodeMap - this node becomes a root
      // This happens for row-level nodes whose parent (Stock) was excluded
      rootNodes.push(node);
    }
  });

  // Third pass: Update type for leaf nodes at depth 3 (levels that ARE bins)
  // If a 'level' type node has no children, it's actually a bin
  nodeMap.forEach(node => {
    if (node.type === 'level' && node.children.length === 0) {
      // This level has no children, so it IS the storage location (bin)
      node.type = 'bin';

      // Recalculate parsed location code for positioning
      const path = parseLocationPath(node.completeName);
      const code = buildLocationCode(path);
      if (code) {
        const result = parseLocationCode(code);
        if (result) {
          node.parsed = result;
          node.position = calculatePosition(result);
        }
      }

      console.log('[hierarchyBuilder] Converted level to bin:', node.name, 'parsed:', node.parsed);
    }
  });

  // Fourth pass: Position child zones relative to parent zones
  // If a zone has no explicit position but has a zone parent, position it relative to parent
  nodeMap.forEach(node => {
    if (node.type === 'zone' && node.parentId) {
      const parent = nodeMap.get(node.parentId);

      // Check if parent is also a zone and this node has no explicit position
      if (parent && parent.type === 'zone' && parent.position) {
        // Check if this child zone was auto-positioned (no explicit posx/posz in original data)
        // We can detect this by checking if the position matches an auto-calculated one
        const originalLoc = warehouseLocations.find(l => l.id === node.id);
        const hasExplicitPosition = originalLoc &&
          ((originalLoc.posx !== undefined && originalLoc.posx !== 0) ||
           (originalLoc.posz !== undefined && originalLoc.posz !== 0));

        if (!hasExplicitPosition) {
          // Find index among sibling zones
          const siblingZones = parent.children.filter(c => c.type === 'zone');
          const childIndex = siblingZones.indexOf(node);

          const parentWidth = parent.zoneWidth || ZONE_DEFAULTS[parent.zoneType || 'floor'].width;
          const parentDepth = parent.zoneDepth || ZONE_DEFAULTS[parent.zoneType || 'floor'].depth;
          const childWidth = node.zoneWidth || ZONE_DEFAULTS[node.zoneType || 'floor'].width;
          const childDepth = node.zoneDepth || ZONE_DEFAULTS[node.zoneType || 'floor'].depth;

          node.position = calculateChildZonePosition(
            parent.position,
            parentWidth,
            parentDepth,
            childIndex,
            childWidth,
            childDepth
          );

          console.log(`[hierarchyBuilder] Child zone "${node.name}" positioned relative to parent "${parent.name}":`, node.position);
        }
      }
    }
  });

  console.log('[hierarchyBuilder] Root nodes:', rootNodes.map(n => ({
    name: n.name,
    type: n.type,
    childCount: n.children.length,
  })));

  // Sort children at each level
  const sortNodes = (nodes: LocationNode[]): void => {
    nodes.sort((a, b) => {
      // Sort by name naturally (AA before AB, 01 before 02, etc.)
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
    nodes.forEach(node => sortNodes(node.children));
  };

  sortNodes(rootNodes);

  return rootNodes;
}

/**
 * Update stock counts in the hierarchy
 */
export function updateStockCounts(
  nodes: LocationNode[],
  stockByLocation: Map<number, { itemCount: number; totalQty: number }>
): void {
  const updateNode = (node: LocationNode): { itemCount: number; totalQty: number } => {
    // Get direct stock for this location
    const directStock = stockByLocation.get(node.id) || { itemCount: 0, totalQty: 0 };

    // Recursively get children's stock
    let childItemCount = 0;
    let childTotalQty = 0;

    node.children.forEach(child => {
      const childStock = updateNode(child);
      childItemCount += childStock.itemCount;
      childTotalQty += childStock.totalQty;
    });

    // Update node with combined counts
    node.itemCount = directStock.itemCount + childItemCount;
    node.totalQty = directStock.totalQty + childTotalQty;
    node.hasStock = node.itemCount > 0;

    return { itemCount: node.itemCount, totalQty: node.totalQty };
  };

  nodes.forEach(updateNode);
}

/**
 * Filter tree nodes by search query
 */
export function filterLocationTree(
  nodes: LocationNode[],
  searchQuery: string
): LocationNode[] {
  if (!searchQuery.trim()) {
    return nodes;
  }

  const query = searchQuery.toLowerCase();

  const filterNode = (node: LocationNode): LocationNode | null => {
    // Check if this node matches
    const matches = node.name.toLowerCase().includes(query) ||
                   node.completeName.toLowerCase().includes(query);

    // Filter children
    const filteredChildren = node.children
      .map(child => filterNode(child))
      .filter((n): n is LocationNode => n !== null);

    // Include this node if it matches or has matching children
    if (matches || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      };
    }

    return null;
  };

  return nodes
    .map(node => filterNode(node))
    .filter((n): n is LocationNode => n !== null);
}

/**
 * Filter nodes by visible levels
 */
export function filterByVisibleLevels(
  nodes: LocationNode[],
  visibleLevels: Set<string>
): LocationNode[] {
  if (visibleLevels.size === 0 || visibleLevels.size === LEVEL_CODES.length) {
    return nodes;
  }

  const filterNode = (node: LocationNode): LocationNode | null => {
    // For bin-level nodes, check if their level is visible
    if (node.type === 'bin' && node.parsed) {
      if (!visibleLevels.has(node.parsed.level)) {
        return null;
      }
    }

    // For level nodes, check visibility
    if (node.type === 'level') {
      if (!visibleLevels.has(node.name)) {
        return null;
      }
    }

    // Filter children
    const filteredChildren = node.children
      .map(child => filterNode(child))
      .filter((n): n is LocationNode => n !== null);

    // For non-terminal nodes, include if they have visible children
    if (node.type === 'row' || node.type === 'bay') {
      if (filteredChildren.length === 0) {
        return null;
      }
      return { ...node, children: filteredChildren };
    }

    return { ...node, children: filteredChildren };
  };

  return nodes
    .map(node => filterNode(node))
    .filter((n): n is LocationNode => n !== null);
}

/**
 * Find a node by ID in the tree
 */
export function findNodeById(
  nodes: LocationNode[],
  id: number
): LocationNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findNodeById(node.children, id);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * Get all ancestor IDs for a node (for auto-expanding tree)
 */
export function getAncestorIds(
  nodes: LocationNode[],
  targetId: number,
  currentPath: number[] = []
): number[] | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return currentPath;
    }

    const result = getAncestorIds(
      node.children,
      targetId,
      [...currentPath, node.id]
    );
    if (result) {
      return result;
    }
  }
  return null;
}

/**
 * Flatten tree to array of bins only
 */
export function flattenToBins(nodes: LocationNode[]): LocationNode[] {
  const bins: LocationNode[] = [];

  const collectBins = (node: LocationNode): void => {
    if (node.type === 'bin') {
      bins.push(node);
    }
    node.children.forEach(collectBins);
  };

  nodes.forEach(collectBins);
  return bins;
}

/**
 * Flatten tree to array of zones only
 */
export function flattenToZones(nodes: LocationNode[]): LocationNode[] {
  const zones: LocationNode[] = [];

  const collectZones = (node: LocationNode): void => {
    if (node.type === 'zone') {
      zones.push(node);
    }
    node.children.forEach(collectZones);
  };

  nodes.forEach(collectZones);
  return zones;
}

/**
 * Check if a location is a zone based on usage or custom fields
 * Useful for detecting zones when x_zone_type is not set
 */
export function detectZoneType(loc: OdooLocation): ZoneType | null {
  // If explicitly set via custom field, use it
  if (loc.x_zone_type && loc.x_zone_type !== false) {
    return loc.x_zone_type as ZoneType;
  }

  // Detect from Odoo built-in fields
  if (loc.is_a_dock) return 'dock';
  if (loc.scrap_location) return 'scrap';

  // Detect from name patterns (case-insensitive)
  const nameLower = loc.name.toLowerCase();
  const completeNameLower = loc.complete_name.toLowerCase();

  // Check both name and complete_name for patterns
  const checkPattern = (pattern: string) =>
    nameLower.includes(pattern) || completeNameLower.includes(pattern);

  if (checkPattern('dock') || checkPattern('receiving') || checkPattern('shipping')) return 'dock';
  if (checkPattern('staging') || checkPattern('stage') || checkPattern('waiting')) return 'staging';
  if (checkPattern('scrap') || checkPattern('waste') || checkPattern('disposal')) return 'scrap';
  if (checkPattern('qc') || checkPattern('quality') || checkPattern('inspection')) return 'qc';
  if (checkPattern('pack') || checkPattern('packing')) return 'packing';
  if (checkPattern('floor') || checkPattern('area')) return 'floor';

  return null;
}

/**
 * Calculate relative position for child zones
 * Children are positioned relative to their parent zone
 */
export function calculateChildZonePosition(
  parentPosition: Vector3,
  parentWidth: number,
  parentDepth: number,
  childIndex: number,
  childWidth: number,
  childDepth: number
): Vector3 {
  // Position children along the back edge of the parent zone
  const spacing = 1; // Gap between child zones
  const xOffset = childIndex * (childWidth + spacing);

  return new Vector3(
    parentPosition.x + xOffset,
    0,
    parentPosition.z + parentDepth + spacing
  );
}
