"""
Section 11: Dump State Machine with Explicit Transitions

State graph:
  IDLE ↔ DUMPING → DETECTING → CARRY_BACK_DETECTED → CORRECTING → VERIFYING → CLEAR → IDLE
  
Each state represents a distinct phase in the dump cycle residue detection and handling workflow.
Maintains backward compatibility with legacy phase-based simulation (LOADING, HAUL, DUMP_RAISE, etc.).
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Dict


@dataclass
class CycleState:
    """Legacy cycle state for backward compatibility."""
    phase: str
    phase_progress: float
    cycle_progress: float
    bed_angle_deg: float
    elapsed_s: float


class DumpStateMachine:
    """Section 11: Explicit state machine with validated transitions."""
    
    # State constants
    IDLE = 'IDLE'
    DUMPING = 'DUMPING'
    DETECTING = 'DETECTING'
    CARRY_BACK_DETECTED = 'CARRY_BACK_DETECTED'
    CORRECTING = 'CORRECTING'
    VERIFYING = 'VERIFYING'
    CLEAR = 'CLEAR'
    
    # Valid state transitions
    VALID_TRANSITIONS = {
        IDLE: [DUMPING],
        DUMPING: [DETECTING, IDLE],
        DETECTING: [CARRY_BACK_DETECTED, CLEAR, IDLE],
        CARRY_BACK_DETECTED: [CORRECTING, IDLE],
        CORRECTING: [VERIFYING],
        VERIFYING: [CLEAR, CARRY_BACK_DETECTED],
        CLEAR: [IDLE],
    }
    
    def __init__(self) -> None:
        # Explicit state machine
        self.current_state = self.IDLE
        self.state_entered_at = time.time()
        self.state_history: list[str] = []
        
        # Legacy phase simulation (for backward compatibility)
        self.phases = [
            ('LOADING', 9.0),
            ('HAUL', 12.0),
            ('DUMP_RAISE', 6.0),
            ('DUMP_HOLD', 4.0),
            ('DUMP_LOWER', 5.0),
            ('RETURN', 9.0),
        ]
        self.total_cycle_s = sum(duration for _, duration in self.phases)
        self.elapsed_s = 0.0
        self.paused = False
        self.material_profile = 'mixed'
        self.vibration_boost = 0.0
        self._last_state = CycleState('LOADING', 0.0, 0.0, 0.0, 0.0)

    def transition(self, new_state: str) -> bool:
        """
        Attempt to transition to new_state. Returns True if valid, False if invalid.
        Updates state_history and state_entered_at on success.
        """
        if new_state not in self.VALID_TRANSITIONS.get(self.current_state, []):
            return False
        
        self.current_state = new_state
        self.state_entered_at = time.time()
        self.state_history.append(new_state)
        return True

    def get_state_duration(self) -> float:
        """Get elapsed time in current state (seconds)."""
        return time.time() - self.state_entered_at

    def apply_control(self, control: Dict[str, object]) -> None:
        """
        Apply control commands to the state machine.
        Supports legacy commands (PAUSE, STOP_RESET, START_DUMP_CYCLE) and new state transitions.
        """
        paused_value = control.get('is_paused', control.get('isPaused'))
        if paused_value is not None:
            self.paused = bool(paused_value)

        material_profile = control.get('material_profile')
        if isinstance(material_profile, str) and material_profile:
            self.material_profile = material_profile

        command = str(control.get('command') or '').upper()
        
        # Legacy phase commands
        if command == 'START_DUMP_CYCLE':
            self.paused = False
            self.elapsed_s = 0.0
            self.transition(self.DUMPING)  # Try to transition to DUMPING
        elif command == 'PAUSE':
            self.paused = True
        elif command == 'STOP_RESET':
            self.paused = True
            self.elapsed_s = 0.0
            self._last_state = CycleState('LOADING', 0.0, 0.0, 0.0, 0.0)
            self.transition(self.IDLE)  # Reset to IDLE
        elif command == 'TRIGGER_VIBRATION':
            self.vibration_boost = 1.0
        elif command == 'TRIGGER_CORRECTION':
            self.vibration_boost = 1.0
            # Auto-transition: CARRY_BACK_DETECTED → CORRECTING
            self.transition(self.CORRECTING)
        
        # New state transition commands
        new_state = control.get('state')
        if isinstance(new_state, str):
            self.transition(new_state)

    def get_vibration_boost(self) -> float:
        return self.vibration_boost

    def decay_vibration_boost(self, dt: float) -> None:
        self.vibration_boost = max(0.0, self.vibration_boost - max(0.0, dt) * 0.45)

    def step(self, dt: float) -> CycleState:
        """
        Advance the phase simulation by dt seconds.
        Returns CycleState with phase, progress, bed_angle, etc.
        (Backward compatible with legacy phase-based interface)
        """
        if not self.paused:
            self.elapsed_s = (self.elapsed_s + max(0.05, dt)) % self.total_cycle_s

        t = self.elapsed_s
        traversed = 0.0

        for phase_name, duration in self.phases:
            next_t = traversed + duration
            if t <= next_t:
                phase_t = t - traversed
                phase_progress = min(1.0, max(0.0, phase_t / duration))
                cycle_progress = self.elapsed_s / self.total_cycle_s
                bed_angle = self._compute_bed_angle(phase_name, phase_progress)
                self._last_state = CycleState(
                    phase=phase_name,
                    phase_progress=phase_progress,
                    cycle_progress=cycle_progress,
                    bed_angle_deg=bed_angle,
                    elapsed_s=self.elapsed_s,
                )
                return self._last_state
            traversed = next_t

        self._last_state = CycleState('LOADING', 0.0, 0.0, 0.0, self.elapsed_s)
        return self._last_state

    @staticmethod
    def _compute_bed_angle(phase: str, phase_progress: float) -> float:
        """
        Compute hydraulic bed angle for each phase.
        Max angle: 52 degrees at full dump.
        """
        max_angle = 52.0
        if phase == 'DUMP_RAISE':
            return max_angle * phase_progress
        if phase == 'DUMP_HOLD':
            return max_angle
        if phase == 'DUMP_LOWER':
            return max_angle * (1.0 - phase_progress)
        return 0.0


# Backward compatibility alias
class DumpCycleStateMachine(DumpStateMachine):
    """Legacy interface: DumpCycleStateMachine is now an alias for DumpStateMachine."""
    pass
