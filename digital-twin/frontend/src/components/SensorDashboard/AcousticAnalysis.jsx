import React, { useMemo } from 'react';
import { useSimulationStore } from '../../store/simulationStore';

function makeSpectrum(reading, bins = 20, base = 847, peakShift = 0) {
  // simple synthetic FFT-like bars around base frequency
  const peak = base + peakShift;
  const arr = Array.from({ length: bins }, (_, i) => {
    const x = i / (bins - 1);
    // gaussian around peak position
    const center = 0.5 + (peakShift / 200) * 0.4;
    const width = 0.12 + Math.abs(peakShift) / 800;
    const val = Math.exp(-((x - center) ** 2) / (2 * width * width));
    // scale with reading magnitude
    const scale = Math.min(1, Math.max(0, (reading - 55) / 40));
    return val * scale;
  });
  return arr;
}

export default function AcousticAnalysis() {
  const acoustic = useSimulationStore((s) => s.sensors.acoustic_db);
  const fusion = useSimulationStore((s) => s.fusion);
  const material = useSimulationStore((s) => s.materialProfile);

  const peakHz = Math.round(791 - (material === 'dry_rock' ? -6 : material === 'wet_clay' ? 0 : 0));
  const baselineHz = 847;
  const delta = peakHz - baselineHz;

  const spectrum = useMemo(() => makeSpectrum(acoustic, 20, baselineHz, peakHz - baselineHz), [acoustic, peakHz]);

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <p className="heading text-sm text-[var(--yellow)]">Acoustic Analysis</p>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="data text-3xl text-[var(--yellow)]">{peakHz} Hz</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Baseline {baselineHz} Hz</p>
        </div>
        <div className="text-right">
          <p className={`data text-lg ${delta < 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}>{delta} Hz</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{fusion.residue_risk > 0.6 ? 'WET CLAY SIGNATURE' : 'NORMAL'}</p>
        </div>
      </div>

      <div className="mt-3 h-12 w-full overflow-hidden rounded border border-[#273447] bg-[#0a0f18] px-1 pt-1">
        <div className="flex h-full items-end gap-1">
          {spectrum.map((v, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div
                style={{
                  height: `${Math.max(6, v * 96)}%`,
                  background: i > 7 && i < 12 ? 'rgba(245,158,11,0.95)' : '#3b82f6',
                  transition: 'height 220ms linear'
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span>Low band</span>
        <span className="text-[var(--yellow)]">Signature window</span>
        <span>High band</span>
      </div>
    </div>
  );
}
