import { motion } from 'framer-motion';

export default function FusionMeter({ confidence, residueRisk, action }) {
  const bar = Math.max(0, Math.min(100, residueRisk * 100));
  const confPercent = (confidence * 100).toFixed(1);

  const actionColor =
    action === 'VIBRATE' || action === 'TRIGGER_VIBRATION'
      ? '#EF4444'
      : action === 'MONITOR'
        ? '#F59E0B'
        : '#22C55E';

  return (
    <div>
      <p className="heading text-sm text-[var(--yellow)] mb-3">Fusion Confidence</p>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="data text-3xl text-[var(--text-primary)]">{confPercent}</span>
        <span className="data text-sm text-[var(--text-muted)]">%</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: actionColor, boxShadow: `0 0 8px ${actionColor}60` }}
          />
          <span className="data text-[11px]" style={{ color: actionColor }}>{action}</span>
        </div>
      </div>

      <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span className="heading tracking-wider">Residue Risk</span>
        <span className="data text-xs text-[var(--text-primary)]">{bar.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-[#0a0f18] border border-[#1a2a3e] overflow-hidden">
        <motion.div
          animate={{ width: `${bar}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #22C55E 0%, #F59E0B 50%, #EF4444 100%)',
            boxShadow: bar > 60 ? '0 0 12px rgba(239,68,68,0.4)' : 'none',
          }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] text-[var(--text-muted)] opacity-50">
        <span>Safe</span>
        <span>Critical</span>
      </div>
    </div>
  );
}
