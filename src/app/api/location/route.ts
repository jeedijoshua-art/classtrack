import { NextRequest, NextResponse } from 'next/server'
import { db, runWithRetry } from '@/lib/db'
import { getDistanceInMeters } from '@/lib/geoutils'
import { z } from 'zod'

const trackLocationSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  sessionId: z.string().uuid('Invalid session ID'),
  latitude: z.number(),
  longitude: z.number()
})

// POST: Process student live coordinates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = trackLocationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { studentId, sessionId, latitude, longitude } = parsed.data

    // 1. Fetch classroom coordinates
    const session = await runWithRetry(() => db.session.findUnique({
      where: { id: sessionId }
    }))

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify session active
    const isExpired = new Date(session.endTime).getTime() < Date.now() || !session.isActive
    if (isExpired) {
      // Mark student offline in the attendance table
      await runWithRetry(() => db.attendance.updateMany({
        where: { sessionId, studentId },
        data: { status: 'Offline' }
      }))
      return NextResponse.json({ error: 'This attendance session has ended', sessionEnded: true }, { status: 400 })
    }

    // 2. Haversine distance computation in meters
    const distance = getDistanceInMeters(
      session.latitude,
      session.longitude,
      latitude,
      longitude
    )

    const insideRadius = distance <= session.radius

    // 3. Upsert student's coordinate history
    await runWithRetry(() => db.locationUpdate.upsert({
      where: { studentId },
      update: {
        latitude,
        longitude,
        insideRadius,
        lastSeen: new Date()
      },
      create: {
        sessionId,
        studentId,
        latitude,
        longitude,
        insideRadius
      }
    }))

    // 4. Update attendance status to Inside/Outside based on current boundary location
    await runWithRetry(() => db.attendance.updateMany({
      where: { sessionId, studentId },
      data: {
        status: insideRadius ? 'Inside' : 'Outside'
      }
    }))

    return NextResponse.json({
      success: true,
      insideRadius,
      distance: Math.round(distance),
      radius: session.radius
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
