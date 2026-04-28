import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DataTexture, MathUtils, RedFormat, RepeatWrapping, UnsignedByteType } from 'three';
import { useSimulationStore } from '../../store/simulationStore';

function StarsField() {
  const positions = useMemo(() => {
    const arr = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 52 + Math.random() * 28;
      const i3 = i * 3;
      arr[i3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
      arr[i3 + 1] = radius * Math.cos(phi);
      arr[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#FFFFFF" size={0.08} transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}

function DustParticles() {
  const pointsRef = useRef(null);
  const dumpCycle = useSimulationStore((s) => s.dumpCycle);

  const { positions, baseY, offsets } = useMemo(() => {
    const pos = new Float32Array(200 * 3);
    const y = new Float32Array(200);
    const offs = new Float32Array(200);

    for (let i = 0; i < 200; i += 1) {
      const i3 = i * 3;
      pos[i3 + 0] = (Math.random() - 0.5) * 30;
      pos[i3 + 1] = 0.6 + Math.random() * 5;
      pos[i3 + 2] = (Math.random() - 0.5) * 30;
      y[i] = pos[i3 + 1];
      offs[i] = Math.random() * Math.PI * 2;
    }

    return { positions: pos, baseY: y, offsets: offs };
  }, []);

  useFrame(({ clock }, delta) => {
    if (!pointsRef.current) return;
    const attr = pointsRef.current.geometry.getAttribute('position');
    const time = clock.elapsedTime;
    const dumpBoost = dumpCycle?.active ? 1.9 : 1;
    const driftBoost = dumpCycle?.stage === 'DUMPING' ? 2.8 : dumpCycle?.stage === 'CORRECTING' ? 2.1 : 1;

    for (let i = 0; i < 200; i += 1) {
      const i3 = i * 3;
      attr.array[i3 + 1] = baseY[i] + Math.sin(time * 0.55 * driftBoost + offsets[i]) * (0.12 + (dumpCycle?.stage === 'DUMPING' ? 0.08 : 0));
      attr.array[i3 + 0] += Math.sin(time * 0.2 + offsets[i]) * delta * 0.18 * dumpBoost;
      attr.array[i3 + 2] += Math.cos(time * 0.18 + offsets[i]) * delta * 0.18 * dumpBoost;

      if (Math.abs(attr.array[i3 + 0]) > 18) attr.array[i3 + 0] *= -0.94;
      if (Math.abs(attr.array[i3 + 2]) > 18) attr.array[i3 + 2] *= -0.94;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#8B7355" size={dumpCycle?.stage === 'DUMPING' ? 0.06 : 0.05} transparent opacity={dumpCycle?.stage === 'DUMPING' ? 0.45 : 0.3} depthWrite={false} />
    </points>
  );
}

function GroundDustBurst() {
  const burstRef = useRef(null);
  const dumpCycle = useSimulationStore((s) => s.dumpCycle);
  const burstData = useMemo(() => {
    const arr = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i += 1) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = 0.12 + Math.random() * 0.55;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return arr;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!burstRef.current) return;
    const active = dumpCycle?.stage === 'DUMPING' || dumpCycle?.stage === 'DETECTING' || dumpCycle?.stage === 'CORRECTING';
    burstRef.current.visible = active && (dumpCycle?.tailgateOpen || dumpCycle?.active);
    if (!burstRef.current.visible) return;

    const attr = burstRef.current.geometry.getAttribute('position');
    const time = clock.elapsedTime;
    for (let i = 0; i < attr.count; i += 1) {
      const base = i * 3;
      attr.array[base + 1] += delta * 0.12 + Math.abs(Math.sin(time * 3 + i)) * 0.003;
      attr.array[base + 0] += Math.sin(time * 1.7 + i) * 0.006;
      attr.array[base + 2] += Math.cos(time * 1.2 + i) * 0.006;
      if (attr.array[base + 1] > 1.6) {
        attr.array[base + 0] = (Math.random() - 0.5) * 10;
        attr.array[base + 1] = 0.12 + Math.random() * 0.55;
        attr.array[base + 2] = (Math.random() - 0.5) * 8;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={burstRef} visible={false} position={[0, 0.18, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[burstData, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#C4B08C" size={0.08} opacity={0.55} transparent depthWrite={false} />
    </points>
  );
}

export default function EnvironmentSetup() {
  const roughnessMap = useMemo(() => {
    const size = 32;
    const data = new Uint8Array(size * size);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.floor(MathUtils.lerp(48, 220, Math.random()));
    }

    const texture = new DataTexture(data, size, size, RedFormat, UnsignedByteType);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(10, 10);
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <>
      <ambientLight intensity={0.3} color="#404040" />

      <directionalLight
        position={[10, 20, 5]}
        intensity={1.2}
        color="#FFF8E7"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      <pointLight position={[-5, 3, 0]} color="#F5A800" intensity={2} distance={15} />
      <pointLight position={[3, 5, 0]} color="#FFFFFF" intensity={0.8} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color="#1A1A1A"
          roughness={0.9}
          metalness={0.1}
          roughnessMap={roughnessMap}
        />
      </mesh>

      <gridHelper args={[40, 40, '#222222', '#222222']} position={[0, 0.02, 0]} />

      <StarsField />
      <DustParticles />
      <GroundDustBurst />
    </>
  );
}
