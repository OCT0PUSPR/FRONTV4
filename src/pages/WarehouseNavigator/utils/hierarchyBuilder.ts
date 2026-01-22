// Hierarchy Builder - converts flat Odoo locations to hierarchical tree

import { OdooLocation, LocationNode, LocationType, ParsedLocation, LEVEL_CODES } from '../types';
import { parseLocationCode, calculatePosition } from './positionCalculator';

/**
 * Determine location type from path depth
 * WH/Stock/[Row]/[Bay]/[Level]/[Bin]
 */
export function getLocationType(path: string[]): LocationType {
  // Remove WH and Stock from path
  const depth = path.length - 2;

  switch (depth) {
    case 1: return 'row';    // AG
    case 2: return 'bay';    // AG/14
    case 3: return 'level';  // AG/14/AF
    case 4: return 'bin';    // AG/14/AF/01
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
 */
export function buildLocationCode(path: string[]): string | null {
  // Remove WH and Stock prefix
  const parts = path.slice(2);

  if (parts.length === 4) {
    // Full bin path: [Row, Bay, Level, Side]
    const [row, bay, level, side] = parts;
    const bayPadded = bay.padStart(2, '0');
    const sidePadded = side.padStart(2, '0');
    return `${row}${bayPadded}${level}${sidePadded}`;
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

  // First pass: create all nodes
  warehouseLocations.forEach(loc => {
    const path = parseLocationPath(loc.complete_name);
    const type = getLocationType(path);
    const depth = path.length - 2; // Depth after WH/Stock

    // Try to parse as bin code for position
    const code = buildLocationCode(path);
    let parsed: ParsedLocation | undefined;
    if (code) {
      const result = parseLocationCode(code);
      if (result) {
        parsed = result;
      }
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
      position: parsed ? calculatePosition(parsed) : undefined,
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
