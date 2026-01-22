// Bin Component - Individual storage bin mesh

import { useRef, useState, useMemo } from 'react';
import { Mesh, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { useTheme } from '../../../../context/theme';
import { getTheme, hexToNumber } from '../utils/colorTheme';
import { LAYOUT } from '../utils/positionCalculator';

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
  const theme = getTheme(isDark);

  const { BIN_WIDTH, BIN_DEPTH, LEVEL_HEIGHT } = LAYOUT;

  // Bin dimensions (slightly smaller than slot for spacing)
  const binWidth = BIN_WIDTH * 0.9;
  const binDepth = BIN_DEPTH * 0.9;
  const binHeight = LEVEL_HEIGHT * 0.85;

  // Animation for selection highlight
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    if (isSelected || isHighlighted) {
      pulseRef.current += delta * 3;
      if (meshRef.current) {
        const scale = 1 + Math.sin(pulseRef.current) * 0.05;
        meshRef.current.scale.setScalar(scale);
      }
    } else {
      pulseRef.current = 0;
      if (meshRef.current) {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  // Calculate color based on state
  const color = useMemo(() => {
    if (isSelected) {
      return hexToNumber(theme.selectionHighlight);
    }
    if (hovered) {
      return hexToNumber(isOccupied ? '#FF9030' : '#C0B099');
    }
    return hexToNumber(isOccupied ? theme.binOccupied : theme.binEmpty);
  }, [isSelected, hovered, isOccupied, theme]);

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y + binHeight / 2, position.z]}
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
      {isOccupied ? (
        // Solid box for occupied bins
        <>
          <boxGeometry args={[binWidth, binHeight, binDepth]} />
          <meshStandardMaterial
            color={color}
            roughness={0.6}
            metalness={0.2}
            emissive={isSelected || isHighlighted ? color : 0}
            emissiveIntensity={isSelected || isHighlighted ? 0.3 : 0}
          />
        </>
      ) : (
        // Wireframe for empty bins
        <>
          <boxGeometry args={[binWidth, binHeight, binDepth]} />
          <meshStandardMaterial
            color={color}
            wireframe={true}
            transparent
            opacity={hovered ? 0.8 : 0.4}
          />
        </>
      )}
    </mesh>
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
