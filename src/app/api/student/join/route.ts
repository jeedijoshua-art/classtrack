import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { name, roll_number, department, session_id } = body

    if (!name || !roll_number || !department || !session_id) {
      return NextResponse.json({ error: 'Missing required student fields' }, { status: 400 })
    }

    // 1. Verify active session
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const isExpired = new Date(session.end_time).getTime() < Date.now()
    if (isExpired) {
      return NextResponse.json({ error: 'This attendance session has already ended' }, { status: 400 })
    }

    // Extract client IP and User Agent
    // Check multiple headers for IP address
    const xForwardedFor = request.headers.get('x-forwarded-for')
    let ipAddress = '127.0.0.1'
    if (xForwardedFor) {
      ipAddress = xForwardedFor.split(',')[0].trim()
    } else {
      ipAddress = request.headers.get('x-real-ip') || '127.0.0.1'
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown User Agent'

    // 2. Check if student already exists in this session (re-joining case)
    const { data: existingStudent, error: findErr } = await supabase
      .from('students')
      .select('*')
      .eq('session_id', session_id)
      .eq('roll_number', roll_number)
      .maybeSingle()

    let student = existingStudent

    if (!student) {
      // 3. Register the student
      const { data: newStudent, error: insertStudentErr } = await supabase
        .from('students')
        .insert({
          session_id,
          name,
          roll_number,
          department
        })
        .select()
        .single()

      if (insertStudentErr) {
        return NextResponse.json({ error: insertStudentErr.message }, { status: 500 })
      }
      student = newStudent
    }

    // 4. Create or update attendance record (upsert)
    const { error: attendanceErr } = await supabase
      .from('attendance')
      .upsert({
        session_id,
        student_id: student.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'Active',
        joined_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,student_id'
      })

    if (attendanceErr) {
      return NextResponse.json({ error: attendanceErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      student,
      session
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
