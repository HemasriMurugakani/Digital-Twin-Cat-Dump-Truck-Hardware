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
import TruckSelector from './components/TruckSelector';

import DemoControl from './components/DemoControl';

function TopBar() {
  const connected = useSimulationStore((s) => s.connected);
  const latencyMs = useSimulationStore((s) => s.latencyMs);
  const cycleNumber = useSimulationStore((s) => s.cycleNumber);
  const state = useSimulationStore((s) => s.state);
  const dumpCycle = useSimulationStore((s) => s.dumpCycle);
  const truckModel = useSimulationStore((s) => s.truckModel);
  const connectionError = useSimulationStore((s) => s.connectionError);

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
      className="grid h-[64px] grid-cols-[1fr_auto_auto] items-center gap-2 rounded-[22px] border border-[var(--border)] bg-[rgba(10,14,24,0.92)] px-3 sm:gap-3 sm:px-4 shadow-[0_18px_50px_rgba(0,0,0,0.34)] backdrop-blur-md"
    >
      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
        <div className="h-8 w-8 shrink-0 rounded-sm bg-[var(--yellow)] shadow-[0_0_18px_rgba(245,168,0,0.3)]" />
        <div className="min-w-0 hidden sm:block">
          <div className="heading truncate text-xs sm:text-sm tracking-[0.34em] text-[var(--yellow)]">SmartBed</div>
          <div className="truncate text-[10px] sm:text-xs text-[var(--text-muted)]">{truckModel} | Mine Site Alpha • Eastern Operations</div>
        </div>
        <div className="hidden lg:block pl-1">
          <TruckSelector />
        </div>
      </div>

      <div className="flex items-center justify-center gap-1 sm:gap-3 text-center">
        <div className="lg:hidden hidden md:block">
          <TruckSelector />
        </div>
        <motion.div
          animate={{ boxShadow: ['0 0 0 rgba(245,168,0,0.0)', '0 0 18px rgba(245,168,0,0.28)', '0 0 0 rgba(245,168,0,0.0)'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-full border border-[#2A2A31] bg-[#141417] px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-[10px] uppercase tracking-[0.28em] text-[var(--yellow)]"
          style={{ borderColor: stateTone }}
        >
          {stateLabel}
        </motion.div>
        <div className="text-[9px] sm:text-xs text-[var(--text-muted)] hidden sm:block">
          <span className="data text-[var(--text-primary)]">Cycle #{cycleNumber}</span>
          <span className="mx-2 text-[#2f2f37]">|</span>
          <span className="data text-[var(--text-primary)]">Bed: {state.bed_angle_deg.toFixed(1)}°</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 sm:gap-3 text-right">
        {connectionError ? (
          <div className="rounded-full border border-[#ef4444] bg-[rgba(127,29,29,0.3)] px-2 py-1 text-[9px] text-[#fca5a5]">
            BACKEND ERR
          </div>
        ) : null}
        <div className="rounded-full border border-[#2A2A31] bg-[#141417] px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-xs text-[var(--text-muted)] hidden sm:block">
          <span className="data mr-1 text-[var(--text-primary)]">⚡ {latencyMs.toFixed(0)}ms</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 rounded-full border border-[#2A2A31] bg-[#141417] px-2 py-1 sm:px-3 sm:py-1.5">
          <span className="relative flex h-2 sm:h-2.5 w-2 sm:w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-30" />
            <span className={`relative inline-flex h-full w-full rounded-full ${connected ? 'bg-[var(--green)]' : 'bg-[var(--text-muted)]'}`} />
          </span>
          <span className="heading text-[9px] sm:text-[10px] tracking-[0.26em] text-[var(--green)] hidden sm:inline">LIVE</span>
          <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] hidden sm:inline">v4.2.1</span>
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
    <div className="h-screen overflow-hidden px-2 py-2 sm:px-3 sm:py-3 md:px-4 md:py-4">
      <div className="grid h-full min-h-0 grid-rows-[56px_minmax(0,1fr)] gap-2 sm:gap-3 md:grid-rows-[64px_minmax(0,1fr)]">
        <TopBar />

        <main className="grid min-h-0 grid-cols-1 gap-2 sm:gap-3 md:grid-cols-[280px_1fr] lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <motion.section
          initial={{ x: -18, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.45 }}
          className="panel min-h-0 overflow-hidden rounded-[16px] sm:rounded-[20px] md:rounded-[24px] p-0 md:col-span-1"
        >
          <div className="flex h-full min-h-0 flex-col">
            <ControlPanel />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="panel grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[16px] sm:rounded-[20px] md:rounded-[24px] md:col-span-1 lg:col-span-1 xl:col-span-1"
        >
          <div className="relative min-h-0 overflow-hidden">
            <TruckScene />
          </div>
          <div className="border-t border-[#1F1F26] bg-[#0b0b0d]/95 px-2 sm:px-3 md:px-4 py-2">
            <DumpCycleTimer />
          </div>
        </motion.section>

        <motion.section
          initial={{ x: 18, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.45 }}
          className="panel min-h-0 overflow-hidden rounded-[16px] sm:rounded-[20px] md:rounded-[24px] p-0 hidden lg:block lg:col-span-1 xl:col-span-1"
        >
          <SensorDashboard />
        </motion.section>
        </main>
        <DemoControl />
      </div>
    </div>
  );
}
