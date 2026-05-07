# SCBES Digital Twin

Smart Carry-Back Detection and Elimination System digital twin for Caterpillar dump trucks.

This project simulates a truck dumping cycle, generates synthetic sensor readings, fuses those readings into a carry-back decision, and streams the result to a real-time dashboard. The idea is simple: show, in one place, how the truck bed moves, what the sensors are seeing, what the AI thinks, and what corrective action should happen when residue is detected.

## What This Project Is

The digital twin is a complete demo environment for a dump-truck residue detection workflow.

In practical terms, it does four things at once:

1. Simulates the dump cycle of a Caterpillar haul truck.
2. Generates realistic sensor values for acoustic, vibration, thermal, and proximity signals.
3. Uses a backend fusion engine and state machine to decide whether carry-back residue is present.
4. Shows the result in a 3D React dashboard with live telemetry, controls, and decision logging.

It is designed so that a person with no prior context can open the app and understand the complete flow of the system from inputs to decision to response.

## Core Idea

The project models a real mining problem: after a truck dumps material, some of the load can cling to the bed and fail to release completely. That leftover material is called carry-back or residue.

The digital twin is meant to answer these questions:

1. Is the bed clean or still carrying material?
2. Which sensors indicate residue?
3. Which zones of the bed look affected?
4. Should the truck continue, monitor, or trigger elimination/correction?
5. What does the full dump cycle look like visually and numerically?

The system is built so those answers are visible both as engineering data and as a human-readable explanation.

## Main Features

### Real-Time Simulation

The app runs a continuous dump-cycle simulation. It advances the truck state, updates sensor values, and emits new telemetry on every polling cycle.

### 3D Truck Visualization

The center viewport renders a Three.js scene with the truck body, dump bed, particles, sensor markers, environment lighting, and alert effects. Camera presets let you inspect the truck from several angles.

### Live Sensor Dashboard

The dashboard shows live sensor values, sparkline history, acoustic analysis, fusion confidence, AI decision logs, a zone heatmap, and a system flow diagram.

### Manual Controls

The control panel lets you:

1. Start the dump cycle.
2. Pause or resume the sequence.
3. Stop and reset the simulation.
4. Trigger vibration to emulate corrective action.
5. Change the scenario and material profile.
6. Toggle zone overlays.
7. Switch between truck models.

### Explainable Fusion

The backend does not just return a score. It returns:

1. A fused residue risk score.
2. A classification result such as RESIDUE or EMPTY.
3. A confidence/status level.
4. Sensor-by-sensor contributions.
5. Human-readable reasoning.
6. Zone-based corrective action guidance.

### Real-Time Socket Stream

The backend emits Socket.IO events so the frontend can stay in sync without manual refreshes. The dashboard shows when the backend is connected and when telemetry is flowing.

### Scenario-Driven Behavior

The app can be driven by different residue scenarios and material profiles, so the visual state, sensor response, and fusion outcome all change together.

## System Overview

The system is split into two major parts:

### Frontend

The frontend is a React + Vite application. It owns the user interface, 3D visualization, simulation controls, visual effects, and live charts.

### Backend

The backend is a Flask application. It owns the simulation state machine, sensor generation, fusion logic, zone mapping, REST endpoints, and Socket.IO event stream.

### High-Level Data Flow

1. The frontend sends the current scenario and control state to the backend.
2. The backend advances the dump-cycle state machine.
3. The backend generates synthetic sensor readings based on the phase, bed angle, and material profile.
4. The fusion engine evaluates the readings and produces a residue decision.
5. The backend maps the result into bed zones.
6. The backend returns JSON and emits Socket.IO telemetry.
7. The frontend ingests the response into global state and updates the UI.

## Frontend Layout

The UI is arranged as a three-part operator console.

### Top Bar

The header shows the current truck, cycle number, bed angle, latency, connection state, and current operating phase.

### Left Panel: Control Center

The left sidebar contains the operational controls and simulation settings. It is where the user starts and manipulates the cycle.

