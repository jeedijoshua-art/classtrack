import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'
import { z } from 'zod'

const joinSessionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  rollNumber: z.string().min(1, 'Roll number is required'),
  department: z.string().min(1, 'Department is required'),
  sessionId: z.string().uuid('Invalid session ID')
})

// GET: Fetch attendance records for a session (Admin-only)
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

    const attendance = await db.attendance.findMany({
      where: { sessionId },
      include: {
        student: true
      },
      orderBy: { joinedAt: 'desc' }
    })

    return NextResponse.json({ attendance })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Student joins session and marks attendance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = joinSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { name, rollNumber, department, sessionId } = parsed.data

    // 1. Verify classroom session status
    const session = await db.session.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const isExpired = new Date(session.endTime).getTime() < Date.now() || !session.isActive
    if (isExpired) {
      return NextResponse.json({ error: 'This attendance session has already ended' }, { status: 400 })
    }

    // Capture student IP and User Agent
    const xForwardedFor = request.headers.get('x-forwarded-for')
    let ipAddress = '127.0.0.1'
    if (xForwardedFor) {
      ipAddress = xForwardedFor.split(',')[0].trim()
    } else {
      ipAddress = request.headers.get('x-real-ip') || '127.0.0.1'
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown User Agent'

    // 2. Check if student already joined this session (recheck-in case)
    let student = await db.student.findFirst({
      where: {
        sessionId,
        rollNumber
      }
    })

    if (!student) {
      // Create new student profile
      student = await db.student.create({
        data: {
          sessionId,
          name,
          rollNumber,
          department
        }
      })
    }

    // 3. Upsert the attendance log
    const attendance = await db.attendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: student.id
        }
      },
      update: {
        ipAddress,
        userAgent,
        status: 'Active',
        joinedAt: new Date()
      },
      create: {
        sessionId,
        studentId: student.id,
        ipAddress,
        userAgent,
        status: 'Active'
      }
    })

    return NextResponse.json({
      success: true,
      student,
      attendance,
      session
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
