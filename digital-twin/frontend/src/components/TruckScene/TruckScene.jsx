import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSimulationStore } from '../../store/simulationStore';
import EnvironmentSetup from './EnvironmentSetup';
import TruckBody from './TruckBody';
import MaterialParticles from './MaterialParticles';
import SensorMarkers from './SensorMarkers';
const CAMERA_PRESETS_BY_TRUCK = {
  cat793f: {
    ISO: { position: [5.8, 3.3, 8.8], target: [0, 1.8, 0] },
    SIDE: { position: [9.6, 3.0, 0.25], target: [0, 2.0, 0] },
    FRONT: { position: [0, 3.3, -10.6], target: [0, 1.9, 0] },
    TOP: { position: [0.1, 10.6, 0.1], target: [0, 0.4, 0] },
    REAR: { position: [0, 3.3, 10.6], target: [0, 1.9, 0] }
  },
  cat797b: {
    ISO: { position: [6.4, 3.6, 9.7], target: [0, 2.0, 0] },
    SIDE: { position: [10.5, 3.2, 0.3], target: [0, 2.15, 0] },
    FRONT: { position: [0, 3.5, -11.7], target: [0, 2.0, 0] },
    TOP: { position: [0.1, 11.5, 0.1], target: [0, 0.4, 0] },
    REAR: { position: [0, 3.5, 11.7], target: [0, 2.0, 0] }
  },
  cat789c: {
    ISO: { position: [7.5, 4, 11], target: [0, 2.2, 0] },
    SIDE: { position: [13, 3.5, 0.3], target: [0, 2.5, 0] },
    FRONT: { position: [0, 3.8, -13], target: [0, 2.2, 0] },
    TOP: { position: [0.1, 13, 0.1], target: [0, 0.5, 0] },
    REAR: { position: [0, 3.8, 13], target: [0, 2.2, 0] }
  }
};

const TRUCK_SCENE_OFFSETS = {
  cat793f: [0, 0, 0],
  cat797b: [0, 0, 0],
  cat789c: [0, 0.5, 0]
};

function CameraPresetAnimator({ preset, controlsRef, presets }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(...presets.ISO.target));
  const positionRef = useRef(new THREE.Vector3(...presets.ISO.position));

  useEffect(() => {
    const nextPreset = presets[preset] ?? presets.ISO;
    targetRef.current.set(...nextPreset.target);
    positionRef.current.set(...nextPreset.position);
  }, [preset, presets]);

  useFrame((_, delta) => {
    const easing = 1 - Math.exp(-delta * 3.5);
    camera.position.lerp(positionRef.current, easing);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetRef.current, easing);
      controlsRef.current.update();
    }
  });

  return null;
}

function WarningSpotlight({ enabled }) {
  const lightRef = useRef(null);
  const targetRef = useRef(null);

  useEffect(() => {
    if (!lightRef.current || !targetRef.current) return;
    lightRef.current.target = targetRef.current;
  }, []);

  return (
    <>
      <object3D ref={targetRef} position={[1.6, 2.25, 0]} />
      <spotLight
        ref={lightRef}
        position={[0, 15, 0]}
        intensity={enabled ? 3 : 0}
        color="#EF4444"
        angle={0.48}
        penumbra={0.5}
        distance={40}
        castShadow
      />
    </>
  );
}

function WarningLightRig({ active }) {
  const lights = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const bedGlow = useRef(null);
  const warningSpot = useRef(null);

  useFrame(({ clock }) => {
    const pulse = active ? (Math.sin(clock.elapsedTime * Math.PI * 2) > 0 ? 1 : 0) : 0;
    const spotPulse = active ? Math.abs(Math.sin(clock.elapsedTime * Math.PI * 2)) * 3 : 0;

    lights.forEach((ref) => {
      if (ref.current) {
        ref.current.intensity = active ? 2.2 * pulse + 0.2 : 0;
      }
    });

    if (warningSpot.current) {
      warningSpot.current.intensity = spotPulse;
    }

    if (bedGlow.current) {
      bedGlow.current.intensity = active ? 1.8 + Math.abs(Math.sin(clock.elapsedTime * 5)) * 0.7 : 0;
    }
  });

  return (
    <group>
      <pointLight ref={lights[0]} position={[5.6, 9.2, 4.4]} color="#EF4444" intensity={0} distance={18} />
      <pointLight ref={lights[1]} position={[5.6, 9.2, -4.4]} color="#EF4444" intensity={0} distance={18} />
      <pointLight ref={lights[2]} position={[-5.6, 9.2, 4.4]} color="#EF4444" intensity={0} distance={18} />
      <pointLight ref={lights[3]} position={[-5.6, 9.2, -4.4]} color="#EF4444" intensity={0} distance={18} />
      <spotLight
        ref={warningSpot}
        position={[0, 15, 0]}
        target-position={[0, 3.2, 0]}
        intensity={0}
        color="#EF4444"
        angle={0.52}
        penumbra={0.45}
        distance={42}
        castShadow
      />
      <pointLight ref={bedGlow} position={[1.2, 5.2, 0]} color="#EF4444" intensity={0} distance={12} />
    </group>
  );
}

