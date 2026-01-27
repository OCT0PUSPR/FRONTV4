// Scene Component - React Three Fiber Canvas wrapper

import { Suspense, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useTheme } from '../../../../context/theme';
import { getTheme } from '../utils/colorTheme';
import { LocationNode, CameraTarget } from '../types';
import { Warehouse } from './Warehouse';
import { CameraController } from './CameraController';
import { PickRoute } from '../utils/routingAlgorithm';

interface SceneProps {
  locations: LocationNode[];
  selectedLocationId: number | null;
  onBinClick?: (id: number) => void;
  searchQuery?: string;
  cameraTarget?: CameraTarget | null;
  onCameraAnimationComplete?: () => void;
  // Routing props
  currentRoute?: PickRoute | null;
  highlightedRouteStep?: number;
  onRouteStepClick?: (stepIndex: number) => void;
}

// Loading fallback component
function LoadingFallback() {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#666666" wireframe />
    </mesh>
  );
}

// Error fallback component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-zinc-900">
      <div className="text-center p-4">
        <p className="text-red-500 text-lg font-semibold">WebGL Error</p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
          {error.message}
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
          Please ensure your browser supports WebGL and hardware acceleration is enabled.
        </p>
      </div>
    </div>
  );
}

export function Scene({
  locations,
  selectedLocationId,
  onBinClick,
  searchQuery,
  cameraTarget,
  onCameraAnimationComplete,
  currentRoute,
  highlightedRouteStep,
  onRouteStepClick,
}: SceneProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const theme = getTheme(isDark);
  const [error, setError] = useState<Error | null>(null);

  // Calculate row count from locations
  const rowCount = locations.filter(l => l.type === 'row').length || 8;

  // Handle WebGL context errors
  const handleCreated = useCallback(() => {
    setError(null);
  }, []);

  if (error) {
    return <ErrorFallback error={error} />;
  }

  return (
    <Canvas
      shadows
      camera={{
        fov: 50,
        near: 0.1,
        far: 1000,
        position: [15, 15, 25],
      }}
      style={{ background: theme.background }}
      onCreated={handleCreated}
      onError={(e) => {
        console.error('Canvas error:', e);
        setError(new Error('Failed to initialize 3D view'));
      }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        {/* Sky/Background color */}
        <color attach="background" args={[theme.background]} />

        {/* Fog for depth */}
        <fog attach="fog" args={[theme.background, 30, 100]} />

        {/* Camera controls */}
        <CameraController
          target={cameraTarget}
          onAnimationComplete={onCameraAnimationComplete}
          rowCount={rowCount}
        />

        {/* Main warehouse */}
        <Warehouse
          locations={locations}
          selectedLocationId={selectedLocationId}
          onBinClick={onBinClick}
          searchQuery={searchQuery}
          currentRoute={currentRoute}
          highlightedRouteStep={highlightedRouteStep}
          onRouteStepClick={onRouteStepClick}
        />
      </Suspense>
    </Canvas>
  );
}
