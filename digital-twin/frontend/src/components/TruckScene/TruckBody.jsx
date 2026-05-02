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
    scale: [0.135, 0.135, 0.135],
    position: [0, 0.14, 0],
    rotation: [0, Math.PI, 0],
  },
  cat797b: {
    glb: '/models/caterpillar_797f_mining_truck.glb',
    scale: [0.145, 0.145, 0.145],
    position: [0, 0.16, 0],
    rotation: [0, Math.PI, 0],
  },
  cat789c: {
    glb: '/models/caterpillar_789c.glb',
    scale: [2.2, 2.2, 2.2],
    position: [0, 0.1, 0],
    rotation: [0, Math.PI, 0],
  },
};

const TRUCK_APPEARANCE = {
  cat793f: {
    roughnessBoost: 0.18,
    metalnessShift: -0.12,
    envMapIntensity: 0.22,
    tint: 0.88
  },
  cat797b: {
    roughnessBoost: 0.16,
    metalnessShift: -0.1,
    envMapIntensity: 0.24,
    tint: 0.9
  },
  cat789c: {
    roughnessBoost: 0.12,
    metalnessShift: -0.06,
    envMapIntensity: 0.3,
    tint: 0.94
  }
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
function TruckModel({ config, appearance }) {
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
          node.material.roughness = Math.min(0.98, (node.material.roughness ?? 0.7) + appearance.roughnessBoost);
          node.material.metalness = Math.max(0.03, (node.material.metalness ?? 0.2) + appearance.metalnessShift);
          node.material.envMapIntensity = appearance.envMapIntensity;
          node.material.toneMapped = true;
          if (node.material.color) {
            node.material.color.multiplyScalar(appearance.tint);
          }
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
  const appearance = TRUCK_APPEARANCE[selectedTruck] ?? TRUCK_APPEARANCE.cat793f;

  return (
    <Suspense fallback={<TruckLoadingSpinner />}>
      <TruckModel key={selectedTruck} config={config} appearance={appearance} />
    </Suspense>
  );
}
