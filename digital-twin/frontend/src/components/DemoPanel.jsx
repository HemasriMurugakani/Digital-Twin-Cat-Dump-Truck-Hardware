import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSimulationStore } from '../store/simulationStore';
import { runDemoScenario } from './DemoScenarios';
import JudgeTalkingPoints from './JudgeTalkingPoints';

export default function DemoPanel() {
  const [activeScenario, setActiveScenario] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  
  const store = useSimulationStore();

  const handleRunScenario = async (scenario) => {
    setActiveScenario(scenario);
    setIsRunning(true);
    
    try {
      await runDemoScenario(scenario, speed, store);
    } catch (error) {
      console.error('Demo scenario error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setActiveScenario(1);
    setSpeed(1);
    setIsRunning(false);
    store.stopAndResetCycle();
    // Clear decision log
    const emptyLog = { 
      timestamp: new Date().toLocaleTimeString(),
      action: 'DEMO_RESET',
      rationale: 'Demo interface reset',
      risk: 'NONE'
    };
    store.appendDecisionLog(emptyLog);
  };

  const scenarios = [
    { id: 1, label: 'Scenario 1', description: 'Empty Bed', icon: '🟢' },
    { id: 2, label: 'Scenario 2', description: 'Carry-Back', icon: '🚨' },
    { id: 3, label: 'Scenario 3', description: 'Degraded Mode', icon: '⚠️' }
  ];

  const speedOptions = [
    { value: 0.5, label: '0.5×', description: 'Slow' },
    { value: 1, label: '1×', description: 'Normal' },
    { value: 2, label: '2×', description: 'Fast' },
    { value: 5, label: '5×', description: 'Rapid' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.8)] backdrop-blur-sm"
    >
      <div className="grid max-h-[90vh] w-[95%] max-w-5xl gap-4 overflow-hidden rounded-[28px] border border-[#1F1F26] bg-[#0a0a0d] shadow-[0_24px_80px_rgba(0,0,0,0.6)] md:grid-cols-[1fr_280px]">
        
        {/* Main Panel */}
        <motion.div
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-6 overflow-y-auto p-6"
        >
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-[var(--yellow)]">Demo Mode</h2>
            <p className="mt-1 text-sm text-[#808085]">Run automated scenarios for judges</p>
          </div>

          {/* Scenarios */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#808085]">Select Scenario</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {scenarios.map((scenario) => (
                <motion.button
                  key={scenario.id}
                  onClick={() => !isRunning && handleRunScenario(scenario.id)}
                  disabled={isRunning}
                  whileHover={{ scale: isRunning ? 1 : 1.02 }}
                  whileTap={{ scale: isRunning ? 1 : 0.98 }}
                  className={`rounded-lg border px-4 py-3 transition ${
                    activeScenario === scenario.id
                      ? 'border-[var(--yellow)] bg-[rgba(245,168,0,0.12)] text-[var(--yellow)] shadow-[0_0_18px_rgba(245,168,0,0.2)]'
                      : 'border-[#2A2A31] bg-[#141417] text-[#A0A0A6] hover:border-[var(--yellow)] hover:text-[#D0D0D6]'
                  } ${isRunning ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  <div className="text-lg">{scenario.icon}</div>
                  <div className="text-xs font-semibold">{scenario.label}</div>
                  <div className="text-[10px] text-[#808085]">{scenario.description}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Speed Control */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#808085]">Playback Speed</h3>
            <div className="grid gap-2 grid-cols-4">
              {speedOptions.map((option) => (
                <motion.button
                  key={option.value}
                  onClick={() => !isRunning && setSpeed(option.value)}
                  disabled={isRunning}
                  whileHover={{ scale: isRunning ? 1 : 1.02 }}
                  whileTap={{ scale: isRunning ? 1 : 0.98 }}
                  className={`rounded-lg border px-2 py-2.5 transition ${
                    speed === option.value
                      ? 'border-[var(--yellow)] bg-[rgba(245,168,0,0.12)] text-[var(--yellow)]'
                      : 'border-[#2A2A31] bg-[#141417] text-[#A0A0A6] hover:border-[var(--yellow)]'
                  } ${isRunning ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  <div className="text-xs font-bold">{option.label}</div>
                  <div className="text-[9px] text-[#808085]">{option.description}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <motion.button
              onClick={() => handleRunScenario(activeScenario)}
              disabled={isRunning}
              whileHover={{ scale: isRunning ? 1 : 1.02 }}
              whileTap={{ scale: isRunning ? 1 : 0.98 }}
              className={`flex-1 rounded-lg border px-4 py-3 font-semibold transition ${
                isRunning
                  ? 'cursor-not-allowed border-[#2A2A31] bg-[#141417] text-[#808085] opacity-50'
                  : 'border-[var(--yellow)] bg-[rgba(245,168,0,0.18)] text-[var(--yellow)] shadow-[0_0_18px_rgba(245,168,0,0.2)] hover:shadow-[0_0_24px_rgba(245,168,0,0.3)]'
              }`}
            >
              {isRunning ? '▶ Running...' : '▶ Run Scenario'}
            </motion.button>

            <motion.button
              onClick={handleReset}
              disabled={isRunning}
              whileHover={{ scale: isRunning ? 1 : 1.02 }}
              whileTap={{ scale: isRunning ? 1 : 0.98 }}
              className={`rounded-lg border px-4 py-3 font-semibold transition ${
                isRunning
                  ? 'cursor-not-allowed border-[#2A2A31] bg-[#141417] text-[#808085] opacity-50'
                  : 'border-[#2A2A31] bg-[#141417] text-[#A0A0A6] hover:border-[var(--yellow)] hover:text-[#D0D0D6]'
              }`}
            >
              Reset
            </motion.button>
          </div>

          {/* Status Message */}
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-[var(--yellow)] bg-[rgba(245,168,0,0.08)] p-3 text-xs text-[var(--yellow)]"
            >
              ⏱️ Scenario running... Watch the truck scene and sensor dashboard update in real-time
            </motion.div>
          )}
        </motion.div>

        {/* Right Sidebar - Talking Points */}
        <motion.div
          initial={{ x: 20 }}
          animate={{ x: 0 }}
          transition={{ delay: 0.1 }}
          className="hidden overflow-hidden md:flex"
        >
          <JudgeTalkingPoints activeScenario={activeScenario} />
        </motion.div>
      </div>
    </motion.div>
  );
}
