'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import {
  MapPin,
  Users,
  QrCode,
  Sliders,
  LogOut,
  Plus,
  Compass,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  WifiOff,
  X,
  Copy,
  Check,
  Bell,
  Play,
  Volume2,
  VolumeX,
  Search,
  Activity
} from 'lucide-react'
import dynamic from 'next/dynamic'
import QRCode from 'qrcode'

// Load Leaflet map component dynamically (SSR: false) to prevent 'window is not defined' errors
const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false })

interface Session {
  id: string
  session_name: string
  classroom_name: string
  radius: number
  latitude: number
  longitude: number
  start_time: string
  end_time: string
}

interface Student {
  id: string
  name: string
  roll_number: string
  department: string
  created_at: string
}

interface Location {
  student_id: string
  latitude: number
  longitude: number
  last_seen: string
  inside_radius: boolean
}

interface Attendance {
  student_id: string
  ip_address: string
  user_agent: string
  joined_at: string
  status: string
}

interface StudentFullDetails extends Student {
  latitude?: number
  longitude?: number
  last_seen?: string
  inside_radius?: boolean
  ip_address?: string
  user_agent?: string
  joined_at?: string
  status: 'inside' | 'outside' | 'offline'
}

interface ToastNotification {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
}

export default function Dashboard() {
  const router = useRouter()
  const socketRef = useRef<any>(null)

  // Teacher Profile
  const [teacher, setTeacher] = useState<{ name: string; email: string } | null>(null)

  // Active Session states
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [sessionsList, setSessionsList] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  // Creating Session Form states
  const [sessionNameInput, setSessionNameInput] = useState('')
  const [classroomNameInput, setClassroomNameInput] = useState('')
  const [radiusInput, setRadiusInput] = useState('50')
  const [durationInput, setDurationInput] = useState('60')
  const [classroomLat, setClassroomLat] = useState<number | null>(null)
  const [classroomLng, setClassroomLng] = useState<number | null>(null)
  const [detectingCoords, setDetectingCoords] = useState(false)
  const [showCoordsForm, setShowCoordsForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Data states
  const [students, setStudents] = useState<Record<string, Student>>({})
  const [locations, setLocations] = useState<Record<string, Location>>({})
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Attendance>>({})

  // UI settings
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [showRadiusModal, setShowRadiusModal] = useState(false)
  const [newRadiusInput, setNewRadiusInput] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Notifications/Toasts list
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Time left state
  const [timeLeft, setTimeLeft] = useState<string>('')

  // Refs for tracking changes to trigger audio/notifications
  const prevInsideState = useRef<Record<string, boolean>>({})
  const prevOfflineState = useRef<Record<string, boolean>>({})

  // Fetch initial profile & sessions
  useEffect(() => {
    async function loadInitialData() {
      try {
        const res = await fetch('/api/sessions')
        if (!res.ok) {
          router.push('/')
          return
        }

        const data = await res.json()

        if (data.admin) {
          setTeacher(data.admin)
        }

        if (data.sessions) {
          // Normalize the sessions to snake_case format for frontend compatibility
          const normalizedSessions = data.sessions.map((s: any) => ({
            id: s.id,
            session_name: s.sessionName,
            classroom_name: s.classroomName,
            radius: s.radius,
            latitude: s.latitude,
            longitude: s.longitude,
            start_time: s.startTime,
            end_time: s.endTime
          }))

          setSessionsList(normalizedSessions)
          
          const now = Date.now()
          const active = normalizedSessions.find((s: any) => new Date(s.end_time).getTime() > now && s.isActive !== false)
          if (active) {
            setActiveSession(active)
            setNewRadiusInput(active.radius.toString())
            await loadSessionData(active.id)
          }
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [router])

  // Load students, attendance, and locations for an active session
  async function loadSessionData(sessionId: string) {
    try {
      const res = await fetch(`/api/dashboard?sessionId=${sessionId}`)
      if (!res.ok) return
      const data = await res.json()

      const studentsMap: Record<string, Student> = {}
      data.students?.forEach((s: any) => {
        studentsMap[s.id] = {
          id: s.id,
          name: s.name,
          roll_number: s.rollNumber,
          department: s.department,
          created_at: s.createdAt
        }
      })

      const locationsMap: Record<string, Location> = {}
      data.locations?.forEach((l: any) => {
        locationsMap[l.studentId] = {
          student_id: l.studentId,
          latitude: l.latitude,
          longitude: l.longitude,
          last_seen: l.lastSeen,
          inside_radius: l.insideRadius
        }
      })

      const attendanceMap: Record<string, Attendance> = {}
      data.attendance?.forEach((a: any) => {
        attendanceMap[a.studentId] = {
          student_id: a.studentId,
          ip_address: a.ipAddress,
          user_agent: a.userAgent,
          joined_at: a.joinedAt,
          status: a.status
        }
      })

      setStudents(studentsMap)
      setLocations(locationsMap)
      setAttendanceRecords(attendanceMap)
    } catch (err) {
      console.error('Error loading session details:', err)
    }
  }

  // 15-second offline check timer
  useEffect(() => {
    if (!activeSession) return

    const offlineCheckInterval = setInterval(() => {
      const now = Date.now()
      setLocations((prevLocations) => {
        const updated = { ...prevLocations }
        let changed = false

        Object.keys(updated).forEach((studentId) => {
          const loc = updated[studentId]
          const lastSeenTime = new Date(loc.last_seen).getTime()
          const isOffline = now - lastSeenTime > 15000 // 15 seconds boundary

          // Check if status changed to offline to push notification
          if (isOffline && !prevOfflineState.current[studentId]) {
            prevOfflineState.current[studentId] = true
            const studentName = students[studentId]?.name || 'Student'
            
            // Broadcast offline state change via WebSockets
            if (socketRef.current) {
              socketRef.current.emit('status-change', {
                roomId: activeSession.id,
                studentId,
                status: 'offline'
              })
            }

            triggerAlert(`${studentName} has disconnected (connection lost)`, 'error')
            changed = true
          }
        })

        return changed ? updated : prevLocations
      })
    }, 4000)

    return () => clearInterval(offlineCheckInterval)
  }, [activeSession, students])

  // Real-time synchronization using Socket.IO
  useEffect(() => {
    if (!activeSession) return

    socketRef.current = io()
    const socket = socketRef.current

    socket.emit('join-room', activeSession.id)

    // 1. Listen to new students checking in
    socket.on('student-joined', ({ student, attendance }: { student: any; attendance: any }) => {
      setStudents((prev) => ({
        ...prev,
        [student.id]: {
          id: student.id,
          name: student.name,
          roll_number: student.roll_number,
          department: student.department,
          created_at: student.created_at
        }
      }))
      
      setAttendanceRecords((prev) => ({
        ...prev,
        [attendance.studentId]: {
          student_id: attendance.studentId,
          ip_address: attendance.ipAddress || attendance.ip_address,
          user_agent: attendance.userAgent || attendance.user_agent,
          joined_at: attendance.joinedAt || attendance.joined_at,
          status: attendance.status
        }
      }))

      triggerAlert(`${student.name} joined the attendance session`, 'success')
    })

    // 2. Listen to student connection status changes
    socket.on('status-change', ({ studentId, status }: { studentId: string; status: string }) => {
      setAttendanceRecords((prev) => {
        const current = prev[studentId]
        if (!current) return prev
        return {
          ...prev,
          [studentId]: {
            ...current,
            status: status === 'offline' ? 'Offline' : 'Active'
          }
        }
      })

      // Update locations state status
      setLocations((prev) => {
        const current = prev[studentId]
        if (!current) return prev
        return {
          ...prev,
          [studentId]: {
            ...current,
            last_seen: new Date().toISOString()
          }
        }
      })

      const studentName = students[studentId]?.name || 'Student'
      if (status === 'offline') {
        prevOfflineState.current[studentId] = true
        triggerAlert(`${studentName} disconnected (connection lost)`, 'error')
      } else {
        prevOfflineState.current[studentId] = false
        triggerAlert(`${studentName} reconnected`, 'success')
      }
    })

    // 3. Listen to real-time student location updates
    socket.on('location-update', (loc: any) => {
      setLocations((prev) => ({
        ...prev,
        [loc.student_id]: {
          student_id: loc.student_id,
          latitude: loc.latitude,
          longitude: loc.longitude,
          last_seen: loc.last_seen,
          inside_radius: loc.inside_radius
        }
      }))

      // Reset offline status
      prevOfflineState.current[loc.student_id] = false

      // Check if boundary crossed
      const prevInside = prevInsideState.current[loc.student_id]
      const curInside = loc.inside_radius
      const studentName = students[loc.student_id]?.name || 'Student'

      if (prevInside !== undefined && prevInside !== curInside) {
        if (!curInside) {
          triggerAlert(`${studentName} left the classroom boundary!`, 'warning')
        } else {
          triggerAlert(`${studentName} returned inside the classroom boundary`, 'info')
        }
      }

      prevInsideState.current[loc.student_id] = curInside
    })

    return () => {
      socket.disconnect()
    }
  }, [activeSession, students])

  // Session Duration Countdown Timer
  useEffect(() => {
    if (!activeSession) return

    const timer = setInterval(() => {
      const now = Date.now()
      const end = new Date(activeSession.end_time).getTime()
      const diff = end - now

      if (diff <= 0) {
        setTimeLeft('Session Expired')
        setActiveSession(null)
        clearInterval(timer)
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(
          `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`
        )
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [activeSession])

  // Trigger audio alert and display a beautiful toast message on dashboard
  function triggerAlert(message: string, type: 'info' | 'success' | 'warning' | 'error') {
    // 1. Play Audio chime
    if (soundEnabled) {
      try {
        const frequency = type === 'error' ? 220 : type === 'warning' ? 440 : type === 'success' ? 660 : 520
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime)
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)

        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)

        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.4)
      } catch (err) {
        console.warn('Audio synthesis blocked by browser auto-play settings.')
      }
    }

    // 2. Add Toast message
    const newToast: ToastNotification = {
      id: Math.random().toString(),
      message,
      type,
      timestamp: new Date()
    }
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]) // Keep up to 5 toast logs

    // Dismiss toast after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
    }, 6000)
  }

  // Generate QR Code URL whenever active session changes
  useEffect(() => {
    if (activeSession) {
      const joinUrl = `${window.location.origin}/join/${activeSession.id}`
      QRCode.toDataURL(joinUrl, { margin: 1, width: 300 })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error(err))
    }
  }, [activeSession])

  // Automatically detect teacher location to initialize classroom position
  const detectLocation = () => {
    if (!('geolocation' in navigator)) {
      setFormError('Geolocation not supported by this browser.')
      return
    }

    setDetectingCoords(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setClassroomLat(position.coords.latitude)
        setClassroomLng(position.coords.longitude)
        setDetectingCoords(false)
        setShowCoordsForm(true)
      },
      (error) => {
        setDetectingCoords(false)
        setFormError('Failed to capture location coordinates. Please pick on the map instead.')
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  // Create classroom session request
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!sessionNameInput.trim() || !classroomNameInput.trim() || !radiusInput) {
      setFormError('All inputs are required')
      return
    }

    if (classroomLat === null || classroomLng === null) {
      setFormError('Please capture or select the classroom coordinates on the map.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: sessionNameInput.trim(),
          classroomName: classroomNameInput.trim(),
          radius: parseInt(radiusInput),
          latitude: classroomLat,
          longitude: classroomLng,
          duration: parseInt(durationInput)
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Failed to create session')
        setLoading(false)
      } else {
        const normalizedSession = {
          id: data.session.id,
          session_name: data.session.sessionName,
          classroom_name: data.session.classroomName,
          radius: data.session.radius,
          latitude: data.session.latitude,
          longitude: data.session.longitude,
          start_time: data.session.startTime,
          end_time: data.session.endTime
        }

        setActiveSession(normalizedSession)
        setSessionsList((prev) => [normalizedSession, ...prev])
        setNewRadiusInput(normalizedSession.radius.toString())
        
        // Reset inputs
        setSessionNameInput('')
        setClassroomNameInput('')
        setClassroomLat(null)
        setClassroomLng(null)
        setShowCoordsForm(false)

        // Reset student tracking collections
        setStudents({})
        setLocations({})
        setAttendanceRecords({})
        prevInsideState.current = {}
        prevOfflineState.current = {}

        setLoading(false)
        triggerAlert('Attendance session started successfully!', 'success')
      }
    } catch (err) {
      setFormError('Failed to establish session. Check connection.')
      setLoading(false)
    }
  }

  // Adjust active geofence radius
  const handleUpdateRadius = async () => {
    if (!activeSession || !newRadiusInput) return

    try {
      const res = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeSession.id,
          radius: parseInt(newRadiusInput)
        })
      })

      const data = await res.json()
      if (res.ok) {
        const normalizedSession = {
          id: data.session.id,
          session_name: data.session.sessionName,
          classroom_name: data.session.classroomName,
          radius: data.session.radius,
          latitude: data.session.latitude,
          longitude: data.session.longitude,
          start_time: data.session.startTime,
          end_time: data.session.endTime
        }

        setActiveSession(normalizedSession)
        setShowRadiusModal(false)
        triggerAlert(`Geofence radius adjusted to ${newRadiusInput}m`, 'success')
      } else {
        triggerAlert('Failed to update radius', 'error')
      }
    } catch (err) {
      console.error('Error updating radius:', err)
    }
  }

  // End the attendance session
  const handleEndSession = async () => {
    if (!activeSession) return

    if (!confirm('Are you sure you want to end this attendance tracking session?')) {
      return
    }

    try {
      const res = await fetch(`/api/sessions?id=${activeSession.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setActiveSession(null)
        setStudents({})
        setLocations({})
        setAttendanceRecords({})
        prevInsideState.current = {}
        prevOfflineState.current = {}
        triggerAlert('Attendance session closed.', 'info')
      } else {
        triggerAlert('Failed to close session', 'error')
      }
    } catch (err) {
      console.error('Error closing session:', err)
    }
  }

  // Sign out handler
  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  // Copy registration link to clipboard
  const copySessionLink = () => {
    if (!activeSession) return
    const link = `${window.location.origin}/join/${activeSession.id}`
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Consolidate raw tracking data into UI models
  const getAggregatedStudents = (): StudentFullDetails[] => {
    const list: StudentFullDetails[] = []
    
    Object.keys(students).forEach((studentId) => {
      const stud = students[studentId]
      const loc = locations[studentId]
      const att = attendanceRecords[studentId]

      let status: 'inside' | 'outside' | 'offline' = 'offline'
      if (att && att.status === 'Offline') {
        status = 'offline'
      } else if (loc) {
        const lastSeenDiff = Date.now() - new Date(loc.last_seen).getTime()
        if (lastSeenDiff > 15000) {
          status = 'offline'
        } else {
          status = loc.inside_radius ? 'inside' : 'outside'
        }
      }

      list.push({
        ...stud,
        latitude: loc?.latitude,
        longitude: loc?.longitude,
        last_seen: loc?.last_seen,
        inside_radius: loc?.inside_radius,
        ip_address: att?.ip_address,
        user_agent: att?.user_agent,
        joined_at: att?.joined_at,
        status
      })
    })

    return list
  }

  // Filters students based on search query
  const aggregatedStudents = getAggregatedStudents()
  const filteredStudents = aggregatedStudents.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roll_number.includes(searchQuery) ||
    s.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculations for KPI summaries
  const totalStudents = aggregatedStudents.length
  const presentCount = aggregatedStudents.filter((s) => s.status === 'inside').length
  const outsideCount = aggregatedStudents.filter((s) => s.status === 'outside').length
  const offlineCount = aggregatedStudents.filter((s) => s.status === 'offline').length

  const selectedStudent = selectedStudentId ? getAggregatedStudents().find(s => s.id === selectedStudentId) : null

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 font-sans">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Synchronizing dashboard access...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-white font-sans overflow-hidden">
      {/* Top Header Panel */}
      <header className="flex items-center justify-between px-6 py-4 bg-zinc-900/40 border-b border-zinc-800/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md border border-violet-500/20">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              ClassTrack <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-medium">Dashboard</span>
            </h1>
            <p className="text-xs text-zinc-500">Instructor: {teacher?.name}</p>
          </div>
        </div>

        {/* Dashboard Actions */}
        {activeSession ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 bg-zinc-950/60 border border-zinc-800/60 px-4 py-2 rounded-xl text-sm mr-2">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Clock className="w-4 h-4 text-violet-400 animate-pulse" />
                <span>Timer:</span>
                <span className="font-mono text-white font-semibold">{timeLeft}</span>
              </div>
              <div className="w-px h-4 bg-zinc-800"></div>
              <div className="text-xs text-zinc-400">
                Classroom: <span className="text-white font-semibold">{activeSession.classroom_name}</span>
              </div>
            </div>

            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm border border-zinc-700"
            >
              <QrCode className="w-4 h-4 text-violet-400" />
              QR Link
            </button>

            <button
              onClick={() => setShowRadiusModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm border border-zinc-700"
            >
              <Sliders className="w-4 h-4 text-violet-400" />
              Radius ({activeSession.radius}m)
            </button>

            <button
              onClick={handleEndSession}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-650 hover:bg-red-650 text-white rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm border border-red-500/20"
            >
              End Session
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 text-xs hidden sm:inline-block">No Active Attendance Session</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Audio Chime Mute button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer border border-transparent hover:border-zinc-800"
            title={soundEnabled ? 'Mute Alert Chimes' : 'Unmute Alert Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3.5 py-2.5 hover:bg-zinc-800/80 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer border border-transparent hover:border-zinc-800"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel: Student list monitor */}
        <aside className="w-80 border-r border-zinc-800/80 bg-zinc-900/10 backdrop-blur-sm flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-zinc-800/80">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold tracking-wider uppercase text-zinc-400">
                Student Tracking
              </h2>
              <span className="text-[10px] px-2 py-0.5 bg-violet-950 border border-violet-900/50 rounded-full font-medium text-violet-400 flex items-center gap-1">
                <Users className="w-2.5 h-2.5" />
                {totalStudents} joined
              </span>
            </div>
            
            {/* Search filter input */}
            <div className="relative">
              <Search className="absolute left-3 inset-y-0 my-auto w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search name, roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-850 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Student items scroll view */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/60">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs leading-relaxed">
                {activeSession 
                  ? 'No students matched this query'
                  : 'Start a session to track student attendance'}
              </div>
            ) : (
              filteredStudents.map((stud) => {
                const statusColor =
                  stud.status === 'inside'
                    ? 'bg-emerald-500'
                    : stud.status === 'outside'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'

                const isSelected = selectedStudentId === stud.id

                return (
                  <button
                    key={stud.id}
                    onClick={() => setSelectedStudentId(isSelected ? null : stud.id)}
                    className={`w-full text-left p-4 transition-colors text-xs space-y-2 relative border-l-2 hover:bg-zinc-900/40 ${
                      isSelected 
                        ? 'bg-zinc-900/60 border-l-violet-500' 
                        : 'border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-semibold text-white leading-none truncate max-w-[150px]">{stud.name}</div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                        <span className="text-[10px] text-zinc-500 font-medium capitalize">{stud.status}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Roll: {stud.roll_number}</span>
                      <span className="font-mono text-[9px] truncate max-w-[100px]">{stud.ip_address}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* Center Panel: Map and controls */}
        <main className="flex-1 relative bg-zinc-950 p-6 flex flex-col overflow-hidden">
          {activeSession ? (
            <div className="flex flex-col flex-1 gap-6 overflow-hidden">
              
              {/* Top Summary Widget */}
              <div className="grid grid-cols-4 gap-4 flex-shrink-0">
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-500">Total Checked In</span>
                    <h3 className="text-2xl font-black mt-1 text-white">{totalStudents}</h3>
                  </div>
                  <Users className="w-7 h-7 text-zinc-600" />
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-500">Inside Boundary</span>
                    <h3 className="text-2xl font-black mt-1 text-emerald-400">{presentCount}</h3>
                  </div>
                  <ShieldCheck className="w-7 h-7 text-emerald-550/30" />
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-500">Outside Boundary</span>
                    <h3 className="text-2xl font-black mt-1 text-rose-400">{outsideCount}</h3>
                  </div>
                  <AlertTriangle className="w-7 h-7 text-rose-550/30" />
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-500">Connection Lost</span>
                    <h3 className="text-2xl font-black mt-1 text-amber-400">{offlineCount}</h3>
                  </div>
                  <WifiOff className="w-7 h-7 text-amber-550/30" />
                </div>
              </div>

              {/* Map Panel (occupies 75% height) */}
              <div className="flex-1 relative min-h-[350px] overflow-hidden">
                <LiveMap
                  classroomLat={activeSession.latitude}
                  classroomLng={activeSession.longitude}
                  radius={activeSession.radius}
                  students={aggregatedStudents}
                />
              </div>
            </div>
          ) : (
            // No Session State: Create Classroom Session UI
            <div className="flex flex-col flex-1 items-center justify-center p-6 max-w-xl mx-auto overflow-y-auto">
              <div className="w-full text-center space-y-2 mb-8">
                <div className="w-14 h-14 bg-violet-950 border border-violet-800 rounded-2xl flex items-center justify-center mx-auto text-violet-400">
                  <Play className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white">Create Attendance Session</h3>
                <p className="text-zinc-400 text-sm">Set up your geo-fence and start logging student locations</p>
              </div>

              {/* Create session card */}
              <div className="w-full bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 shadow-2xl">
                <form onSubmit={handleCreateSession} className="space-y-5">
                  {formError && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-200 text-sm">
                      <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Session Name</label>
                      <input
                        type="text"
                        required
                        placeholder="CS-101 Lecture"
                        value={sessionNameInput}
                        onChange={(e) => setSessionNameInput(e.target.value)}
                        className="block w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Classroom Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Hall 3A"
                        value={classroomNameInput}
                        onChange={(e) => setClassroomNameInput(e.target.value)}
                        className="block w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Geofence Radius (meters)</label>
                      <select
                        value={radiusInput}
                        onChange={(e) => setRadiusInput(e.target.value)}
                        className="block w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                      >
                        <option value="15">15 meters</option>
                        <option value="30">30 meters</option>
                        <option value="50">50 meters</option>
                        <option value="100">100 meters</option>
                        <option value="200">200 meters</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Duration (minutes)</label>
                      <select
                        value={durationInput}
                        onChange={(e) => setDurationInput(e.target.value)}
                        className="block w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                      >
                        <option value="30">30 minutes</option>
                        <option value="60">60 minutes</option>
                        <option value="90">90 minutes</option>
                        <option value="120">120 minutes</option>
                        <option value="180">180 minutes</option>
                      </select>
                    </div>
                  </div>

                  {/* Classroom Coordinate capture */}
                  <div className="border-t border-zinc-800/80 pt-4 space-y-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Classroom Coordinates</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={detectLocation}
                        disabled={detectingCoords}
                        className="flex-1 flex justify-center items-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all border border-zinc-700 disabled:opacity-50 cursor-pointer"
                      >
                        {detectingCoords ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Compass className="w-4 h-4 text-violet-400" />
                            Detect My Coordinates
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowCoordsForm(true)
                          // Initialize default placeholder coords (e.g. San Francisco or similar) if empty
                          if (classroomLat === null) {
                            setClassroomLat(37.774929)
                            setClassroomLng(-122.419418)
                          }
                        }}
                        className="flex-1 flex justify-center items-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all border border-zinc-700 cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-violet-400" />
                        Set Coordinates Manually
                      </button>
                    </div>

                    {showCoordsForm && classroomLat !== null && classroomLng !== null && (
                      <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/60 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-zinc-500">Latitude</span>
                            <input
                              type="number"
                              step="0.000001"
                              value={classroomLat}
                              onChange={(e) => setClassroomLat(parseFloat(e.target.value))}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 mt-1 text-white font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-zinc-500">Longitude</span>
                            <input
                              type="number"
                              step="0.000001"
                              value={classroomLng}
                              onChange={(e) => setClassroomLng(parseFloat(e.target.value))}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 mt-1 text-white font-mono"
                            />
                          </div>
                        </div>

                        {/* Interactive mini picking map */}
                        <div className="h-44 w-full relative">
                          <LiveMap
                            classroomLat={classroomLat}
                            classroomLng={classroomLng}
                            radius={parseInt(radiusInput) || 50}
                            students={[]}
                            isSelectingLocation={true}
                            onLocationSelected={(lat, lng) => {
                              setClassroomLat(lat)
                              setClassroomLng(lng)
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-violet-500/10 transition-all text-xs cursor-pointer uppercase tracking-wider"
                  >
                    Generate Session
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Detailed Student view overlay drawer (when student is clicked in sidebar) */}
          {selectedStudent && (
            <div className="absolute top-6 left-6 bottom-6 w-80 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl flex flex-col z-[1000] p-6 animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <h3 className="font-bold text-white">Student Details</h3>
                <button
                  onClick={() => setSelectedStudentId(null)}
                  className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 space-y-5 text-xs">
                <div className="flex flex-col items-center text-center pb-4 border-b border-zinc-800/50">
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg mb-3 ${
                    selectedStudent.status === 'inside'
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-950/10'
                      : selectedStudent.status === 'outside'
                      ? 'border-rose-500 text-rose-400 bg-rose-950/10'
                      : 'border-amber-500 text-amber-400 bg-amber-950/10'
                  }`}>
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="font-bold text-white text-base">{selectedStudent.name}</h4>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{selectedStudent.department}</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-zinc-500 block">Roll / Student Number</span>
                    <span className="text-zinc-200 font-semibold mt-0.5 block">{selectedStudent.roll_number}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">IP Address</span>
                    <span className="text-zinc-200 font-mono mt-0.5 block">{selectedStudent.ip_address || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Joined Timestamp</span>
                    <span className="text-zinc-200 mt-0.5 block">
                      {selectedStudent.joined_at ? new Date(selectedStudent.joined_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Last Coordinates</span>
                    <span className="text-zinc-200 font-mono mt-0.5 block">
                      {selectedStudent.latitude !== undefined && selectedStudent.longitude !== undefined
                        ? `${selectedStudent.latitude.toFixed(6)}, ${selectedStudent.longitude.toFixed(6)}`
                        : 'No coordinates logged'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Last Seen Status</span>
                    <span className="text-zinc-200 mt-0.5 block">
                      {selectedStudent.last_seen 
                        ? new Date(selectedStudent.last_seen).toLocaleTimeString() 
                        : 'Never'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-1">User Agent (Device Info)</span>
                    <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-850 text-[10px] text-zinc-400 break-all leading-normal max-h-24 overflow-y-auto">
                      {selectedStudent.user_agent || 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toast Notification HUD display list (Bottom Right) */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-[1000] pointer-events-none">
            {toasts.map((toast) => {
              const theme =
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-900/60 text-emerald-200'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/90 border-amber-900/60 text-amber-200'
                  : toast.type === 'error'
                  ? 'bg-red-950/90 border-red-900/60 text-red-200'
                  : 'bg-zinc-900/90 border-zinc-800/60 text-zinc-200'

              const Icon =
                toast.type === 'success'
                  ? ShieldCheck
                  : toast.type === 'warning'
                  ? AlertTriangle
                  : toast.type === 'error'
                  ? WifiOff
                  : Bell

              return (
                <div
                  key={toast.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl text-xs font-medium animate-in fade-in slide-in-from-bottom duration-200 max-w-sm pointer-events-auto ${theme}`}
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                  <span>{toast.message}</span>
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {/* QR Code generator Modal */}
      {showQrModal && activeSession && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-sm">QR Code Attendance Link</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex flex-col items-center space-y-4">
              {/* QR Image */}
              {qrCodeUrl ? (
                <div className="bg-white p-4 rounded-xl border-4 border-white shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="Session QR" className="w-56 h-56" />
                </div>
              ) : (
                <div className="w-56 h-56 bg-zinc-950 flex items-center justify-center rounded-xl animate-pulse text-zinc-500 text-xs">
                  Generating QR code...
                </div>
              )}

              <p className="text-zinc-400 text-center text-xs leading-relaxed">
                Students scan this QR code or navigate to the link below to verify geofenced attendance.
              </p>

              {/* Copy URL bar */}
              <div className="w-full flex gap-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-850">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/join/${activeSession.id}`}
                  className="flex-1 bg-transparent text-[10px] text-zinc-350 focus:outline-none truncate"
                />
                <button
                  onClick={copySessionLink}
                  className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer flex-shrink-0"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modify Geofence Radius Modal */}
      {showRadiusModal && activeSession && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-sm">Radius Settings</h3>
              <button
                onClick={() => setShowRadiusModal(false)}
                className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">Classroom Radius (meters)</label>
                <select
                  value={newRadiusInput}
                  onChange={(e) => setNewRadiusInput(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-xs"
                >
                  <option value="15">15 meters</option>
                  <option value="30">30 meters</option>
                  <option value="50">50 meters</option>
                  <option value="100">100 meters</option>
                  <option value="200">200 meters</option>
                </select>
              </div>

              <button
                onClick={handleUpdateRadius}
                className="w-full py-3 bg-violet-650 hover:bg-violet-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-violet-500/10"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
