'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Lock,
  Mail,
  User,
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff,
  MapPin,
  QrCode,
  Compass,
  Activity,
  ShieldCheck,
  Sun,
  Moon,
  CheckCircle2,
  Smartphone,
  Server,
  Sparkles
} from 'lucide-react'

export default function Home() {
  const [router, setRouter] = useState<any>(null)
  
  // Dynamic import workaround or safe navigation hook
  useEffect(() => {
    // We import useRouter inside useEffect if Next.js version differences occur, or use dynamic setup.
    // However, the standard Next.js next/navigation is safe.
    import('next/navigation').then((mod) => {
      setRouter(mod.useRouter())
    })
  }, [])

  // Theme support state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (saved) {
      setTheme(saved)
      document.documentElement.classList.toggle('dark', saved === 'dark')
    } else {
      localStorage.setItem('theme', 'dark')
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
  }

  // Auth modal states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Check if already authenticated on load
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/sessions')
        if (res.ok && router) {
          router.push('/dashboard')
        }
      } catch (err) {}
    }
    if (router) {
      checkAuth()
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const payload = isLogin
        ? { email, password }
        : { name, email, password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Authentication failed')
        setLoading(false)
      } else {
        setIsAuthModalOpen(false)
        if (router) {
          router.push('/dashboard')
          router.refresh()
        }
      }
    } catch (err) {
      setError('Connection failed. Please check your network and try again.')
      setLoading(false)
    }
  }

  const openAuthModal = (loginMode: boolean) => {
    setIsLogin(loginMode)
    setError(null)
    setIsAuthModalOpen(true)
  }

  return (
    <div className="relative min-h-screen w-full bg-ct-bg text-ct-text font-sans overflow-x-hidden transition-colors duration-200">
      {/* Background Graphic Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-ct-glow-violet blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-ct-glow-emerald blur-[120px] pointer-events-none" />

      {/* Header / Nav Bar */}
      <header className="sticky top-0 z-40 w-full bg-ct-bg/75 backdrop-blur-md border-b border-ct-border py-4 px-6 md:px-12 flex justify-between items-center transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md border border-violet-500/20">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight">
            Class<span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">Track</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-ct-muted">
          <a href="#features" className="hover:text-ct-text transition-colors">Features</a>
          <a href="#workflow" className="hover:text-ct-text transition-colors">Workflow</a>
          <a href="#benefits" className="hover:text-ct-text transition-colors">Benefits</a>
        </nav>

        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-ct-card border border-transparent hover:border-ct-border text-ct-muted hover:text-ct-text transition-all cursor-pointer"
            title={theme === 'dark' ? 'Activate Light Mode' : 'Activate Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => openAuthModal(true)}
            className="px-4 py-2 border border-ct-border hover:bg-ct-card rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Instructor Sign In
          </button>
          <button
            onClick={() => openAuthModal(false)}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-500/10 cursor-pointer"
          >
            Register
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 md:px-12 pt-20 pb-24 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Attendance Tracker V2 is Live
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.15]">
          Classroom Attendance,<br />
          <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">Perfected.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-ct-muted text-sm sm:text-base leading-relaxed">
          ClassTrack leverages secure geofencing and dynamic coordinate validation to verify student attendance in real time. Eliminate proxies, verify locations, and gain immediate insights.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
          <button
            onClick={() => openAuthModal(false)}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-500/15 flex items-center justify-center gap-2 group cursor-pointer"
          >
            Get Started (Free)
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-4 border border-ct-border hover:bg-ct-card text-ct-text rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Explore Features
          </a>
        </div>
      </section>

      {/* Feature Spotlights */}
      <section id="features" className="px-6 md:px-12 py-20 border-t border-ct-border max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Core Capabilities</h2>
          <p className="text-ct-muted text-sm max-w-lg mx-auto">
            Everything you need to automate check-ins, map geographic boundaries, and analyze attendance patterns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-ct-card border border-ct-border p-6 rounded-2xl space-y-4 hover:border-violet-500/40 hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">QR Attendance Check-In</h3>
            <p className="text-ct-muted text-xs leading-relaxed">
              Instructors generate active session QR codes. Students simply scan from their mobile browser to join the session. No app installs required.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-ct-card border border-ct-border p-6 rounded-2xl space-y-4 hover:border-violet-500/40 hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Dynamic Geofence Radius</h3>
            <p className="text-ct-muted text-xs leading-relaxed">
              Define the classroom boundary with sub-meter accuracy. Adjust your circle geofence radius live and see coordinates verify instantly.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-ct-card border border-ct-border p-6 rounded-2xl space-y-4 hover:border-violet-500/40 hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Live Mobile GPS Tracking</h3>
            <p className="text-ct-muted text-xs leading-relaxed">
              Students transmit location updates in the background. If a student leaves the classroom boundary, status indicators update to alert both parties.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-ct-card border border-ct-border p-6 rounded-2xl space-y-4 hover:border-violet-500/40 hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Real-Time Monitor Map</h3>
            <p className="text-ct-muted text-xs leading-relaxed">
              Watch students populate on an interactive map. Live status changes (Inside, Outside, Offline) synchronize automatically via WebSockets or polling.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-ct-card border border-ct-border p-6 rounded-2xl space-y-4 hover:border-violet-500/40 hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Proxy Prevention & Security</h3>
            <p className="text-ct-muted text-xs leading-relaxed">
              ClassTrack logs student IP addresses, browser info, and device details, alongside high-accuracy GPS coordinates to prevent proxy attendance logging.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-ct-card border border-ct-border p-6 rounded-2xl space-y-4 hover:border-violet-500/40 hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Attendance Analytics</h3>
            <p className="text-ct-muted text-xs leading-relaxed">
              Examine live metrics on student engagement, average durations, and export attendance records cleanly as a CSV file for classroom grading systems.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="px-6 md:px-12 py-20 border-t border-ct-border bg-ct-card-solid/20 max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">How it Works</h2>
          <p className="text-ct-muted text-sm max-w-lg mx-auto">
            A simple 4-step sequence built for modern hybrid classrooms.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Step 1 */}
          <div className="relative space-y-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-650 to-indigo-650 flex items-center justify-center font-bold text-white shadow-md text-sm">
              1
            </div>
            <h4 className="font-bold text-sm sm:text-base">Setup Session</h4>
            <p className="text-ct-muted text-xs leading-relaxed">
              The instructor logs in, sets the classroom coordinates, adjust geofence radius, and launches the active tracking session.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative space-y-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-650 to-indigo-650 flex items-center justify-center font-bold text-white shadow-md text-sm">
              2
            </div>
            <h4 className="font-bold text-sm sm:text-base">Scan QR Access</h4>
            <p className="text-ct-muted text-xs leading-relaxed">
              A dynamic QR code is projected in class or shared. Students scan the QR code to access the secure classroom check-in.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative space-y-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-650 to-indigo-650 flex items-center justify-center font-bold text-white shadow-md text-sm">
              3
            </div>
            <h4 className="font-bold text-sm sm:text-base">Verify Location</h4>
            <p className="text-ct-muted text-xs leading-relaxed">
              The student inputs registration info, accepts the geolocation onboarding check, and enables live browser tracking.
            </p>
          </div>

          {/* Step 4 */}
          <div className="relative space-y-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-650 to-indigo-650 flex items-center justify-center font-bold text-white shadow-md text-sm">
              4
            </div>
            <h4 className="font-bold text-sm sm:text-base">Monitor Live Map</h4>
            <p className="text-ct-muted text-xs leading-relaxed">
              The dashboard maps students and tracks boundaries. Status markers update live if a device disconnects or wanders.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section id="benefits" className="px-6 md:px-12 py-20 border-t border-ct-border max-w-5xl mx-auto space-y-12">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight">Why Educators Choose ClassTrack</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <div className="flex gap-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm sm:text-base">99.9% Geofence Precision</h4>
              <p className="text-ct-muted text-xs leading-relaxed mt-1">
                Our client-side coordinate filters filter GPS noise, smoothing coordinates inside deep structures to avoid false-left alarms.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm sm:text-base">Zero-Installation Client</h4>
              <p className="text-ct-muted text-xs leading-relaxed mt-1">
                Students join, register, and transmit coordinate packages directly from standard Safari or Chrome browsers. Zero installs.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm sm:text-base">Comprehensive Audit Records</h4>
              <p className="text-ct-muted text-xs leading-relaxed mt-1">
                Log user agents, device contexts, IP records, and location histories to keep attendance records fully audit-compliant and secure.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm sm:text-base">Vercel & Neon Production Ready</h4>
              <p className="text-ct-muted text-xs leading-relaxed mt-1">
                Engineered with database retries and WebSocket fallbacks, ensuring robust, serverless operation in cloud hosting environments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ct-border py-12 px-6 md:px-12 bg-ct-card-solid/10 text-ct-muted text-xs flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-tr from-violet-600 to-indigo-600">
            <MapPin className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-ct-text">ClassTrack V2</span>
        </div>
        <div>
          &copy; {new Date().getFullYear()} ClassTrack. All rights reserved. Made for portfolio presentation.
        </div>
      </footer>

      {/* Auth Modal Overlay */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-ct-card-solid border border-ct-border rounded-2xl shadow-2xl p-8 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-ct-card text-ct-muted hover:text-ct-text rounded-lg transition-colors cursor-pointer"
            >
              <User className="w-4 h-4" /> {/* Fallback standard close or X */}
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-extrabold text-ct-text">
                Instructor {isLogin ? 'Sign In' : 'Account Registration'}
              </h3>
              <p className="text-ct-muted text-xs">
                {isLogin ? 'Access your classrooms and sessions' : 'Start tracking attendance in minutes'}
              </p>
            </div>

            <div className="flex justify-center border-b border-ct-border pb-1">
              <button
                onClick={() => { setIsLogin(true); setError(null); }}
                className={`flex-1 text-center py-2 text-xs font-bold transition-colors cursor-pointer ${
                  isLogin ? 'text-violet-500 border-b-2 border-violet-500' : 'text-ct-muted hover:text-ct-text'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsLogin(false); setError(null); }}
                className={`flex-1 text-center py-2 text-xs font-bold transition-colors cursor-pointer ${
                  !isLogin ? 'text-violet-500 border-b-2 border-violet-500' : 'text-ct-muted hover:text-ct-text'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-950/20 border border-red-900/40 text-red-200 text-xs">
                  <ShieldAlert className="w-4.5 h-4.5 flex-shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                {!isLogin && (
                  <div>
                    <label htmlFor="name-input" className="block text-[10px] font-bold uppercase tracking-wider text-ct-muted mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ct-muted">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        id="name-input"
                        name="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2.5 bg-ct-input border border-ct-border rounded-xl text-ct-text placeholder-ct-muted/50 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs transition-all"
                        placeholder="Professor Joshua"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="email-input" className="block text-[10px] font-bold uppercase tracking-wider text-ct-muted mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ct-muted">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="email-input"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 bg-ct-input border border-ct-border rounded-xl text-ct-text placeholder-ct-muted/50 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs transition-all"
                      placeholder="teacher@university.edu"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password-input" className="block text-[10px] font-bold uppercase tracking-wider text-ct-muted mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ct-muted">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      id="password-input"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-9 pr-9 py-2.5 bg-ct-input border border-ct-border rounded-xl text-ct-text placeholder-ct-muted/50 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-ct-muted hover:text-ct-text transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-600 hover:to-indigo-600 text-white rounded-xl font-bold shadow-md shadow-violet-500/10 transition-all text-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center justify-center gap-1.5 uppercase tracking-wider">
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