function CameraPresetPanel({ preset, onPresetChange, autoRotate360, onToggle360 }) {
  const buttons = useMemo(
    () => [
      ['ISO', 'ISO'],
      ['SIDE', 'SIDE'],
      ['FRONT', 'FRONT'],
      ['TOP', 'TOP'],
      ['REAR', 'REAR']
    ],
    []
  );

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-20 flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[rgba(10,14,22,0.88)] p-1 backdrop-blur-md">
      {buttons.map(([key, label]) => {
        const active = preset === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onPresetChange(key)}
            className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all duration-200 ${
              active
                ? 'bg-[var(--yellow)] text-black shadow-[0_0_10px_rgba(245,168,0,0.3)]'
                : 'text-[var(--text-muted)] hover:bg-[#1a2030] hover:text-[var(--text-primary)]'
            }`}
          >
            {label}
          </button>
        );
      })}
      <div className="w-px h-5 bg-[var(--border)] mx-0.5" />
      <button
        type="button"
        onClick={onToggle360}
        className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all duration-200 ${
          autoRotate360
            ? 'bg-[var(--yellow)] text-black shadow-[0_0_10px_rgba(245,168,0,0.3)]'
            : 'text-[var(--text-muted)] hover:bg-[#1a2030] hover:text-[var(--text-primary)]'
        }`}
      >
        {autoRotate360 ? '⟳ 360 DEGREE' : '360 DEGREE'}
      </button>
    </div>
  );
}

function PerformanceBadge() {
  const latencyMs = useSimulationStore((s) => s.latencyMs);
  const showParticles = useSimulationStore((s) => s.showParticles);
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let animationFrameId = 0;
    let lastSample = performance.now();
    let frames = 0;

    const tick = (now) => {
      frames += 1;
      if (now - lastSample >= 500) {
        setFps(Math.round((frames * 1000) / (now - lastSample)));
        frames = 0;
        lastSample = now;
      }
      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="pointer-events-none absolute bottom-6 left-3 z-20 rounded-lg border border-[var(--border)] bg-[rgba(10,14,22,0.88)] px-3 py-1.5 text-[11px] backdrop-blur-md">
      <span className="data text-[var(--text-primary)]">FPS: {fps}</span>
      <span className="mx-1.5 text-[var(--border)]">|</span>
      <span className="data text-[var(--text-primary)]">Particles: {showParticles ? 800 : 0}</span>
      <span className="mx-1.5 text-[var(--border)]">|</span>
      <span className="data text-[var(--text-primary)]">Latency: {latencyMs.toFixed(0)}ms</span>
    </div>
  );
}

function CameraYawTracker({ onYaw }) {
  const { camera } = useThree();
  const tickRef = useRef(0);

  useFrame(() => {
    tickRef.current += 1;
    if (tickRef.current % 4 !== 0) return;
    onYaw(camera.rotation.y);
  });

  return null;
}

