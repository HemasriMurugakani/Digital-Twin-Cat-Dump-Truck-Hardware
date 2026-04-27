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
    bed_angle_deg: 0
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
  history: [],
  decisionLog: [],

  setConnected: (connected) => set({ connected }),

  setScenario: (scenario) => set({ scenario }),

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

      return {
        state: payload.state,
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
