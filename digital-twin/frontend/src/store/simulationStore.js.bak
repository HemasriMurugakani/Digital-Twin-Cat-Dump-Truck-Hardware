import { create } from 'zustand';

const initialSensors = {
  acoustic_db: 0,
  vibration_g: 0,
  thermal_c: 0,
  lidar_mm: 0
};

const initialSensorReadings = {
  loadCell: { value: 0, tonnes: 0, confidence: 0 },
  acoustic: { value: 0, frequency: 847, deviation: 0, confidence: 0 },
  camera: { value: 0, zones: [], confidence: 0 },
  ultrasonic: { value: 0, distanceCm: 180, confidence: 0 }
};

const initialZones = {
  FL: 0,
  FC: 0,
  FR: 0,
  RL: 0,
  RC: 0,
  RR: 0
};

const initialControl = {
  isPaused: false,
  command: null,
  vibrationPulseId: 0
};

const initialDumpCycle = {
  active: false,
  stage: 'IDLE',
  startedAt: 0,
  elapsedMs: 0,
  tailgateOpen: false,
  cycleComplete: false,
  residueScenario: false,
  vibrationCycle: 0,
  scanActive: false,
  warningLights: false,
  cycleBadge: false,
  autoRotatePaused: false
};

const initialHistory = {
  load: [],
  acoustic: [],
  camera: [],
  ultrasonic: [],
  fused: [],
  timestamps: []
};

const zoneKeys = Object.keys(initialZones);

function buildZoneDetails(zoneScores = initialZones) {
  return zoneKeys.reduce((acc, zone) => {
    const score = Number(zoneScores?.[zone] ?? 0);
    const residue = score >= 0.55;

    acc[zone] = {
      residue,
      tonnes: residue ? Number((score * 3).toFixed(1)) : 0,
      confidence: Number(score.toFixed(4))
    };

    return acc;
  }, {});
}

