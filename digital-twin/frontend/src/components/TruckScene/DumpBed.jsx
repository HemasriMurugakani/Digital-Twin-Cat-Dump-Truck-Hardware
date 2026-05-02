import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { MathUtils } from 'three';
import { useSpring } from '@react-spring/three';
import { useSimulationStore } from '../../store/simulationStore';
import ResidueOverlay from './ResidueOverlay';

const BED_MAT = { color: '#c87530', metalness: 0.25, roughness: 0.65 };
const BED_FRONT = { color: '#b06828', metalness: 0.25, roughness: 0.68 };
const BED_VISOR = { color: '#a05820', metalness: 0.2, roughness: 0.7 };
const RIB_MAT = { color: '#8a5020', metalness: 0.22, roughness: 0.72 };
const CYL_SHELL = { color: '#888', metalness: 0.8, roughness: 0.2 };
const CYL_ROD = { color: '#c8c8c8', metalness: 0.95, roughness: 0.1 };

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

export default function DumpBed() {
  const groupRef = useRef(null);
  const tailgateRef = useRef(null);
  const cylinders = useRef([]);
  const rods = useRef([]);
  const { camera } = useThree();

  const phase = useSimulationStore((s) => s.state.phase);
  const dumpCycle = useSimulationStore((s) => s.dumpCycle);
  const stateBedAngle = useSimulationStore((s) => s.state.bed_angle_deg ?? 0);
  const setBedKinematics = useSimulationStore((s) => s.setBedKinematics);

  const [{ bedAngle }, api] = useSpring(() => ({ bedAngle: 0, config: { mass: 1, tension: 40, friction: 18 } }));

  useEffect(() => {
    const target = clamp(stateBedAngle, 0, 55);
    api.start({ bedAngle: target });
  }, [api, stateBedAngle]);

  const ribZ = useMemo(() => [-1.2, -0.4, 0.4, 1.2], []);
  const stringerX = useMemo(() => [-1.8, 0, 1.8], []);

  useFrame(() => {
    if (!groupRef.current) return;

    let angle = clamp(bedAngle.get(), 0, 55);
    if (phase === 'DUMPING' && angle > 20) {
      angle += MathUtils.randFloatSpread(0.6);
    }
    angle = clamp(angle, 0, 55);

    groupRef.current.rotation.z = MathUtils.degToRad(angle);

    const tailOpen = angle > 35 ? clamp((angle - 35) / 20, 0, 1) : 0;
    if (tailgateRef.current) {
      tailgateRef.current.rotation.x = MathUtils.degToRad(-40 * tailOpen);
    }

    const hydraulicLength = 1.5 + (angle / 52) * 2.8;
    const rodLength = hydraulicLength * 0.6;
    const pivotTilt = MathUtils.degToRad(20 + (angle / 55) * 30);

    for (let i = 0; i < cylinders.current.length; i += 1) {
      const shell = cylinders.current[i];
      const rod = rods.current[i];
      if (shell) {
        shell.rotation.z = pivotTilt;
        shell.scale.y = hydraulicLength / 2.2;
      }
      if (rod) {
        rod.rotation.z = pivotTilt;
        rod.scale.y = rodLength / 1.5;
        rod.position.y = 1.9 + hydraulicLength * 0.25;
      }
    }

    if (phase === 'DUMPING' && angle > 20) {
      camera.position.x += MathUtils.randFloatSpread(0.01);
      camera.position.y += MathUtils.randFloatSpread(0.006);
      camera.position.z += MathUtils.randFloatSpread(0.01);
    }

    setBedKinematics({ bedAngle: angle, hydraulicExtension: clamp(angle / 55, 0, 1) });
  });

  return (
    <group>
      <group ref={groupRef} position={[3.2, 1.9, 0]}>
        <mesh castShadow receiveShadow position={[-3.25, 0, 0]}>
          <boxGeometry args={[6.5, 0.25, 3.9]} />
          <meshStandardMaterial {...BED_MAT} />
        </mesh>

        <mesh castShadow receiveShadow position={[-3.25, 0.7, 1.85]}>
          <boxGeometry args={[6.5, 1.4, 0.22]} />
          <meshStandardMaterial {...BED_MAT} />
        </mesh>
        <mesh castShadow receiveShadow position={[-3.25, 0.7, -1.85]}>
          <boxGeometry args={[6.5, 1.4, 0.22]} />
          <meshStandardMaterial {...BED_MAT} />
        </mesh>

        <mesh castShadow receiveShadow position={[-6.35, 1.1, 0]}>
          <boxGeometry args={[0.22, 2.2, 4.0]} />
          <meshStandardMaterial {...BED_FRONT} />
        </mesh>
        <mesh castShadow receiveShadow position={[-6.65, 1.2, 0]} rotation={[0, 0, -0.15]}>
          <boxGeometry args={[0.8, 0.15, 4.1]} />
          <meshStandardMaterial {...BED_VISOR} />
        </mesh>

        <group ref={tailgateRef} position={[0.05, 0.75, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.22, 1.4, 3.9]} />
            <meshStandardMaterial {...BED_FRONT} />
          </mesh>
        </group>

        {ribZ.map((z, index) => (
          <mesh key={`rib-${index}`} castShadow receiveShadow position={[-3.25, -0.1, z]}>
            <boxGeometry args={[6.5, 0.18, 0.15]} />
            <meshStandardMaterial {...RIB_MAT} />
          </mesh>
        ))}
        {stringerX.map((x, index) => (
          <mesh key={`str-${index}`} castShadow receiveShadow position={[-3.25 + x, -0.1, 0]}>
            <boxGeometry args={[0.12, 0.18, 3.9]} />
            <meshStandardMaterial {...RIB_MAT} />
          </mesh>
        ))}

        <group position={[-3.15, 0.45, 0]}>
          <ResidueOverlay />
        </group>
      </group>

      {[-1.5, 1.5].map((z, index) => (
        <group key={`hyd-${z}`} position={[1.5, 1.4, z]}>
          <mesh
            ref={(el) => {
              cylinders.current[index] = el;
            }}
            castShadow
            receiveShadow
            position={[0, 1.35, 0]}
          >
            <cylinderGeometry args={[0.14, 0.14, 2.2, 8]} />
            <meshStandardMaterial {...CYL_SHELL} />
          </mesh>
          <mesh
            ref={(el) => {
              rods.current[index] = el;
            }}
            castShadow
            receiveShadow
            position={[0, 2.2, 0]}
          >
            <cylinderGeometry args={[0.08, 0.08, 1.5, 8]} />
            <meshStandardMaterial {...CYL_ROD} />
          </mesh>
        </group>
      ))}

      <Html position={[0.6, 8.4, 0]} center distanceFactor={12}>
        <div className="rounded border border-[var(--blue)]/50 bg-black/65 px-3 py-1 text-xs text-[var(--blue)]">
          Bed Angle: {clamp(bedAngle.get(), 0, 55).toFixed(1)}°
        </div>
      </Html>
    </group>
  );
}
