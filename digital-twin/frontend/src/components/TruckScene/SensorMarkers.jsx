import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Color, MathUtils } from 'three';
import { useSimulationStore } from '../../store/simulationStore';

const cameraPulseColor = new Color('#22C55E');
const cameraAlertColor = new Color('#EF4444');
const soundWaveColor = new Color('#3B82F6');
const ultrasonicColor = new Color('#F59E0B');
const loadLowColor = new Color('#22C55E');
const loadMidColor = new Color('#F5A800');
const loadHighColor = new Color('#EF4444');

// Per-truck sensor position configs
const SENSOR_POSITIONS = {
  cat793f: {
    camera: [2.7, 4.15, 0],
    cameraStatus: [2.7, 4.9, 0],
    acoustic: [-1.55, 3.45, 1.95],
    ultrasonic: [[1.4, 3.25, 0]],
    loadCells: [[1.9, 0.72, 1.85], [1.9, 0.72, -1.85], [-1.9, 0.72, 1.85], [-1.9, 0.72, -1.85]],
    loadLabel: [-1.9, 0.22, 0],
    scanLines: [1.25, 0.18, 0],
  },
  cat797b: {
    camera: [2.9, 4.35, 0],
    cameraStatus: [2.9, 5.1, 0],
    acoustic: [-1.7, 3.7, 2.05],
    ultrasonic: [[1.55, 3.45, 0]],
    loadCells: [[2.1, 0.8, 2.0], [2.1, 0.8, -2.0], [-2.1, 0.8, 2.0], [-2.1, 0.8, -2.0]],
    loadLabel: [-2.05, 0.25, 0],
    scanLines: [1.35, 0.2, 0],
  },
  cat789c: {
    camera: [1.8, 3.8, 0],
    cameraStatus: [1.8, 4.5, 0],
    acoustic: [-1.5, 3.2, 1.8],
    ultrasonic: [[0.5, 3.2, 0]],
    loadCells: [[1.5, 0.6, 1.5], [1.5, 0.6, -1.5], [-2.0, 0.6, 1.5], [-2.0, 0.6, -1.5]],
    loadLabel: [-2.0, 0.2, 0],
    scanLines: [0.5, 0.15, 0],
  },
};

function loadColorForValue(value) {
  if (value > 0.72) return loadHighColor.clone();
  if (value > 0.42) return loadMidColor.clone();
  return loadLowColor.clone();
}

function getCellDistance(bedAngle, baseDistance, offset) {
  return Math.max(24, baseDistance - bedAngle * 1.05 + offset);
}

const SENSOR_MARKER_CSS_ID = 'scbes-sensor-markers-css';
const SENSOR_MARKER_CSS = `
.sensor-label {
  background: rgba(8, 8, 9, 0.92);
  border: 1px solid #F5A800;
  border-radius: 6px;
  padding: 6px 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #F0F0F0;
  min-width: 120px;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 0 12px rgba(245, 168, 0, 0.2);
}
.sensor-name { display: block; color: #6B7280; font-size: 10px; }
.sensor-value { display: block; color: #F5A800; font-size: 14px; font-weight: bold; }
.sensor-status { display: block; color: #9CA3AF; font-size: 10px; margin-top: 2px; }
.sensor-bar { display: block; height: 3px; background: #F5A800; margin-top: 4px; border-radius: 2px; transition: width 0.3s; }
.load-label { min-width: 160px; }
.load-bars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 6px; }
.load-bar { height: 6px; border-radius: 999px; background: rgba(255,255,255,0.1); overflow: hidden; }
.load-bar > span { display: block; height: 100%; border-radius: inherit; background: #F5A800; box-shadow: 0 0 8px rgba(245, 168, 0, 0.45); }
`;

