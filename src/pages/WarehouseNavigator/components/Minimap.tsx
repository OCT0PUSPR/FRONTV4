// Minimap Component - 2D overhead view of warehouse

import { useMemo, useCallback } from 'react';
import { useTheme } from '../../../../context/theme';
import { LocationNode } from '../types';
import { getTheme } from '../utils/colorTheme';
import { LAYOUT, getRowIndex, calculateWarehouseBounds } from '../utils/positionCalculator';

interface MinimapProps {
  locations: LocationNode[];
  selectedLocationId: number | null;
  onNavigate: (x: number, z: number) => void;
  cameraX?: number;
  cameraZ?: number;
}

export function Minimap({
  locations,
  selectedLocationId,
  onNavigate,
  cameraX = 0,
  cameraZ = 0,
}: MinimapProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const theme = getTheme(isDark);

  // Calculate warehouse bounds
  const rowCount = locations.filter(l => l.type === 'row').length || 8;
  const bounds = useMemo(() => calculateWarehouseBounds(rowCount), [rowCount]);

  // Minimap dimensions
  const width = 160;
  const height = 120;
  const padding = 8;

  // Scale factors
  const scaleX = (width - padding * 2) / bounds.width;
  const scaleZ = (height - padding * 2) / bounds.depth;
  const scale = Math.min(scaleX, scaleZ);

  // Scaled bounds
  const scaledWidth = bounds.width * scale;
  const scaledDepth = bounds.depth * scale;
  const offsetX = (width - scaledWidth) / 2;
  const offsetZ = (height - scaledDepth) / 2;

  // Convert world position to minimap position
  const worldToMinimap = useCallback((worldX: number, worldZ: number) => {
    return {
      x: offsetX + worldX * scale,
      y: offsetZ + worldZ * scale,
    };
  }, [offsetX, offsetZ, scale]);

  // Convert minimap click to world position
  const minimapToWorld = useCallback((minimapX: number, minimapY: number) => {
    return {
      x: (minimapX - offsetX) / scale,
      z: (minimapY - offsetZ) / scale,
    };
  }, [offsetX, offsetZ, scale]);

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const minimapX = e.clientX - rect.left;
    const minimapY = e.clientY - rect.top;
    const world = minimapToWorld(minimapX, minimapY);
    onNavigate(world.x, world.z);
  }, [minimapToWorld, onNavigate]);

  // Get row positions
  const rows = useMemo(() => {
    const { BAYS_PER_ROW, BAY_WIDTH, ROW_SPACING, BACK_TO_BACK_GAP, BIN_DEPTH } = LAYOUT;
    const rowList: Array<{ name: string; x: number; y: number; width: number; height: number }> = [];

    locations
      .filter(l => l.type === 'row')
      .forEach(row => {
        const rowIndex = getRowIndex(row.name);
        const pairIndex = Math.floor(rowIndex / 2);
        const isSecondInPair = rowIndex % 2 === 1;
        const z = pairIndex * (ROW_SPACING + BACK_TO_BACK_GAP * 2) + (isSecondInPair ? BACK_TO_BACK_GAP : 0);

        const pos = worldToMinimap(0, z);
        rowList.push({
          name: row.name,
          x: pos.x,
          y: pos.y,
          width: BAYS_PER_ROW * BAY_WIDTH * scale,
          height: BIN_DEPTH * scale,
        });
      });

    return rowList;
  }, [locations, worldToMinimap, scale]);

  // Camera indicator position
  const cameraPos = worldToMinimap(cameraX, cameraZ);

  return (
    <div
      className="
        absolute bottom-4 right-4 rounded-lg shadow-lg overflow-hidden
        border border-gray-200 dark:border-zinc-700
        bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm
      "
    >
      <svg
        width={width}
        height={height}
        onClick={handleClick}
        className="cursor-crosshair"
      >
        {/* Background */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={isDark ? '#1a1a18' : '#f5f5f0'}
        />

        {/* Warehouse floor */}
        <rect
          x={offsetX}
          y={offsetZ}
          width={scaledWidth}
          height={scaledDepth}
          fill={theme.floor}
          opacity={0.5}
        />

        {/* Rows */}
        {rows.map(row => (
          <rect
            key={row.name}
            x={row.x}
            y={row.y}
            width={row.width}
            height={row.height}
            fill={theme.rackStructure}
            stroke={theme.binEmpty}
            strokeWidth={0.5}
          />
        ))}

        {/* Selected location highlight */}
        {selectedLocationId && (
          <circle
            cx={cameraPos.x}
            cy={cameraPos.y}
            r={4}
            fill={theme.selectionHighlight}
            stroke="#fff"
            strokeWidth={1}
          />
        )}

        {/* Camera position indicator */}
        <g transform={`translate(${cameraPos.x}, ${cameraPos.y})`}>
          <circle
            r={3}
            fill={theme.binOccupied}
            stroke="#fff"
            strokeWidth={1}
          />
          {/* Direction indicator */}
          <polygon
            points="0,-6 3,-2 -3,-2"
            fill={theme.binOccupied}
            stroke="#fff"
            strokeWidth={0.5}
          />
        </g>

        {/* Border */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="none"
          stroke={isDark ? '#3f3f46' : '#e5e7eb'}
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
