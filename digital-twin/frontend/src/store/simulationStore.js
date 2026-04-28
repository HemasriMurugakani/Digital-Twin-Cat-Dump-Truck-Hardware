import { create } from 'zustand';

const initialSensors = {
  acoustic_db: 0,
  vibration_g: 0,
  thermal_c: 0,
  lidar_mm: 0
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
  scenario: 'partial_residue',
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
  zones: initialZones,
  zoneDetails: buildZoneDetails(initialZones),
  showZones: false,
  cycleNumber: 48,
  cycleSeconds: 0,
  control: initialControl,
  fusion: {
    confidence: 0,
    residue_risk: 0,
    action: 'NO_ACTION',
    rationale: 'Waiting for telemetry stream.'
  },
  latencyMs: 0,
  alert: false,
  bedAngle: 0,
  hydraulicExtension: 0,
  history: [],
  decisionLog: [],

  setConnected: (connected) => set({ connected }),

  setScenario: (scenario) => set({ scenario }),

  setMaterialProfile: (materialProfile) => set({ materialProfile }),

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
      cycleSeconds: 0
    })),

  triggerVibration: () =>
    set((state) => ({
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
      decisionLog: [
        {
          id: `${log.timestamp}-${Math.random().toString(16).slice(2, 8)}`,
          ...log
        },
        ...prev.decisionLog
      ].slice(0, 32)
    }))
  ,

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
