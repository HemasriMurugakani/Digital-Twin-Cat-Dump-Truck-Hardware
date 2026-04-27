import { useSimulationStore } from '../../store/simulationStore';

export default function DumpCycleTimer() {
  const state = useSimulationStore((s) => s.state);

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="heading text-sm text-[var(--yellow)]">Dump Cycle</p>
        <p className="data text-sm text-[var(--text-primary)]">
          {(state.cycle_progress * 100).toFixed(0)}%
        </p>
      </div>

      <div className="h-2 rounded-full bg-black/35">
        <div
          className="h-2 rounded-full bg-[linear-gradient(90deg,#F5A800,#3B82F6)]"
          style={{ width: `${Math.max(2, state.cycle_progress * 100)}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-2">
          <p className="text-[var(--text-muted)]">Current Phase</p>
          <p className="heading text-sm text-[var(--text-primary)]">{state.phase}</p>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-2">
          <p className="text-[var(--text-muted)]">Bed Angle</p>
          <p className="data text-sm text-[var(--text-primary)]">{state.bed_angle_deg.toFixed(1)}°</p>
        </div>
      </div>
    </div>
  );
}
