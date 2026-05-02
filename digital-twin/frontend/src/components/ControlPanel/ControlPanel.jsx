import { useMemo } from 'react';
import { useSimulationStore } from '../../store/simulationStore';

const scenarioOptions = [
  {
    key: 'empty_truck',
    label: 'EMPTY TRUCK',
    accent: 'var(--green)',
    description: 'No carry-back expected'
  },
  {
    key: 'partial_residue',
    label: 'PARTIAL RESIDUE',
    accent: 'var(--amber)',
    description: 'Moderate residue signature'
  },
  {
    key: 'full_residue',
    label: 'FULL RESIDUE',
    accent: 'var(--red)',
    description: 'Heavy carry-back loading'
  }
];

const materialOptions = [
  { key: 'wet_clay', label: 'Wet clay', detail: 'Hardest to dump' },
  { key: 'fine_ore', label: 'Fine ore', detail: 'Medium adhesion' },
  { key: 'dry_rock', label: 'Dry rock', detail: 'Easiest release' },
  { key: 'mixed', label: 'Mixed', detail: 'Balanced blend' }
];

const cycleSteps = ['LOAD', 'HAUL', 'DUMP', 'DETECT', 'CORRECT', 'VERIFY', 'RETURN'];

const statePalette = {
  IDLE: { color: '#94A3B8', label: 'IDLE' },
  DUMPING: { color: '#3B82F6', label: 'DUMPING' },
  DETECTING: { color: '#F59E0B', label: 'DETECTING' },
  CARRY_BACK_DETECTED: { color: '#EF4444', label: 'CARRY-BACK DETECTED' },
  CORRECTING: { color: '#F59E0B', label: 'CORRECTING' },
  VERIFYING: { color: '#22C55E', label: 'VERIFYING' },
  CLEAR: { color: '#22C55E', label: 'CLEAR' }
};

const optimalAngleMap = {
  wet_clay: 52.1,
  fine_ore: 49.8,
  dry_rock: 46.2,
  mixed: 50.4
};

const moistureMap = {
  wet_clay: 18.4,
  fine_ore: 12.1,
  dry_rock: 6.2,
  mixed: 13.6
};

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function getPhaseLabel(phase, residueRisk, paused) {
  if (paused) return 'IDLE';
  if (residueRisk >= 0.72 && phase !== 'LOADING') return 'CARRY-BACK DETECTED';
  if (phase === 'DUMP_RAISE' || phase === 'HAUL') return 'DUMPING';
  if (phase === 'DUMP_HOLD') return 'DETECTING';
  if (phase === 'DUMP_LOWER') return residueRisk >= 0.48 ? 'CORRECTING' : 'VERIFIED CLEAR';
  if (phase === 'RETURN' && residueRisk < 0.35) return 'VERIFIED CLEAR';
  return 'IDLE';
}

function arcPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
}

function gaugeTone(value) {
  if (value >= 0.65) return '#EF4444';
  if (value >= 0.5) return '#F59E0B';
  return '#22C55E';
}

