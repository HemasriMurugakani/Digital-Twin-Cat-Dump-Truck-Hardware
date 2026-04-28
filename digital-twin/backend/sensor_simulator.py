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
        dump_event = 1.0 if phase in {'DUMP_RAISE', 'DUMP_HOLD', 'DUMP_LOWER'} else 0.0

        acoustic_base = 57.0 + 8.5 * factor + profile['acoustic'] + 13.0 * angle_ratio * dump_event + vibration_boost * 6.0
        vibration_base = 0.36 + 0.19 * factor + profile['vibration'] + 0.35 * dump_event + vibration_boost * 0.48
        thermal_base = 37.0 + 3.1 * factor + profile['thermal'] + 6.5 * dump_event
        lidar_base = 15.0 + 20.0 * factor + profile['lidar'] + 47.0 * angle_ratio

        acoustic = acoustic_base + self.rng.normal(0.0, 1.5)
        vibration = max(0.05, vibration_base + self.rng.normal(0.0, 0.05))
        thermal = max(15.0, thermal_base + self.rng.normal(0.0, 0.9))
        lidar = max(0.0, lidar_base + self.rng.normal(0.0, 2.5))

        return SensorReadings(acoustic, vibration, thermal, lidar)
