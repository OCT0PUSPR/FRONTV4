// RackRow Component - Row of racks (one aisle)
// Only renders racks that actually exist in the data

import React, { useMemo } from 'react';
import { Vector3 } from 'three';
import { LocationNode } from '../types';
import { LAYOUT, getRowIndex } from '../utils/positionCalculator';
import { Rack } from './Rack';

interface RackRowProps {
  row: string;
  rowNode?: LocationNode;
  selectedBinId: number | null;
  onBinClick?: (id: number) => void;
  visibleLevels: Set<string>;
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
  visibleLevels,
}: RackRowProps) {
  const { BAY_WIDTH, ROW_SPACING, BACK_TO_BACK_GAP, BIN_DEPTH } = LAYOUT;

  // Calculate Z position based on row index (0-based position)
  const rowIndex = getRowIndex(row);
  const baseZ = rowIndex * (ROW_SPACING + BIN_DEPTH);

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

    console.log(`[RackRow] Row ${row}: Found ${bays.length} bays`, bays.map(b => b.bayNumber));

    return bays;
  }, [rowNode, row]);

  // Generate racks only for actual bays in the data
  const racks = useMemo(() => {
    if (baysData.length === 0) {
      console.log(`[RackRow] Row ${row}: No bays to render`);
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
          visibleLevels={visibleLevels}
        />
      );
    });
  }, [row, baseZ, baysData, selectedBinId, onBinClick, visibleLevels, BAY_WIDTH]);

  return <group>{racks}</group>;
}
