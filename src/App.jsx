import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

// ── Firebase Config (replace with yours from Firebase Console) ──
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const THRESHOLD = 30;

// ── Custom Tooltip for chart ──────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="chart-tooltip">
        <p className="tt-temp">{payload[0].value.toFixed(1)}°C</p>
        {payload[1] && <p className="tt-hum">{payload[1].value.toFixed(1)}% RH</p>}
        <p className="tt-time">{payload[0].payload.timestamp}</p>
      </div>
    );
  }
  return null;
};

export default function App() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const alertFlashRef = useRef(null);

  useEffect(() => {
    // Listen to current readings
    const currentRef = ref(db, "/iot/current");
    const unsubCurrent = onValue(currentRef, (snap) => {
      if (snap.exists()) {
        setCurrent(snap.val());
        setConnected(true);
        setLastSeen(new Date().toLocaleTimeString());
      }
    }, () => setConnected(false));

    // Listen to history
    const histRef = ref(db, "/iot/history");
    const unsubHistory = onValue(histRef, (snap) => {
      if (snap.exists()) {
        const raw = snap.val();
        const arr = Object.values(raw)
          .sort((a, b) => a.index - b.index)
          .slice(-20);
        setHistory(arr);
      }
    });

    return () => { unsubCurrent(); unsubHistory(); };
  }, []);

  const isAlert = current?.alert === true;
  const temp = current?.temperature ?? "--";
  const humidity = current?.humidity ?? "--";
  const status = current?.status ?? "WAITING";

  return (
    <div className={`app ${isAlert ? "alert-mode" : ""}`}>
      {/* Animated background grid */}
      <div className="bg-grid" />

      {/* Alert overlay pulse */}
      {isAlert && <div className="alert-pulse" />}

      {/* ── Header ────────────────────────────────────────── */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <span className="logo-text">THERMNET</span>
          </div>
          <span className="logo-sub">IoT Monitor v1.0</span>
        </div>
        <div className="header-right">
          <div className={`conn-dot ${connected ? "online" : "offline"}`} />
          <span className="conn-label">{connected ? "LIVE" : "DISCONNECTED"}</span>
          {lastSeen && <span className="last-seen">Updated {lastSeen}</span>}
        </div>
      </header>

      {/* ── Status Banner ─────────────────────────────────── */}
      <div className={`status-banner ${isAlert ? "banner-alert" : "banner-normal"}`}>
        <span className="banner-icon">{isAlert ? "⚠" : "✓"}</span>
        <span className="banner-text">
          {isAlert ? "HIGH TEMPERATURE ALERT" : "SYSTEM NORMAL"}
        </span>
        <span className="banner-node">NODE: ESP8266</span>
      </div>

      {/* ── Main Grid ─────────────────────────────────────── */}
      <main className="main-grid">

        {/* Temperature Card */}
        <div className={`card card-temp ${isAlert ? "card-alert" : ""}`}>
          <div className="card-label">TEMPERATURE</div>
          <div className="big-value">
            <span className="big-num">{typeof temp === "number" ? temp.toFixed(1) : temp}</span>
            <span className="big-unit">°C</span>
          </div>
          <div className="threshold-line">
            <span>THRESHOLD</span>
            <span>{THRESHOLD}°C</span>
          </div>
          <div className="temp-bar-wrap">
            <div
              className={`temp-bar ${isAlert ? "bar-hot" : "bar-cool"}`}
              style={{ width: `${Math.min((temp / 50) * 100, 100)}%` }}
            />
          </div>
          {isAlert && <div className="alert-tag">🔥 ABOVE THRESHOLD</div>}
        </div>

        {/* Humidity Card */}
        <div className="card card-hum">
          <div className="card-label">HUMIDITY</div>
          <div className="big-value">
            <span className="big-num hum">{typeof humidity === "number" ? humidity.toFixed(1) : humidity}</span>
            <span className="big-unit">%</span>
          </div>
          <div className="hum-rings">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="hum-ring"
                style={{ opacity: humidity !== "--" && (humidity / 100) > (i * 0.2) ? 1 : 0.15 }} />
            ))}
          </div>
        </div>

        {/* Status Card */}
        <div className="card card-status">
          <div className="card-label">SYSTEM STATUS</div>
          <div className={`status-badge ${isAlert ? "badge-alert" : "badge-normal"}`}>
            {status}
          </div>
          <div className="device-info">
            <div className="di-row"><span>LED</span><span className={`di-val ${isAlert ? "on" : "off"}`}>{isAlert ? "ON" : "OFF"}</span></div>
            <div className="di-row"><span>BUZZER</span><span className={`di-val ${isAlert ? "on" : "off"}`}>{isAlert ? "ACTIVE" : "SILENT"}</span></div>
            <div className="di-row"><span>READINGS</span><span className="di-val">{current?.readingCount ?? 0}</span></div>
            <div className="di-row"><span>SENSOR</span><span className="di-val">DHT11</span></div>
          </div>
        </div>

        {/* Chart Card */}
        <div className="card card-chart">
          <div className="card-label">TEMPERATURE HISTORY — LAST 20 READINGS</div>
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={history} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="timestamp" tick={{ fill: "#888", fontSize: 10 }} tickLine={false} />
                <YAxis domain={[0, 50]} tick={{ fill: "#888", fontSize: 10 }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={THRESHOLD} stroke="#ff4444" strokeDasharray="5 5" label={{ value: "Threshold", fill: "#ff4444", fontSize: 11 }} />
                <Line type="monotone" dataKey="temperature" stroke="#00d4ff"
                  strokeWidth={2} dot={{ fill: "#00d4ff", r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="humidity" stroke="#7c5cff"
                  strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">
              <div className="spinner" />
              <p>Awaiting data from sensor…</p>
            </div>
          )}
          <div className="chart-legend">
            <span className="leg-temp">─── Temperature</span>
            <span className="leg-hum">╌╌╌ Humidity</span>
            <span className="leg-thresh">╌╌╌ Threshold</span>
          </div>
        </div>

        {/* Firebase Path Info */}
        <div className="card card-info">
          <div className="card-label">FIREBASE DATA PATH</div>
          <div className="path-display">
            <div className="path-item"><span className="path-key">/iot/current/temperature</span><span className="path-val">{typeof temp === "number" ? temp.toFixed(1) + "°C" : "—"}</span></div>
            <div className="path-item"><span className="path-key">/iot/current/humidity</span><span className="path-val">{typeof humidity === "number" ? humidity.toFixed(1) + "%" : "—"}</span></div>
            <div className="path-item"><span className="path-key">/iot/current/status</span><span className="path-val">{status}</span></div>
            <div className="path-item"><span className="path-key">/iot/current/alert</span><span className="path-val">{String(isAlert)}</span></div>
            <div className="path-item"><span className="path-key">/iot/history/[0–49]</span><span className="path-val">circular</span></div>
          </div>
        </div>

      </main>

      <footer className="footer">
        THERMNET IoT Monitor · ESP8266 + DHT11 + Firebase + React · Deployed on Vercel
      </footer>
    </div>
  );
}
