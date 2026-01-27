// RackRow Component - Row of racks (one aisle)
// Only renders racks that actually exist in the data

import React, { useMemo } from 'react';
import { Vector3 } from 'three';
import { Text } from '@react-three/drei';
import { useTheme } from '../../../../context/theme';
import { LocationNode, LEVEL_CODES } from '../types';
import { LAYOUT } from '../utils/positionCalculator';
import { Rack } from './Rack';

// Row label colors
const ROW_LABEL_COLORS = {
  light: '#1a3a5a',
  dark: '#a0c0e0',
};

// Level label colors
const LEVEL_LABEL_COLORS = {
  light: '#2a4a6a',
  dark: '#8ab4d4',
};

interface RackRowProps {
  row: string;
  rowNode?: LocationNode;
  selectedBinId: number | null;
  onBinClick?: (id: number) => void;
  actualRowIndex: number; // The actual index in the list of rows (0, 1, 2, 3...)
}

// Bay data structure for rendering
interface BayData {
  bayNumber: number;
  bayNode: LocationNode;
  bins: LocationNode[];
}

export function RackRow({
  row,
  rowNode,
  selectedBinId,
  onBinClick,
  actualRowIndex,
}: RackRowProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const rowLabelColor = isDark ? ROW_LABEL_COLORS.dark : ROW_LABEL_COLORS.light;
  const levelLabelColor = isDark ? LEVEL_LABEL_COLORS.dark : LEVEL_LABEL_COLORS.light;

  const { BAY_WIDTH, ROW_SPACING, BIN_DEPTH, LEVEL_HEIGHT } = LAYOUT;
  const beamHeight = 0.12;

  // Calculate Z position based on actual row index with back-to-back pairing
  // Pairs: rows 0+1 are back-to-back, rows 2+3 are back-to-back, etc.
  const pairIndex = Math.floor(actualRowIndex / 2);
  const isSecondInPair = actualRowIndex % 2 === 1;

  // Each pair takes: 2 * BIN_DEPTH (for two rows) + ROW_SPACING (aisle after pair)
  // First row in pair at pairIndex * (2 * BIN_DEPTH + ROW_SPACING)
  // Second row in pair at same + BIN_DEPTH (immediately behind first)
  const baseZ = pairIndex * (2 * BIN_DEPTH + ROW_SPACING) + (isSecondInPair ? BIN_DEPTH : 0);

  // Collect actual bay data from the location hierarchy
  const baysData = useMemo(() => {
    const bays: BayData[] = [];

    if (!rowNode) return bays;

    // Iterate through row's children to find bays
    rowNode.children.forEach(child => {
      if (child.type === 'bay') {
        const bayNum = parseInt(child.name, 10);
        if (!isNaN(bayNum)) {
          // Collect all descendant bins for this bay
          const bayBins: LocationNode[] = [];
          const collectBins = (n: LocationNode) => {
            if (n.type === 'bin') {
              bayBins.push(n);
            }
            n.children.forEach(collectBins);
          };
          collectBins(child);

          bays.push({
            bayNumber: bayNum,
            bayNode: child,
            bins: bayBins,
          });
        }
      }
    });

    // Sort bays by number
    bays.sort((a, b) => a.bayNumber - b.bayNumber);

    return bays;
  }, [rowNode, row]);

  // Collect all unique levels from all bins in this row
  const uniqueLevels = useMemo(() => {
    const levelSet = new Set<string>();

    baysData.forEach(bayData => {
      bayData.bins.forEach(bin => {
        let levelCode: string | null = null;
        if (bin.parsed) {
          levelCode = bin.parsed.level;
        } else if (LEVEL_CODES.includes(bin.name as typeof LEVEL_CODES[number])) {
          levelCode = bin.name;
        }
        if (levelCode) {
          levelSet.add(levelCode);
        }
      });
    });

    // Convert to array with indices and sort by level index
    const levels = Array.from(levelSet).map(code => ({
      code,
      index: LEVEL_CODES.indexOf(code as typeof LEVEL_CODES[number]),
    })).filter(l => l.index >= 0).sort((a, b) => a.index - b.index);

    return levels;
  }, [baysData]);

  // Generate racks only for actual bays in the data
  const racks = useMemo(() => {
    if (baysData.length === 0) {
      return [];
    }

    return baysData.map((bayData, index) => {
      // Position racks sequentially based on their order in the data
      const baseX = index * BAY_WIDTH;
      const basePosition = new Vector3(baseX, 0, baseZ);

      return (
        <Rack
          key={`${row}-${bayData.bayNumber}`}
          row={row}
          bay={bayData.bayNumber}
          basePosition={basePosition}
          bins={bayData.bins}
          selectedBinId={selectedBinId}
          onBinClick={onBinClick}
        />
      );
    });
  }, [row, baseZ, baysData, selectedBinId, onBinClick, BAY_WIDTH]);

  return (
    <group>
      {/* Row label on the floor at the beginning of the row */}
      <Text
        position={[-0.8, 0.02, baseZ + BIN_DEPTH / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color={rowLabelColor}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {row}
      </Text>

      {/* Level labels at the beginning of the row - vertical standing labels */}
      {uniqueLevels.map(level => {
        const levelY = level.index * LEVEL_HEIGHT + LEVEL_HEIGHT / 2 + beamHeight;
        return (
          <Text
            key={`level-label-${level.code}`}
            position={[-0.5, levelY, baseZ + BIN_DEPTH + 0.2]}
            rotation={[0, 0, 0]}
            fontSize={0.2}
            color={levelLabelColor}
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {level.code}
          </Text>
        );
      })}

      {/* Racks in this row */}
      {racks}
    </group>
  );
}
