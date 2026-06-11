# ClassTrack V2 - Real-Time Geofenced Classroom Attendance System

ClassTrack is a professional, production-ready SaaS application designed for academic environments to automate, secure, and monitor classroom attendance using geographic boundaries (geofences), real-time WebSocket communication, and secure identity tracking.

---

## 🌟 Key Features

*   **SaaS-Style Landing Page**: Modern, responsive landing page with animated layouts, interactive product benefits, features showcase, and an instructor authentication portal.
*   **Dynamic Theme System**: High-fidelity dark/light mode toggle with state persisted via `localStorage` and synchronized using blocking inline script execution to eliminate initial theme flash (FOUC).
*   **Interactive Session Creator**: Range sliders coupled with validation inputs for classroom radius (10m - 500m) and duration settings with pre-configured templates.
*   **Privacy-First Location Onboarding**: Explains the rationale behind GPS tracking and attendance verification, presenting a privacy notice before requesting coordinate permissions.
*   **Live Geofence Monitoring & Smoothing**:
    *   Continuous distance monitoring from the classroom coordinates.
    *   High-accuracy GPS mode with auto-retry recovery loops.
    *   **Noise Filtering**: Discards location updates with accuracy worse than 60 meters.
    *   **Sliding Window Smoothing**: Computes a moving average of the last 3 GPS coordinates on the student device to suppress false boundary alert triggers.
*   **Real-Time Admin Dashboard**:
    *   Live updates of checking-in student metrics.
    *   Leaflet-based maps displaying student positions colored by geofence status (Inside/Outside/Offline).
    *   Dynamic radius modification updates synchronized across active student sockets instantly.
    *   CSV report export of session attendance details.

---

## 🛠️ Tech Stack

*   **Frontend**: Next.js (App Router), Tailwind CSS (v4), TypeScript, React, Lucide Icons, Leaflet Maps (via `react-leaflet`).
*   **Backend**: Next.js API Routes, Socket.io (Real-Time Communication).
*   **Database**: Neon Serverless PostgreSQL.
*   **ORM**: Prisma.
*   **State Management**: React State & Hooks, Context, `localStorage`.
*   **Hosting Compatibility**: Vercel.

---

## 🏗️ Architecture

```mermaid
graph TD
    A[SaaS Landing Page] -->|Instructor Sign In| B[Admin Dashboard]
    B -->|Prisma Client| C[Neon PostgreSQL]
    B -->|Socket.IO| D[Real-time Events Server]
    E[Student Join QR / Link] -->|Register Info| F[Location Onboarding Screen]
    F -->|GPS Allowed & Smoothed| G[Student Live Tracking Page]
    G -->|Location Heartbeats POST| B
    G -->|WebSockets| D
    D -->|Live Sync Updates| B
```

ClassTrack utilizes a hybrid serverless API design and a long-lived stateful WebSocket listener (configured via Next.js custom server configuration in local environments) to synchronize state continuously between active instructor dashboards and student devices.

---

## 📋 Installation & Local Setup

### Prerequisites

*   Node.js (v18.x or later)
*   npm or yarn
*   PostgreSQL database (or a Neon PostgreSQL URI)

### Setup Steps

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/jeedijoshua/classtrack.git
    cd classtrack
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env` and `.env.local` file in the project root:
    ```env
    DATABASE_URL="postgresql://username:password@ep-xxxx.aws.neon.tech/classtrack?sslmode=require"
    NEXT_PUBLIC_APP_URL="http://localhost:3000"
    ```

4.  **Database Migration**:
    Initialize database schemas and generate the Prisma Client:
    ```bash
    npx prisma db push
    ```

5.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) on your desktop browser.

---

## ⚙️ Environment Variables

| Variable Name           | Description                                       | Example Value                                  |
| :---------------------- | :------------------------------------------------ | :--------------------------------------------- |
| `DATABASE_URL`          | Connection URI for PostgreSQL database (Neon SSL) | `postgresql://user:pass@ep-name.neon.tech/db`  |
| `NEXT_PUBLIC_APP_URL`   | Production deployment or local base host address  | `https://classtrack.vercel.app`                |

---

## 🚀 Deployment Guide (Vercel + Neon)

### 1. Database Setup (Neon)
*   Sign up at [Neon.tech](https://neon.tech).
*   Create a new PostgreSQL project and copy the connection string.

### 2. Vercel Project Setup
*   Create a new project on Vercel and import your ClassTrack repository.
*   Add the `DATABASE_URL` and `NEXT_PUBLIC_APP_URL` environment variables in Vercel settings.
*   Deploy the application. Vercel automatically runs the Next.js production build and provisions Serverless Functions.

---

## 💻 Usage Instructions

### Instructor Workflow
1.  Navigate to the landing page and click **Instructor Portal**.
2.  Sign up or Log in to access the administrator panel.
3.  Configure Session Name, Classroom Name, Session Duration, and Geofence Radius (slider or input).
4.  Optionally pick coordinates from the mini locator map or let the browser determine your coordinates.
5.  Click **Generate Session** to launch the session and generate the Join QR code.
6.  Share the QR code or link with students and monitor checking-in students in real time.
7.  Click **Export CSV** to download a local spreadsheet copy of the session logs once finished.

### Student Workflow
1.  Scan the classroom session QR code or open the shared Join Link.
2.  Input Name, Student Roll Number, and Department, and click **Join Session**.
3.  Confirm consent on the **GPS Onboarding Card**.
4.  Allow browser GPS location permission prompts.
5.  Maintain the tracking page open to stay logged in. The device will sound a notification warning if you exit the classroom boundary.

---

## 🗺️ Future Roadmap

*   [ ] **Manual Override Claims**: Allows students to submit manual verification request files if their GPS hardware is failing.
*   [ ] **Integrations**: Auto-sync attendance records into LMS tools like Canvas, Blackboard, or Google Classroom.
*   [ ] **Offline Logging**: Queue coordinates locally in IndexedDB when network drops, and sync once reconnection is established.
*   [ ] **Multi-Admin Portals**: Support department-wide administration structures.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ✍️ Author

*   **Joshua Jeedi** - *Initial Creator & Developer*
