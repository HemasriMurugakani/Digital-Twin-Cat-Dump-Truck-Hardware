from __future__ import annotations

from typing import Dict

import numpy as np


ZONE_KEYS = ['FL', 'FC', 'FR', 'RL', 'RC', 'RR']


class ZoneMapper:
    def map_zones(self, *, residue_risk: float, vibration_g: float, bed_angle_deg: float) -> Dict[str, float]:
        front_bias = max(0.0, 1.0 - bed_angle_deg / 52.0)
        rear_bias = min(1.0, bed_angle_deg / 52.0)
        left_right_wave = np.sin(vibration_g * 2.7)

        base = np.array([
            0.82 + 0.18 * front_bias - 0.08 * left_right_wave,
            0.76 + 0.14 * front_bias,
            0.82 + 0.18 * front_bias + 0.08 * left_right_wave,
            0.71 + 0.22 * rear_bias - 0.05 * left_right_wave,
            0.66 + 0.20 * rear_bias,
            0.71 + 0.22 * rear_bias + 0.05 * left_right_wave,
        ])

        zone_scores = np.clip(base * residue_risk, 0.0, 1.0)
        return {zone: round(float(zone_scores[idx]), 4) for idx, zone in enumerate(ZONE_KEYS)}
