import { NextRequest, NextResponse } from 'next/server'
import { db, runWithRetry } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'
import { z } from 'zod'

const createSessionSchema = z.object({
  sessionName: z.string().min(1, 'Session name is required'),
  classroomName: z.string().min(1, 'Classroom name is required'),
  radius: z.number().int().positive('Radius must be a positive integer'),
  latitude: z.number(),
  longitude: z.number(),
  duration: z.number().int().positive('Duration must be a positive integer')
})

const patchSessionSchema = z.object({
  id: z.string().uuid(),
  radius: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
  endNow: z.boolean().optional()
})

// Helper to get authenticated Admin from cookies
function getAuthenticatedAdmin(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  if (!token) return null
  return verifyToken(token)
}

// GET: Fetch session info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')

    if (sessionId) {
      // Fetch details of specific session
      const session = await runWithRetry(() => db.session.findUnique({
        where: { id: sessionId }
      }))

      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      const isExpired = new Date(session.endTime).getTime() < Date.now() || !session.isActive
      return NextResponse.json({ ...session, isExpired })
    }

    // Otherwise, fetch authenticated user's sessions
    const admin = getAuthenticatedAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await runWithRetry(() => db.session.findMany({
      where: { adminId: admin.id },
      orderBy: { createdAt: 'desc' }
    }))

    return NextResponse.json({ sessions, admin: { name: admin.name, email: admin.email } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Create a new session (Admin-only)
export async function POST(request: NextRequest) {
  try {
    const admin = getAuthenticatedAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { sessionName, classroomName, radius, latitude, longitude, duration } = parsed.data

    const startTime = new Date()
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000)

    const session = await runWithRetry(() => db.session.create({
      data: {
        adminId: admin.id,
        sessionName,
        classroomName,
        radius,
        latitude,
        longitude,
        startTime,
        endTime,
        isActive: true
      }
    }))

    return NextResponse.json({ session })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH: Edit radius or duration of an active session (Admin-only)
export async function PATCH(request: NextRequest) {
  try {
    const admin = getAuthenticatedAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = patchSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { id, radius, duration, endNow } = parsed.data

    // Verify session ownership
    const existingSession = await runWithRetry(() => db.session.findUnique({
      where: { id }
    }))

    if (!existingSession || existingSession.adminId !== admin.id) {
      return NextResponse.json({ error: 'Session not found or forbidden' }, { status: 404 })
    }

    const updateData: any = {}

    if (radius !== undefined) {
      updateData.radius = radius
    }

    if (endNow) {
      updateData.isActive = false
      updateData.endTime = new Date()
    } else if (duration !== undefined) {
      const baseTime = new Date(existingSession.startTime).getTime()
      updateData.endTime = new Date(baseTime + duration * 60 * 1000)
    }

    const session = await runWithRetry(() => db.session.update({
      where: { id },
      data: updateData
    }))

    return NextResponse.json({ session })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE: End session (Admin-only)
export async function DELETE(request: NextRequest) {
  try {
    const admin = getAuthenticatedAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Verify session ownership
    const existingSession = await runWithRetry(() => db.session.findUnique({
      where: { id }
    }))

    if (!existingSession || existingSession.adminId !== admin.id) {
      return NextResponse.json({ error: 'Session not found or forbidden' }, { status: 404 })
    }

    // Mark session as inactive and set end time to now
    await runWithRetry(() => db.session.update({
      where: { id },
      data: {
        isActive: false,
        endTime: new Date()
      }
    }))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
