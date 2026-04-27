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

export const useSimulationStore = create((set) => ({
  connected: false,
  scenario: 'normal',
  state: {
    phase: 'LOADING',
    phase_progress: 0,
    cycle_progress: 0,
    bed_angle_deg: 0,
    speed: 0
  },
  sensors: initialSensors,
  zones: initialZones,
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
        sensors: payload.sensors,
        zones: payload.zones,
        fusion: payload.fusion,
        latencyMs: payload.latency_ms,
        alert: payload.alert,
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
}));
