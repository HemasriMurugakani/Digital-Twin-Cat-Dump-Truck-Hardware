import { useSimulationStore } from '../store/simulationStore';

const options = [
  { key: 'cat793f', label: 'CAT 793F' },
  { key: 'cat797b', label: 'CAT 797F' },
  { key: 'cat789c', label: 'CAT 789C' }
];

export default function TruckSelector() {
  const selectedTruck = useSimulationStore((s) => s.selectedTruck);
  const setSelectedTruck = useSimulationStore((s) => s.setSelectedTruck);

  return (
    <div className="flex items-center gap-2 rounded-full border border-[#2a3a50] bg-[#0d1522] px-2 py-1">
      {options.map((option) => {
        const active = option.key === selectedTruck;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => setSelectedTruck(option.key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${active
                ? 'border-[#f59e0b] bg-[#f59e0b] text-black'
                : 'border-[#2a3a50] bg-[#1a2535] text-[#64748b] hover:border-[#3b4f69] hover:text-[#cbd5e1]'
              }`}
          >
            {option.label}
            {active ? ' ▾' : ''}
          </button>
        );
      })}
    </div>
  );
}
