import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'

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

    const students = await db.student.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ students })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
