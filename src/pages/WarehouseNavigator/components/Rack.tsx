// Rack Component - Industrial Pallet Rack with proper styling
// Features: Blue uprights, orange beams, wire mesh decking, diagonal bracing, labels

import React, { useMemo } from 'react';
import { Vector3 } from 'three';
import { Text } from '@react-three/drei';
import { useTheme } from '../../../../context/theme';
import { hexToNumber, RACK_COLORS } from '../utils/colorTheme';
import { LAYOUT, LEVEL_CODES } from '../utils/positionCalculator';
import { LocationNode } from '../types';
import { Bin } from './Bin';

// Label colors
const LABEL_COLORS = {
  light: {
    rackNumber: '#1a1a1a',
    levelCode: '#2a4a6a',
  },
  dark: {
    rackNumber: '#f0f0f0',
    levelCode: '#8ab4d4',
  },
};

interface RackProps {
  row: string;
  bay: number;
  basePosition: Vector3;
  bins?: LocationNode[];
  selectedBinId: number | null;
  onBinClick?: (id: number) => void;
}

// Level data structure for rendering
interface LevelData {
  levelCode: string;
  levelIndex: number;
  bins: LocationNode[];
}

export function Rack({
  row,
  bay,
  basePosition,
  bins = [],
  selectedBinId,
  onBinClick,
}: RackProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  // Industrial colors
  const uprightColor = hexToNumber(isDark ? RACK_COLORS.uprightBlueDark : RACK_COLORS.uprightBlue);
  const beamColor = hexToNumber(isDark ? RACK_COLORS.beamOrangeDark : RACK_COLORS.beamOrange);
  const wireColor = hexToNumber(isDark ? RACK_COLORS.wireDeckingDark : RACK_COLORS.wireDecking);
  const bracingColor = hexToNumber(isDark ? RACK_COLORS.bracingGrayDark : RACK_COLORS.bracingGray);

  // Label colors
  const labelColors = isDark ? LABEL_COLORS.dark : LABEL_COLORS.light;

  const { BAY_WIDTH, LEVEL_HEIGHT, BIN_DEPTH } = LAYOUT;

  // Organize bins by level
  const levelsData = useMemo(() => {
    const levelMap = new Map<string, LocationNode[]>();

    bins.forEach(bin => {
      // Get level from parsed data or from bin name (if level IS the bin)
      let levelCode: string | null = null;

      if (bin.parsed) {
        levelCode = bin.parsed.level;
      } else {
        // If no parsed data, the bin name might BE the level code (e.g., "AA", "AB")
        // Check if the name matches a level code pattern
        if (LEVEL_CODES.includes(bin.name as typeof LEVEL_CODES[number])) {
          levelCode = bin.name;
        }
      }

      if (levelCode) {
        const existing = levelMap.get(levelCode) || [];
        existing.push(bin);
        levelMap.set(levelCode, existing);
      }
    });

    const levels: LevelData[] = Array.from(levelMap.entries()).map(([levelCode, levelBins]) => ({
      levelCode,
      levelIndex: LEVEL_CODES.indexOf(levelCode as typeof LEVEL_CODES[number]),
      bins: levelBins,
    }));

    levels.sort((a, b) => a.levelIndex - b.levelIndex);

    return levels;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bins]);

  // Calculate rack dimensions based on data
  const rackDimensions = useMemo(() => {
    if (levelsData.length === 0) {
      const defaultLevelCount = 2;
      const roofThickness = 0.03;
      const beamH = 0.12;
      return {
        width: BAY_WIDTH,
        depth: BIN_DEPTH * 1.2,
        height: defaultLevelCount * LEVEL_HEIGHT + beamH + roofThickness,
        levelCount: defaultLevelCount,
        allLevelIndices: [0, 1],
      };
    }

    // Get all level indices (filter out -1 for unrecognized levels)
    const validLevelIndices = levelsData
      .map(l => l.levelIndex)
      .filter(idx => idx >= 0);

    const maxLevelIndex = Math.max(...validLevelIndices, 0);
    const levelCount = maxLevelIndex + 1;

    // Height should stop at the roof level (levelCount * LEVEL_HEIGHT + beamHeight + roofThickness)
    const roofThickness = 0.03;
    const beamH = 0.12;
    return {
      width: BAY_WIDTH,
      depth: BIN_DEPTH * 1.2,
      height: levelCount * LEVEL_HEIGHT + beamH + roofThickness,
      levelCount,
      allLevelIndices: validLevelIndices,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelsData, BAY_WIDTH, BIN_DEPTH, LEVEL_HEIGHT]);

  const { width: rackWidth, depth: rackDepth, height: rackHeight, levelCount, allLevelIndices } = rackDimensions;

  // Upright dimensions (rectangular tube profile)
  const uprightWidth = 0.08;
  const uprightDepth = 0.06;

  // Beam dimensions
  const beamHeight = 0.12;
  const beamDepth = 0.06;

  // Generate vertical uprights (4 corners - rectangular tubes)
  const uprights = useMemo(() => {
    const elements: React.ReactElement[] = [];

    // Four corner uprights
    const positions = [
      { x: 0, z: 0 },
      { x: rackWidth - uprightWidth, z: 0 },
      { x: 0, z: rackDepth - uprightDepth },
      { x: rackWidth - uprightWidth, z: rackDepth - uprightDepth },
    ];

    positions.forEach((pos, i) => {
      elements.push(
        <mesh
          key={`upright-${i}`}
          position={[
            basePosition.x + pos.x + uprightWidth / 2,
            rackHeight / 2,
            basePosition.z + pos.z + uprightDepth / 2,
          ]}
          
        >
          <boxGeometry args={[uprightWidth, rackHeight, uprightDepth]} />
          <meshStandardMaterial
            color={uprightColor}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      );
    });

    return elements;
  }, [basePosition, rackWidth, rackDepth, rackHeight, uprightWidth, uprightDepth, uprightColor]);

  // Generate simplified bracing on side frames (just horizontal connectors)
  const bracing = useMemo(() => {
    const elements: React.ReactElement[] = [];
    const bracingThickness = 0.02;

    // Only add horizontal braces at bottom and top for performance
    const sidePositions = [
      { x: uprightWidth / 2 },
      { x: rackWidth - uprightWidth / 2 },
    ];

    sidePositions.forEach((sidePos, sideIndex) => {
      // Just bottom and top horizontal braces
      [0, levelCount].forEach(level => {
        const y = level * LEVEL_HEIGHT;
        elements.push(
          <mesh
            key={`h-brace-${sideIndex}-${level}`}
            position={[
              basePosition.x + sidePos.x,
              y + beamHeight / 2,
              basePosition.z + rackDepth / 2,
            ]}
          >
            <boxGeometry args={[bracingThickness, bracingThickness, rackDepth - uprightDepth]} />
            <meshStandardMaterial color={bracingColor} metalness={0.5} roughness={0.4} />
          </mesh>
        );
      });
    });

    return elements;
  }, [basePosition, rackWidth, rackDepth, levelCount, uprightWidth, uprightDepth, beamHeight, bracingColor, LEVEL_HEIGHT]);

  // Generate orange horizontal load beams
  const beams = useMemo(() => {
    const elements: React.ReactElement[] = [];
    // Render beams at floor (0) and at each level that has bins, plus top
    const beamLevels = [0, ...allLevelIndices, levelCount];
    const uniqueBeamLevels = [...new Set(beamLevels)].filter(l => l >= 0).sort((a, b) => a - b);

    uniqueBeamLevels.forEach(level => {
      const y = level * LEVEL_HEIGHT;

      // Front beam (orange load beam)
      elements.push(
        <mesh
          key={`beam-front-${level}`}
          position={[
            basePosition.x + rackWidth / 2,
            y + beamHeight / 2,
            basePosition.z + uprightDepth / 2,
          ]}
          
        >
          <boxGeometry args={[rackWidth - uprightWidth * 2, beamHeight, beamDepth]} />
          <meshStandardMaterial
            color={beamColor}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
      );

      // Back beam (orange load beam)
      elements.push(
        <mesh
          key={`beam-back-${level}`}
          position={[
            basePosition.x + rackWidth / 2,
            y + beamHeight / 2,
            basePosition.z + rackDepth - uprightDepth / 2,
          ]}
          
        >
          <boxGeometry args={[rackWidth - uprightWidth * 2, beamHeight, beamDepth]} />
          <meshStandardMaterial
            color={beamColor}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
      );
    });

    return elements;
  }, [basePosition, rackWidth, rackDepth, allLevelIndices, levelCount, uprightWidth, uprightDepth, beamHeight, beamDepth, beamColor, LEVEL_HEIGHT]);

  // Generate wire mesh decking for each level (simplified - just the deck plane)
  const wireDecking = useMemo(() => {
    const elements: React.ReactElement[] = [];
    // Render decking at each level that has bins
    const deckLevels = allLevelIndices.filter(l => l >= 0);

    deckLevels.forEach(level => {
      const y = level * LEVEL_HEIGHT + beamHeight;
      const deckWidth = rackWidth - uprightWidth * 2 - 0.02;
      const deckDepth = rackDepth - uprightDepth * 2 - 0.02;

      // Wire mesh deck (simplified single plane with wireframe for grid effect)
      elements.push(
        <mesh
          key={`deck-${level}`}
          position={[
            basePosition.x + rackWidth / 2,
            y + 0.01,
            basePosition.z + rackDepth / 2,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
          
        >
          <planeGeometry args={[deckWidth, deckDepth, 4, 3]} />
          <meshStandardMaterial
            color={wireColor}
            metalness={0.7}
            roughness={0.2}
            wireframe={true}
          />
        </mesh>
      );
    });

    return elements;
  }, [basePosition, rackWidth, rackDepth, allLevelIndices, uprightWidth, uprightDepth, beamHeight, wireColor, LEVEL_HEIGHT]);

  // Generate roof/top shelf for the rack (simplified - just the panel)
  const roofPanel = useMemo(() => {
    const roofY = levelCount * LEVEL_HEIGHT + beamHeight;
    const roofWidth = rackWidth - uprightWidth * 2;
    const roofDepth = rackDepth - uprightDepth * 2;
    const roofThickness = 0.03;

    return (
      <mesh
        position={[
          basePosition.x + rackWidth / 2,
          roofY + roofThickness / 2,
          basePosition.z + rackDepth / 2,
        ]}
        
      >
        <boxGeometry args={[roofWidth, roofThickness, roofDepth]} />
        <meshStandardMaterial
          color={wireColor}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
    );
  }, [basePosition, rackWidth, rackDepth, levelCount, uprightWidth, uprightDepth, beamHeight, wireColor, LEVEL_HEIGHT]);

  return (
    <group>
      {/* Blue vertical uprights */}
      {uprights}

      {/* Diagonal bracing on side frames */}
      {bracing}

      {/* Orange horizontal load beams */}
      {beams}

      {/* Wire mesh decking */}
      {wireDecking}

      {/* Roof/top panel */}
      {roofPanel}

      {/* Render bins that exist in the data */}
      {levelsData.map(levelData => {
        // Skip invalid level indices
        if (levelData.levelIndex < 0) return null;

        // Position bin on top of the shelf decking
        const levelY = levelData.levelIndex * LEVEL_HEIGHT + beamHeight + 0.02;

        return levelData.bins.map((bin) => {
          // Get side from parsed data, or default to 1 (left position)
          // Side 1 = left half of shelf, Side 2 = right half of shelf
          const side = bin.parsed?.side || 1;

          // Calculate bin position within the shelf
          // Shelf area is between uprights: from uprightWidth to (rackWidth - uprightWidth)
          const shelfWidth = rackWidth - uprightWidth * 2;
          const binSlotWidth = shelfWidth / 2; // Two bins per shelf

          // Position bin in its slot (side 1 = left slot, side 2 = right slot)
          const binX = basePosition.x + uprightWidth + (side - 1) * binSlotWidth + 0.02;
          const binZ = basePosition.z + uprightDepth + 0.02;

          const binPosition = new Vector3(binX, levelY, binZ);

          return (
            <Bin
              key={`${row}-${bay}-${bin.id}`}
              position={binPosition}
              isOccupied={bin.hasStock}
              isSelected={bin.id === selectedBinId}
              onClick={() => onBinClick?.(bin.id)}
              locationId={bin.id}
              locationName={bin.name}
            />
          );
        });
      })}

      {/* Rack number label standing vertical above rack */}
      <Text
        position={[basePosition.x + rackWidth / 2, rackHeight + 0.15, basePosition.z + rackDepth + 0.1]}
        rotation={[0, 0, 0]}
        fontSize={0.3}
        color={labelColors.rackNumber}
        anchorX="center"
        anchorY="bottom"
        fontWeight="bold"
      >
        {String(bay).padStart(2, '0')}
      </Text>
    </group>
  );
}
