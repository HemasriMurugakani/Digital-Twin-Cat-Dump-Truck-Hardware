import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, MeshStandardMaterial, Vector3 } from 'three';
import { useSimulationStore } from '../../store/simulationStore';

const TRUCK_YELLOW = new MeshStandardMaterial({ color: '#F5A800', roughness: 0.3, metalness: 0.6 });
const TRUCK_BLACK = new MeshStandardMaterial({ color: '#1A1A1A', roughness: 0.8, metalness: 0.2 });
const TRUCK_STEEL = new MeshStandardMaterial({ color: '#3A3A3A', roughness: 0.4, metalness: 0.8 });
const TRUCK_GLASS = new MeshStandardMaterial({
  color: '#4A7FA5',
  roughness: 0,
  metalness: 0.1,
  transparent: true,
  opacity: 0.6
});
const RUBBER = new MeshStandardMaterial({ color: '#111111', roughness: 1.0, metalness: 0 });
const RIM_STEEL = new MeshStandardMaterial({ color: '#888888', roughness: 0.25, metalness: 0.9 });
const HEADLIGHT_MATERIAL = new MeshStandardMaterial({
  color: '#FFFFFF',
  emissive: '#FFFFFF',
  emissiveIntensity: 1.5,
  roughness: 0.1,
  metalness: 0.2
});
const SMOKE_COUNT = 50;

function Wheel({ position, radius, width, wheelRef }) {
  const lugNuts = useMemo(
    () =>
      Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return [Math.cos(angle) * (radius * 0.5), Math.sin(angle) * (radius * 0.5)];
      }),
    [radius]
  );

  return (
    <group ref={wheelRef} position={position}>
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]} material={RUBBER}>
        <cylinderGeometry args={[radius, radius, width, 32]} />
      </mesh>
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]} material={RIM_STEEL}>
        <cylinderGeometry args={[1.4, 1.4, width + 0.1, 16]} />
      </mesh>
      {lugNuts.map(([y, z], index) => (
        <mesh
          key={`lug-${index}`}
          castShadow
          receiveShadow
          material={TRUCK_STEEL}
          position={[width * 0.45, y, z]}
        >
          <sphereGeometry args={[0.15, 10, 10]} />
        </mesh>
      ))}
    </group>
  );
}

