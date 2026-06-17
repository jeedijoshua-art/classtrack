'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MapPin,
  QrCode,
  Compass,
  Activity,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Users,
  Smartphone,
  Radio,
  Eye,
  Sun,
  Moon
} from 'lucide-react'

const DEMO_STEPS = [
  {
    id: 'create',
    title: 'Create a Session',
    subtitle: 'Set up the geofenced classroom',
    icon: Compass,
    description: 'The instructor opens the ClassTrack dashboard, enters the classroom name, sets the geofence radius (e.g., 50 meters around the lecture hall), and creates the attendance session.',
    visual: 'session-create',
    color: 'violet',
    details: [
      'Choose session name and classroom',
      'Set geofence radius from 10m to 500m',
      'Auto-detect GPS coordinates or set manually',
      'Session duration from 5 minutes to 8 hours'
    ]
  },
  {
    id: 'qr',
    title: 'Generate QR Code',
    subtitle: 'Share the session with students',
    icon: QrCode,
    description: 'A unique QR code is generated for each session. The instructor projects it on the classroom screen. Students scan it with their mobile phone camera — no app installation needed.',
    visual: 'qr-code',
    color: 'indigo',
    details: [
      'Dynamic QR code unique per session',
      'Direct browser link — no app needed',
      'Download QR as image for offline projection',
      'Regenerate QR code at any time'
    ]
  },
  {
    id: 'join',
    title: 'Student Joins',
    subtitle: 'Browser-based check-in flow',
    icon: Smartphone,
    description: 'The student scans the QR code, enters their name, roll number, and department. Their browser requests GPS permission and begins transmitting coordinates.',
    visual: 'student-join',
    color: 'blue',
    details: [
      'Simple 3-field registration form',
      'Location permission explained before requested',
      'Device fingerprint captured (IP, browser, UA)',
      'Duplicate roll numbers blocked per session'
    ]
  },
  {
    id: 'track',
    title: 'Location Tracking',
    subtitle: 'Real-time GPS verification',
    icon: Radio,
    description: 'The student\'s GPS coordinates are smoothed using a moving-average filter and transmitted to the server. The system determines if the student is inside or outside the geofence.',
    visual: 'tracking',
    color: 'emerald',
    details: [
      'High-accuracy GPS with noise filtering',
      'Moving-average over last 3 coordinate signals',
      'Weak signals (>60m accuracy) discarded',
      'Updates sent every 5 seconds via WebSocket'
    ]
  },
  {
    id: 'monitor',
    title: 'Attendance Monitoring',
    subtitle: 'Instructor dashboard view',
    icon: Eye,
    description: 'The instructor sees all students on a live map with color-coded markers: green (inside), red (outside), yellow (offline). Audio alerts fire when students leave the boundary.',
    visual: 'dashboard',
    color: 'violet',
    details: [
      'Live interactive map with student markers',
      'Real-time KPI cards: inside, outside, offline',
      'Audio chime alerts on boundary violations',
      'Export attendance CSV at any time'
    ]
  }
]