function CameraSensor({ visionScore, cameraDetected, isScanning, position = [7, 7.5, 0] }) {
  const ringRef = useRef(null);
  const coneRef = useRef(null);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;
    const ring = ringRef.current;
    const cone = coneRef.current;
    if (ring) {
      const pulse = 1 + (Math.sin(elapsed * 4) + 1) * 0.25;
      ring.scale.setScalar(pulse);
      ring.material.opacity = 0.55 + Math.max(0, Math.sin(elapsed * 6)) * 0.22;
      ring.material.color.copy(cameraDetected ? cameraAlertColor : cameraPulseColor);
    }
    if (cone) {
      cone.visible = isScanning;
      cone.material.opacity = isScanning ? 0.04 : 0;
      cone.rotation.z = isScanning ? Math.sin(elapsed * Math.PI * 2) * (Math.PI / 9) : 0;
      cone.scale.setScalar(isScanning ? 1 + Math.sin(elapsed * 5) * 0.06 : 1);
    }
  });

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.3, 0.5]} />
        <meshStandardMaterial color="#111111" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.23, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#2A2A2A" roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.31, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <sphereGeometry args={[0.12, 16, 16, 0, Math.PI * 2, 0, Math.PI]} />
        <meshStandardMaterial color="#4A7FA5" transparent opacity={0.72} roughness={0} metalness={0.15} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.22, 0.08]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial emissive={cameraDetected ? '#EF4444' : '#22C55E'} emissiveIntensity={1.8} color="#111111" />
      </mesh>
      <mesh ref={ringRef} position={[0.35, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.03, 8, 32]} />
        <meshBasicMaterial color={cameraDetected ? '#EF4444' : '#22C55E'} transparent opacity={0.65} depthWrite={false} />
      </mesh>
      <mesh ref={coneRef} position={[0.8, -0.05, 0]} rotation={[0, -Math.PI / 2, 0]} visible={isScanning}>
        <coneGeometry args={[2.5, 4, 32, 1, true]} />
        <meshBasicMaterial color="#00FF88" transparent opacity={0.06} side={2} depthWrite={false} />
      </mesh>
      <Html distanceFactor={8} position={[0, 0.5, 0]} center>
        <div className="sensor-label">
          <span className="sensor-name">📷 IP67 CAMERA</span>
          <span className="sensor-value">{visionScore.toFixed(2)}</span>
          <span className="sensor-bar" style={{ width: `${Math.round(visionScore * 100)}%` }} />
        </div>
      </Html>
    </group>
  );
}

function CameraScanLines({ active }) {
  const lineRefs = [useRef(null), useRef(null), useRef(null)];

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;
    lineRefs.forEach((ref, index) => {
      const line = ref.current;
      if (!line) return;
      line.visible = active;
      const sweep = Math.sin(elapsed * 1.1 + index * 0.8) * 2.4;
      line.position.x = 2.1 + sweep;
      line.material.opacity = active ? 0.12 + Math.max(0, Math.sin(elapsed * 4 + index)) * 0.1 : 0;
    });
  });

  return (
    <group position={[2.2, 0.28, 0]}>
      {[0, 1, 2].map((index) => (
        <line key={`scan-line-${index}`} ref={lineRefs[index]} visible={active} position={[0, 0.02 + index * 0.08, 0]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([-4.2, 0, -2.8 + index * 2.8, 4.2, 0, -2.8 + index * 2.8]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#22C55E" transparent opacity={0.1} depthTest={false} />
        </line>
      ))}
    </group>
  );
}

function AcousticSensor({ acousticDeviation, materialType, isDumping, isScanning, position = [-2, 5.5, 4.8] }) {
  const waveRefs = [useRef(null), useRef(null), useRef(null)];

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;
    waveRefs.forEach((ref, index) => {
      const mesh = ref.current;
      if (!mesh) return;
      const wavePhase = (elapsed + index * 0.5) % 1.5;
      const waveScale = 1 + wavePhase * 0.9;
      mesh.visible = isDumping || isScanning;
      mesh.scale.setScalar(waveScale);
      mesh.material.opacity = mesh.visible ? Math.max(0, 0.7 - wavePhase * 0.7) : 0;
    });
  });

  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.15, 32]} />
        <meshStandardMaterial color="#3A3A3A" roughness={0.45} metalness={0.75} />
      </mesh>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh key={`grille-${index}`} castShadow receiveShadow position={[0, -0.08 + index * 0.04, 0]}>
          <boxGeometry args={[0.4, 0.04, 0.02]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.85} metalness={0.2} />
        </mesh>
      ))}
      {[0, 1, 2].map((index) => (
        <mesh
          key={`acoustic-wave-${index}`}
          ref={waveRefs[index]}
          visible={isDumping || isScanning}
          position={[0.28, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <torusGeometry args={[0.4 + index * 0.3, 0.02, 4, 32]} />
          <meshBasicMaterial color={soundWaveColor} transparent opacity={0.45} depthWrite={false} />
        </mesh>
      ))}
      <Html distanceFactor={8} position={[0, 0.4, 0]} center>
        <div className="sensor-label">
          <span className="sensor-name">🎤 ACOUSTIC</span>
          <span className="sensor-value">{acousticDeviation}Hz</span>
          <span className="sensor-status">{materialType}</span>
        </div>
      </Html>
    </group>
  );
}

