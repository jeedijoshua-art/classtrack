import { NextRequest, NextResponse } from 'next/server'
import { db, runWithRetry } from '@/lib/db'
import { getDistanceInMeters } from '@/lib/geoutils'
import { z } from 'zod'

const trackLocationSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  sessionId: z.string().uuid('Invalid session ID'),
  latitude: z.number(),
  longitude: z.number(),
  status: z.enum(['Inside', 'Warning', 'Outside']).optional()
})



export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = trackLocationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { studentId, sessionId, latitude, longitude, status } = parsed.data

    

    const session = await runWithRetry(() => db.session.findUnique({
      where: { id: sessionId }
    }))

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    

    const isExpired = new Date(session.endTime).getTime() < Date.now() || !session.isActive
    if (isExpired) {
      

      await runWithRetry(() => db.attendance.updateMany({
        where: { sessionId, studentId },
        data: { status: 'Offline' }
      }))
      return NextResponse.json({ error: 'This attendance session has ended', sessionEnded: true }, { status: 400 })
    }

    

    const distance = getDistanceInMeters(
      session.latitude,
      session.longitude,
      latitude,
      longitude
    )

    

    let computedStatus = 'Inside'
    if (distance > session.radius && distance <= session.radius + 10) computedStatus = 'Warning'
    else if (distance > session.radius + 10) computedStatus = 'Outside'

    const finalStatus = status || computedStatus
    const insideRadius = finalStatus === 'Inside' || finalStatus === 'Warning'

    

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

    

    await runWithRetry(() => db.attendance.updateMany({
      where: { sessionId, studentId },
      data: {
        status: finalStatus
      }
    }))

    return NextResponse.json({
      success: true,
      status: finalStatus,
      insideRadius,
      distance: Math.round(distance),
      radius: session.radius
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
