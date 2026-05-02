import { useMemo } from 'react';

const zones = ['FL', 'FC', 'FR', 'RL', 'RC', 'RR'];

function zoneColor(value) {
  if (value > 0.72) return '#DC2626';
  if (value > 0.5) return '#F59E0B';
  if (value > 0.3) return '#3B82F6';
  return '#16A34A';
}

export default function ZoneHeatmap({ zoneValues = {} }) {
  const values = useMemo(() => zones.map((z) => ({ key: z, v: zoneValues[z] ?? 0 })), [zoneValues]);

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <p className="heading text-sm text-[var(--yellow)]">Bed Residue Zone Map</p>
      <svg viewBox="0 0 240 140" className="mt-3 w-full">
        {/* trapezoid bed outline */}
        <defs>
          <linearGradient id="bedGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#111827" />
            <stop offset="100%" stopColor="#0b1220" />
          </linearGradient>
          <filter id="zoneGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polygon points="20,12 220,12 200,128 40,128" fill="url(#bedGrad)" stroke="#1F1F26" strokeWidth="1.5" />

        {/* front wall label */}
        <text x="120" y="8" textAnchor="middle" fontSize="10" fill="#9CA3AF">FRONT WALL</text>

        {/* zones: top row FL FC FR */}
        {values.slice(0, 3).map((z, i) => {
          const x = 40 + i * 64;
          const y = 24;
          const color = zoneColor(z.v);
          return (
            <g key={z.key}>
              <rect x={x} y={y} width="60" height="44" rx="6" ry="6" fill={color} opacity="0.9" stroke="#0b0b0d" filter={z.v > 0.7 ? 'url(#zoneGlow)' : undefined} />
              <text x={x + 8} y={y + 14} fontSize="10" fill="#000">{z.key}</text>
              <text x={x + 8} y={y + 30} fontSize="12" fill="#000" fontWeight="700">{(z.v * 10).toFixed(1)} t</text>
              <text x={x + 8} y={y + 40} fontSize="10" fill="#000">{Math.round(z.v * 100)}%</text>
            </g>
          );
        })}

        {/* bottom row RL RC RR */}
        {values.slice(3, 6).map((z, i) => {
          const x = 40 + i * 64;
          const y = 76;
          const color = zoneColor(z.v);
          return (
            <g key={z.key}>
              <rect x={x} y={y} width="60" height="44" rx="6" ry="6" fill={color} opacity="0.9" stroke="#0b0b0d" filter={z.v > 0.7 ? 'url(#zoneGlow)' : undefined} />
              <text x={x + 8} y={y + 14} fontSize="10" fill="#000">{z.key}</text>
              <text x={x + 8} y={y + 30} fontSize="12" fill="#000" fontWeight="700">{(z.v * 10).toFixed(1)} t</text>
              <text x={x + 8} y={y + 40} fontSize="10" fill="#000">{Math.round(z.v * 100)}%</text>
            </g>
          );
        })}

        <text x="120" y="138" textAnchor="middle" fontSize="10" fill="#9CA3AF">TAILGATE</text>
      </svg>
    </div>
  );
}
