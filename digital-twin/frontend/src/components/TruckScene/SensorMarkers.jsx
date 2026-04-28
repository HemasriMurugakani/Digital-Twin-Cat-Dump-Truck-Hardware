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

const ultrasonicPositions = [
  [2, 5.2, 4.9],
  [-3, 5.2, 4.9],
  [2, 5.2, -4.9],
  [-3, 5.2, -4.9]
];

const loadCellPositions = [
  [4.5, 1.5, 4.5],
  [4.5, 1.5, -4.5],
  [-4.5, 1.5, 4.5],
  [-4.5, 1.5, -4.5]
];

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

function CameraSensor({ visionScore, cameraDetected, isScanning }) {
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
    }
  });

  return (
    <group position={[7, 7.5, 0]}>
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
        <meshBasicMaterial color="#00FF88" transparent opacity={0.04} side={2} depthWrite={false} />
      </mesh>
      <Html occlude distanceFactor={10} position={[0, 0.65, 0]} center>
        <div className="sensor-label">
          <span className="sensor-name">📷 IP67 CAMERA</span>
          <span className="sensor-value">{visionScore.toFixed(2)}</span>
          <span className="sensor-bar" style={{ width: `${Math.round(visionScore * 100)}%` }} />
        </div>
      </Html>
    </group>
  );
}

function AcousticSensor({ acousticDeviation, materialType, isDumping, isScanning }) {
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
    <group position={[-2, 5.5, 4.8]} rotation={[0, Math.PI / 2, 0]}>
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
      <Html occlude distanceFactor={10} position={[0, 0.5, 0]} center>
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

  useEffect(() => {
    const line = beamRef.current;
    if (!line) return;
    line.computeLineDistances?.();
  }, [distanceCm]);

  return (
    <group position={position} rotation={[0, position[2] > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
        <meshStandardMaterial color="#CCCCCC" roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.25, 0, 0]} rotation={[0, -Math.PI / 2, 0]} visible={isScanning}>
        <coneGeometry args={[1.5, 2.5, 16, 1, true]} />
        <meshBasicMaterial color="#F59E0B" transparent opacity={0.06} side={2} depthWrite={false} />
      </mesh>
      <line ref={beamRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, 0, -distanceCm / 70]), 3]}
          />
        </bufferGeometry>
        <lineDashedMaterial color={ultrasonicColor} dashSize={0.12} gapSize={0.08} />
      </line>
      <Html occlude distanceFactor={10} position={[0.1, 0.35, -0.5]} center>
        <div className="sensor-label" style={{ minWidth: 84 }}>
          <span className="sensor-name">ULTRASONIC {index + 1}</span>
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

export default function SensorMarkers() {
  const sensors = useSimulationStore((s) => s.sensors);
  const fusion = useSimulationStore((s) => s.fusion);
  const phase = useSimulationStore((s) => s.state.phase);
  const bedAngle = useSimulationStore((s) => s.bedAngle ?? s.state.bed_angle_deg ?? 0);
  const hydraulicExtension = useSimulationStore((s) => s.hydraulicExtension ?? 0);
  const scenario = useSimulationStore((s) => s.scenario);

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
    scenario === 'sticky_clay'
      ? 'STICKY CLAY'
      : scenario === 'wet_ore'
        ? 'WET ORE'
        : scenario === 'cold_shift'
          ? 'COLD SHIFT ORE'
          : 'ORE MIX';
  const ultrasonicValue = Math.max(24, 180 - bedAngle * 1.4 - hydraulicExtension * 18 - fusion.residue_risk * 32);
  const loadTonnes = Math.max(0, 11.5 + fusion.residue_risk * 8.5 + sensors.vibration_g * 2.2 + hydraulicExtension * 3.1);
  const loadValues = useMemo(
    () => [
      MathUtils.clamp(0.22 + fusion.residue_risk * 0.55 + hydraulicExtension * 0.24, 0, 1),
      MathUtils.clamp(0.18 + sensors.vibration_g * 0.42 + hydraulicExtension * 0.16, 0, 1),
      MathUtils.clamp(0.2 + (1 - fusion.confidence) * 0.5 + hydraulicExtension * 0.2, 0, 1),
      MathUtils.clamp(0.16 + fusion.residue_risk * 0.45 + sensors.acoustic_db / 180, 0, 1)
    ],
    [fusion.confidence, fusion.residue_risk, hydraulicExtension, sensors.acoustic_db, sensors.vibration_g]
  );

  const isScanning = phase === 'DUMP_RAISE' || phase === 'DUMP_HOLD';
  const isDumping = phase === 'DUMP_RAISE' || phase === 'DUMP_HOLD' || phase === 'DUMP_LOWER';
  const cameraDetected = fusion.residue_risk > 0.45;

  return (
    <group>
      <CameraSensor visionScore={visionScore} cameraDetected={cameraDetected} isScanning={isScanning} />
      <AcousticSensor
        acousticDeviation={acousticDeviation}
        materialType={materialType}
        isDumping={isDumping}
        isScanning={isScanning}
      />

      {ultrasonicPositions.map((position, index) => {
        const distanceCm = getCellDistance(bedAngle, ultrasonicValue, index * 3.5);
        return <UltrasonicSensor key={`ultrasonic-${index}`} position={position} distanceCm={distanceCm} isScanning={isScanning} index={index} />;
      })}

      {loadCellPositions.map((position, index) => (
        <LoadCell
          key={`load-cell-${index}`}
          position={position}
          value={loadValues[index]}
          index={index}
        />
      ))}

      <Html occlude distanceFactor={12} position={[-4.5, 0.5, 0]} center>
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

      <Html occlude distanceFactor={10} position={[7, 8.25, 0]} center>
        <div className="sensor-label">
          <span className="sensor-name">CAMERA STATUS</span>
          <span className="sensor-value">{cameraDetected ? 'RESIDUE DETECTED' : 'CLEAR'}</span>
          <span className="sensor-status">{phase}</span>
        </div>
      </Html>
    </group>
  );
}
