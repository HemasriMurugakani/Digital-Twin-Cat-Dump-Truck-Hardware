import React, { useMemo } from 'react';
import { useSimulationStore } from '../../store/simulationStore';

function makeSpectrum(reading, bins = 20, base = 847, peakShift = 0) {
  const arr = Array.from({ length: bins }, (_, i) => {
    const x = i / (bins - 1);
    const center = 0.5 + (peakShift / 200) * 0.4;
    const width = 0.12 + Math.abs(peakShift) / 800;
    const val = Math.exp(-((x - center) ** 2) / (2 * width * width));
    const scale = Math.min(1, Math.max(0, (reading - 55) / 40));
    return val * scale;
  });
  return arr;
}

export default function AcousticAnalysis() {
  const acoustic = useSimulationStore((s) => s.sensors.acoustic_db);
  const fusion = useSimulationStore((s) => s.fusion);
  const material = useSimulationStore((s) => s.materialProfile);

  const peakHz = Math.round(791 - (material === 'dry_rock' ? -6 : 0));
  const baselineHz = 847;
  const delta = peakHz - baselineHz;

  const spectrum = useMemo(() => makeSpectrum(acoustic, 20, baselineHz, peakHz - baselineHz), [acoustic, peakHz]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5">
      <p className="heading text-xs text-[var(--yellow)] mb-2">Acoustic Analysis</p>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="data text-xl text-[var(--yellow)]">{peakHz} Hz</p>
          <p className="text-[11px] text-[var(--text-muted)]">Baseline {baselineHz} Hz</p>
        </div>
        <div className="text-right">
          <p className={`data text-sm ${delta < 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>{delta} Hz</p>
          <p className="text-[11px] text-[var(--text-muted)]">{fusion.residue_risk > 0.6 ? 'WET CLAY' : 'NORMAL'}</p>
        </div>
      </div>

      <div className="h-10 w-full overflow-hidden rounded border border-[var(--border)] bg-[#0a0e16] px-1 pt-1">
        <div className="flex h-full items-end gap-[2px]">
          {spectrum.map((v, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div
                style={{
                  height: `${Math.max(6, v * 96)}%`,
                  background: i > 7 && i < 12 ? 'rgba(245,158,11,0.9)' : '#3b82f6',
                  transition: 'height 200ms linear',
                  borderRadius: '1px 1px 0 0',
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span>Low band</span>
        <span className="text-[var(--yellow)]">Signature</span>
        <span>High band</span>
      </div>
    </div>
  );
}
