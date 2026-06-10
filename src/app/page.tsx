'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Mail, User, ShieldAlert, ArrowRight, Eye, EyeOff, MapPin } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  // Form states
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Check if already authenticated
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
      }
    }
    checkAuth()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (isLogin) {
      // Login flow
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInErr) {
        setError(signInErr.message)
        setLoading(false)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      // Register flow
      if (!name.trim()) {
        setError('Name is required')
        setLoading(false)
        return
      }

      const { error: signUpErr, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      })

      if (signUpErr) {
        setError(signUpErr.message)
        setLoading(false)
      } else {
        // Log in immediately or display confirmation message
        if (data?.user?.identities?.length === 0) {
          setError('Email already exists. Please login.')
          setLoading(false)
        } else {
          // Attempt automatic login or show success message
          const { error: autoSignInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (autoSignInErr) {
            setIsLogin(true)
            setError('Account created! Please log in.')
            setLoading(false)
          } else {
            router.push('/dashboard')
            router.refresh()
          }
        }
      }
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 font-sans overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Graphic Blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-emerald-950/10 blur-[120px] pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center">
          {/* Logo container */}
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20 mb-4 border border-violet-400/20 animate-pulse">
            <MapPin className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-center text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Class<span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Track</span>
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Real-time classroom geofencing & attendance tracking
          </p>
        </div>

        {/* Glassmorphic Form Card */}
        <div className="mt-8 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="flex justify-center border-b border-zinc-800/80 pb-4">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 text-center py-2 text-sm font-semibold transition-colors duration-200 ${
                isLogin ? 'text-violet-400 border-b-2 border-violet-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 text-center py-2 text-sm font-semibold transition-colors duration-200 ${
                !isLogin ? 'text-violet-400 border-b-2 border-violet-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Register
            </button>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-200 text-sm">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {!isLogin && (
                <div>
                  <label htmlFor="name-input" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <User className="w-5 h-5" />
                    </span>
                    <input
                      id="name-input"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm"
                      placeholder="Professor Joshua"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email-input" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    id="email-input"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm"
                    placeholder="teacher@university.edu"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password-input" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    id="password-input"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-violet-500/10 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-all text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {isLogin ? 'Sign In' : 'Create Teacher Account'}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
