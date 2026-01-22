// Rack Component - Industrial Pallet Rack with proper styling
// Features: Blue uprights, orange beams, wire mesh decking, diagonal bracing

import React, { useMemo } from 'react';
import { Vector3 } from 'three';
import { useTheme } from '../../../../context/theme';
import { hexToNumber, RACK_COLORS } from '../utils/colorTheme';
import { LAYOUT, LEVEL_CODES } from '../utils/positionCalculator';
import { LocationNode } from '../types';
import { Bin } from './Bin';

interface RackProps {
  row: string;
  bay: number;
  basePosition: Vector3;
  bins?: LocationNode[];
  selectedBinId: number | null;
  onBinClick?: (id: number) => void;
  visibleLevels: Set<string>;
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
  visibleLevels,
}: RackProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  // Industrial colors
  const uprightColor = hexToNumber(isDark ? RACK_COLORS.uprightBlueDark : RACK_COLORS.uprightBlue);
  const beamColor = hexToNumber(isDark ? RACK_COLORS.beamOrangeDark : RACK_COLORS.beamOrange);
  const wireColor = hexToNumber(isDark ? RACK_COLORS.wireDeckingDark : RACK_COLORS.wireDecking);
  const bracingColor = hexToNumber(isDark ? RACK_COLORS.bracingGrayDark : RACK_COLORS.bracingGray);

  const { BAY_WIDTH, LEVEL_HEIGHT, BIN_WIDTH, BIN_DEPTH } = LAYOUT;

  // Organize bins by level
  const levelsData = useMemo(() => {
    const levelMap = new Map<string, LocationNode[]>();

    bins.forEach(bin => {
      if (bin.parsed) {
        const existing = levelMap.get(bin.parsed.level) || [];
        existing.push(bin);
        levelMap.set(bin.parsed.level, existing);
      }
    });

    const levels: LevelData[] = Array.from(levelMap.entries()).map(([levelCode, levelBins]) => ({
      levelCode,
      levelIndex: LEVEL_CODES.indexOf(levelCode as typeof LEVEL_CODES[number]),
      bins: levelBins,
    }));

    levels.sort((a, b) => a.levelIndex - b.levelIndex);

    return levels;
  }, [bins]);

  // Calculate rack dimensions based on data
  const rackDimensions = useMemo(() => {
    if (levelsData.length === 0) {
      return {
        width: BAY_WIDTH,
        depth: BIN_DEPTH * 1.2,
        height: LEVEL_HEIGHT * 3,
        levelCount: 2,
      };
    }

    const maxLevelIndex = Math.max(...levelsData.map(l => l.levelIndex));
    const levelCount = maxLevelIndex + 1;

    return {
      width: BAY_WIDTH,
      depth: BIN_DEPTH * 1.2,
      height: (levelCount + 1) * LEVEL_HEIGHT,
      levelCount,
    };
  }, [levelsData, BAY_WIDTH, BIN_DEPTH, LEVEL_HEIGHT]);

  const { width: rackWidth, depth: rackDepth, height: rackHeight, levelCount } = rackDimensions;

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
          castShadow
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

  // Generate diagonal bracing on side frames
  const bracing = useMemo(() => {
    const elements: React.ReactElement[] = [];
    const bracingThickness = 0.02;

    // Create X-bracing on left and right side frames
    const sidePositions = [
      { x: uprightWidth / 2, side: 'left' },
      { x: rackWidth - uprightWidth / 2, side: 'right' },
    ];

    sidePositions.forEach((sidePos, sideIndex) => {
      // Diagonal braces between each level
      for (let level = 0; level < levelCount; level++) {
        const y1 = level * LEVEL_HEIGHT + beamHeight;
        const y2 = (level + 1) * LEVEL_HEIGHT;
        const midY = (y1 + y2) / 2;
        const segmentHeight = y2 - y1;

        // Calculate diagonal length
        const diagonalLength = Math.sqrt(segmentHeight * segmentHeight + (rackDepth - uprightDepth) * (rackDepth - uprightDepth));
        const angle = Math.atan2(segmentHeight, rackDepth - uprightDepth);

        // First diagonal (bottom-front to top-back)
        elements.push(
          <mesh
            key={`brace-${sideIndex}-${level}-a`}
            position={[
              basePosition.x + sidePos.x,
              midY,
              basePosition.z + rackDepth / 2,
            ]}
            rotation={[angle, 0, 0]}
            castShadow
          >
            <boxGeometry args={[bracingThickness, bracingThickness, diagonalLength]} />
            <meshStandardMaterial color={bracingColor} metalness={0.5} roughness={0.4} />
          </mesh>
        );

        // Second diagonal (bottom-back to top-front) - forms X pattern
        elements.push(
          <mesh
            key={`brace-${sideIndex}-${level}-b`}
            position={[
              basePosition.x + sidePos.x,
              midY,
              basePosition.z + rackDepth / 2,
            ]}
            rotation={[-angle, 0, 0]}
            castShadow
          >
            <boxGeometry args={[bracingThickness, bracingThickness, diagonalLength]} />
            <meshStandardMaterial color={bracingColor} metalness={0.5} roughness={0.4} />
          </mesh>
        );
      }

      // Horizontal braces connecting front and back uprights at each level
      for (let level = 0; level <= levelCount; level++) {
        const y = level * LEVEL_HEIGHT;
        elements.push(
          <mesh
            key={`h-brace-${sideIndex}-${level}`}
            position={[
              basePosition.x + sidePos.x,
              y + beamHeight / 2,
              basePosition.z + rackDepth / 2,
            ]}
            castShadow
          >
            <boxGeometry args={[bracingThickness, bracingThickness, rackDepth - uprightDepth]} />
            <meshStandardMaterial color={bracingColor} metalness={0.5} roughness={0.4} />
          </mesh>
        );
      }
    });

    return elements;
  }, [basePosition, rackWidth, rackDepth, levelCount, uprightWidth, uprightDepth, beamHeight, bracingColor, LEVEL_HEIGHT]);

  // Generate orange horizontal load beams
  const beams = useMemo(() => {
    const elements: React.ReactElement[] = [];
    const levelIndices = new Set(levelsData.map(l => l.levelIndex));
    const beamLevels = [0, ...Array.from(levelIndices), levelCount];
    const uniqueBeamLevels = [...new Set(beamLevels)].sort((a, b) => a - b);

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
          castShadow
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
          castShadow
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
  }, [basePosition, rackWidth, rackDepth, levelsData, levelCount, uprightWidth, uprightDepth, beamHeight, beamDepth, beamColor, LEVEL_HEIGHT]);

  // Generate wire mesh decking for each level
  const wireDecking = useMemo(() => {
    const elements: React.ReactElement[] = [];
    const levelIndices = new Set(levelsData.map(l => l.levelIndex));
    const deckLevels = [...Array.from(levelIndices)];

    deckLevels.forEach(level => {
      const y = level * LEVEL_HEIGHT + beamHeight;
      const deckWidth = rackWidth - uprightWidth * 2 - 0.02;
      const deckDepth = rackDepth - uprightDepth * 2 - 0.02;

      // Wire mesh deck (semi-transparent grid)
      elements.push(
        <mesh
          key={`deck-${level}`}
          position={[
            basePosition.x + rackWidth / 2,
            y + 0.01,
            basePosition.z + rackDepth / 2,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[deckWidth, deckDepth]} />
          <meshStandardMaterial
            color={wireColor}
            metalness={0.7}
            roughness={0.2}
            transparent
            opacity={0.6}
            wireframe={false}
          />
        </mesh>
      );

      // Wire mesh grid lines (cross supports)
      const gridSpacing = 0.15;
      const numCrossSupports = Math.floor(deckDepth / gridSpacing);

      for (let i = 1; i < numCrossSupports; i++) {
        elements.push(
          <mesh
            key={`wire-cross-${level}-${i}`}
            position={[
              basePosition.x + rackWidth / 2,
              y + 0.015,
              basePosition.z + uprightDepth + i * gridSpacing,
            ]}
          >
            <boxGeometry args={[deckWidth, 0.008, 0.008]} />
            <meshStandardMaterial color={wireColor} metalness={0.8} roughness={0.2} />
          </mesh>
        );
      }

      // Longitudinal supports
      const numLongSupports = Math.floor(deckWidth / gridSpacing);
      for (let i = 1; i < numLongSupports; i++) {
        elements.push(
          <mesh
            key={`wire-long-${level}-${i}`}
            position={[
              basePosition.x + uprightWidth + i * gridSpacing,
              y + 0.02,
              basePosition.z + rackDepth / 2,
            ]}
          >
            <boxGeometry args={[0.008, 0.008, deckDepth]} />
            <meshStandardMaterial color={wireColor} metalness={0.8} roughness={0.2} />
          </mesh>
        );
      }
    });

    return elements;
  }, [basePosition, rackWidth, rackDepth, levelsData, uprightWidth, uprightDepth, beamHeight, wireColor, LEVEL_HEIGHT]);

  // Filter levels by visibility setting
  const visibleLevelsData = useMemo(() => {
    if (visibleLevels.size === 0 || visibleLevels.size === LEVEL_CODES.length) {
      return levelsData;
    }
    return levelsData.filter(level => visibleLevels.has(level.levelCode));
  }, [levelsData, visibleLevels]);

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

      {/* Render bins that exist in the data */}
      {visibleLevelsData.map(levelData => {
        const levelY = levelData.levelIndex * LEVEL_HEIGHT + beamHeight + 0.05;

        return levelData.bins.map(bin => {
          const side = bin.parsed?.side || 1;
          const binX = basePosition.x + uprightWidth + (side - 1) * BIN_WIDTH + BIN_WIDTH * 0.1;
          const binZ = basePosition.z + uprightDepth + BIN_DEPTH * 0.1;

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
    </group>
  );
}
