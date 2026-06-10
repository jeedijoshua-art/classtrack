import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'

// GET: Fetch classroom monitoring metrics for dashboard initialization
export async function GET(request: NextRequest) {
  try {
    // Verify admin token
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

    // 1. Fetch Students
    const students = await db.student.findMany({
      where: { sessionId }
    })

    // 2. Fetch Locations
    const locations = await db.locationUpdate.findMany({
      where: { sessionId }
    })

    // 3. Fetch Attendance logs
    const attendance = await db.attendance.findMany({
      where: { sessionId }
    })

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