export const useSimulationStore = create((set) => ({
  connected: false,
  truckId: 'CAT-793-11',
  truckModel: 'Caterpillar 793F',
  dumpState: 'IDLE',
  bedAngle: 0,
  hydraulicExtension: 0,
  vibrationActive: false,
  vibrationAmplitude: 0,
  scenario: 'partial_residue',
  materialType: 'Wet clay / fine ore',
  moisture: 18.4,
  materialProfile: 'mixed',
  state: {
    phase: 'LOADING',
    phase_progress: 0,
    cycle_progress: 0,
    bed_angle_deg: 0,
    elapsed_s: 0,
    speed: 0
  },
  sensors: initialSensors,
  sensorReadings: initialSensorReadings,
  zones: initialZones,
  zoneDetails: buildZoneDetails(initialZones),
  showZones: false,
  cycleNumber: 48,
  cycleSeconds: 0,
  control: initialControl,
  dumpCycle: initialDumpCycle,
  fusedScore: 0,
  fusedConfidence: 0,
  predictionResult: 'EMPTY',
  predictionStatus: 'LOW',
  fusion: {
    confidence: 0,
    residue_risk: 0,
    action: 'NO_ACTION',
    rationale: 'Waiting for telemetry stream.'
  },
  latencyMs: 0,
  alert: false,
  showParticles: true,
  autoRotate: false,
  history: [],
  historyBySignal: initialHistory,
  aiLog: [],
  decisionLog: [],

  setConnected: (connected) => set({ connected }),

  setScenario: (scenario) => set({ scenario }),

  setMaterialProfile: (materialProfile) => set({ materialProfile }),

  setMaterial: (materialType) => set({ materialType }),

  startDumpCycle: () =>
    set((state) => ({
      control: {
        ...state.control,
        isPaused: false,
        command: 'START_DUMP_CYCLE'
      }
    })),

  pauseCycle: () =>
    set((state) => ({
      control: {
        ...state.control,
        isPaused: !state.control.isPaused,
        command: state.control.isPaused ? 'START_DUMP_CYCLE' : 'PAUSE'
      }
    })),

  stopAndResetCycle: () =>
    set((state) => ({
      control: {
        ...state.control,
        isPaused: true,
        command: 'STOP_RESET'
      },
      dumpCycle: { ...initialDumpCycle },
      cycleSeconds: 0
    })),

  triggerVibration: () =>
    set((state) => ({
      dumpState: 'CORRECTING',
      vibrationActive: true,
      vibrationAmplitude: 1,
      control: {
        ...state.control,
        vibrationPulseId: state.control.vibrationPulseId + 1,
        command: 'TRIGGER_VIBRATION'
      }
    })),

  clearControlCommand: () =>
    set((state) => ({
      control: {
        ...state.control,
        command: null
      }
    })),

  toggleShowZones: () => set((state) => ({ showZones: !state.showZones })),

  toggleZones: () => set((state) => ({ showZones: !state.showZones })),

  stopReset: () =>
    set(() => ({
      dumpState: 'IDLE',
      bedAngle: 0,
      hydraulicExtension: 0,
      vibrationActive: false,
      vibrationAmplitude: 0,
      control: {
        ...initialControl
      }
    })),

  startDump: () =>
    set((state) => ({
      dumpState: 'DUMPING',
      cycleNumber: state.cycleNumber + 1,
      control: {
        ...state.control,
        command: 'START_DUMP_CYCLE'
      }
    })),

  updateSensors: (data) =>
    set((state) => ({
      sensors: { ...state.sensors, ...data },
      sensorReadings: {
        ...state.sensorReadings,
        ...(data.loadCell ? { loadCell: { ...state.sensorReadings.loadCell, ...data.loadCell } } : {}),
        ...(data.acoustic ? { acoustic: { ...state.sensorReadings.acoustic, ...data.acoustic } } : {}),
        ...(data.camera ? { camera: { ...state.sensorReadings.camera, ...data.camera } } : {}),
        ...(data.ultrasonic ? { ultrasonic: { ...state.sensorReadings.ultrasonic, ...data.ultrasonic } } : {})
      }
    })),

  updateZones: (zones) =>
    set(() => ({
      zones,
      zoneDetails: buildZoneDetails(zones)
    })),

  updateFusion: (result) =>
    set(() => ({
      fusedScore: result.score ?? result.confidence ?? 0,
      fusedConfidence: result.confidence ?? 0,
      predictionResult: result.result ?? (result.residue_risk >= 0.5 ? 'RESIDUE' : 'EMPTY'),
      predictionStatus: result.status ?? (result.confidence >= 0.75 ? 'HIGH' : result.confidence >= 0.45 ? 'MEDIUM' : 'LOW')
    })),

  addLogEntry: (entry) =>
    set((state) => ({
      aiLog: [entry, ...(state.aiLog ?? [])].slice(0, 100)
    })),

  updateHistory: (sample) =>
    set((state) => ({
      history: [...state.history.slice(-29), sample],
      historyBySignal: {
        load: [...state.historyBySignal.load.slice(-29), sample.load ?? 0],
        acoustic: [...state.historyBySignal.acoustic.slice(-29), sample.acoustic ?? 0],
        camera: [...state.historyBySignal.camera.slice(-29), sample.camera ?? 0],
        ultrasonic: [...state.historyBySignal.ultrasonic.slice(-29), sample.ultrasonic ?? 0],
        fused: [...state.historyBySignal.fused.slice(-29), sample.fused ?? 0],
        timestamps: [...state.historyBySignal.timestamps.slice(-29), sample.timestamp ?? Date.now()]
      }
    })),

  setBedKinematics: ({ bedAngle, hydraulicExtension }) =>
    set((prev) => {
      const nextBedAngle = Number.isFinite(bedAngle) ? bedAngle : prev.bedAngle;
      const nextExtension = Number.isFinite(hydraulicExtension)
        ? hydraulicExtension
        : prev.hydraulicExtension;

      if (
        Math.abs(nextBedAngle - prev.bedAngle) < 0.01 &&
        Math.abs(nextExtension - prev.hydraulicExtension) < 0.001
      ) {
        return prev;
      }

      return {
        bedAngle: nextBedAngle,
        hydraulicExtension: nextExtension
      };
    }),

  ingestTelemetry: (payload) =>
    set((prev) => {
      if (prev.dumpCycle?.active) {
        return {
          latencyMs: payload.latency_ms ?? prev.latencyMs,
          history: [...prev.history.slice(-59), {
            t: payload.timestamp,
            acoustic: payload.sensors?.acoustic_db ?? prev.sensors.acoustic_db,
            vibration: payload.sensors?.vibration_g ?? prev.sensors.vibration_g,
            thermal: payload.sensors?.thermal_c ?? prev.sensors.thermal_c,
            lidar: payload.sensors?.lidar_mm ?? prev.sensors.lidar_mm,
            risk: prev.fusion?.residue_risk ?? 0
          }],
          historyBySignal: {
            load: [...prev.historyBySignal.load.slice(-29), prev.sensorReadings.loadCell.value ?? 0],
            acoustic: [...prev.historyBySignal.acoustic.slice(-29), prev.sensorReadings.acoustic.value ?? 0],
            camera: [...prev.historyBySignal.camera.slice(-29), prev.sensorReadings.camera.value ?? 0],
            ultrasonic: [...prev.historyBySignal.ultrasonic.slice(-29), prev.sensorReadings.ultrasonic.value ?? 0],
            fused: [...prev.historyBySignal.fused.slice(-29), prev.fusion?.residue_risk ?? 0],
            timestamps: [...prev.historyBySignal.timestamps.slice(-29), payload.timestamp ?? Date.now()]
          }
        };
      }

      const incomingZones = payload.zones ?? prev.zones;
      const cycleProgress = Number(payload.state?.cycle_progress ?? prev.state.cycle_progress ?? 0);
      const previousCycleProgress = Number(prev.state?.cycle_progress ?? 0);
      const wrappedCycle = previousCycleProgress > 0.9 && cycleProgress < 0.2;
      const point = {
        t: payload.timestamp,
        acoustic: payload.sensors.acoustic_db,
        vibration: payload.sensors.vibration_g,
        thermal: payload.sensors.thermal_c,
        lidar: payload.sensors.lidar_mm,
        risk: payload.fusion.residue_risk
      };

      const phaseSpeedMap = {
        LOADING: 0,
        HAUL: 3.2,
        DUMP_RAISE: 0.6,
        DUMP_HOLD: 0,
        DUMP_LOWER: 0.4,
        RETURN: 2.6,
        IDLE: 0
      };

      return {
        state: {
          ...payload.state,
          speed:
            payload.state?.speed ??
            phaseSpeedMap[payload.state?.phase] ??
            prev.state.speed ??
            0
        },
        sensors: payload.sensors ?? prev.sensors,
        zones: incomingZones,
        zoneDetails: buildZoneDetails(incomingZones),
        materialProfile: payload.material_profile ?? prev.materialProfile,
        cycleNumber: wrappedCycle ? prev.cycleNumber + 1 : prev.cycleNumber,
        cycleSeconds: Number(payload.state?.elapsed_s ?? prev.cycleSeconds ?? 0),
        fusion: payload.fusion ?? prev.fusion,
        latencyMs: payload.latency_ms ?? prev.latencyMs,
        alert: payload.alert ?? prev.alert,
        history: [...prev.history.slice(-59), point]
      };
    }),

  appendDecisionLog: (log) =>
    set((prev) => ({
      aiLog: [
        {
          timestamp: log.timestamp,
          action: log.action,
          rationale: log.rationale,
          risk: log.risk
        },
        ...prev.aiLog
      ].slice(0, 100),
      decisionLog: [
        {
          id: `${log.timestamp}-${Math.random().toString(16).slice(2, 8)}`,
          ...log
        },
        ...prev.decisionLog
      ].slice(0, 32)
    })),

  acknowledgeAlert: () => set(() => ({ alert: false }))
  ,

  triggerCorrection: () =>
    set((state) => ({
      control: {
        ...state.control,
        vibrationPulseId: state.control.vibrationPulseId + 1,
        command: 'TRIGGER_CORRECTION'
      }
    }))
}));
