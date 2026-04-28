import { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useSimulationStore } from '../../store/simulationStore';

const zonePositions = {
  FL: [6.5, 0.21, 2.5],
  FC: [6.5, 0.21, 0],
  FR: [6.5, 0.21, -2.5],
  RL: [1.5, 0.21, 2.5],
  RC: [1.5, 0.21, 0],
  RR: [1.5, 0.21, -2.5]
};

function getZoneTone(zone) {
  if (zone.confidence >= 0.82) {
    return { color: '#EF4444', opacity: 0.75, critical: true };
  }
  if (zone.confidence >= 0.55) {
    return { color: '#EF4444', opacity: 0.5, critical: false };
  }
  if (zone.confidence >= 0.3) {
    return { color: '#F59E0B', opacity: 0.25, critical: false };
  }
  if (zone.confidence > 0) {
    return { color: '#22C55E', opacity: 0.12, critical: false };
  }
  return { color: '#22C55E', opacity: 0.0, critical: false };
}

export default function ResidueOverlay() {
  const zones = useSimulationStore((s) => s.zoneDetails);
  const showZones = useSimulationStore((s) => s.showZones);
  const [pulseTime, setPulseTime] = useState(0);

  const entries = useMemo(() => Object.entries(zonePositions), []);
  const residueDetected = entries.some(([zone]) => zones?.[zone]?.residue);

  useFrame(({ clock }) => {
    setPulseTime(clock.elapsedTime);
  });

  return (
    <group>
      {entries.map(([zone, pos]) => {
        const zoneData = zones?.[zone] ?? { residue: false, tonnes: 0, confidence: 0 };
        const tone = getZoneTone(zoneData);
        const visible = zoneData.residue || showZones;
        const pulseOpacity = tone.critical ? Math.max(0, tone.opacity + Math.sin(pulseTime * 4) * 0.08) : tone.opacity;
        const planeOpacity = zoneData.residue ? pulseOpacity : showZones ? 0.08 : 0;
        return (
          <group key={zone} position={pos}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
              <planeGeometry args={[2.5, 4]} />
              <meshBasicMaterial
                color={tone.color}
                transparent
                opacity={planeOpacity}
                depthWrite={false}
                depthTest={false}
              />
            </mesh>

            {(visible || showZones) && (
              <lineLoop rotation={[-Math.PI / 2, 0, 0]} renderOrder={11}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        -1.25, -2, 0,
                        1.25, -2, 0,
                        1.25, 2, 0,
                        -1.25, 2, 0
                      ]),
                      3
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial color={tone.color} transparent opacity={zoneData.residue ? 0.85 : 0.35} depthTest={false} />
              </lineLoop>
            )}

            {zoneData.residue && (
              <Html center position={[0, 0.32, 0]} distanceFactor={11}>
                <div className="rounded border border-white/20 bg-black/70 px-2 py-1 text-center text-[10px] leading-tight text-white shadow-[0_0_14px_rgba(239,68,68,0.25)]">
                  <div className="font-semibold tracking-[0.18em] text-[10px] text-[#F5A800]">{zone}</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-[#EF4444]">{zoneData.tonnes.toFixed(1)} t</div>
                  <div className="text-[10px] text-white/70">{Math.round(zoneData.confidence * 100)}% conf</div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
      {residueDetected && (
        <Html center position={[4.0, 0.9, 0]} distanceFactor={12}>
          <div className="rounded border border-[#EF4444]/50 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#EF4444]">
            Residue Detected
          </div>
        </Html>
      )}
    </group>
  );
}