### Center Panel: 3D Scene and Timeline

The middle panel shows the truck scene and the dump-cycle timer. It is the main visual focus of the application.

### Right Panel: Sensor Intelligence

The right sidebar displays sensor values, diagnostics, fusion confidence, zone scores, and decision history.

### Mobile Behavior

The layout collapses gracefully on smaller screens. The app still keeps the main information hierarchy intact even when the side panels are hidden or stacked.

## Frontend Feature Details

### Truck Selector

The top bar includes a truck selector so the user can switch between supported truck models. The scene and controls react to the selected truck.

### Demo Mode

A floating demo control is available for guided demonstrations.

### 3D Scene

The truck scene uses React Three Fiber and Drei. It includes:

1. Truck body and dump bed geometry.
2. Material particles to represent cargo.
3. Sensor markers.
4. Environmental lighting.
5. Alert lighting and warning effects.
6. Camera presets such as ISO, SIDE, FRONT, TOP, and REAR.
7. Optional 360-degree auto-rotation.

### Control Panel

The control panel contains several sections:

1. Status summary with current state and bed angle.
2. Scenario selection for residue behavior.
3. Material profile selection.
4. Main cycle controls.
5. Zone and visualization toggles.
6. Timeline and progression indicators.

### Sensor Dashboard

The sensor dashboard displays live numeric values and trend charts for the simulated sensors.

It includes sensor health indicators, fusion confidence, AI decision logs, zone heatmap information, acoustic analysis, and a system flow overview.

### Dump Cycle Timer

The timer component shows the current stage of the dump cycle, the elapsed time, and the progression of the correction sequence.

## Frontend State Model

The app uses Zustand for global state management.

The store keeps track of:

1. Connection state and connection errors.
2. Selected truck and truck metadata.
3. Scenario and material profile.
4. Current cycle state and phase.
5. Sensor values and derived sensor readings.
6. Zone scores and zone details.
7. Fusion output and decision status.
8. Telemetry history and decision logs.
9. UI toggles such as zones, particles, and auto-rotation.

The store is the central source of truth for the entire dashboard.

## Frontend Data Sources

### Socket Stream

The frontend connects to the backend through Socket.IO and listens for `telemetry` and `decision_log` events.

### Polling Loop

The frontend also runs a polling loop that posts to the backend prediction endpoint on a timer. This keeps the simulation moving even when the socket connection is only using polling transport.

### Derived Visualization

Several components build charts, gauges, and trend lines from the current state and history arrays.

## Backend Responsibilities

The backend is responsible for the logic that makes the simulation believable.

### Flask API

It exposes REST endpoints for health checks, predictions, and zone mapping.

### Socket.IO Events

It emits live telemetry and decision logs to any connected frontend client.

### State Machine

The backend maintains a dump-cycle state machine with explicit states such as IDLE, DUMPING, DETECTING, CARRY_BACK_DETECTED, CORRECTING, VERIFYING, and CLEAR.

### Sensor Simulator

It generates sensor readings based on the active scenario, bed angle, phase, material profile, and vibration boost.

### Fusion Engine

It combines the sensor evidence into a single carry-back decision with explainable output.

### Zone Mapper

It converts risk and vibration context into zone-specific scores for the front-left, front-center, front-right, rear-left, rear-center, and rear-right bed regions.

## Backend Decision Logic

The backend works in a fixed order each cycle:

1. Read the incoming request payload.
2. Apply control commands to the state machine.
3. Advance the cycle by the requested time delta.
4. Generate the current sensor readings.
5. Evaluate those readings using the fusion engine.
6. Build zone scores and corrective action guidance.
7. Return the response as JSON.
8. Emit telemetry and decision log events to Socket.IO listeners.

The important thing is that the output is not arbitrary. Every returned value comes from a specific part of the simulation pipeline.

## Sensor Model

The backend generates four main sensor types:

