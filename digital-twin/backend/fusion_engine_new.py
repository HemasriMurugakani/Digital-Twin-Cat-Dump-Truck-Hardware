from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List
import time
import numpy as np


@dataclass
class FusionResult:
    """Section 11 enhanced fusion result with explainability."""
    result: str  # 'RESIDUE' or 'EMPTY'
    confidence: float  # fused_score
    status: str  # 'HIGH', 'MEDIUM', 'LOW', 'NONE'
    sensor_contributions: Dict[str, float]  # individual confidence scores
    fused_score: float  # same as confidence
    threshold: float  # decision threshold
    above_threshold: bool  # fused_score >= threshold
    zone_analysis: Dict  # {active_zones, total_tonnes, zones, corrective_action}
    reasoning: List[str]  # explainability reasoning
    
    # Backward compat fields (for frontend)
    residue_risk: float = 0.0
    action: str = 'NO_ACTION'
    rationale: str = 'All sensors within normal range — bed confirmed empty'
    
    def as_dict(self) -> Dict:
        return {
            'result': self.result,
            'confidence': round(self.confidence, 4),
            'status': self.status,
            'sensor_contributions': {k: round(v, 3) for k, v in self.sensor_contributions.items()},
            'fused_score': round(self.fused_score, 4),
            'threshold': self.threshold,
            'above_threshold': self.above_threshold,
            'zone_analysis': self.zone_analysis,
            'reasoning': self.reasoning,
            # Backward compat
            'residue_risk': round(self.residue_risk, 4),
            'action': self.action,
            'rationale': self.rationale,
        }


