'use client'

import { useState, useEffect, useRef, use, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Compass, ShieldAlert, ShieldCheck, MapPin, Radio, Bell, AlertTriangle } from 'lucide-react'
import { io } from 'socket.io-client'

interface Student {
  id: string
  name: string
  rollNumber: string
  department: string
}

function StudentTrackContent({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tracking states
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [trackingStatus, setTrackingStatus] = useState<'prompting' | 'tracking' | 'error'>('prompting')
  const [insideRadius, setInsideRadius] = useState<boolean | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [radius, setRadius] = useState<number | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Notification states
  const [notificationPermission, setNotificationPermission] = useState<string>('default')
  
  // Watcher ref
  const watchIdRef = useRef<number | null>(null)
  const alertIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const socketRef = useRef<any>(null)

  // Socket.io room connection setup
  useEffect(() => {
    socketRef.current = io()
    socketRef.current.emit('join-room', sessionId)
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [sessionId])

  // Emit student identity when loaded
  useEffect(() => {
    if (student && socketRef.current) {
      socketRef.current.emit('student-joined', {
        roomId: sessionId,
        student: {
          id: student.id,
          name: student.name,
          roll_number: student.rollNumber,
          department: student.department
        },
        attendance: {
          studentId: student.id,
          status: 'Active',
          joinedAt: new Date().toISOString()
        }
      })
    }
  }, [student, sessionId])

  // 1. Fetch student info from search param or localStorage
  useEffect(() => {
    const studentIdParam = searchParams.get('studentId')
    let foundStudent: Student | null = null

    if (studentIdParam) {
      // Try local storage first
      const stored = localStorage.getItem(`classtrack_student_${sessionId}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        foundStudent = {
          id: parsed.id,
          name: parsed.name,
          rollNumber: parsed.rollNumber || parsed.roll_number || 'N/A',
          department: parsed.department
        }
      }
    }

    if (foundStudent && foundStudent.id === studentIdParam) {
      // Validated
    } else if (foundStudent) {
      // Validated from localstorage fallback
    } else if (studentIdParam) {
      foundStudent = {
        id: studentIdParam,
        name: 'Student',
        rollNumber: 'N/A',
        department: 'N/A'
      }
    }

    if (!foundStudent) {
      setError('Student identity not found. Please scan the QR code to sign in again.')
      setLoading(false)
    } else {
      setStudent(foundStudent)
      setLoading(false)
    }

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [sessionId, searchParams])

  // Request browser notification permissions
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
  }

  // 2. Start geolocation tracking
  useEffect(() => {
    if (!student || !sessionId) return

    if (!('geolocation' in navigator)) {
      setTrackingStatus('error')
      setError('Your browser does not support Geolocation tracking.')
      return
    }

    const handleSuccess = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords
      setCoords({ lat: latitude, lng: longitude })
      setTrackingStatus('tracking')

      try {
        const res = await fetch('/api/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student.id,
            sessionId: sessionId,
            latitude,
            longitude
          })
        })

        const data = await res.json()
        if (res.ok) {
          setInsideRadius(data.insideRadius)
          setDistance(data.distance)
          setRadius(data.radius)
          setLastUpdated(new Date())

          // Emit location update over Socket.io
          if (socketRef.current) {
            socketRef.current.emit('location-update', {
              roomId: sessionId,
              location: {
                student_id: student.id,
                latitude,
                longitude,
                inside_radius: data.insideRadius,
                last_seen: new Date().toISOString()
              }
            })
          }
        } else if (data.sessionEnded) {
          setError('This classroom session has ended.')
          setTrackingStatus('error')
          stopTracking()
        }
      } catch (err) {
        console.error('Failed to post location update:', err)
      }
    }

    const handleError = (error: GeolocationPositionError) => {
      setTrackingStatus('error')
      switch (error.code) {
        case error.PERMISSION_DENIED:
          setError('Location access denied. You must enable Location Permissions in your browser settings to log attendance.')
          break
        case error.POSITION_UNAVAILABLE:
          setError('Location information is unavailable.')
          break
        case error.TIMEOUT:
          setError('The request to get user location timed out.')
          break
        default:
          setError('An unknown error occurred while getting location.')
          break
      }
    }

    // High accuracy option is crucial for classroom radius (meter level precision)
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }

    setTrackingStatus('prompting')
    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options)

    // Fallback heartbeat interval in case watchPosition suspends
    const heartbeat = setInterval(() => {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options)
    }, 8000)

    function stopTracking() {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      clearInterval(heartbeat)
    }

    return () => {
      stopTracking()
    }
  }, [student, sessionId])

  // 3. Coordinate tab alerts and push notifications on geofence violation
  useEffect(() => {
    // If student goes outside radius
    if (insideRadius === false) {
      // Blinking tab title
      let toggle = false
      alertIntervalRef.current = setInterval(() => {
        document.title = toggle ? '⚠️ OUTSIDE BOUNDARY!' : 'ClassTrack Status'
        toggle = !toggle
      }, 1000)

      // Send browser push notification if permission is granted
      if (notificationPermission === 'granted') {
        new Notification('ClassTrack Alert', {
          body: 'You are outside the classroom boundary. Please return.',
          icon: '/favicon.ico',
          tag: 'classtrack-geofence',
          requireInteraction: true
        })
      }
    } else {
      // Clear blinking tab title
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current)
        alertIntervalRef.current = null
      }
      document.title = 'ClassTrack Checked-In'
    }

    return () => {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current)
      }
      document.title = 'ClassTrack'
    }
  }, [insideRadius, notificationPermission])

  // Attempt to mark student offline when closing tab
  useEffect(() => {
    if (!student || !sessionId) return

    const handleVisibilityChange = () => {
      // If student minimizes or leaves, keep background tracking going.
      // But we can't reliably call async API inside unload/beforeunload on mobile,
      // which is why the admin dashboard relies on our 15s last_seen timestamp logic!
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [student, sessionId])

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 font-sans">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Identifying attendance profile...</p>
      </div>
    )
  }

  if (error && trackingStatus === 'error') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 font-sans p-4">
        <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-8 text-center space-y-6 backdrop-blur-xl">
          <div className="w-16 h-16 bg-red-950/30 border border-red-900/40 rounded-2xl flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Tracking Stopped</h3>
            <p className="text-zinc-400 text-sm">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all text-sm cursor-pointer"
          >
            Retry Location Access
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 font-sans overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Background radial highlights */}
      {insideRadius === false ? (
        <div className="absolute inset-0 bg-red-950/10 transition-colors duration-500 animate-pulse pointer-events-none" />
      ) : (
        <div className="absolute inset-0 bg-emerald-950/5 transition-colors duration-500 pointer-events-none" />
      )}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 text-xs font-medium mb-4">
            <Radio className={`w-3.5 h-3.5 ${insideRadius !== null ? 'text-violet-400 animate-ping' : ''}`} />
            Live Attendance Session Active
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            ClassTrack Tracker
          </h2>
          <p className="mt-1.5 text-zinc-400 text-sm">
            Keep this tab open on your device to maintain your attendance
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl p-8 space-y-6">
          
          {/* Geofence Status Indicator */}
          {insideRadius === null ? (
            <div className="flex flex-col items-center py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500 animate-pulse">
                <Compass className="w-8 h-8 rotate-45" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Acquiring Location</h3>
                <p className="text-zinc-500 text-xs mt-1">Please allow browser location permissions if prompted.</p>
              </div>
            </div>
          ) : insideRadius ? (
            <div className="flex flex-col items-center py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-950/30 border border-emerald-900/50 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-emerald-400">Inside Classroom</h3>
                <p className="text-zinc-400 text-sm">Attendance status: <span className="text-emerald-400 font-semibold">Verified Active</span></p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-900/50 flex items-center justify-center text-red-400 animate-bounce">
                <AlertTriangle className="w-9 h-9" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-red-500">Outside Classroom</h3>
                <p className="text-zinc-300 text-sm font-medium">
                  You are outside the classroom boundary. Please return.
                </p>
              </div>
            </div>
          )}

          {/* Student Profile & Stats */}
          <div className="border-t border-zinc-800/80 pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-3">
                <span className="text-xs text-zinc-500 block">Student Name</span>
                <span className="text-white font-medium block truncate mt-0.5">{student?.name}</span>
              </div>
              <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-3">
                <span className="text-xs text-zinc-500 block">Roll / Student ID</span>
                <span className="text-white font-medium block truncate mt-0.5">{student?.rollNumber}</span>
              </div>
            </div>

            {insideRadius !== null && (
              <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>Classroom Radius</span>
                  <span className="text-white font-semibold">{radius} meters</span>
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>Current Distance</span>
                  <span className={`font-semibold ${insideRadius ? 'text-emerald-400' : 'text-red-400'}`}>
                    {distance === null ? '--' : `${distance} meters`}
                  </span>
                </div>
                {coords && (
                  <div className="flex justify-between items-center text-xs text-zinc-500 border-t border-zinc-800/50 pt-2.5">
                    <span>Coordinates</span>
                    <span className="font-mono text-[10px]">
                      {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                    </span>
                  </div>
                )}
                {lastUpdated && (
                  <div className="text-[10px] text-center text-zinc-600 mt-1">
                    Last check-in heartbeat: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Browser Notification Request bar */}
          {'Notification' in window && notificationPermission !== 'granted' && (
            <button
              onClick={requestNotificationPermission}
              className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white transition-colors text-xs font-semibold cursor-pointer"
            >
              <Bell className="w-4 h-4 text-violet-400" />
              Enable Push Notifications for Boundary Alerts
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudentTrack({ params }: { params: Promise<{ sessionId: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 font-sans">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Initializing Geofence Tracker...</p>
      </div>
    }>
      <StudentTrackContent params={params} />
    </Suspense>
  )
}