1. Acoustic: models resonance and material noise.
2. Vibration: models bed and material vibration.
3. Thermal: models temperature changes tied to the dump cycle.
4. Lidar/proximity: models remaining material height and bed clearance.

The sensor values are influenced by:

1. The selected scenario.
2. The dump phase.
3. The dump bed angle.
4. The material profile.
5. Any vibration boost or corrective action.

## Fusion Model

The fusion engine is a weighted multi-sensor decision layer.

The default sensor weights are:

1. Load: 0.35
2. Acoustic: 0.30
3. Vision: 0.25
4. Ultrasonic: 0.10

The decision threshold is 0.65.

The fusion output includes:

1. A binary-like result of RESIDUE or EMPTY.
2. A confidence score.
3. A status band such as HIGH, MEDIUM, LOW, or NONE.
4. Sensor contribution scores.
5. Reasoning statements that explain the choice.
6. Zone analysis with active zones and corrective action.

## Zone Mapping

The zone mapper turns residue risk into spatial scores for six regions:

1. FL
2. FC
3. FR
4. RL
5. RC
6. RR

The scores are biased by bed angle and vibration, so front and rear zones do not all respond the same way. That gives the dashboard a more realistic spatial story.

## Supported Scenarios

The application uses scenario presets to change the severity and style of the simulation.

The frontend currently exposes these main scenario options:

1. Empty truck.
2. Partial residue.
3. Full residue.

The backend also includes additional scenario labels in its simulator for conditions such as:

1. Normal.
2. Wet ore.
3. Sticky clay.
4. Cold shift.

These scenarios change the generated sensor profile and therefore the fusion outcome.

## Supported Truck Models

The UI supports multiple Caterpillar truck models.

1. CAT 793F.
2. CAT 797B.
3. CAT 789C.

Switching models changes the scene preset, camera framing, and truck metadata shown in the interface.

## API Endpoints

### `GET /health`

Returns a simple service health payload. Useful for checking whether the backend is alive.

Example response:

```json
{"status":"ok","service":"scbes-backend"}
```

### `POST /predict`

Runs one simulation step and returns the full telemetry response.

Request fields:

1. `scenario` - simulation scenario name.
2. `dt` - time delta for the step.
3. `control` - control commands and flags.

Response includes:

1. Timestamp.
2. Scenario.
3. State and phase progress.
4. Material profile.
5. Sensor readings.
6. Fusion decision.
7. Zone analysis.
8. Latency.
9. Alert flag.

### `POST /zones`

Analyzes supplied zone data and returns a zone mapping response.

This is useful when you want to test or inspect zone logic independently from the full cycle response.

### `/socket.io`

Real-time stream endpoint used by the frontend to receive live telemetry and decision log updates.

## Socket Events

### `telemetry`

Contains the full simulation response, including state, sensors, fusion, zones, latency, and alert status.

### `decision_log`

Contains a compact explanation of the current decision, including the action, rationale, risk, and reasoning trace.

### `connect`

When the socket connects, the backend emits an initial connected status message so the UI can show that the stream is live.

## Project Structure

```text
backend/          Flask API, sensor simulation, fusion engine, state machine
frontend/         React UI, dashboard, 3D scene, state store, hooks
README.md         Main project guide
```

More specifically:

### Backend Files

1. `app.py` - Flask routes and Socket.IO wiring.
2. `fusion_engine.py` - weighted fusion logic and explainability.
3. `state_machine.py` - cycle state transitions.
4. `sensor_simulator.py` - synthetic sensor generation.
5. `zone_mapper.py` - zone score mapping.

### Frontend Files

1. `src/App.jsx` - page layout and top-level orchestration.
2. `src/store/simulationStore.js` - global application state.
3. `src/hooks/useSocket.js` - socket connection handling.
4. `src/hooks/useSimulation.js` - polling loop to call the backend.
5. `src/hooks/useDumpCycleSequence.js` - deterministic demo cycle sequence.
6. `src/components/ControlPanel/` - operational controls and status cards.
7. `src/components/SensorDashboard/` - live telemetry and diagnostics.
8. `src/components/TruckScene/` - 3D truck rendering and visual effects.

