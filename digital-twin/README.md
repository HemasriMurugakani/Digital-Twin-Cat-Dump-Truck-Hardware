# SCBES Digital Twin (Caterpillar 793F)

Production-grade simulation environment for Smart Carry-Back Detection and Elimination System.

## Stack

- Frontend: React 18, Vite, Tailwind, Framer Motion, Recharts, Zustand, Socket.IO client, Three.js (@react-three/fiber + drei)
- Backend: Python 3.10+, Flask, Flask-CORS, Flask-SocketIO, eventlet, numpy

## Run Backend

1. Install Python dependencies:

```bash
npm run backend:install
```

2. Start backend server on port 5001:

```bash
npm run backend:dev
```

## Run Frontend

1. Install frontend dependencies:

```bash
npm --prefix frontend install
```

2. Start Vite development server on port 5173:

```bash
npm run frontend:dev
```

## Build Frontend

```bash
npm run frontend:build
```

## Main Endpoints

- Health: GET /health
- Prediction + stream trigger: POST /predict
- Socket.IO stream events: telemetry, decision_log

## Scenarios

- normal
- wet_ore
- sticky_clay
- cold_shift
