import { useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/simulationStore';

const STAGE = {
  IDLE: 'IDLE',
  DUMPING: 'DUMPING',
  DETECTING: 'DETECTING',
  CARRY_BACK_DETECTED: 'CARRY_BACK_DETECTED',
  CORRECTING: 'CORRECTING',
  VERIFYING: 'VERIFYING',
  CLEAR: 'CLEAR'
};

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function makeZoneValues(active) {
  if (!active) {
    return { FL: 0.08, FC: 0.05, FR: 0.07, RL: 0.06, RC: 0.04, RR: 0.04 };
  }

  return { FL: 0.91, FC: 0.12, FR: 0.09, RL: 0.87, RC: 0.11, RR: 0.08 };
}

function playTone({ frequency = 220, duration = 0.25, gain = 0.06 } = {}) {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;

    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.value = frequency;
    gainNode.gain.value = gain;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const startAt = audioContext.currentTime;
    oscillator.start(startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.stop(startAt + duration + 0.02);
    oscillator.onended = () => {
      audioContext.close().catch(() => {});
    };
  } catch {
    // Audio is best-effort only.
  }
}

function getStage(elapsedMs, residueScenario) {
  if (elapsedMs < 6000) return STAGE.DUMPING;
  if (elapsedMs < 7000) return STAGE.DETECTING;
  if (elapsedMs < 7200 && residueScenario) return STAGE.CARRY_BACK_DETECTED;
  if (elapsedMs < 18000 && residueScenario) return STAGE.CORRECTING;
  if (elapsedMs < 20000) return STAGE.VERIFYING;
  if (elapsedMs < 23000) return STAGE.CLEAR;
  return STAGE.IDLE;
}

function getBackendPhase(elapsedMs) {
  if (elapsedMs < 4000) return 'DUMP_RAISE';
  if (elapsedMs < 6000) return 'DUMP_HOLD';
  if (elapsedMs < 20000) return 'DUMP_HOLD';
  if (elapsedMs < 23000) return 'DUMP_LOWER';
  return 'RETURN';
}

function buildFusionForStage(stage, residueScenario) {
  if (stage === STAGE.CARRY_BACK_DETECTED) {
    return {
      confidence: 0.87,
      residue_risk: 0.87,
      action: 'ENGAGE_ELIMINATION_SEQUENCE',
      rationale: '[T+7s] DECISION — carry_back CONFIRMED | fused_score: 0.87 > 0.65'
    };
  }

  if (stage === STAGE.CORRECTING) {
    return {
      confidence: 0.58,
      residue_risk: 0.58,
      action: 'MONITOR_AND_PREPARE',
      rationale: '[T+7s] ACTION — vibration_seq INITIATED'
    };
  }

  if (stage === STAGE.VERIFYING) {
    return {
      confidence: residueScenario ? 0.12 : 0.08,
      residue_risk: residueScenario ? 0.12 : 0.08,
      action: 'NO_ACTION',
      rationale: '[T+18s] RESCAN — residue CLEARED ✓'
    };
  }

  if (stage === STAGE.DETECTING) {
    return {
      confidence: residueScenario ? 0.36 : 0.18,
      residue_risk: residueScenario ? 0.36 : 0.18,
      action: 'MONITOR_AND_PREPARE',
      rationale: '[T+6s] LOAD_CELL — post-dump reading: 5.3t detected'
    };
  }

  if (stage === STAGE.CLEAR) {
    return {
      confidence: 0.12,
      residue_risk: 0.12,
      action: 'NO_ACTION',
      rationale: '[T+20s] STATUS — CLEAR ✓ | Correction: 2 cycles, 8s total'
    };
  }

  return {
    confidence: 0,
    residue_risk: 0,
    action: 'NO_ACTION',
    rationale: '[HH:MM:SS] DUMP_START — bed angle 0° → target 52°'
  };
}

function addTimelineLog(action, rationale, risk) {
  const { addLogEntry } = useSimulationStore.getState();
  addLogEntry({
    timestamp: new Date().toISOString(),
    action,
    rationale,
    risk
  });
}

export function useDumpCycleSequence() {
  const command = useSimulationStore((s) => s.control.command);
  const scenario = useSimulationStore((s) => s.scenario);
  const backendConnected = useSimulationStore((s) => s.backendConnected);
  const sequenceRef = useRef({ active: false, startedAt: 0, rafId: 0, residueScenario: false, fired: new Set() });

  useEffect(() => {
    if (command === 'STOP_RESET') {
      const previous = sequenceRef.current;
      if (previous.rafId) {
        cancelAnimationFrame(previous.rafId);
      }
      sequenceRef.current = { active: false, startedAt: 0, rafId: 0, residueScenario: false, fired: new Set() };
      useSimulationStore.setState((state) => ({
        dumpCycle: {
          ...state.dumpCycle,
          active: false,
          stage: STAGE.IDLE,
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
        }
      }));
      return;
    }

    if (backendConnected || command !== 'START_DUMP_CYCLE' || sequenceRef.current.active) {
      return;
    }

    const residueScenario = scenario !== 'empty_truck';
    const startedAt = performance.now();
    const fired = new Set();
    const sequence = {
      active: true,
      startedAt,
      rafId: 0,
      residueScenario,
      fired
    };
    sequenceRef.current = sequence;

    useSimulationStore.setState((state) => ({
      dumpCycle: {
        ...state.dumpCycle,
        active: true,
        stage: STAGE.DUMPING,
        startedAt: Date.now(),
        elapsedMs: 0,
        tailgateOpen: false,
        cycleComplete: false,
        residueScenario,
        vibrationCycle: 0,
        scanActive: false,
        warningLights: false,
        cycleBadge: false,
        autoRotatePaused: true
      },
      dumpState: STAGE.DUMPING,
      alert: false,
      autoRotate: false,
      showParticles: true,
      state: {
        ...state.state,
        phase: getBackendPhase(0),
        phase_progress: 0,
        cycle_progress: 0,
        bed_angle_deg: 0,
        elapsed_s: 0,
        speed: 0
      },
      bedAngle: 0,
      hydraulicExtension: 0,
      fusedScore: 0,
      fusedConfidence: 0,
      predictionResult: 'EMPTY',
      predictionStatus: 'LOW',
      fusion: {
        ...state.fusion,
        confidence: 0,
        residue_risk: 0,
        action: 'NO_ACTION',
        rationale: '[HH:MM:SS] DUMP_START — bed angle 0° → target 52°'
      }
    }));
    addTimelineLog('DUMP_START', '[HH:MM:SS] DUMP_START — bed angle 0° → target 52°', 0);

    const tick = (now) => {
      if (useSimulationStore.getState().backendConnected) {
        sequence.active = false;
        return;
      }
      const elapsedMs = now - startedAt;
      const stage = getStage(elapsedMs, residueScenario);
      const backendPhase = getBackendPhase(elapsedMs);
      const finished = elapsedMs >= 23000;
      const tailgateOpen = elapsedMs >= 1500 && elapsedMs < 20000;
      const scanning = elapsedMs >= 6200 && elapsedMs < 20000;
      const warningLights = residueScenario && elapsedMs >= 7000 && elapsedMs < 20000;
      const bedAngle = elapsedMs < 4000
        ? 52.1 * clamp(elapsedMs / 4000, 0, 1)
        : elapsedMs < 20000
          ? 52.1
          : Math.max(0, 52.1 * (1 - clamp((elapsedMs - 20000) / 3000, 0, 1)));
      const hydraulicExtension = clamp(bedAngle / 52.1, 0, 1);
      const correctionOffset = stage === STAGE.CORRECTING
        ? 1.5 * Math.exp(-0.15 * Math.max(0, elapsedMs - 7200) / 1000) * Math.sin(2 * Math.PI * 25 * Math.max(0, elapsedMs - 7200) / 1000)
        : 0;
      const displayAngle = Math.max(0, Math.min(54, bedAngle + correctionOffset));
      const fusion = buildFusionForStage(stage, residueScenario);
      const loadCell = stage === STAGE.DETECTING || stage === STAGE.CORRECTING || stage === STAGE.VERIFYING
        ? stage === STAGE.VERIFYING
          ? 0.4
          : stage === STAGE.CORRECTING
            ? 2.1
            : 5.3
        : 0;
      const acoustic = stage === STAGE.DETECTING || stage === STAGE.CORRECTING || stage === STAGE.VERIFYING
        ? stage === STAGE.DETECTING
          ? 791
          : stage === STAGE.CORRECTING
            ? 730
            : 675
        : 0;
      const cameraZones = stage === STAGE.CARRY_BACK_DETECTED || stage === STAGE.CORRECTING
        ? ['FL', 'RL']
        : stage === STAGE.VERIFYING
          ? []
          : [];
      const zoneValues = stage === STAGE.CARRY_BACK_DETECTED || stage === STAGE.CORRECTING
        ? makeZoneValues(true)
        : stage === STAGE.VERIFYING || stage === STAGE.CLEAR
          ? makeZoneValues(false)
          : useSimulationStore.getState().zones;

      useSimulationStore.setState((state) => ({
        dumpCycle: {
          ...state.dumpCycle,
          active: !finished,
          stage: finished ? STAGE.IDLE : stage,
          elapsedMs,
          tailgateOpen,
          cycleComplete: stage === STAGE.CLEAR,
          residueScenario,
          vibrationCycle: stage === STAGE.CORRECTING ? (elapsedMs >= 14000 ? 2 : 1) : state.dumpCycle.vibrationCycle,
          scanActive: scanning,
          warningLights,
          cycleBadge: elapsedMs >= 20000,
          autoRotatePaused: !finished
        },
        dumpState: finished ? STAGE.IDLE : stage,
        alert: warningLights,
        autoRotate: finished,
        showParticles: true,
        state: {
          ...state.state,
          phase: backendPhase,
          phase_progress: clamp(elapsedMs < 4000 ? elapsedMs / 4000 : elapsedMs < 20000 ? 1 : 1 - ((elapsedMs - 20000) / 3000), 0, 1),
          cycle_progress: clamp(elapsedMs / 23000, 0, 1),
          bed_angle_deg: displayAngle,
          elapsed_s: Number((elapsedMs / 1000).toFixed(3)),
          speed: stage === STAGE.IDLE ? 0 : 3.2
        },
        bedAngle: displayAngle,
        hydraulicExtension,
        sensors: {
          ...state.sensors,
          acoustic_db: stage === STAGE.DETECTING ? 79.1 : stage === STAGE.CORRECTING ? 76.4 : stage === STAGE.VERIFYING ? 69.8 : state.sensors.acoustic_db,
          vibration_g: stage === STAGE.CORRECTING ? 0.86 : stage === STAGE.VERIFYING ? 0.46 : state.sensors.vibration_g,
          thermal_c: stage === STAGE.DETECTING ? 39.2 : state.sensors.thermal_c,
          lidar_mm: stage === STAGE.VERIFYING ? 142 : stage === STAGE.DETECTING ? 48 : state.sensors.lidar_mm
        },
        sensorReadings: {
          ...state.sensorReadings,
          loadCell: {
            ...state.sensorReadings.loadCell,
            value: loadCell,
            tonnes: loadCell,
            confidence: stage === STAGE.VERIFYING ? 0.96 : stage === STAGE.CLEAR ? 0.99 : stage === STAGE.CORRECTING ? 0.54 : 0.87
          },
          acoustic: {
            ...state.sensorReadings.acoustic,
            value: acoustic,
            frequency: acoustic,
            deviation: acoustic ? acoustic - 847 : 0,
            confidence: stage === STAGE.DETECTING ? 0.91 : stage === STAGE.CORRECTING ? 0.72 : stage === STAGE.VERIFYING ? 0.62 : 0.08
          },
          camera: {
            ...state.sensorReadings.camera,
            value: stage === STAGE.CARRY_BACK_DETECTED ? 0.87 : stage === STAGE.CORRECTING ? 0.72 : stage === STAGE.VERIFYING ? 0.08 : 0,
            zones: cameraZones,
            confidence: stage === STAGE.CARRY_BACK_DETECTED ? 0.87 : stage === STAGE.CORRECTING ? 0.74 : stage === STAGE.VERIFYING ? 0.96 : 0.12
          },
          ultrasonic: {
            ...state.sensorReadings.ultrasonic,
            value: stage === STAGE.VERIFYING ? 0.02 : stage === STAGE.CLEAR ? 0.05 : 0.48,
            distanceCm: stage === STAGE.VERIFYING ? 142 : stage === STAGE.CLEAR ? 180 : 48,
            confidence: stage === STAGE.VERIFYING ? 0.96 : stage === STAGE.CLEAR ? 0.99 : 0.66
          }
        },
        zones: zoneValues,
        zoneDetails: Object.entries(zoneValues).reduce((acc, [key, value]) => {
          const residue = value >= 0.55;
          acc[key] = {
            residue,
            tonnes: residue ? Number((value * 3).toFixed(1)) : 0,
            confidence: Number(value.toFixed(4))
          };
          return acc;
        }, {}),
        fusion,
        fusedConfidence: fusion.confidence,
        fusedScore: fusion.residue_risk,
        predictionResult: fusion.result ?? (fusion.residue_risk >= 0.5 ? 'RESIDUE' : 'EMPTY'),
        predictionStatus: fusion.status ?? (fusion.confidence >= 0.75 ? 'HIGH' : fusion.confidence >= 0.45 ? 'MEDIUM' : 'LOW'),
        latencyMs: 0.18,
      }));

      if (!fired.has('a1') && elapsedMs >= 1500) {
        fired.add('a1');
        playTone({ frequency: 178, duration: 0.24, gain: 0.07 });
        addTimelineLog('TAILGATE_OPEN', '[T+1.5s] TAILGATE — opened | particles begin falling out', 0.04);
      }
      if (!fired.has('a2') && elapsedMs >= 4000) {
        fired.add('a2');
        addTimelineLog('BED_RAISED', '[T+4s] BED_RAISED — angle: 52.1° | material discharge in progress', 0.12);
      }
      if (!fired.has('a3') && elapsedMs >= 6000) {
        fired.add('a3');
        addTimelineLog('LOAD_CELL', '[T+6s] LOAD_CELL — post-dump reading: 5.3t detected', 0.36);
      }
      if (!fired.has('a4') && elapsedMs >= 6100) {
        fired.add('a4');
        addTimelineLog('ACOUSTIC', '[T+6s] ACOUSTIC — peak: 791Hz | Δ-56Hz from baseline', 0.36);
      }
      if (!fired.has('a5') && elapsedMs >= 6200) {
        fired.add('a5');
        addTimelineLog('CAMERA', '[T+6s] CAMERA — scanning zones...', 0.36);
      }
      if (!fired.has('a6') && elapsedMs >= 6800) {
        fired.add('a6');
        addTimelineLog('CAMERA_ZONES', residueScenario
          ? '[T+6s] CAMERA — residue_zones: [FL, RL] detected'
          : '[T+6s] CAMERA — residue_zones: [] detected',
        residueScenario ? 0.87 : 0.14);
      }
      if (residueScenario && !fired.has('a7') && elapsedMs >= 7000) {
        fired.add('a7');
        addTimelineLog('DECISION', '[T+7s] DECISION — carry_back CONFIRMED | fused_score: 0.87 > 0.65', 0.87);
      }
      if (residueScenario && !fired.has('a8') && elapsedMs >= 7200) {
        fired.add('a8');
        playTone({ frequency: 220, duration: 0.18, gain: 0.05 });
        addTimelineLog('VIBRATION_SEQ', '[T+7s] ACTION — vibration_seq INITIATED', 0.87);
      }
      if (residueScenario && !fired.has('a9') && elapsedMs >= 11000) {
        fired.add('a9');
        addTimelineLog('VIBRATION_COMPLETE_1', '[T+11s] VIBRATION — cycle_1 COMPLETE', 0.54);
        addTimelineLog('RESCAN_PARTIAL', '[T+11s] RESCAN — residue PARTIAL (2.1t)', 0.54);
      }
      if (residueScenario && !fired.has('a10') && elapsedMs >= 14000) {
        fired.add('a10');
        playTone({ frequency: 235, duration: 0.18, gain: 0.05 });
        addTimelineLog('VIBRATION_SEQ_2', '[T+14s] ACTION — vibration_seq_2 INITIATED', 0.54);
      }
      if (residueScenario && !fired.has('a11') && elapsedMs >= 18000) {
        fired.add('a11');
        addTimelineLog('VIBRATION_COMPLETE_2', '[T+18s] VIBRATION — cycle_2 COMPLETE', 0.12);
        addTimelineLog('RESCAN_CLEARED', '[T+18s] RESCAN — residue CLEARED ✓', 0.12);
      }
      if (!fired.has('a12') && elapsedMs >= 20000) {
        fired.add('a12');
        addTimelineLog('CLEAR_STATUS', '[T+20s] STATUS — CLEAR ✓ | Correction: 2 cycles, 8s total', 0.12);
      }
      if (!fired.has('a13') && finished) {
        fired.add('a13');
        addTimelineLog('RETURN_IDLE', '[T+23s] State → IDLE | Cycle count incremented | Auto-rotate resumes', 0);
      }

      if (!finished) {
        sequence.rafId = requestAnimationFrame(tick);
      } else {
        sequence.active = false;
        useSimulationStore.setState((state) => ({
          dumpCycle: {
            ...state.dumpCycle,
            active: false,
            stage: STAGE.IDLE,
            tailgateOpen: false,
            cycleComplete: false,
            warningLights: false,
            scanActive: false,
            cycleBadge: true,
            autoRotatePaused: false
          },
          dumpState: STAGE.IDLE,
          alert: false,
          autoRotate: true,
          cycleNumber: state.cycleNumber + 1
        }));
      }
    };

    sequence.rafId = requestAnimationFrame(tick);

    return () => {
      if (sequence.rafId) {
        cancelAnimationFrame(sequence.rafId);
      }
      sequenceRef.current = { active: false, startedAt: 0, rafId: 0, residueScenario: false, fired: new Set() };
    };
  }, [backendConnected, command, scenario]);
}
