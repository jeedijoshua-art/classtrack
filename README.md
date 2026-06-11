# 🎯 ClassTrack V2 - Real-Time Geofenced Classroom Attendance System

ClassTrack is a professional, production-grade SaaS-style application built for modern academic environments. It enables instructors to automate, secure, and monitor classroom attendance using dynamic geographic boundaries (geofences), real-time WebSocket communication, and privacy-first location tracking. By using advanced moving-average GPS coordinates and noise filtering, ClassTrack eliminates proxy attendances without requiring students to download any external mobile applications.

---

## 📷 App Preview

![ClassTrack V2 Showcase](public/classtrack_showcase.png)

---

## 🌟 Key Features

*   **Premium SaaS Landing Page**: Responsive, modern user interface featuring a live geofence simulator, dynamic FAQ accordions, feature cards, and dark/light mode synchronization.
*   **Dynamic Theme System**: Sleek light/dark mode transitions persisted via `localStorage` with inline layout scripts to mitigate initial theme flickering (FOUC).
*   **Interactive Session Control**: Seamless radius (10m - 500m) and duration range sliders synced in real-time with manual input overrides.
*   **Privacy-First Location Onboarding**: Informative onboarding flow explaining GPS tracking rationale and consent checks before requesting browser geolocation coordinates.
*   **Live Geofence Monitoring & Noise Suppression**:
    *   **GPS Noise Filtering**: Rejects weak or unstable coordinates (e.g., cell-tower fallbacks with accuracy > 60m).
    *   **Sliding Window Smoothing**: Computes a moving average of the student's last 3 GPS data points to suppress transient drifts.
    *   **High-Accuracy Mode**: Enforces `enableHighAccuracy: true` with automatic retry loops and Safari iOS fallback diagnostics.
*   **Real-Time Admin Dashboard**:
    *   Interactive Leaflet Map charting active student locations color-coded by geofence compliance (Inside/Outside/Offline).
    *   Live count statistics and attendance verification lists.
    *   Dynamic adjustment of radius settings synced over active sockets to students instantly.
    *   Exportable session logs in CSV formats.
*   **Secure Environment Adaptability**: Hides development parameters (like Host IP and Local LAN ports) when deployed publicly, displaying a secure connection active badge.

---

## 🛠️ Tech Stack

*   **Frontend Framework**: [Next.js 15](https://nextjs.org/) (App Router, React 19)
*   **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/), Lucide Icons, Glassmorphic CSS variables
*   **Real-Time Events**: [Socket.io](https://socket.io/) (via custom HTTP server integrations)
*   **Database ORM**: [Prisma ORM](https://www.prisma.io/)
*   **Database**: [Neon Serverless PostgreSQL](https://neon.tech/)
*   **Mapping Library**: [Leaflet Maps](https://leafletjs.com/) (rendered via `react-leaflet`)
*   **Build & Lint Systems**: ESLint & TypeScript validation compilers

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[SaaS Landing Page] -->|Instructor Sign In| B[Admin Dashboard]
    B -->|Prisma ORM Client| C[Neon PostgreSQL]
    B -->|Socket.IO Connections| D[Real-time Events Server]
    E[Student Join Link/QR] -->|Register Form| F[Consent GPS Onboarding]
    F -->|Smoothed & Verified GPS| G[Student Live Tracking Page]
    G -->|Heartbeat POST Location| B
    G -->|Socket.IO Updates| D
    D -->|Real-time Coordinate Sync| B
```

---

## 📋 Installation & Local Setup

### Prerequisites
*   Node.js (v18.x or later)
*   npm or yarn
*   A running PostgreSQL database instance (local or via Neon.tech cloud)

### Step-by-Step Guide

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/jeedijoshua/classtrack.git
    cd classtrack
    ```

2.  **Install Project Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create `.env` and `.env.local` files in the root folder:
    ```env
    DATABASE_URL="postgresql://username:password@ep-name.aws.neon.tech/classtrack?sslmode=require"
    NEXT_PUBLIC_APP_URL="http://localhost:3000"
    ```

4.  **Synchronize Prisma Database Schema**:
    Push the database model to Neon or PostgreSQL and generate the client client:
    ```bash
    npx prisma db push
    ```

5.  **Launch the Application**:
    ```bash
    npm run dev
    ```
    Access the landing page at [http://localhost:3000](http://localhost:3000).

---

## ⚙️ Environment Variables

| Variable | Scope | Description | Default / Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Server | Connection URI for the Neon Serverless PostgreSQL database | `postgresql://user:pass@ep-name.neon.tech/db` |
| `NEXT_PUBLIC_APP_URL` | Shared | Base public domain URL of the deployed application | `https://classtrack.vercel.app` |

---

## 🚀 Deployment Guide (Vercel + Neon)

### 1. Database Provisioning (Neon)
1. Sign up at [Neon.tech](https://neon.tech) and create a new database project.
2. Select PostgreSQL v16+ and copy your Connection String.

### 2. Deployment Setup (Vercel)
1. Link your GitHub repository in your Vercel Dashboard.
2. Add `DATABASE_URL` and `NEXT_PUBLIC_APP_URL` variables to the Vercel project environment configuration.
3. Vercel automatically runs the Next.js builds, compiles TypeScript, runs optimizations, and deploys.

---

## 💻 Workflow Guide

### Instructor (Host) Flow
1. Navigate to the homepage, click **Instructor Portal**, and log in or sign up.
2. Specify a session name, classroom, and use the range sliders to input geofence radius and duration.
3. Detect your current classroom GPS coordinates using the built-in browser detection tool or click on the map.
4. Click **Start Session** to display the QR Code.
5. Watch students join the interactive dashboard and review their real-time locations.
6. Export CSV logs when the lecture concludes.

### Student (Client) Flow
1. Scan the displayed QR Code or enter the shared session link.
2. Input Name, Roll Number, and Department, then click **Join Session**.
3. Accept the GPS Consent and Onboarding card.
4. Permit browser GPS requests.
5. Keep the browser page open. The screen will notify the student if they leave the classroom radius or if connection is lost.

---

## 🗺️ Future Scope

*   [ ] **LMS Integrations**: Synchronize attendance lists into Canvas, Blackboard, or Google Classroom automatically.
*   [ ] **Offline Attendance Queueing**: Cache locations in IndexedDB when network signal drops and synchronize later.
*   [ ] **Manual Review Claims**: Provide a request submission workflow for students with malfunctioning device GPS chips.
*   [ ] **Multi-Instructor Portals**: Administrative layers to support school-wide attendance audits.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ✍️ Authors

*   **Joshua Jeedi** - *Initial Creator & Developer*
