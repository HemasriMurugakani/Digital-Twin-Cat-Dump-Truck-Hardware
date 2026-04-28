import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '../store/simulationStore';
import { BellIcon } from './icons';

export default function AlertBanner() {
  const alert = useSimulationStore((s) => s.alert);
  const fusion = useSimulationStore((s) => s.fusion);
  const triggerVibration = useSimulationStore((s) => s.triggerVibration);
  const acknowledgeAlert = useSimulationStore((s) => s.acknowledgeAlert);
  const triggerCorrection = useSimulationStore((s) => s.triggerCorrection);

  if (!alert) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, boxShadow: '0 0 0 rgba(239,68,68,0.0)' }}
        animate={{ opacity: 1, y: 0, boxShadow: [
          '0 0 0 rgba(239,68,68,0.0)',
          '0 0 18px rgba(239,68,68,0.14)',
          '0 0 0 rgba(239,68,68,0.0)'
        ] }}
        exit={{ opacity: 0, y: -8 }}
        className="rounded-lg border-2 border-red-600/60 bg-gradient-to-r from-red-800/20 to-[#0b0b0d] px-4 py-3 flex items-start gap-4"
        transition={{
          default: { type: 'spring', stiffness: 160, damping: 16 },
          boxShadow: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }
        }}
      >
        <motion.div
          initial={{ x: 0, rotate: 0 }}
          animate={{ rotate: [0, 20, -18, 12, -8, 4, 0] }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
          className="mt-1"
        >
          <BellIcon className="w-6 h-6 text-red-400" />
        </motion.div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="heading text-sm text-red-300">⚠ CARRY-BACK DETECTED</p>
              <p className="mt-1 text-xs text-[var(--text-primary)]">Residual material found in FL, RL zones</p>
            </div>
            <div className="text-right text-xs text-[var(--text-muted)]">
              <div className="font-semibold">5.3 t</div>
              <div className="text-[var(--text-muted)]">94% confidence</div>
            </div>
          </div>

          <p className="mt-2 text-sm text-[var(--text-primary)]">{fusion.rationale}</p>

          <div className="mt-3 flex gap-3">
            <button
              onClick={() => {
                // request correction sequence via store
                triggerCorrection();
                acknowledgeAlert();
              }}
              className="px-3 py-1 rounded-md bg-amber-500 text-black font-semibold shadow-sm hover:brightness-95"
            >
              TRIGGER CORRECTION
            </button>

            <button
              onClick={() => acknowledgeAlert()}
              className="px-3 py-1 rounded-md border border-neutral-700 text-[var(--text-primary)] hover:bg-neutral-900"
            >
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
