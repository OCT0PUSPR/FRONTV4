// Camera Controller Component - Orbit controls and camera animations

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CameraTarget } from '../types';
import { calculateWarehouseBounds, getCameraPositionForWarehouse } from '../utils/positionCalculator';

interface CameraControllerProps {
  target?: CameraTarget | null;
  onAnimationComplete?: () => void;
  rowCount?: number;
}

export function CameraController({
  target,
  onAnimationComplete,
  rowCount = 8,
}: CameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Animation state
  const isAnimatingRef = useRef(false);
  const startPositionRef = useRef(new Vector3());
  const endPositionRef = useRef(new Vector3());
  const startTargetRef = useRef(new Vector3());
  const endTargetRef = useRef(new Vector3());
  const progressRef = useRef(0);
  const durationRef = useRef(0);

  // Initialize camera position
  useEffect(() => {
    const bounds = calculateWarehouseBounds(rowCount);
    const initialPosition = getCameraPositionForWarehouse(rowCount);

    camera.position.copy(initialPosition);

    if (controlsRef.current) {
      // Look at center of warehouse
      controlsRef.current.target.set(
        bounds.width / 2,
        bounds.height / 2,
        bounds.depth / 2
      );
      controlsRef.current.update();
    }
  }, [camera, rowCount]);

  // Easing function: easeInOutCubic
  const easeInOutCubic = (t: number): number => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Start animation when target changes
  useEffect(() => {
    if (!target || !controlsRef.current) return;

    // Store start positions
    startPositionRef.current.copy(camera.position);
    endPositionRef.current.copy(target.position);
    startTargetRef.current.copy(controlsRef.current.target);
    endTargetRef.current.copy(target.lookAt);

    // Reset animation
    progressRef.current = 0;
    durationRef.current = target.duration;
    isAnimatingRef.current = true;
  }, [target, camera]);

  // Animation frame
  useFrame((_, delta) => {
    if (!isAnimatingRef.current || !controlsRef.current) return;

    // Update progress
    const deltaMs = delta * 1000;
    progressRef.current += deltaMs;

    // Calculate normalized progress (0-1)
    const rawProgress = Math.min(progressRef.current / durationRef.current, 1);
    const easedProgress = easeInOutCubic(rawProgress);

    // Interpolate camera position
    const newPosition = new Vector3().lerpVectors(
      startPositionRef.current,
      endPositionRef.current,
      easedProgress
    );
    camera.position.copy(newPosition);

    // Interpolate controls target
    const newTarget = new Vector3().lerpVectors(
      startTargetRef.current,
      endTargetRef.current,
      easedProgress
    );
    controlsRef.current.target.copy(newTarget);
    controlsRef.current.update();

    // Check if animation is complete
    if (rawProgress >= 1) {
      isAnimatingRef.current = false;
      onAnimationComplete?.();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={100}
      maxPolarAngle={Math.PI / 2 - 0.1} // Prevent camera from going below floor
      enablePan
      panSpeed={1}
      enableZoom
      zoomSpeed={1}
      enableRotate
      rotateSpeed={0.5}
      makeDefault
    />
  );
}
