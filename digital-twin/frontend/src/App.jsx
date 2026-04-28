import { motion } from 'framer-motion';
import { useEffect } from 'react';
import TruckScene from './components/TruckScene/TruckScene';
import ControlPanel from './components/ControlPanel/ControlPanel';
import DumpCycleTimer from './components/ControlPanel/DumpCycleTimer';
import SensorDashboard from './components/SensorDashboard/SensorDashboard';
import { useSocket } from './hooks/useSocket';
import { startSimulationPolling } from './hooks/useSimulation';
import { useDumpCycleSequence } from './hooks/useDumpCycleSequence';
import { useSimulationStore } from './store/simulationStore';

function TopBar() {
  const connected = useSimulationStore((s) => s.connected);
  const latencyMs = useSimulationStore((s) => s.latencyMs);
  const cycleNumber = useSimulationStore((s) => s.cycleNumber);
  const state = useSimulationStore((s) => s.state);
  const dumpCycle = useSimulationStore((s) => s.dumpCycle);

  const stateLabel = dumpCycle?.active ? dumpCycle.stage : state.phase;
  const stateTone =
    stateLabel === 'CLEAR'
      ? '#22C55E'
      : stateLabel === 'CARRY_BACK_DETECTED'
        ? '#EF4444'
        : stateLabel === 'CORRECTING'
          ? '#F59E0B'
          : stateLabel === 'DETECTING'
            ? '#F59E0B'
            : '#3B82F6';

  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="grid h-[64px] grid-cols-[1.2fr_minmax(0,1fr)_1fr] items-center gap-3 rounded-[22px] border border-[#1F1F26] bg-[rgba(10,10,12,0.94)] px-4 shadow-[0_18px_50px_rgba(0,0,0,0.34)] backdrop-blur-md"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="h-8 w-8 shrink-0 rounded-sm bg-[var(--yellow)] shadow-[0_0_18px_rgba(245,168,0,0.3)]" />
        <div className="min-w-0">
          <div className="heading truncate text-sm tracking-[0.34em] text-[var(--yellow)]">SmartBed</div>
          <div className="truncate text-xs text-[var(--text-muted)]">CAT 793-11 | Mine Site Alpha • Eastern Operations</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 text-center">
        <motion.div
          animate={{ boxShadow: ['0 0 0 rgba(245,168,0,0.0)', '0 0 18px rgba(245,168,0,0.28)', '0 0 0 rgba(245,168,0,0.0)'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-full border border-[#2A2A31] bg-[#141417] px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] text-[var(--yellow)]"
          style={{ borderColor: stateTone }}
        >
          {stateLabel}
        </motion.div>
        <div className="text-xs text-[var(--text-muted)]">
          <span className="data text-[var(--text-primary)]">Cycle #{cycleNumber}</span>
          <span className="mx-2 text-[#2f2f37]">|</span>
          <span className="data text-[var(--text-primary)]">Bed: {state.bed_angle_deg.toFixed(1)}°</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 text-right">
        <div className="rounded-full border border-[#2A2A31] bg-[#141417] px-3 py-1.5 text-xs text-[var(--text-muted)]">
          <span className="data mr-1 text-[var(--text-primary)]">⚡ {latencyMs.toFixed(0)}ms</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[#2A2A31] bg-[#141417] px-3 py-1.5">
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-30" />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${connected ? 'bg-[var(--green)]' : 'bg-[var(--text-muted)]'}`} />
          </span>
          <span className="heading text-[10px] tracking-[0.26em] text-[var(--green)]">LIVE</span>
          <span className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">v4.2.1</span>
        </div>
      </div>
    </motion.header>
  );
}

export default function App() {
  useSocket();
  useDumpCycleSequence();
  // start background telemetry polling outside of React hook ordering
  useEffect(() => {
    const stop = startSimulationPolling();
    return stop;
  }, []);

  return (
    <div className="h-screen overflow-hidden px-3 py-3 md:px-4 md:py-4">
      <div className="grid h-full min-h-0 grid-rows-[64px_minmax(0,1fr)] gap-3">
        <TopBar />

        <main className="grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <motion.section
          initial={{ x: -18, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.45 }}
          className="panel min-h-0 overflow-hidden rounded-[24px] p-0"
        >
          <div className="flex h-full min-h-0 flex-col">
            <ControlPanel />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="panel grid min-h-0 grid-rows-[minmax(0,1fr)_84px] overflow-hidden rounded-[24px]"
        >
          <div className="relative min-h-0 overflow-hidden">
            <TruckScene />
          </div>
          <div className="border-t border-[#1F1F26] bg-[#0b0b0d]/95 px-3 py-2 md:px-4">
            <DumpCycleTimer />
          </div>
        </motion.section>

        <motion.section
          initial={{ x: 18, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.45 }}
          className="panel min-h-0 overflow-hidden rounded-[24px] p-0"
        >
          <SensorDashboard />
        </motion.section>
        </main>
      </div>
    </div>
  );
}
