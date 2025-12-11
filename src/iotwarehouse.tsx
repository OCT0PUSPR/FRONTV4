import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import { Camera, Wifi, Thermometer, X, Plus, Eye, Move, Trash2, Settings } from 'lucide-react';
import * as THREE from 'three';

// Device types configuration
const DEVICE_TYPES = {
  camera: {
    icon: Camera,
    color: '#FF6B35',
    name: 'Security Camera',
    coverageType: 'cone',
    range: 8,
    angle: 60
  },
  router: {
    icon: Wifi,
    color: '#4ECDC4',
    name: 'WiFi Router',
    coverageType: 'sphere',
    range: 10
  },
  sensor: {
    icon: Thermometer,
    color: '#95E1D3',
    name: 'Temperature Sensor',
    coverageType: 'sphere',
    range: 5
  }
};

// IoT Device Component
interface IoTDeviceProps {
  device: {
    id: number;
    type: string;
    name: string;
    position: [number, number, number];
    showCoverage: boolean;
  };
  isSelected: boolean;
  onClick: (id: number) => void;
  onPositionChange?: (id: number, position: [number, number, number]) => void;
}

function IoTDevice({ device, isSelected, onClick, onPositionChange }: IoTDeviceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const config = DEVICE_TYPES[device.type as keyof typeof DEVICE_TYPES];

  useFrame(() => {
    if (meshRef.current && !isSelected) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={device.position}>
      {/* Device Model */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(device.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={hovered || isSelected ? 0.5 : 0.2}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Selection Ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.26, 0]}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial color={config.color} transparent opacity={0.8} />
        </mesh>
      )}

      {/* Device Label */}
      {(hovered || isSelected) && (
        <Html distanceFactor={10} position={[0, 1, 0]}>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}>
            {device.name}
          </div>
        </Html>
      )}

      {/* Coverage Visualization */}
      {device.showCoverage && (
        <CoverageArea device={device} config={config} />
      )}
    </group>
  );
}

// Coverage Area Visualization
interface CoverageAreaProps {
  device: {
    id: number;
    type: string;
    name: string;
    position: [number, number, number];
    showCoverage: boolean;
  };
  config: {
    color: string;
    coverageType: string;
    range: number;
    angle?: number;
  };
}

