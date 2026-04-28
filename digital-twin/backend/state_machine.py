from dataclasses import dataclass
from typing import Dict


@dataclass
class CycleState:
    phase: str
    phase_progress: float
    cycle_progress: float
    bed_angle_deg: float
    elapsed_s: float


class DumpCycleStateMachine:
    def __init__(self) -> None:
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

    def apply_control(self, control: Dict[str, object]) -> None:
        paused_value = control.get('is_paused', control.get('isPaused'))
        if paused_value is not None:
            self.paused = bool(paused_value)

        material_profile = control.get('material_profile')
        if isinstance(material_profile, str) and material_profile:
            self.material_profile = material_profile

        command = str(control.get('command') or '').upper()
        if command == 'START_DUMP_CYCLE':
            self.paused = False
            self.elapsed_s = 0.0
        elif command == 'PAUSE':
            self.paused = True
        elif command == 'STOP_RESET':
            self.paused = True
            self.elapsed_s = 0.0
            self._last_state = CycleState('LOADING', 0.0, 0.0, 0.0, 0.0)
        elif command == 'TRIGGER_VIBRATION':
            self.vibration_boost = 1.0
        elif command == 'TRIGGER_CORRECTION':
            # correction sequence behaves like a vibration pulse
            self.vibration_boost = 1.0

    def get_vibration_boost(self) -> float:
        return self.vibration_boost

    def decay_vibration_boost(self, dt: float) -> None:
        self.vibration_boost = max(0.0, self.vibration_boost - max(0.0, dt) * 0.45)

    def step(self, dt: float) -> CycleState:
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
        max_angle = 52.0
        if phase == 'DUMP_RAISE':
            return max_angle * phase_progress
        if phase == 'DUMP_HOLD':
            return max_angle
        if phase == 'DUMP_LOWER':
            return max_angle * (1.0 - phase_progress)
        return 0.0
