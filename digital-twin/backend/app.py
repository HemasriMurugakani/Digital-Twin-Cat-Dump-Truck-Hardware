import time
import threading
import requests

from datetime import datetime, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO

# =====================================================
# Flask Setup
# =====================================================

app = Flask(__name__)
app.config["SECRET_KEY"] = "scbes-secret"

CORS(app)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)

# =====================================================
# Configuration
# =====================================================

ORIN_URL = "http://10.27.195.251:5000/data"

latest_data = {}

# =====================================================
# Health Check
# =====================================================

@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "scbes-backend"
    })

# =====================================================
# Optional Hardware POST Endpoint
# =====================================================

@app.route("/hardware", methods=["POST"])
def hardware():

    payload = request.get_json(silent=True) or {}

    global latest_data
    latest_data = payload

    socketio.emit(
        "hardware_telemetry",
        payload
    )

    return jsonify({
        "status": "ok"
    })

# =====================================================
# Latest Data Endpoint
# =====================================================

@app.route("/latest")
def latest():
    return jsonify(latest_data)

# =====================================================
# Poll Orin
# =====================================================

def poll_orin():

    global latest_data

    print("\n===================================")
    print("SCBES Backend Started")
    print("Polling:", ORIN_URL)
    print("===================================\n")

    while True:

        try:

            response = requests.get(
                ORIN_URL,
                timeout=2
            )

            if response.status_code == 200:

                data = response.json()

                latest_data = data

                print(
                    f"[{datetime.now().strftime('%H:%M:%S')}] "
                    f"Angle={data.get('angle')} "
                    f"Weight={data.get('weight')}"
                )

                socketio.emit(
                    "hardware_telemetry",
                    data
                )

            else:

                print(
                    "Orin returned:",
                    response.status_code
                )

        except Exception as e:

            print("Orin fetch error:", e)

        time.sleep(1)

# =====================================================
# Socket Events
# =====================================================

@socketio.on("connect")
def connect():

    print("Dashboard connected")

    socketio.emit(
        "decision_log",
        {
            "timestamp": datetime.now(
                timezone.utc
            ).isoformat(),

            "action": "CONNECTED",

            "rationale":
                "Dashboard connected to telemetry backend.",

            "risk": 0.0,

            "reasoning": [
                "Backend connected",
                "Telemetry stream active"
            ]
        }
    )

    if latest_data:

        socketio.emit(
            "hardware_telemetry",
            latest_data
        )

# =====================================================
# Main
# =====================================================

if __name__ == "__main__":

    threading.Thread(
        target=poll_orin,
        daemon=True
    ).start()

    socketio.run(
        app,
        host="0.0.0.0",
        port=5001,
        debug=False,
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )