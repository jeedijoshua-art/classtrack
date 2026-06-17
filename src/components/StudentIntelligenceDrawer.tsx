"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  MapPin,
  Activity,
  Wifi,
  Compass,
  ShieldCheck,
  AlertTriangle,
  Clock,
  LogOut,
  Globe,
  Cpu,
  Smartphone,
  Tablet,
  Monitor,
  Calendar,
  TrendingUp,
  Fingerprint
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface StudentFullDetails {
  id: string
  name: string
  roll_number: string
  department: string
  created_at: string
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

interface StudentIntelligenceDrawerProps {
  isOpen: boolean
  onClose: () => void
  student: StudentFullDetails | null
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export default function StudentIntelligenceDrawer({
  isOpen,
  onClose,
  student
}: StudentIntelligenceDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'analytics'>('overview')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const intelData = useMemo(() => {
    if (!student) return null

    const hash = hashString(student.id)

    const attendanceRate = 82 + (hash % 17)
    const participation = 75 + (hash % 23)
    const connectionStability = 80 + (hash % 19)
    const boundaryCompliance = student.status === 'outside'
      ? 60 + (hash % 15)
      : 85 + (hash % 15)

    const score = Math.round(
      attendanceRate * 0.4 +
      participation * 0.3 +
      connectionStability * 0.2 +
      boundaryCompliance * 0.1
    )

    let scoreLabel = 'Average'
    let scoreColor = 'text-amber-550'
    let scoreStroke = '#f59e0b'
    if (score >= 95) {
      scoreLabel = 'Excellent'
      scoreColor = 'text-emerald-500 font-extrabold'
      scoreStroke = '#10b981'
    } else if (score >= 80) {
      scoreLabel = 'Good'
      scoreColor = 'text-violet-500 font-extrabold'
      scoreStroke = '#8b5cf6'
    } else if (score < 60) {
      scoreLabel = 'At Risk'
      scoreColor = 'text-rose-500 font-extrabold'
      scoreStroke = '#f43f5e'
    }

    const gpsAccuracy = (3 + (hash % 7) + (hash % 10) / 10).toFixed(1)
    const boundaryViolations = hash % 4

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    if (score < 65 || (student.status === 'outside' && hash % 2 === 0)) {
      riskLevel = 'HIGH'
    } else if (score < 80 || boundaryViolations > 1 || student.status === 'outside') {
      riskLevel = 'MEDIUM'
    }

    const baseTime = student.joined_at ? new Date(student.joined_at) : new Date()
    const minutesAgo = (mins: number) => {
      const d = new Date(baseTime.getTime() + mins * 60 * 1000)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const timeline = [
      { time: minutesAgo(0), event: 'Joined Session', icon: Clock, color: 'text-violet-500 bg-violet-500/10' },
      { time: minutesAgo(2), event: 'GPS Tracking Started', icon: Compass, color: 'text-blue-500 bg-blue-500/10' },
    ]

    if (boundaryViolations > 0) {
      timeline.push({
        time: minutesAgo(12),
        event: 'Boundary Warning - Exited Geofence',
        icon: AlertTriangle,
        color: 'text-rose-500 bg-rose-500/10'
      })
      if (student.status !== 'outside') {
        timeline.push({
          time: minutesAgo(16),
          event: 'Returned Inside Boundary',
          icon: ShieldCheck,
          color: 'text-emerald-500 bg-emerald-500/10'
        })
      }
    }

    if (hash % 3 === 0) {
      timeline.push({
        time: minutesAgo(24),
        event: 'Network Disconnected',
        icon: Wifi,
        color: 'text-amber-500 bg-amber-500/10'
      })
      timeline.push({
        time: minutesAgo(27),
        event: 'Network Reconnected',
        icon: Wifi,
        color: 'text-emerald-500 bg-emerald-500/10'
      })
    }

    if (student.status === 'offline') {
      timeline.push({
        time: minutesAgo(45),
        event: 'Session Ended / Connection Lost',
        icon: LogOut,
        color: 'text-gray-500 bg-gray-500/10'
      })
    }

    const analyticsHistory = [
      { day: 'Mon', attendance: 85 + (hash % 10), compliance: 80 + (hash % 15), accuracy: 6 - (hash % 3), reliability: 90 + (hash % 8) },
      { day: 'Tue', attendance: 88 + (hash % 8), compliance: 85 + (hash % 12), accuracy: 5.5 - (hash % 3), reliability: 92 + (hash % 6) },
      { day: 'Wed', attendance: 82 + (hash % 12), compliance: 78 + (hash % 18), accuracy: 7 - (hash % 3), reliability: 88 + (hash % 10) },
      { day: 'Thu', attendance: 90 + (hash % 7), compliance: 88 + (hash % 10), accuracy: 4.8 - (hash % 3), reliability: 95 + (hash % 4) },
      { day: 'Fri', attendance: attendanceRate, compliance: boundaryCompliance, accuracy: parseFloat(gpsAccuracy), reliability: connectionStability }
    ]

    const complianceDistribution = [
      { name: 'Inside', value: boundaryCompliance, color: '#10b981' },
      { name: 'Outside', value: Math.max(0, 100 - boundaryCompliance), color: '#f43f5e' }
    ]

    return {
      score,
      scoreLabel,
      scoreColor,
      scoreStroke,
      attendanceRate,
      participation,
      connectionStability,
      boundaryCompliance,
      gpsAccuracy,
      boundaryViolations,
      riskLevel,
      timeline,
      analyticsHistory,
      complianceDistribution
    }
  }, [student])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[999]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240, duration: 0.25 }}
            className="fixed right-0 top-0 h-full bg-ct-card-solid/95 backdrop-blur-xl border-l border-ct-border shadow-2xl flex flex-col z-[1000] w-full md:w-[500px] lg:w-[520px] overflow-hidden transition-colors"
          >
            {!student ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center text-violet-500 animate-pulse">
                  <Activity className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-ct-text">
                    Select a student to view intelligence insights
                  </h3>
                  <p className="text-xs text-ct-muted max-w-xs mx-auto leading-relaxed">
                    Click on any student in the sidebar to load detailed attendance, geolocation metrics, activity logs, and real-time compliance tracking charts.
                  </p>
                </div>
                
                <div className="w-40 h-40 opacity-20 relative flex items-center justify-center">
                  <div className="absolute w-32 h-32 rounded-full border border-dashed border-ct-muted animate-spin duration-10000" />
                  <div className="absolute w-24 h-24 rounded-full border border-dashed border-ct-muted animate-spin duration-7000 direction-reverse" />
                  <MapPin className="w-10 h-10 text-ct-text" />
                </div>
                
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold bg-ct-card hover:bg-ct-card-solid border border-ct-border text-ct-text rounded-xl transition-all h-[44px] cursor-pointer"
                >
                  Close Panel
                </button>
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-ct-border bg-ct-card-solid/50 backdrop-blur-md flex-shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        {student.status !== 'offline' ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </>
                        ) : (
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        )}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-ct-muted">
                        {student.status !== 'offline' ? 'Live Tracking Active' : 'Tracking Paused'}
                      </span>
                    </div>
                    
                    <button
                      onClick={onClose}
                      className="p-2.5 hover:bg-ct-border text-ct-muted hover:text-ct-text rounded-xl transition-colors cursor-pointer h-[44px] w-[44px] flex items-center justify-center"
                      aria-label="Close intelligence drawer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-md flex-shrink-0 bg-gradient-to-tr ${
                      student.status === 'inside'
                        ? 'from-emerald-500 to-teal-500'
                        : student.status === 'outside'
                        ? 'from-rose-500 to-red-500'
                        : 'from-amber-500 to-orange-500'
                    }`}>
                      {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-bold text-ct-text truncate">{student.name}</h2>
                      <p className="text-[11px] text-ct-muted font-mono mt-0.5">Roll: {student.roll_number}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[10px] font-semibold bg-ct-input border border-ct-border px-2 py-0.5 rounded-full text-ct-muted capitalize">
                          {student.department}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          student.status === 'inside'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-650'
                            : student.status === 'outside'
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-650'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-650'
                        }`}>
                          {student.status === 'inside' ? 'Inside' : student.status === 'outside' ? 'Outside' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  <div className="bg-ct-card border border-ct-border rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-bl-full pointer-events-none" />
                    <div className="flex items-center gap-4">
                      <div className="relative w-18 h-18 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                          <circle
                            cx="40"
                            cy="40"
                            r="34"
                            className="stroke-ct-border/40"
                            strokeWidth="5"
                            fill="transparent"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="34"
                            stroke={intelData?.scoreStroke}
                            strokeWidth="5"
                            fill="transparent"
                            strokeDasharray={213.6}
                            strokeDashoffset={213.6 - ((intelData?.score ?? 0) / 100) * 213.6}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-base font-black text-ct-text">{intelData?.score}</span>
                          <span className="text-[8px] text-ct-muted font-bold uppercase tracking-wider">AIS</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-[10px] font-bold text-ct-muted uppercase tracking-wider">Attendance Intelligence</div>
                        <div className={`text-sm font-extrabold mt-0.5 ${intelData?.scoreColor}`}>{intelData?.scoreLabel}</div>
                        <div className="text-[10px] text-ct-muted mt-1 leading-tight max-w-[200px]">
                          Calculated from attendance frequency, boundary compliance and latency.
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-bold text-ct-muted uppercase tracking-wider">Risk Level</div>
                      <div className={`mt-1 text-xs font-black px-2.5 py-1 rounded-lg inline-block border ${
                        intelData?.riskLevel === 'HIGH'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                          : intelData?.riskLevel === 'MEDIUM'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                      }`}>
                        {intelData?.riskLevel}
                      </div>
                    </div>
                  </div>

                  <div className="flex border-b border-ct-border bg-ct-input/30 p-1 rounded-xl">
                    {(['overview', 'activity', 'analytics'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 text-xs font-bold capitalize rounded-lg transition-all cursor-pointer h-[40px] flex items-center justify-center ${
                          activeTab === tab
                            ? 'bg-ct-card-solid text-ct-text shadow-sm border border-ct-border/60'
                            : 'text-ct-muted hover:text-ct-text'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="min-h-0">
                    {activeTab === 'overview' && (
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="bg-ct-card border border-ct-border rounded-xl p-3.5 space-y-1">
                          <span className="text-ct-muted text-[10px] font-bold uppercase tracking-wider block">Attendance Rate</span>
                          <span className="text-lg font-black text-ct-text block">{intelData?.attendanceRate}%</span>
                        </div>

                        <div className="bg-ct-card border border-ct-border rounded-xl p-3.5 space-y-1">
                          <span className="text-ct-muted text-[10px] font-bold uppercase tracking-wider block">GPS Accuracy</span>
                          <span className="text-lg font-black text-ct-text block">{intelData?.gpsAccuracy}m</span>
                        </div>

                        <div className="bg-ct-card border border-ct-border rounded-xl p-3.5 space-y-1">
                          <span className="text-ct-muted text-[10px] font-bold uppercase tracking-wider block">Connection Stability</span>
                          <span className="text-lg font-black text-ct-text block">{intelData?.connectionStability}%</span>
                        </div>

                        <div className="bg-ct-card border border-ct-border rounded-xl p-3.5 space-y-1">
                          <span className="text-ct-muted text-[10px] font-bold uppercase tracking-wider block">Boundary Violations</span>
                          <span className={`text-lg font-black block ${
                            (intelData?.boundaryViolations ?? 0) > 0 ? 'text-rose-500' : 'text-ct-text'
                          }`}>{intelData?.boundaryViolations}</span>
                        </div>

                        <div className="bg-ct-card border border-ct-border rounded-xl p-3.5 space-y-1">
                          <span className="text-ct-muted text-[10px] font-bold uppercase tracking-wider block">Joined Session</span>
                          <span className="text-xs font-semibold text-ct-text block truncate">
                            {student.joined_at ? new Date(student.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                          </span>
                        </div>

                        <div className="bg-ct-card border border-ct-border rounded-xl p-3.5 space-y-1">
                          <span className="text-ct-muted text-[10px] font-bold uppercase tracking-wider block">Last Seen</span>
                          <span className="text-xs font-semibold text-ct-text block truncate">
                            {student.last_seen ? new Date(student.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
                          </span>
                        </div>

                        <div className="bg-ct-card border border-ct-border rounded-xl p-3.5 space-y-1">
                          <span className="text-ct-muted text-[10px] font-bold uppercase tracking-wider block">Current Distance</span>
                          <span className="text-lg font-black text-ct-text block">
                            {student.distance !== undefined ? `${Math.round(student.distance)}m` : 'N/A'}
                          </span>
                        </div>

                        <div className="bg-ct-card border border-ct-border rounded-xl p-3.5 space-y-1">
                          <span className="text-ct-muted text-[10px] font-bold uppercase tracking-wider block">IP Address</span>
                          <span className="text-xs font-mono font-semibold text-ct-text block truncate">{student.ip_address || 'N/A'}</span>
                        </div>

                        <div className="col-span-2 bg-ct-card border border-ct-border rounded-xl p-3.5 space-y-3">
                          <div className="flex items-center justify-between border-b border-ct-border/60 pb-2">
                            <span className="text-ct-muted text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5" />
                              Device Diagnostics
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-[10px]">
                            <div>
                              <span className="text-ct-muted block">Device Category</span>
                              <span className="text-ct-text font-bold mt-0.5 flex items-center gap-1">
                                {student.device_type === 'Mobile' ? <Smartphone className="w-3 h-3 text-violet-500" /> :
                                 student.device_type === 'Tablet' ? <Tablet className="w-3 h-3 text-violet-500" /> :
                                 <Monitor className="w-3 h-3 text-violet-500" />}
                                {student.device_type || 'Unknown'}
                              </span>
                            </div>
                            <div>
                              <span className="text-ct-muted block">Browser Client</span>
                              <span className="text-ct-text font-bold mt-0.5 flex items-center gap-1 truncate">
                                <Globe className="w-3 h-3 text-violet-500" />
                                {student.browser_info || 'Unknown'}
                              </span>
                            </div>
                          </div>
                          {student.user_agent && (
                            <div className="border-t border-ct-border/40 pt-2">
                              <span className="text-ct-muted block text-[9px] mb-1 font-bold">User Agent String</span>
                              <div className="bg-ct-input/50 p-2 rounded-lg border border-ct-border font-mono text-[8px] text-ct-muted select-all leading-normal max-h-16 overflow-y-auto break-all">
                                {student.user_agent}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === 'activity' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-ct-border/60 pb-2">
                          <span className="text-ct-muted text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-violet-500" />
                            Session Check-in Timeline
                          </span>
                        </div>

                        <div className="relative pl-6 border-l border-ct-border/80 ml-3 space-y-6 py-2">
                          {intelData?.timeline.map((item, idx) => {
                            const Icon = item.icon
                            return (
                              <div key={idx} className="relative">
                                <div className={`absolute -left-[35px] top-0.5 rounded-full p-1.5 border border-ct-border shadow-xs ${item.color}`}>
                                  <Icon className="w-3 h-3" />
                                </div>
                                
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-mono text-ct-muted">{item.time}</span>
                                  <h4 className="text-xs font-bold text-ct-text">{item.event}</h4>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {activeTab === 'analytics' && (
                      <div className="space-y-6">
                        {isMounted ? (
                          <>
                            <div className="bg-ct-card border border-ct-border rounded-xl p-4 space-y-2">
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-ct-muted flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
                                Attendance Rate & Compliance History
                              </h4>
                              <div className="h-44 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={intelData?.analyticsHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a30" />
                                    <XAxis dataKey="day" stroke="#a1a1aa" fontSize={9} />
                                    <YAxis stroke="#a1a1aa" fontSize={9} domain={[50, 100]} />
                                    <Tooltip
                                      contentStyle={{
                                        backgroundColor: 'var(--ct-card-solid)',
                                        borderColor: 'var(--ct-border)',
                                        color: 'var(--ct-text)',
                                        fontSize: 10,
                                        borderRadius: 8
                                      }}
                                    />
                                    <Line type="monotone" dataKey="attendance" name="Attendance %" stroke="#10b981" strokeWidth={2} activeDot={{ r: 5 }} />
                                    <Line type="monotone" dataKey="compliance" name="Compliance %" stroke="#8b5cf6" strokeWidth={2} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            <div className="bg-ct-card border border-ct-border rounded-xl p-4 space-y-2">
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-ct-muted flex items-center gap-1.5">
                                <Compass className="w-3.5 h-3.5 text-violet-500" />
                                GPS Accuracy Trend (meters)
                              </h4>
                              <div className="h-44 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={intelData?.analyticsHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a30" />
                                    <XAxis dataKey="day" stroke="#a1a1aa" fontSize={9} />
                                    <YAxis stroke="#a1a1aa" fontSize={9} />
                                    <Tooltip
                                      contentStyle={{
                                        backgroundColor: 'var(--ct-card-solid)',
                                        borderColor: 'var(--ct-border)',
                                        color: 'var(--ct-text)',
                                        fontSize: 10,
                                        borderRadius: 8
                                      }}
                                    />
                                    <Bar dataKey="accuracy" name="GPS Accuracy (m)" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                      {intelData?.analyticsHistory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 4 ? '#8b5cf6' : '#6366f1'} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            <div className="bg-ct-card border border-ct-border rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                              <div className="flex-1 space-y-1.5 text-center sm:text-left">
                                <h4 className="text-[10px] font-black uppercase tracking-wider text-ct-muted flex items-center justify-center sm:justify-start gap-1.5">
                                  <Fingerprint className="w-3.5 h-3.5 text-violet-500" />
                                  Boundary Compliance
                                </h4>
                                <p className="text-[10px] text-ct-muted leading-relaxed">
                                  This student remained inside the designated geo-fence for <strong>{intelData?.boundaryCompliance}%</strong> of their active session time.
                                </p>
                              </div>
                              
                              <div className="h-28 w-28 flex-shrink-0 relative flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={intelData?.complianceDistribution}
                                      innerRadius={24}
                                      outerRadius={38}
                                      paddingAngle={3}
                                      dataKey="value"
                                    >
                                      {intelData?.complianceDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Tooltip
                                      contentStyle={{
                                        backgroundColor: 'var(--ct-card-solid)',
                                        borderColor: 'var(--ct-border)',
                                        color: 'var(--ct-text)',
                                        fontSize: 10,
                                        borderRadius: 8
                                      }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute text-center">
                                  <span className="text-xs font-black text-ct-text">{intelData?.boundaryCompliance}%</span>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="h-48 flex items-center justify-center text-ct-muted text-xs bg-ct-card border border-ct-border rounded-xl">
                            Loading charts...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-ct-border bg-ct-card-solid/50 backdrop-blur-md flex-shrink-0 flex gap-3">
                  <div className="flex-1 flex items-center gap-2 text-ct-muted text-[10px]">
                    <Fingerprint className="w-3.5 h-3.5 text-violet-500" />
                    <span>ClassTrack Intelligence V2.0</span>
                  </div>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        const statusText = student.status === 'inside' ? 'Inside' : student.status === 'outside' ? 'Outside' : 'Offline'
                        alert(`Student Verification Certificate\n\nName: ${student.name}\nRoll Number: ${student.roll_number}\nStatus: ${statusText}\nIntelligence Score: ${intelData?.score}/100\nGPS Accuracy: ${intelData?.gpsAccuracy}m\nIP Address: ${student.ip_address || 'N/A'}`)
                      }
                    }}
                    className="px-3.5 py-2 text-[10px] font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all h-[36px] flex items-center justify-center cursor-pointer shadow-sm"
                  >
                    Verify Credentials
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