class FusionEngine:
    """
    Weighted Bayesian sensor fusion.
    Weights based on reliability analysis from SCBES engineering document.
    
    Load cell: 0.35 (physics-based, not affected by dust/noise)
    Acoustic: 0.30 (independent of visual conditions)
    Vision (CV): 0.25 (best localization, dust-sensitive)
    Ultrasonic: 0.10 (volume confirmation, limited localization)
    """
    
    WEIGHTS = {'load': 0.35, 'acoustic': 0.30, 'vision': 0.25, 'ultrasonic': 0.10}
    THRESHOLD = 0.65
    
    def __init__(self):
        pass
    
    def fuse(self, load=0.0, acoustic=0.0, vision=0.0, ultrasonic=0.0,
             load_tonnes=0.0, acoustic_deviation=0.0, zones=None):
        """
        Perform weighted Bayesian sensor fusion.
        
        Args:
            load: normalized 0-1 load sensor confidence
            acoustic: normalized 0-1 acoustic confidence
            vision: normalized 0-1 vision/CV confidence
            ultrasonic: normalized 0-1 ultrasonic confidence
            load_tonnes: raw load in tonnes (for reasoning)
            acoustic_deviation: raw Hz deviation from baseline
            zones: dict of zone data {zone_id: {residue: bool, tonnes: float}}
        """
        if zones is None:
            zones = {}
        
        # Convert normalized inputs to confidence scores
        load_conf = self._load_confidence(load, load_tonnes)
        acoustic_conf = self._acoustic_confidence(acoustic, acoustic_deviation)
        vision_conf = self._vision_confidence(vision)
        us_conf = self._ultrasonic_confidence(ultrasonic)
        
        # Weighted sum
        fused_score = (
            self.WEIGHTS['load'] * load_conf +
            self.WEIGHTS['acoustic'] * acoustic_conf +
            self.WEIGHTS['vision'] * vision_conf +
            self.WEIGHTS['ultrasonic'] * us_conf
        )
        
        # Determine result
        result = 'RESIDUE' if fused_score >= self.THRESHOLD else 'EMPTY'
        
        # Status classification
        if fused_score >= 0.85:
            status = 'HIGH'
        elif fused_score >= 0.65:
            status = 'MEDIUM'
        elif fused_score >= 0.45:
            status = 'LOW'
        else:
            status = 'NONE'
        
        # Zone analysis with corrective actions
        zone_analysis = self._map_zones(zones)
        
        # Generate reasoning
        reasoning = self._generate_reasoning(
            load_conf, acoustic_conf, vision_conf, us_conf,
            load_tonnes, acoustic_deviation, zones
        )
        
        # Backward compat: map to old action/rationale format
        if fused_score >= 0.72:
            action = 'ENGAGE_ELIMINATION_SEQUENCE'
            rationale = 'High carry-back probability: trigger pneumatic pulse and bed vibration.'
        elif fused_score >= 0.48:
            action = 'MONITOR_AND_PREPARE'
            rationale = 'Moderate residue signature: monitor and pre-arm elimination system.'
        else:
            action = 'NO_ACTION'
            rationale = 'Residue risk remains within acceptable threshold.'
        
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
            residue_risk=fused_score,  # backward compat
            action=action,  # backward compat
            rationale=rationale,  # backward compat
        )
    
    def _load_confidence(self, load_normalized, load_tonnes):
        """Compute confidence from load cell readings."""
        if load_tonnes > 0.5:
            return min(0.99, 0.5 + load_tonnes / 10.0)
        return max(0.0, load_normalized * 0.95)
    
    def _acoustic_confidence(self, acoustic_normalized, deviation_hz):
        """Compute confidence from acoustic signature."""
        if abs(deviation_hz) > 40:
            return 0.93  # Clear material signature
        if abs(deviation_hz) > 25:
            return 0.75
        if abs(deviation_hz) > 10:
            return 0.40
        return 0.08
    
    def _vision_confidence(self, vision_normalized):
        """Compute confidence from vision/CV model."""
        return min(0.99, vision_normalized)
    
    def _ultrasonic_confidence(self, us_normalized):
        """Compute confidence from ultrasonic distance."""
        if us_normalized > 0.3:
            return 0.85
        return 0.10
    
    def _generate_reasoning(self, lc, ac, vc, uc, tonnes, deviation, zones):
        """Generate human-readable reasoning for the decision."""
        reasons = []
        
        if lc > 0.5:
            reasons.append(
                f"Load cells detect {tonnes:.1f}t above tare weight (SNR: {tonnes/0.104:.1f}:1)"
            )
        if ac > 0.5:
            reasons.append(
                f"Acoustic deviation of {deviation:.1f}Hz from 847Hz baseline — wet clay signature"
            )
        if vc > 0.5:
            active_zones = [z for z, d in zones.items() if d.get('residue', False)]
            if active_zones:
                reasons.append(
                    f"CV model detected residue in zones: {', '.join(active_zones)} (YOLOv8 mAP: 0.94)"
                )
        if uc > 0.5:
            reasons.append(
                "Ultrasonic sensors confirm material presence (avg distance reduced)"
            )
        
        return reasons if reasons else ["All sensors within normal range — bed confirmed empty"]
    
    def _map_zones(self, zones):
        """Analyze zones and determine corrective actions."""
        if not zones:
            zones = {}
        
        active_zones = [z for z, d in zones.items() if d.get('residue', False)]
        total_tonnes = sum(d.get('tonnes', 0.0) for d in zones.values())
        
        corrective_action = self._get_corrective_action(active_zones)
        
        return {
            'active_zones': active_zones,
            'total_tonnes': round(total_tonnes, 2),
            'zones': zones,
            'corrective_action': corrective_action,
        }
    
    def _get_corrective_action(self, active_zones):
        """Determine corrective action based on affected zones."""
        if not active_zones:
            return 'PROCEED'
        
        front_zones = [z for z in active_zones if z.startswith('F')]
        rear_zones = [z for z in active_zones if z.startswith('R')]
        
        actions = []
        if front_zones:
            actions.append(f"VIBRATE_{'+'.join(front_zones)} + ANGLE_TRIM_+5deg")
        if rear_zones:
            actions.append(f"VIBRATE_{'+'.join(rear_zones)}")
        
        return ' | '.join(actions) if actions else 'FULL_BED_VIBRATE'


# Backward compatibility: maintain old class name interface
class SensorFusionEngine(FusionEngine):
    """Legacy interface for backward compatibility."""
    
    def evaluate(self, sensors: Dict[str, float], bed_angle_deg: float, phase: str):
        """
        Legacy evaluate method. Map old sensor fields to new format.
        """
        # Map old sensor names to new
        load_norm = sensors.get('vibration_g', 0) / 1.25  # use vibration as proxy
        acoustic_norm = (sensors.get('acoustic_db', 55) - 55.0) / 37.0
        vision_norm = 0.5  # default
        us_norm = sensors.get('lidar_mm', 50) / 85.0
        
        result = self.fuse(
            load=load_norm,
            acoustic=acoustic_norm,
            vision=vision_norm,
            ultrasonic=us_norm,
            load_tonnes=0.0,
            acoustic_deviation=0.0,
            zones={}
        )
        
        return result
