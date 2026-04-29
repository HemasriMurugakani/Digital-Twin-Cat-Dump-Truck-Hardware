/**
 * Demo Scenarios for Section 16 Demo Mode Integration
 * Three automated scenarios for hackathon presentation:
 * 1. Empty Bed: Clean scenario showing baseline acoustic (847Hz), no load
 * 2. Carry-Back: Full residue scenario with 8.5t load, detection at 87%
 * 3. Degraded Mode: Camera offline, 3-sensor fusion at 82% confidence
 */

export async function runEmptyBedScenario(store, speed = 1) {
  // Set material profile for empty bed
  store.setMaterialProfile('mixed');
  store.setMaterialProfileDetails({
    density: 1.0,
    moisture: 0,
    load_tonnes: 0
  });
  
  // Reset and start cycle
  store.stopAndResetCycle();
  store.startDumpCycle();
  
  // Simulate 23-second cycle with low confidence
  const phaseSequence = [
    { phase: 'POSITIONING', duration: 2 },
    { phase: 'PRE_SCAN', duration: 3 },
    { phase: 'SCANNING', duration: 8 },
    { phase: 'ANALYSIS', duration: 6 },
    { phase: 'DECISION', duration: 2 },
    { phase: 'CLEAR', duration: 1 },
    { phase: 'RETURN', duration: 1 }
  ];
  
  for (const { phase, duration } of phaseSequence) {
    await new Promise(resolve => setTimeout(resolve, (duration * 150) / speed));

    const confidence = 0.08;
    const residueRisk = 0.02;
    
    store.appendDecisionLog({
      timestamp: new Date().toLocaleTimeString(),
      action: `PHASE: ${phase}`,
      rationale: `Acoustic baseline 847Hz, load delta 0kg, confidence ${(confidence * 100).toFixed(0)}%`,
      risk: 'MINIMAL',
      phase,
      confidence,
      residueRisk
    });
  }
  
  // Final confirmation
  store.appendDecisionLog({
    timestamp: new Date().toLocaleTimeString(),
    action: 'VALIDATION_COMPLETE',
    rationale: 'BED CONFIRMED EMPTY ✓',
    risk: 'CLEAR',
    confidence: 0.08
  });
}

export async function runCarryBackScenario(store, speed = 1) {
  // Set material profile for full residue scenario
  store.setMaterialProfile('wet_clay');
  store.setMaterialProfileDetails({
    density: 2.4,
    moisture: 8.5,
    load_tonnes: 8.5
  });
  
  // Ensure degraded mode is OFF for this scenario
  store.setDegradedMode(false);
  
  // Reset and start cycle
  store.stopAndResetCycle();
  store.startDumpCycle();
  
  // Simulate detection through all 7 phases
  const phaseSequence = [
    { phase: 'POSITIONING', residueRisk: 0.05, confidence: 0.15 },
    { phase: 'PRE_SCAN', residueRisk: 0.18, confidence: 0.35 },
    { phase: 'SCANNING', residueRisk: 0.42, confidence: 0.58 },
    { phase: 'DETECTING', residueRisk: 0.68, confidence: 0.87 },
    { phase: 'CARRY_BACK_DETECTED', residueRisk: 0.85, confidence: 0.87 },
    { phase: 'CORRECTING', residueRisk: 0.45, confidence: 0.72 },
    { phase: 'CLEAR', residueRisk: 0.12, confidence: 0.28 }
  ];
  
  const durationPerPhase = 3.3; // ~23 seconds total
  
  for (const { phase, residueRisk, confidence } of phaseSequence) {
    await new Promise(resolve => setTimeout(resolve, (durationPerPhase * 150) / speed));
    
    const acousticShift = phase === 'CARRY_BACK_DETECTED' 
      ? `847Hz → 791Hz (${(residueRisk * 100).toFixed(0)}% shift)`
      : 'stable baseline';
    
    const decisionMsg = phase === 'CARRY_BACK_DETECTED'
      ? `🚨 CARRY_BACK DETECTED | 4-sensor consensus 87% | Acoustic frequency shift | <100ms response`
      : phase === 'CORRECTING'
        ? `CORRECTING | Vibration pulse applied | Angle adjustment active`
        : `${phase} | Confidence ${(confidence * 100).toFixed(0)}%`;
    
    store.appendDecisionLog({
      timestamp: new Date().toLocaleTimeString(),
      action: phase,
      rationale: acousticShift,
      risk: residueRisk > 0.65 ? 'HIGH' : residueRisk > 0.35 ? 'MEDIUM' : 'LOW',
      phase,
      confidence,
      residueRisk
    });

    store.appendDecisionLog({
      timestamp: new Date().toLocaleTimeString(),
      action: decisionMsg,
      rationale: acousticShift,
      risk: residueRisk > 0.65 ? 'HIGH' : residueRisk > 0.35 ? 'MEDIUM' : 'LOW'
    });
  }
  
  // Add hardware ROI talking point
  store.appendDecisionLog({
    timestamp: new Date().toLocaleTimeString(),
    action: 'SYSTEM_EFFICIENCY',
    rationale: 'Hardware cost $1,815 | 27-day payback | 2.2t residue saved per cycle',
    risk: 'ECONOMIC_BENEFIT'
  });
}

