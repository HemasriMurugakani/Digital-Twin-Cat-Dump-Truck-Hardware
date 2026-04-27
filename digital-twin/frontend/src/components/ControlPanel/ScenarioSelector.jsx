import { useSimulationStore } from '../../store/simulationStore';

const scenarios = [
  { key: 'normal', label: 'Normal Load' },
  { key: 'wet_ore', label: 'Wet Ore' },
  { key: 'sticky_clay', label: 'Sticky Clay' },
  { key: 'cold_shift', label: 'Cold Shift' }
];

export default function ScenarioSelector() {
  const scenario = useSimulationStore((s) => s.scenario);
  const setScenario = useSimulationStore((s) => s.setScenario);

  return (
    <div>
      <p className="heading mb-2 text-sm text-[var(--yellow)]">Scenario Profile</p>
      <div className="grid grid-cols-2 gap-2">
        {scenarios.map((item) => {
          const active = scenario === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setScenario(item.key)}
              className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                active
                  ? 'border-[var(--yellow)] bg-[rgba(245,168,0,0.14)] text-[var(--text-primary)]'
                  : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--yellow-dim)]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
