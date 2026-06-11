'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, User, Hash, GraduationCap, ShieldAlert, CheckCircle } from 'lucide-react'

interface SessionInfo {
  id: string
  sessionName: string
  classroomName: string
  isExpired: boolean
}

export default function StudentJoin({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter()
  const { sessionId } = use(params)

  // Session state
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [department, setDepartment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch session details on load
  useEffect(() => {
    // Redirect if they are already checked in (found in localStorage)
    const stored = localStorage.getItem(`classtrack_student_${sessionId}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed && parsed.id) {
          router.push(`/track/${sessionId}?studentId=${parsed.id}`)
          return
        }
      } catch (e) {
        console.error('Failed to parse stored student info:', e)
      }
    }

    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions?id=${sessionId}`)
        const data = await res.json()

        if (!res.ok) {
          setSessionError(data.error || 'Failed to load session details')
        } else if (data.isExpired) {
          setSessionError('This attendance session has already expired.')
        } else {
          setSession({
            id: data.id,
            sessionName: data.sessionName,
            classroomName: data.classroomName,
            isExpired: data.isExpired
          })
        }
      } catch (err) {
        setSessionError('Network error. Failed to load session.')
      } finally {
        setLoadingSession(false)
      }
    }

    if (sessionId) {
      fetchSession()
    }
  }, [sessionId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!name.trim() || !rollNumber.trim() || !department.trim()) {
      setSubmitError('All fields are required')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          rollNumber: rollNumber.trim(),
          department: department.trim(),
          sessionId: sessionId
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to join session')
        setSubmitting(false)
      } else {
        setSuccess(true)
        // Store student session info in localStorage so if they close the browser, they can resume
        localStorage.setItem(`classtrack_student_${sessionId}`, JSON.stringify(data.student))
        
        // Wait a brief second to show success and redirect
        setTimeout(() => {
          router.push(`/track/${sessionId}?studentId=${data.student.id}`)
        }, 1500)
      }
    } catch (err) {
      setSubmitError('Connection failed. Please check your internet connection.')
      setSubmitting(false)
    }
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 font-sans">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Validating classroom session...</p>
      </div>
    )
  }

  if (sessionError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 font-sans p-4">
        <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-8 text-center space-y-6 backdrop-blur-xl">
          <div className="w-16 h-16 bg-red-950/30 border border-red-900/40 rounded-2xl flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Session Unavaliable</h3>
            <p className="text-zinc-400 text-sm">{sessionError}</p>
          </div>
          <p className="text-xs text-zinc-500">
            Please ask your instructor for a valid QR code or link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 font-sans overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-950 border border-violet-800 text-violet-400 mb-4">
            <MapPin className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Check In to Class
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Session: <span className="text-violet-400 font-semibold">{session?.sessionName}</span> in{' '}
            <span className="text-violet-400 font-semibold">{session?.classroomName}</span>
          </p>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl p-8 space-y-6">
          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-950/30 border border-emerald-900/50 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Attendance Logged!</h4>
                <p className="text-zinc-400 text-sm mt-1">Starting live location tracking...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {submitError && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-200 text-sm">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-400" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Student Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <User className="w-5 h-5" />
                    </span>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm"
                      placeholder="e.g. Joshua Jeedi"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="roll" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Roll / Student Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <Hash className="w-5 h-5" />
                    </span>
                    <input
                      id="roll"
                      type="text"
                      required
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm"
                      placeholder="e.g. 101"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="dept" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Department
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <GraduationCap className="w-5 h-5" />
                    </span>
                    <input
                      id="dept"
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm"
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-violet-500/10 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all text-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Join Session'
                  )}
                </button>
              </div>
            </form>
          )}
          
          {/* Network connection details for student devices */}
          <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 mt-4 space-y-2 text-[10px] text-zinc-400">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/50 pb-2 mb-1">
              <span>Network Status</span>
              <span className="text-emerald-400 font-bold">🟢 Online</span>
            </div>
            <div className="flex justify-between">
              <span>Server Host:</span>
              <span className="font-mono text-white font-semibold">
                {typeof window !== 'undefined' ? window.location.host : 'Detecting...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
