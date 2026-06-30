import { Suspense, useMemo, useRef, useEffect } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/simulationStore';
import { inspectModel, logModelStructure, printSceneTree } from '../../utils/ModelInspector';

// ─── Preload both GLBs ──────────────────────────────────────────────────────
useGLTF.preload('/models/TRUCK.glb');
useGLTF.preload('models/CAT2.glb');

// ─── Per-truck configuration ─────────────────────────────────────────────────
// 797F model is authored in mm → needs small scale
// 789C model is authored in cm → needs medium scale
const TRUCK_CONFIGS = {
  cat789c_rigged: {
    glb: '/models/TRUCK.glb',
    scale: [2.2, 2.2, 2.2],
    position: [0, 2, 0],
    rotation: [0, Math.PI, 0],
    bedBoneName: 'Dump_Hing',
    bedRotationAxis: 'x',
    bedDownOffsetDeg: 0,
  },
  cat797b: {
    glb: 'models/CAT2.glb',
    scale: [0.145, 0.145, 0.145],
    position: [0, 0.16, 0],
    rotation: [0, Math.PI, 0],
    bedBoneName: 'Dump_Hing',
    bedRotationAxis: 'x',
    bedDownOffsetDeg: 0,
  },
};

const TRUCK_APPEARANCE = {
  cat789c_rigged: {
    roughnessBoost: 0.12,
    metalnessShift: -0.06,
    envMapIntensity: 0.3,
    tint: 0.94
  },
  cat797b: {
    roughnessBoost: 0.16,
    metalnessShift: -0.1,
    envMapIntensity: 0.24,
    tint: 0.9
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
  const gltf = useGLTF(config.glb);
  const { scene } = gltf;
  const bedRef = useRef(null);
  const bedRestRotation = useRef(null);
  const bedAngleDeg = useSimulationStore((s) => s.state.bed_angle_deg ?? 0);

  const clonedScene = useMemo(() => {
    const c = scene.clone(true);

    // 🔍 INSPECTION: Log model structure on first load
    if (!window._modelInspected) {
      window._modelInspected = {};
    }
    const modelKey = config.glb;
    if (!window._modelInspected[modelKey]) {
      console.log(`\n🔍 First-time inspection of: ${modelKey}`);
      logModelStructure(gltf);
      window._modelInspected[modelKey] = true;

      // Store scene tree for debugging
      console.group('📍 Scene Hierarchy (full tree):');
      printSceneTree(c);
      console.groupEnd();
    }

    let bedMeshFound = false;

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

        // Only search for bed mesh if it is not a bone-based animation model
        if (!config.bedBoneName) {
          // Identify and tag the dump bed for rotation
          if (node.name.toLowerCase().includes('bed') || node.name.toLowerCase().includes('dump')) {
            node.userData.isBedMesh = true;
            if (!bedMeshFound) {
              console.log(`✅ BED MESH IDENTIFIED: "${node.name}" - will be rotated on Z-axis`);
              bedMeshFound = true;
            }
          }
        }
      }
    });

    if (!config.bedBoneName && !bedMeshFound) {
      console.warn(`⚠️  NO BED MESH FOUND in ${modelKey}`);
      console.log(`   The GLB model may not contain a separate bed object.`);
      console.log(`   Check if the bed is procedurally generated separately (see DumpBed.jsx).`);
    }

    return c;
  }, [scene, appearance, config.glb, config.bedBoneName]);

  useEffect(() => {
    if (config.bedBoneName) {
      // Find bone by name in the cloned scene (check both Dump_Hing and Dump_Hinge)
      const bone = clonedScene.getObjectByName(config.bedBoneName) || clonedScene.getObjectByName(config.bedBoneName + 'e');
      if (bone) {
        bedRef.current = bone;
        const axis = config.bedRotationAxis || 'z';
        const restRot = bone.rotation[axis];
        bedRestRotation.current = restRot;
        console.log(`✨ Bone found: ${bone.name}, model rest rotation.${axis} = ${THREE.MathUtils.radToDeg(restRot).toFixed(1)}°`);
        // Set the bed to "down" position using the offset
        const downOffsetRad = THREE.MathUtils.degToRad(config.bedDownOffsetDeg ?? 0);
        bone.rotation[axis] = restRot + downOffsetRad;
        console.log(`🔧 Bed set to DOWN position: rotation.${axis} = ${THREE.MathUtils.radToDeg(bone.rotation[axis]).toFixed(1)}°`);
      } else {
        console.warn(`⚠️ Bone "${config.bedBoneName}" not found in model.`);
      }
    } else {
      // Find the bed mesh in the cloned scene
      let foundBed = false;
      clonedScene.traverse((node) => {
        if (node.userData.isBedMesh && !foundBed) {
          bedRef.current = node;
          foundBed = true;
          console.log(`✨ Bed reference stored and ready for animation`);
        }
      });
    }
  }, [clonedScene, config.bedBoneName]);

  useFrame(() => {
    if (bedRef.current) {
      // Bed rotation logic for rigged model:
      // Model rest pose has bed RAISED. We apply bedDownOffsetDeg to push it flat.
      // As bed_angle_deg increases (0→max), we reduce the offset so the bed rises.
      // Formula: rotation = restRotation + (downOffset - bedAngle) in radians
      //   bed_angle_deg=0  → full offset applied → bed is DOWN (flat)
      //   bed_angle_deg=55 → offset cancelled    → bed is UP (model rest)
      const downOffsetDeg = config.bedDownOffsetDeg ?? 0;
      const effectiveAngleDeg = downOffsetDeg - bedAngleDeg;
      const axis = config.bedRotationAxis || 'z';
      bedRef.current.rotation[axis] = (bedRestRotation.current ?? 0) + THREE.MathUtils.degToRad(effectiveAngleDeg);
    }
  });

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
  const selectedTruck = useSimulationStore((s) => s.selectedTruck ?? 'cat789c_rigged');
  const config = TRUCK_CONFIGS[selectedTruck] ?? TRUCK_CONFIGS.cat789c_rigged;
  const appearance = TRUCK_APPEARANCE[selectedTruck] ?? TRUCK_APPEARANCE.cat789c_rigged;

  return (
    <Suspense fallback={<TruckLoadingSpinner />}>
      <TruckModel key={selectedTruck} config={config} appearance={appearance} />
    </Suspense>
  );
}
