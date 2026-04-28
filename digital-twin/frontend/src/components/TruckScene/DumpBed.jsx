import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';
import { Html } from '@react-three/drei';
import { useSpring } from '@react-spring/three';
import { useSimulationStore } from '../../store/simulationStore';
import ResidueOverlay from './ResidueOverlay';

const TRUCK_STEEL = { color: '#3A3A3A', roughness: 0.4, metalness: 0.8 };
const WEAR_STEEL = { color: '#2A2A2A', roughness: 0.55, metalness: 0.75 };
const HYDRAULIC_SHELL = { color: '#CC2200', roughness: 0.45, metalness: 0.32 };
const HYDRAULIC_ROD = { color: '#9DA3AB', roughness: 0.15, metalness: 0.95 };

const DUMP_STATE = {
  IDLE: 0,
  DUMPING: 1,
  HELD: 2,
  LOWERING: 3,
  CORRECTION: 4
};

function getDumpState(phase, alert) {
  if (alert && (phase === 'DUMP_RAISE' || phase === 'DUMP_HOLD')) {
    return DUMP_STATE.CORRECTION;
  }
  if (phase === 'DUMP_RAISE') return DUMP_STATE.DUMPING;
  if (phase === 'DUMP_HOLD') return DUMP_STATE.HELD;
  if (phase === 'DUMP_LOWER') return DUMP_STATE.LOWERING;
  return DUMP_STATE.IDLE;
}

