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
    <aside className="h-full w-full max-w-[320px] border-l border-[#1F1F26] bg-[#0F0F12] p-4 text-[var(--text-primary)] overflow-y-auto">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="heading text-lg text-[var(--yellow)]">Sensor Dashboard</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Live sensor streams and AI diagnostics</p>
          </div>
          <div className="ml-2">
            <LatencyBadge />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-2">
            <div className="text-xs text-[var(--text-muted)]">Acoustic</div>
            <MiniSensorChart data={miniSeries} dataKey="acoustic" stroke="#F5A800" threshold={null} />

            <div className="text-xs text-[var(--text-muted)] mt-2">Vibration</div>
            <MiniSensorChart data={miniSeries} dataKey="vibration" stroke="#3B82F6" />

            <div className="text-xs text-[var(--text-muted)] mt-2">Camera (fusion)</div>
            <MiniSensorChart data={miniSeries} dataKey="risk" stroke="#22C55E" />

            <div className="text-xs text-[var(--text-muted)] mt-2">LiDAR</div>
            <MiniSensorChart data={miniSeries} dataKey="lidar" stroke="#3B82F6" />
          </div>

          <AcousticAnalysis />

          <ZoneHeatmap zoneValues={zones} />

          <div>
            <AIDecisionLog />
          </div>

          <div>
            <SystemFlowDiagram />
          </div>

          <div className="mt-3">
            <FusionMeter confidence={fusion.confidence} residueRisk={fusion.residue_risk} action={fusion.action} />
          </div>
        </div>
      </div>
    </aside>
  );
}
