import { NextRequest, NextResponse } from 'next/server'
import { db, runWithRetry } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'



export async function GET(request: NextRequest) {
  try {
    

    const token = request.cookies.get('token')?.value
    const admin = token ? verifyToken(token) : null
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    

    const cutoff = new Date(Date.now() - 30000)
    
    

    const offlineLocs = await runWithRetry(() => db.attendance.findMany({
      where: {
        sessionId,
        status: { not: 'Offline' },
        student: {
          locationUpdate: {
            lastSeen: { lt: cutoff }
          }
        }
      }
    }))

    

    const offlineNoLocs = await runWithRetry(() => db.attendance.findMany({
      where: {
        sessionId,
        status: { not: 'Offline' },
        joinedAt: { lt: cutoff },
        student: {
          locationUpdate: null
        }
      }
    }))

    const allOfflineIds = [...offlineLocs.map(a => a.id), ...offlineNoLocs.map(a => a.id)]
    if (allOfflineIds.length > 0) {
      await runWithRetry(() => db.attendance.updateMany({
        where: { id: { in: allOfflineIds } },
        data: { status: 'Offline' }
      }))
    }

    

    const students = await runWithRetry(() => db.student.findMany({
      where: { sessionId }
    }))

    

    const locations = await runWithRetry(() => db.locationUpdate.findMany({
      where: { sessionId }
    }))

    

    const attendance = await runWithRetry(() => db.attendance.findMany({
      where: { sessionId }
    }))

    return NextResponse.json({
      admin: { name: admin.name, email: admin.email },
      students,
      locations,
      attendance
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
