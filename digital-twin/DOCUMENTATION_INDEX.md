# Documentation Index
**Last Updated**: 2026-04-29 | **Project Status**: ✅ Production Ready

## 📖 Start Here

1. **[README.md](./README.md)** – Original quick start guide
2. **[PROJECT_COMPLETION_SUMMARY.md](./PROJECT_COMPLETION_SUMMARY.md)** – What was delivered
3. **[SOCKET_VALIDATION_REPORT.md](./SOCKET_VALIDATION_REPORT.md)** – Socket.io validation results

## 🔧 Technical Reference

### System Architecture & API
See commit history and backend/frontend files:
- `backend/app.py` – Flask routes & Socket.IO setup
- `backend/fusion_engine.py` – Bayesian fusion algorithm
- `backend/state_machine.py` – 7-phase dump cycle
- `frontend/src/hooks/useSocket.js` – Socket connection
- `frontend/src/hooks/useSimulation.js` – Control logic

### Key Concepts

**Dump Cycle Phases** (7-phase sequence):
```
IDLE → DUMPING (12s) → DETECTING (3s) → CARRY_BACK_DETECTED (2s) →
CORRECTING (4s) → VERIFYING (3s) → CLEAR (2s) → IDLE
```

**Sensor Fusion Weights**:
- Load Cell: 0.35 (most reliable)
- Acoustic: 0.30
- Vision: 0.25
- Ultrasonic: 0.10
- Threshold: 0.65

**API Endpoints**:
- `GET /health` – Health check
- `POST /predict` – Prediction + telemetry
- `POST /zones` – Zone analysis
- `/socket.io` – Real-time events

## 🚀 Deployment

### Quick Local Start
```bash
# Terminal 1: Backend
cd backend && source ../.venv/bin/activate && python app.py

# Terminal 2: Frontend
cd frontend && npm run dev

# Open: http://localhost:5173
```

### Production Deployment
Refer to backend documentation files or use:
- nginx reverse proxy configuration
- Gunicorn for WSGI
- systemd service management
- Let's Encrypt SSL certificates

## ✅ Validation

### Tests Performed
- ✅ Backend health endpoint
- ✅ Fusion engine predictions
- ✅ Socket.IO connection
- ✅ Frontend integration
- ✅ End-to-end cycle simulation

### Known Status
- Backend: Running on port 5001 ✅
- Frontend: Running on port 5173 ✅
- Socket.IO: Connected via polling ✅
- Port configuration: Fixed ✅

## 📋 Quick Reference

### Running Servers
- Backend: `python backend/app.py`
- Frontend: `cd frontend && npm run dev`

### Project Structure
```
backend/           # Flask server + fusion engine
frontend/          # React + Three.js UI
.venv/             # Python virtual environment
README.md          # Original quick start
```

## 📊 Project Statistics

- **Backend**: 800+ lines of Python
- **Frontend**: 2,500+ lines of React
- **Configuration**: 200+ lines
- **Documentation**: 1,500+ lines
- **Test Coverage**: All major components validated

## 🎯 Next Steps

1. **Review** – Check PROJECT_COMPLETION_SUMMARY.md
2. **Validate** – Run local servers and test socket connection
3. **Deploy** – Follow production setup in backend docs
4. **Extend** – Add features or integrate with hardware

---

**Status**: ✅ **PRODUCTION READY** | **Version**: 2.0
