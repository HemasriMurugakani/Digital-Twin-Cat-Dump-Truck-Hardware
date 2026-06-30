"""# ai/sensor_fusion.py

Bayesian-weighted confidence fusion for mining environments.
"""

import math
from typing import Any, Dict


class SensorFusion:
    """Fuses mining vehicle sensors using true Bayesian inference principles."""

    # Baseline sensor noise (Standard Deviation σ). Lower is more precise.
    # Scaled 0 to 1 representing variance in confidence space.
    BASE_NOISE = {
        "vision": 0.15,  # High precision baseline
        "acoustic": 0.25,  # Moderate precision
        "weight": 0.20,  # Highly reliable
        "ultrasonic": 0.40,  # Low precision baseline
    }

    def combine(
        self,
        vision: Dict[str, Any],
        acoustic: Dict[str, Any],
        weight: Dict[str, Any],
        ultrasonic: Dict[str, Any],
        environmental_dust: float = 0.0,
    ) -> Dict[str, Any]:
        """Fuses data sources using dynamic Bayesian variance adjustments.

        Args:
            vision: Camera telemetry dictionary.
            acoustic: Microphone array signals.
            weight: Strut/Chassis scale pressure differentials.
            ultrasonic: Dump body depth grid array.
            environmental_dust: Normalized dust opacity factor (0.0 to 1.0).
        """
        # 1. Compute state estimates (Confidences from 0.0 to 1.0)
        scores = {
            "vision": float(vision.get("confidence", 0.0)),
            "acoustic": float(acoustic.get("confidence", 0.0)),
            "weight": self._weight_confidence(weight),
            "ultrasonic": self._ultrasonic_confidence(ultrasonic),
        }

        # 2. Dynamically calculate variances based on current mining conditions
        variances = self._calculate_dynamic_variances(environmental_dust)

        # 3. Perform Bayesian Information Fusion
        fused_conf, fused_var = self._execute_bayesian_fusion(scores, variances)

        # 4. Binary voting mechanism (Fallback safety layer)
        votes = sum(
            [
                bool(vision.get("residue_detected", False)),
                bool(acoustic.get("residue_detected", False)),
                bool(weight.get("residue_detected", False)),
                bool(ultrasonic.get("residue_detected", False)),
            ]
        )

        # 5. Spatial zoning grid and structural metrics
        zone_map = self._build_zone_map(vision, ultrasonic)
        carry_back_pct = self._estimate_pct(weight, ultrasonic)

        # Safety-critical logic: Trigger system if fused confidence spikes
        # or if multiple sensor subsystems isolate a positive fault.
        is_residue = fused_conf > 0.35 or votes >= 2

        return {
            "residue_detected": is_residue,
            "confidence": round(fused_conf, 4),
            "uncertainty_sigma": round(math.sqrt(fused_var), 4),
            "votes": votes,
            "scores": scores,
            "zone_map": zone_map,
            "carry_back_pct": carry_back_pct,
        }

    def _calculate_dynamic_variances(
        self, environmental_dust: float
    ) -> Dict[str, float]:
        """Adjusts variance parameters based on real-time physics anomalies."""
        variances = {}
        for sensor, base_sigma in self.BASE_NOISE.items():
            sigma = base_sigma

            # Penalize vision reliability in high-dust mining zones
            if sensor == "vision" and environmental_dust > 0.1:
                sigma += environmental_dust * 0.50

            # Convert standard deviation to variance (σ²)
            variances[sensor] = sigma**2
        return variances

    def _execute_bayesian_fusion(
        self, scores: Dict[str, float], variances: Dict[str, float]
    ) -> tuple[float, float]:
        """Applies Bayes' Theorem assuming independent Gaussian noise."""
        total_precision = 0.0
        weighted_scores_sum = 0.0

        for sensor in scores:
            # Precision is the mathematical inverse of uncertainty (1 / σ²)
            precision = 1.0 / max(variances[sensor], 1e-6)
            total_precision += precision
            weighted_scores_sum += scores[sensor] * precision

        if total_precision == 0.0:
            return 0.0, 1.0

        fused_mean = weighted_scores_sum / total_precision
        fused_variance = 1.0 / total_precision

        # Bound output to legal confidence bounds
        fused_mean = max(0.0, min(1.0, fused_mean))
        return fused_mean, fused_variance

    def _weight_confidence(self, w: Dict[str, Any]) -> float:
        mass_kg = w.get("differential_kg", 0.0)
        if mass_kg < 200:
            return 0.0
        if mass_kg < 1000:
            return 0.5
        if mass_kg < 5000:
            return 0.85
        return 1.0

    def _ultrasonic_confidence(self, u: Dict[str, Any]) -> float:
        n_triggered = sum(1 for d in u.get("depths", []) if d > 0.03)
        return min(1.0, n_triggered / 8.0)

    def _build_zone_map(
        self, vision: Dict[str, Any], ultrasonic: Dict[str, Any]
    ) -> list[list[float]]:
        grid = [[0.0] * 6 for _ in range(3)]
        depths = ultrasonic.get("depths", [])
        for i, d in enumerate(depths[:18]):
            row, col = i // 6, i % 6
            grid[row][col] = min(1.0, d / 0.15)
        return grid

    def _estimate_pct(
        self, weight: Dict[str, Any], ultrasonic: Dict[str, Any]
    ) -> float:
        mass = weight.get("differential_kg", 0.0)
        # Calculates carryback as percentage of a 227-tonne truck capacity
        return round((mass / 227000.0) * 100, 2)