export default function DemoPage() {
  const [activeStep, setActiveStep] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (saved) {
      setTheme(saved)
      document.documentElement.classList.toggle('dark', saved === 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
  }

  

  useEffect(() => {
    if (!isAutoPlaying) return
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % DEMO_STEPS.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [isAutoPlaying])

  const step = DEMO_STEPS[activeStep]
  const StepIcon = step.icon

  const goTo = (idx: number) => {
    setActiveStep(idx)
    setIsAutoPlaying(false)
  }

  const colorMap: Record<string, string> = {
    violet: 'from-violet-600 to-indigo-600',
    indigo: 'from-indigo-600 to-blue-600',
    blue: 'from-blue-600 to-cyan-600',
    emerald: 'from-emerald-600 to-teal-600',
  }

  const iconColorMap: Record<string, string> = {
    violet: 'text-violet-500',
    indigo: 'text-indigo-500',
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
  }

  return (
    <div className="relative min-h-screen w-full bg-ct-bg text-ct-text font-sans overflow-x-hidden transition-colors duration-300">
      {}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-ct-glow-violet blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-ct-glow-emerald blur-[150px] pointer-events-none" />

      {}
      <header className="sticky top-0 z-40 w-full bg-ct-bg/75 backdrop-blur-md border-b border-ct-border py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md border border-violet-500/20">
              <MapPin className="w-5.5 h-5.5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight">
              Class<span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent font-extrabold">Track</span>
            </span>
          </Link>
          <span className="text-[10px] bg-violet-500/10 border border-violet-500/20 text-violet-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Interactive Demo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-ct-card border border-transparent hover:border-ct-border text-ct-muted hover:text-ct-text transition-all cursor-pointer"
            title={theme === 'dark' ? 'Activate Light Mode' : 'Activate Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-violet-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-ct-border hover:bg-ct-card rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      </header>

      {}
      <section className="relative px-6 md:px-12 pt-16 pb-8 max-w-5xl mx-auto text-center">
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Product <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">Walkthrough</span>
          </h1>
          <p className="text-ct-muted text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Step through the complete ClassTrack attendance workflow — from session creation to real-time GPS monitoring.
          </p>
        </div>
      </section>

      {}
      <div className="max-w-5xl mx-auto px-6 md:px-12 mb-8">
        <div className="flex items-center gap-2">
          {DEMO_STEPS.map((s, idx) => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => goTo(idx)}
                className={`flex-1 group cursor-pointer transition-all duration-300 ${
                  idx === activeStep ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                }`}
              >
                <div className={`h-1 rounded-full mb-3 transition-all duration-500 ${
                  idx === activeStep 
                    ? `bg-gradient-to-r ${colorMap[s.color]} shadow-sm` 
                    : idx < activeStep 
                    ? 'bg-violet-500/40'
                    : 'bg-ct-border'
                }`} />
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${idx === activeStep ? iconColorMap[s.color] : 'text-ct-muted'}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:inline ${
                    idx === activeStep ? 'text-ct-text' : 'text-ct-muted'
                  }`}>
                    {s.title}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {}
      <section className="max-w-5xl mx-auto px-6 md:px-12 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r ${colorMap[step.color]} text-white`}>
                <StepIcon className="w-3.5 h-3.5" />
                Step {activeStep + 1} of {DEMO_STEPS.length}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ct-text">
                {step.title}
              </h2>
              <p className="text-ct-muted text-xs uppercase tracking-wider font-bold">
                {step.subtitle}
              </p>
            </div>

            <p className="text-ct-muted text-sm leading-relaxed">
              {step.description}
            </p>

            <div className="space-y-3 pt-2">
              {step.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconColorMap[step.color]}`} />
                  <span className="text-sm text-ct-text">{detail}</span>
                </div>
              ))}
            </div>

            {}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => goTo(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-ct-card border border-ct-border text-ct-text rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ct-card-solid"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => goTo(Math.min(DEMO_STEPS.length - 1, activeStep + 1))}
                disabled={activeStep === DEMO_STEPS.length - 1}
                className={`flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r ${colorMap[step.color]} text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-md`}
              >
                Next Step
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`px-3 py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isAutoPlaying 
                    ? 'bg-violet-500/10 border-violet-500/20 text-violet-500' 
                    : 'bg-ct-card border-ct-border text-ct-muted hover:text-ct-text'
                }`}
              >
                {isAutoPlaying ? '⏸ Pause' : '▶ Auto-Play'}
              </button>
            </div>
          </div>

          {}
          <div className="bg-ct-card backdrop-blur-xl border border-ct-border rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden min-h-[400px]">
            {}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${colorMap[step.color]} opacity-5 blur-3xl pointer-events-none`} />

            {step.visual === 'session-create' && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-ct-border">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-ct-muted">Session Setup Preview</span>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ct-muted">Session Name</span>
                    <div className="h-10 bg-ct-input border border-ct-border rounded-xl flex items-center px-3 text-sm text-ct-text">CS-101 Lecture — Week 5</div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ct-muted">Classroom</span>
                    <div className="h-10 bg-ct-input border border-ct-border rounded-xl flex items-center px-3 text-sm text-ct-text">Engineering Hall 3A</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ct-muted">Radius</span>
                      <div className="h-10 bg-ct-input border border-ct-border rounded-xl flex items-center justify-center text-sm font-bold text-violet-500">50m</div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ct-muted">Duration</span>
                      <div className="h-10 bg-ct-input border border-ct-border rounded-xl flex items-center justify-center text-sm font-bold text-violet-500">1h 30m</div>
                    </div>
                  </div>
                </div>
                <div className="h-10 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md">
                  Generate Session
                </div>
              </div>
            )}

            {step.visual === 'qr-code' && (
              <div className="flex flex-col items-center space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-ct-border w-full">
                  <QrCode className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-ct-muted">QR Code Generator</span>
                </div>
                {}
                <div className="bg-white p-6 rounded-2xl border-4 border-white shadow-lg">
                  <svg className="w-40 h-40" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="white" />
                    {}
                    {[0,1,2,3,4,5,6].map(r => 
                      [0,1,2,3,4,5,6].map(c => {
                        if ((r < 3 || r > 3) && (c < 3 || c > 3)) {
                          return <rect key={`${r}-${c}`} x={r*14+1} y={c*14+1} width="12" height="12" rx="2" fill={Math.random() > 0.4 ? '#18181b' : 'white'} />
                        }
                        return <rect key={`${r}-${c}`} x={r*14+1} y={c*14+1} width="12" height="12" rx="2" fill={Math.random() > 0.5 ? '#8b5cf6' : 'white'} />
                      })
                    )}
                  </svg>
                </div>
                <p className="text-ct-muted text-xs text-center">Students scan this to access the check-in page directly</p>
                <div className="flex gap-2 w-full">
                  <div className="flex-1 h-9 bg-ct-card border border-ct-border rounded-xl flex items-center justify-center text-xs font-bold text-ct-text">Download QR</div>
                  <div className="flex-1 h-9 bg-ct-input border border-ct-border rounded-xl flex items-center justify-center text-xs font-bold text-ct-muted">Copy Link</div>
                </div>
              </div>
            )}

            {step.visual === 'student-join' && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-ct-border">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-ct-muted">Student Join Form</span>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ct-muted">Full Name</span>
                    <div className="h-10 bg-ct-input border border-ct-border rounded-xl flex items-center px-3 text-sm text-ct-text">Alice Johnson</div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ct-muted">Roll Number</span>
                    <div className="h-10 bg-ct-input border border-ct-border rounded-xl flex items-center px-3 text-sm text-ct-text">CS2024-042</div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ct-muted">Department</span>
                    <div className="h-10 bg-ct-input border border-ct-border rounded-xl flex items-center px-3 text-sm text-ct-text">Computer Science</div>
                  </div>
                </div>
                <div className="h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Join Session & Enable GPS
                </div>
              </div>
            )}

            {step.visual === 'tracking' && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-ct-border">
                  <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-ct-muted">GPS Tracking Active</span>
                </div>
                {}
                <div className="relative">
                  <svg className="w-full h-48 bg-ct-bg/50 border border-ct-border rounded-xl" viewBox="0 0 200 120">
                    <defs>
                      <pattern id="demo-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="0.5" fill="currentColor" className="text-ct-muted opacity-20" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#demo-grid)" />
                    <circle cx="100" cy="60" r="40" fill="rgba(16, 185, 129, 0.05)" stroke="#10b981" strokeWidth="1" strokeDasharray="3 2" />
                    <circle cx="100" cy="60" r="4" fill="#8b5cf6" className="animate-pulse" />
                    <circle cx="100" cy="60" r="1.5" fill="white" />
                    {}
                    <circle cx="88" cy="52" r="3" fill="#10b981" />
                    <circle cx="88" cy="52" r="6" fill="none" stroke="#10b981" strokeWidth="0.5" className="animate-ping origin-center" />
                    <circle cx="115" cy="68" r="3" fill="#10b981" />
                    <circle cx="150" cy="45" r="3" fill="#f43f5e" />
                    <text x="88" y="46" textAnchor="middle" fontSize="5" fontWeight="bold" fill="currentColor" className="text-ct-text opacity-60">Alice</text>
                    <text x="115" y="62" textAnchor="middle" fontSize="5" fontWeight="bold" fill="currentColor" className="text-ct-text opacity-60">Bob</text>
                    <text x="150" y="39" textAnchor="middle" fontSize="5" fontWeight="bold" fill="currentColor" className="text-ct-text opacity-60">Eve</text>
                  </svg>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                    <span className="text-lg font-black text-emerald-500">2</span>
                    <p className="text-[10px] text-emerald-400 font-bold mt-0.5">Inside</p>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                    <span className="text-lg font-black text-rose-500">1</span>
                    <p className="text-[10px] text-rose-400 font-bold mt-0.5">Outside</p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                    <span className="text-lg font-black text-amber-500">0</span>
                    <p className="text-[10px] text-amber-400 font-bold mt-0.5">Offline</p>
                  </div>
                </div>
              </div>
            )}

            {step.visual === 'dashboard' && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-ct-border">
                  <Activity className="w-4 h-4 text-violet-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-ct-muted">Instructor Dashboard</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-ct-input border border-ct-border rounded-xl p-3 space-y-1">
                    <Users className="w-4 h-4 text-ct-muted" />
                    <span className="text-lg font-black text-ct-text block">24</span>
                    <span className="text-[10px] text-ct-muted">Total Checked In</span>
                  </div>
                  <div className="bg-ct-input border border-ct-border rounded-xl p-3 space-y-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-lg font-black text-emerald-500 block">21</span>
                    <span className="text-[10px] text-ct-muted">Inside Boundary</span>
                  </div>
                </div>
                <div className="space-y-1.5 border-t border-ct-border pt-3">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-ct-muted">Live Activity Feed</span>
                  <div className="space-y-1.5 text-[10px] font-mono text-ct-muted">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-500">▶</span>
                      <span>Alice Johnson checked in: 🟢 Inside (12m)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-500">▶</span>
                      <span>Bob Chen checked in: 🟢 Inside (28m)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-rose-500">▶</span>
                      <span>Eve Smith boundary alert: 🔴 Outside (89m)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {}
      <section className="px-6 md:px-12 py-16 border-t border-ct-border text-center max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ct-text mb-3">
          Ready to try it yourself?
        </h2>
        <p className="text-ct-muted text-sm mb-6">
          Register as an instructor and create your first geofenced attendance session in under 2 minutes.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-500/15 cursor-pointer group"
        >
          Get Started for Free
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </section>

      {}
      <footer className="border-t border-ct-border py-8 px-6 md:px-12 bg-ct-card-solid/10 text-ct-muted text-xs flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-tr from-violet-600 to-indigo-600">
            <MapPin className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-ct-text">ClassTrack V2</span>
        </div>
        <div>
          &copy; {new Date().getFullYear()} ClassTrack. Interactive Product Demo.
        </div>
      </footer>
    </div>
  )
}
