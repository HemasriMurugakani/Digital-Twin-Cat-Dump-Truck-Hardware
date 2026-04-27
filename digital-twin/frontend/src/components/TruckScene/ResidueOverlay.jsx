import { useMemo } from 'react';
import { useSimulationStore } from '../../store/simulationStore';

const zonePositions = {
  FL: [-1.3, 0.64, -0.9],
  FC: [0.0, 0.64, -0.9],
  FR: [1.3, 0.64, -0.9],
  RL: [-1.3, 0.64, 0.9],
  RC: [0.0, 0.64, 0.9],
  RR: [1.3, 0.64, 0.9]
};

function zoneColor(v) {
  if (v > 0.72) return '#ef4444';
  if (v > 0.5) return '#f59e0b';
  if (v > 0.3) return '#3b82f6';
  return '#22c55e';
}

export default function ResidueOverlay() {
  const zones = useSimulationStore((s) => s.zones);

  const entries = useMemo(() => Object.entries(zonePositions), []);

  return (
    <group>
      {entries.map(([zone, pos]) => {
        const risk = zones[zone] ?? 0;
        return (
          <mesh key={zone} position={pos}>
            <boxGeometry args={[1.22, 0.05, 1.05]} />
            <meshStandardMaterial color={zoneColor(risk)} transparent opacity={0.2 + risk * 0.75} />
          </mesh>
        );
      })}
    </group>
  );
}
