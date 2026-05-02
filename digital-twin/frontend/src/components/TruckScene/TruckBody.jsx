import { Suspense, useMemo } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/simulationStore';

// ─── Preload both GLBs ──────────────────────────────────────────────────────
useGLTF.preload('/models/caterpillar_797f_mining_truck.glb');
useGLTF.preload('/models/caterpillar_789c.glb');

// ─── Per-truck configuration ─────────────────────────────────────────────────
// 797F model is authored in mm → needs small scale
// 789C model is authored in cm → needs medium scale
const TRUCK_CONFIGS = {
  cat793f: {
    glb: '/models/caterpillar_797f_mining_truck.glb',
    scale: [0.035, 0.035, 0.035],
    position: [0, 0, 0],
    rotation: [0, Math.PI, 0],
  },
  cat797b: {
    glb: '/models/caterpillar_797f_mining_truck.glb',
    scale: [0.035, 0.035, 0.035],
    position: [0, 0, 0],
    rotation: [0, Math.PI, 0],
  },
  cat789c: {
    glb: '/models/caterpillar_789c.glb',
    scale: [3.5, 3.5, 3.5],
    position: [0, 0, 0],
    rotation: [0, Math.PI, 0],
  },
};

// ─── Loading spinner ─────────────────────────────────────────────────────────
function TruckLoadingSpinner() {
  return (
    <Html center>
      <div style={{
        color: '#f59e0b',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '12px',
        background: 'rgba(8,12,20,0.88)',
        padding: '10px 18px',
        borderRadius: '6px',
        border: '1px solid rgba(245,158,11,0.5)',
        whiteSpace: 'nowrap',
      }}>
        ⬛ Loading truck model...
      </div>
    </Html>
  );
}

// ─── GLB model renderer ──────────────────────────────────────────────────────
function TruckModel({ config }) {
  const { scene } = useGLTF(config.glb);

  const clonedScene = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        // Clone material to avoid shared-state issues
        if (node.material) {
          node.material = node.material.clone();
          node.material.needsUpdate = true;
          // Fix colorSpace for Three.js r152+ (0.160)
          if (node.material.map) {
            node.material.map.colorSpace = THREE.SRGBColorSpace;
            node.material.map.needsUpdate = true;
          }
        }
      }
    });
    return c;
  }, [scene]);

  return (
    <primitive
      object={clonedScene}
      scale={config.scale}
      position={config.position}
      rotation={config.rotation}
    />
  );
}

// ─── Root component ──────────────────────────────────────────────────────────
export default function TruckBody() {
  const selectedTruck = useSimulationStore((s) => s.selectedTruck ?? 'cat793f');
  const config = TRUCK_CONFIGS[selectedTruck] ?? TRUCK_CONFIGS.cat793f;

  return (
    <Suspense fallback={<TruckLoadingSpinner />}>
      <TruckModel key={selectedTruck} config={config} />
    </Suspense>
  );
}
