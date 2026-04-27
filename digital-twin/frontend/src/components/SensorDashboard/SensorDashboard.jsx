import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { useSimulationStore } from '../../store/simulationStore';
import { evaluateSensorHealth, toChartSeries } from '../../simulation/SensorEngine';
import SensorGauge from './SensorGauge';
import FusionMeter from './FusionMeter';
import AIDecisionLog from './AIDecisionLog';
import ZoneHeatmap from './ZoneHeatmap';

export default function SensorDashboard() {
  const sensors = useSimulationStore((s) => s.sensors);
  const fusion = useSimulationStore((s) => s.fusion);
  const zones = useSimulationStore((s) => s.zones);
  const history = useSimulationStore((s) => s.history);

  const sensorHealth = evaluateSensorHealth(sensors);
  const series = toChartSeries(history);

  return (
    <div>
      <h2 className="heading text-lg text-[var(--yellow)]">SmartBed Dashboard</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Multi-sensor fusion and zone-level carry-back intelligence.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <SensorGauge label="Acoustic" value={sensors.acoustic_db} unit="dB" normalized={sensorHealth.acoustic_db.normalized} />
        <SensorGauge label="Vibration" value={sensors.vibration_g} unit="g" normalized={sensorHealth.vibration_g.normalized} />
        <SensorGauge label="Thermal" value={sensors.thermal_c} unit="°C" normalized={sensorHealth.thermal_c.normalized} />
        <SensorGauge label="LiDAR" value={sensors.lidar_mm} unit="mm" normalized={sensorHealth.lidar_mm.normalized} />
      </div>

      <div className="mt-3">
        <FusionMeter
          confidence={fusion.confidence}
          residueRisk={fusion.residue_risk}
          action={fusion.action}
        />
      </div>

      <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3">
        <p className="heading mb-2 text-sm text-[var(--yellow)]">Sensor Trend Stream</p>
        <div className="h-32 w-full">
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#1f1f26" strokeDasharray="4 4" />
              <XAxis hide dataKey="idx" />
              <YAxis hide domain={[0, 'dataMax + 10']} />
              <Tooltip
                contentStyle={{
                  background: '#0f0f12',
                  borderColor: '#1f1f26',
                  fontSize: 12
                }}
              />
              <Line type="monotone" dataKey="acoustic" stroke="#F5A800" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="vibration" stroke="#3B82F6" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="risk" stroke="#EF4444" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3">
        <ZoneHeatmap zoneValues={zones} />
      </div>

      <div className="mt-3">
        <AIDecisionLog />
      </div>
    </div>
  );
}