function CoverageArea({ device, config }: CoverageAreaProps) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  if (config.coverageType === 'cone') {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <coneGeometry args={[
          config.range * Math.tan((config.angle * Math.PI) / 360),
          config.range,
          32
        ]} />
        <meshBasicMaterial
          ref={materialRef}
          color={config.color}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }

  // Sphere coverage
  return (
    <mesh>
      <sphereGeometry args={[config.range, 32, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color={config.color}
        transparent
        opacity={0.15}
        wireframe
      />
    </mesh>
  );
}

// Warehouse Floor and Walls
function Warehouse() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#2d3436" roughness={0.8} />
      </mesh>

      {/* Grid */}
      <gridHelper args={[30, 30, '#636e72', '#636e72']} position={[0, 0.01, 0]} />

      {/* Walls */}
      <mesh position={[0, 2.5, -15]}>
        <boxGeometry args={[30, 5, 0.2]} />
        <meshStandardMaterial color="#34495e" transparent opacity={0.3} />
      </mesh>
      <mesh position={[0, 2.5, 15]}>
        <boxGeometry args={[30, 5, 0.2]} />
        <meshStandardMaterial color="#34495e" transparent opacity={0.3} />
      </mesh>
      <mesh position={[-15, 2.5, 0]}>
        <boxGeometry args={[0.2, 5, 30]} />
        <meshStandardMaterial color="#34495e" transparent opacity={0.3} />
      </mesh>
      <mesh position={[15, 2.5, 0]}>
        <boxGeometry args={[0.2, 5, 30]} />
        <meshStandardMaterial color="#34495e" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// Main App Component
export default function IoTWarehouseManager() {
  const [devices, setDevices] = useState<Array<{
    id: number;
    type: string;
    name: string;
    position: [number, number, number];
    showCoverage: boolean;
  }>>([
    {
      id: 1,
      type: 'camera',
      name: 'Camera 01',
      position: [5, 2, 5] as [number, number, number],
      showCoverage: true
    },
    {
      id: 2,
      type: 'router',
      name: 'Router 01',
      position: [0, 3, 0] as [number, number, number],
      showCoverage: true
    }
  ]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [placementMode, setPlacementMode] = useState(null);
  const [viewMode, setViewMode] = useState('perspective');

  const handleAddDevice = (type: string) => {
    const newDevice = {
      id: Date.now(),
      type,
      name: `${DEVICE_TYPES[type as keyof typeof DEVICE_TYPES].name} ${devices.filter(d => d.type === type).length + 1}`,
      position: [0, 2, 0] as [number, number, number],
      showCoverage: true
    };
    setDevices([...devices, newDevice]);
    setSelectedDevice(newDevice.id);
    setPlacementMode(null);
  };

  const handleCanvasClick = (e) => {
    if (placementMode) {
      handleAddDevice(placementMode);
    } else {
      setSelectedDevice(null);
    }
  };

  const handleDeleteDevice = () => {
    if (selectedDevice) {
      setDevices(devices.filter(d => d.id !== selectedDevice));
      setSelectedDevice(null);
    }
  };

  const toggleCoverage = (deviceId) => {
    setDevices(devices.map(d =>
      d.id === deviceId ? { ...d, showCoverage: !d.showCoverage } : d
    ));
  };

  const selectedDeviceData = devices.find(d => d.id === selectedDevice);
  const selectedConfig = selectedDeviceData ? DEVICE_TYPES[selectedDeviceData.type] : null;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e', position: 'relative' }}>
      {/* Top Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(26, 26, 46, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Settings size={24} color="white" />
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: '18px', fontWeight: '700', margin: 0 }}>
              IoT Warehouse Manager
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0 }}>
              {devices.length} devices active
            </p>
          </div>
        </div>
      </div>

      {/* Left Sidebar - Device Library */}
      <div style={{
        position: 'absolute',
        left: '24px',
        top: '88px',
        width: '280px',
        background: 'rgba(26, 26, 46, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '20px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ color: 'white', fontSize: '14px', fontWeight: '700', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Device Library
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(DEVICE_TYPES).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => handleAddDevice(type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px',
                  background: placementMode === type ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${placementMode === type ? config.color : 'transparent'}`,
                  borderRadius: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = placementMode === type ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: `${config.color}20`,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={20} color={config.color} />
                </div>
                <span>{config.name}</span>
              </button>
            );
          })}
        </div>

        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: 'rgba(78, 205, 196, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(78, 205, 196, 0.3)'
        }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', margin: 0, lineHeight: '1.6' }}>
            💡 Click a device to add it to the warehouse. Use mouse to rotate the view.
          </p>
        </div>
      </div>

      {/* Right Sidebar - Device Properties */}
      {selectedDeviceData && (
        <div style={{
          position: 'absolute',
          right: '24px',
          top: '88px',
          width: '320px',
          background: 'rgba(26, 26, 46, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '20px',
          zIndex: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: 'white', fontSize: '14px', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Device Details
            </h3>
            <button
              onClick={() => setSelectedDevice(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            background: `${selectedConfig.color}15`,
            borderRadius: '12px',
            marginBottom: '20px',
            border: `1px solid ${selectedConfig.color}40`
          }}>
            {React.createElement(selectedConfig.icon, { size: 32, color: selectedConfig.color })}
            <div>
              <h4 style={{ color: 'white', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                {selectedDeviceData.name}
              </h4>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0 }}>
                {selectedConfig.name}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '12px',
              borderRadius: '8px'
            }}>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                Coverage Range
              </label>
              <div style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>
                {selectedConfig.range}m
              </div>
            </div>

            {selectedConfig.angle && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '12px',
                borderRadius: '8px'
              }}>
                <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                  Field of View
                </label>
                <div style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>
                  {selectedConfig.angle}°
                </div>
              </div>
            )}

            <button
              onClick={() => toggleCoverage(selectedDevice)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                background: selectedDeviceData.showCoverage ? `${selectedConfig.color}30` : 'rgba(255,255,255,0.05)',
                border: `2px solid ${selectedDeviceData.showCoverage ? selectedConfig.color : 'transparent'}`,
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
                marginTop: '8px'
              }}
            >
              <Eye size={18} />
              {selectedDeviceData.showCoverage ? 'Hide Coverage' : 'Show Coverage'}
            </button>

            <button
              onClick={handleDeleteDevice}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                background: 'rgba(231, 76, 60, 0.15)',
                border: '2px solid rgba(231, 76, 60, 0.3)',
                borderRadius: '8px',
                color: '#e74c3c',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(231, 76, 60, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(231, 76, 60, 0.15)';
              }}
            >
              <Trash2 size={18} />
              Delete Device
            </button>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        shadows
        onClick={handleCanvasClick}
        style={{ cursor: placementMode ? 'crosshair' : 'default' }}
      >
        <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={40}
          maxPolarAngle={Math.PI / 2}
        />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[0, 10, 0]} intensity={0.5} />

        {/* Scene */}
        <Warehouse />

        {/* Devices */}
        {devices.map(device => (
          <IoTDevice
            key={device.id}
            device={device}
            isSelected={device.id === selectedDevice}
            onClick={setSelectedDevice}
            onPositionChange={(id, position) => {
              setDevices(devices.map(d => d.id === id ? { ...d, position } : d));
            }}
          />
        ))}
      </Canvas>
    </div>
  );
}