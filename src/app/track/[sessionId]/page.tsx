'use client'

import { useState, useEffect, useRef, use, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Compass, ShieldAlert, ShieldCheck, MapPin, Radio, Bell, AlertTriangle, Sun, Moon } from 'lucide-react'
import { io } from 'socket.io-client'
import { KalmanFilter, getDistanceInMeters } from '@/lib/geoutils'

interface Student {
  id: string
  name: string
  rollNumber: string
  department: string
}

// Geolocation standard configurations to maximize accuracy and speed up on mobile devices
const geoOptions = {
  enableHighAccuracy: true,
  timeout: 10000, // 10 seconds timeout for high-accuracy mode
  maximumAge: 0 // Do not use cached locations, force real-time readings
}

function StudentTrackContent({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Onboarding support
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false)

  // Theme support
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const savedOnboarding = localStorage.getItem('classtrack_onboarded_v2')
    if (savedOnboarding === 'true') {
      setHasOnboarded(true)
    }

    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    } else {
      localStorage.setItem('theme', 'dark')
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    if (nextTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }

  // Tracking states
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [trackingStatus, setTrackingStatus] = useState<'prompting' | 'tracking' | 'error'>('prompting')
  const [insideRadius, setInsideRadius] = useState<boolean | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [radius, setRadius] = useState<number | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const [latency, setLatency] = useState<number | null>(null)

  // Location history ref for smoothing
  const locationHistoryRef = useRef<{ lat: number; lng: number }[]>([])
  const [accuracyIgnored, setAccuracyIgnored] = useState<boolean>(false)
  const [lastIgnoredAccuracy, setLastIgnoredAccuracy] = useState<number | null>(null)
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null)

  // Diagnostics states
  const [isInsecureContext, setIsInsecureContext] = useState(false)
  const [permissionState, setPermissionState] = useState<string>('checking')
  const [gpsError, setGpsError] = useState<{ code: number; message: string; codeString: string } | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [deviceDetails, setDeviceDetails] = useState<string>('Detecting...')
  const [currentUrl, setCurrentUrl] = useState<string>('Detecting...')

  // Advanced tracking and geofencing states
  const kalmanLatRef = useRef<KalmanFilter | null>(null)
  const kalmanLngRef = useRef<KalmanFilter | null>(null)
  const lastSyncTimeRef = useRef<number>(0)
  const lastSyncLocRef = useRef<{lat: number, lng: number} | null>(null)
  const consecutiveStatesRef = useRef<{ status: 'Inside' | 'Warning' | 'Outside' | null, count: number }>({ status: null, count: 0 })
  const [currentValidatedStatus, setCurrentValidatedStatus] = useState<'Inside' | 'Warning' | 'Outside' | null>(null)

  // Developer Mode
  const [devModeClicks, setDevModeClicks] = useState(0)
  const [isDevMode, setIsDevMode] = useState(false)

  const handleLogoClick = () => {
    setDevModeClicks(prev => {
      const newCount = prev + 1
      if (newCount >= 5) {
        setIsDevMode(true)
        triggerInAppNotification('Developer Mode Activated', 'success')
        return 0
      }
      return newCount
    })
  }

  // Triggers and refs for clean watch recovery
  const [watchTrigger, setWatchTrigger] = useState(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  const handleRetry = useCallback(() => {
    console.log('[Geolocation manual retry] Resetting watchTrigger and clearing errors...')
    setError(null)
    setGpsError(null)
    setRetryCount(0)
    setTrackingStatus('prompting')
    setPermissionState('checking')
    setWatchTrigger((prev) => prev + 1)
  }, [])

  // Create refs to prevent hook dependencies from triggering watchPosition teardown/recreation loops
  const studentRef = useRef(student)
  const sessionIdRef = useRef(sessionId)
  const trackingStatusRef = useRef(trackingStatus)
  const permissionStateRef = useRef(permissionState)

  useEffect(() => { studentRef.current = student }, [student])
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
  useEffect(() => { trackingStatusRef.current = trackingStatus }, [trackingStatus])
  useEffect(() => { permissionStateRef.current = permissionState }, [permissionState])

  // Unified logging/instrumentation helper
  const logGeolocationStatus = useCallback(async (action: string, details: string) => {
    let perm = 'unknown'
    if (typeof window !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' as any })
        perm = status.state
      } catch (e) {}
    } else {
      perm = 'unsupported (Safari/iOS)'
    }
    console.log(`[Geolocation Instrumentation] Action: ${action} | Permission State: ${perm} | Secure Context: ${typeof window !== 'undefined' ? window.isSecureContext : 'N/A'} | Origin URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'} | Details: ${details}`)
  }, [])

  // Detect device context, permission status, and URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsInsecureContext(!window.isSecureContext)
    setCurrentUrl(window.location.href)

    // Parse friendly browser and device information
    const ua = navigator.userAgent
    let browser = 'Unknown Browser'
    let device = 'Desktop'

    if (/chrome|cros/i.test(ua)) {
      browser = 'Chrome'
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
      browser = 'Safari'
    } else if (/firefox/i.test(ua)) {
      browser = 'Firefox'
    }

    if (/mobi|android|iphone|ipad|ipod/i.test(ua)) {
      device = /ipad|tablet/i.test(ua) ? 'Tablet' : 'Mobile'
      if (/iphone/i.test(ua)) {
        device = 'iPhone'
      }
    }
    
    setDeviceDetails(`${browser} (${device})`)

    const updatePermission = () => {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          navigator.permissions.query({ name: 'geolocation' as any }).then((status) => {
            console.log('[Geolocation Permissions API] Status:', status.state)
            setPermissionState(status.state)
            status.onchange = () => {
              console.log('[Geolocation Permissions API Status Changed]:', status.state)
              setPermissionState(status.state)
            }
          }).catch((e) => {
            console.log('[Geolocation Permissions Query Failed]', e)
            setPermissionState('unknown')
          })
        } catch (e) {
          setPermissionState('unknown')
        }
      } else {
        setPermissionState('unsupported')
      }
    }

    updatePermission()
  }, [])

  // Listen for window focus to automatically recheck permissions and retry tracking
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleFocus = () => {
      console.log('[Window Focus] Automatically rechecking permissions and retrying tracking if needed...')
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' as any }).then((status) => {
          setPermissionState(status.state)
          if (status.state === 'granted' && trackingStatusRef.current === 'error') {
            console.log('[Window Focus] Geolocation permission granted, auto-retrying...')
            handleRetry()
          }
        }).catch(() => {})
      }
      
      if (trackingStatusRef.current === 'error') {
        console.log('[Window Focus] Tracking is in error state, auto-triggering retry...')
        handleRetry()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [handleRetry])

  // Notification states
  const [notificationPermission, setNotificationPermission] = useState<string>('default')
  const [inAppNotification, setInAppNotification] = useState<{ message: string; type: 'success' | 'warning' } | null>(null)
  
  // Watcher/Alert refs
  const alertIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const socketRef = useRef<any>(null)
  const prevInsideRef = useRef<boolean | null>(null)

  const triggerInAppNotification = (message: string, type: 'success' | 'warning') => {
    setInAppNotification({ message, type })
    setTimeout(() => {
      setInAppNotification(null)
    }, 6000)
  }

  // Callback to process successful geolocation updates
  const handleSuccess = useCallback(async (position: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = position.coords
    const currentStudent = studentRef.current
    const currentSessionId = sessionIdRef.current

    // Print exact requested GPS SUCCESS format
    console.log(`GPS SUCCESS\nlat: ${latitude}\nlng: ${longitude}`)
    logGeolocationStatus('SUCCESS_CALLBACK', `Lat: ${latitude}, Lng: ${longitude}, Acc: ${accuracy}m`)

    // Filter out low accuracy cell-tower or WiFi fallback updates (> 50m accuracy)
    if (accuracy > 50) {
      console.warn(`[GPS Jitter Filtered] Discarding reading with poor accuracy: ${accuracy}m (> 50m)`)
      setLastIgnoredAccuracy(accuracy)
      setAccuracyIgnored(true)
      return
    }
    setAccuracyIgnored(false)
    setGpsAccuracy(accuracy)

    setTrackingStatus('tracking')
    setGpsError(null) // Reset errors on successful location acquisition
    setError(null) // Clear any previous error states
    setPermissionState('granted') // Geolocation succeeded, so permission must be granted

    // Initialize Kalman filters if not present
    if (!kalmanLatRef.current) kalmanLatRef.current = new KalmanFilter(0.01, 0.001)
    if (!kalmanLngRef.current) kalmanLngRef.current = new KalmanFilter(0.01, 0.001)

    // Apply Kalman filter
    const kLat = kalmanLatRef.current.filter(latitude)
    const kLng = kalmanLngRef.current.filter(longitude)

    // Add kalman-filtered position to sliding history
    const history = [...locationHistoryRef.current, { lat: kLat, lng: kLng }]
    if (history.length > 5) {
      history.shift()
    }
    locationHistoryRef.current = history

    // Calculate moving average
    const avgLat = history.reduce((sum, c) => sum + c.lat, 0) / history.length
    const avgLng = history.reduce((sum, c) => sum + c.lng, 0) / history.length

    console.log(`GPS SMOOTHED & FILTERED\nlat: ${avgLat}\nlng: ${avgLng}`)

    setCoords({ lat: avgLat, lng: avgLng })

    if (!currentStudent) {
      console.warn('[Geolocation Success Callback] Student identity not loaded yet. Ignoring POST heartbeat.')
      return
    }

    const now = Date.now()
    const timeSinceSync = now - lastSyncTimeRef.current
    
    // Adaptive Throttling Heartbeat
    let shouldSync = false
    let distMoved = 0
    if (!lastSyncLocRef.current) {
      shouldSync = true
    } else {
      distMoved = getDistanceInMeters(
        lastSyncLocRef.current.lat, 
        lastSyncLocRef.current.lng, 
        avgLat, 
        avgLng
      )
      if (distMoved < 2) {
        // Stationary: sync every 10s
        if (timeSinceSync >= 10000) shouldSync = true
      } else {
        // Moving: sync every 4s
        if (timeSinceSync >= 4000) shouldSync = true
      }
    }

    if (!shouldSync) {
      // Return early, map already updated via setCoords
      return
    }

    lastSyncTimeRef.current = now
    lastSyncLocRef.current = { lat: avgLat, lng: avgLng }

    try {
      console.log(`[Geolocation API Request] Sending location to /api/location for student: ${currentStudent.id}, session: ${currentSessionId}`)
      const res = await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentStudent.id,
          sessionId: currentSessionId,
          latitude: avgLat,
          longitude: avgLng,
          status: currentValidatedStatus || undefined
        })
      })

      const data = await res.json()
      console.log('[Geolocation API Response] Status:', res.status, 'Data:', data)
      if (res.ok) {
        const dist = data.distance
        const rad = data.radius

        // Calculate 3-tick validation
        let computedState: 'Inside' | 'Warning' | 'Outside' = 'Inside'
        if (dist <= rad) computedState = 'Inside'
        else if (dist <= rad + 10) computedState = 'Warning'
        else computedState = 'Outside'

        if (consecutiveStatesRef.current.status === computedState) {
          consecutiveStatesRef.current.count++
        } else {
          consecutiveStatesRef.current.status = computedState
          consecutiveStatesRef.current.count = 1
        }

        let validatedStatusToEmit = currentValidatedStatus || computedState
        if (consecutiveStatesRef.current.count >= 3) {
          if (currentValidatedStatus !== computedState) {
            console.log(`[Geofence] 3 consecutive ticks matched for ${computedState}. Updating validated status.`)
            setCurrentValidatedStatus(computedState)
            validatedStatusToEmit = computedState
            
            // Re-sync immediately to backend with the new validated state
            fetch('/api/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: currentStudent.id,
                sessionId: currentSessionId,
                latitude: avgLat,
                longitude: avgLng,
                status: computedState
              })
            }).catch(e => console.error(e))
          }
        }

        setInsideRadius(validatedStatusToEmit === 'Inside' || validatedStatusToEmit === 'Warning')
        setDistance(dist)
        setRadius(rad)
        setLastUpdated(new Date())

        // Emit location update over Socket.io
        if (socketRef.current) {
          socketRef.current.emit('location-update', {
            roomId: currentSessionId,
            location: {
              student_id: currentStudent.id,
              latitude: avgLat,
              longitude: avgLng,
              inside_radius: validatedStatusToEmit === 'Inside' || validatedStatusToEmit === 'Warning',
              status: validatedStatusToEmit,
              last_seen: new Date().toISOString()
            }
          })
        }
      } else if (data.sessionEnded) {
        setError('This classroom session has ended.')
        setTrackingStatus('error')
      }
    } catch (err) {
      console.error('[Geolocation Success Callback] Failed to post location update to backend:', err)
    }
  }, [logGeolocationStatus])

  // Callback to handle geolocation tracking failures with automatic retry loops
  const handleError = useCallback((error: GeolocationPositionError) => {
    const codeString = 
      error.code === error.PERMISSION_DENIED ? 'PERMISSION_DENIED' :
      error.code === error.POSITION_UNAVAILABLE ? 'POSITION_UNAVAILABLE' :
      error.code === error.TIMEOUT ? 'TIMEOUT' : 'UNKNOWN_ERROR';

    // Print exact requested GPS ERROR format
    console.error(`GPS ERROR\ncode: ${error.code}\nmessage: ${error.message}`)
    logGeolocationStatus('ERROR_CALLBACK', `Code: ${error.code} (${codeString}), Message: ${error.message}`)
    setGpsError({ code: error.code, message: error.message, codeString })

    let userFriendlyMessage = ''
    if (error.code === error.PERMISSION_DENIED) {
      setPermissionState('denied')
      setTrackingStatus('error')
      userFriendlyMessage = 'Location Permission Denied: ClassTrack was blocked from accessing your GPS. To proceed, please open your browser/device settings, allow location permissions for this website, and click Retry.'
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      userFriendlyMessage = 'GPS Position Unavailable: Your device could not determine its location. Please verify that Location Services/GPS are enabled in your device system settings.'
    } else if (error.code === error.TIMEOUT) {
      userFriendlyMessage = 'GPS Request Timed Out: Acquiring satellite lock took too long. Try moving closer to a window or step outside for better signal, then click Retry.'
    } else {
      userFriendlyMessage = `GPS Tracking Error: ${error.message} (Code: ${error.code})`
    }

    if (error.code === error.PERMISSION_DENIED) {
      setError(userFriendlyMessage)
    } else {
      // Handle POSITION_UNAVAILABLE or TIMEOUT: Increment retry counter and schedule retry
      setRetryCount((prev) => {
        const nextRetry = prev + 1
        if (nextRetry >= 5) {
          setTrackingStatus('error')
          setError(userFriendlyMessage)
        }
        return nextRetry
      })
      
      let errorHint = 'Retrying geolocation in 3 seconds...'
      if (error.code === error.POSITION_UNAVAILABLE) {
        errorHint = 'GPS position unavailable. Please ensure GPS is enabled. Retrying...'
      } else if (error.code === error.TIMEOUT) {
        errorHint = 'GPS request timed out. Retrying to establish lock...'
      }
      
      console.log(`[Geolocation Callback Error Handled] ${errorHint}`)
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }

      // Auto-retry after 3 seconds by restarting watchPosition
      retryTimeoutRef.current = setTimeout(() => {
        if (trackingStatusRef.current !== 'error') {
          logGeolocationStatus('AUTO_RETRY_WATCH_RESTART', 'Restarting watchPosition for retry...')
          setWatchTrigger((prev) => prev + 1)
        }
      }, 3000)
    }
  }, [logGeolocationStatus])

  // 1. Socket.IO connection and reconnect handling
  useEffect(() => {
    if (!student || !sessionId) return
    if (!hasOnboarded) return // Gate socket connection and triggers until onboarded

    // Socket.io initialization with auto-reconnection parameters
    socketRef.current = io({
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    })

    const socket = socketRef.current

    const triggerLocationCheck = async () => {
      if (!navigator.geolocation) return
      logGeolocationStatus('SOCKET_TRIGGER_INIT', 'Starting getCurrentPosition...')
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          logGeolocationStatus('SOCKET_TRIGGER_SUCCESS', `Coords: ${position.coords.latitude}, ${position.coords.longitude}`)
          handleSuccess(position)
        },
        (err) => {
          const codeString = 
            err.code === err.PERMISSION_DENIED ? 'PERMISSION_DENIED' :
            err.code === err.POSITION_UNAVAILABLE ? 'POSITION_UNAVAILABLE' :
            err.code === err.TIMEOUT ? 'TIMEOUT' : 'UNKNOWN_ERROR';
          logGeolocationStatus('SOCKET_TRIGGER_ERROR', `Code: ${err.code} (${codeString}), Message: ${err.message}`)
          handleError(err)
        },
        geoOptions
      )
    }

    socket.on('disconnect', () => {
      setSocketConnected(false)
      console.log('[Socket] Disconnected from server')
    })

    // Latency Ping System
    let pingInterval: NodeJS.Timeout
    socket.on('client-pong', (start: number) => {
      setLatency(Date.now() - start)
    })

    socket.on('connect', () => {
      setSocketConnected(true)
      console.log('[Socket] Connected, joining room:', sessionId)
      socket.emit('join-room', sessionId)

      // Only re-emit student joined if we have the student object
      if (studentRef.current) {
        socket.emit('student-joined', {
          roomId: sessionId,
          student: {
            id: studentRef.current.id,
            name: studentRef.current.name,
            roll_number: studentRef.current.rollNumber,
            department: studentRef.current.department
          },
          attendance: {
            studentId: studentRef.current.id,
            status: currentValidatedStatus || 'Active',
            joinedAt: new Date().toISOString()
          }
        })
      }
      
      // Force an immediate location sync when reconnecting to restore state
      triggerLocationCheck()

      // Start pinging
      pingInterval = setInterval(() => {
        socket.emit('client-ping', Date.now())
      }, 5000)
    })

    // Listen for live radius adjustments from teacher
    socket.on('radius-update', ({ radius }: { radius: number }) => {
      setRadius(radius)
      // Force trigger location update immediately on radius change
      triggerLocationCheck()
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('radius-update')
      socket.off('client-pong')
      if (pingInterval) clearInterval(pingInterval)
      socket.disconnect()
    }
  }, [sessionId, handleSuccess, handleError, logGeolocationStatus, hasOnboarded])

  // 2. Fetch student info from search param or localStorage
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

  // 3. Start geolocation tracking using watchPosition
  useEffect(() => {
    if (!student || !sessionId) return
    if (!hasOnboarded) return // Gate GPS prompt until onboarded

    if (!('geolocation' in navigator)) {
      setTrackingStatus('error')
      setError('Your browser does not support Geolocation tracking.')
      return
    }

    console.log(`[Geolocation] Initializing watchPosition listener (trigger: ${watchTrigger})...`)
    logGeolocationStatus('WATCH_INIT', `Calling watchPosition (trigger: ${watchTrigger})...`)
    setTrackingStatus('prompting')
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        logGeolocationStatus('WATCH_CALLBACK_SUCCESS', `Coords: ${position.coords.latitude}, ${position.coords.longitude}`)
        handleSuccess(position)
      },
      (err) => {
        const codeString = 
          err.code === err.PERMISSION_DENIED ? 'PERMISSION_DENIED' :
          err.code === err.POSITION_UNAVAILABLE ? 'POSITION_UNAVAILABLE' :
          err.code === err.TIMEOUT ? 'TIMEOUT' : 'UNKNOWN_ERROR';
        logGeolocationStatus('WATCH_CALLBACK_ERROR', `Code: ${err.code} (${codeString}), Message: ${err.message}`)
        handleError(err)
      },
      geoOptions
    )

    console.log('[Geolocation] watchPosition active with watchId =', watchId)

    return () => {
      console.log('[Geolocation] Cleaning up watchPosition. ID:', watchId)
      navigator.geolocation.clearWatch(watchId)
    }
  }, [student, sessionId, handleSuccess, handleError, logGeolocationStatus, watchTrigger, hasOnboarded])


  // 4. Coordinate tab alerts, browser push, and in-app notifications on geofence transitions
  useEffect(() => {
    if (insideRadius === null) return

    // 1. Blinking tab title when outside
    if (insideRadius === false) {
      let toggle = false
      alertIntervalRef.current = setInterval(() => {
        document.title = toggle ? '⚠️ OUTSIDE BOUNDARY!' : 'ClassTrack Status'
        toggle = !toggle
      }, 1000)
    } else {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current)
        alertIntervalRef.current = null
      }
      document.title = 'ClassTrack Checked-In'
    }

    // 2. State transition notifications (in-app + push)
    if (prevInsideRef.current !== null && prevInsideRef.current !== insideRadius) {
      if (!insideRadius) {
        triggerInAppNotification('You are outside the classroom boundary. Please return.', 'warning')
        if (notificationPermission === 'granted') {
          try {
            new Notification('ClassTrack Alert', {
              body: 'You are outside the classroom boundary. Please return.',
              icon: '/favicon.ico',
              tag: 'classtrack-geofence',
              requireInteraction: true
            })
          } catch (e) {
            console.error('Failed to send push notification:', e)
          }
        }
      } else {
        triggerInAppNotification('You are back inside the classroom boundary.', 'success')
        if (notificationPermission === 'granted') {
          try {
            new Notification('ClassTrack Alert', {
              body: 'You are back inside the classroom boundary.',
              icon: '/favicon.ico',
              tag: 'classtrack-geofence'
            })
          } catch (e) {
            console.error('Failed to send push notification:', e)
          }
        }
      }
    }

    prevInsideRef.current = insideRadius

    return () => {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current)
      }
      document.title = 'ClassTrack'
    }
  }, [insideRadius, notificationPermission])

  // Handle background tab recovery and network reconnection
  useEffect(() => {
    if (!student || !sessionId) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Visibility] Tab became visible — triggering location refresh and socket re-join')
        // Re-emit join event to ensure server knows we're back
        if (socketRef.current?.connected) {
          socketRef.current.emit('join-room', sessionId)
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
        // Force a fresh location update
        if (navigator.geolocation && trackingStatusRef.current === 'tracking') {
          navigator.geolocation.getCurrentPosition(handleSuccess, () => {}, geoOptions)
        }
      }
    }

    const handleOnline = () => {
      console.log('[Network] Back online — reconnecting socket and resuming tracking')
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect()
      }
      if (trackingStatusRef.current === 'error') {
        handleRetry()
      }
    }

    const handleOffline = () => {
      console.log('[Network] Device went offline')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [student, sessionId, handleSuccess, handleRetry])


  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-ct-bg font-sans transition-colors duration-200">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="text-ct-muted text-sm">Identifying attendance profile...</p>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-ct-bg font-sans p-4 transition-colors duration-200">
        <div className="w-full max-w-md bg-ct-card border border-ct-border rounded-2xl p-8 text-center space-y-6 backdrop-blur-xl">
          <div className="w-16 h-16 bg-red-950/20 border border-red-900/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-ct-text">Identity Error</h3>
            <p className="text-ct-muted text-sm">{error || 'Student identity not found. Please scan the QR code to sign in again.'}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-ct-card-solid hover:bg-ct-card text-ct-text border border-ct-border rounded-xl font-bold transition-all text-sm cursor-pointer"
          >
            Retry Identity Access
          </button>
        </div>
      </div>
    )
  }

  if (!hasOnboarded) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center bg-ct-bg font-sans overflow-hidden py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
        {/* Floating Theme Switcher */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-ct-card hover:bg-ct-card-solid text-ct-muted hover:text-ct-text rounded-xl transition-colors cursor-pointer border border-ct-border shadow-sm flex items-center justify-center"
            title={theme === 'dark' ? 'Activate Light Mode' : 'Activate Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Background blobs */}
        <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-900/10 border border-violet-500/20 text-violet-400 mb-4 shadow-inner">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-3xl font-extrabold text-ct-text tracking-tight">
              ClassTrack GPS
            </h2>
            <p className="mt-2 text-sm text-ct-muted font-medium">
              Location Verification Onboarding
            </p>
          </div>

          <div className="bg-ct-card backdrop-blur-xl border border-ct-border rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-4 text-left">
              <h3 className="text-sm font-bold text-ct-text uppercase tracking-wider text-center border-b border-ct-border pb-3">Why location is required</h3>
              <p className="text-ct-muted text-xs leading-relaxed text-center">
                ClassTrack uses your device's GPS to verify your attendance based on your classroom's geographic boundary.
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0 text-xs font-bold mt-0.5">1</div>
                  <div>
                    <h4 className="font-semibold text-xs text-ct-text">Attendance Verification</h4>
                    <p className="text-[11px] text-ct-muted leading-relaxed">Verifies that you are physically present in the classroom to sign your attendance record.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0 text-xs font-bold mt-0.5">2</div>
                  <div>
                    <h4 className="font-semibold text-xs text-ct-text">Geofence Monitoring</h4>
                    <p className="text-[11px] text-ct-muted leading-relaxed">Actively measures your distance to class during the session to guarantee continuous engagement.</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-violet-500/5 border border-violet-500/10 rounded-xl space-y-1 mt-4">
                <h5 className="font-semibold text-xs text-violet-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Privacy Notice
                </h5>
                <p className="text-[10px] text-ct-muted leading-normal">
                  Your coordinates are only measured and transmitted while the tracking session tab is kept open. No background history or non-class tracking occurs. Coordinates are stored securely.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                localStorage.setItem('classtrack_onboarded_v2', 'true')
                setHasOnboarded(true)
              }}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-violet-500/10 transition-all text-xs cursor-pointer uppercase tracking-wider text-center"
            >
              Continue & Request GPS Permission
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-ct-bg font-sans overflow-hidden py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Floating Theme Switcher */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          className="p-2.5 bg-ct-card hover:bg-ct-card-solid text-ct-muted hover:text-ct-text rounded-xl transition-colors cursor-pointer border border-ct-border shadow-sm flex items-center justify-center"
          title={theme === 'dark' ? 'Activate Light Mode' : 'Activate Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* In-App Toast Banner */}
      {inAppNotification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[2000] flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top duration-200 ${
          inAppNotification.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-900/60 text-emerald-200' 
            : 'bg-amber-950/90 border-amber-900/60 text-amber-200'
        }`}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{inAppNotification.message}</span>
        </div>
      )}

      {/* Background radial highlights */}
      {insideRadius === false ? (
        <div className="absolute inset-0 bg-red-950/10 transition-colors duration-500 animate-pulse pointer-events-none" />
      ) : (
        <div className="absolute inset-0 bg-emerald-950/5 transition-colors duration-500 pointer-events-none" />
      )}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-ct-card border border-ct-border text-ct-muted text-xs font-medium mb-4">
            <Radio className={`w-3.5 h-3.5 ${insideRadius !== null ? 'text-violet-400 animate-ping' : ''}`} />
            Live Attendance Session Active
          </div>
          <h2 
            className="text-3xl font-extrabold text-ct-text tracking-tight cursor-default select-none"
            onClick={handleLogoClick}
          >
            ClassTrack Tracker
          </h2>
          <p className="mt-1.5 text-ct-muted text-sm">
            Keep this tab open on your device to maintain your attendance
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-ct-card backdrop-blur-xl border border-ct-border rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          
          {/* Geofence Status Indicator */}
          {isInsecureContext && (
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-red-200 text-xs text-left">
              <div className="flex items-center gap-2 font-bold text-red-400">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>Insecure Connection Warning</span>
              </div>
              <p className="text-ct-muted leading-relaxed font-sans">
                Mobile web browsers block Geolocation on plain HTTP. Please access this page over **HTTPS**, or check the diagnostics panel below on how to register your IP address as secure.
              </p>
            </div>
          )}

          {trackingStatus === 'error' && error ? (
            <div className="flex flex-col items-center py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-950/20 border border-red-900/30 flex items-center justify-center text-red-400 mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-3 w-full">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-red-500">Tracking Stopped</h3>
                  <p className="text-ct-muted text-xs px-2 leading-relaxed font-sans">{error}</p>
                </div>
                <button
                  onClick={handleRetry}
                  className="w-full py-2.5 bg-ct-card-solid hover:bg-ct-card text-ct-text border border-ct-border rounded-xl font-bold transition-all text-xs cursor-pointer"
                >
                  Retry Location Access
                </button>
              </div>
            </div>
          ) : insideRadius === null ? (
            <div className="flex flex-col items-center py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-ct-bg border border-ct-border flex items-center justify-center text-ct-muted animate-pulse">
                <Compass className="w-8 h-8 rotate-45" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ct-text">Acquiring Location</h3>
                <p className="text-ct-muted text-xs mt-1">Please allow browser location permissions if prompted.</p>
              </div>
            </div>
          ) : currentValidatedStatus === 'Inside' ? (
            <div className="flex flex-col items-center py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-emerald-400">Inside Classroom</h3>
                <p className="text-ct-muted text-sm">Attendance status: <span className="text-emerald-400 font-semibold">Verified Active</span></p>
              </div>
            </div>
          ) : currentValidatedStatus === 'Warning' ? (
            <div className="flex flex-col items-center py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 animate-pulse">
                <AlertTriangle className="w-9 h-9" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-amber-400">Warning Zone</h3>
                <p className="text-ct-text text-sm font-medium">
                  You are near the classroom boundary. Return to the center.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 animate-bounce">
                <AlertTriangle className="w-9 h-9" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-red-500">Outside Classroom</h3>
                <p className="text-ct-text text-sm font-medium">
                  You are outside the classroom boundary. Please return.
                </p>
              </div>
            </div>
          )}

          {/* Student Profile & Stats */}
          <div className="border-t border-ct-border pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-ct-bg/60 border border-ct-border rounded-xl p-3">
                <span className="text-xs text-ct-muted block">Student Name</span>
                <span className="text-ct-text font-medium block truncate mt-0.5">{student?.name}</span>
              </div>
              <div className="bg-ct-bg/60 border border-ct-border rounded-xl p-3">
                <span className="text-xs text-ct-muted block">Roll / Student ID</span>
                <span className="text-ct-text font-medium block truncate mt-0.5">{student?.rollNumber}</span>
              </div>
            </div>

            {insideRadius !== null && (
              <div className="bg-ct-bg/60 border border-ct-border rounded-xl p-4 space-y-3 text-left">
                <div className="flex justify-between items-center text-xs text-ct-muted">
                  <span>Classroom Radius</span>
                  <span className="text-ct-text font-semibold">{radius} meters</span>
                </div>
                <div className="flex justify-between items-center text-xs text-ct-muted">
                  <span>Current Distance</span>
                  <span className={`font-semibold ${insideRadius ? 'text-emerald-400' : 'text-red-400'}`}>
                    {distance === null ? '--' : `${distance} meters`}
                  </span>
                </div>
                {coords && (
                  <div className="flex justify-between items-center text-xs text-ct-muted border-t border-ct-border pt-2.5">
                    <span>Coordinates</span>
                    <span className="font-mono text-[10px] text-ct-text">
                      {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                    </span>
                  </div>
                )}
                {lastUpdated && (
                  <div className="text-[10px] text-center text-ct-muted mt-1">
                    Last check-in heartbeat: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}

            {/* GPS Accuracy Indicator */}
            {gpsAccuracy !== null && trackingStatus === 'tracking' && (
              <div className="bg-ct-bg/60 border border-ct-border rounded-xl p-4 space-y-2 text-left">
                <div className="flex justify-between items-center text-xs text-ct-muted">
                  <span>GPS Accuracy</span>
                  <span className={`font-bold ${
                    gpsAccuracy <= 10 ? 'text-emerald-400' :
                    gpsAccuracy <= 25 ? 'text-emerald-400' :
                    gpsAccuracy <= 50 ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {gpsAccuracy <= 10 ? '🟢 Excellent' :
                     gpsAccuracy <= 25 ? '🟢 Good' :
                     gpsAccuracy <= 50 ? '🟡 Fair' :
                     '🔴 Poor'}
                    {' '}({Math.round(gpsAccuracy)}m)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-ct-border rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      gpsAccuracy <= 10 ? 'bg-emerald-500 w-full' :
                      gpsAccuracy <= 25 ? 'bg-emerald-500 w-3/4' :
                      gpsAccuracy <= 50 ? 'bg-amber-500 w-1/2' :
                      'bg-red-500 w-1/4'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Environment-agnostic network connection details for student devices */}
            <div className="bg-ct-bg/60 border border-ct-border rounded-xl p-4 space-y-2.5 text-left">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ct-muted border-b border-ct-border pb-2">
                <span>Network Status</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  socketConnected 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  {socketConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="text-[10px] space-y-1.5 text-ct-muted">
                <div className="flex justify-between items-center">
                  <span>Server Host:</span>
                  <span className="font-mono text-ct-text font-semibold">
                    {typeof window !== 'undefined' ? window.location.hostname : 'Detecting...'}
                  </span>
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
                <div className="flex justify-between items-center">
                  <span>Access Mode:</span>
                  <span className="text-violet-400 font-semibold uppercase">
                    {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^172\./.test(window.location.hostname) || /^192\./.test(window.location.hostname) || /^10\./.test(window.location.hostname))
                      ? 'Local Network (LAN)'
                      : 'Cloud (Public HTTPS)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostics Debug Panel (Hidden behind Dev Mode) */}
          {isDevMode && (
          <div className="bg-ct-bg/75 border border-ct-border rounded-xl p-4 mt-4 space-y-3 text-[11px] text-ct-muted text-left font-mono">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-ct-muted border-b border-ct-border pb-2 mb-1 font-sans">
              <span>GPS & Geolocation Debug</span>
              <span className="text-emerald-400 text-[10px] animate-pulse">● Active Debug</span>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span>Permission State:</span>
                <span className={`font-bold ${
                  permissionState === 'granted' ? 'text-emerald-400' :
                  permissionState === 'denied' ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {permissionState.toUpperCase()}
                </span>
              </div>

              <div className="flex justify-between">
                <span>GPS Status:</span>
                <span className={gpsError ? 'text-rose-400 font-bold' : coords ? 'text-emerald-400' : 'text-ct-muted'}>
                  {gpsError ? `ERROR (${gpsError.codeString})` : coords ? 'ACTIVE_TRACKING' : 'ACQUIRING'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Latitude:</span>
                <span className="text-ct-text font-semibold">
                  {coords ? coords.lat.toFixed(6) : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Longitude:</span>
                <span className="text-ct-text font-semibold">
                  {coords ? coords.lng.toFixed(6) : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Accuracy Filtered:</span>
                <span className={accuracyIgnored ? 'text-amber-400 font-bold' : 'text-ct-muted'}>
                  {accuracyIgnored ? `YES (${lastIgnoredAccuracy?.toFixed(1)}m > 60m)` : 'NO'}
                </span>
              </div>

              <div className="flex justify-between font-bold">
                <span>Last Update Time:</span>
                <span className="text-ct-text">
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Error Code:</span>
                <span className={gpsError ? 'text-rose-400 font-bold' : 'text-ct-text'}>
                  {gpsError ? gpsError.code : 'NONE'}
                </span>
              </div>

              <div className="flex justify-between border-b border-ct-border pb-2 mb-1">
                <span>Error Message:</span>
                <span className="text-ct-text truncate max-w-[200px]" title={gpsError ? gpsError.message : 'NONE'}>
                  {gpsError ? gpsError.message : 'NONE'}
                </span>
              </div>

              {/* Extra device context details */}
              <div className="text-[10px] space-y-1 text-ct-muted pt-1">
                <div className="flex justify-between">
                  <span>Secure Context:</span>
                  <span>{isInsecureContext ? 'NO (HTTP)' : 'YES'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Origin URL:</span>
                  <span className="truncate max-w-[200px]">{currentUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span>Device/Browser:</span>
                  <span>{deviceDetails}</span>
                </div>
                <div className="flex justify-between">
                  <span>Retry Count:</span>
                  <span>{retryCount}</span>
                </div>
              </div>

              {gpsError && isInsecureContext && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded p-2 text-[10px] text-rose-300 font-sans space-y-1 mt-1">
                  <div className="font-bold text-rose-400">⚠️ Insecure Context Bypass Guidelines:</div>
                  <div className="leading-relaxed border-t border-rose-900/20 pt-1 mt-1">
                    • **Android/Chrome:** Visit <code className="bg-ct-bg px-1 py-0.5 rounded text-ct-text select-all font-mono">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>, enable, enter <code className="bg-ct-bg px-1 py-0.5 rounded text-ct-text select-all font-mono">{currentUrl.split('/track')[0]}</code>, and relaunch Chrome.
                  </div>
                  <div className="leading-relaxed">
                    • **iPhone/Safari:** iOS Safari blocks HTTP geolocation. You must run the dev server via HTTPS using an HTTPS tunnel (e.g. ngrok) or proxy.
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 font-sans">
              <button
                onClick={() => {
                  setRetryCount(0)
                  console.log('[Geolocation Manual Ping] Force querying getCurrentPosition...')
                  logGeolocationStatus('MANUAL_PING_INIT', 'Starting getCurrentPosition...')
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      logGeolocationStatus('MANUAL_PING_SUCCESS', `Coords: ${pos.coords.latitude}, ${pos.coords.longitude}`)
                      handleSuccess(pos)
                    },
                    (err) => {
                      const codeString = 
                        err.code === err.PERMISSION_DENIED ? 'PERMISSION_DENIED' :
                        err.code === err.POSITION_UNAVAILABLE ? 'POSITION_UNAVAILABLE' :
                        err.code === err.TIMEOUT ? 'TIMEOUT' : 'UNKNOWN_ERROR';
                      logGeolocationStatus('MANUAL_PING_ERROR', `Code: ${err.code} (${codeString}), Message: ${err.message}`)
                      handleError(err)
                    },
                    geoOptions
                  )
                }}
                className="flex-1 py-1.5 px-2 bg-ct-card-solid hover:bg-ct-card text-ct-text border border-ct-border rounded text-[10px] text-center font-bold cursor-pointer transition-colors"
              >
                Force GPS Ping
              </button>
              <button
                onClick={() => {
                  if (confirm("Reset tracking profile and re-register?")) {
                    localStorage.removeItem(`classtrack_student_${sessionId}`)
                    router.push(`/join/${sessionId}`)
                  }
                }}
                className="py-1.5 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded text-[10px] text-center font-bold cursor-pointer transition-colors"
              >
                Reset Profile
              </button>
            </div>
          </div>
          )}

          {/* Browser Notification Request bar */}
          {'Notification' in window && notificationPermission !== 'granted' && (
            <button
              onClick={requestNotificationPermission}
              className="w-full flex items-center justify-center gap-2 py-3 bg-ct-bg hover:bg-ct-card-solid border border-ct-border rounded-xl text-ct-muted hover:text-ct-text transition-colors text-xs font-semibold cursor-pointer shadow-sm"
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
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-ct-bg font-sans transition-colors duration-200">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="text-ct-muted text-sm">Initializing Geofence Tracker...</p>
      </div>
    }>
      <StudentTrackContent params={params} />
    </Suspense>
  )
}
