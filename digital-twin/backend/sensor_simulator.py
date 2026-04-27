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
            'normal': 1.0,
            'wet_ore': 1.18,
            'sticky_clay': 1.33,
            'cold_shift': 1.12,
        }

    def generate_readings(self, *, scenario: str, bed_angle_deg: float, phase: str) -> SensorReadings:
        factor = self.scenario_factor.get(scenario, 1.0)
        angle_ratio = min(1.0, max(0.0, bed_angle_deg / 52.0))
        dump_event = 1.0 if phase in {'DUMP_RAISE', 'DUMP_HOLD', 'DUMP_LOWER'} else 0.0

        acoustic_base = 59.0 + 8.0 * factor + 13.0 * angle_ratio * dump_event
        vibration_base = 0.42 + 0.18 * factor + 0.35 * dump_event
        thermal_base = 38.0 + 3.0 * factor + 7.0 * dump_event
        lidar_base = 16.0 + 22.0 * factor + 48.0 * angle_ratio

        acoustic = acoustic_base + self.rng.normal(0.0, 1.5)
        vibration = max(0.05, vibration_base + self.rng.normal(0.0, 0.05))
        thermal = max(15.0, thermal_base + self.rng.normal(0.0, 0.9))
        lidar = max(0.0, lidar_base + self.rng.normal(0.0, 2.5))

        return SensorReadings(acoustic, vibration, thermal, lidar)
