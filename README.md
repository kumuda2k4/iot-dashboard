# 🌡️ THERMNET — IoT Temperature Alert & Monitoring System

Full-stack IoT project: ESP8266 + DHT11 + Firebase + React (Vercel)

---

## 📁 Project Structure

```
iot-dashboard/
├── firmware/
│   └── esp8266_firmware.ino     ← Upload to NodeMCU
├── src/
│   ├── App.jsx                  ← Main React dashboard
│   ├── App.css                  ← Styles
│   └── main.jsx                 ← Entry point
├── index.html
├── package.json
├── vite.config.js
└── .env.example                 ← Copy → .env.local
```

---

## ⚙️ PART 1 — WIRING

| Component | NodeMCU Pin |
|-----------|-------------|
| DHT11 DATA | D4 (GPIO2) |
| DHT11 VCC | 3.3V |
| DHT11 GND | GND |
| LED (+) | D2 (GPIO4) → 220Ω → LED |
| Buzzer (+) | D1 (GPIO5) |
| All GND | GND |

---

## 🔥 PART 2 — FIREBASE SETUP (Step by Step)

### Step 1 — Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Name it: `iot-temp-monitor` (or anything)
4. Disable Google Analytics (not needed) → **Create project**

### Step 2 — Enable Realtime Database
1. In the left sidebar → **Build** → **Realtime Database**
2. Click **"Create Database"**
3. Choose location: **United States** (or nearest)
4. Start in **Test mode** (allows open read/write for now)
5. Click **Enable**

> Your database URL will look like:
> `https://iot-temp-monitor-default-rtdb.firebaseio.com`

### Step 3 — Get Database Secret (for ESP8266)
1. Click the ⚙️ gear icon → **Project Settings**
2. Go to **Service accounts** tab
3. Scroll down → **Database secrets**
4. Click **"Show"** next to the secret key
5. **Copy** this value → paste into `FIREBASE_AUTH` in firmware

### Step 4 — Get Web App Credentials (for React)
1. In Project Settings → **General** tab
2. Scroll to **"Your apps"** → click **"</>"** (Web) icon
3. App nickname: `iot-dashboard` → **Register app**
4. Copy the `firebaseConfig` object shown — you'll need all 7 values

### Step 5 — Set Database Rules (for production)
Go to Realtime Database → **Rules** tab and paste:
```json
{
  "rules": {
    "iot": {
      ".read": true,
      ".write": true
    }
  }
}
```
Click **Publish**.

---

## 💻 PART 3 — ESP8266 FIRMWARE SETUP

### Install Arduino Libraries
In Arduino IDE → **Sketch → Include Library → Manage Libraries**:
- `DHT sensor library` by Adafruit
- `FirebaseESP8266` by Mobizt
- `NTPClient` by Fabrice Weinberg

Also install ESP8266 board:
- File → Preferences → Additional URLs:
  `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
- Tools → Board Manager → search "esp8266" → install

### Configure Firmware
Open `firmware/esp8266_firmware.ino` and fill in:
```cpp
#define WIFI_SSID     "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define FIREBASE_HOST "your-project-id-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "YOUR_DATABASE_SECRET"
```

### Upload
- Board: **NodeMCU 1.0 (ESP-12E Module)**
- Port: your COM port
- Upload speed: 115200
- Click Upload ✓

Open Serial Monitor (115200 baud) to see readings.

---

## 🌐 PART 4 — REACT DASHBOARD LOCAL SETUP

```bash
# In the iot-dashboard/ folder:
npm install

# Create environment file
cp .env.example .env.local
# Fill in all VITE_FIREBASE_* values from Step 4 above

# Run locally
npm run dev
# → Open http://localhost:5173
```

---

## 🚀 PART 5 — VERCEL DEPLOYMENT (Step by Step)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial IoT dashboard"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/iot-dashboard.git
git push -u origin main
```

### Step 2 — Import to Vercel
1. Go to https://vercel.com → Sign up/Login with GitHub
2. Click **"Add New Project"**
3. Find your `iot-dashboard` repo → click **Import**
4. Framework preset: **Vite** (auto-detected)
5. Root directory: leave as `.` (project root)
6. Build command: `npm run build` (auto-filled)
7. Output directory: `dist` (auto-filled)

### Step 3 — Add Environment Variables (CRITICAL!)
Before clicking Deploy:
1. Click **"Environment Variables"** section
2. Add ALL 7 variables from your `.env.local`:

| Name | Value |
|------|-------|
| `VITE_FIREBASE_API_KEY` | your value |
| `VITE_FIREBASE_AUTH_DOMAIN` | your value |
| `VITE_FIREBASE_DATABASE_URL` | your value |
| `VITE_FIREBASE_PROJECT_ID` | your value |
| `VITE_FIREBASE_STORAGE_BUCKET` | your value |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | your value |
| `VITE_FIREBASE_APP_ID` | your value |

### Step 4 — Deploy
Click **Deploy** → wait ~1 minute → 🎉

Your public URL: `https://iot-dashboard-xxxxx.vercel.app`

### Step 5 — Add Vercel URL to Firebase Auth Domains
1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add your `iot-dashboard-xxxxx.vercel.app` domain
3. Click **Add**

---

## 🧪 VALIDATION CHECKLIST

- [ ] Serial monitor shows temperature readings
- [ ] Firebase Realtime Database shows `/iot/current/temperature` updating
- [ ] LED turns ON when temp > 30°C
- [ ] Buzzer activates when temp > 30°C
- [ ] Dashboard shows live temperature value
- [ ] Chart shows last 20 readings
- [ ] Status banner shows HIGH TEMP / NORMAL correctly
- [ ] Vercel URL works from mobile/other device

---

## 📊 Firebase Data Structure

```
iot/
├── current/
│   ├── temperature: 28.5
│   ├── humidity: 65.0
│   ├── status: "NORMAL"
│   ├── alert: false
│   ├── timestamp: "14:32:05"
│   └── readingCount: 42
├── history/
│   ├── 0/ { temperature, humidity, status, timestamp, index }
│   ├── 1/ ...
│   └── 49/ (circular buffer, stores last 50 readings)
└── threshold: 30
```

---

## 🔧 Troubleshooting

| Problem | Fix |
|---------|-----|
| DHT11 reads NaN | Check wiring, add 10kΩ pull-up on DATA pin |
| Firebase connection fails | Check FIREBASE_HOST (no `https://`, no trailing `/`) |
| Dashboard shows no data | Check database rules allow read, check .env.local |
| Vercel build fails | Ensure all VITE_ env vars are set in Vercel settings |
| LED/Buzzer not responding | Check pin numbers match wiring, check GND connection |
