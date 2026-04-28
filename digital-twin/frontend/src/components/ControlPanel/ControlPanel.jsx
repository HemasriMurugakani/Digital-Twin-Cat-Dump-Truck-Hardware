import { useSimulationStore } from '../../store/simulationStore';
import ScenarioSelector from './ScenarioSelector';
import DumpCycleTimer from './DumpCycleTimer';

export default function ControlPanel() {
  const connected = useSimulationStore((s) => s.connected);
  const showZones = useSimulationStore((s) => s.showZones);
  const toggleShowZones = useSimulationStore((s) => s.toggleShowZones);

  return (
    <div>
      <h2 className="heading text-lg text-[var(--yellow)]">Control Module</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Scenario tuning and operational cycle visibility for SCBES analysis.
      </p>

      <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2">
        <span className="heading text-xs text-[var(--text-muted)]">Telemetry Status</span>
        <p className="mt-1 data text-sm" style={{ color: connected ? 'var(--green)' : 'var(--red)' }}>
          {connected ? 'LIVE STREAM ONLINE' : 'CONNECTION WAITING'}
        </p>
      </div>

      <div className="mt-4">
        <ScenarioSelector />
        <DumpCycleTimer />

        <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          <p className="heading text-sm text-[var(--yellow)]">Zone Overlay</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Show zone outlines even when no residue is present.
          </p>
          <button
            type="button"
            onClick={toggleShowZones}
            className={`mt-3 w-full rounded-md border px-3 py-2 text-sm transition ${
              showZones
                ? 'border-[var(--yellow)] bg-[rgba(245,168,0,0.14)] text-[var(--text-primary)]'
                  : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--yellow-dim)]'
            }`}
          >
            {showZones ? 'Hide Zones' : 'Show Zones'}
          </button>
        </div>
      </div>
    </div>
  );
}
