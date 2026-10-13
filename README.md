# ⚡ PulseAttend 360™ AI
### Enterprise Multi-Angle Facial Biometric Attendance & Workforce Management Platform

[![CI Pipeline](https://github.com/Mr-Satyajeet-Patil/company-attendance-system/actions/workflows/ci.yml/badge.svg)](https://github.com/Mr-Satyajeet-Patil/company-attendance-system/actions/workflows/ci.yml)
[![Django](https://img.shields.io/badge/Django-6.1-green.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com/)
[![DeepFace](https://img.shields.io/badge/DeepFace-Facenet512-orange.svg)](https://github.com/serengil/deepface)

**PulseAttend 360 AI** is an enterprise-grade attendance and biometric workforce management platform. It integrates a **Django REST backend** powered by **DeepFace (Facenet-512)** and **OpenCV** with a cybernetic **React 19 + Tailwind CSS** frontend.

Traditional single-image attendance systems often suffer from high false-rejection rates due to slight head pose, expression, or lighting variations. **PulseAttend 360 AI** solves this by capturing a **4-angle biometric enrollment ensemble** (Frontal, Left ~15°, Right ~15°, Natural Expression) and evaluating live camera probes against normalized 512-dimensional vector embeddings in sub-second time.

---

## 🌟 Architecture & Key Features

### 1. 📷 Multi-Angle Facial Biometrics & Anti-Spoofing
* **4-Step Guided Enrollment Wizard:**
  1. **Frontal Center:** Baseline neutral head pose.
  2. **Slight Left (~15°):** Left orbital and jawline geometry.
  3. **Slight Right (~15°):** Right cheekbone and contour profile.
  4. **Natural Expression / Smile:** Dynamic facial muscle variance.
* **Vectorized Cosine Similarity:** Each angle is pre-processed into a 512-dimensional $L_2$-normalized vector stored as a JSON array (`EmployeeFaceSample`). Matching executes via matrix dot products in NumPy ($< 1$ms).
* **Anti-Spoofing & Quality Gate:**
  * **Variance of Laplacian:** Rejects severely blurred inputs and flat digital phone screen recaptures (texture variance score $< 15$).
  * **Glare / Specular Reflection Detector:** Flags excessive backlight clipping common in smartphone replay attacks.
  * **Liveness Recommendation:** In critical corporate perimeter security, pairing this software with active blink challenges or IR depth hardware is recommended.

### 2. 🖥️ Live Biometric Kiosk Terminal
* **Cybernetic HUD Overlay:** Real-time webcam viewfinder with face target brackets, animated light beam, and visual guidance.
* **Touchless Auto-Scan Mode:** Automatically scans every 4 seconds with a **6-second throttle** and a **90-second debounce cooldown** to prevent duplicate checkout punches.
* **Web Audio API Synthesizer:** Real-time audio chimes for Check-In (harmonic rising chord), Check-Out (gentle chord), and alerts (warning beep).
* **Instant Verification Card:** Displays employee photo, ID, timestamp, calculated working duration, and match confidence percentage.

### 3. 🏢 Real-World Workforce Management
* **Smart Punctuality Engine:**
  * Configurable shift schedules and morning grace period (defaults to 15 minutes).
  * Automatic status assignment: `Present`, `Late`, `Half-Day` ($< 4.0$ hrs), or `Absent`.
  * Automatic overtime calculation for hours worked beyond the 8.0-hour threshold.
* **Employee Directory:** Search, department filtering, profile editing, and biometric calibration.
* **Timesheets & Audit Logs:** Date range filtering, manual HR punch adjustments with audit notes, and 1-click **CSV Export**.
* **Leave Management:** Support for Casual, Sick, Paid, and WFH leaves with manager approval/rejection workflows.
* **WhiteNoise Static Serving:** Production-ready asset compression and cache headers.

---

## 🔒 Security & Production Hardening

* **Environment Variable Isolation:** Secrets and environment settings are loaded through `.env` (`.env.example` included).
* **Host & CORS Restrictions:** When `DJANGO_DEBUG=False`, hosts and CORS origins are strictly locked down via `DJANGO_ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`.
* **Configurable Timezone:** Defaults to `Asia/Kolkata` (`DJANGO_TIME_ZONE`) to prevent date discrepancies across midnight punch shifts.
* **Database Agnostic:** Runs on SQLite locally, switches to PostgreSQL automatically when `DATABASE_URL` is provided.
* **Biometric Privacy:** Biometric templates are stored as irreversibly hashed/embedded 512-dim vectors rather than raw facial recognition models. Supports both soft-deactivation and permanent record deletion (`?permanent=true`).

---

## 🧪 Automated Testing & CI Pipeline

The project includes **19 automated unit and API integration tests** that run on an isolated, in-memory database without needing a running server or leaving residue:

```bash
python manage.py test
```

### GitHub Actions CI Workflow
Every push to `main` executes `.github/workflows/ci.yml`:
1. Installs Python 3.12 and dependencies.
2. Validates Django system configuration (`python manage.py check`).
3. Executes all 19 automated unit tests (`python manage.py test`).
4. Verifies the React 19 production build (`npm run build`).

---

## 🚀 Deployment Guide

### Architecture Overview

```
               ┌────────────────────────────────────────────────────────┐
               │                     User Browser                       │
               └───────────────────┬────────────────┬───────────────────┘
                                   │                │
            Frontend Requests      │                │ API & Biometric Probes
            (HTML / JS / CSS)      ▼                ▼ (/api/*)
               ┌───────────────────────┐        ┌───────────────────────┐
               │    Vercel Edge CDN    │        │  Render / Railway App │
               │ (React 19 Production) │        │ (Django REST + AI WSGI│
               └───────────────────────┘        └───────────┬───────────┘
                                                            │
                                                            ▼
                                                ┌───────────────────────┐
                                                │ PostgreSQL & Storage  │
                                                └───────────────────────┘
```

### 1. Deploying the React Frontend on Vercel
1. Push your code to GitHub.
2. Import the repository in **Vercel**.
3. Vercel automatically detects [`vercel.json`](./vercel.json) and builds `frontend/dist`.
4. In Vercel Project Settings ➔ **Environment Variables**, set:
   ```env
   VITE_API_URL=https://your-backend-api.onrender.com
   ```

### 2. Deploying the Django + AI Backend on Render / Railway
Because **TensorFlow (~550 MB)** and **DeepFace** exceed Vercel's 250 MB serverless function limit, the Python backend runs as a containerized web service:
1. Connect your GitHub repository to **[Render.com](https://render.com/)** or **Railway**.
2. Select **Web Service** with Python 3.12.
3. Set the build and start commands:
   * **Build Command:** `pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput`
   * **Start Command:** `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
4. Configure environment variables from `.env.example` (set `DJANGO_DEBUG=False`, `DJANGO_SECRET_KEY`, and `CORS_ALLOWED_ORIGINS`).

---

## 💻 Local Development Setup

### Prerequisites
* Python 3.12+
* Node.js 20+

### Option A: Unified Local Run (Single Command)
```bash
# 1. Activate Virtual Environment
.\venv\Scripts\activate

# 2. Run Database Migrations
python manage.py migrate

# 3. Start Server
python manage.py runserver 127.0.0.1:8000
```
Open your browser at: **http://127.0.0.1:8000/**

### Option B: Frontend Hot-Reload Development
```bash
# Terminal 1: Backend
python manage.py runserver 8000

# Terminal 2: React Dev Server
cd frontend
npm run dev
```
Open your browser at: **http://localhost:5173/**
