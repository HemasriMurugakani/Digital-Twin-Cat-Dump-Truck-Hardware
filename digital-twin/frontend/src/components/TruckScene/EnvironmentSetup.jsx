import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Color, DataTexture, MathUtils, RepeatWrapping, UnsignedByteType } from 'three';
import { useSimulationStore } from '../../store/simulationStore';

function StarsField() {
  const positions = useMemo(() => {
    const arr = new Float32Array(1200 * 3);
    for (let i = 0; i < 1200; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 62 + Math.random() * 36;
      const i3 = i * 3;
      arr[i3] = radius * Math.sin(phi) * Math.cos(theta);
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
      <pointsMaterial color="#ffffff" size={0.08} transparent opacity={0.8} depthWrite={false} />
    </points>
  );
}

function DustMotes() {
  const motesRef = useRef(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(40 * 3);
    for (let i = 0; i < 40; i += 1) {
      const i3 = i * 3;
      arr[i3] = (Math.random() - 0.5) * 20;
      arr[i3 + 1] = 0.8 + Math.random() * 6;
      arr[i3 + 2] = (Math.random() - 0.5) * 20;
    }
    return arr;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!motesRef.current) return;
    const attr = motesRef.current.geometry.getAttribute('position');
    const t = clock.elapsedTime;
    for (let i = 0; i < attr.count; i += 1) {
      const i3 = i * 3;
      attr.array[i3] += Math.sin(t * 0.12 + i) * delta * 0.2;
      attr.array[i3 + 1] += Math.cos(t * 0.18 + i) * delta * 0.03;
      attr.array[i3 + 2] += Math.sin(t * 0.1 + i) * delta * 0.16;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={motesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#f8fafc" size={0.06} transparent opacity={0.45} depthWrite={false} />
    </points>
  );
}

function DustImpactCloud() {
  const phase = useSimulationStore((s) => s.state.phase);
  const cloudRef = useRef([]);

  useFrame(({ clock }) => {
    const active = phase === 'DUMPING';
    const t = clock.elapsedTime;
    for (let i = 0; i < cloudRef.current.length; i += 1) {
      const cloud = cloudRef.current[i];
      if (!cloud) continue;
      cloud.visible = active;
      if (!active) continue;
      const life = (t + i * 0.13) % 2;
      const scale = 1 + life * 2.4;
      cloud.scale.set(scale, scale, scale);
      cloud.material.opacity = Math.max(0, 0.5 - life * 0.24);
    }
  });

  return (
    <group position={[3, 0.06, 0]}>
      {Array.from({ length: 20 }, (_, index) => (
        <mesh
          key={`dust-cloud-${index}`}
          ref={(el) => {
            cloudRef.current[index] = el;
          }}
          position={[(Math.random() - 0.5) * 2.6, 0, (Math.random() - 0.5) * 2.2]}
          rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}
          visible={false}
        >
          <circleGeometry args={[0.4, 12]} />
          <meshBasicMaterial color="#8b6914" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function EnvironmentSetup() {
  const gridRef = useRef(null);

  const groundTexture = useMemo(() => {
    const size = 64;
    const data = new Uint8Array(size * size * 3);
    const c1 = new Color('#1a1a1a');
    const c2 = new Color('#2a2520');
    for (let i = 0; i < size * size; i += 1) {
      const mix = Math.random() * 0.9;
      const c = c1.clone().lerp(c2, mix);
      data[i * 3] = Math.floor(c.r * 255);
      data[i * 3 + 1] = Math.floor(c.g * 255);
      data[i * 3 + 2] = Math.floor(c.b * 255);
    }
    const texture = new DataTexture(data, size, size, UnsignedByteType);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(14, 14);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useFrame(() => {
    if (!gridRef.current) return;
    gridRef.current.material.transparent = true;
    gridRef.current.material.opacity = 0.15;
  });

  return (
    <>
      <ambientLight intensity={0.28} color="#a8bdd1" />
      <directionalLight
        intensity={2.6}
        color="#f8ead0"
        position={[30, 50, 20]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-near={0.5}
        shadow-bias={-0.00025}
      />
      <directionalLight intensity={0.75} color="#4a6080" position={[-20, 10, -15]} />
      <pointLight intensity={0.38} color="#c87530" position={[0, 0.5, 0]} distance={12} />
      <hemisphereLight args={['#1a2a3a', '#1a1208', 0.36]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#1a1a18" map={groundTexture} roughness={0.98} metalness={0.0} />
      </mesh>

      <gridHelper ref={gridRef} args={[40, 40, '#2a2a2a', '#2a2a2a']} position={[0, 0.02, 0]} />

      <mesh>
        <sphereGeometry args={[400, 16, 16]} />
        <meshBasicMaterial color="#0a1520" side={BackSide} />
      </mesh>
      <mesh position={[0, -120, 0]}>
        <sphereGeometry args={[399.5, 16, 16]} />
        <meshBasicMaterial color="#12100e" side={BackSide} transparent opacity={0.55} />
      </mesh>



      <StarsField />
      <DustMotes />
      <DustImpactCloud />
    </>
  );
}
