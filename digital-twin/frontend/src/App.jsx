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

/* ─── Top Header Bar ──────────────────────────────────────────────────────── */
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
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[rgba(10,14,22,0.92)] px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.3)] backdrop-blur-md sm:gap-3 sm:px-4"
    >
      {/* Left: Logo + Site name */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="h-8 w-8 shrink-0 rounded-sm bg-[var(--yellow)] shadow-[0_0_14px_rgba(245,168,0,0.3)]" />
        <div className="min-w-0 hidden sm:block">
          <div className="heading truncate text-[13px] tracking-[0.34em] text-[var(--yellow)]">SmartBed</div>
          <div className="truncate text-xs text-[var(--text-muted)]">{truckModel} | Mine Site Alpha</div>
        </div>
      </div>

      {/* Center: Truck selector */}
      <div className="order-3 w-full flex justify-center sm:order-none sm:w-auto sm:flex-1">
        <TruckSelector />
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
        {connectionError && (
          <div className="rounded-full border border-[#ef4444] bg-[rgba(127,29,29,0.3)] px-2 py-0.5 text-[10px] text-[#fca5a5]">ERR</div>
        )}
        <motion.div
          animate={{ boxShadow: ['0 0 0 rgba(245,168,0,0)', '0 0 12px rgba(245,168,0,0.25)', '0 0 0 rgba(245,168,0,0)'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-full border border-[#2A2A31] bg-[#101418] px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--yellow)]"
          style={{ borderColor: stateTone }}
        >
          {stateLabel}
        </motion.div>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <span className="text-[#3a3f4e]">|</span>
          <span className="data text-[var(--text-primary)]">Cycle #{cycleNumber}</span>
          <span className="text-[#3a3f4e]">|</span>
          <span className="data text-[var(--text-primary)]">Bed: {state.bed_angle_deg.toFixed(1)}°</span>
          <span className="text-[#3a3f4e]">|</span>
          <span className="data text-[var(--text-primary)]">⚡{latencyMs.toFixed(0)}ms</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-[#2A2A31] bg-[#101418] px-2 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-30" />
            <span className={`relative inline-flex h-full w-full rounded-full ${connected ? 'bg-[var(--green)]' : 'bg-[var(--text-muted)]'}`} />
          </span>
          <span className="heading text-[10px] tracking-[0.2em] text-[var(--green)] hidden sm:inline">LIVE</span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] hidden md:inline">v4.2.1</span>
        </div>
      </div>
    </motion.header>
  );
}

/* ─── App Root ────────────────────────────────────────────────────────────── */
export default function App() {
  useSocket();
  useDumpCycleSequence();
  useEffect(() => {
    const stop = startSimulationPolling();
    return stop;
  }, []);

  return (
    <div className="h-screen overflow-hidden p-2 sm:p-3">
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 sm:gap-3">
        <TopBar />

        {/* ── Main 3-column layout (stacks on mobile) ──────────────── */}
        <main className="grid min-h-0 gap-2 sm:gap-3
          grid-cols-1 grid-rows-[1fr]
          md:grid-cols-[260px_1fr]
          xl:grid-cols-[260px_minmax(0,1fr)_260px]"
        >
          {/* Left: Control Panel */}
          <motion.section
            initial={{ x: -18, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.4 }}
            className="panel min-h-0 overflow-hidden rounded-2xl p-0 hidden md:block"
          >
            <ControlPanel />
          </motion.section>

          {/* Center: 3D Viewport + Timeline */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="panel grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-2xl"
          >
            <div className="relative min-h-0 overflow-hidden">
              <TruckScene />
            </div>
            <div className="border-t border-[var(--border)] bg-[#0b0c10]/95 px-3 py-2">
              <DumpCycleTimer />
            </div>
          </motion.section>

          {/* Right: Sensor Dashboard */}
          <motion.section
            initial={{ x: 18, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.4 }}
            className="panel min-h-0 overflow-hidden rounded-2xl p-0 hidden xl:block"
          >
            <SensorDashboard />
          </motion.section>
        </main>
        <DemoControl />
      </div>
    </div>
  );
}
