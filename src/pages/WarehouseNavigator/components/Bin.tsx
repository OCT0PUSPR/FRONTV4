// Bin Component - Individual storage bin (solid box) with pallet underneath
// Grey when empty, Orange/Yellow when has items

import { useRef, useState, useMemo } from 'react';
import { Mesh, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { useTheme } from '../../../../context/theme';
import { hexToNumber } from '../utils/colorTheme';
import { LAYOUT } from '../utils/positionCalculator';

// Bin colors
const BIN_COLORS = {
  light: {
    empty: '#8A8A8A',         // Grey for empty bins
    emptyHover: '#A0A0A0',    // Lighter grey on hover
    occupied: '#E8A030',      // Orange/Yellow for occupied
    occupiedHover: '#FFB840', // Brighter on hover
    selected: '#FFD700',      // Gold when selected
  },
  dark: {
    empty: '#606060',         // Dark grey for empty bins
    emptyHover: '#787878',    // Lighter grey on hover
    occupied: '#D08020',      // Orange for occupied
    occupiedHover: '#E89030', // Brighter on hover
    selected: '#FFD700',      // Gold when selected
  },
};

// Pallet colors (wooden appearance)
const PALLET_COLORS = {
  light: {
    wood: '#A67C52',      // Light wood color
    woodDark: '#8B6914',  // Darker wood for depth
  },
  dark: {
    wood: '#7D5A3C',      // Darker wood for dark mode
    woodDark: '#5C4033',  // Even darker
  },
};

// Pallet component - wooden pallet under the bin
function Pallet({
  position,
  width,
  depth,
  isDark,
}: {
  position: [number, number, number];
  width: number;
  depth: number;
  isDark: boolean;
}) {
  const colors = isDark ? PALLET_COLORS.dark : PALLET_COLORS.light;
  const palletHeight = 0.08;
  const boardThickness = 0.02;
  const slatsCount = 5;
  const slatWidth = width / slatsCount;
  const gapRatio = 0.15; // Gap between slats

  return (
    <group position={position}>
      {/* Top boards (slats running along depth) */}
      {Array.from({ length: slatsCount }).map((_, i) => {
        const slatActualWidth = slatWidth * (1 - gapRatio);
        const xOffset = i * slatWidth + slatActualWidth / 2 - width / 2 + (slatWidth * gapRatio) / 2;
        return (
          <mesh
            key={`top-slat-${i}`}
            position={[xOffset, palletHeight - boardThickness / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[slatActualWidth, boardThickness, depth * 0.95]} />
            <meshStandardMaterial
              color={hexToNumber(i % 2 === 0 ? colors.wood : colors.woodDark)}
              roughness={0.9}
              metalness={0}
            />
          </mesh>
        );
      })}

      {/* Support beams (3 beams running along width) */}
      {[-1, 0, 1].map((pos, i) => (
        <mesh
          key={`support-${i}`}
          position={[0, palletHeight / 2, pos * (depth * 0.35)]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width * 0.95, palletHeight - boardThickness, boardThickness * 2]} />
          <meshStandardMaterial
            color={hexToNumber(colors.woodDark)}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      ))}

      {/* Bottom boards (3 boards running along depth for ground contact) */}
      {[-1, 0, 1].map((pos, i) => (
        <mesh
          key={`bottom-${i}`}
          position={[pos * (width * 0.35), boardThickness / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width * 0.2, boardThickness, depth * 0.9]} />
          <meshStandardMaterial
            color={hexToNumber(colors.wood)}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  );
}

interface BinProps {
  position: Vector3;
  isOccupied: boolean;
  isSelected: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
  locationId: number;
  locationName: string;
}

export function Bin({
  position,
  isOccupied,
  isSelected,
  isHighlighted = false,
  onClick,
}: BinProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const colors = isDark ? BIN_COLORS.dark : BIN_COLORS.light;

  const { BIN_WIDTH, BIN_DEPTH, LEVEL_HEIGHT } = LAYOUT;

  // Bin dimensions - sized to fit on shelf
  const binWidth = BIN_WIDTH * 0.85;
  const binDepth = BIN_DEPTH * 0.75;
  const binHeight = LEVEL_HEIGHT * 0.7;

  // Animation for selection highlight
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    if (isSelected || isHighlighted) {
      pulseRef.current += delta * 3;
      if (meshRef.current) {
        const scale = 1 + Math.sin(pulseRef.current) * 0.03;
        meshRef.current.scale.setScalar(scale);
      }
    } else {
      pulseRef.current = 0;
      if (meshRef.current) {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  // Calculate color based on state - ALL SOLID, no wireframe
  const color = useMemo(() => {
    if (isSelected) {
      return hexToNumber(colors.selected);
    }
    if (hovered) {
      return hexToNumber(isOccupied ? colors.occupiedHover : colors.emptyHover);
    }
    return hexToNumber(isOccupied ? colors.occupied : colors.empty);
  }, [isSelected, hovered, isOccupied, colors]);

  // Pallet dimensions
  const palletHeight = 0.08;

  return (
    <group>
      {/* Pallet underneath the bin */}
      <Pallet
        position={[position.x + binWidth / 2, position.y, position.z + binDepth / 2]}
        width={binWidth * 1.1}
        depth={binDepth * 1.1}
        isDark={isDark}
      />

      {/* The bin itself, raised by pallet height */}
      <mesh
        ref={meshRef}
        position={[position.x + binWidth / 2, position.y + palletHeight + binHeight / 2, position.z + binDepth / 2]}
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
        castShadow
        receiveShadow
      >
        {/* Always solid box - grey for empty, orange for occupied */}
        <boxGeometry args={[binWidth, binHeight, binDepth]} />
        <meshStandardMaterial
          color={color}
          roughness={0.7}
          metalness={0.1}
          emissive={isSelected || isHighlighted ? color : 0}
          emissiveIntensity={isSelected || isHighlighted ? 0.2 : 0}
        />
      </mesh>
    </group>
  );
}

// Instanced version for better performance with many bins
export function InstancedBins({
  bins,
  selectedId,
  highlightedIds,
  onBinClick,
}: {
  bins: Array<{
    id: number;
    name: string;
    position: Vector3;
    isOccupied: boolean;
  }>;
  selectedId: number | null;
  highlightedIds?: Set<number>;
  onBinClick?: (id: number) => void;
}) {
  return (
    <group>
      {/* Render individual bins for interactivity */}
      {bins.map(bin => (
        <Bin
          key={bin.id}
          position={bin.position}
          isOccupied={bin.isOccupied}
          isSelected={bin.id === selectedId}
          isHighlighted={highlightedIds?.has(bin.id)}
          onClick={() => onBinClick?.(bin.id)}
          locationId={bin.id}
          locationName={bin.name}
        />
      ))}
    </group>
  );
}
