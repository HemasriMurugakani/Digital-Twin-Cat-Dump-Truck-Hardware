import { useRef } from 'react';
import { useSimulationStore } from '../store/simulationStore';

// Start a polling loop outside of React hooks to avoid impacting hook ordering.
// Returns a stop function.
export function startSimulationPolling(pollInterval = 1500) {
  let mounted = true;
  const store = useSimulationStore;
  const BACKEND = import.meta.env.VITE_BACKEND_URL || `http://localhost:${import.meta.env.VITE_BACKEND_PORT || 5002}`;

  async function tick() {
    try {
      const state = store.getState();
      const { scenario, materialProfile, control, ingestTelemetry, clearControlCommand } = state;

      const response = await fetch(`${BACKEND}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, material_profile: materialProfile, control, dt: 1.5 })
      });

      if (!response.ok || !mounted) return;
      const data = await response.json();
      ingestTelemetry(data);
      if (control && control.command) {
        clearControlCommand();
      }
    } catch (err) {
      // swallow network errors to keep UI responsive
    }
  }

  // run immediately and then on interval
  tick();
  const id = setInterval(tick, pollInterval);

  return () => {
    mounted = false;
    clearInterval(id);
  };
}