function SectionCard({ title, subtitle, children, className = '' }) {
  return (
    <section className={`rounded-[22px] border border-[#1F1F26] bg-[#161619] p-4 transition hover:border-[#2a2a31] hover:shadow-[0_0_0_1px_rgba(245,168,0,0.05)] ${className}`}>
      <div className="mb-4">
        <p className="heading text-[11px] tracking-[0.28em] text-[var(--yellow)]">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SensorCard({ icon, label, value, unit, confidence, trend, detail, tone }) {
  const trendGlyph = trend > 0.01 ? '↑' : trend < -0.01 ? '↓' : '→';
  return (
    <div className="group rounded-xl border border-[#23232b] bg-[#0f0f12] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-[#2a2a32] hover:bg-[#161619]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">{label}</p>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">{detail}</p>
        </div>
        <div className="text-lg group-hover:scale-110 transition-transform">{icon}</div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="data text-[24px] leading-none text-[var(--text-primary)]">{value}</p>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">{unit}</p>
        </div>
        <div className="text-right">
          <p className={`data text-sm ${trend > 0 ? 'text-[var(--red)]' : trend < 0 ? 'text-[var(--green)]' : 'text-[var(--text-muted)]'}`}>
            {trendGlyph} {Math.abs(trend).toFixed(2)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">trend</p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#222228]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${clamp(confidence) * 100}%`, background: tone }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span>confidence</span>
        <span className="data">{Math.round(clamp(confidence) * 100)}%</span>
      </div>
    </div>
  );
}

function ConfidenceGauge({ value }) {
  const percentage = clamp(value) * 100;
  const tone = gaugeTone(value);
  const glowOn = percentage >= 65;
  const radius = 78;
  const strokeWidth = 14;
  const startAngle = 135;
  const endAngle = 405;
  const circumference = 2 * Math.PI * radius * (270 / 360);
  const dashOffset = circumference * (1 - clamp(value));
  const marker = polarToCartesian(120, 120, radius, 135 + 270 * 0.65);
  const currentPoint = polarToCartesian(120, 120, radius, startAngle + 270 * clamp(value));

  return (
    <div className="rounded-[28px] border border-[#1F1F26] bg-[#0F0F12] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="heading text-[11px] tracking-[0.28em] text-[var(--yellow)]">FUSED CONFIDENCE</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Threshold line at 65%</p>
        </div>
        <div className="rounded-full border border-[#2A2A31] bg-[#161619] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
          {percentage >= 65 ? 'Carry-back' : 'Empty'}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center">
        <svg viewBox="0 0 240 240" className="h-52 w-52 overflow-visible">
          <defs>
            <filter id="gaugeGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0.96  0 1 0 0 0.66  0 0 1 0 0  0 0 0 1 0" />
            </filter>
          </defs>
          <path d={arcPath(120, 120, radius, 135, 405)} fill="none" stroke="#24242b" strokeWidth={strokeWidth} strokeLinecap="round" />
          <path
            d={arcPath(120, 120, radius, 135, 405)}
            fill="none"
            stroke={tone}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 700ms ease, stroke 300ms ease' }}
            filter={glowOn ? 'url(#gaugeGlow)' : undefined}
          />
          <line x1={marker.x} y1={marker.y} x2={marker.x - 12} y2={marker.y - 8} stroke="#F5A800" strokeWidth="2" strokeLinecap="round" />
          <line x1={currentPoint.x} y1={currentPoint.y} x2={currentPoint.x - 10} y2={currentPoint.y - 6} stroke={tone} strokeWidth="3" strokeLinecap="round" />
          <circle cx="120" cy="120" r="58" fill="#0F0F12" stroke="#24242b" strokeWidth="1" />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <p className="data text-5xl leading-none text-[var(--text-primary)]">{percentage.toFixed(0)}%</p>
          <p className="heading mt-2 text-sm text-[var(--yellow)]">{percentage >= 65 ? 'CARRY-BACK' : 'EMPTY'}</p>
        </div>
      </div>
    </div>
  );
}

function BedAngleGauge({ angle, optimal }) {
  const ratio = clamp(angle / 55);
  const tone = Math.abs(angle - optimal) > 4.5 ? '#F59E0B' : '#22C55E';
  const r = 34;
  const c = Math.PI * r;
  const dash = c * ratio;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 90 52" className="h-16 w-24">
        <path d="M10 45 A35 35 0 0 1 80 45" fill="none" stroke="#262a35" strokeWidth="7" strokeLinecap="round" />
        <path
          d="M10 45 A35 35 0 0 1 80 45"
          fill="none"
          stroke={tone}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div>
        <p className="data text-2xl text-[var(--yellow)]">{angle.toFixed(1)}°</p>
        <p className="text-[10px] text-[var(--text-muted)]">Optimal {optimal.toFixed(1)}°</p>
      </div>
    </div>
  );
}

export default function ControlPanel() {
  const connected = useSimulationStore((s) => s.connected);
  const state = useSimulationStore((s) => s.state);
  const dumpCycle = useSimulationStore((s) => s.dumpCycle);
  const sensors = useSimulationStore((s) => s.sensors);
  const fusion = useSimulationStore((s) => s.fusion);
  const history = useSimulationStore((s) => s.history);
  const cycleNumber = useSimulationStore((s) => s.cycleNumber);
  const cycleSeconds = useSimulationStore((s) => s.cycleSeconds);
  const scenario = useSimulationStore((s) => s.scenario);
  const setScenario = useSimulationStore((s) => s.setScenario);
  const materialProfile = useSimulationStore((s) => s.materialProfile);
  const setMaterialProfile = useSimulationStore((s) => s.setMaterialProfile);
  const control = useSimulationStore((s) => s.control);
  const startDumpCycle = useSimulationStore((s) => s.startDumpCycle);
  const pauseCycle = useSimulationStore((s) => s.pauseCycle);
  const stopAndResetCycle = useSimulationStore((s) => s.stopAndResetCycle);
  const triggerVibration = useSimulationStore((s) => s.triggerVibration);
  const showZones = useSimulationStore((s) => s.showZones);
  const toggleShowZones = useSimulationStore((s) => s.toggleShowZones);

  const latestHistory = history[history.length - 1];
  const previousHistory = history[history.length - 2];
  const progress = clamp(state.cycle_progress);
  const phaseIndex = useMemo(() => {
    const phaseMap = { LOADING: 0, HAUL: 1, DUMP_RAISE: 2, DUMP_HOLD: 3, DUMP_LOWER: 4, RETURN: 6 };
    if (state.phase === 'RETURN' && fusion.residue_risk >= 0.35) return 5;
    if (state.phase === 'DUMP_HOLD' && fusion.residue_risk >= 0.65) return 3;
    if (state.phase === 'DUMP_LOWER' && fusion.residue_risk >= 0.48) return 4;
    return phaseMap[state.phase] ?? 0;
  }, [fusion.residue_risk, state.phase]);

  const currentStateLabel = dumpCycle?.active ? dumpCycle.stage : getPhaseLabel(state.phase, fusion.residue_risk, control.isPaused);
  const currentStateTone = statePalette[currentStateLabel] ?? statePalette.IDLE;
  const optimalAngle = optimalAngleMap[materialProfile] ?? 50.4;
  const moisture = moistureMap[materialProfile] ?? 13.6;
  const bedAngleDelta = Math.abs((state.bed_angle_deg ?? 0) - optimalAngle);
  const loadCellValue = Math.max(0, 3.4 + fusion.residue_risk * 4.6 + (sensors.vibration_g ?? 0) * 1.6);
  const acousticConfidence = clamp((sensors.acoustic_db ?? 0) / 900 + fusion.residue_risk * 0.55);
  const cameraConfidence = clamp(fusion.confidence);
  const ultrasonicValue = clamp(1 - (sensors.lidar_mm ?? 0) / 120, 0, 1);

  const trends = {
    load: (latestHistory?.risk ?? 0) - (previousHistory?.risk ?? 0),
    acoustic: (latestHistory?.acoustic ?? 0) - (previousHistory?.acoustic ?? 0),
    camera: (fusion.confidence ?? 0) - (previousHistory?.risk ?? 0),
    ultrasonic: (latestHistory?.lidar ?? 0) - (previousHistory?.lidar ?? 0)
  };

  const displayedStep = dumpCycle?.active ? dumpCycle.stage : (cycleSteps[phaseIndex] ?? 'LOAD');

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[#1F1F26] bg-[#0F0F12] text-[var(--text-primary)]">
      <div className="sticky top-0 z-10 border-b border-[#1F1F26] bg-[#0F0F12]/95 px-2 sm:px-3 md:px-4 py-3 md:py-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-sm bg-[var(--yellow)] text-[#0F0F12] shadow-[0_0_20px_rgba(245,168,0,0.25)]">
            <span className="heading text-xs sm:text-sm font-bold tracking-[0.15em]">SB</span>
          </div>
          <div className="min-w-0">
            <p className="heading text-[10px] sm:text-[11px] tracking-[0.35em] text-[var(--yellow)]">SmartBed</p>
            <p className="data text-[18px] sm:text-[26px] leading-none text-[var(--yellow)]">CAT 793-11</p>
            <p className="mt-0.5 sm:mt-1 text-[8px] sm:text-[10px] tracking-[0.34em] text-[var(--text-muted)]">DIGITAL TWIN SIMULATION</p>
          </div>
        </div>

        <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] sm:text-[11px]">
          <span className="relative flex h-2 sm:h-2.5 w-2 sm:w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-30" />
            <span className="relative inline-flex h-full w-full rounded-full bg-[var(--green)] shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
          </span>
          <span className="heading tracking-[0.32em] text-[var(--green)]">LIVE</span>
          <span className="ml-auto rounded-full border border-[#2A2A31] px-1.5 sm:px-2 py-0.5 sm:py-1 text-[8px] sm:text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {connected ? 'backend linked' : 'backend wait'}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-2 sm:px-3 md:px-4 py-3 md:py-4 pb-6 relative z-20">
        <SectionCard title="Status" subtitle="Current dump cycle and material state">
          <div className="rounded-2xl border border-[#1F1F26] bg-[#161619] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">Current State</p>
                <div
                  className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-black"
                  style={{ backgroundColor: currentStateTone.color }}
                >
                  {currentStateLabel === 'DUMPING' ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/40 border-t-black" />
                  ) : null}
                  {currentStateLabel === 'DETECTING' ? <span className="text-sm">◉</span> : null}
                  {currentStateLabel === 'CORRECTING' ? <span className="text-sm">≋</span> : null}
                  {currentStateTone.label}
                </div>
              </div>
              <div className="text-right">
                <p className="heading text-[11px] tracking-[0.28em] text-[var(--yellow)]">Cycle</p>
                <p className="data text-4xl leading-none text-[var(--yellow)]">#{cycleNumber}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#23232b] border-l-4 border-l-[var(--yellow)] bg-[#0f0f12] p-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Bed Angle</p>
                <div className="mt-2">
                  <BedAngleGauge angle={state.bed_angle_deg ?? 0} optimal={optimalAngle} />
                </div>
                <p className="mt-2 text-[10px] text-[var(--text-muted)]">Delta {bedAngleDelta.toFixed(1)}°</p>
              </div>
              <div className="rounded-xl border border-[#23232b] border-l-4 border-l-[var(--blue)] bg-[#0f0f12] p-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Material</p>
                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{materialOptions.find((item) => item.key === materialProfile)?.label ?? 'Mixed'}</p>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">Moisture {moisture.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Scenario" subtitle="Residue load profile and control mode">
          <div className="grid gap-2">
            {scenarioOptions.map((option) => {
              const selected = scenario === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setScenario(option.key)}
                  className="rounded-full border px-3 py-2 text-left transition hover:brightness-110"
                  style={{
                    borderColor: selected ? option.accent : '#23232b',
                    background: selected ? `${option.accent}14` : '#0f0f12',
                    boxShadow: selected ? `0 0 12px ${option.accent}20` : 'none'
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="heading text-sm tracking-[0.22em] text-[var(--text-primary)]">{option.label}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{option.description}</p>
                    </div>
                    <div className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`} style={{ borderColor: selected ? option.accent : '#32323a' }}>
                      {selected ? 'selected' : 'radio'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-[var(--text-muted)]">
            Selection changes particle stickiness, sensor generation, and the expected residue outcome.
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Timeline: {dumpCycle?.active ? `T+${Math.floor((dumpCycle.elapsedMs ?? 0) / 1000)}s · ${dumpCycle.stage}` : 'idle'}
          </p>
        </SectionCard>

        <SectionCard title="Main Controls" subtitle="Cycle actions and elimination tools">
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={startDumpCycle}
              className="rounded-2xl border border-[#F5A800] bg-[var(--yellow)] px-4 py-3 text-left text-sm font-semibold text-black shadow-[0_0_18px_rgba(245,168,0,0.22)] transition hover:shadow-[0_0_24px_rgba(245,168,0,0.35)] hover:brightness-110"
            >
              ▶ START DUMP CYCLE
            </button>
            <button
              type="button"
              onClick={pauseCycle}
              className="rounded-2xl border border-[#2A2A31] bg-[#2A2A31] px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] transition hover:border-[#3A3A41] hover:bg-[#3A3A41]"
            >
              {control.isPaused ? '▶ RESUME' : '⏸ PAUSE'}
            </button>
            <button
              type="button"
              onClick={stopAndResetCycle}
              className="rounded-2xl border border-[#7f1d1d] bg-[#2a0f10] px-4 py-3 text-left text-sm font-semibold text-[#fca5a5] transition hover:border-[#a02020] hover:bg-[#3a1515]"
            >
              ⏹ STOP & RESET
            </button>
            <button
              type="button"
              onClick={triggerVibration}
              className="rounded-2xl border border-[var(--amber)] bg-[rgba(245,158,11,0.12)] px-4 py-3 text-left text-sm font-semibold text-[var(--amber)] transition hover:bg-[rgba(245,158,11,0.24)] hover:shadow-[0_0_12px_rgba(245,158,11,0.2)]"
            >
              ⚡ TRIGGER VIBRATION
            </button>
            <button
              type="button"
              onClick={toggleShowZones}
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                showZones
                  ? 'border-[var(--blue)] bg-[rgba(59,130,246,0.14)] text-[var(--text-primary)] hover:bg-[rgba(59,130,246,0.24)]'
                  : 'border-[#2A2A31] bg-[#0f0f12] text-[var(--text-muted)] hover:border-[var(--blue)] hover:bg-[rgba(59,130,246,0.08)]'
              }`}
            >
              📊 {showZones ? 'HIDE ZONES' : 'SHOW ZONES'}
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Material Override" subtitle="Profile that shapes adhesion and dump angle">
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Material Type</span>
            <select
              value={materialProfile}
              onChange={(event) => setMaterialProfile(event.target.value)}
              className="w-full rounded-2xl border border-[#2A2A31] bg-[#0f0f12] px-3 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--yellow)]"
            >
              {materialOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Selecting changes acoustic baseline, particle stickiness, dump angle, and vibration duration.
          </p>
        </SectionCard>

        <SectionCard title="Sensor Readouts" subtitle="Live values and fusion trend">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SensorCard
              icon="⚖"
              label="LOAD CELL"
              value={`${loadCellValue.toFixed(1)} t`}
              unit="Estimated bed mass"
              confidence={clamp(fusion.residue_risk * 0.7 + 0.2)}
              trend={trends.load}
              detail="Carried residue mass"
              tone="rgba(245,168,0,0.9)"
            />
            <SensorCard
              icon="🎤"
              label="ACOUSTIC"
              value={`${Math.round(sensors.acoustic_db)} Hz`}
              unit={`Δ ${Math.round((sensors.acoustic_db ?? 0) - 847)} Hz from baseline`}
              confidence={acousticConfidence}
              trend={trends.acoustic}
              detail="Dump acoustics"
              tone="rgba(59,130,246,0.9)"
            />
            <SensorCard
              icon="📷"
              label="CAMERA (CV)"
              value={fusion.confidence.toFixed(2)}
              unit="Vision confidence score"
              confidence={cameraConfidence}
              trend={trends.camera}
              detail="Residual adhesion detection"
              tone="rgba(34,197,94,0.9)"
            />
            <SensorCard
              icon="📡"
              label="ULTRASONIC"
              value={`${(sensors.lidar_mm / 10).toFixed(1)} cm`}
              unit="Bed clearance estimate"
              confidence={ultrasonicValue}
              trend={trends.ultrasonic}
              detail="Tailgate opening gap"
              tone="rgba(245,158,11,0.92)"
            />
          </div>
        </SectionCard>

        <ConfidenceGauge value={fusion.residue_risk} />

        <SectionCard title="System Info" subtitle="Compute and inference stack">
          <div className="space-y-1 text-xs text-[var(--text-muted)]">
            <p className="data text-[11px] text-[var(--text-primary)]">Jetson Orin NX | TensorRT | &lt;85ms</p>
            <p className="data text-[11px] text-[var(--text-primary)]">YOLOv8-mining-v2.3 | mAP: 0.94</p>
          </div>
        </SectionCard>
      </div>
    </aside>
  );
}
