import { NextRequest, NextResponse } from 'next/server'
import { db, runWithRetry } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'
import { z } from 'zod'

const joinSessionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  rollNumber: z.string().min(1, 'Roll number is required'),
  department: z.string().min(1, 'Department is required'),
  sessionId: z.string().uuid('Invalid session ID')
})



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

    const attendance = await runWithRetry(() => db.attendance.findMany({
      where: { sessionId },
      include: {
        student: true
      },
      orderBy: { joinedAt: 'desc' }
    }))

    return NextResponse.json({ attendance })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}



export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = joinSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { name, rollNumber, department, sessionId } = parsed.data

    

    const session = await runWithRetry(() => db.session.findUnique({
      where: { id: sessionId }
    }))

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const isExpired = new Date(session.endTime).getTime() < Date.now() || !session.isActive
    if (isExpired) {
      return NextResponse.json({ error: 'This attendance session has already ended' }, { status: 400 })
    }

    

    const xForwardedFor = request.headers.get('x-forwarded-for')
    let ipAddress = '127.0.0.1'
    if (xForwardedFor) {
      ipAddress = xForwardedFor.split(',')[0].trim()
    } else {
      ipAddress = request.headers.get('x-real-ip') || '127.0.0.1'
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown User Agent'
    const { deviceType, browserInfo } = parseUserAgent(userAgent)

    

    const existingStudent = await runWithRetry(() => db.student.findFirst({
      where: {
        sessionId,
        rollNumber
      }
    }))

    if (existingStudent) {
      return NextResponse.json(
        { error: `A student with roll number "${rollNumber}" has already checked in to this session.` },
        { status: 400 }
      )
    }

    

    const student = await runWithRetry(() => db.student.create({
      data: {
        sessionId,
        name,
        rollNumber,
        department
      }
    }))

    

    const attendance = await runWithRetry(() => db.attendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: student.id
        }
      },
      update: {
        ipAddress,
        userAgent,
        deviceType,
        browserInfo,
        status: 'Inside',
        joinedAt: new Date()
      },
      create: {
        sessionId,
        studentId: student.id,
        ipAddress,
        userAgent,
        deviceType,
        browserInfo,
        status: 'Inside'
      }
    }))

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

function parseUserAgent(ua: string) {
  let deviceType = 'Desktop'
  let browserInfo = 'Unknown'

  const uaLower = ua.toLowerCase()
  if (/mobi|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(uaLower)) {
    if (/ipad|tablet/i.test(uaLower)) {
      deviceType = 'Tablet'
    } else {
      deviceType = 'Mobile'
    }
  }

  if (/chrome|crios/i.test(ua)) {
    if (/edg/i.test(ua)) {
      browserInfo = 'Edge'
    } else if (/opr/i.test(ua)) {
      browserInfo = 'Opera'
    } else {
      browserInfo = 'Chrome'
    }
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browserInfo = 'Safari'
  } else if (/firefox|fxios/i.test(ua)) {
    browserInfo = 'Firefox'
  } else if (/msie|trident/i.test(ua)) {
    browserInfo = 'Internet Explorer'
  }

  return { deviceType, browserInfo }
}
