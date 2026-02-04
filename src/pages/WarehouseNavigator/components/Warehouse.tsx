// Warehouse Component - Main 3D warehouse group containing all racks and zones
// Calculates dimensions based on actual data, not constants

import { useMemo } from 'react';
import { Vector3 } from 'three';
import { LocationNode, LEVEL_CODES } from '../types';
import { LAYOUT, ZONE_DEFAULTS } from '../utils/positionCalculator';
import { RackRow } from './RackRow';
import { Floor } from './Floor';
import { Zone } from './Zone';
import { PickRoutePath, RouteHighlights } from './PickRoutePath';
import { PickRoute } from '../utils/routingAlgorithm';

interface WarehouseProps {
  locations: LocationNode[];
  selectedLocationId: number | null;
  onBinClick?: (id: number) => void;
  searchQuery?: string;
  // Routing props
  currentRoute?: PickRoute | null;
  highlightedRouteStep?: number;
  onRouteStepClick?: (stepIndex: number) => void;
}

export function Warehouse({
  locations,
  selectedLocationId,
  onBinClick,
  searchQuery,
  currentRoute,
  highlightedRouteStep,
  onRouteStepClick,
}: WarehouseProps) {
  const { BAY_WIDTH, LEVEL_HEIGHT, ROW_SPACING, BIN_DEPTH } = LAYOUT;

  // Extract unique row codes from locations
  const rows = useMemo(() => {
    const rowNodes: Map<string, LocationNode> = new Map();

    // Find row-level nodes (direct children of warehouse/stock)
    locations.forEach(node => {
      if (node.type === 'row') {
        rowNodes.set(node.name, node);
      }
    });

    // Sort rows alphabetically
    const sortedRows = Array.from(rowNodes.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    return sortedRows;
  }, [locations]);

  // Extract zone nodes from locations
  const zones = useMemo(() => {
    const zoneNodes: LocationNode[] = [];

    // Find zone-level nodes (can be at any level)
    const findZones = (node: LocationNode) => {
      if (node.type === 'zone') {
        zoneNodes.push(node);
      }
      node.children.forEach(findZones);
    };

    locations.forEach(findZones);

    return zoneNodes;
  }, [locations]);

  // Calculate actual warehouse dimensions from data
  const warehouseDimensions = useMemo(() => {
    let maxLevelIndex = 0;

    // Traverse all locations to find max dimensions
    const traverseNode = (node: LocationNode) => {
      if (node.parsed) {
        // Use parsed level to determine height
        const levelIndex = LEVEL_CODES.indexOf(node.parsed.level as typeof LEVEL_CODES[number]);
        if (levelIndex > maxLevelIndex) {
          maxLevelIndex = levelIndex;
        }
      }

      node.children.forEach(traverseNode);
    };

    // Count bays per row and traverse for levels
    let totalBaysAcrossAllRows = 0;
    rows.forEach(([, rowNode]) => {
      const bayCount = rowNode.children.filter(c => c.type === 'bay').length;
      if (bayCount > totalBaysAcrossAllRows) {
        totalBaysAcrossAllRows = bayCount;
      }
      traverseNode(rowNode);
    });

    // Calculate base dimensions from rack data
    let width = Math.max(totalBaysAcrossAllRows * BAY_WIDTH, BAY_WIDTH * 2);

    // Depth calculation with back-to-back pairing:
    // Each pair takes: 2 * BIN_DEPTH (two rows back-to-back) + ROW_SPACING (aisle)
    // Last pair doesn't need aisle after it
    const numPairs = Math.ceil(rows.length / 2);
    let depth = numPairs * (2 * BIN_DEPTH + ROW_SPACING);

    const height = (maxLevelIndex + 2) * LEVEL_HEIGHT; // +2 for floor and top beam

    // Expand dimensions to include zones
    let minX = 0, maxX = width;
    let minZ = 0, maxZ = depth;

    zones.forEach(zone => {
      if (zone.position) {
        const zoneType = zone.zoneType || 'floor';
        const defaults = ZONE_DEFAULTS[zoneType];
        const zoneWidth = zone.zoneWidth || defaults.width;
        const zoneDepth = zone.zoneDepth || defaults.depth;

        // Check zone bounds
        minX = Math.min(minX, zone.position.x);
        maxX = Math.max(maxX, zone.position.x + zoneWidth);
        minZ = Math.min(minZ, zone.position.z);
        maxZ = Math.max(maxZ, zone.position.z + zoneDepth);
      }
    });

    // Update dimensions to include zones (with padding)
    width = maxX - minX + 4;
    depth = maxZ - minZ + 4;

    return { width, depth, height, offsetX: minX - 2, offsetZ: minZ - 2 };
  }, [rows, zones, BAY_WIDTH, LEVEL_HEIGHT, ROW_SPACING, BIN_DEPTH]);

  // Filter rows based on search query
  const visibleRows = useMemo(() => {
    if (!searchQuery?.trim()) {
      return rows;
    }

    const query = searchQuery.toLowerCase();
    return rows.filter(([rowName, rowNode]) => {
      // Check if row name matches
      if (rowName.toLowerCase().includes(query)) {
        return true;
      }

      // Check if any child matches
      const hasMatchingChild = (node: LocationNode): boolean => {
        if (node.name.toLowerCase().includes(query) ||
            node.completeName.toLowerCase().includes(query)) {
          return true;
        }
        return node.children.some(hasMatchingChild);
      };

      return hasMatchingChild(rowNode);
    });
  }, [rows, searchQuery]);

  return (
    <group>
      {/* Floor with walls - dimensions based on actual data, offset for zones */}
      <group position={[warehouseDimensions.offsetX || 0, 0, warehouseDimensions.offsetZ || 0]}>
        <Floor
          warehouseWidth={warehouseDimensions.width}
          warehouseDepth={warehouseDimensions.depth}
          warehouseHeight={warehouseDimensions.height}
        />
      </group>

      {/* Rack rows - only renders rows that exist in data */}
      {visibleRows.map(([rowName, rowNode], index) => (
        <RackRow
          key={rowName}
          row={rowName}
          rowNode={rowNode}
          selectedBinId={selectedLocationId}
          onBinClick={onBinClick}
          actualRowIndex={index}
        />
      ))}

      {/* Zone areas (docks, staging, scrap, etc.) */}
      {zones.map(zone => {
        const zoneType = zone.zoneType || 'floor';
        const defaults = ZONE_DEFAULTS[zoneType];
        const width = zone.zoneWidth || defaults.width;
        const depth = zone.zoneDepth || defaults.depth;

        return (
          <Zone
            key={zone.id}
            position={zone.position || new Vector3(0, 0, 0)}
            width={width}
            depth={depth}
            zoneType={zoneType}
            name={zone.name}
            isSelected={zone.id === selectedLocationId}
            onClick={() => onBinClick?.(zone.id)}
            locationId={zone.id}
            hasItems={zone.hasStock}
          />
        );
      })}

      {/* Pick route path visualization */}
      {currentRoute && (
        <>
          <PickRoutePath
            route={currentRoute}
            highlightedStep={highlightedRouteStep}
            onStepClick={onRouteStepClick}
            showLabels={true}
          />
          <RouteHighlights
            route={currentRoute}
            highlightedStep={highlightedRouteStep}
          />
        </>
      )}

      {/* Ambient lighting - base illumination */}
      <ambientLight intensity={0.6} />

      {/* Hemisphere light for natural sky/ground lighting */}
      <hemisphereLight
        args={['#87CEEB', '#404040', 0.5]}
        position={[0, 50, 0]}
      />

      {/* Main directional light (sun-like) */}
      <directionalLight
        position={[warehouseDimensions.width / 2, 30, warehouseDimensions.depth / 2]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={100}
        shadow-camera-left={-warehouseDimensions.width - 10}
        shadow-camera-right={warehouseDimensions.width + 10}
        shadow-camera-top={warehouseDimensions.depth + 10}
        shadow-camera-bottom={-warehouseDimensions.depth - 10}
      />

      {/* Fill light from opposite side */}
      <directionalLight
        position={[-warehouseDimensions.width, 15, -warehouseDimensions.depth]}
        intensity={0.3}
      />

      {/* Point lights for interior warehouse lighting (overhead) */}
      <WarehouseLighting
        width={warehouseDimensions.width}
        depth={warehouseDimensions.depth}
        height={warehouseDimensions.height}
      />
    </group>
  );
}

// Interior warehouse lighting component (simplified for performance)
interface WarehouseLightingProps {
  width: number;
  depth: number;
  height: number;
}

function WarehouseLighting({ width, depth, height }: WarehouseLightingProps) {
  // Use minimal lights - just 4 corners and center
  const lightHeight = height + 5;

  return (
    <>
      <pointLight position={[width / 2, lightHeight, depth / 2]} intensity={0.6} distance={50} decay={1} />
      <pointLight position={[width * 0.2, lightHeight, depth * 0.2]} intensity={0.3} distance={40} decay={1} />
      <pointLight position={[width * 0.8, lightHeight, depth * 0.2]} intensity={0.3} distance={40} decay={1} />
      <pointLight position={[width * 0.2, lightHeight, depth * 0.8]} intensity={0.3} distance={40} decay={1} />
      <pointLight position={[width * 0.8, lightHeight, depth * 0.8]} intensity={0.3} distance={40} decay={1} />
    </>
  );
}
