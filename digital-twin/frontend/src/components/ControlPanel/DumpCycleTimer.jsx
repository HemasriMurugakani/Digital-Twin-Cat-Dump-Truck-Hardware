import { useSimulationStore } from '../../store/simulationStore';

export default function DumpCycleTimer() {
  const state = useSimulationStore((s) => s.state);
  const dumpCycle = useSimulationStore((s) => s.dumpCycle);
  const stage = dumpCycle?.active ? dumpCycle.stage : state.phase;
  const progress = state.cycle_progress;
  const steps = ['LOAD', 'HAUL', 'DUMPING', 'DETECTING', 'CARRY_BACK', 'CORRECTING', 'VERIFYING', 'CLEAR', 'RETURN'];
  const activeIndex = dumpCycle?.active ? steps.indexOf(stage) : Math.max(0, Math.min(steps.length - 1, Math.round(progress * 6)));

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="heading text-xs tracking-[0.3em] text-[var(--yellow)]">Cycle Timeline</p>
          <p className="text-[11px] text-[var(--text-muted)]">Bottom-of-scene dump sequence</p>
        </div>
        <div className="text-right">
          <p className="data text-base text-[var(--text-primary)]">{(progress * 100).toFixed(0)}%</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{stage}</p>
        </div>
      </div>

      {/* Overall thin progress bar */}
      <div className="h-1 rounded-full bg-[#15181f] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(1, progress * 100)}%`,
            background: 'linear-gradient(90deg, #F5A800, #3B82F6, #22C55E)',
          }}
        />
      </div>

      {/* Stage pills */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
        {steps.map((step, i) => {
          const isCompleted = i < activeIndex;
          const isActive = i === activeIndex;
          const isPending = i > activeIndex;

          return (
            <div
              key={step}
              className={`flex-shrink-0 flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] transition-all whitespace-nowrap ${
                isActive
                  ? 'stage-active border-[var(--yellow)] bg-[rgba(245,168,0,0.12)] text-[var(--yellow)]'
                  : isCompleted
                    ? 'border-[#1e3048] bg-[rgba(59,130,246,0.08)] text-[var(--text-primary)]'
                    : 'border-[var(--border-dim)] text-[var(--text-muted)] opacity-50'
              }`}
            >
              {isCompleted && <span className="text-[var(--green)] text-[7px]">✓</span>}
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
}
