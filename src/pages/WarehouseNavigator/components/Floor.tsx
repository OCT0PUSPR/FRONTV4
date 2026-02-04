// Floor Component - Warehouse with cement floor and thick 3D walls
// Features: Concrete-look floor with thickness, walls set back from racks

import React, { useMemo } from 'react';
import { useTheme } from '../../../../context/theme';
import { hexToNumber } from '../utils/colorTheme';

interface FloorProps {
  // Actual dimensions from the data (rack area)
  warehouseWidth: number;
  warehouseDepth: number;
  warehouseHeight: number;
}

// Layout constants
const WALL_THICKNESS = 0.4;           // Thick walls
const WALL_DISTANCE_FROM_RACKS = 8;   // Distance between racks and walls
const FLOOR_EXTENSION_BEYOND_WALLS = 5; // Floor extends past walls
const FLOOR_THICKNESS = 0.3;          // Concrete slab thickness

// Concrete/Cement colors
const CONCRETE_COLORS = {
  light: {
    floor: '#A8A8A0',        // Light gray cement
    floorDark: '#989890',    // Darker patches
    walls: '#C8C8C0',        // Light gray walls
    wallsInner: '#B8B8B0',   // Inner wall color
  },
  dark: {
    floor: '#484840',        // Dark gray cement
    floorDark: '#383830',    // Darker patches
    walls: '#585850',        // Dark gray walls
    wallsInner: '#505048',   // Inner wall color
  },
};

export function Floor({ warehouseWidth, warehouseDepth, warehouseHeight }: FloorProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const colors = isDark ? CONCRETE_COLORS.dark : CONCRETE_COLORS.light;

  // Calculate interior space (racks + clearance)
  const interiorWidth = warehouseWidth + WALL_DISTANCE_FROM_RACKS * 2;
  const interiorDepth = warehouseDepth + WALL_DISTANCE_FROM_RACKS * 2;

  // Calculate total floor dimensions (extends beyond walls)
  const totalFloorWidth = interiorWidth + FLOOR_EXTENSION_BEYOND_WALLS * 2;
  const totalFloorDepth = interiorDepth + FLOOR_EXTENSION_BEYOND_WALLS * 2;

  // Center of rack area
  const rackCenterX = warehouseWidth / 2;
  const rackCenterZ = warehouseDepth / 2;

  // Offset to account for wall distance (racks start at 0,0 but walls are set back)
  const wallOffsetX = -WALL_DISTANCE_FROM_RACKS;
  const wallOffsetZ = -WALL_DISTANCE_FROM_RACKS;

  // Wall height (taller than racks)
  const wallHeight = Math.max(warehouseHeight + 2, 6);

  return (
    <group>
      {/* Concrete Floor Slab - thick 3D box */}
      <ConcreteFloor
        width={totalFloorWidth}
        depth={totalFloorDepth}
        thickness={FLOOR_THICKNESS}
        centerX={rackCenterX}
        centerZ={rackCenterZ}
        colors={colors}
        isDark={isDark}
      />

      {/* Thick 3D Walls - positioned away from racks */}
      <Walls
        width={interiorWidth}
        depth={interiorDepth}
        height={wallHeight}
        thickness={WALL_THICKNESS}
        offsetX={wallOffsetX}
        offsetZ={wallOffsetZ}
        colors={colors}
      />
    </group>
  );
}

interface ConcreteFloorProps {
  width: number;
  depth: number;
  thickness: number;
  centerX: number;
  centerZ: number;
  colors: typeof CONCRETE_COLORS.light;
  isDark: boolean;
}

function ConcreteFloor({ width, depth, thickness, centerX, centerZ, colors }: ConcreteFloorProps) {
  // Create concrete slab with subtle variations
  const floorColor = hexToNumber(colors.floor);
  const floorDarkColor = hexToNumber(colors.floorDark);

  return (
    <group>
      {/* Main concrete slab */}
      <mesh
        position={[centerX, -thickness / 2, centerZ]}
        receiveShadow
      >
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={0.95}
          metalness={0.02}
        />
      </mesh>

      {/* Floor surface with grid pattern (expansion joints) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, 0.005, centerZ]}
        receiveShadow
      >
        <planeGeometry args={[width - 0.1, depth - 0.1]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={0.9}
          metalness={0.02}
        />
      </mesh>

      {/* Expansion joints / control joints - horizontal lines */}
      <ExpansionJoints
        width={width}
        depth={depth}
        centerX={centerX}
        centerZ={centerZ}
        color={floorDarkColor}
      />

      {/* Floor edge/border */}
      <FloorEdge
        width={width}
        depth={depth}
        thickness={thickness}
        centerX={centerX}
        centerZ={centerZ}
        color={floorDarkColor}
      />
    </group>
  );
}

interface ExpansionJointsProps {
  width: number;
  depth: number;
  centerX: number;
  centerZ: number;
  color: number;
}

