// Zone Component - Floor-based areas (docks, staging, scrap, QC, etc.)
// Different visualizations based on zone type

import { useRef, useState, useMemo } from 'react';
import { Mesh, Vector3 } from 'three';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useTheme } from '../../../../context/theme';
import { hexToNumber } from '../utils/colorTheme';
import { ZoneType } from '../types';

// Re-export for backward compatibility
export type { ZoneType } from '../types';

// Zone colors by type
const ZONE_COLORS = {
  light: {
    dock: {
      floor: '#4A5568',      // Dark gray
      border: '#2D3748',     // Darker border
      accent: '#3182CE',     // Blue accent
      label: '#FFFFFF',
    },
    staging: {
      floor: '#ECC94B',      // Yellow
      border: '#D69E2E',     // Darker yellow
      accent: '#F6E05E',     // Light yellow
      label: '#1A202C',
    },
    scrap: {
      floor: '#C53030',      // Red
      border: '#9B2C2C',     // Darker red
      accent: '#FC8181',     // Light red
      label: '#FFFFFF',
    },
    qc: {
      floor: '#38A169',      // Green
      border: '#276749',     // Darker green
      accent: '#68D391',     // Light green
      label: '#FFFFFF',
    },
    packing: {
      floor: '#805AD5',      // Purple
      border: '#6B46C1',     // Darker purple
      accent: '#B794F4',     // Light purple
      label: '#FFFFFF',
    },
    floor: {
      floor: '#718096',      // Gray
      border: '#4A5568',     // Darker gray
      accent: '#A0AEC0',     // Light gray
      label: '#FFFFFF',
    },
  },
  dark: {
    dock: {
      floor: '#2D3748',
      border: '#1A202C',
      accent: '#4299E1',
      label: '#FFFFFF',
    },
    staging: {
      floor: '#B7791F',
      border: '#975A16',
      accent: '#ECC94B',
      label: '#FFFFFF',
    },
    scrap: {
      floor: '#9B2C2C',
      border: '#742A2A',
      accent: '#FC8181',
      label: '#FFFFFF',
    },
    qc: {
      floor: '#276749',
      border: '#22543D',
      accent: '#68D391',
      label: '#FFFFFF',
    },
    packing: {
      floor: '#553C9A',
      border: '#44337A',
      accent: '#B794F4',
      label: '#FFFFFF',
    },
    floor: {
      floor: '#4A5568',
      border: '#2D3748',
      accent: '#718096',
      label: '#FFFFFF',
    },
  },
};

// Zone icons/labels
const ZONE_LABELS: Record<ZoneType, string> = {
  dock: '🚛 DOCK',
  staging: '📦 STAGING',
  scrap: '⚠️ SCRAP',
  qc: '✓ QC',
  packing: '📋 PACKING',
  floor: '▢ FLOOR',
};

interface ZoneProps {
  position: Vector3;
  width: number;
  depth: number;
  zoneType: ZoneType;
  name: string;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
  locationId: number;
  hasItems?: boolean;
}

export function Zone({
  position,
  width,
  depth,
  zoneType,
  name,
  isSelected = false,
  isHighlighted = false,
  onClick,
  hasItems = false,
}: ZoneProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const colors = isDark ? ZONE_COLORS.dark[zoneType] : ZONE_COLORS.light[zoneType];

  const floorHeight = 0.05;
  const borderHeight = 0.15;
  const borderWidth = 0.08;

  // Pulse animation for selected/highlighted
  const pulseRef = useRef(0);
  useFrame((_, delta) => {
    if (isSelected || isHighlighted) {
      pulseRef.current += delta * 2;
    }
  });

  const floorColor = useMemo(() => {
    if (isSelected) return hexToNumber(colors.accent);
    if (hovered) return hexToNumber(colors.accent);
    return hexToNumber(colors.floor);
  }, [isSelected, hovered, colors]);

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Main floor area */}
      <mesh
        ref={meshRef}
        position={[width / 2, floorHeight / 2, depth / 2]}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        receiveShadow
      >
        <boxGeometry args={[width, floorHeight, depth]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={0.8}
          metalness={0.1}
          emissive={isSelected || isHighlighted ? floorColor : 0}
          emissiveIntensity={isSelected || isHighlighted ? 0.3 : 0}
        />
      </mesh>

      {/* Border lines */}
      {/* Front border */}
      <mesh position={[width / 2, borderHeight / 2, borderWidth / 2]} castShadow>
        <boxGeometry args={[width, borderHeight, borderWidth]} />
        <meshStandardMaterial color={hexToNumber(colors.border)} roughness={0.6} />
      </mesh>
      {/* Back border */}
      <mesh position={[width / 2, borderHeight / 2, depth - borderWidth / 2]} castShadow>
        <boxGeometry args={[width, borderHeight, borderWidth]} />
        <meshStandardMaterial color={hexToNumber(colors.border)} roughness={0.6} />
      </mesh>
      {/* Left border */}
      <mesh position={[borderWidth / 2, borderHeight / 2, depth / 2]} castShadow>
        <boxGeometry args={[borderWidth, borderHeight, depth]} />
        <meshStandardMaterial color={hexToNumber(colors.border)} roughness={0.6} />
      </mesh>
      {/* Right border */}
      <mesh position={[width - borderWidth / 2, borderHeight / 2, depth / 2]} castShadow>
        <boxGeometry args={[borderWidth, borderHeight, depth]} />
        <meshStandardMaterial color={hexToNumber(colors.border)} roughness={0.6} />
      </mesh>

      {/* Corner posts for docks */}
      {zoneType === 'dock' && (
        <>
          {[[0, 0], [width, 0], [0, depth], [width, depth]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.3, z]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 0.6, 8]} />
              <meshStandardMaterial color={hexToNumber(colors.accent)} metalness={0.3} />
            </mesh>
          ))}
        </>
      )}

      {/* Warning stripes for scrap area */}
      {zoneType === 'scrap' && (
        <mesh position={[width / 2, floorHeight + 0.01, depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width * 0.8, depth * 0.8]} />
          <meshStandardMaterial
            color={hexToNumber('#000000')}
            opacity={0.3}
            transparent
          />
        </mesh>
      )}

      {/* Floating label */}
      <Text
        position={[width / 2, 1.5, depth / 2]}
        fontSize={0.4}
        color={colors.label}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {name || ZONE_LABELS[zoneType]}
      </Text>

      {/* Zone type indicator */}
      <Text
        position={[width / 2, 1.1, depth / 2]}
        fontSize={0.25}
        color={colors.accent}
        anchorX="center"
        anchorY="middle"
      >
        {ZONE_LABELS[zoneType]}
      </Text>

      {/* Pallets in staging/floor areas when has items */}
      {hasItems && (zoneType === 'staging' || zoneType === 'floor') && (
        <StagingPallets width={width} depth={depth} isDark={isDark} />
      )}

      {/* Dock door visualization */}
      {zoneType === 'dock' && (
        <DockDoor position={[width / 2, 0, depth]} width={width * 0.8} isDark={isDark} />
      )}
    </group>
  );
}

