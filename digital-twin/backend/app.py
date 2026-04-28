"""
Section 11: SCBES Backend with Bayesian Fusion and Explicit State Machine
"""

from __future__ import annotations

from datetime import datetime, timezone
from time import perf_counter

import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO

from fusion_engine import SensorFusionEngine
from sensor_simulator import SensorSimulator
from state_machine import DumpCycleStateMachine
from zone_mapper import ZoneMapper

app = Flask(__name__)
app.config['SECRET_KEY'] = 'scbes-digital-twin-secret'
CORS(app)
# Use threading async mode to avoid eventlet issues on newer Python versions
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

state_machine = DumpCycleStateMachine()
simulator = SensorSimulator()
fusion_engine = SensorFusionEngine()
zone_mapper = ZoneMapper()


@app.get('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'scbes-backend'})


@app.post('/predict')
def predict():
    """
    Main prediction endpoint: simulate cycle, fuse sensors, evaluate zones.
    Returns enhanced fusion result with reasoning, sensor contributions, and zone analysis.
    """
    start = perf_counter()
    payload = request.get_json(silent=True) or {}

    scenario = payload.get('scenario', 'normal')
    dt = float(payload.get('dt', 1.5))
    control = payload.get('control') or {}

    state_machine.apply_control(control)

    cycle_state = state_machine.step(dt)
    sensors = simulator.generate_readings(
        scenario=scenario,
        bed_angle_deg=cycle_state.bed_angle_deg,
        phase=cycle_state.phase,
        material_profile=state_machine.material_profile,
        vibration_boost=state_machine.get_vibration_boost(),
    ).as_dict()

    state_machine.decay_vibration_boost(dt)

    # Call fusion engine with new interface
    fusion = fusion_engine.evaluate(
        sensors=sensors,
        bed_angle_deg=cycle_state.bed_angle_deg,
        phase=cycle_state.phase,
    ).as_dict()

    zones = zone_mapper.map_zones(
        residue_risk=fusion['residue_risk'],
        vibration_g=sensors['vibration_g'],
        bed_angle_deg=cycle_state.bed_angle_deg,
    )

    elapsed_ms = (perf_counter() - start) * 1000.0
    response = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'scenario': scenario,
        'state': {
            'phase': cycle_state.phase,
            'phase_progress': round(cycle_state.phase_progress, 4),
            'cycle_progress': round(cycle_state.cycle_progress, 4),
            'bed_angle_deg': round(cycle_state.bed_angle_deg, 3),
            'elapsed_s': round(cycle_state.elapsed_s, 3),
            'machine_state': state_machine.current_state,  # New: explicit state
            'state_duration_s': round(state_machine.get_state_duration(), 3),  # New: time in state
        },
        'material_profile': state_machine.material_profile,
        'sensors': sensors,
        'fusion': fusion,  # Now includes reasoning, sensor_contributions, zone_analysis
        'zones': zones,
        'latency_ms': round(elapsed_ms, 3),
        'alert': fusion['action'] == 'ENGAGE_ELIMINATION_SEQUENCE',
    }

    socketio.emit('telemetry', response)
    socketio.emit(
        'decision_log',
        {
            'timestamp': response['timestamp'],
            'action': fusion['action'],
            'rationale': fusion['rationale'],
            'risk': fusion['residue_risk'],
            'reasoning': fusion.get('reasoning', []),  # New: explainability
        },
    )

    return jsonify(response)


@app.post('/zones')
def map_zones_endpoint():
    """
    Zone mapping endpoint: analyze zones and determine corrective action.
    Request: {zones: {FL: {residue: bool, tonnes: float}, ...}}
    Response: {active_zones, total_tonnes, corrective_action, zones: {...}}
    """
    payload = request.get_json(silent=True) or {}
    zones = payload.get('zones', {})
    
    zone_analysis = fusion_engine._map_zones(zones)
    
    return jsonify(zone_analysis)


@socketio.on('connect')
def on_connect():
    socketio.emit(
        'decision_log',
        {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'action': 'CONNECTED',
            'rationale': 'Dashboard connected to SCBES backend stream.',
            'risk': 0.0,
            'reasoning': ['Backend socket connected and listening for telemetry'],
        },
    )


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5001'))
    socketio.run(app, host='0.0.0.0', port=port, debug=False, use_reloader=False)
