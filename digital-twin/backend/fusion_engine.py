"""
Section 11: Bayesian Sensor Fusion Engine with Explainability

Implements weighted Bayesian fusion across four modalities:
  - Load cells (0.35): Direct mass measurement, most reliable
  - Acoustic (0.30): Resonance frequency and material signatures
  - Vision/CV (0.25): Zone-based residue detection
  - Ultrasonic (0.10): Proximity sensing for fine-grained height measurement

Result includes sensor contributions, reasoning traces, and zone-specific corrective actions.
Backward compatible with legacy response format (residue_risk, action, rationale).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List

import numpy as np


@dataclass
class FusionResult:
    """Enhanced fusion result with explainability and backward compatibility."""
    result: str  # 'RESIDUE' or 'EMPTY'
    confidence: float  # Fused confidence score (0.0-1.0)
    status: str  # 'HIGH', 'MEDIUM', 'LOW', 'NONE'
    sensor_contributions: Dict[str, float] = field(default_factory=dict)  # {load, acoustic, vision, ultrasonic}
    fused_score: float = 0.0
    threshold: float = 0.65
    above_threshold: bool = False
    zone_analysis: Dict = field(default_factory=dict)  # {active_zones, total_tonnes, corrective_action}
    reasoning: List[str] = field(default_factory=list)  # Human-readable explanations
    # Backward compatibility fields
    residue_risk: float = 0.0
    action: str = 'NO_ACTION'
    rationale: str = ''

    def as_dict(self) -> Dict:
        """Return dict suitable for JSON response."""
        return {
            'result': self.result,
            'confidence': round(self.confidence, 4),
            'status': self.status,
            'sensor_contributions': {k: round(v, 4) for k, v in self.sensor_contributions.items()},
            'fused_score': round(self.fused_score, 4),
            'threshold': round(self.threshold, 4),
            'above_threshold': self.above_threshold,
            'zone_analysis': self.zone_analysis,
            'reasoning': self.reasoning,
            # Backward compat
            'residue_risk': round(self.residue_risk, 4),
            'action': self.action,
            'rationale': self.rationale,
        }


class FusionEngine:
    """Section 11: Bayesian weighted fusion with zone-aware corrective actions."""
    
    WEIGHTS = {
        'load': 0.35,      # Physics-based mass measurement
        'acoustic': 0.30,  # Resonance and material signatures
        'vision': 0.25,    # Computer vision zone detection
        'ultrasonic': 0.10,  # Fine-grained proximity
    }
    THRESHOLD = 0.65

    def __init__(self) -> None:
        pass

    def fuse(
        self,
        load: float = 0.0,
        acoustic: float = 0.0,
        vision: float = 0.0,
        ultrasonic: float = 0.0,
        load_tonnes: float = 0.0,
        acoustic_deviation: float = 0.0,
        zones: Dict | None = None,
    ) -> FusionResult:
        """
        Fuse four sensor modalities into residue/empty classification with reasoning.
        
        Args:
            load, acoustic, vision, ultrasonic: Normalized scores (0.0-1.0)
            load_tonnes: Actual load in tonnes for reasoning
            acoustic_deviation: Frequency deviation (Hz) for material signature
            zones: Dict of zone data {zone_name: {residue: bool, tonnes: float, ...}}
        
        Returns:
            FusionResult with classification, contributions, and reasoning
        """
        if zones is None:
            zones = {}

        # Step 1: Compute confidence for each sensor modality
        load_conf = self._load_confidence(load, load_tonnes)
        acoustic_conf = self._acoustic_confidence(acoustic, acoustic_deviation)
        vision_conf = self._vision_confidence(vision)
        us_conf = self._ultrasonic_confidence(ultrasonic)

        # Step 2: Weighted fusion
        fused_score = (
            self.WEIGHTS['load'] * load_conf
            + self.WEIGHTS['acoustic'] * acoustic_conf
            + self.WEIGHTS['vision'] * vision_conf
            + self.WEIGHTS['ultrasonic'] * us_conf
        )

        # Step 3: Classification
        result = 'RESIDUE' if fused_score >= self.THRESHOLD else 'EMPTY'
        
        # Step 4: Status level
        if fused_score >= 0.80:
            status = 'HIGH'
        elif fused_score >= 0.65:
            status = 'MEDIUM'
        elif fused_score >= 0.40:
            status = 'LOW'
        else:
            status = 'NONE'

        # Step 5: Reasoning
        reasoning = self._generate_reasoning(
            load_conf, acoustic_conf, vision_conf, us_conf,
            load_tonnes, acoustic_deviation, zones
        )

        # Step 6: Zone analysis and corrective actions
        zone_analysis = self._map_zones(zones)

        # Step 7: Backward compat fields
        residue_risk = fused_score  # Map fused score to residue risk
        if fused_score >= 0.75:
            action = 'ENGAGE_ELIMINATION_SEQUENCE'
            rationale = f'High residue confidence ({fused_score:.2f}): execute corrective action {zone_analysis["corrective_action"]}'
        elif fused_score >= 0.55:
            action = 'MONITOR_AND_PREPARE'
            rationale = f'Moderate residue confidence ({fused_score:.2f}): prepare elimination system'
        else:
            action = 'NO_ACTION'
            rationale = 'Residue confidence below threshold; truck is clean'

        return FusionResult(
            result=result,
            confidence=fused_score,
            status=status,
            sensor_contributions={
                'load': load_conf,
                'acoustic': acoustic_conf,
                'vision': vision_conf,
                'ultrasonic': us_conf,
            },
            fused_score=fused_score,
            threshold=self.THRESHOLD,
            above_threshold=fused_score >= self.THRESHOLD,
            zone_analysis=zone_analysis,
            reasoning=reasoning,
            residue_risk=residue_risk,
            action=action,
            rationale=rationale,
        )

    def _load_confidence(self, load_normalized: float, load_tonnes: float) -> float:
        """
        Load cell confidence: direct mass measurement is most reliable.
        Higher load → higher confidence of residue.
        """
        # Normalize to 0-1 range
        # 0 tonnes → 0.0 confidence, 5+ tonnes → 0.99 confidence
        conf = float(np.clip(load_tonnes / 5.0, 0.0, 0.99))
        return conf

    def _acoustic_confidence(self, acoustic_normalized: float, deviation_hz: float) -> float:
        """
        Acoustic confidence based on frequency deviation from empty state (~39.7 Hz).
        Large deviations indicate full/residue condition.
        """
        # If deviation > 40 Hz, very high confidence (loaded)
        if abs(deviation_hz) > 40:
            return 0.93
        # If deviation 10-40 Hz, moderate confidence
        elif abs(deviation_hz) > 10:
            return 0.60
        # If deviation < 10 Hz, low confidence
        else:
            return 0.08

    def _vision_confidence(self, vision_normalized: float) -> float:
        """
        Vision confidence: zone occupancy detection via CV.
        Capped at 0.99 to avoid overconfidence in ML outputs.
        """
        return float(np.clip(vision_normalized, 0.0, 0.99))

    def _ultrasonic_confidence(self, us_normalized: float) -> float:
        """
        Ultrasonic confidence: fine-grained proximity sensing.
        High values (>0.3) indicate residue; lower values indicate empty.
        """
        if us_normalized > 0.3:
            return 0.85
        else:
            return 0.10

    def _generate_reasoning(
        self,
        load_conf: float,
        acoustic_conf: float,
        vision_conf: float,
        us_conf: float,
        load_tonnes: float,
        acoustic_deviation: float,
        zones: Dict,
    ) -> List[str]:
        """Generate human-readable reasoning for the fusion decision."""
        reasoning = []

        # Load cell evidence
        if load_tonnes > 2.0:
            reasoning.append(f'Load cells detect {load_tonnes:.1f}t remaining (confidence {load_conf:.2f})')
        else:
            reasoning.append(f'Load cells show {load_tonnes:.1f}t (confidence {load_conf:.2f})')

        # Acoustic evidence
        if acoustic_conf > 0.8:
            reasoning.append(f'Acoustic resonance {acoustic_deviation:.1f}Hz deviation indicates loaded condition (confidence {acoustic_conf:.2f})')
        elif acoustic_conf > 0.5:
            reasoning.append(f'Acoustic signature {acoustic_deviation:.1f}Hz shows mixed/transition state (confidence {acoustic_conf:.2f})')
        else:
            reasoning.append(f'Acoustic resonance near empty baseline (confidence {acoustic_conf:.2f})')

        # Vision evidence
        if vision_conf > 0.7:
            active_zones = [z for z, d in zones.items() if isinstance(d, dict) and d.get('residue')]
            if active_zones:
                reasoning.append(f'Computer vision detected residue in zones {{{", ".join(active_zones)}}} (confidence {vision_conf:.2f})')
        elif vision_conf > 0.4:
            reasoning.append(f'Vision shows possible residue patches (confidence {vision_conf:.2f})')

        # Ultrasonic evidence
        if us_conf > 0.8:
            reasoning.append(f'Ultrasonic proximity signals obstacle/residue (confidence {us_conf:.2f})')
        else:
            reasoning.append(f'Ultrasonic reading consistent with empty bed (confidence {us_conf:.2f})')

        return reasoning

    def _map_zones(self, zones: Dict) -> Dict:
        """
        Analyze active zones and determine corrective action.
        Returns {active_zones, total_tonnes, corrective_action, zones: {...}}
        """
        if not zones:
            zones = {}

        active_zones = []
        total_tonnes = 0.0
        zone_details = {}

        for zone_name, zone_data in zones.items():
            if isinstance(zone_data, dict):
                has_residue = zone_data.get('residue', False)
                tonnes = zone_data.get('tonnes', 0.0)
                if has_residue or tonnes > 0:
                    active_zones.append(zone_name)
                    total_tonnes += tonnes
                zone_details[zone_name] = {
                    'residue': has_residue,
                    'tonnes': tonnes,
                }

        corrective_action = self._get_corrective_action(active_zones)

        return {
            'active_zones': active_zones,
            'total_tonnes': round(total_tonnes, 2),
            'corrective_action': corrective_action,
            'zones': zone_details,
        }

    def _get_corrective_action(self, active_zones: List[str]) -> str:
        """
        Determine corrective action based on active zones.
        Examples:
          - ['FL', 'RL']: VIBRATE_FL+RL + ANGLE_TRIM_+5deg
          - ['FC']: VIBRATE_FC + PNEUMATIC_PULSE
          - []: PROCEED
        """
        if not active_zones:
            return 'PROCEED'

        action_parts = []
        vibrate_zones = '+'.join(sorted(active_zones))
        action_parts.append(f'VIBRATE_{vibrate_zones}')

        # If residue on front (F*), add bed angle trim
        if any(z.startswith('F') for z in active_zones):
            action_parts.append('ANGLE_TRIM_+5deg')

        # If residue on rear (R*), add pneumatic pulse
        if any(z.startswith('R') for z in active_zones):
            action_parts.append('PNEUMATIC_PULSE')

        return ' + '.join(action_parts)


class SensorFusionEngine(FusionEngine):
    """
    Backward compatibility class: wraps new FusionEngine for legacy interface.
    Maps old sensor format (acoustic_db, vibration_g, thermal_c, lidar_mm)
    to new format (load, acoustic, vision, ultrasonic).
    """

    def __init__(self) -> None:
        super().__init__()

    @staticmethod
    def _norm(value: float, lo: float, hi: float) -> float:
        """Normalize value to [0, 1] range."""
        return float(np.clip((value - lo) / (hi - lo), 0.0, 1.0))

    def evaluate(self, sensors: Dict[str, float], bed_angle_deg: float, phase: str) -> FusionResult:
        """
        Legacy interface: map old sensors to new fusion.
        Old sensors: acoustic_db, vibration_g, thermal_c, lidar_mm
        New fusion: load, acoustic, vision, ultrasonic
        """
        # Extract old sensor values
        acoustic_db = sensors.get('acoustic_db', 60.0)
        vibration_g = sensors.get('vibration_g', 0.5)
        thermal_c = sensors.get('thermal_c', 35.0)
        lidar_mm = sensors.get('lidar_mm', 50.0)

        # Map to new modalities
        # acoustic_db (55-92 dB) → acoustic confidence
        acoustic_norm = self._norm(acoustic_db, 55.0, 92.0)

        # vibration_g (0.25-1.25 g) → load proxy
        load_norm = self._norm(vibration_g, 0.25, 1.25)
        load_tonnes = vibration_g * 4.0  # Estimate tonnes from vibration

        # thermal_c (34-57°C) → unused, set to 0
        vision_norm = self._norm(thermal_c, 34.0, 57.0)

        # lidar_mm (8-85 mm) → ultrasonic proxy
        us_norm = self._norm(lidar_mm, 8.0, 85.0)

        # Call new fusion with mapped values
        return self.fuse(
            load=load_norm,
            acoustic=acoustic_norm,
            vision=vision_norm,
            ultrasonic=us_norm,
            load_tonnes=load_tonnes,
            acoustic_deviation=30.0 if acoustic_norm > 0.5 else 5.0,
            zones={},
        )
