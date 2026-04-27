export default function FusionMeter({ confidence, residueRisk, action }) {
  const bar = Math.max(0, Math.min(100, residueRisk * 100));

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <p className="heading text-sm text-[var(--yellow)]">Fusion Confidence</p>
      <p className="data mt-1 text-xl text-[var(--text-primary)]">{(confidence * 100).toFixed(1)}%</p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Residue Risk</span>
          <span className="data">{bar.toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full bg-black/30">
          <div
            className="h-2 rounded-full bg-[linear-gradient(90deg,#22C55E,#F59E0B,#EF4444)]"
            style={{ width: `${bar}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Action: <span className="data text-[var(--text-primary)]">{action}</span>
      </p>
    </div>
  );
}
