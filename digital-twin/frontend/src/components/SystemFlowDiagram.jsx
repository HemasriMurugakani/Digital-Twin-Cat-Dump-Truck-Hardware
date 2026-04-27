export default function SystemFlowDiagram() {
  return (
    <div>
      <h3 className="heading mb-2 text-base text-[var(--yellow)]">System Flow</h3>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3">
        <svg viewBox="0 0 320 180" className="h-auto w-full">
          <defs>
            <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F5A800" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>

          <rect x="10" y="20" width="90" height="42" rx="8" fill="#161619" stroke="#1F1F26" />
          <text x="55" y="45" textAnchor="middle" fontSize="9" fill="#F0F0F0">Truck Sensors</text>

          <rect x="115" y="20" width="90" height="42" rx="8" fill="#161619" stroke="#1F1F26" />
          <text x="160" y="45" textAnchor="middle" fontSize="9" fill="#F0F0F0">Fusion AI</text>

          <rect x="220" y="20" width="90" height="42" rx="8" fill="#161619" stroke="#1F1F26" />
          <text x="265" y="45" textAnchor="middle" fontSize="9" fill="#F0F0F0">Dashboard</text>

          <path d="M100 40 L115 40 M205 40 L220 40" stroke="url(#line)" strokeWidth="2.5" />

          <rect x="63" y="108" width="194" height="48" rx="10" fill="#0f0f12" stroke="#1F1F26" />
          <text x="160" y="127" textAnchor="middle" fontSize="10" fill="#F5A800">SCBES Decision Engine</text>
          <text x="160" y="142" textAnchor="middle" fontSize="8" fill="#6B7280">6-Zone Residue Mapping + State Machine</text>

          <path d="M160 62 L160 108" stroke="#3B82F6" strokeWidth="2" />
          <circle cx="160" cy="86" r="4" fill="#3B82F6" />
        </svg>
      </div>
    </div>
  );
}
