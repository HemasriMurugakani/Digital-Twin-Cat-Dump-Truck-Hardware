import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSimulationStore } from '../../store/simulationStore';
import EnvironmentSetup from './EnvironmentSetup';
import TruckBody from './TruckBody';
import DumpBed from './DumpBed';
import MaterialParticles from './MaterialParticles';
import SensorMarkers from './SensorMarkers';
import TruckLabels from './TruckLabels';

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

export default function TruckScene() {
  const phase = useSimulationStore((s) => s.state.phase);
  const alert = useSimulationStore((s) => s.alert);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 64px)' }}>
      <Canvas
        shadows
        camera={{ position: [12, 6, 18], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#080809']} />
        <fogExp2 attach="fog" args={['#080809', 0.015]} />
        <EnvironmentSetup />
        <WarningSpotlight enabled={alert} />

        <group position={[0, 0, 0]}>
          <TruckBody />
          <DumpBed />
          <MaterialParticles />
          <SensorMarkers />
          <TruckLabels />
        </group>

        <OrbitControls
          enablePan={false}
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
