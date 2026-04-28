import { useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';

export default function LatencyBadge() {
  const latency = useSimulationStore((s) => s.latencyMs);
  const connected = useSimulationStore((s) => s.connected);
  const [hover, setHover] = useState(false);

  const color = !connected
    ? 'var(--text-muted)'
    : latency < 50
      ? 'var(--green)'
      : latency < 110
        ? 'var(--amber)'
        : 'var(--red)';

  // make a lightweight breakdown proportional to total latency
  const breakdown = (() => {
    const total = Math.max(1, latency || 1);
    const parts = {
      Camera: Math.round(total * 0.43),
      'CV inference': Math.round(total * 0.25),
      'Sensor fusion': Math.round(total * 0.06),
      Decision: Math.round(total * 0.03),
      'CAN bus': Math.round(total * 0.04),
      Actuator: Math.round(total * 0.19)
    };
    const sum = Object.values(parts).reduce((a, b) => a + b, 0);
    parts.TOTAL = sum;
    return parts;
  })();

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
        <p className="heading text-xs text-[var(--text-muted)]">Backend Link</p>
        <p className="data text-lg" style={{ color }}>
          {connected ? `${latency.toFixed(1)} ms` : 'Disconnected'}
        </p>
      </div>

      {hover && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-[#222] bg-[#0b0b0d] p-3 text-xs shadow-lg">
          <div className="font-semibold mb-2">Latency Breakdown</div>
          {Object.entries(breakdown).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <div className="text-[var(--text-muted)]">{k}</div>
              <div className="font-mono">{v} ms</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