## Technology Stack

### Frontend

1. React 18.
2. Vite.
3. Tailwind CSS.
4. Framer Motion.
5. Zustand.
6. Recharts.
7. Socket.IO client.
8. Three.js with React Three Fiber and Drei.

### Backend

1. Python 3.10+.
2. Flask.
3. Flask-CORS.
4. Flask-SocketIO.
5. NumPy.

## Installation

### 1) Python Environment

Activate the existing virtual environment if you are using one:

```bash
source .venv/bin/activate
```

If you need to set up a new environment, use your preferred Python tooling and then install the backend requirements.

### 2) Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3) Frontend Dependencies

```bash
cd frontend
npm install
```

If you are starting from a fresh clone, run both installs once before launching the app.

## Running the Project

You need two processes:

### Backend

From the project root:

```bash
npm run backend:dev
```

Or directly:

```bash
cd backend && python app.py
```

The backend listens on port `5001` by default.

### Frontend

From the project root:

```bash
npm run dev
```

This forwards to the frontend Vite server.

Or directly:

```bash
cd frontend && npm run dev
```

The frontend listens on port `5173` by default.

### Open the App

Once both are running, open:

```text
http://localhost:5173
```

## Helpful Commands

```bash
npm run backend:install
npm run backend:dev
npm run dev
npm run frontend:build
npm run frontend:preview
```

## Environment Variables

### Frontend

You can override the backend URL and port with:

1. `VITE_BACKEND_URL`
2. `VITE_BACKEND_PORT`

If neither is set, the frontend defaults to `http://localhost:5001`.

### Backend

The backend reads:

1. `PORT` - HTTP port for the Flask server.

If not set, the backend uses port `5001`.

## What Happens During a Normal Cycle

1. The app starts in an idle or loading state.
2. The user starts a dump cycle or the demo sequence advances it automatically.
3. The bed raises through the dump phases.
4. The backend generates sensor data for the current phase.
5. The fusion engine evaluates the readings.
6. If residue risk is high, the system switches into a correction path.
7. The UI shows the result in the dashboard, the 3D scene, and the decision log.
8. The cycle eventually clears and returns to idle.

## Visual Language

The interface uses a dark industrial style to fit the mining context. Yellow is used as the primary accent, with green, amber, red, and blue used for state-specific feedback. The layout is intentionally dense and operational, like a control room rather than a marketing page.

## Validation Status

The project has already been validated in the workspace.

1. Backend health endpoint responds successfully.
2. Fusion engine returns valid JSON with reasoning.
3. Socket.IO connection works.
4. Frontend receives telemetry and decision logs.
5. The end-to-end cycle simulation works.

## Troubleshooting

### `npm run dev` says missing script

Make sure you are running the command from the repository root. The root `package.json` now includes a `dev` script that forwards to the frontend.

### Vite says `vite: command not found`

Install the frontend dependencies first:

```bash
cd frontend
npm install
```

### Frontend cannot connect to backend

Check that the backend is running on port `5001`. If you changed the backend port, update `VITE_BACKEND_URL` or `VITE_BACKEND_PORT` accordingly.

### Socket status stays offline

Make sure the backend is running and that the browser can reach `http://localhost:5001`. The frontend uses polling transport, so HTTP connectivity matters.

### The scene loads but values look static

Start the backend and allow the polling loop to run. The frontend depends on fresh telemetry from the backend to animate the dashboard.

## Notes For New Readers

If you are opening this project for the first time, the simplest way to understand it is:

1. Look at the 3D truck in the center.
2. Watch the sensor values on the right.
3. Use the controls on the left to change the cycle.
4. Read the decision log to see why the system reacted.
5. Compare the visual scene with the backend outputs in `/predict`.

That sequence covers the entire idea of the project: a realistic dump-truck residue detection twin that is readable, explainable, and interactive.
