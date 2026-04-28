from dataclasses import dataclass
from typing import Dict
import time


@dataclass
class CycleState:
    phase: str
    phase_progress: float
    cycle_progress: float
    bed_angle_deg: float
    elapsed_s: float


class DumpCycleStateMachine:
    """Section 11 state machine with explicit state transitions and phase tracking."""
    
    # Define all valid states
    STATES = [
        'IDLE',
        'DUMPING',
        'DETECTING',
        'CARRY_BACK_DETECTED',
        'CORRECTING',
        'VERIFYING',
        'CLEAR'
    ]
    
    # Define valid transitions between states
    VALID_TRANSITIONS = {
        'IDLE': ['DUMPING'],
        'DUMPING': ['DETECTING', 'IDLE'],
        'DETECTING': ['CARRY_BACK_DETECTED', 'CLEAR', 'IDLE'],
        'CARRY_BACK_DETECTED': ['CORRECTING', 'IDLE'],
        'CORRECTING': ['VERIFYING'],
        'VERIFYING': ['CLEAR', 'CARRY_BACK_DETECTED'],
        'CLEAR': ['IDLE'],
    }
    
    def __init__(self):
        """Initialize the state machine."""
        self.current = 'IDLE'
        self.entered_at = time.time()  # timestamp when entering current state
        
        # Phase tracking (from original implementation)
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
        Attempt to transition to a new state.
        
        Returns:
            bool: True if transition was valid, False otherwise
        """
        if new_state not in self.STATES:
            return False
        
        if new_state not in self.VALID_TRANSITIONS.get(self.current, []):
            return False
        
        self.current = new_state
        self.entered_at = time.time()
        return True
    
    def get_current_state(self) -> str:
        """Get current state."""
        return self.current
    
    def get_state_duration(self) -> float:
        """Get how long we've been in the current state."""
        return time.time() - self.entered_at
    
    def apply_control(self, control: Dict) -> None:
        """Apply control commands and parameters."""
        # Handle pause
        paused_value = control.get('is_paused', control.get('isPaused'))
        if paused_value is not None:
            self.paused = bool(paused_value)
        
        # Handle material profile
        material_profile = control.get('material_profile')
        if isinstance(material_profile, str) and material_profile:
            self.material_profile = material_profile
        
        # Handle commands
        command = str(control.get('command') or '').upper()
        if command == 'START_DUMP_CYCLE':
            self.paused = False
            self.elapsed_s = 0.0
            self.transition('DUMPING')
        elif command == 'PAUSE':
            self.paused = True
        elif command == 'STOP_RESET':
            self.paused = True
            self.elapsed_s = 0.0
            self._last_state = CycleState('LOADING', 0.0, 0.0, 0.0, 0.0)
            self.transition('IDLE')
        elif command == 'TRIGGER_VIBRATION':
            self.vibration_boost = 1.0
        elif command == 'TRIGGER_CORRECTION':
            self.vibration_boost = 1.0
            # Could transition to CORRECTING state if in CARRY_BACK_DETECTED
            if self.current == 'CARRY_BACK_DETECTED':
                self.transition('CORRECTING')
    
    def get_vibration_boost(self) -> float:
        """Get current vibration boost level."""
        return self.vibration_boost
    
    def decay_vibration_boost(self, dt: float) -> None:
        """Decay vibration boost over time."""
        self.vibration_boost = max(0.0, self.vibration_boost - max(0.0, dt) * 0.45)
    
    def step(self, dt: float) -> CycleState:
        """Step the state machine forward in time."""
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
        
        self._last_state = CycleState('IDLE', 1.0, 1.0, 0.0, self.elapsed_s)
        return self._last_state
    
    @staticmethod
    def _compute_bed_angle(phase: str, phase_progress: float) -> float:
        """Compute hydraulic bed angle based on phase and progress."""
        max_angle = 52.0
        if phase == 'DUMP_RAISE':
            return max_angle * phase_progress
        if phase == 'DUMP_HOLD':
            return max_angle
        if phase == 'DUMP_LOWER':
            return max_angle * (1.0 - phase_progress)
        return 0.0
