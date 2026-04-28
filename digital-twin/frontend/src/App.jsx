import { motion } from 'framer-motion';
import { useEffect } from 'react';
import AlertBanner from './components/AlertBanner';
import SystemFlowDiagram from './components/SystemFlowDiagram';
import LatencyBadge from './components/LatencyBadge';
import TruckScene from './components/TruckScene/TruckScene';
import ControlPanel from './components/ControlPanel/ControlPanel';
import SensorDashboard from './components/SensorDashboard/SensorDashboard';
import { useSocket } from './hooks/useSocket';
import { startSimulationPolling } from './hooks/useSimulation';

export default function App() {
  useSocket();
  // start background telemetry polling outside of React hook ordering
  useEffect(() => {
    const stop = startSimulationPolling();
    return stop;
  }, []);

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <motion.header
        initial={{ y: -22, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55 }}
        className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="heading text-2xl text-[var(--yellow)] md:text-4xl">
            Smart Carry-Back Detection and Elimination System
          </h1>
          <p className="text-sm text-[var(--text-muted)] md:text-base">
            Caterpillar 793F Digital Twin | Team Synergy | Production Simulation Build
          </p>
        </div>
        <LatencyBadge />
      </motion.header>

      <AlertBanner />

      <main className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_minmax(360px,430px)]">
        <motion.section
          initial={{ x: -18, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.45 }}
          className="panel h-[calc(100vh-8rem)] overflow-hidden rounded-xl p-0"
        >
          <div className="flex h-full flex-col">
            <ControlPanel />
            <div className="mt-auto border-t border-[#1F1F26] p-4">
              <SystemFlowDiagram />
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="panel relative h-[420px] overflow-hidden rounded-xl md:h-[calc(100vh-8rem)]"
        >
          <TruckScene />
        </motion.section>

        <motion.section
          initial={{ x: 18, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.45 }}
          className="panel rounded-xl p-4"
        >
          <SensorDashboard />
        </motion.section>
      </main>
    </div>
  );
}
