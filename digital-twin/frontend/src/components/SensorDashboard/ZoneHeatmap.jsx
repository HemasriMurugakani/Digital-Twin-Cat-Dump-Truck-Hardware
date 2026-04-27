const zones = ['FL', 'FC', 'FR', 'RL', 'RC', 'RR'];

function zoneColor(value) {
  if (value > 0.72) return 'rgba(239,68,68,0.85)';
  if (value > 0.5) return 'rgba(245,158,11,0.85)';
  if (value > 0.3) return 'rgba(59,130,246,0.75)';
  return 'rgba(34,197,94,0.65)';
}

export default function ZoneHeatmap({ zoneValues }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <p className="heading text-sm text-[var(--yellow)]">Bed Residue Zone Map</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {zones.map((z) => {
          const value = zoneValues[z] ?? 0;
          return (
            <div
              key={z}
              className="rounded-md border border-[var(--border)] p-2 text-center"
              style={{ backgroundColor: zoneColor(value) }}
            >
              <p className="heading text-xs text-black/80">{z}</p>
              <p className="data text-sm text-black/85">{(value * 100).toFixed(1)}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
