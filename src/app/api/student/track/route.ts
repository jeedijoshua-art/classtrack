import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDistanceInMeters } from '@/lib/geoutils'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { student_id, session_id, latitude, longitude } = body

    if (!student_id || !session_id || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Missing coordinates or student ID' }, { status: 400 })
    }

    // 1. Fetch classroom location and radius from the session
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('latitude, longitude, radius, end_time')
      .eq('id', session_id)
      .single()

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if session has expired
    const isExpired = new Date(session.end_time).getTime() < Date.now()
    if (isExpired) {
      // Set attendance status to Offline since session has ended
      await supabase
        .from('attendance')
        .update({ status: 'Offline' })
        .eq('session_id', session_id)
        .eq('student_id', student_id)

      return NextResponse.json({ error: 'Attendance session has ended', sessionEnded: true }, { status: 400 })
    }

    // 2. Calculate distance in meters using Haversine formula
    const distance = getDistanceInMeters(
      session.latitude,
      session.longitude,
      parseFloat(latitude),
      parseFloat(longitude)
    )

    const insideRadius = distance <= session.radius

    // 3. Upsert student's location
    const now = new Date().toISOString()
    const { data: locationData, error: locationErr } = await supabase
      .from('locations')
      .upsert({
        student_id,
        session_id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        last_seen: now,
        inside_radius: insideRadius
      }, {
        onConflict: 'student_id'
      })
      .select()
      .single()

    if (locationErr) {
      return NextResponse.json({ error: locationErr.message }, { status: 500 })
    }

    // 4. Set attendance status to Active since we just got a tracking heartbeat
    await supabase
      .from('attendance')
      .update({ status: 'Active' })
      .eq('session_id', session_id)
      .eq('student_id', student_id)

    return NextResponse.json({
      success: true,
      inside_radius: insideRadius,
      distance: Math.round(distance),
      radius: session.radius
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
