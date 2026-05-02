import { useMemo } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { evaluateSensorHealth, toChartSeries } from '../../simulation/SensorEngine';
import MiniSensorChart from './MiniSensorChart';
import AcousticAnalysis from './AcousticAnalysis';
import FusionMeter from './FusionMeter';
import AIDecisionLog from './AIDecisionLog';
import ZoneHeatmap from './ZoneHeatmap';
import LatencyBadge from '../LatencyBadge';
import SystemFlowDiagram from '../SystemFlowDiagram';

export default function SensorDashboard() {
  const sensors = useSimulationStore((s) => s.sensors);
  const fusion = useSimulationStore((s) => s.fusion);
  const zones = useSimulationStore((s) => s.zones);
  const history = useSimulationStore((s) => s.history);

  const sensorHealth = evaluateSensorHealth(sensors);
  const series = toChartSeries(history);

  // last 30 points
  const miniSeries = useMemo(() => series.slice(-30).map((s, i) => ({ ...s, idx: i })), [series]);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-l border-[#1F1F26] bg-[#0F0F12] text-[var(--text-primary)]">
      <div className="sticky top-0 z-10 border-b border-[#1F1F26] bg-[#0F0F12]/95 px-2 sm:px-3 md:px-4 py-3 md:py-4 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="heading text-base sm:text-lg text-[var(--yellow)]">Sensor Dashboard</h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">Live sensor streams and AI diagnostics</p>
          </div>
          <div className="ml-2">
            <LatencyBadge />
          </div>
        </div>

      </div>
      <div className="flex-1 overflow-y-auto px-2 sm:px-3 md:px-4 py-3 md:py-4 pb-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#243246] bg-[#0f141e]/70 p-3">
            <div className="text-xs text-[var(--text-muted)] font-medium tracking-wide">Acoustic</div>
            <MiniSensorChart data={miniSeries} dataKey="acoustic" stroke="#F5A800" threshold={null} />

            <div className="text-xs text-[var(--text-muted)] font-medium tracking-wide mt-3">Vibration</div>
            <MiniSensorChart data={miniSeries} dataKey="vibration" stroke="#3B82F6" />

            <div className="text-xs text-[var(--text-muted)] font-medium tracking-wide mt-3">Camera (fusion)</div>
            <MiniSensorChart data={miniSeries} dataKey="risk" stroke="#22C55E" />

            <div className="text-xs text-[var(--text-muted)] font-medium tracking-wide mt-3">LiDAR</div>
            <MiniSensorChart data={miniSeries} dataKey="lidar" stroke="#3B82F6" />
          </div>

          <AcousticAnalysis />

          <div className="border-t border-[#1F1F26] pt-4" />

          <ZoneHeatmap zoneValues={zones} />

          <div className="border-t border-[#1F1F26] pt-4" />

          <AIDecisionLog />

          <div className="border-t border-[#1F1F26] pt-4" />

          <SystemFlowDiagram />

          <div className="border-t border-[#1F1F26] pt-4 mt-4">
            <FusionMeter confidence={fusion.confidence} residueRisk={fusion.residue_risk} action={fusion.action} />
          </div>
        </div>
      </div>
    </aside>
  );
}