export async function runDegradedModeScenario(store, speed = 1) {
  // Enable degraded mode - camera offline
  store.setDegradedMode(true);
  
  // Set material profile for residue with degraded mode
  store.setMaterialProfile('fine_ore');
  store.setMaterialProfileDetails({
    density: 2.0,
    moisture: 6.5,
    load_tonnes: 5.2
  });
  
  // Reset and start cycle
  store.stopAndResetCycle();
  store.startDumpCycle();
  
  // Simulate detection with 3-sensor fusion (load, acoustic, ultrasonic)
  const phaseSequence = [
    { phase: 'POSITIONING', sensorFusion: 0.15 },
    { phase: 'PRE_SCAN', sensorFusion: 0.32 },
    { phase: 'SCANNING', sensorFusion: 0.58 },
    { phase: 'DETECTING', sensorFusion: 0.82 },
    { phase: 'CARRY_BACK_DETECTED', sensorFusion: 0.82 },
    { phase: 'CORRECTING', sensorFusion: 0.68 },
    { phase: 'CLEAR', sensorFusion: 0.22 }
  ];
  
  const durationPerPhase = 3.3;
  
  for (const { phase, sensorFusion } of phaseSequence) {
    await new Promise(resolve => setTimeout(resolve, (durationPerPhase * 150) / speed));
    
    const sensorStatus = phase === 'CARRY_BACK_DETECTED'
      ? '✓ Load | ✓ Acoustic | ✓ Ultrasonic | ✗ Camera (OFFLINE)'
      : '✓ Load | ✓ Acoustic | ✓ Ultrasonic | ✗ Camera (OFFLINE)';
    
    const resilience = phase === 'CARRY_BACK_DETECTED' 
      ? `3-sensor degraded fusion: ${(sensorFusion * 100).toFixed(0)}% confidence | RESILIENT`
      : `Monitoring with 3 sensors | ${(sensorFusion * 100).toFixed(0)}% confidence`;
    
    store.appendDecisionLog({
      timestamp: new Date().toLocaleTimeString(),
      action: phase,
      rationale: resilience,
      risk: sensorFusion > 0.65 ? 'MEDIUM_CONFIDENCE' : sensorFusion > 0.35 ? 'ELEVATED' : 'LOW',
      phase,
      confidence: sensorFusion,
      sensors: sensorStatus
    });
  }
  
  // Add resilience validation
  store.appendDecisionLog({
    timestamp: new Date().toLocaleTimeString(),
    action: 'RESILIENCE_VALIDATION',
    rationale: 'System maintains 82% detection capability with camera offline | Mission-critical redundancy verified',
    risk: 'FAULT_TOLERANT'
  });
  
  // Disable degraded mode at the end
  await new Promise(resolve => setTimeout(resolve, 500));
  store.setDegradedMode(false);
}

/**
 * Run a specific scenario with speed control
 * speed: multiplier (0.5, 1, 2, 5)
 */
export async function runDemoScenario(scenario, speed = 1, store) {
  const speedMultiplier = speed || 1;
  
  try {
    switch (scenario) {
      case 1:
        await runEmptyBedScenario(store, speedMultiplier);
        break;
      case 2:
        await runCarryBackScenario(store, speedMultiplier);
        break;
      case 3:
        await runDegradedModeScenario(store, speedMultiplier);
        break;
      default:
        console.warn(`Unknown scenario: ${scenario}`);
    }
  } catch (error) {
    console.error(`Error running scenario ${scenario}:`, error);
    store.appendDecisionLog({
      timestamp: new Date().toLocaleTimeString(),
      action: 'ERROR',
      rationale: error.message,
      risk: 'SYSTEM_ERROR'
    });
  }
}