function ExpansionJoints({ width, depth, centerX, centerZ, color }: ExpansionJointsProps) {
  const jointWidth = 0.03;
  const jointSpacing = 4; // Every 4 units

  const joints = useMemo(() => {
    const elements: React.ReactElement[] = [];

    // Horizontal joints (along X axis)
    const numHorizontal = Math.floor(depth / jointSpacing);
    for (let i = 1; i < numHorizontal; i++) {
      const z = centerZ - depth / 2 + i * jointSpacing;
      elements.push(
        <mesh
          key={`h-joint-${i}`}
          position={[centerX, 0.006, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[width - 1, jointWidth]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
      );
    }

    // Vertical joints (along Z axis)
    const numVertical = Math.floor(width / jointSpacing);
    for (let i = 1; i < numVertical; i++) {
      const x = centerX - width / 2 + i * jointSpacing;
      elements.push(
        <mesh
          key={`v-joint-${i}`}
          position={[x, 0.006, centerZ]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        >
          <planeGeometry args={[depth - 1, jointWidth]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
      );
    }

    return elements;
  }, [width, depth, centerX, centerZ, color]);

  return <group>{joints}</group>;
}

interface FloorEdgeProps {
  width: number;
  depth: number;
  thickness: number;
  centerX: number;
  centerZ: number;
  color: number;
}

function FloorEdge({ width, depth, thickness, centerX, centerZ, color }: FloorEdgeProps) {
  const edgeWidth = 0.15;

  return (
    <group>
      {/* Front edge */}
      <mesh position={[centerX, -thickness / 2, centerZ + depth / 2 - edgeWidth / 2]}>
        <boxGeometry args={[width, thickness + 0.02, edgeWidth]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {/* Back edge */}
      <mesh position={[centerX, -thickness / 2, centerZ - depth / 2 + edgeWidth / 2]}>
        <boxGeometry args={[width, thickness + 0.02, edgeWidth]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {/* Left edge */}
      <mesh position={[centerX - width / 2 + edgeWidth / 2, -thickness / 2, centerZ]}>
        <boxGeometry args={[edgeWidth, thickness + 0.02, depth]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {/* Right edge */}
      <mesh position={[centerX + width / 2 - edgeWidth / 2, -thickness / 2, centerZ]}>
        <boxGeometry args={[edgeWidth, thickness + 0.02, depth]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
    </group>
  );
}

interface WallsProps {
  width: number;
  depth: number;
  height: number;
  thickness: number;
  offsetX: number;
  offsetZ: number;
  colors: typeof CONCRETE_COLORS.light;
}

function Walls({ width, depth, height, thickness, offsetX, offsetZ, colors }: WallsProps) {
  const wallColor = hexToNumber(colors.walls);
  const wallInnerColor = hexToNumber(colors.wallsInner);

  // Calculate wall positions (offset from rack area)
  const walls = useMemo(() => {
    const halfThickness = thickness / 2;
    const centerX = width / 2 + offsetX;
    const centerZ = depth / 2 + offsetZ;

    return [
      // Back wall (Z = offsetZ - thickness/2)
      {
        key: 'back',
        position: [centerX, height / 2, offsetZ - halfThickness] as [number, number, number],
        dimensions: [width + thickness * 2, height, thickness] as [number, number, number],
        isOuter: true,
      },
      // Front wall (Z = offsetZ + depth + thickness/2)
      {
        key: 'front',
        position: [centerX, height / 2, offsetZ + depth + halfThickness] as [number, number, number],
        dimensions: [width + thickness * 2, height, thickness] as [number, number, number],
        isOuter: true,
      },
      // Left wall (X = offsetX - thickness/2)
      {
        key: 'left',
        position: [offsetX - halfThickness, height / 2, centerZ] as [number, number, number],
        dimensions: [thickness, height, depth] as [number, number, number],
        isOuter: true,
      },
      // Right wall (X = offsetX + width + thickness/2)
      {
        key: 'right',
        position: [offsetX + width + halfThickness, height / 2, centerZ] as [number, number, number],
        dimensions: [thickness, height, depth] as [number, number, number],
        isOuter: true,
      },
    ];
  }, [width, depth, height, thickness, offsetX, offsetZ]);

  return (
    <group>
      {walls.map(wall => (
        <mesh
          key={wall.key}
          position={wall.position}
          castShadow
          receiveShadow
        >
          <boxGeometry args={wall.dimensions} />
          <meshStandardMaterial
            color={wallColor}
            roughness={0.85}
            metalness={0.05}
          />
        </mesh>
      ))}

      {/* Wall base / baseboard */}
      <WallBase
        width={width}
        depth={depth}
        thickness={thickness}
        offsetX={offsetX}
        offsetZ={offsetZ}
        color={wallInnerColor}
      />
    </group>
  );
}

interface WallBaseProps {
  width: number;
  depth: number;
  thickness: number;
  offsetX: number;
  offsetZ: number;
  color: number;
}

function WallBase({ width, depth, offsetX, offsetZ, color }: WallBaseProps) {
  const baseHeight = 0.2;
  const baseDepth = 0.1;
  const centerX = width / 2 + offsetX;
  const centerZ = depth / 2 + offsetZ;

  return (
    <group>
      {/* Back baseboard */}
      <mesh position={[centerX, baseHeight / 2, offsetZ + baseDepth / 2]}>
        <boxGeometry args={[width, baseHeight, baseDepth]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {/* Front baseboard */}
      <mesh position={[centerX, baseHeight / 2, offsetZ + depth - baseDepth / 2]}>
        <boxGeometry args={[width, baseHeight, baseDepth]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {/* Left baseboard */}
      <mesh position={[offsetX + baseDepth / 2, baseHeight / 2, centerZ]}>
        <boxGeometry args={[baseDepth, baseHeight, depth - baseDepth * 2]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {/* Right baseboard */}
      <mesh position={[offsetX + width - baseDepth / 2, baseHeight / 2, centerZ]}>
        <boxGeometry args={[baseDepth, baseHeight, depth - baseDepth * 2]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  );
}
