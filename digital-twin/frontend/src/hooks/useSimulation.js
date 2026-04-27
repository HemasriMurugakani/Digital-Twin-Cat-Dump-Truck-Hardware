import { useEffect } from 'react';
import { useSimulationStore } from '../store/simulationStore';

export function useSimulation() {
  const scenario = useSimulationStore((s) => s.scenario);
  const ingestTelemetry = useSimulationStore((s) => s.ingestTelemetry);

  useEffect(() => {
    let isMounted = true;

    const tick = async () => {
      try {
        const response = await fetch('http://localhost:5001/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario, dt: 1.5 })
        });
        if (!response.ok || !isMounted) return;
        const data = await response.json();
        ingestTelemetry(data);
      } catch (error) {
        // Keep UI responsive if backend momentarily disconnects.
      }
    };

    tick();
    const id = setInterval(tick, 1500);

    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, [ingestTelemetry, scenario]);
}
