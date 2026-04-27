import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DataTexture, MathUtils, RedFormat, RepeatWrapping, UnsignedByteType } from 'three';

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

    for (let i = 0; i < 200; i += 1) {
      const i3 = i * 3;
      attr.array[i3 + 1] = baseY[i] + Math.sin(time * 0.55 + offsets[i]) * 0.12;
      attr.array[i3 + 0] += Math.sin(time * 0.2 + offsets[i]) * delta * 0.18;
      attr.array[i3 + 2] += Math.cos(time * 0.18 + offsets[i]) * delta * 0.18;

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
      <pointsMaterial color="#8B7355" size={0.05} transparent opacity={0.3} depthWrite={false} />
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
    </>
  );
}
