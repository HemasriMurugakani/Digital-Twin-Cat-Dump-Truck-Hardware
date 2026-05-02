from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

import numpy as np


@dataclass
class SensorReadings:
    acoustic_db: float
    vibration_g: float
    thermal_c: float
    lidar_mm: float

    def as_dict(self) -> Dict[str, float]:
        return {
            'acoustic_db': round(self.acoustic_db, 3),
            'vibration_g': round(self.vibration_g, 3),
            'thermal_c': round(self.thermal_c, 3),
            'lidar_mm': round(self.lidar_mm, 3),
        }


class SensorSimulator:
    def __init__(self) -> None:
        self.rng = np.random.default_rng(793)
        self.scenario_factor = {
            'empty_truck': 0.76,
            'partial_residue': 1.0,
            'full_residue': 1.28,
            'normal': 1.0,
            'wet_ore': 1.18,
            'sticky_clay': 1.33,
            'cold_shift': 1.12,
        }
        self.material_profiles = {
            'wet_clay': {'acoustic': 5.0, 'vibration': 0.14, 'thermal': 2.4, 'lidar': 6.0, 'stickiness': 0.32},
            'fine_ore': {'acoustic': 1.0, 'vibration': 0.08, 'thermal': 0.8, 'lidar': 2.0, 'stickiness': 0.18},
            'dry_rock': {'acoustic': -1.5, 'vibration': -0.02, 'thermal': -0.7, 'lidar': -1.5, 'stickiness': 0.08},
            'mixed': {'acoustic': 2.0, 'vibration': 0.05, 'thermal': 1.0, 'lidar': 3.0, 'stickiness': 0.22},
        }
        self.phase_windows = {
            'LOADING': {'acoustic': (58, 69), 'vibration': (0.35, 0.65), 'thermal': (38, 44), 'lidar': (20, 42)},
            'HAUL': {'acoustic': (62, 74), 'vibration': (0.45, 0.82), 'thermal': (40, 47), 'lidar': (24, 48)},
            'DUMP_RAISE': {'acoustic': (68, 82), 'vibration': (0.72, 1.15), 'thermal': (44, 53), 'lidar': (35, 70)},
            'DUMP_HOLD': {'acoustic': (71, 88), 'vibration': (0.78, 1.22), 'thermal': (46, 57), 'lidar': (42, 82)},
            'DUMP_LOWER': {'acoustic': (64, 80), 'vibration': (0.6, 1.05), 'thermal': (43, 52), 'lidar': (30, 74)},
            'RETURN': {'acoustic': (58, 70), 'vibration': (0.35, 0.72), 'thermal': (39, 46), 'lidar': (20, 44)},
        }

    def _phase_range(self, phase: str, key: str, factor: float, bias: float = 0.0) -> tuple[float, float]:
        lo, hi = self.phase_windows.get(phase, self.phase_windows['HAUL'])[key]
        center = (lo + hi) * 0.5
        span = (hi - lo) * 0.5
        scaled_center = center + (factor - 1.0) * span * 0.9 + bias
        scaled_span = span * max(0.75, min(1.35, factor))
        return scaled_center - scaled_span, scaled_center + scaled_span

    def generate_readings(
        self,
        *,
        scenario: str,
        bed_angle_deg: float,
        phase: str,
        material_profile: str = 'mixed',
        vibration_boost: float = 0.0,
    ) -> SensorReadings:
        factor = self.scenario_factor.get(scenario, 1.0)
        profile = self.material_profiles.get(material_profile, self.material_profiles['mixed'])
        angle_ratio = min(1.0, max(0.0, bed_angle_deg / 52.0))
        a_lo, a_hi = self._phase_range(phase, 'acoustic', factor, profile['acoustic'] + vibration_boost * 4.0)
        v_lo, v_hi = self._phase_range(phase, 'vibration', factor, profile['vibration'] + vibration_boost * 0.28)
        t_lo, t_hi = self._phase_range(phase, 'thermal', factor, profile['thermal'])
        l_lo, l_hi = self._phase_range(phase, 'lidar', factor, profile['lidar'] + angle_ratio * 8.0)

        acoustic = self.rng.uniform(a_lo, a_hi) + self.rng.normal(0.0, 0.9)
        vibration = self.rng.uniform(v_lo, v_hi) + self.rng.normal(0.0, 0.03)
        thermal = self.rng.uniform(t_lo, t_hi) + self.rng.normal(0.0, 0.55)
        lidar = self.rng.uniform(l_lo, l_hi) + self.rng.normal(0.0, 1.8)

        acoustic = float(np.clip(acoustic, 54.0, 94.0))
        vibration = float(np.clip(vibration, 0.05, 1.35))
        thermal = float(np.clip(thermal, 15.0, 60.0))
        lidar = float(np.clip(lidar, 0.0, 88.0))

        return SensorReadings(acoustic, vibration, thermal, lidar)
