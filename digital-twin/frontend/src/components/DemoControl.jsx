import { useState } from 'react';
import { motion } from 'framer-motion';
import DemoPanel from './DemoPanel';

export default function DemoControl() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Demo Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(245,168,0,0.4)',
              '0 0 0 12px rgba(245,168,0,0.0)'
            ]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut'
          }}
          className="rounded-full border-2 border-[var(--yellow)] bg-[rgba(245,168,0,0.18)] px-5 py-3 text-sm font-semibold text-[var(--yellow)] shadow-[0_0_24px_rgba(245,168,0,0.3)] backdrop-blur-sm"
        >
          🎬 DEMO MODE
        </motion.div>
      </motion.button>

      {/* Demo Panel Modal */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
        >
          <DemoPanel />
          
          {/* Close button */}
          <motion.button
            onClick={() => setIsOpen(false)}
            className="fixed right-6 top-6 z-50 rounded-full border border-[#2A2A31] bg-[#141417] p-2 text-[#A0A0A6] hover:border-[var(--yellow)] hover:text-[var(--yellow)]"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </motion.button>
        </motion.div>
      )}
    </>
  );
}
