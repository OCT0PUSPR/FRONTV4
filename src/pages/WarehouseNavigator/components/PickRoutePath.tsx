// Pick Route Path - 3D visualization of the pick route

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Vector3, CatmullRomCurve3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { useTheme } from '../../../../context/theme';
import { PickRoute, generatePathPoints } from '../utils/routingAlgorithm';
import { calculatePickPosition, getRowFrontDirection, LAYOUT } from '../utils/positionCalculator';

interface PickRoutePathProps {
  route: PickRoute | null;
  highlightedStep?: number;
  onStepClick?: (stepIndex: number) => void;
  showLabels?: boolean;
}

// Step marker at each pick location
function StepMarker({
  position,
  stepNumber,
  isHighlighted,
  onClick,
  productName,
  locationName,
  quantity,
  showLabel,
}: {
  position: Vector3;
  stepNumber: number;
  isHighlighted: boolean;
  onClick?: () => void;
  productName: string;
  locationName: string;
  quantity: number;
  showLabel: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  // Extract row code from location name (e.g., "WH/Stock/AR/14/AF/01" -> "AR")
  const locationParts = locationName.split('/');
  const rowCode = locationParts.length >= 4 ? locationParts[locationParts.length - 4] : '';

  // Calculate the pick position (in the aisle, in front of the bin)
  // Add LEVEL_HEIGHT / 2 to position at the center of the bin vertically
  const pickPosition = useMemo(() => {
    if (rowCode && rowCode.length === 2) {
      const basePos = calculatePickPosition(position, rowCode, true);
      // Offset Y to center of bin (position.y is bottom of level)
      return new Vector3(basePos.x, basePos.y + LAYOUT.LEVEL_HEIGHT / 2, basePos.z);
    }
    // Fallback: if no valid row code, use original position with height offset
    return new Vector3(position.x, position.y + LAYOUT.LEVEL_HEIGHT / 2, position.z);
  }, [position, rowCode]);

  // Determine which direction the arrow should point (toward the bin)
  const frontDirection = rowCode ? getRowFrontDirection(rowCode) : 'lower';
  // Arrow rotation: point toward the bin (opposite of front direction)
  const arrowRotationZ = frontDirection === 'lower' ? Math.PI / 2 : -Math.PI / 2;

  // Pulse animation for highlighted marker
  useFrame(() => {
    if (meshRef.current && isHighlighted) {
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.3;
      meshRef.current.scale.setScalar(scale);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });

  const markerColor = isHighlighted ? '#22c55e' : '#f97316'; // Orange for visibility
  const emissiveIntensity = isHighlighted ? 1.0 : 0.6;
  const sphereSize = isHighlighted ? 0.35 : 0.3;

  // Extract location code from name (e.g., "WH/Stock/AR/14/AF/01" -> "AR14AF01")
  const locationCode = locationParts.slice(-4).join('');

  // Calculate the Z offset from pickPosition to the bin for arrow positioning
  const zOffsetToBin = position.z - pickPosition.z;
  const arrowZPosition = zOffsetToBin > 0 ? 0.4 : -0.4;

  return (
    <group position={[pickPosition.x, pickPosition.y, pickPosition.z]}>
      {/* Main marker sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[sphereSize, 24, 24]} />
        <meshStandardMaterial
          color={markerColor}
          emissive={markerColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>

      {/* Step number - Billboard to always face camera */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <Text
          position={[0, 0, 0]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          {stepNumber}
        </Text>
      </Billboard>

      {/* Floating info card above marker - Billboard to always face camera */}
      {showLabel && (
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false} position={[0, 0.8, 0]}>
          <group>
            {/* Background card */}
            <mesh position={[0, 0, -0.02]}>
              <planeGeometry args={[2.5, 0.8]} />
              <meshBasicMaterial
                color={isDark ? '#1f2937' : '#ffffff'}
                transparent
                opacity={0.95}
              />
            </mesh>
            {/* Border */}
            <mesh position={[0, 0, -0.03]}>
              <planeGeometry args={[2.6, 0.9]} />
              <meshBasicMaterial
                color={markerColor}
                transparent
                opacity={0.8}
              />
            </mesh>
            {/* Location code */}
            <Text
              position={[0, 0.2, 0]}
              fontSize={0.18}
              color={markerColor}
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {locationCode || locationName.split('/').pop()}
            </Text>
            {/* Product name */}
            <Text
              position={[0, -0.05, 0]}
              fontSize={0.12}
              color={isDark ? '#ffffff' : '#374151'}
              anchorX="center"
              anchorY="middle"
              maxWidth={2.3}
            >
              {productName}
            </Text>
            {/* Quantity */}
            <Text
              position={[0, -0.25, 0]}
              fontSize={0.14}
              color={isDark ? '#9ca3af' : '#6b7280'}
              anchorX="center"
              anchorY="middle"
            >
              Qty: {quantity}
            </Text>
          </group>
        </Billboard>
      )}

      {/* Vertical beam to ground - more visible */}
      <mesh position={[0, -pickPosition.y / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, pickPosition.y, 8]} />
        <meshStandardMaterial
          color={markerColor}
          emissive={markerColor}
          emissiveIntensity={0.4}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Ground marker ring */}
      <mesh position={[0, -pickPosition.y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.5, 32]} />
        <meshStandardMaterial
          color={markerColor}
          emissive={markerColor}
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Ground marker filled circle */}
      <mesh position={[0, -pickPosition.y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <meshStandardMaterial
          color={markerColor}
          emissive={markerColor}
          emissiveIntensity={0.3}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Arrow pointing to the bin (toward the rack) */}
      <group position={[0, 0, arrowZPosition]} rotation={[arrowRotationZ, 0, 0]}>
        <mesh>
          <coneGeometry args={[0.1, 0.25, 8]} />
          <meshStandardMaterial
            color={markerColor}
            emissive={markerColor}
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>

      {/* Line connecting marker to actual bin */}
      <mesh position={[0, 0, zOffsetToBin / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, Math.abs(zOffsetToBin) - 0.3, 8]} />
        <meshStandardMaterial
          color={markerColor}
          emissive={markerColor}
          emissiveIntensity={0.4}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}

// Start position marker
function StartMarker({ position }: { position: Vector3 }) {
  return (
    <group position={[position.x, 0.1, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.6, 32]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
      </mesh>
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.25}
        color="#22c55e"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        START
      </Text>
    </group>
  );
}

export function PickRoutePath({
  route,
  highlightedStep,
  onStepClick,
  showLabels = true,
}: PickRoutePathProps) {
  const tubeRef = useRef<THREE.Mesh>(null);

  // Generate smooth path curve
  const pathCurve = useMemo(() => {
    if (!route || route.steps.length === 0) return null;

    const points = generatePathPoints(route);
    if (points.length < 2) return null;

    // Add some height offset for visibility
    const elevatedPoints = points.map(p => new Vector3(p.x, p.y + 0.3, p.z));

    return new CatmullRomCurve3(elevatedPoints, false, 'catmullrom', 0.5);
  }, [route]);

  // Animated dash offset for path
  useFrame((_state, delta) => {
    if (tubeRef.current?.material && 'dashOffset' in tubeRef.current.material) {
      (tubeRef.current.material as THREE.MeshStandardMaterial & { dashOffset: number }).dashOffset -= delta * 2;
    }
  });

  if (!route || route.steps.length === 0) return null;

  return (
    <group>
      {/* Start position marker */}
      <StartMarker position={route.startPosition} />

      {/* Path tube */}
      {pathCurve && (
        <mesh ref={tubeRef}>
          <tubeGeometry args={[pathCurve, 64, 0.05, 8, false]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={0.3}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Ground path line (shadow/guide) */}
      {pathCurve && (
        <mesh position={[0, 0.02, 0]}>
          <tubeGeometry
            args={[
              new CatmullRomCurve3(
                pathCurve.points.map(p => new Vector3(p.x, 0.02, p.z)),
                false,
                'catmullrom',
                0.5
              ),
              64,
              0.08,
              8,
              false,
            ]}
          />
          <meshStandardMaterial
            color="#3b82f6"
            transparent
            opacity={0.2}
          />
        </mesh>
      )}

      {/* Step markers */}
      {route.steps.map((step, idx) => (
        <StepMarker
          key={step.index}
          position={step.item.position}
          stepNumber={idx + 1}
          isHighlighted={highlightedStep === idx}
          onClick={() => onStepClick?.(idx)}
          productName={step.item.productName}
          locationName={step.item.locationName}
          quantity={step.item.quantity}
          showLabel={showLabels && (highlightedStep === idx || highlightedStep === undefined)}
        />
      ))}

      {/* Direction arrows along path */}
      {pathCurve && route.steps.length > 1 && (
        <>
          {[0.25, 0.5, 0.75].map((t, i) => {
            const point = pathCurve.getPoint(t);
            const tangent = pathCurve.getTangent(t);
            return (
              <group key={i} position={point} rotation={[0, Math.atan2(tangent.x, tangent.z), 0]}>
                <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <coneGeometry args={[0.1, 0.3, 8]} />
                  <meshStandardMaterial
                    color="#3b82f6"
                    emissive="#3b82f6"
                    emissiveIntensity={0.4}
                  />
                </mesh>
              </group>
            );
          })}
        </>
      )}
    </group>
  );
}

// Highlight effect for bins that are part of the route
export function RouteHighlights({
  route,
  highlightedStep,
}: {
  route: PickRoute | null;
  highlightedStep?: number;
}) {
  if (!route) return null;

  return (
    <group>
      {route.steps.map((step, idx) => {
        const isHighlighted = highlightedStep === idx;
        const binPos = step.item.position;
        const color = isHighlighted ? '#22c55e' : '#f97316';

        // Extract row code from location name
        const locationParts = step.item.locationName.split('/');
        const rowCode = locationParts.length >= 4 ? locationParts[locationParts.length - 4] : '';

        // Calculate pick position (in the aisle)
        const pickPos = rowCode && /^[A-Z]{2}$/.test(rowCode)
          ? calculatePickPosition(binPos, rowCode, false)
          : new Vector3(binPos.x, 0, binPos.z);

        return (
          <group key={step.index}>
            {/* Ground highlight square at pick position (in the aisle) */}
            <mesh
              position={[pickPos.x, 0.03, pickPos.z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[1.0, 1.0]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={isHighlighted ? 0.5 : 0.3}
                emissive={color}
                emissiveIntensity={isHighlighted ? 0.6 : 0.3}
              />
            </mesh>

            {/* Outer ring on ground at pick position */}
            <mesh
              position={[pickPos.x, 0.04, pickPos.z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.6, 0.7, 32]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.5}
                transparent
                opacity={0.8}
              />
            </mesh>

            {/* Step number on ground */}
            <Text
              position={[pickPos.x, 0.05, pickPos.z]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.4}
              color={color}
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {idx + 1}
            </Text>

            {/* Line from pick position to bin on ground */}
            <mesh
              position={[(pickPos.x + binPos.x) / 2, 0.02, (pickPos.z + binPos.z) / 2]}
              rotation={[0, Math.atan2(binPos.x - pickPos.x, binPos.z - pickPos.z), Math.PI / 2]}
            >
              <cylinderGeometry args={[0.03, 0.03, Math.sqrt(Math.pow(binPos.x - pickPos.x, 2) + Math.pow(binPos.z - pickPos.z, 2)), 8]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.4}
                transparent
                opacity={0.5}
              />
            </mesh>

            {/* Vertical highlight column at bin position */}
            {isHighlighted && (
              <mesh position={[binPos.x, binPos.y / 2, binPos.z]}>
                <boxGeometry args={[0.15, binPos.y + 0.5, 0.15]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={0.8}
                  transparent
                  opacity={0.4}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
