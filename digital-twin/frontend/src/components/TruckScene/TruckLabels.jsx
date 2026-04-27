import { Html } from '@react-three/drei';

export default function TruckLabels() {
  return (
    <group>
      <Html position={[-2.1, 3.1, 0]} center distanceFactor={9}>
        <div className="rounded border border-[var(--yellow)]/40 bg-black/60 px-2 py-1 text-xs text-[var(--yellow)]">
          793F Cabin Sensor Hub
        </div>
      </Html>
      <Html position={[1.6, 3.35, 0]} center distanceFactor={9}>
        <div className="rounded border border-[var(--blue)]/40 bg-black/60 px-2 py-1 text-xs text-[var(--blue)]">
          SCBES Smart Dump Bed
        </div>
      </Html>
    </group>
  );
}