export default function TruckScene() {
  const phase = useSimulationStore((s) => s.state.phase);
  const alert = useSimulationStore((s) => s.alert);
  const dumpCycle = useSimulationStore((s) => s.dumpCycle);
  const degradedMode = useSimulationStore((s) => s.degradedMode);
  const selectedTruck = useSimulationStore((s) => s.selectedTruck);
  const truckSwitchToken = useSimulationStore((s) => s.truckSwitchToken);
  const [preset, setPreset] = useState('ISO');
  const [autoRotate360, setAutoRotate360] = useState(false);
  const [cameraYaw, setCameraYaw] = useState(0);
  const [loadingLabel, setLoadingLabel] = useState('');
  const controlsRef = useRef(null);

  useEffect(() => {
    if (!truckSwitchToken) return;
    setPreset('ISO');
    useSimulationStore.setState((state) => ({
      bedAngle: 0,
      hydraulicExtension: 0,
      state: {
        ...state.state,
        bed_angle_deg: 0
      }
    }));

    const name = selectedTruck === 'cat797b' ? 'CAT 797B' : selectedTruck === 'cat789c' ? 'CAT 789C' : 'CAT 793F';
    setLoadingLabel(`Loading ${name}...`);
    const timeout = window.setTimeout(() => setLoadingLabel(''), 1200);
    return () => window.clearTimeout(timeout);
  }, [selectedTruck, truckSwitchToken]);

  const truckName = selectedTruck === 'cat797b' ? 'CAT 797B' : selectedTruck === 'cat789c' ? 'CAT 789C' : 'CAT 793F';
  const truckSceneOffset = TRUCK_SCENE_OFFSETS[selectedTruck] ?? TRUCK_SCENE_OFFSETS.cat793f;
  const cameraPresets = CAMERA_PRESETS_BY_TRUCK[selectedTruck] ?? CAMERA_PRESETS_BY_TRUCK.cat793f;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <CameraPresetPanel preset={preset} onPresetChange={(p) => { setPreset(p); setAutoRotate360(false); }} autoRotate360={autoRotate360} onToggle360={() => setAutoRotate360(v => !v)} />

      {/* Sensor HUD overlay — top-left of viewport */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-lg border border-[var(--border)] bg-[rgba(10,14,22,0.88)] px-3 py-2 backdrop-blur-md">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-30" />
            <span className="relative inline-flex h-full w-full rounded-full bg-[var(--green)]" />
          </span>
          <span className="heading tracking-[0.18em] text-[var(--text-primary)]">{truckName}</span>
          <span className="text-[var(--text-muted)]">•</span>
          <span className="data text-[var(--text-muted)]">4 sensors</span>
        </div>
      </div>

      {degradedMode && (
        <div className="pointer-events-none absolute right-4 top-16 z-20 rounded-lg border border-[#EF4444] bg-[rgba(239,68,68,0.1)] px-3 py-1.5 text-[10px] font-semibold text-[#EF4444] shadow-[0_0_14px_rgba(239,68,68,0.2)]">
          ⚠ CAMERA: OFFLINE
        </div>
      )}
      {loadingLabel ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--yellow)] bg-[rgba(13,15,20,0.95)] px-5 py-2.5 text-sm font-semibold text-[var(--yellow)] shadow-[0_0_20px_rgba(245,168,0,0.3)]">
          {loadingLabel}
        </div>
      ) : null}
      <PerformanceBadge />

      {/* Compass */}
      <div className="pointer-events-none absolute bottom-6 right-3 z-20 rounded-full border border-[var(--border)] bg-[rgba(10,14,22,0.88)] p-2.5 backdrop-blur-md">
        <div className="relative h-9 w-9">
          <div className="absolute inset-0 rounded-full border border-[#2a3548]" />
          <div className="absolute left-1/2 top-1/2 h-3.5 w-[2px] -translate-x-1/2 -translate-y-full bg-[var(--yellow)]" style={{ transform: `translate(-50%, -100%) rotate(${(-cameraYaw * 180) / Math.PI}deg)` }} />
          <span className="absolute left-1/2 top-[1px] -translate-x-1/2 text-[8px] text-[var(--text-muted)]">N</span>
          <span className="absolute bottom-[1px] left-1/2 -translate-x-1/2 text-[8px] text-[var(--text-muted)]">S</span>
          <span className="absolute right-[1px] top-1/2 -translate-y-1/2 text-[8px] text-[var(--text-muted)]">E</span>
          <span className="absolute left-[1px] top-1/2 -translate-y-1/2 text-[8px] text-[var(--text-muted)]">W</span>
        </div>
      </div>

      <Canvas
        shadows
        camera={{ position: cameraPresets.ISO.position, fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#080809']} />
        <fogExp2 attach="fog" args={['#8b7355', 0.008]} />
        <EnvironmentSetup />
        <WarningSpotlight enabled={alert || dumpCycle?.warningLights} />
        <WarningLightRig active={Boolean(alert || dumpCycle?.warningLights)} />
        <CameraPresetAnimator preset={preset} controlsRef={controlsRef} presets={cameraPresets} />
        <CameraYawTracker onYaw={setCameraYaw} />

        <group position={truckSceneOffset}>
          <pointLight position={[0, 0.9, 0]} intensity={0.36} color="#ffd9a6" distance={13} />
          <TruckBody />
          <MaterialParticles />
          <SensorMarkers degradedMode={degradedMode} />
        </group>

        <OrbitControls
          ref={controlsRef}
          enablePan={autoRotate360}
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={28}
          minPolarAngle={autoRotate360 ? 0.05 : 0.2}
          maxPolarAngle={autoRotate360 ? Math.PI - 0.05 : Math.PI / 2}
          autoRotate={autoRotate360 || phase === 'IDLE'}
          autoRotateSpeed={autoRotate360 ? 1.5 : 0.3}
        />
      </Canvas>
    </div>
  );
}
