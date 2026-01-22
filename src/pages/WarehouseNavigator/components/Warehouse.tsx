// Warehouse Component - Main 3D warehouse group containing all racks
// Calculates dimensions based on actual data, not constants

import { useMemo } from 'react';
import { LocationNode, LEVEL_CODES } from '../types';
import { LAYOUT } from '../utils/positionCalculator';
import { RackRow } from './RackRow';
import { Floor } from './Floor';

interface WarehouseProps {
  locations: LocationNode[];
  selectedLocationId: number | null;
  onBinClick?: (id: number) => void;
  visibleLevels: Set<string>;
  searchQuery?: string;
}

export function Warehouse({
  locations,
  selectedLocationId,
  onBinClick,
  visibleLevels,
  searchQuery,
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

    console.log('[Warehouse] Found rows:', sortedRows.map(([name]) => name));

    return sortedRows;
  }, [locations]);

  // Calculate actual warehouse dimensions from data
  const warehouseDimensions = useMemo(() => {
    let maxBays = 0;
    let maxLevelIndex = 0;

    // Traverse all locations to find max dimensions
    const traverseNode = (node: LocationNode) => {
      if (node.type === 'bay') {
        const bayNum = parseInt(node.name, 10);
        if (!isNaN(bayNum) && bayNum > maxBays) {
          // We're counting number of bays, not bay number
          // For now, just count total bays per row
        }
      }

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
    rows.forEach(([_, rowNode]) => {
      const bayCount = rowNode.children.filter(c => c.type === 'bay').length;
      if (bayCount > totalBaysAcrossAllRows) {
        totalBaysAcrossAllRows = bayCount;
      }
      traverseNode(rowNode);
    });

    // Calculate dimensions based on actual data
    const width = Math.max(totalBaysAcrossAllRows * BAY_WIDTH, BAY_WIDTH * 2);
    const depth = Math.max(rows.length * (ROW_SPACING + BIN_DEPTH), ROW_SPACING * 2);
    const height = (maxLevelIndex + 2) * LEVEL_HEIGHT; // +2 for floor and top beam

    console.log('[Warehouse] Dimensions:', { width, depth, height, rowCount: rows.length, maxBays: totalBaysAcrossAllRows, maxLevel: maxLevelIndex });

    return { width, depth, height };
  }, [rows, BAY_WIDTH, LEVEL_HEIGHT, ROW_SPACING, BIN_DEPTH]);

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
      {/* Floor with walls - dimensions based on actual data */}
      <Floor
        warehouseWidth={warehouseDimensions.width}
        warehouseDepth={warehouseDimensions.depth}
        warehouseHeight={warehouseDimensions.height}
      />

      {/* Rack rows - only renders rows that exist in data */}
      {visibleRows.map(([rowName, rowNode]) => (
        <RackRow
          key={rowName}
          row={rowName}
          rowNode={rowNode}
          selectedBinId={selectedLocationId}
          onBinClick={onBinClick}
          visibleLevels={visibleLevels}
        />
      ))}

      {/* Ambient lighting */}
      <ambientLight intensity={0.5} />

      {/* Directional light for shadows */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* Fill light from opposite side */}
      <directionalLight
        position={[-10, 10, -10]}
        intensity={0.3}
      />
    </group>
  );
}
