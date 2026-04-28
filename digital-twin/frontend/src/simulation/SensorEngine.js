export const sensorBounds = {
  acoustic_db: [55, 92],
  vibration_g: [0.25, 1.25],
  thermal_c: [34, 57],
  lidar_mm: [8, 85]
};

const zoneNames = ['FL', 'FC', 'FR', 'RL', 'RC', 'RR'];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothNoise(t, scale = 1) {
  return (
    Math.sin(t * scale * 0.7) +
    Math.sin(t * scale * 1.3) +
    Math.sin(t * scale * 2.1)
  ) / 3;
}

function inferNumericValue(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object') {
    if (typeof value.value === 'number') return value.value;
    if (typeof value.confidence === 'number') return value.confidence;
    if (typeof value.tonnes === 'number') return value.tonnes;
  }
  return fallback;
}

export class SensorEngine {
  constructor() {
    this.time = 0;
    this.stickyParticles = new Set();
    this.emptyResonance = 39.7;
    this.loadedResonance = 27.0;
    this.baselineFreq = 847;
    this.noiseSeed = Math.random() * 1000;
  }

  smoothNoise(t, scale = 1) {
    return smoothNoise(t + this.noiseSeed, scale);
  }

  computeLoadReading(dumpState, bedAngle, scenario, timeInState = 0) {
    const tare = 104700;
    const noise = (Math.random() - 0.5) * 104;

    let residueKg = 0;
    if (scenario === 'RESIDUE_PARTIAL' || scenario === 'partial_residue') residueKg = 5250;
    if (scenario === 'RESIDUE_FULL' || scenario === 'full_residue') residueKg = 7500;

    let materialRemaining = 1.0;
    if (dumpState === 'DUMPING') {
      const slideRate = Math.max(0, (bedAngle - 30) / 22);
      materialRemaining = Math.max(0.15, 1 - slideRate * (scenario === 'RESIDUE_PARTIAL' || scenario === 'partial_residue' ? 0.85 : 0.7));
    }
    if (dumpState === 'DETECTING' || dumpState === 'CARRY_BACK_DETECTED') {
      materialRemaining = scenario === 'EMPTY' ? 0.02 : 0.15;
    }

    const totalKg = tare + residueKg * materialRemaining + noise;
    const residueTonnes = Math.max(0, (totalKg - tare) / 1000);
    const deltaKg = totalKg - tare;
    const snr = Math.abs(deltaKg) / 104;
    const confidence = clamp(snr / 50.5, 0, 0.99);

    return {
      value: totalKg / 150000,
      tonnes: residueTonnes,
      rawKg: totalKg,
      deltaKg,
      confidence,
      timeInState
    };
  }

  computeAcousticReading(dumpState, scenario, timeInState, materialType) {
    const t = this.time;
    const materialFactors = {
      'Wet clay / fine ore': { stickiness: 0.9, dampening: 0.7 },
      'Fine ore': { stickiness: 0.5, dampening: 0.5 },
      'Dry rock': { stickiness: 0.2, dampening: 0.3 },
      Mixed: { stickiness: 0.6, dampening: 0.5 },
      mixed: { stickiness: 0.6, dampening: 0.5 }
    };
    const factor = materialFactors[materialType] ?? { stickiness: 0.5, dampening: 0.5 };

    let peakFreq = this.baselineFreq;
    let amplitude = 0.1;

    if (scenario !== 'EMPTY') {
      const massEffect = scenario === 'RESIDUE_FULL' || scenario === 'full_residue' ? 0.12 : 0.066;
      peakFreq = this.baselineFreq * Math.sqrt(1 / (1 + massEffect / factor.stickiness));
    }

    if (dumpState === 'DUMPING') amplitude = 0.8 + this.smoothNoise(t, 0.5) * 0.2;
    if (dumpState === 'DETECTING') amplitude = 0.6;
    if (dumpState === 'CORRECTING') amplitude = 0.9 + Math.sin(t * 25 * 2 * Math.PI) * 0.1;

    const deviation = peakFreq - this.baselineFreq;
    const noise = (Math.random() - 0.5) * 3;
    const confidence = scenario === 'EMPTY' ? 0.93 : clamp(0.8 + Math.abs(deviation / 100) * 0.15, 0, 0.99);

    let materialClassification = 'UNKNOWN';
    if (Math.abs(deviation) < 10) materialClassification = 'EMPTY';
    else if (deviation < -40) materialClassification = 'WET CLAY';
    else if (deviation < -25) materialClassification = 'FINE ORE';
    else if (deviation < -15) materialClassification = 'DRY ROCK';

    return {
      value: amplitude,
      frequency: peakFreq + noise,
      baseline: this.baselineFreq,
      deviation: deviation + noise,
      amplitude,
      rms: 0.5 + amplitude * 0.3,
      materialClassification,
      confidence,
      timeInState
    };
  }

