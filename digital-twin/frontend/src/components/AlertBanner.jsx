import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '../store/simulationStore';

export default function AlertBanner() {
  const alert = useSimulationStore((s) => s.alert);
  const fusion = useSimulationStore((s) => s.fusion);

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="rounded-lg border border-[var(--red)]/50 bg-[linear-gradient(90deg,rgba(239,68,68,0.25),rgba(20,20,20,0.8))] px-4 py-3"
        >
          <p className="heading text-sm text-[var(--red)]">Residue Elimination Sequence Triggered</p>
          <p className="mt-1 text-sm text-[var(--text-primary)]">
            {fusion.rationale}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