// Staging pallets visualization
function StagingPallets({ width, depth, isDark }: { width: number; depth: number; isDark: boolean }) {
  const palletColor = isDark ? '#5C4033' : '#8B7355';
  const boxColor = isDark ? '#4A5568' : '#718096';

  // Create a grid of pallets
  const palletSize = 1.2;
  const cols = Math.floor((width - 0.5) / (palletSize + 0.3));
  const rows = Math.floor((depth - 0.5) / (palletSize + 0.3));

  const pallets = [];
  for (let i = 0; i < Math.min(cols * rows, 6); i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    pallets.push({
      x: 0.4 + col * (palletSize + 0.3) + palletSize / 2,
      z: 0.4 + row * (palletSize + 0.3) + palletSize / 2,
    });
  }

  return (
    <group>
      {pallets.map((p, i) => (
        <group key={i} position={[p.x, 0.05, p.z]}>
          {/* Pallet base */}
          <mesh position={[0, 0.04, 0]} castShadow>
            <boxGeometry args={[palletSize, 0.08, palletSize]} />
            <meshStandardMaterial color={hexToNumber(palletColor)} roughness={0.9} />
          </mesh>
          {/* Box on pallet */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[palletSize * 0.8, 0.6, palletSize * 0.8]} />
            <meshStandardMaterial color={hexToNumber(boxColor)} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Dock door visualization
function DockDoor({ position, width, isDark }: { position: [number, number, number]; width: number; isDark: boolean }) {
  const doorColor = isDark ? '#1A202C' : '#2D3748';
  const frameColor = isDark ? '#4A5568' : '#718096';
  const height = 3;

  return (
    <group position={position}>
      {/* Door frame */}
      <mesh position={[0, height / 2, 0.1]} castShadow>
        <boxGeometry args={[width + 0.3, height, 0.2]} />
        <meshStandardMaterial color={hexToNumber(frameColor)} metalness={0.3} />
      </mesh>

      {/* Door (rolled up appearance) */}
      <mesh position={[0, height - 0.3, 0.05]}>
        <cylinderGeometry args={[0.25, 0.25, width, 16]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hexToNumber(doorColor)} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Door opening */}
      <mesh position={[0, height / 2 - 0.3, 0]}>
        <boxGeometry args={[width, height - 0.6, 0.05]} />
        <meshStandardMaterial color={0x000000} opacity={0.8} transparent />
      </mesh>

      {/* Dock bumpers */}
      <mesh position={[-width / 2 - 0.1, 0.5, 0.15]} castShadow>
        <boxGeometry args={[0.15, 1, 0.3]} />
        <meshStandardMaterial color={hexToNumber('#1A1A1A')} roughness={0.9} />
      </mesh>
      <mesh position={[width / 2 + 0.1, 0.5, 0.15]} castShadow>
        <boxGeometry args={[0.15, 1, 0.3]} />
        <meshStandardMaterial color={hexToNumber('#1A1A1A')} roughness={0.9} />
      </mesh>
    </group>
  );
}

// Export zone types for use elsewhere
export { ZONE_COLORS, ZONE_LABELS };
