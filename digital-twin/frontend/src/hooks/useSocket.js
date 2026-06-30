import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useSimulationStore } from '../store/simulationStore';

const BACKEND = import.meta.env.VITE_BACKEND_URL || `http://localhost:${import.meta.env.VITE_BACKEND_PORT || 5001}`;

const socket = io(BACKEND, {
  transports: ['polling'],
  autoConnect: false
});

export function useSocket() {
  const setConnected = useSimulationStore((s) => s.setConnected);
  const ingestTelemetry = useSimulationStore((s) => s.ingestTelemetry);
  const appendDecisionLog = useSimulationStore((s) => s.appendDecisionLog);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('telemetry', ingestTelemetry);
    socket.on('decision_log', appendDecisionLog);
    socket.on('hardware_telemetry', (data) => {
      if (!data) return;
      const store = useSimulationStore.getState();
      const mappedAngle = data.angle !== undefined ? data.angle * (45.0 / 32.0) : undefined;
      
      store.updateSensors({
        ultra_left: data.ultra_left,
        ultra_right: data.ultra_right,
        angle: mappedAngle,
        weight: data.weight,
        vibration_g: data.vibration !== undefined ? data.vibration : store.sensors.vibration_g,
        acoustic_db: data.acoustic !== undefined ? data.acoustic : store.sensors.acoustic_db,
        camera: data.camera
      });

      if (mappedAngle !== undefined) {
        store.setBedKinematics({
          bedAngle: mappedAngle,
          hydraulicExtension: mappedAngle / 60
        });
      }

      store.updateHistory({
        timestamp: data.timestamp || Date.now(),
        ultra_left: data.ultra_left,
        ultra_right: data.ultra_right,
        angle: mappedAngle,
        weight: data.weight
      });
    });

    socket.connect();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('telemetry');
      socket.off('decision_log');
      socket.off('hardware_telemetry');
      socket.disconnect();
    };
  }, [appendDecisionLog, ingestTelemetry, setConnected]);

  return socket;
}