export default function DumpBed() {
  const bedRef = useRef(null);
  const tailgateRef = useRef(null);
  const hydraulicGroupRefs = useRef([]);
  const hydraulicRodRefs = useRef([]);
  const lastStateRef = useRef(DUMP_STATE.IDLE);
  const stateElapsedRef = useRef(0);
  const correctionElapsedRef = useRef(0);
  const labelTimerRef = useRef(0);

  const [displayAngle, setDisplayAngle] = useState(0);
  const [displayExtension, setDisplayExtension] = useState(0);

  const phase = useSimulationStore((s) => s.state.phase);
  const alert = useSimulationStore((s) => s.alert);
  const setBedKinematics = useSimulationStore((s) => s.setBedKinematics);

  const [{ baseAngle }, springApi] = useSpring(() => ({
    baseAngle: 0,
    config: { mass: 2.6, tension: 130, friction: 26 }
  }));

  const dumpState = getDumpState(phase, alert);

  useEffect(() => {
    if (dumpState === lastStateRef.current) return;

    const angleSnapshot = baseAngle.get();
    lastStateRef.current = dumpState;
    stateElapsedRef.current = 0;
    if (dumpState === DUMP_STATE.CORRECTION) {
      correctionElapsedRef.current = 0;
    }

    if (dumpState === DUMP_STATE.IDLE) {
      springApi.start({ baseAngle: 0, config: { mass: 1.9, tension: 125, friction: 24 } });
    }
    if (dumpState === DUMP_STATE.DUMPING) {
      springApi.start({ baseAngle: 52, config: { mass: 2.2, tension: 110, friction: 30 } });
    }
    if (dumpState === DUMP_STATE.HELD) {
      springApi.start({ baseAngle: angleSnapshot, config: { mass: 2.1, tension: 120, friction: 38 } });
    }
    if (dumpState === DUMP_STATE.LOWERING) {
      springApi.start({ baseAngle: 0, config: { mass: 1.8, tension: 140, friction: 28 } });
    }
    if (dumpState === DUMP_STATE.CORRECTION) {
      springApi.start({ baseAngle: angleSnapshot, config: { mass: 2.2, tension: 118, friction: 30 } });
    }
  }, [baseAngle, dumpState, springApi]);

  const gussetPositions = useMemo(
    () => [
      [0.7, 0.28, 4.18],
      [1.3, 0.28, 4.18],
      [0.7, 0.28, -4.18],
      [1.3, 0.28, -4.18],
      [6.7, 0.28, 4.18],
      [7.3, 0.28, 4.18],
      [6.7, 0.28, -4.18],
      [7.3, 0.28, -4.18]
    ],
    []
  );

  useFrame((_, delta) => {
    stateElapsedRef.current += delta;

    const springAngle = baseAngle.get();
    let correctionOverlay = 0;
    if (dumpState === DUMP_STATE.CORRECTION) {
      correctionElapsedRef.current += delta;
      const t = Math.min(correctionElapsedRef.current, 8);
      const amp = 1.5 * Math.exp(-0.15 * t);
      correctionOverlay = amp * Math.sin(2 * Math.PI * 25 * t);
    }

    const currentAngle = MathUtils.clamp(springAngle + correctionOverlay, 0, 54);
    const hydraulicExtension = MathUtils.clamp(currentAngle / 52, 0, 1);
    const tailgateOpen =
      dumpState === DUMP_STATE.DUMPING
        ? MathUtils.clamp((stateElapsedRef.current - 0.5) / 0.5, 0, 1)
        : currentAngle > 12
          ? 1
          : MathUtils.clamp(currentAngle / 12, 0, 1);

    if (!bedRef.current) return;
    bedRef.current.rotation.z = MathUtils.degToRad(currentAngle);
    if (tailgateRef.current) {
      tailgateRef.current.rotation.z = MathUtils.degToRad(-48 * tailgateOpen);
    }

    const cylinderAngle = MathUtils.degToRad(20 + hydraulicExtension * 38);
    const cylinderRodLength = 2 + hydraulicExtension * 2.6;
    for (let i = 0; i < hydraulicGroupRefs.current.length; i += 1) {
      const group = hydraulicGroupRefs.current[i];
      if (group) group.rotation.z = cylinderAngle;

      const rod = hydraulicRodRefs.current[i];
      if (rod) {
        rod.scale.y = cylinderRodLength / 2.6;
        rod.position.y = 3.4 + cylinderRodLength / 2;
      }
    }

    labelTimerRef.current += delta;
    if (labelTimerRef.current > 0.08) {
      labelTimerRef.current = 0;
      setDisplayAngle(currentAngle);
      setDisplayExtension(hydraulicExtension);
    }

    setBedKinematics({ bedAngle: currentAngle, hydraulicExtension });
  });

  return (
    <group>
      <group ref={bedRef} position={[-7.5, 4, 0]}>
        <mesh castShadow receiveShadow position={[4, 0, 0]}>
          <boxGeometry args={[8, 0.4, 9]} />
          <meshStandardMaterial {...TRUCK_STEEL} />
        </mesh>

        <mesh castShadow receiveShadow position={[4, 1.25, 4.35]}>
          <boxGeometry args={[8, 2.5, 0.3]} />
          <meshStandardMaterial {...TRUCK_STEEL} />
        </mesh>
        <mesh castShadow receiveShadow position={[4, 1.25, -4.35]}>
          <boxGeometry args={[8, 2.5, 0.3]} />
          <meshStandardMaterial {...TRUCK_STEEL} />
        </mesh>
        <mesh castShadow receiveShadow position={[8, 1.75, 0]}>
          <boxGeometry args={[0.4, 3.5, 9]} />
          <meshStandardMaterial {...TRUCK_STEEL} />
        </mesh>

        <group ref={tailgateRef} position={[-0.2, 2.5, 0]}>
          <mesh castShadow receiveShadow position={[0, -1.25, 0]}>
            <boxGeometry args={[0.4, 2.5, 9]} />
            <meshStandardMaterial {...TRUCK_STEEL} />
          </mesh>
        </group>

        {Array.from({ length: 6 }, (_, index) => (
          <mesh
            key={`wear-strip-${index}`}
            castShadow
            receiveShadow
            position={[4, 0.23, -3.2 + index * 1.28]}
          >
            <boxGeometry args={[8, 0.05, 0.8]} />
            <meshStandardMaterial {...WEAR_STEEL} />
          </mesh>
        ))}

        {gussetPositions.map((position, index) => (
          <mesh
            key={`gusset-${index}`}
            castShadow
            receiveShadow
            position={position}
            rotation={[0, index % 2 === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          >
            <coneGeometry args={[0.22, 0.35, 3]} />
            <meshStandardMaterial {...WEAR_STEEL} />
          </mesh>
        ))}

        <group>
          <ResidueOverlay />
        </group>
      </group>

      {[
        [-3.8, 4.2, 2],
        [-3.8, 4.2, -2]
      ].map((position, index) => (
        <group
          key={`hydraulic-${index}`}
          position={position}
          ref={(el) => {
            hydraulicGroupRefs.current[index] = el;
          }}
        >
          <mesh castShadow receiveShadow position={[0, 1.7, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 3.4, 12]} />
            <meshStandardMaterial {...HYDRAULIC_SHELL} />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[0, 4.7, 0]}
            ref={(el) => {
              hydraulicRodRefs.current[index] = el;
            }}
          >
            <cylinderGeometry args={[0.18, 0.18, 2.6, 12]} />
            <meshStandardMaterial {...HYDRAULIC_ROD} />
          </mesh>
        </group>
      ))}

      <Html position={[-2.2, 9.4, 0]} center distanceFactor={11}>
        <div className="rounded border border-[var(--blue)]/50 bg-black/65 px-3 py-1 text-xs text-[var(--blue)]">
          Bed Angle: {displayAngle.toFixed(1)}° | Hydraulics: {(displayExtension * 100).toFixed(0)}%
        </div>
      </Html>
    </group>
  );
}
