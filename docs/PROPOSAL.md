# PROJECT A.R.E.S. (Astronaut Resistance & Exercise System) — Reconciled Master Specification

- **Competition:** NASA Space Apps Challenge (Nov 14–15 Sprint)
- **Challenge Addressed:** Health Monitoring Software for Astronauts / Mitigating Musculoskeletal Degradation in Long-Duration Spaceflight
- **Team Structure (6 Members):** 2 Documentation | 2 Frontend & Wireframes | 2 Development (SDD/TDD Core, AI Vision & Offline Sync)

---

## 1. Executive Summary
**PROJECT A.R.E.S.** is an offline-first, AI-driven fitness coach, gamified planetary progression dashboard, and autonomous medical telemetry suite built for astronauts on long-duration deep-space missions (such as a 3-year Mars transit). Operating 100% client-side in the browser to eliminate dependence on Earth-based communication during up to **24-minute one-way communication blackouts**, A.R.E.S. uses standard cabin cameras and **Google MediaPipe Pose (33-point skeletal landmark tracking)** to provide real-time biomechanical form coaching, automated repetition counting, bilateral symmetry scoring, and range-of-motion (ROM) verification. Simultaneously, it combats multi-year isolation burnout by transforming daily resistance tonnage and stationary cardio metrics into interactive planetary traverses across **Valles Marineris** and **Olympus Mons**.

---

## 2. Core Problem Statement (NASA Human Research Program Alignment)
1. **Form Degradation & Injury During Comms Blackouts:** Astronauts must exercise **2.5 hours daily** on specialized hardware like **ARED (Advanced Resistive Exercise Device)**, treadmills, and cycle ergometers to prevent severe bone mineral density loss (`1–1.5%` per month) and muscle atrophy. With up to 24-minute one-way signal delays between Mars and Houston, flight surgeons cannot monitor lifting posture in real time. Lifting with compromised form causes cumulative spinal/joint injury and ineffective mechanical loading.
2. **Psychological & Motivational Burnout:** Repetitive stationary workouts inside a confined spacecraft cabin over a 1,000-day mission cause severe motivational fatigue and compliance drops.
3. **Telemetry Friction:** Manual spreadsheet logging after exhausting countermeasure sessions leads to incomplete or inaccurate medical telemetry for Earth flight surgeons.

---

## 3. Reconciled 6-Module System Architecture (From Proposal PDFs 1, 2 & 3)

| Module (PDF 2 Screen) | Core Capabilities | Backing Core Seam |
| :--- | :--- | :--- |
| **1. Dashboard (Command Center)** | Mission day counter, rolling 30-day **Earth-Baseline Strength Retention %**, daily countermeasure schedule (`ARED Resistance`, `Treadmill`, `Cycle Ergometer`), quick-launch session button, and live status indicators (`100% Offline Mode`, `Camera Feed Ready`, `Comms Delay: 24m Blackout / Window Open`). | `Seam 3`, `Seam 4`, `Seam 5` |
| **2. AI Workout Arena (Live Camera & Form Coach)** | Live cabin webcam feed with **33-point MediaPipe Pose skeletal overlay** at 30+ FPS; selector for **4 ARED exercises** (`Squats`, `Deadlifts`, `Overhead Press`, `Bicep Curls`); real-time HUD (`Live Rep Counter`, `Joint-Angle Gauge`, `ROM % Bar`, `Symmetry %`); instant form alerts (`"Depth insufficient"`, `"Spine not aligned"`, `"Left/Right imbalance"`); session controls (`Start`, `Pause`, `End & Save`) + **1-Click Simulated Pose Demo Mode**. | `Seam 1`, `Seam 2`, `Seam 6` |
| **3. Expedition Journey (Gamified Progression Map)** | Interactive virtual planetary route across **Valles Marineris (`4,000 km`)** and **Olympus Mons (`600 km`)**; converts stationary cardio distance (`1:1 km`) and form-qualified ARED tonnage (`250 kg = 1.0 km`) into mission milestones, crew badges, and destination progress rings. | `Seam 3`, `Seam 4` |
| **4. Health & Musculoskeletal Analytics (Medical Telemetry)** | 30-day muscle retention vs. pre-launch Earth-baseline comparison series; volume load over time (`sets × reps × weight kg`); bilateral symmetry & kinematic consistency scores; **1-Click Export Flight Surgeon Telemetry Report** (JSON/CSV). | `Seam 4` |
| **5. Workout Logs & History** | Searchable log of past sessions (`exerciseType`, `reps`, `durationSec`, `formAccuracyPct`, `volumeKg`, `syncStatus`) + **2D `<canvas>` Kinematic Snapshot Replay** of flagged improper reps (rendering the saved 33-point skeletal frame where depth or spinal alignment failed). | `Seam 2`, `Seam 5`, `Seam 6` |
| **6. Profile & Mission Settings** | Astronaut profile & pre-launch Earth 1RM baselines; target gravity environment selector (`Microgravity 0g`, `Moon 0.16g`, `Mars 0.38g`); local data cache controls (`Seed 30-Day Mars Demo Data`, `Clear Local Cache`) and **Comms Batch-Sync Queue** (`Flush to Mission Control / Supabase`). | `Seam 3`, `Seam 5` |

---

## 4. Dual-Use Terrestrial Marketability
- **Remote Physical Therapy & Telerehabilitation:** Enables recovering patients in rural or low-bandwidth areas to perform prescribed physical therapy with real-time camera form safety checks and automated clinician telemetry summaries—without wearable sensors.
- **Smart Home Fitness Platforms:** Software-only biomechanical form coach deployable to standard webcams and mobile devices.
