import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSimulationStore } from '../../store/simulationStore';
import { evaluateSensorHealth, toChartSeries } from '../../simulation/SensorEngine';
import MiniSensorChart from './MiniSensorChart';
import AcousticAnalysis from './AcousticAnalysis';
import FusionMeter from './FusionMeter';
import AIDecisionLog from './AIDecisionLog';
import ZoneHeatmap from './ZoneHeatmap';
import SystemFlowDiagram from '../SystemFlowDiagram';

/* ─── Compact sensor row ──────────────────────────────────────────────────── */
function SensorRow({ label, icon, value, unit, status, accentColor, data, dataKey, delay = 0 }) {
  const isAlert = status === 'ALERT' || status === 'HIGH RISK' || status === 'RESIDUE PRESENT';
  const badgeColor = isAlert ? '#ef4444' : '#22c55e';
  const badgeLabel = status === 'RESIDUE PRESENT' ? 'RESIDUE PRESENT'
    : status === 'RESIDUE ABSENT' ? 'RESIDUE ABSENT'
      : isAlert ? 'ALERT' : (status || 'OK');

  return (
    <motion.div
      initial={{ opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="group relative rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5 transition-all duration-200 hover:border-[#2a3548] hover:brightness-110"
      style={{ borderLeftWidth: '3px', borderLeftColor: accentColor }}
    >
      {/* Top row: icon + label + badge */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="heading text-xs tracking-[0.16em] text-[var(--text-muted)]">{label}</span>
        </div>
        <span
          className="data text-[10px] px-1.5 py-0.5 rounded-full"
          style={{
            color: badgeColor,
            background: `${badgeColor}15`,
            boxShadow: isAlert ? `0 0 8px ${badgeColor}20` : 'none',
          }}
        >
          ● {badgeLabel}
        </span>
      </div>

      {/* Value row */}
      {value !== null && (
        <div className="flex items-baseline gap-1 value-animate">
          <span className="data text-[1.7rem] font-bold leading-none" style={{ color: accentColor }}>{value}</span>
          <span className="data text-[11px] text-[var(--text-muted)]">{unit}</span>
        </div>
      )}

      {/* Sparkline */}
      {value !== null && (
        <div className="mt-1.5 h-9 w-full">
          <MiniSensorChart data={data} dataKey={dataKey} stroke={accentColor} />
        </div>
      )}
    </motion.div>
  );
}

export default function SensorDashboard() {
  const sensors = useSimulationStore((s) => s.sensors);
  const fusion = useSimulationStore((s) => s.fusion);
  const zones = useSimulationStore((s) => s.zones);
  const history = useSimulationStore((s) => s.history);
  const latencyMs = useSimulationStore((s) => s.latencyMs);
  const connected = useSimulationStore((s) => s.connected);
  const camera = useSimulationStore((s) => s.sensorReadings.camera);

  const sensorHealth = evaluateSensorHealth(sensors);
  const residueStatus = camera?.residue_present ? 'RESIDUE PRESENT' : 'RESIDUE ABSENT';
  const series = toChartSeries(history);
  const miniSeries = useMemo(() => series.slice(-30).map((s, i) => ({ ...s, idx: i })), [series]);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-primary)]/95 px-3 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="heading text-sm text-[var(--yellow)] flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--yellow)] shadow-[0_0_6px_rgba(245,168,0,0.5)]" />
              Sensor Dashboard
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">Live sensor streams & AI diagnostics</p>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-1.5 py-1 text-[8px]">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${connected ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`} />
            <span className="data text-[var(--text-muted)]">{latencyMs.toFixed(1)}<span className="text-[7px]"> ms</span></span>
          </div>
        </div>
      </div>

      {/* ── Scrollable Content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 pb-6">
        <div className="space-y-2">
          {/* Section label */}
          <p className="heading text-[11px] tracking-[0.22em] text-[var(--text-muted)] px-0.5 mb-1">Sensor Readouts</p>

          {/* <SensorRow
            label="ACOUSTIC" icon="🔊" accentColor="#F5A800"
            value={null} unit={null}
            status={residueStatus}
            data={miniSeries} dataKey="acoustic" delay={0.05}
          /> */}
          <SensorRow
            label="FUSION" accentColor="#22C55E"
            value={null} unit={null}
            status={residueStatus}
            data={miniSeries} dataKey="risk" delay={0.11}
          />
          <SensorRow
            label="ULTRA LEFT" icon="📡" accentColor="#8B5CF6"
            value={sensors.ultra_left?.toFixed(1) ?? '—'} unit="cm"
            status={sensors.ultra_left > 0 ? 'OK' : 'ALERT'}
            data={miniSeries} dataKey="ultra_left" delay={0.14}
          />
          <SensorRow
            label="ULTRA RIGHT" icon="📡" accentColor="#8B5CF6"
            value={sensors.ultra_right?.toFixed(1) ?? '—'} unit="cm"
            status={sensors.ultra_right > 0 ? 'OK' : 'ALERT'}
            data={miniSeries} dataKey="ultra_right" delay={0.17}
          />
          <SensorRow
            label="DUMP ANGLE" icon="📐" accentColor="#EAB308"
            value={sensors.angle?.toFixed(1) ?? '—'} unit="°"
            status={'OK'}
            data={miniSeries} dataKey="angle" delay={0.20}
          />
          <SensorRow
            label="WEIGHT" icon="⚖️" accentColor="#F97316"
            value={sensors.weight?.toFixed(1) ?? '—'} unit="t"
            status={'OK'}
            data={miniSeries} dataKey="weight" delay={0.23}
          />

          {/* ── Acoustic Analysis ────────────────────────────────────── */}
          <div className="mt-1"><AcousticAnalysis /></div>

          {/* ── Zone Heatmap ─────────────────────────────────────────── */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5">
            <ZoneHeatmap zoneValues={zones} activeCameraGrids={camera?.active_grids || []} />
          </div>

          {/* ── AI Decision Log ──────────────────────────────────────── */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5">
            <AIDecisionLog />
          </div>

          {/* ── System Flow ──────────────────────────────────────────── */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5">
            <SystemFlowDiagram />
          </div>

          {/* ── Fusion Confidence ─────────────────────────────────────── */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5">
            <FusionMeter confidence={fusion.confidence} residueRisk={fusion.residue_risk} action={fusion.action} />
          </div>
        </div>
      </div>
    </aside>
  );
}
