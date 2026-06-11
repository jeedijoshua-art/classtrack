'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
  Activity,
  Download,
  Sun,
  Moon,
  Menu
} from 'lucide-react'
import dynamic from 'next/dynamic'
import QRCode from 'qrcode'

// Load Leaflet map component dynamically (SSR: false) to prevent 'window is not defined' errors
const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false })
import { getDistanceInMeters } from '@/lib/geoutils'

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
  device_type?: string
  browser_info?: string
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
  device_type?: string
  browser_info?: string
  joined_at?: string
  distance?: number
  status: 'inside' | 'outside' | 'offline'
}

interface ToastNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
}

export default function Dashboard() {
  const router = useRouter()
  const socketRef = useRef<any>(null)

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
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [newRadiusInput, setNewRadiusInput] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)

  // Network Information states
  const [networkInfo, setNetworkInfo] = useState<{
    hostIp: string
    port: number
    studentAccessUrl: string
    status: string
  } | null>(null)
  const [networkStatus, setNetworkStatus] = useState<'Ready' | 'Error'>('Ready')
  const [copiedNetworkUrl, setCopiedNetworkUrl] = useState(false)
  const [latency, setLatency] = useState<number | null>(null)

  // Helper to get the correct student access origin dynamically
  const getStudentAccessOrigin = useCallback(() => {
    if (typeof window === 'undefined') return ''
    const hostname = window.location.hostname
    const isLocal = 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname === '0.0.0.0'
    
    if (isLocal && networkInfo?.studentAccessUrl) {
      return networkInfo.studentAccessUrl
    }
    return window.location.origin
  }, [networkInfo])

  // Trigger audio alert and display a beautiful toast message on dashboard
  const triggerAlert = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error', title?: string) => {
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
      title: title || (type === 'success' ? 'Success' : type === 'warning' ? 'Warning' : type === 'error' ? 'Error' : 'Notification'),
      message,
      type,
      timestamp: new Date()
    }
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]) // Keep up to 5 toast logs

    // Dismiss toast after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
    }, 6000)
  }, [soundEnabled])

  // Load students, attendance, and locations for an active session
  const loadSessionData = useCallback(async (sessionId: string) => {
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
          device_type: a.deviceType,
          browser_info: a.browserInfo,
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
  }, [])

  // Notifications/Toasts list
  const [searchQuery, setSearchQuery] = useState('')

  // Time left state
  const [timeLeft, setTimeLeft] = useState<string>('')

  // Fetch network information and poll health status
  useEffect(() => {
    async function fetchNetworkInfo() {
      try {
        const res = await fetch('/api/network')
        if (res.ok) {
          const data = await res.json()
          setNetworkInfo(data)
          const socketConnected = activeSession ? (socketRef.current?.connected ?? false) : true
          if (data.hostIp && socketConnected) {
            setNetworkStatus('Ready')
          } else {
            setNetworkStatus('Error')
          }
        } else {
          setNetworkStatus('Error')
        }
      } catch (err) {
        setNetworkStatus('Error')
      }
    }

    fetchNetworkInfo()

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/network')
        if (res.ok) {
          const data = await res.json()
          const socketConnected = activeSession ? (socketRef.current?.connected ?? false) : true
          if (data.hostIp && socketConnected) {
            setNetworkStatus('Ready')
          } else {
            setNetworkStatus('Error')
          }
        } else {
          setNetworkStatus('Error')
        }
      } catch (err) {
        setNetworkStatus('Error')
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [activeSession])

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
  }, [router, loadSessionData])

  // Poll session data as a fallback when socket is disconnected
  useEffect(() => {
    if (!activeSession) return

    const pollInterval = setInterval(() => {
      // Check if socket is disconnected or not initialized
      const isSocketActive = socketRef.current?.connected
      if (!isSocketActive) {
        console.log('[Dashboard Polling Fallback] Socket is disconnected or unavailable. Polling latest session data...')
        loadSessionData(activeSession.id)
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [activeSession, loadSessionData])



  // 30-second offline check timer
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
          const isOffline = now - lastSeenTime > 30000 // Requirement 10: 30 seconds boundary

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

            triggerAlert(`${studentName} disconnected.`, 'error', '⚠ Connection Lost')
            changed = true
          }
        })

        return changed ? updated : prevLocations
      })
    }, 4000)

    return () => clearInterval(offlineCheckInterval)
  }, [activeSession, students, triggerAlert])

  // Real-time synchronization using Socket.IO
  useEffect(() => {
    if (!activeSession) return

    socketRef.current = io()
    const socket = socketRef.current

    socket.emit('join-room', activeSession.id)

    // Latency Ping System
    let pingInterval: NodeJS.Timeout
    socket.on('client-pong', (start: number) => {
      setLatency(Date.now() - start)
    })

    socket.on('connect', () => {
      pingInterval = setInterval(() => {
        socket.emit('client-ping', Date.now())
      }, 5000)
    })

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
          device_type: attendance.deviceType || attendance.device_type,
          browser_info: attendance.browserInfo || attendance.browser_info,
          joined_at: attendance.joinedAt || attendance.joined_at,
          status: attendance.status
        }
      }))

      triggerAlert(`${student.name} checked in.`, 'success', '✅ Student Joined')
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
        triggerAlert(`${studentName} disconnected.`, 'error', '⚠ Connection Lost')
      } else {
        prevOfflineState.current[studentId] = false
        triggerAlert(`${studentName} returned active.`, 'success', '✅ Student Reconnected')
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
          triggerAlert(`${studentName} is now outside the classroom radius.`, 'warning', '⚠ Student Left Boundary')
        } else {
          triggerAlert(`${studentName} is back inside the classroom radius.`, 'success', '✅ Student Returned')
        }
      }

      prevInsideState.current[loc.student_id] = curInside
    })

    return () => {
      socket.off('client-pong')
      socket.off('connect')
      if (pingInterval) clearInterval(pingInterval)
      socket.disconnect()
    }
  }, [activeSession, students, triggerAlert])

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



  // Generate QR Code URL whenever active session or networkInfo changes
  useEffect(() => {
    if (activeSession) {
      const origin = getStudentAccessOrigin()
      const joinUrl = `${origin}/join/${activeSession.id}`
      QRCode.toDataURL(joinUrl, { margin: 1, width: 300 })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error(err))
    }
  }, [activeSession, networkInfo, getStudentAccessOrigin])

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
        
        // Emit live radius update over socket.io
        if (socketRef.current) {
          socketRef.current.emit('radius-update', {
            roomId: normalizedSession.id,
            radius: normalizedSession.radius
          })
        }

        setShowRadiusModal(false)
        triggerAlert(`Geofence radius adjusted to ${newRadiusInput}m`, 'success', '✅ Radius Updated')
      } else {
        triggerAlert('Failed to update radius', 'error', '❌ Error')
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

  // Download QR Code PNG image
  const downloadQrCode = () => {
    if (!qrCodeUrl) return
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `classtrack-qr-${activeSession?.session_name || 'session'}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    triggerAlert('QR Code downloaded successfully.', 'success', '✅ Downloaded')
  }

  // Regenerate QR Code
  const handleRegenerateQr = async () => {
    if (!activeSession) return
    try {
      const origin = getStudentAccessOrigin()
      const uniqueUrl = `${origin}/join/${activeSession.id}?ref=${Date.now()}`
      const url = await QRCode.toDataURL(uniqueUrl, { margin: 1, width: 300 })
      setQrCodeUrl(url)
      triggerAlert('QR Code refreshed successfully.', 'success', '✅ QR Refreshed')
    } catch (err) {
      console.error(err)
      triggerAlert('Failed to regenerate QR code.', 'error', '❌ Error')
    }
  }

  // Copy registration link to clipboard
  const copySessionLink = () => {
    if (!activeSession) return
    const origin = getStudentAccessOrigin()
    const link = `${origin}/join/${activeSession.id}`
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Copy Network Info URL
  const copyNetworkUrl = () => {
    const origin = getStudentAccessOrigin()
    if (!origin) return
    navigator.clipboard.writeText(origin)
    setCopiedNetworkUrl(true)
    setTimeout(() => setCopiedNetworkUrl(false), 2000)
    triggerAlert('Student Access URL copied to clipboard.', 'success', '✅ Copied')
  }

  // Export Attendance to CSV
  const exportAttendanceCSV = () => {
    const list = aggregatedStudents
    if (list.length === 0) {
      triggerAlert('No attendance records to export.', 'error', '❌ Export Failed')
      return
    }

    // Columns: Name, Roll Number, IP Address, Join Time, Status, Last Seen
    const headers = ['Name', 'Roll Number', 'IP Address', 'Join Time', 'Status', 'Last Seen']
    const rows = list.map((s) => [
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.roll_number}"`,
      `"${s.ip_address || 'N/A'}"`,
      `"${s.joined_at ? new Date(s.joined_at).toLocaleString() : 'N/A'}"`,
      `"${s.status === 'inside' ? 'Inside' : s.status === 'outside' ? 'Outside' : 'Offline'}"`,
      `"${s.last_seen ? new Date(s.last_seen).toLocaleString() : 'N/A'}"`
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `attendance-${activeSession?.session_name || 'session'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    triggerAlert('Attendance logs exported successfully.', 'success', '✅ Exported')
  }

  // Calculate Average Session Duration
  const getAverageSessionDuration = (): string => {
    const list = aggregatedStudents
    if (list.length === 0) return '0m'
    
    let totalMs = 0
    let count = 0

    list.forEach((s) => {
      if (s.joined_at) {
        const start = new Date(s.joined_at).getTime()
        const end = s.last_seen ? new Date(s.last_seen).getTime() : Date.now()
        totalMs += Math.max(0, end - start)
        count++
      }
    })

    if (count === 0) return '0m'
    const avgMinutes = Math.round((totalMs / count) / (1000 * 60))
    return `${avgMinutes}m`
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
        if (lastSeenDiff > 30000) {
          status = 'offline'
        } else {
          status = loc.inside_radius ? 'inside' : 'outside'
        }
      }

      let distance: number | undefined = undefined
      if (activeSession && loc?.latitude !== undefined && loc?.longitude !== undefined) {
        distance = Math.round(
          getDistanceInMeters(
            activeSession.latitude,
            activeSession.longitude,
            loc.latitude,
            loc.longitude
          )
        )
      }

      list.push({
        ...stud,
        latitude: loc?.latitude,
        longitude: loc?.longitude,
        last_seen: loc?.last_seen,
        inside_radius: loc?.inside_radius,
        ip_address: att?.ip_address,
        user_agent: att?.user_agent,
        device_type: att?.device_type,
        browser_info: att?.browser_info,
        joined_at: att?.joined_at,
        distance,
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

  const selectedStudent = selectedStudentId ? aggregatedStudents.find(s => s.id === selectedStudentId) : null

  if (loading) {
    return (
      <div className="flex flex-col h-screen w-full bg-ct-bg text-ct-text font-sans overflow-hidden">
        {/* Skeleton Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-ct-card border-b border-ct-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
            <div className="space-y-1.5">
              <div className="w-28 h-4 rounded skeleton-shimmer" />
              <div className="w-20 h-3 rounded skeleton-shimmer" />
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <div className="w-32 h-8 rounded-xl skeleton-shimmer" />
            <div className="w-20 h-8 rounded-xl skeleton-shimmer" />
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Skeleton Sidebar */}
          <div className="hidden lg:flex w-80 border-r border-ct-border bg-ct-card flex-col">
            <div className="p-4 border-b border-ct-border space-y-3">
              <div className="w-32 h-4 rounded skeleton-shimmer" />
              <div className="w-full h-9 rounded-xl skeleton-shimmer" />
            </div>
            <div className="flex-1 p-4 space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2 p-3 rounded-xl border border-ct-border/30">
                  <div className="w-24 h-3.5 rounded skeleton-shimmer" />
                  <div className="w-16 h-3 rounded skeleton-shimmer" />
                  <div className="w-12 h-3 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
          </div>
          {/* Skeleton Main */}
          <div className="flex-1 p-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-ct-card border border-ct-border rounded-2xl p-4 space-y-2">
                  <div className="w-16 h-3 rounded skeleton-shimmer" />
                  <div className="w-10 h-7 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
            <div className="flex-1 h-80 lg:h-full rounded-2xl skeleton-shimmer border border-ct-border" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full bg-ct-bg text-ct-text font-sans overflow-hidden transition-colors">
      {/* Top Header Panel */}
      <header className="flex items-center justify-between px-6 py-4 bg-ct-card border-b border-ct-border backdrop-blur-md z-10 transition-colors">
        <div className="flex items-center gap-3">
          {/* Mobile Drawer Hamburger Toggle */}
          <button
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="lg:hidden p-2.5 bg-ct-card hover:bg-ct-card-solid text-ct-muted hover:text-ct-text rounded-xl border border-ct-border cursor-pointer flex items-center justify-center h-10 w-10 shadow-sm"
            title="Toggle Student List"
          >
            {isMobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md border border-violet-500/20">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-ct-text tracking-tight flex items-center gap-2">
              ClassTrack <span className="text-xs bg-ct-input border border-ct-border text-ct-muted px-2 py-0.5 rounded-full font-medium">Dashboard</span>
            </h1>
            <p className="text-xs text-ct-muted">Instructor: {teacher?.name}</p>
          </div>
        </div>

        {/* Dashboard Actions (Desktop Only) */}
        {activeSession ? (
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-4 bg-ct-input border border-ct-border px-4 py-2 rounded-xl text-sm mr-2">
              <div className="flex items-center gap-1.5 text-ct-muted">
                <Clock className="w-4 h-4 text-violet-500 animate-pulse" />
                <span>Timer:</span>
                <span className="font-mono text-ct-text font-semibold">{timeLeft}</span>
              </div>
              <div className="w-px h-4 bg-ct-border"></div>
              <div className="text-xs text-ct-muted">
                Classroom: <span className="text-ct-text font-semibold">{activeSession.classroom_name}</span>
              </div>
            </div>

            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-ct-card border border-ct-border hover:bg-ct-card-solid text-ct-text rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
            >
              <QrCode className="w-4 h-4 text-violet-500" />
              QR Link
            </button>

            <button
              onClick={() => setShowRadiusModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-ct-card border border-ct-border hover:bg-ct-card-solid text-ct-text rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
            >
              <Sliders className="w-4 h-4 text-violet-500" />
              Radius ({activeSession.radius}m)
            </button>

            <button
              onClick={() => setShowAnalyticsModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-ct-card border border-ct-border hover:bg-ct-card-solid text-ct-text rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
            >
              <Activity className="w-4 h-4 text-violet-500" />
              Analytics
            </button>

            <button
              onClick={exportAttendanceCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-ct-card border border-ct-border hover:bg-ct-card-solid text-ct-text rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-violet-500" />
              Export CSV
            </button>

            <button
              onClick={handleEndSession}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
            >
              End Session
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-ct-muted text-xs hidden sm:inline-block">No Active Attendance Session</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 hover:bg-ct-card text-ct-muted hover:text-ct-text rounded-xl transition-colors cursor-pointer border border-transparent hover:border-ct-border"
            title={theme === 'dark' ? 'Activate Light Mode' : 'Activate Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Audio Chime Mute button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 hover:bg-ct-card text-ct-muted hover:text-ct-text rounded-xl transition-colors cursor-pointer border border-transparent hover:border-ct-border"
            title={soundEnabled ? 'Mute Alert Chimes' : 'Unmute Alert Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3.5 py-2.5 hover:bg-ct-card text-ct-muted hover:text-ct-text rounded-xl text-xs font-semibold cursor-pointer border border-transparent hover:border-ct-border"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Backdrop for Mobile student drawer */}
        {isMobileDrawerOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
        )}

        {/* Left Panel: Student list monitor */}
        <aside className={`fixed lg:relative top-0 bottom-0 left-0 z-30 w-80 border-r border-ct-border bg-ct-card flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out h-full lg:translate-x-0 ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="p-4 border-b border-ct-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold tracking-wider uppercase text-ct-muted">
                Student Tracking
              </h2>
              <span className="text-[10px] px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded-full font-medium text-violet-650 flex items-center gap-1">
                <Users className="w-2.5 h-2.5" />
                {totalStudents} joined
              </span>
            </div>
            
            {/* Search filter input */}
            <div className="relative">
              <Search className="absolute left-3 inset-y-0 my-auto w-4 h-4 text-ct-muted" />
              <input
                type="text"
                placeholder="Search name, roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-ct-input border border-ct-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-ct-text placeholder-ct-muted/50 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Student items scroll view */}
          <div className="flex-1 overflow-y-auto divide-y divide-ct-border/40">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-ct-muted text-xs leading-relaxed">
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
                    className={`w-full text-left p-4 transition-colors text-xs space-y-1 relative border-l-2 hover:bg-ct-card/40 ${
                      isSelected 
                        ? 'bg-ct-card border-l-violet-500' 
                        : 'border-l-transparent'
                    }`}
                  >
                    <div className="font-semibold text-ct-text truncate text-sm">{stud.name}</div>
                    <div className="font-mono text-[10px] text-ct-muted">{stud.ip_address || 'No IP Address'}</div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                      <span className="text-[10px] text-ct-muted font-medium capitalize">
                        {stud.status === 'inside' ? 'Inside' : stud.status === 'outside' ? 'Outside' : 'Offline'}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Network Information Card */}
          <div className="p-4 border-t border-ct-border bg-ct-card/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ct-muted">
                Network Info
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                networkStatus === 'Ready' 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${networkStatus === 'Ready' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {networkStatus === 'Ready' ? '🟢 Ready' : '🔴 Error'}
              </span>
            </div>

            {networkInfo ? (
              <div className="space-y-2 text-ct-muted text-[10px] leading-relaxed bg-ct-input p-3 rounded-xl border border-ct-border">
                {typeof window !== 'undefined' && 
                 window.location.hostname !== 'localhost' && 
                 window.location.hostname !== '127.0.0.1' && 
                 !/^192\.168\./.test(window.location.hostname) && 
                 !/^10\./.test(window.location.hostname) && 
                 !/^172\./.test(window.location.hostname) ? (
                  <div className="space-y-1.5 font-sans">
                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold mb-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Production Environment</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span>Protocol:</span>
                      <span className="text-ct-text font-bold">HTTPS Enabled</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span>Security:</span>
                      <span className="text-emerald-400 font-bold">Secure Connection Active</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span>Latency (Ping):</span>
                      <span className={`font-mono font-semibold ${
                        latency === null ? 'text-ct-muted' : 
                        latency < 100 ? 'text-emerald-400' :
                        latency < 300 ? 'text-amber-400' :
                        'text-rose-400'
                      }`}>
                        {latency === null ? '--' : `${latency}ms`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span>Host IP:</span>
                      <span className="font-mono text-ct-text font-semibold">{networkInfo.hostIp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Port:</span>
                      <span className="font-mono text-ct-text font-semibold">{networkInfo.port}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Latency (Ping):</span>
                      <span className={`font-mono font-semibold ${
                        latency === null ? 'text-ct-muted' : 
                        latency < 100 ? 'text-emerald-400' :
                        latency < 300 ? 'text-amber-400' :
                        'text-rose-400'
                      }`}>
                        {latency === null ? '--' : `${latency}ms`}
                      </span>
                    </div>
                  </>
                )}
                <div className="border-t border-ct-border/60 my-2 pt-2">
                  <span className="block text-ct-muted text-[9px] uppercase font-bold tracking-wider mb-1">Student Access URL</span>
                  <div className="flex items-center justify-between gap-2 bg-ct-card-solid p-2 rounded-lg border border-ct-border">
                    <span className="font-mono text-ct-text truncate text-[9px] flex-1 select-all">
                      {getStudentAccessOrigin()}
                    </span>
                    <button
                      onClick={copyNetworkUrl}
                      className="p-1 hover:bg-ct-card text-ct-muted hover:text-ct-text rounded-md transition-colors cursor-pointer flex-shrink-0"
                      title="Copy URL"
                    >
                      {copiedNetworkUrl ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 text-center text-ct-muted text-xs bg-ct-input rounded-xl border border-ct-border animate-pulse">
                Detecting local IP address...
              </div>
            )}
          </div>
        </aside>

        {/* Center Panel: Map and controls */}
        <main className="flex-1 relative bg-ct-bg p-4 md:p-6 flex flex-col overflow-y-auto lg:overflow-hidden transition-colors">
          {activeSession ? (
            <div className="flex flex-col flex-1 gap-6 lg:overflow-hidden">
              
              {/* Mobile Control Panel */}
              <div className="flex flex-col gap-3 lg:hidden p-4 bg-ct-card border border-ct-border rounded-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-ct-muted uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
                    Timer Left:
                  </span>
                  <span className="font-mono text-ct-text font-bold">{timeLeft}</span>
                </div>
                <div className="text-[10px] text-ct-muted border-t border-ct-border/60 pt-2 mb-1">
                  Classroom: <span className="text-ct-text font-bold">{activeSession.classroom_name}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-ct-card-solid border border-ct-border hover:bg-ct-card text-ct-text rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-violet-500" />
                    QR Link
                  </button>
                  <button
                    onClick={() => setShowRadiusModal(true)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-ct-card-solid border border-ct-border hover:bg-ct-card text-ct-text rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-violet-500" />
                    Radius ({activeSession.radius}m)
                  </button>
                  <button
                    onClick={() => setShowAnalyticsModal(true)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-ct-card-solid border border-ct-border hover:bg-ct-card text-ct-text rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 text-violet-500" />
                    Analytics
                  </button>
                  <button
                    onClick={exportAttendanceCSV}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-ct-card-solid border border-ct-border hover:bg-ct-card text-ct-text rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-violet-500" />
                    Export CSV
                  </button>
                </div>
                <button
                  onClick={handleEndSession}
                  className="w-full py-3 bg-red-650 hover:bg-red-600 text-white rounded-xl font-bold text-xs cursor-pointer mt-1"
                >
                  End Session
                </button>
              </div>

              {/* Top Summary Widget */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
                <div className="bg-ct-card border border-ct-border rounded-2xl p-4 flex items-center justify-between transition-all hover:shadow-md">
                  <div>
                    <span className="text-xs text-ct-muted">Total Checked In</span>
                    <h3 className="text-2xl font-black mt-1 text-ct-text">{totalStudents}</h3>
                  </div>
                  <Users className="w-7 h-7 text-ct-muted" />
                </div>
                <div className="bg-ct-card border border-ct-border rounded-2xl p-4 flex items-center justify-between transition-all hover:shadow-md">
                  <div>
                    <span className="text-xs text-ct-muted">Inside Boundary</span>
                    <h3 className="text-2xl font-black mt-1 text-emerald-500">{presentCount}</h3>
                  </div>
                  <ShieldCheck className="w-7 h-7 text-emerald-550/30" />
                </div>
                <div className="bg-ct-card border border-ct-border rounded-2xl p-4 flex items-center justify-between transition-all hover:shadow-md">
                  <div>
                    <span className="text-xs text-ct-muted">Outside Boundary</span>
                    <h3 className="text-2xl font-black mt-1 text-rose-500">{outsideCount}</h3>
                  </div>
                  <AlertTriangle className="w-7 h-7 text-rose-550/30" />
                </div>
                <div className="bg-ct-card border border-ct-border rounded-2xl p-4 flex items-center justify-between transition-all hover:shadow-md">
                  <div>
                    <span className="text-xs text-ct-muted">Connection Lost</span>
                    <h3 className="text-2xl font-black mt-1 text-amber-500">{offlineCount}</h3>
                  </div>
                  <WifiOff className="w-7 h-7 text-amber-550/30" />
                </div>
              </div>

              {/* Map Panel (occupies 75% height) */}
              <div className="h-80 lg:h-full lg:flex-1 relative min-h-[320px] lg:min-h-0">
                <LiveMap
                  classroomLat={activeSession.latitude}
                  classroomLng={activeSession.longitude}
                  radius={activeSession.radius}
                  students={aggregatedStudents}
                  theme={theme}
                />
              </div>
            </div>
          ) : (
            // No Session State: Create Classroom Session UI
            <div className="flex flex-col flex-1 items-center justify-center p-6 max-w-xl mx-auto overflow-y-auto w-full">
              <div className="w-full text-center space-y-2 mb-6">
                <div className="w-12 h-12 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center mx-auto text-violet-500">
                  <Play className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-ct-text">Create Attendance Session</h3>
                <p className="text-ct-muted text-xs">Set up your geo-fence and start logging student locations</p>
              </div>

              {/* Create session card */}
              <div className="w-full bg-ct-card border border-ct-border rounded-2xl p-6 sm:p-8 shadow-2xl">
                <form onSubmit={handleCreateSession} className="space-y-5">
                  {formError && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-300 text-sm">
                      <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-ct-muted mb-2">Session Name</label>
                      <input
                        type="text"
                        required
                        placeholder="CS-101 Lecture"
                        value={sessionNameInput}
                        onChange={(e) => setSessionNameInput(e.target.value)}
                        className="block w-full px-3 py-2.5 bg-ct-input border border-ct-border rounded-xl text-ct-text placeholder-ct-muted/40 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-ct-muted mb-2">Classroom Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Hall 3A"
                        value={classroomNameInput}
                        onChange={(e) => setClassroomNameInput(e.target.value)}
                        className="block w-full px-3 py-2.5 bg-ct-input border border-ct-border rounded-xl text-ct-text placeholder-ct-muted/40 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-ct-border/60 pt-4">
                    {/* Radius Slider + Numeric Input */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-ct-muted">Geofence Radius (meters)</label>
                        <span className="text-xs font-bold text-violet-500">{radiusInput}m</span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <input
                          type="range"
                          min="10"
                          max="500"
                          step="5"
                          value={radiusInput}
                          onChange={(e) => setRadiusInput(e.target.value)}
                          className="flex-1 accent-violet-650 cursor-pointer"
                        />
                        <input
                          type="number"
                          min="10"
                          max="500"
                          value={radiusInput}
                          onChange={(e) => {
                            const val = Math.max(10, Math.min(500, parseInt(e.target.value) || 10))
                            setRadiusInput(val.toString())
                          }}
                          className="w-20 px-2 py-1.5 bg-ct-input border border-ct-border rounded-lg text-ct-text focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs font-mono text-center"
                        />
                      </div>
                      <p className="text-[10px] text-ct-muted leading-tight">
                        {parseInt(radiusInput) <= 25 ? '🏫 Classroom scale (Small)' :
                         parseInt(radiusInput) <= 60 ? '🏫 Lecture Hall scale (Medium)' :
                         parseInt(radiusInput) <= 120 ? '🏢 Department Block scale (Large)' :
                         '🏟️ Campus quad / Outdoor arena scale (Extra Large)'}
                      </p>
                    </div>

                    {/* Duration Input + Presets */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-ct-muted">Duration (minutes)</label>
                        <span className="text-xs font-bold text-violet-500">
                          {Math.floor(parseInt(durationInput) / 60) > 0 ? `${Math.floor(parseInt(durationInput) / 60)}h ` : ''}
                          {parseInt(durationInput) % 60}m
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-3 items-center">
                          <input
                            type="range"
                            min="5"
                            max="480"
                            step="5"
                            value={durationInput}
                            onChange={(e) => setDurationInput(e.target.value)}
                            className="flex-1 accent-violet-650 cursor-pointer"
                          />
                          <input
                            type="number"
                            min="5"
                            max="480"
                            value={durationInput}
                            onChange={(e) => {
                              const val = Math.max(5, Math.min(480, parseInt(e.target.value) || 5))
                              setDurationInput(val.toString())
                            }}
                            className="w-20 px-2 py-1.5 bg-ct-input border border-ct-border rounded-lg text-ct-text focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs font-mono text-center"
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {['30', '60', '90', '120'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setDurationInput(preset)}
                              className={`py-1 rounded-md border text-[10px] font-bold transition-all cursor-pointer ${
                                durationInput === preset
                                  ? 'bg-violet-600 border-violet-500 text-white shadow-sm shadow-violet-500/10'
                                  : 'bg-ct-card border-ct-border text-ct-muted hover:text-ct-text'
                              }`}
                            >
                              {preset}m
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-ct-muted leading-tight">
                        Enter from 5 to 480 minutes (8 hours maximum).
                      </p>
                    </div>
                  </div>

                  {/* Classroom Coordinate capture */}
                  <div className="border-t border-ct-border/60 pt-4 space-y-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ct-muted">Classroom Coordinates</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={detectLocation}
                        disabled={detectingCoords}
                        className="flex-1 flex justify-center items-center gap-2 py-3 bg-ct-card hover:bg-ct-card-solid text-ct-text rounded-xl text-xs font-bold transition-all border border-ct-border disabled:opacity-50 cursor-pointer"
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
                        className="flex-1 flex justify-center items-center gap-2 py-3 bg-ct-card hover:bg-ct-card-solid text-ct-text rounded-xl text-xs font-bold transition-all border border-ct-border cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-violet-400" />
                        Set Coordinates Manually
                      </button>
                    </div>

                    {showCoordsForm && classroomLat !== null && classroomLng !== null && (
                      <div className="bg-ct-input/60 p-4 rounded-xl border border-ct-border/60 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-ct-muted">Latitude</span>
                            <input
                              type="number"
                              step="0.000001"
                              value={classroomLat}
                              onChange={(e) => setClassroomLat(parseFloat(e.target.value))}
                              className="w-full bg-ct-input border border-ct-border rounded-lg p-2 mt-1 text-ct-text font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-ct-muted">Longitude</span>
                            <input
                              type="number"
                              step="0.000001"
                              value={classroomLng}
                              onChange={(e) => setClassroomLng(parseFloat(e.target.value))}
                              className="w-full bg-ct-input border border-ct-border rounded-lg p-2 mt-1 text-ct-text font-mono"
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
            <div className="absolute top-0 right-0 h-full w-80 bg-ct-card-solid/95 backdrop-blur-xl border-l border-ct-border shadow-2xl flex flex-col z-[1000] p-6 animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between border-b border-ct-border pb-4">
                <h3 className="font-bold text-ct-text text-sm">Student Details</h3>
                <button
                  onClick={() => setSelectedStudentId(null)}
                  className="p-1 hover:bg-ct-border text-ct-muted hover:text-ct-text rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 space-y-5 text-xs">
                <div className="flex flex-col items-center text-center pb-4 border-b border-ct-border/50">
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg mb-3 ${
                    selectedStudent.status === 'inside'
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-950/10'
                      : selectedStudent.status === 'outside'
                      ? 'border-rose-500 text-rose-400 bg-rose-950/10'
                      : 'border-amber-500 text-amber-400 bg-amber-950/10'
                  }`}>
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="font-bold text-ct-text text-base">{selectedStudent.name}</h4>
                  <span className="text-[10px] text-ct-muted uppercase tracking-wider mt-1">{selectedStudent.department}</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-ct-muted block">Roll / Student Number</span>
                    <span className="text-ct-text font-semibold mt-0.5 block">{selectedStudent.roll_number}</span>
                  </div>
                  <div>
                    <span className="text-ct-muted block">IP Address</span>
                    <span className="text-ct-text font-mono mt-0.5 block">{selectedStudent.ip_address || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-ct-muted block">Status</span>
                    <span className={`font-semibold mt-0.5 block capitalize ${
                      selectedStudent.status === 'inside'
                        ? 'text-emerald-400'
                        : selectedStudent.status === 'outside'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}>
                      {selectedStudent.status === 'inside' ? '🟢 Inside Radius' : selectedStudent.status === 'outside' ? '🔴 Outside Radius' : '🟡 Offline'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ct-muted block">Distance From Classroom</span>
                    <span className="text-ct-text mt-0.5 block font-semibold">
                      {selectedStudent.distance !== undefined ? `${selectedStudent.distance} meters` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ct-muted block">Last Seen Timestamp</span>
                    <span className="text-ct-text mt-0.5 block">
                      {selectedStudent.last_seen 
                        ? new Date(selectedStudent.last_seen).toLocaleString() 
                        : 'Never'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-ct-muted block">Latitude</span>
                      <span className="text-ct-text font-mono mt-0.5 block">{selectedStudent.latitude?.toFixed(6) ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-ct-muted block">Longitude</span>
                      <span className="text-ct-text font-mono mt-0.5 block">{selectedStudent.longitude?.toFixed(6) ?? 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-ct-muted block">Browser</span>
                    <span className="text-ct-text mt-0.5 block">{selectedStudent.browser_info || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-ct-muted block">Device</span>
                    <span className="text-ct-text mt-0.5 block">{selectedStudent.device_type || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-ct-muted block mb-1">User Agent String</span>
                    <div className="bg-ct-bg/60 p-2.5 rounded-lg border border-ct-border text-[9px] text-ct-muted break-all leading-normal max-h-24 overflow-y-auto">
                      {selectedStudent.user_agent || 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toast Notification HUD display list (Bottom Right) */}
          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col gap-2.5 z-[1000] max-w-[calc(100vw-2rem)] sm:max-w-sm">
            {toasts.map((toast) => {
              const toastTheme =
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
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl text-xs toast-enter ${toastTheme}`}
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <div className="font-bold text-white leading-tight">{toast.title}</div>
                    <div className="text-zinc-350 text-[10px] leading-relaxed truncate">{toast.message}</div>
                  </div>
                  <button
                    onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                    className="p-0.5 hover:bg-white/10 rounded transition-colors cursor-pointer flex-shrink-0"
                  >
                    <X className="w-3 h-3 text-white/60 hover:text-white" />
                  </button>
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {/* QR Code generator Modal */}
      {showQrModal && activeSession && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-ct-card-solid border border-ct-border rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-ct-border pb-3">
              <h3 className="font-bold text-ct-text text-sm">QR Code Attendance Link</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 hover:bg-ct-card text-ct-muted hover:text-ct-text rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex flex-col items-center space-y-4">
              {/* QR Image */}
              {qrCodeUrl ? (
                <div className="bg-white p-4 rounded-xl border-4 border-white shadow-inner">
                  <img src={qrCodeUrl} alt="Session QR" className="w-56 h-56" />
                </div>
              ) : (
                <div className="w-56 h-56 bg-ct-input flex items-center justify-center rounded-xl animate-pulse text-ct-muted text-xs">
                  Generating QR code...
                </div>
              )}

              <p className="text-ct-muted text-center text-xs leading-relaxed">
                Students scan this QR code or navigate to the link below to verify geofenced attendance.
              </p>

              {/* Download and Regenerate buttons */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={downloadQrCode}
                  className="flex-1 py-2 px-3 bg-ct-card hover:bg-ct-card-solid border border-ct-border text-ct-text rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Download QR
                </button>
                <button
                  onClick={handleRegenerateQr}
                  className="flex-1 py-2 px-3 bg-ct-input hover:bg-ct-card border border-ct-border text-ct-text rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Regenerate QR
                </button>
              </div>

              {/* Copy URL bar */}
              <div className="w-full flex gap-2 bg-ct-input p-2.5 rounded-xl border border-ct-border">
                <input
                  type="text"
                  readOnly
                  value={`${getStudentAccessOrigin()}/join/${activeSession.id}`}
                  className="flex-1 bg-transparent text-[10px] text-ct-muted focus:outline-none truncate"
                />
                <button
                  onClick={copySessionLink}
                  className="p-1.5 hover:bg-ct-card text-ct-muted hover:text-ct-text rounded-lg transition-colors cursor-pointer flex-shrink-0"
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
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-xs bg-ct-card-solid border border-ct-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-ct-border pb-3">
              <h3 className="font-bold text-ct-text text-sm">Radius Settings</h3>
              <button
                onClick={() => setShowRadiusModal(false)}
                className="p-1 hover:bg-ct-card text-ct-muted hover:text-ct-text rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-ct-muted mb-2 font-medium">Classroom Radius (meters)</label>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3 items-center">
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="5"
                      value={newRadiusInput}
                      onChange={(e) => setNewRadiusInput(e.target.value)}
                      className="flex-1 accent-violet-650 cursor-pointer"
                    />
                    <input
                      type="number"
                      min="10"
                      max="500"
                      value={newRadiusInput}
                      onChange={(e) => {
                        const val = Math.max(10, Math.min(500, parseInt(e.target.value) || 10))
                        setNewRadiusInput(val.toString())
                      }}
                      className="w-20 px-2 py-1.5 bg-ct-input border border-ct-border rounded-lg text-ct-text focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs font-mono text-center"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const current = parseInt(newRadiusInput) || 50
                        setNewRadiusInput(Math.max(10, current - 10).toString())
                      }}
                      className="flex-1 py-1.5 bg-ct-card hover:bg-ct-card-solid text-ct-text rounded-xl border border-ct-border font-bold text-xs cursor-pointer"
                    >
                      -10m
                    </button>
                    <button
                      onClick={() => {
                        const current = parseInt(newRadiusInput) || 50
                        setNewRadiusInput(Math.min(500, current + 10).toString())
                      }}
                      className="flex-1 py-1.5 bg-ct-card hover:bg-ct-card-solid text-ct-text rounded-xl border border-ct-border font-bold text-xs cursor-pointer"
                    >
                      +10m
                    </button>
                  </div>
                </div>
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

      {/* Session Analytics Modal */}
      {showAnalyticsModal && activeSession && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-ct-card-solid border border-ct-border rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-ct-border pb-3">
              <h3 className="font-bold text-ct-text text-sm">Session Analytics</h3>
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="p-1 hover:bg-ct-card text-ct-muted hover:text-ct-text rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-ct-input border border-ct-border rounded-xl p-3.5 space-y-1">
                <span className="text-ct-muted block">Total Joined</span>
                <span className="text-lg font-black text-ct-text">{totalStudents}</span>
              </div>
              <div className="bg-ct-input border border-ct-border rounded-xl p-3.5 space-y-1">
                <span className="text-emerald-500 block">Current Present</span>
                <span className="text-lg font-black text-emerald-500">{presentCount}</span>
              </div>
              <div className="bg-ct-input border border-ct-border rounded-xl p-3.5 space-y-1">
                <span className="text-rose-500 block">Students Outside</span>
                <span className="text-lg font-black text-rose-500">{outsideCount}</span>
              </div>
              <div className="bg-ct-input border border-ct-border rounded-xl p-3.5 space-y-1">
                <span className="text-amber-500 block">Students Offline</span>
                <span className="text-lg font-black text-amber-500">{offlineCount}</span>
              </div>
              <div className="col-span-2 bg-ct-input border border-ct-border rounded-xl p-3.5 flex justify-between items-center">
                <span className="text-ct-muted font-medium">Avg Session Duration</span>
                <span className="text-sm font-bold text-violet-500 font-mono">{getAverageSessionDuration()}</span>
              </div>
            </div>

            <button
              onClick={() => setShowAnalyticsModal(false)}
              className="w-full py-3 bg-ct-card border border-ct-border hover:bg-ct-card text-ct-text rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              Close Analytics
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