function UltrasonicSensor({ position, distanceCm, isScanning, index }) {
  const beamRef = useRef(null);
  const ringRefs = [useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    const line = beamRef.current;
    if (!line) return;
    line.computeLineDistances?.();
  }, [distanceCm]);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;
    ringRefs.forEach((ref, ringIndex) => {
      const ring = ref.current;
      if (!ring) return;
      const stagger = ringIndex * 0.3;
      const localTime = (elapsed + stagger) % 0.9;
      const ringScale = 0.8 + localTime * 2.2;
      ring.visible = isScanning;
      ring.scale.setScalar(ringScale);
      ring.material.opacity = isScanning ? Math.max(0, 0.7 - localTime * 0.9) : 0;
    });
  });

  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
        <meshStandardMaterial color="#CCCCCC" roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.25, 0, 0]} rotation={[0, -Math.PI / 2, 0]} visible={isScanning}>
        <coneGeometry args={[1.5, 2.5, 16, 1, true]} />
        <meshBasicMaterial color="#F59E0B" transparent opacity={0.06} side={2} depthWrite={false} />
      </mesh>
      {[0, 1, 2].map((ringIndex) => (
        <mesh key={`us-ring-${index}-${ringIndex}`} ref={ringRefs[ringIndex]} position={[0.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]} visible={isScanning}>
          <torusGeometry args={[0.2 + ringIndex * 0.16, 0.02, 6, 24]} />
          <meshBasicMaterial color="#F59E0B" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      ))}
      <line ref={beamRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, 0, -distanceCm / 70]), 3]}
          />
        </bufferGeometry>
        <lineDashedMaterial color={ultrasonicColor} dashSize={0.12} gapSize={0.08} />
      </line>
      <Html distanceFactor={8} position={[0, 0.3, 0]} center>
        <div className="sensor-label" style={{ minWidth: 84 }}>
          <span className="sensor-name">ULTRASONIC</span>
          <span className="sensor-value">{distanceCm.toFixed(0)}cm</span>
        </div>
      </Html>
    </group>
  );
}

function LoadCell({ position, value }) {
  const ringRef = useRef(null);
  const compressionRef = useRef(null);

  useFrame(() => {
    const ring = ringRef.current;
    const compression = compressionRef.current;
    if (ring) {
      ring.material.color.copy(loadColorForValue(value));
      ring.scale.setScalar(0.95 + value * 0.28);
    }
    if (compression) {
      compression.position.y = -0.22 + value * 0.18;
      compression.scale.set(0.72, 0.4 + value * 0.5, 0.72);
    }
  });

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.4, 0.8, 16]} />
        <meshStandardMaterial color="#C7CBD2" roughness={0.18} metalness={0.95} />
      </mesh>
      <mesh ref={compressionRef} castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.4, 16]} />
        <meshStandardMaterial color="#8E97A7" roughness={0.3} metalness={0.65} />
      </mesh>
      <mesh ref={ringRef} castShadow receiveShadow position={[0, 0.55, 0]}>
        <torusGeometry args={[0.25, 0.04, 8, 32]} />
        <meshStandardMaterial color={loadColorForValue(value)} roughness={0.35} metalness={0.85} />
      </mesh>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0.5, 0, 0, 1.8, 0]), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#F5A800" transparent opacity={0.5} />
      </line>
    </group>
  );
}

