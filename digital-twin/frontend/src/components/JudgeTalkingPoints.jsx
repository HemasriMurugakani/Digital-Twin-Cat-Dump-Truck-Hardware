import { motion } from 'framer-motion';

const TALKING_POINTS = {
  1: [
    '🟢 Clean scenario: acoustic baseline 847Hz',
    '📊 Load delta: 0kg (empty truck)',
    '📈 Confidence reading: 0.08 (minimal risk)',
    '✅ System validation: false positive rejection'
  ],
  2: [
    '🚨 Carry-back detected: 4-sensor consensus 87%',
    '📻 Acoustic frequency shift: 847Hz → 791Hz',
    '⚡ Response time: <100ms detection to correction',
    '💰 Hardware ROI: $1,815 equipment cost | 27-day payback'
  ],
  3: [
    '⚠️ Degraded mode: camera offline scenario',
    '📊 3-sensor fusion maintains 82% confidence',
    '🛡️ Resilient design: acoustic + load + ultrasonic',
    '🎯 Mission-critical redundancy validated'
  ]
};

export default function JudgeTalkingPoints({ activeScenario }) {
  const points = TALKING_POINTS[activeScenario] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col gap-3 overflow-hidden rounded-[18px] border border-[#1F1F26] bg-[#0a0a0d] p-4"
    >
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-[var(--yellow)]" />
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Judge Talking Points
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {points.map((point, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-lg border border-[#1F1F26] bg-[rgba(245,168,0,0.04)] p-2.5 text-xs leading-relaxed text-[#D1D1D6]"
          >
            {point}
          </motion.div>
        ))}
      </div>

      <div className="border-t border-[#1F1F26] pt-3 text-[10px] text-[#808085] italic">
        💡 Use these points to explain the scenario's value to the judges
      </div>
    </motion.div>
  );
}
