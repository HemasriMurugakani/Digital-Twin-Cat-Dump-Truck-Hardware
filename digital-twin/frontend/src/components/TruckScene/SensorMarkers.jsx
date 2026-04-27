import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useSimulationStore } from '../../store/simulationStore';
import { evaluateSensorHealth } from '../../simulation/SensorEngine';

const markerPositions = {
  acoustic_db: [-2.3, 2.8, 1.1],
  vibration_g: [-0.2, 1.45, 0],
  thermal_c: [0.5, 2.6, -1.15],
  lidar_mm: [2.7, 2.2, 0.2]
};

function colorForStatus(status) {
  if (status === 'high') return '#ef4444';
  if (status === 'watch') return '#f59e0b';
  return '#22c55e';
}

export default function SensorMarkers() {
  const sensors = useSimulationStore((s) => s.sensors);
  const health = evaluateSensorHealth(sensors);
  const entries = useMemo(() => Object.entries(markerPositions), []);

  return (
    <group>
      {entries.map(([key, position]) => {
        const status = health[key]?.status ?? 'normal';
        return (
          <group key={key} position={position}>
            <mesh>
              <sphereGeometry args={[0.11, 16, 16]} />
              <meshStandardMaterial emissive={colorForStatus(status)} emissiveIntensity={1.3} color="#111111" />
            </mesh>
            <Html distanceFactor={10} position={[0, 0.25, 0]} center>
              <div className="rounded bg-black/60 px-1 py-[2px] text-[10px] text-white">
                {key.replace('_', ' ')}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
