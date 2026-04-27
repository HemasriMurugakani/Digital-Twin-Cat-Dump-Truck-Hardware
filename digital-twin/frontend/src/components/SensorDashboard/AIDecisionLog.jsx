import { useSimulationStore } from '../../store/simulationStore';

export default function AIDecisionLog() {
  const decisionLog = useSimulationStore((s) => s.decisionLog);

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <p className="heading text-sm text-[var(--yellow)]">AI Decision Log</p>
      <div className="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1">
        {decisionLog.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">Waiting for backend events...</p>
        )}
        {decisionLog.map((entry) => (
          <div key={entry.id} className="rounded border border-[var(--border)] bg-black/20 p-2 text-xs">
            <p className="data text-[var(--blue)]">{entry.action}</p>
            <p className="mt-1 text-[var(--text-primary)]">{entry.rationale}</p>
            <p className="mt-1 data text-[var(--text-muted)]">Risk {Number(entry.risk).toFixed(3)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
