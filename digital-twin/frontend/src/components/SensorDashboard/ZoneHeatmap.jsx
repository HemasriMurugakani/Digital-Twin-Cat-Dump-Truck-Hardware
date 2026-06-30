import { useMemo } from 'react';

const zones = [
  'R1C1', 'R1C2', 'R1C3',
  'R2C1', 'R2C2', 'R2C3',
  'R3C1', 'R3C2', 'R3C3',
];

function zoneColor(value) {
  if (value > 0.72) return '#DC2626';
  if (value > 0.5) return '#F59E0B';
  if (value > 0.3) return '#3B82F6';
  return '#16A34A';
}

export default function ZoneHeatmap({ zoneValues = {}, activeCameraGrids = [] }) {
  const values = useMemo(() => zones.map((z) => ({ key: z, v: zoneValues[z] ?? 0 })), [zoneValues]);

  const rows = [
    { data: values.slice(0, 3), y: 24 },
    { data: values.slice(3, 6), y: 68 },
    { data: values.slice(6, 9), y: 112 },
  ];

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <p className="heading text-sm text-[var(--yellow)]">Bed Residue Zone Map</p>
      <svg viewBox="0 0 240 180" className="mt-3 w-full">
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
        <polygon points="20,12 220,12 200,168 40,168" fill="url(#bedGrad)" stroke="#1F1F26" strokeWidth="1.5" />

        {/* front wall label */}
        <text x="120" y="8" textAnchor="middle" fontSize="10" fill="#9CA3AF">FRONT WALL</text>

        {/* 3x3 zone grid */}
        {rows.map((row) =>
          row.data.map((z, i) => {
            const x = 40 + i * 64;
            const isCameraActive = activeCameraGrids.includes(z.key);
            const value = isCameraActive ? Math.max(z.v, 0.85) : z.v;
            const displayTonnes = isCameraActive && value === 0.85 ? 1.5 : (z.v * 10);
            const color = zoneColor(value);
            return (
              <g key={z.key}>
                <rect x={x} y={row.y} width="60" height="38" rx="6" ry="6" fill={color} opacity="0.9" stroke="#0b0b0d" filter={value > 0.7 ? 'url(#zoneGlow)' : undefined} />
                <text x={x + 8} y={row.y + 13} fontSize="9" fill="#000">{z.key}</text>
                <text x={x + 8} y={row.y + 26} fontSize="11" fill="#000" fontWeight="700">{displayTonnes.toFixed(1)} t</text>
                <text x={x + 8} y={row.y + 35} fontSize="9" fill="#000">{Math.round(value * 100)}%</text>
              </g>
            );
          })
        )}

        <text x="120" y="178" textAnchor="middle" fontSize="10" fill="#9CA3AF">TAILGATE</text>
      </svg>
    </div>
  );
}
