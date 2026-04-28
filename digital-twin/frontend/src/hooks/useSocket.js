import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useSimulationStore } from '../store/simulationStore';

const BACKEND = import.meta.env.VITE_BACKEND_URL || `http://localhost:${import.meta.env.VITE_BACKEND_PORT || 5002}`;

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

    socket.connect();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('telemetry');
      socket.off('decision_log');
      socket.disconnect();
    };
  }, [appendDecisionLog, ingestTelemetry, setConnected]);

  return socket;
}
