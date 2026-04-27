import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';
import { useSimulationStore } from '../../store/simulationStore';
import ResidueOverlay from './ResidueOverlay';

export default function DumpBed() {
  const bedRef = useRef();
  const bedAngleDeg = useSimulationStore((s) => s.state.bed_angle_deg);

  useFrame(() => {
    if (!bedRef.current) return;
    const target = MathUtils.degToRad(bedAngleDeg);
    bedRef.current.rotation.z = MathUtils.lerp(bedRef.current.rotation.z, target, 0.11);
  });

  return (
    <group ref={bedRef} position={[1.6, 2.15, 0]}>
      <mesh castShadow>
        <boxGeometry args={[4.8, 0.5, 3.2]} />
        <meshStandardMaterial color="#c88e24" metalness={0.25} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.56, 0]} castShadow>
        <boxGeometry args={[4.4, 0.1, 2.8]} />
        <meshStandardMaterial color="#2d2f36" metalness={0.34} roughness={0.58} />
      </mesh>
      <ResidueOverlay />
    </group>
  );
}
