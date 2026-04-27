import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute } from 'three';
import { useSimulationStore } from '../../store/simulationStore';

const PARTICLE_COUNT = 700;

function createParticleBuffer() {
  const arr = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    arr[i * 3 + 0] = (Math.random() - 0.5) * 3.5;
    arr[i * 3 + 1] = Math.random() * 0.9;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
  }
  return arr;
}

export default function MaterialParticles() {
  const pointsRef = useRef();
  const bedAngle = useSimulationStore((s) => s.state.bed_angle_deg);
  const residueRisk = useSimulationStore((s) => s.fusion.residue_risk);

  const positions = useMemo(() => createParticleBuffer(), []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const speed = 0.4 + (bedAngle / 52) * 1.2;
    const attr = pointsRef.current.geometry.getAttribute('position');

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const yIndex = i * 3 + 1;
      attr.array[yIndex] -= delta * speed;
      if (attr.array[yIndex] < -0.4) {
        attr.array[yIndex] = 0.8 + residueRisk * 0.4;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={[1.65, 2.5, 0]} visible={bedAngle > 18}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} color="#8f939c" transparent opacity={0.72} />
    </points>
  );
}
