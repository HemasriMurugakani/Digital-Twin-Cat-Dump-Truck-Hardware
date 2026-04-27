import { useSimulationStore } from '../store/simulationStore';

export default function LatencyBadge() {
  const latency = useSimulationStore((s) => s.latencyMs);
  const connected = useSimulationStore((s) => s.connected);

  const color = !connected
    ? 'var(--text-muted)'
    : latency < 50
      ? 'var(--green)'
      : latency < 110
        ? 'var(--amber)'
        : 'var(--red)';

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
      <p className="heading text-xs text-[var(--text-muted)]">Backend Link</p>
      <p className="data text-lg" style={{ color }}>
        {connected ? `${latency.toFixed(1)} ms` : 'Disconnected'}
      </p>
    </div>
  );
}
