import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useSimulationStore } from '../store/simulationStore';

const socket = io('http://localhost:5001', {
  transports: ['polling'],
  autoConnect: false
});

export function useSocket() {
  const setConnected = useSimulationStore((s) => s.setConnected);
  const ingestTelemetry = useSimulationStore((s) => s.ingestTelemetry);
  const appendDecisionLog = useSimulationStore((s) => s.appendDecisionLog);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('telemetry', ingestTelemetry);
    socket.on('decision_log', appendDecisionLog);

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
