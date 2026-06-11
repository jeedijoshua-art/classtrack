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
  Sparkles,
  X,
  Menu,
  HelpCircle,
  TrendingUp,
  Award
} from 'lucide-react'

export default function Home() {
  const [router, setRouter] = useState<any>(null)
  
  // Dynamic import workaround or safe navigation hook
  useEffect(() => {
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

  // Mobile navigation menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Live Simulator States
  const [mockRadius, setMockRadius] = useState(60)
  const [mockStudents, setMockStudents] = useState([
    { name: 'Alice Smith', r: 35, angle: 45, dept: 'CS' },
    { name: 'Bob Johnson', r: 85, angle: 135, dept: 'EE' },
    { name: 'Charlie Brown', r: 20, angle: 220, dept: 'ME' },
    { name: 'David Miller', r: 120, angle: 310, dept: 'IT' },
    { name: 'Emma Wilson', r: 55, angle: 10, dept: 'CS' }
  ])
  const [feedLog, setFeedLog] = useState<string[]>([
    'Charlie Brown logged check-in: 🟢 Inside',
    'Alice Smith logged check-in: 🟢 Inside'
  ])

  // Random check-in event simulation
  const simulateCheckIn = () => {
    const names = ['Sophia Davis', 'Liam Martinez', 'Olivia Garcia', 'Noah Rodriguez', 'Ava Hernandez']
    const depts = ['CS', 'EE', 'ME', 'IT', 'BIO']
    const randomName = names[Math.floor(Math.random() * names.length)]
    const randomDept = depts[Math.floor(Math.random() * depts.length)]
    const randomRadius = Math.floor(Math.random() * 140) + 10
    const randomAngle = Math.floor(Math.random() * 360)
    
    // Add new student
    const newStudent = { name: randomName, r: randomRadius, angle: randomAngle, dept: randomDept }
    setMockStudents((prev) => [newStudent, ...prev.slice(0, 4)])
    
    // Append log
    const statusText = randomRadius <= mockRadius ? '🟢 Inside' : '🔴 Outside'
    setFeedLog((prev) => [
      `${randomName} checked in: ${statusText} (Dist: ${randomRadius}m)`,
      ...prev.slice(0, 2)
    ])
  }

  // Dynamic status count
  const presentCount = mockStudents.filter((s) => s.r <= mockRadius).length
  const outsideCount = mockStudents.filter((s) => s.r > mockRadius).length

  // FAQ Active State Accordion
  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  // Auth modal states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Check if already authenticated on load
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/sessions')
        if (res.ok) {
          setIsRedirecting(true)
          window.location.href = '/dashboard'
        }
      } catch (err) {}
    }
    checkAuth()
  }, [])

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
        setIsRedirecting(true)
        window.location.href = '/dashboard'
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
    <div className="relative min-h-screen w-full bg-ct-bg text-ct-text font-sans overflow-x-hidden transition-colors duration-300 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:20px_20px]">
      {/* Background Graphic Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-ct-glow-violet blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-ct-glow-emerald blur-[150px] pointer-events-none" />

      {/* Header / Nav Bar */}
      <header className="sticky top-0 z-40 w-full bg-ct-bg/75 backdrop-blur-md border-b border-ct-border py-4 px-6 md:px-12 flex justify-between items-center transition-all duration-300 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md border border-violet-500/20">
            <MapPin className="w-5.5 h-5.5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight">
            Class<span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent font-extrabold">Track</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-ct-muted">
          <a href="#features" className="hover:text-ct-text transition-colors">Features</a>
          <a href="#simulator" className="hover:text-ct-text transition-colors">Simulator</a>
          <a href="#workflow" className="hover:text-ct-text transition-colors">Workflow</a>
          <a href="#faq" className="hover:text-ct-text transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-ct-card border border-transparent hover:border-ct-border text-ct-muted hover:text-ct-text transition-all cursor-pointer shadow-sm"
            title={theme === 'dark' ? 'Activate Light Mode' : 'Activate Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-violet-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
          
          <button
            onClick={() => openAuthModal(true)}
            className="hidden sm:inline-block px-4 py-2 text-xs font-bold border border-ct-border hover:bg-ct-card rounded-xl transition-all cursor-pointer hover:border-ct-text shadow-sm"
          >
            Sign In
          </button>
          <button
            onClick={() => openAuthModal(false)}
            className="hidden sm:inline-block px-4 py-2 text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition-all shadow-md shadow-violet-500/20 cursor-pointer"
          >
            Get Started
          </button>

          {/* Hamburger Menu Icon */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl text-ct-muted hover:text-ct-text hover:bg-ct-card cursor-pointer border border-transparent hover:border-ct-border"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden sticky top-[73px] z-30 w-full border-b border-ct-border bg-ct-card-solid backdrop-blur-lg px-6 py-5 space-y-4 animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-4 text-xs font-bold uppercase tracking-wider text-ct-muted">
            <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-ct-text transition-colors">Features</a>
            <a href="#simulator" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-ct-text transition-colors">Simulator</a>
            <a href="#workflow" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-ct-text transition-colors">Workflow</a>
            <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-ct-text transition-colors">FAQ</a>
          </nav>
          <div className="flex flex-col gap-2.5 pt-4 border-t border-ct-border/60">
            <button
              onClick={() => { setIsMobileMenuOpen(false); openAuthModal(true); }}
              className="w-full py-3 text-xs font-bold border border-ct-border hover:bg-ct-card rounded-xl text-center cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsMobileMenuOpen(false); openAuthModal(false); }}
              className="w-full py-3 text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-center cursor-pointer shadow-md"
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* Hero Centered Section */}
      <section className="relative px-6 md:px-12 pt-20 pb-16 max-w-4xl mx-auto text-center">
        <div className="space-y-6 flex flex-col items-center animate-in fade-in slide-in-from-bottom duration-500">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Advanced Geofenced Attendance V2
          </div>
          
          <h1 className="text-4xl sm:text-7xl font-black tracking-tight leading-[1.15]">
            Verify Attendance.<br />
            <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent font-black">Prevent Proxies.</span>
          </h1>
          
          <p className="text-ct-muted text-sm sm:text-lg leading-relaxed max-w-2xl mx-auto">
            ClassTrack matches real-time high-accuracy mobile GPS coordinates against dynamic geofenced boundaries to verify student presence instantly. No app installation required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full sm:w-auto">
            <button
              onClick={() => openAuthModal(false)}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-violet-500/15 flex items-center justify-center gap-2 group cursor-pointer"
            >
              Register as Instructor
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="#simulator"
              className="w-full sm:w-auto px-8 py-4 border border-ct-border hover:bg-ct-card text-ct-text rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer hover:border-ct-text shadow-sm"
            >
              Try Interactive Demo
            </a>
          </div>

          {/* Quick Proof Metrics */}
          <div className="pt-12 grid grid-cols-3 gap-8 border-t border-ct-border max-w-xl mx-auto w-full">
            <div className="space-y-1">
              <span className="text-2xl sm:text-3xl font-black text-ct-text">99.9%</span>
              <p className="text-[10px] text-ct-muted uppercase font-bold tracking-wider">GPS Accuracy</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl sm:text-3xl font-black text-ct-text">0</span>
              <p className="text-[10px] text-ct-muted uppercase font-bold tracking-wider">App Installs</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl sm:text-3xl font-black text-ct-text">&lt; 3s</span>
              <p className="text-[10px] text-ct-muted uppercase font-bold tracking-wider">Logging Speed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Simulator Section (Centered, Wide, Spaced) */}
      <section id="simulator" className="relative px-6 md:px-12 py-16 max-w-5xl mx-auto text-center border-t border-ct-border">
        <div className="space-y-4 mb-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-[10px] font-bold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            Interactive Geofence Simulator
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-ct-text">
            See the Geofence in Action
          </h2>
          <p className="text-ct-muted text-xs sm:text-sm max-w-lg mx-auto">
            Interact with the map below. Adjust the geofence radius slider or trigger mock student check-ins to see real-time status changes.
          </p>
        </div>

        <div className="bg-ct-card backdrop-blur-xl border border-ct-border rounded-2xl shadow-2xl p-5 sm:p-8 space-y-6 text-left max-w-3xl mx-auto relative overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-ct-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-ct-text">Live Classroom Map</h3>
            </div>
            <button 
              onClick={simulateCheckIn}
              className="px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/25 border border-violet-500/20 text-violet-600 dark:text-violet-400 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
            >
              Simulate Check-In
            </button>
          </div>

          {/* Map SVG Visualizer */}
          <div className="relative">
            <svg className="w-full h-64 bg-ct-bg/50 border border-ct-border rounded-xl shadow-inner" viewBox="0 0 200 200">
              <defs>
                <pattern id="mock-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="0.75" fill="currentColor" className="text-ct-muted opacity-25" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mock-grid)" />
              
              {/* Classroom Center Point */}
              <circle cx="100" cy="100" r="5" fill="#8b5cf6" className="animate-pulse" />
              <circle cx="100" cy="100" r="2" fill="#ffffff" />
              
              {/* Dynamic Geofence Circle */}
              <circle 
                cx="100" 
                cy="100" 
                r={(mockRadius / 150) * 80} 
                fill="rgba(139, 92, 246, 0.04)" 
                stroke="#8b5cf6" 
                strokeWidth="1.5" 
                strokeDasharray="4 2" 
                className="transition-all duration-300"
              />
              
              {/* Student markers */}
              {mockStudents.map((s, idx) => {
                const isInside = s.r <= mockRadius
                const rad = (s.angle * Math.PI) / 180
                const x = 100 + (s.r / 150) * 80 * Math.cos(rad)
                const y = 100 + (s.r / 150) * 80 * Math.sin(rad)
                return (
                  <g key={idx}>
                    {isInside && (
                      <circle cx={x} cy={y} r="8" fill="none" stroke="#10b981" strokeWidth="0.75" className="animate-ping origin-center" />
                    )}
                    <circle cx={x} cy={y} r="4" fill={isInside ? '#10b981' : '#f43f5e'} className="transition-all duration-300" />
                    <text x={x} y={y - 7} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="currentColor" className="text-ct-text font-semibold opacity-75 font-mono select-none">
                      {s.name.split(' ')[0]}
                    </text>
                  </g>
                )
              })}
            </svg>
            
            {/* Live Stats Badges */}
            <div className="absolute bottom-3 left-3 flex gap-2 text-[10px] font-bold">
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                🟢 Inside: {presentCount}
              </span>
              <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                🔴 Outside: {outsideCount}
              </span>
            </div>
          </div>

          {/* Slider Controller */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-wider text-ct-muted">
              <span>Simulated Geofence Radius</span>
              <span className="text-violet-500 font-bold">{mockRadius} meters</span>
            </div>
            <input 
              type="range" 
              min="30" 
              max="130" 
              value={mockRadius} 
              onChange={(e) => setMockRadius(parseInt(e.target.value))}
              className="w-full accent-violet-650 h-1 bg-ct-bg border border-ct-border rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Live activity log */}
          <div className="space-y-1.5 border-t border-ct-border pt-4">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-ct-muted block">Live Simulator Feed</span>
            <div className="space-y-1 font-mono text-[9px] text-ct-muted">
              {feedLog.map((log, index) => (
                <div key={index} className="flex items-center gap-1.5 truncate">
                  <span className="text-violet-500">▶</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Core Capabilities */}
      <section id="features" className="px-6 md:px-12 py-20 border-t border-ct-border max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 mb-1">
            <Award className="w-5 h-5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Core Capabilities</h2>
          <p className="text-ct-muted text-sm max-w-lg mx-auto">
            ClassTrack provides robust tools to launch dynamic geofences, monitor student metrics, and secure grades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          
          <div className="h-full bg-ct-card border border-ct-border p-6 rounded-2xl flex flex-col justify-between hover:border-violet-500/30 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ct-text">No-Install Student QR</h3>
              <p className="text-ct-muted text-xs leading-relaxed">
                No App Store downloads. Students scan a dynamic QR code and launch location tracking instantly inside any mobile browser.
              </p>
            </div>
          </div>

          <div className="h-full bg-ct-card border border-ct-border p-6 rounded-2xl flex flex-col justify-between hover:border-violet-500/30 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ct-text">Interactive Geofences</h3>
              <p className="text-ct-muted text-xs leading-relaxed">
                Configure boundary limits using numeric inputs or visual sliders. Radius updates propagate to active student sockets in real time.
              </p>
            </div>
          </div>

          <div className="h-full bg-ct-card border border-ct-border p-6 rounded-2xl flex flex-col justify-between hover:border-violet-500/30 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ct-text">GPS Moving-Average Filter</h3>
              <p className="text-ct-muted text-xs leading-relaxed">
                Suppresses GPS noise and jumps inside concrete walls. Device readings are averaged across the last 3 coordinates and gated to filter weak accuracy signals.
              </p>
            </div>
          </div>

          <div className="h-full bg-ct-card border border-ct-border p-6 rounded-2xl flex flex-col justify-between hover:border-violet-500/30 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ct-text">Live Classroom Map</h3>
              <p className="text-ct-muted text-xs leading-relaxed">
                Monitors present students, out-of-boundary students, and offline connections live on a dynamic map synced with server logs.
              </p>
            </div>
          </div>

          <div className="h-full bg-ct-card border border-ct-border p-6 rounded-2xl flex flex-col justify-between hover:border-violet-500/30 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ct-text">Anti-Proxy Protection</h3>
              <p className="text-ct-muted text-xs leading-relaxed">
                Records student IP addresses, user agent strings, browser models, and high-accuracy GPS states to stop location-faking and proxy check-ins.
              </p>
            </div>
          </div>

          <div className="h-full bg-ct-card border border-ct-border p-6 rounded-2xl flex flex-col justify-between hover:border-violet-500/30 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ct-text">Robust Cloud Readiness</h3>
              <p className="text-ct-muted text-xs leading-relaxed">
                Fully optimized for platforms like Vercel and Neon Serverless PostgreSQL. Active client-polling fallback guarantees synchronization when websockets drop.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Classroom Workflow Section */}
      <section id="workflow" className="px-6 md:px-12 py-20 border-t border-ct-border bg-ct-card-solid/10 max-w-7xl mx-auto">
        <div className="text-center space-y-3 max-w-xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 mb-1">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">How ClassTrack Works</h2>
          <p className="text-ct-muted text-sm">
            Educators and students interact seamlessly to authenticate presence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          
          <div className="space-y-3.5 relative z-10 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-650 flex items-center justify-center font-extrabold text-white shadow-md text-sm transition-transform group-hover:scale-110 duration-200">
              1
            </div>
            <h4 className="font-bold text-base text-ct-text">Setup Geofence</h4>
            <p className="text-ct-muted text-xs leading-relaxed">
              Launch the teacher dashboard, choose classroom coordinates, customize radius scale, and generate the session.
            </p>
          </div>

          <div className="space-y-3.5 relative z-10 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-violet-650 to-indigo-650 flex items-center justify-center font-extrabold text-white shadow-md text-sm transition-transform group-hover:scale-110 duration-200">
              2
            </div>
            <h4 className="font-bold text-base text-ct-text">Scan QR Ticket</h4>
            <p className="text-ct-muted text-xs leading-relaxed">
              Project the dynamic session QR code in the classroom. Students scan it using their mobile browsers to access check-in.
            </p>
          </div>

          <div className="space-y-3.5 relative z-10 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-violet-650 to-indigo-650 flex items-center justify-center font-extrabold text-white shadow-md text-sm transition-transform group-hover:scale-110 duration-200">
              3
            </div>
            <h4 className="font-bold text-base text-ct-text">Validate GPS</h4>
            <p className="text-ct-muted text-xs leading-relaxed">
              Students view a location privacy consent screen, accept access, and begin background GPS coordinate validation.
            </p>
          </div>

          <div className="space-y-3.5 relative z-10 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-violet-650 to-indigo-650 flex items-center justify-center font-extrabold text-white shadow-md text-sm transition-transform group-hover:scale-110 duration-200">
              4
            </div>
            <h4 className="font-bold text-base text-ct-text">Real-Time Log</h4>
            <p className="text-ct-muted text-xs leading-relaxed">
              Instructors monitor check-ins live on maps. If a student leaves the geofence boundary, system alerts sound immediately.
            </p>
          </div>

        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="px-6 md:px-12 py-20 border-t border-ct-border max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 mb-1">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
          <p className="text-ct-muted text-sm">
            Answers to common questions about security, precision, and privacy.
          </p>
        </div>

        <div className="space-y-4 pt-4 text-left">
          
          <div className="bg-ct-card border border-ct-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-ct-border/80">
            <button
              onClick={() => setActiveFaq(activeFaq === 0 ? null : 0)}
              className="w-full flex items-center justify-between p-5 text-sm font-bold text-ct-text cursor-pointer hover:bg-ct-card-solid/40 text-left transition-colors"
            >
              <span>How precise is student location tracking?</span>
              <X className={`w-4 h-4 text-ct-muted transition-transform duration-300 ${activeFaq === 0 ? 'rotate-45 text-violet-500' : ''}`} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${activeFaq === 0 ? 'grid-rows-[1fr] opacity-100 border-t border-ct-border/40' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="p-5 text-xs text-ct-muted leading-relaxed font-normal bg-ct-bg/30">
                  ClassTrack implements a client-side geolocation moving-average filter. It takes the last 3 GPS coordinate signals and ignores readings with precision issues worse than 60 meters. This suppresses cellular fallback noise and prevents false outside-geofence events inside lecture halls.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-ct-card border border-ct-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-ct-border/80">
            <button
              onClick={() => setActiveFaq(activeFaq === 1 ? null : 1)}
              className="w-full flex items-center justify-between p-5 text-sm font-bold text-ct-text cursor-pointer hover:bg-ct-card-solid/40 text-left transition-colors"
            >
              <span>Does the app track students when they are not in class?</span>
              <X className={`w-4 h-4 text-ct-muted transition-transform duration-300 ${activeFaq === 1 ? 'rotate-45 text-violet-500' : ''}`} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${activeFaq === 1 ? 'grid-rows-[1fr] opacity-100 border-t border-ct-border/40' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="p-5 text-xs text-ct-muted leading-relaxed font-normal bg-ct-bg/30">
                  No. Student privacy is a top priority. Coordinates are only measured and transmitted when the student actively registers and maintains the tracking session tab open on their browser. Closing the tab or expiration of the teacher's session stops location checks instantly.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-ct-card border border-ct-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-ct-border/80">
            <button
              onClick={() => setActiveFaq(activeFaq === 2 ? null : 2)}
              className="w-full flex items-center justify-between p-5 text-sm font-bold text-ct-text cursor-pointer hover:bg-ct-card-solid/40 text-left transition-colors"
            >
              <span>What if a student does not have internet connection in class?</span>
              <X className={`w-4 h-4 text-ct-muted transition-transform duration-300 ${activeFaq === 2 ? 'rotate-45 text-violet-500' : ''}`} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${activeFaq === 2 ? 'grid-rows-[1fr] opacity-100 border-t border-ct-border/40' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="p-5 text-xs text-ct-muted leading-relaxed font-normal bg-ct-bg/30">
                  ClassTrack requires cellular data or campus Wi-Fi access to send heartbeats and communicate with the server. If a student loses connectivity, the system will highlight the student connection status as offline in the teacher dashboard map and resume sync once reconnection succeeds.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-ct-card border border-ct-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-ct-border/80">
            <button
              onClick={() => setActiveFaq(activeFaq === 3 ? null : 3)}
              className="w-full flex items-center justify-between p-5 text-sm font-bold text-ct-text cursor-pointer hover:bg-ct-card-solid/40 text-left transition-colors"
            >
              <span>Does this support serverless cloud hosting like Vercel?</span>
              <X className={`w-4 h-4 text-ct-muted transition-transform duration-300 ${activeFaq === 3 ? 'rotate-45 text-violet-500' : ''}`} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${activeFaq === 3 ? 'grid-rows-[1fr] opacity-100 border-t border-ct-border/40' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="p-5 text-xs text-ct-muted leading-relaxed font-normal bg-ct-bg/30">
                  Yes. Serverless hosting providers like Vercel do not support long-lived WebSocket connections natively. To accommodate this, ClassTrack V2 includes an automated HTTP fallback polling script that fetches student list updates and maps coordinates every 5 seconds, maintaining smooth operations.
                </div>
              </div>
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
          &copy; {new Date().getFullYear()} ClassTrack. All rights reserved. Designed for academic portfolio presentation.
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
              <X className="w-4 h-4" />
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
                        className="block w-full pl-9 pr-3 py-2.5 bg-ct-input border border-ct-border rounded-xl text-ct-text placeholder-ct-muted/50 focus:outline-none focus:ring-1 focus:ring-violet-500 text-base md:text-xs transition-all"
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
                      className="block w-full pl-9 pr-3 py-2.5 bg-ct-input border border-ct-border rounded-xl text-ct-text placeholder-ct-muted/50 focus:outline-none focus:ring-1 focus:ring-violet-500 text-base md:text-xs transition-all"
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
                      className="block w-full pl-9 pr-9 py-2.5 bg-ct-input border border-ct-border rounded-xl text-ct-text placeholder-ct-muted/50 focus:outline-none focus:ring-1 focus:ring-violet-500 text-base md:text-xs transition-all"
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

      {/* Redirecting Overlay */}
      {isRedirecting && (
        <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-ct-bg/85 backdrop-blur-md">
          <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
          <p className="text-ct-text font-bold text-sm">Authenticating & Redirecting...</p>
        </div>
      )}
    </div>
  )
}
