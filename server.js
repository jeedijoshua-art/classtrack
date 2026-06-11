const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd())

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { PrismaClient } = require('@prisma/client')

const prisma = globalThis.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
})
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

const os = require('os')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = process.env.PORT || 3000

function getLocalIp() {
  const interfaces = os.networkInterfaces()
  const candidates = []

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name]
    if (!iface) continue
    
    for (const net of iface) {
      const family = typeof net.family === 'string' ? net.family : String(net.family)
      if ((family === 'IPv4' || family === '4') && !net.internal) {
        candidates.push({
          address: net.address,
          name: name.toLowerCase()
        })
      }
    }
  }

  if (candidates.length === 0) return 'localhost'

  const isPrivateIp = (ip) => {
    const parts = ip.split('.').map(Number)
    if (parts[0] === 10) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    return false
  }

  candidates.sort((a, b) => {
    const aPrivate = isPrivateIp(a.address)
    const bPrivate = isPrivateIp(b.address)
    const aPhysical = a.name.startsWith('en') || a.name.startsWith('wlan') || a.name.startsWith('eth')
    const bPhysical = b.name.startsWith('en') || b.name.startsWith('wlan') || b.name.startsWith('eth')
    
    if (aPrivate && aPhysical && !(bPrivate && bPhysical)) return -1
    if (!(aPrivate && aPhysical) && bPrivate && bPhysical) return 1
    
    if (aPrivate && !bPrivate) return -1
    if (!aPrivate && bPrivate) return 1
    
    if (aPhysical && !bPhysical) return -1
    if (!aPhysical && bPhysical) return 1
    
    return 0
  })

  return candidates[0].address
}

// Initialize the Next.js compilation app instance
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  // Initialize WebSockets server
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`)

    // 1. Join dynamic geofence session room
    socket.on('join-room', (roomId) => {
      socket.join(roomId)
      console.log(`[Socket] Client ${socket.id} joined room: ${roomId}`)
    })

    // 2. Student check-in / join room alert
    socket.on('student-joined', ({ roomId, student, attendance }) => {
      socket.roomId = roomId
      socket.studentId = student.id
      socket.to(roomId).emit('student-joined', { student, attendance })
      console.log(`[Socket] Broadcast: Student ${student.name} checked in to ${roomId}`)
    })

    // 3. Student location geocoordinates update
    socket.on('location-update', ({ roomId, location }) => {
      // Broadcast location updates to all other clients in the room (the Teacher Dashboard)
      socket.to(roomId).emit('location-update', location)
    })

    // 4. Student connection status changes (offline / reconnect)
    socket.on('status-change', ({ roomId, studentId, status }) => {
      socket.to(roomId).emit('status-change', { studentId, status })
    })

    // 5. Radius update from admin live panel
    socket.on('radius-update', ({ roomId, radius }) => {
      socket.to(roomId).emit('radius-update', { radius })
      console.log(`[Socket] Broadcast: Radius updated to ${radius} in room ${roomId}`)
    })

    // 6. Latency ping
    socket.on('client-ping', (timestamp) => {
      socket.emit('client-pong', timestamp)
    })

    socket.on('disconnect', async () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`)
      if (socket.studentId && socket.roomId) {
        // Broadcast offline state change to the room
        socket.to(socket.roomId).emit('status-change', { studentId: socket.studentId, status: 'offline' })
        
        try {
          await prisma.attendance.updateMany({
            where: {
              sessionId: socket.roomId,
              studentId: socket.studentId
            },
            data: {
              status: 'Offline'
            }
          })
          console.log(`[Socket] DB: Auto-marked student ${socket.studentId} as Offline in session ${socket.roomId}`)
        } catch (err) {
          console.error('[Socket] Failed to mark student offline on disconnect:', err)
        }
      }
    })
  })

  server.listen(port, '0.0.0.0', (err) => {
    if (err) throw err
    const localIp = getLocalIp()
    console.log(`> Ready on http://localhost:${port}`)
    console.log(`> Local Network Access: http://${localIp}:${port}`)
  })
})
