import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSimulationStore } from '../../store/simulationStore';
import EnvironmentSetup from './EnvironmentSetup';
import TruckBody from './TruckBody';
import DumpBed from './DumpBed';
import MaterialParticles from './MaterialParticles';
import SensorMarkers from './SensorMarkers';
import TruckLabels from './TruckLabels';

const cameraPresets = {
  ISO: { position: [12, 6, 18], target: [0, 3.5, 0] },
  SIDE: { position: [21, 5.5, 0.5], target: [0, 3.8, 0] },
  TOP: { position: [0.1, 20, 0.1], target: [0, 0.8, 0] },
  REAR: { position: [-18, 5.2, -1], target: [0, 3.4, 0] }
};

function CameraPresetAnimator({ preset, controlsRef }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(...cameraPresets.ISO.target));
  const positionRef = useRef(new THREE.Vector3(...cameraPresets.ISO.position));

  useEffect(() => {
    const nextPreset = cameraPresets[preset] ?? cameraPresets.ISO;
    targetRef.current.set(...nextPreset.target);
    positionRef.current.set(...nextPreset.position);
  }, [preset]);

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

function CameraPresetPanel({ preset, onPresetChange }) {
  const buttons = useMemo(
    () => [
      ['ISO', 'ISO VIEW'],
      ['SIDE', 'SIDE VIEW'],
      ['TOP', 'TOP VIEW'],
      ['REAR', 'REAR VIEW']
    ],
    []
  );

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-20 flex flex-wrap justify-end gap-2">
      {buttons.map(([key, label]) => {
        const active = preset === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onPresetChange(key)}
            className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] transition ${
              active
                ? 'border-[var(--yellow)] bg-[rgba(245,168,0,0.18)] text-[var(--yellow)] shadow-[0_0_18px_rgba(245,168,0,0.16)]'
                : 'border-[#2A2A31] bg-[rgba(10,10,12,0.82)] text-[var(--text-muted)] hover:border-[var(--yellow)] hover:text-[var(--text-primary)]'
            }`}
          >
            {label}
          </button>
        );
      })}
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
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-full border border-[#1F1F26] bg-[rgba(8,8,9,0.82)] px-4 py-2 text-[11px] text-[var(--text-muted)] shadow-[0_12px_30px_rgba(0,0,0,0.32)] backdrop-blur-sm">
      <span className="data text-[var(--text-primary)]">FPS: {fps}</span>
      <span className="mx-2 text-[#2F2F37]">|</span>
      <span className="data text-[var(--text-primary)]">Particles: {showParticles ? 800 : 0}</span>
      <span className="mx-2 text-[#2F2F37]">|</span>
      <span className="data text-[var(--text-primary)]">Latency: {latencyMs.toFixed(0)}ms</span>
    </div>
  );
}

export default function TruckScene() {
  const phase = useSimulationStore((s) => s.state.phase);
  const alert = useSimulationStore((s) => s.alert);
  const dumpCycle = useSimulationStore((s) => s.dumpCycle);
  const [preset, setPreset] = useState('ISO');
  const controlsRef = useRef(null);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <CameraPresetPanel preset={preset} onPresetChange={setPreset} />
      <PerformanceBadge />
      <Canvas
        shadows
        camera={{ position: cameraPresets.ISO.position, fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#080809']} />
        <fogExp2 attach="fog" args={['#080809', 0.015]} />
        <EnvironmentSetup />
        <WarningSpotlight enabled={alert || dumpCycle?.warningLights} />
        <WarningLightRig active={Boolean(alert || dumpCycle?.warningLights)} />
        <CameraPresetAnimator preset={preset} controlsRef={controlsRef} />

        <group position={[0, 0, 0]}>
          <TruckBody />
          <DumpBed />
          <MaterialParticles />
          <SensorMarkers />
          <TruckLabels />
        </group>

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={8}
          maxDistance={35}
          maxPolarAngle={Math.PI / 2}
          autoRotate={phase === 'IDLE'}
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}
