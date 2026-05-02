import { useSimulationStore } from '../../store/simulationStore';

export default function DumpCycleTimer() {
  const state = useSimulationStore((s) => s.state);
  const dumpCycle = useSimulationStore((s) => s.dumpCycle);
  const stage = dumpCycle?.active ? dumpCycle.stage : state.phase;
  const steps = ['LOAD', 'HAUL', 'DUMPING', 'DETECTING', 'CARRY_BACK_DETECTED', 'CORRECTING', 'VERIFYING', 'CLEAR', 'RETURN'];
  const activeIndex = dumpCycle?.active ? steps.indexOf(stage) : Math.max(0, Math.min(steps.length - 1, Math.round(state.cycle_progress * 6)));

  return (
    <div className="flex h-full flex-col justify-between gap-2 rounded-[12px] sm:rounded-[18px] border border-[#1F1F26] bg-[#0f0f12] px-2 sm:px-3 md:px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="heading text-[9px] sm:text-[10px] tracking-[0.34em] text-[var(--yellow)]">Cycle Timeline</p>
          <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Bottom-of-scene dump sequence</p>
        </div>
        <div className="text-right">
          <p className="data text-xs sm:text-sm text-[var(--text-primary)]">{(state.cycle_progress * 100).toFixed(0)}%</p>
          <p className="text-[8px] sm:text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">{stage}</p>
        </div>
      </div>

      <div className="h-1.5 sm:h-2 rounded-full bg-black/35">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#F5A800,#3B82F6,#22C55E)] transition-all duration-500"
          style={{ width: `${Math.max(2, state.cycle_progress * 100)}%` }}
        />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-[0.16em]">
        {steps.map((step, index) => {
          const active = index <= activeIndex;
          const current = step === stage;
          return (
            <div
              key={step}
              className={`flex-shrink-0 rounded-md border px-1.5 sm:px-2 py-1 text-center transition whitespace-nowrap ${
                current
                  ? 'border-[var(--yellow)] bg-[rgba(245,168,0,0.14)] text-[var(--yellow)]'
                  : active
                    ? 'border-[#27415f] bg-[rgba(59,130,246,0.08)] text-[var(--text-primary)]'
                    : 'border-[#2A2A31] text-[var(--text-muted)]'
              }`}
            >
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
}
