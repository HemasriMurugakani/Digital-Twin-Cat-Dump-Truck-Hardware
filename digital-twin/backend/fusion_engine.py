from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

import numpy as np


@dataclass
class FusionResult:
    confidence: float
    residue_risk: float
    action: str
    rationale: str

    def as_dict(self) -> Dict[str, float | str]:
        return {
            'confidence': round(self.confidence, 4),
            'residue_risk': round(self.residue_risk, 4),
            'action': self.action,
            'rationale': self.rationale,
        }


class SensorFusionEngine:
    def __init__(self) -> None:
        self.weights = {
            'acoustic': 0.22,
            'vibration': 0.29,
            'thermal': 0.18,
            'lidar': 0.31,
        }

    @staticmethod
    def _norm(value: float, lo: float, hi: float) -> float:
        return float(np.clip((value - lo) / (hi - lo), 0.0, 1.0))

    def evaluate(self, sensors: Dict[str, float], bed_angle_deg: float, phase: str) -> FusionResult:
        acoustic_score = self._norm(sensors['acoustic_db'], 55.0, 92.0)
        vibration_score = self._norm(sensors['vibration_g'], 0.25, 1.25)
        thermal_score = self._norm(sensors['thermal_c'], 34.0, 57.0)
        lidar_score = self._norm(sensors['lidar_mm'], 8.0, 85.0)

        confidence = (
            acoustic_score * self.weights['acoustic']
            + vibration_score * self.weights['vibration']
            + thermal_score * self.weights['thermal']
            + lidar_score * self.weights['lidar']
        )

        phase_gain = 1.0 if phase in {'DUMP_RAISE', 'DUMP_HOLD', 'DUMP_LOWER'} else 0.84
        angle_gain = 0.7 + min(1.0, bed_angle_deg / 52.0) * 0.3
        residue_risk = float(np.clip(confidence * phase_gain * angle_gain, 0.0, 1.0))

        if residue_risk >= 0.72:
            action = 'ENGAGE_ELIMINATION_SEQUENCE'
            rationale = 'High carry-back probability: trigger pneumatic pulse and bed vibration.'
        elif residue_risk >= 0.48:
            action = 'MONITOR_AND_PREPARE'
            rationale = 'Moderate residue signature: monitor and pre-arm elimination system.'
        else:
            action = 'NO_ACTION'
            rationale = 'Residue risk remains within acceptable threshold.'

        return FusionResult(confidence, residue_risk, action, rationale)
