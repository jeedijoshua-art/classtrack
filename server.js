const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

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

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`)
    })
  })

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
