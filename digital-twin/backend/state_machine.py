from dataclasses import dataclass


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

    def step(self, dt: float) -> CycleState:
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
                return CycleState(
                    phase=phase_name,
                    phase_progress=phase_progress,
                    cycle_progress=cycle_progress,
                    bed_angle_deg=bed_angle,
                    elapsed_s=self.elapsed_s,
                )
            traversed = next_t

        return CycleState('IDLE', 1.0, 1.0, 0.0, self.elapsed_s)

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