export default function SensorMarkers({ degradedMode = false }) {
  const sensors = useSimulationStore((s) => s.sensors);
  const fusion = useSimulationStore((s) => s.fusion);
  const phase = useSimulationStore((s) => s.dumpState ?? s.state.phase);
  const dumpCycle = useSimulationStore((s) => s.dumpCycle);
  const bedAngle = useSimulationStore((s) => s.bedAngle ?? s.state.bed_angle_deg ?? 0);
  const hydraulicExtension = useSimulationStore((s) => s.hydraulicExtension ?? 0);
  const scenario = useSimulationStore((s) => s.scenario);
  const materialProfile = useSimulationStore((s) => s.materialProfile);
  const selectedTruck = useSimulationStore((s) => s.selectedTruck ?? 'cat793f');
  const sp = SENSOR_POSITIONS[selectedTruck] ?? SENSOR_POSITIONS.cat793f;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(SENSOR_MARKER_CSS_ID)) return;
    const el = document.createElement('style');
    el.id = SENSOR_MARKER_CSS_ID;
    el.innerHTML = SENSOR_MARKER_CSS;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, []);

  const visionScore = MathUtils.clamp(1 - fusion.residue_risk * 0.85 + fusion.confidence * 0.12, 0, 1);
  const acousticDeviation = Math.max(0, Math.abs(sensors.acoustic_db - 62)).toFixed(1);
  const materialType =
    materialProfile === 'wet_clay'
      ? 'WET CLAY'
      : materialProfile === 'fine_ore'
        ? 'FINE ORE'
        : materialProfile === 'dry_rock'
          ? 'DRY ROCK'
          : 'MIXED LOAD';
  const materialBias =
    materialProfile === 'wet_clay' ? 0.18 : materialProfile === 'dry_rock' ? -0.12 : materialProfile === 'fine_ore' ? 0.04 : 0.08;
  const scenarioBias =
    scenario === 'full_residue' ? 0.2 : scenario === 'partial_residue' ? 0.08 : scenario === 'empty_truck' ? -0.1 : 0.0;
  const ultrasonicValue = Math.max(
    24,
    180 - bedAngle * 1.4 - hydraulicExtension * 18 - fusion.residue_risk * 32 + scenarioBias * 16
  );
  const loadTonnes = Math.max(
    0,
    10.8 + fusion.residue_risk * 9.2 + sensors.vibration_g * 2.2 + hydraulicExtension * 3.1 + materialBias * 6
  );
  const loadValues = useMemo(
    () => [
      MathUtils.clamp(0.22 + fusion.residue_risk * 0.55 + hydraulicExtension * 0.24 + scenarioBias * 0.2, 0, 1),
      MathUtils.clamp(0.18 + sensors.vibration_g * 0.42 + hydraulicExtension * 0.16 + materialBias * 0.18, 0, 1),
      MathUtils.clamp(0.2 + (1 - fusion.confidence) * 0.5 + hydraulicExtension * 0.2 + scenarioBias * 0.15, 0, 1),
      MathUtils.clamp(0.16 + fusion.residue_risk * 0.45 + sensors.acoustic_db / 180 + materialBias * 0.12, 0, 1)
    ],
    [fusion.confidence, fusion.residue_risk, hydraulicExtension, materialBias, scenarioBias, sensors.acoustic_db, sensors.vibration_g]
  );

  const isScanning = dumpCycle?.scanActive || phase === 'DUMPING' || phase === 'DETECTING' || phase === 'CARRY_BACK_DETECTED';
  const isDumping = phase === 'DUMPING' || phase === 'DETECTING' || phase === 'CARRY_BACK_DETECTED' || phase === 'CORRECTING';
  const cameraDetected = dumpCycle?.warningLights || fusion.residue_risk > 0.45;

  return (
    <group>
            {!degradedMode && (
              <>
      <CameraSensor visionScore={visionScore} cameraDetected={cameraDetected} isScanning={isScanning} position={sp.camera} />
      <CameraScanLines active={isScanning} />
              </>
            )}
      <AcousticSensor
        acousticDeviation={acousticDeviation}
        materialType={materialType}
        isDumping={isDumping}
        isScanning={isScanning}
        position={sp.acoustic}
      />

      {sp.ultrasonic.map((position, index) => {
        const distanceCm = getCellDistance(bedAngle, ultrasonicValue, index * 3.5);
        return <UltrasonicSensor key={`ultrasonic-${index}`} position={position} distanceCm={distanceCm} isScanning={isScanning} index={index} />;
      })}

      {sp.loadCells.map((position, index) => (
        <LoadCell
          key={`load-cell-${index}`}
          position={position}
          value={loadValues[index]}
          index={index}
        />
      ))}

      <Html distanceFactor={8} position={sp.loadLabel} center>
        <div className="sensor-label load-label">
          <span className="sensor-name">⚖ LOAD CELLS</span>
          <span className="sensor-value">{loadTonnes.toFixed(1)}t detected</span>
          <div className="load-bars">
            {loadValues.map((value, index) => (
              <div className="load-bar" key={`load-bar-${index}`}>
                <span style={{ width: `${Math.round(value * 100)}%`, background: loadColorForValue(value).getStyle() }} />
              </div>
            ))}
          </div>
        </div>
      </Html>

      <Html occlude distanceFactor={8} position={sp.cameraStatus} center>
        <div className="sensor-label">
          <span className="sensor-name">CAMERA STATUS</span>
          <span className="sensor-value">{cameraDetected ? 'RESIDUE DETECTED' : 'CLEAR'}</span>
          <span className="sensor-status">{phase}</span>
        </div>
      </Html>
    </group>
  );
}