  computeVisionReading(dumpState, scenario, zones, timeInState) {
    if (dumpState === 'IDLE' || dumpState === 'DUMPING') {
      return { value: 0, zones: {}, confidence: 0, active: false };
    }

    const zoneResults = {};
    for (const zone of zoneNames) {
      let residueProbability = 0;

      if (scenario === 'RESIDUE_PARTIAL' || scenario === 'partial_residue') {
        residueProbability = zone === 'FL' || zone === 'RL' ? 0.94 : 0.08;
      } else if (scenario === 'RESIDUE_FULL' || scenario === 'full_residue') {
        residueProbability = { FL: 0.96, FC: 0.88, FR: 0.91, RL: 0.94, RC: 0.85, RR: 0.82 }[zone];
      }

      const detectionNoise = (Math.random() - 0.5) * 0.05;
      const detected = residueProbability > 0.5;

      zoneResults[zone] = {
        residue: detected,
        confidence: clamp(Math.abs(residueProbability + detectionNoise), 0, 0.99),
        tonnes: detected ? (zone.startsWith('F') ? 2.8 : 2.5) * residueProbability : 0,
        bbox: { x: 0, y: 0, w: 0, h: 0 }
      };
    }

    const anyResidue = Object.values(zoneResults).some((z) => z.residue);
    const maxConf = Math.max(...Object.values(zoneResults).map((z) => z.confidence));

    return {
      value: anyResidue ? maxConf : 0.05,
      zones: zoneResults,
      confidence: maxConf,
      active: dumpState !== 'IDLE',
      timeInState
    };
  }

  computeUltrasonicReading(dumpState, scenario, bedAngle) {
    const bedFloorDist = 2500;

    let residueHeight = 0;
    if ((scenario === 'RESIDUE_PARTIAL' || scenario === 'partial_residue') && dumpState !== 'DUMPING') residueHeight = 590;
    if ((scenario === 'RESIDUE_FULL' || scenario === 'full_residue') && dumpState !== 'DUMPING') residueHeight = 850;

    if (dumpState === 'DUMPING') residueHeight *= Math.max(0, 1 - bedAngle / 52);

    const distanceMm = bedFloorDist - residueHeight;
    const distanceCm = distanceMm / 10;
    const noise = (Math.random() - 0.5) * 10;
    const coverage = residueHeight / bedFloorDist;
    const confidence = residueHeight > 200 ? 0.85 : 0.1;

    return {
      value: coverage,
      distanceMm: distanceMm + noise,
      distanceCm: distanceCm + noise / 10,
      residueHeightMm: residueHeight,
      confidence,
      readings: zoneNames.map(() => distanceMm + (Math.random() - 0.5) * 15)
    };
  }

  update(state) {
    this.time += 0.1;

    const load = this.computeLoadReading(state.dumpState, state.bedAngle, state.scenario, state.timeInState ?? 0);
    const acoustic = this.computeAcousticReading(state.dumpState, state.scenario, state.timeInState ?? 0, state.materialType);
    const vision = this.computeVisionReading(state.dumpState, state.scenario, state.zones, state.timeInState ?? 0);
    const ultrasonic = this.computeUltrasonicReading(state.dumpState, state.scenario, state.bedAngle);

    return { load, acoustic, vision, ultrasonic };
  }
}

export function normalizeSensor(key, value) {
  const [min, max] = sensorBounds[key] ?? [0, 1];
  const ratio = (value - min) / (max - min);
  return clamp(ratio, 0, 1);
}

export function evaluateSensorHealth(sensors) {
  return Object.entries(sensors ?? {}).reduce((acc, [key, value]) => {
    const normalized = normalizeSensor(key, inferNumericValue(value));
    acc[key] = {
      normalized,
      status: normalized > 0.75 ? 'high' : normalized > 0.45 ? 'watch' : 'normal'
    };
    return acc;
  }, {});
}

export function toChartSeries(history) {
  if (Array.isArray(history)) {
    return history.map((item, index) => ({
      idx: index,
      acoustic: item.acoustic,
      vibration: item.vibration,
      thermal: item.thermal,
      lidar: item.lidar,
      risk: item.risk
    }));
  }

  const timestamps = history?.timestamps ?? [];
  const maxLength = Math.max(
    history?.load?.length ?? 0,
    history?.acoustic?.length ?? 0,
    history?.camera?.length ?? 0,
    history?.ultrasonic?.length ?? 0,
    history?.fused?.length ?? 0,
    timestamps.length
  );

  return Array.from({ length: maxLength }, (_, index) => ({
    idx: index,
    acoustic: history?.acoustic?.[index] ?? 0,
    vibration: history?.load?.[index] ?? 0,
    thermal: history?.camera?.[index] ?? 0,
    lidar: history?.ultrasonic?.[index] ?? 0,
    risk: history?.fused?.[index] ?? 0,
    t: timestamps[index]
  }));
}
