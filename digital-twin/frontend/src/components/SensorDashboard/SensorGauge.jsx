import { motion } from 'framer-motion';

export default function SensorGauge({ label, value, unit, normalized }) {
  const percent = Math.max(0, Math.min(100, normalized * 100));
  const stroke =
    percent > 78 ? 'var(--red)' : percent > 54 ? 'var(--amber)' : 'var(--green)';

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="heading text-xs text-[var(--text-muted)]">{label}</p>
        <p className="data text-sm text-[var(--text-primary)]">
          {value.toFixed(2)} {unit}
        </p>
      </div>
      <div className="h-2 rounded-full bg-black/30">
        <motion.div
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 20 }}
          className="h-2 rounded-full"
          style={{ backgroundColor: stroke }}
        />
      </div>
    </div>
  );
}
