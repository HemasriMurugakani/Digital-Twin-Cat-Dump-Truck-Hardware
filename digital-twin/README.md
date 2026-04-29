# SCBES Digital Twin (Caterpillar 793F)

Production-grade simulation environment for Smart Carry-Back Detection and Elimination System.

## Stack

- Frontend: React 18, Vite, Tailwind, Framer Motion, Recharts, Zustand, Socket.IO client, Three.js (@react-three/fiber + drei)
- Backend: Python 3.10+, Flask, Flask-CORS, Flask-SocketIO, eventlet, numpy

## Installation

### Frontend

```bash
cd frontend
npm install
npm install three @react-three/fiber @react-three/drei
npm install tailwindcss framer-motion recharts socket.io-client zustand
npm install @react-spring/three gsap
npx tailwindcss init -p
```

### Backend

```bash
cd backend
pip install flask flask-cors flask-socketio eventlet numpy
```

## Startup

Open two terminals:

1. Terminal 1:

```bash
cd backend && python app.py
```

2. Terminal 2:

```bash
cd frontend && npm run dev
```

3. Open the app in your browser:

```text
http://localhost:5173
```

## Helpful Commands

```bash
npm run backend:install
npm run backend:dev
npm run frontend:build
npm run frontend:preview
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
