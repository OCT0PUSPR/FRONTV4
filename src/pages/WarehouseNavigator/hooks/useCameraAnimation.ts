// Camera Animation Hook for smooth camera movements

import { useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { CameraTarget } from '../types';

interface UseCameraAnimationReturn {
  flyTo: (target: CameraTarget) => void;
  isAnimating: boolean;
}

export function useCameraAnimation(): UseCameraAnimationReturn {
  const { camera } = useThree();

  const isAnimatingRef = useRef(false);
  const startPositionRef = useRef(new Vector3());
  const endPositionRef = useRef(new Vector3());
  const startLookAtRef = useRef(new Vector3());
  const endLookAtRef = useRef(new Vector3());
  const progressRef = useRef(0);
  const durationRef = useRef(0);

  // Easing function: easeInOutCubic
  const easeInOutCubic = (t: number): number => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Start animation to target
  const flyTo = useCallback((target: CameraTarget) => {
    startPositionRef.current.copy(camera.position);
    endPositionRef.current.copy(target.position);

    // Calculate current lookAt by projecting forward from camera
    const currentLookAt = new Vector3();
    camera.getWorldDirection(currentLookAt);
    currentLookAt.multiplyScalar(10).add(camera.position);
    startLookAtRef.current.copy(currentLookAt);
    endLookAtRef.current.copy(target.lookAt);

    durationRef.current = target.duration;
    progressRef.current = 0;
    isAnimatingRef.current = true;
  }, [camera]);

  // Animation frame update
  useFrame((_, delta) => {
    if (!isAnimatingRef.current) return;

    // Update progress
    const deltaMs = delta * 1000;
    progressRef.current += deltaMs;

    // Calculate normalized progress (0-1)
    const rawProgress = Math.min(progressRef.current / durationRef.current, 1);
    const easedProgress = easeInOutCubic(rawProgress);

    // Interpolate position
    const newPosition = new Vector3().lerpVectors(
      startPositionRef.current,
      endPositionRef.current,
      easedProgress
    );
    camera.position.copy(newPosition);

    // Interpolate lookAt
    const newLookAt = new Vector3().lerpVectors(
      startLookAtRef.current,
      endLookAtRef.current,
      easedProgress
    );
    camera.lookAt(newLookAt);

    // Check if animation is complete
    if (rawProgress >= 1) {
      isAnimatingRef.current = false;
    }
  });

  return {
    flyTo,
    isAnimating: isAnimatingRef.current,
  };
}

// Standalone helper to create camera targets
export function createCameraTarget(
  position: Vector3,
  lookAt: Vector3,
  duration: number = 800
): CameraTarget {
  return { position, lookAt, duration };
}
