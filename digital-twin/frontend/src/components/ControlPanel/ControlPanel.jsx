import { useSimulationStore } from '../../store/simulationStore';
import ScenarioSelector from './ScenarioSelector';
import DumpCycleTimer from './DumpCycleTimer';

export default function ControlPanel() {
  const connected = useSimulationStore((s) => s.connected);

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
      </div>
    </div>
  );
}