function ExhaustSmoke({ running }) {
  const smokeRef = useRef(null);
  const exhaustTips = useMemo(
    () => [
      [5, 7.25, -0.55],
      [5, 7.25, 0.15],
      [5, 7.25, 0.85]
    ],
    []
  );

  const smokeData = useMemo(() => {
    const particles = new Float32Array(SMOKE_COUNT * 3);
    for (let i = 0; i < SMOKE_COUNT; i += 1) {
      const pipeIndex = i % exhaustTips.length;
      const [x, y, z] = exhaustTips[pipeIndex];
      particles[i * 3 + 0] = x + (Math.random() - 0.5) * 0.16;
      particles[i * 3 + 1] = y + Math.random() * 0.5;
      particles[i * 3 + 2] = z + (Math.random() - 0.5) * 0.18;
    }
    return particles;
  }, [exhaustTips]);

  useFrame((_, delta) => {
    if (!smokeRef.current) return;
    smokeRef.current.visible = running;
    if (!running) return;

    const attribute = smokeRef.current.geometry.getAttribute('position');
    for (let i = 0; i < attribute.count; i += 1) {
      const base = i * 3;
      attribute.array[base + 1] += delta * 0.65;
      attribute.array[base + 0] += (Math.random() - 0.5) * 0.004;
      attribute.array[base + 2] += (Math.random() - 0.5) * 0.004;

      const pipeIndex = i % exhaustTips.length;
      const [x, y, z] = exhaustTips[pipeIndex];
      if (attribute.array[base + 1] > y + 1.9) {
        attribute.array[base + 0] = x + (Math.random() - 0.5) * 0.16;
        attribute.array[base + 1] = y + Math.random() * 0.14;
        attribute.array[base + 2] = z + (Math.random() - 0.5) * 0.14;
      }
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={smokeRef} visible={running}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[smokeData, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#E5E7EB" size={0.11} opacity={0.35} transparent depthWrite={false} />
    </points>
  );
}

function CorrectionDustBurst({ active }) {
  const burstRef = useRef(null);
  const burstData = useMemo(() => {
    const arr = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i += 1) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 1.4;
      arr[i * 3 + 1] = 2.0 + Math.random() * 0.4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 2.0;
    }
    return arr;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!burstRef.current) return;
    burstRef.current.visible = active;
    if (!active) return;

    const attr = burstRef.current.geometry.getAttribute('position');
    const time = clock.elapsedTime;
    for (let i = 0; i < attr.count; i += 1) {
      const base = i * 3;
      attr.array[base + 1] += delta * (0.55 + Math.sin(time * 12 + i) * 0.08);
      attr.array[base + 0] += Math.sin(time * 4 + i) * 0.002;
      attr.array[base + 2] += Math.cos(time * 3 + i) * 0.002;
      if (attr.array[base + 1] > 4.5) {
        attr.array[base + 0] = (Math.random() - 0.5) * 1.4;
        attr.array[base + 1] = 2.0 + Math.random() * 0.4;
        attr.array[base + 2] = (Math.random() - 0.5) * 2.0;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={burstRef} visible={active} position={[2.5, 1.8, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[burstData, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#A7F3D0" size={0.055} opacity={0.9} transparent depthWrite={false} />
    </points>
  );
}

export default function TruckBody() {
  const simState = useSimulationStore((s) => s.state);
  const dumpCycle = useSimulationStore((s) => s.dumpCycle);
  const wheelRefs = useRef([]);
  const headlightRefs = useRef([]);

  const isEngineRunning = dumpCycle?.stage === 'DUMPING';
  const speed = Number(simState.speed ?? 0);

  const railingCurve = useMemo(
    () =>
      new CatmullRomCurve3(
        [
          new Vector3(0.4, 7.45, -2.65),
          new Vector3(2.6, 7.45, -2.65),
          new Vector3(2.6, 7.45, 2.65),
          new Vector3(0.4, 7.45, 2.65),
          new Vector3(0.4, 7.45, -2.65)
        ],
        true
      ),
    []
  );

  useFrame((_, delta) => {
    const wheelRotation = speed * 0.5;
    for (let i = 0; i < wheelRefs.current.length; i += 1) {
      const wheel = wheelRefs.current[i];
      if (wheel) {
        wheel.rotation.x += wheelRotation;
      }
    }

    const pulse = 1.3 + Math.sin(delta * 35 + performance.now() * 0.004) * 0.4;
    for (let i = 0; i < headlightRefs.current.length; i += 1) {
      const light = headlightRefs.current[i];
      if (light) {
        light.material.emissiveIntensity = dumpCycle?.warningLights ? pulse * 1.5 : pulse;
      }
    }
  });

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 3, 0]} material={TRUCK_STEEL}>
        <boxGeometry args={[15, 1.2, 5.5]} />
      </mesh>

      <mesh castShadow receiveShadow position={[4, 4.5, 0]} material={TRUCK_YELLOW}>
        <boxGeometry args={[5, 3.5, 8]} />
      </mesh>

      {[
        [6.4, 4, 2.5],
        [6.4, 4, -2.5]
      ].map((position, index) => (
        <mesh
          key={`headlight-${position[2]}`}
          ref={(el) => {
            headlightRefs.current[index] = el;
          }}
          castShadow
          receiveShadow
          position={position}
          material={HEADLIGHT_MATERIAL}
        >
          <boxGeometry args={[0.4, 0.6, 0.2]} />
        </mesh>
      ))}

      <mesh castShadow receiveShadow position={[1.5, 6.2, 0]} material={TRUCK_YELLOW}>
        <boxGeometry args={[2.5, 2.8, 5]} />
      </mesh>
      <mesh castShadow receiveShadow position={[2.8, 6.8, 0]} material={TRUCK_GLASS}>
        <boxGeometry args={[2.4, 1.8, 0.1]} />
      </mesh>
      <mesh castShadow receiveShadow position={[1.5, 6.8, 2.6]} material={TRUCK_GLASS}>
        <boxGeometry args={[0.1, 1.2, 1.8]} />
      </mesh>
      <mesh castShadow receiveShadow position={[1.5, 6.8, -2.6]} material={TRUCK_GLASS}>
        <boxGeometry args={[0.1, 1.2, 1.8]} />
      </mesh>

      {[
        [0.4, 6.2, -2.65],
        [2.6, 6.2, -2.65],
        [0.4, 6.2, 2.65],
        [2.6, 6.2, 2.65]
      ].map((position) => (
        <mesh key={`cab-post-${position.join('-')}`} castShadow receiveShadow position={position} material={TRUCK_STEEL}>
          <cylinderGeometry args={[0.05, 0.05, 2.5, 10]} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow material={TRUCK_STEEL}>
        <tubeGeometry args={[railingCurve, 40, 0.04, 10, true]} />
      </mesh>

      {Array.from({ length: 5 }, (_, index) => (
        <mesh
          key={`ladder-rung-${index}`}
          castShadow
          receiveShadow
          position={[2.2, 2.0 + index * 0.8, 2.8]}
          material={TRUCK_STEEL}
        >
          <boxGeometry args={[1.2, 0.1, 0.05]} />
        </mesh>
      ))}
      {[
        [1.65, 3.6, 2.8],
        [2.75, 3.6, 2.8]
      ].map((position) => (
        <mesh key={`ladder-rail-${position[0]}`} castShadow receiveShadow position={position} material={TRUCK_STEEL}>
          <boxGeometry args={[0.05, 4, 0.05]} />
        </mesh>
      ))}

      {[-0.8, 0, 0.8].map((z) => (
        <mesh key={`exhaust-${z}`} castShadow receiveShadow position={[5, 6.5, z]} material={TRUCK_STEEL}>
          <cylinderGeometry args={[0.15, 0.15, 1.5, 16]} />
        </mesh>
      ))}
      <ExhaustSmoke running={isEngineRunning} />
      <CorrectionDustBurst active={dumpCycle?.stage === 'CORRECTING'} />

      <Wheel
        wheelRef={(el) => {
          wheelRefs.current[0] = el;
        }}
        position={[5, 2.2, 4.5]}
        radius={2.2}
        width={1.8}
      />
      <Wheel
        wheelRef={(el) => {
          wheelRefs.current[1] = el;
        }}
        position={[5, 2.2, -4.5]}
        radius={2.2}
        width={1.8}
      />

      {[
        [-4.5, 2.8, 3.8],
        [-4.5, 2.8, 5.8],
        [-4.5, 2.8, -3.8],
        [-4.5, 2.8, -5.8]
      ].map((position, index) => (
        <Wheel
          key={`rear-wheel-${position[2]}`}
          wheelRef={(el) => {
            wheelRefs.current[index + 2] = el;
          }}
          position={position}
          radius={2.8}
          width={1.8}
        />
      ))}

      {Array.from({ length: 5 }, (_, index) => (
        <mesh
          key={`cross-member-${index}`}
          castShadow
          receiveShadow
          position={[-6 + index * 3, 2.3, 0]}
          material={TRUCK_STEEL}
        >
          <boxGeometry args={[0.3, 0.3, 6]} />
        </mesh>
      ))}

      {[
        [-2, 3, 4.5],
        [-2, 3, -4.5]
      ].map((position) => (
        <mesh
          key={`fuel-tank-${position[2]}`}
          castShadow
          receiveShadow
          position={position}
          rotation={[Math.PI / 2, 0, 0]}
          material={TRUCK_YELLOW}
        >
          <cylinderGeometry args={[0.8, 0.8, 3.5, 16]} />
        </mesh>
      ))}

      <mesh castShadow receiveShadow position={[2.8, 4.6, 0]} material={TRUCK_BLACK}>
        <boxGeometry args={[1.8, 1.6, 6.8]} />
      </mesh>
      <mesh castShadow receiveShadow position={[2.8, 4.55, 0]}>
        <boxGeometry args={[1.95, 1.72, 6.95]} />
        <meshStandardMaterial color="#330808" emissive="#EF4444" emissiveIntensity={dumpCycle?.warningLights ? 0.55 : 0.02} transparent opacity={0.12} />
      </mesh>
    </group>
  );
}
