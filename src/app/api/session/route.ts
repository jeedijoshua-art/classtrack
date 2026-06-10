import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Fetch session info
// Admins get all active/recent sessions.
// Students get a specific session details.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')

    if (sessionId) {
      // Fetch specific session
      const { data: session, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error || !session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      // Check if session is expired
      const isExpired = new Date(session.end_time).getTime() < Date.now()
      return NextResponse.json({ ...session, isExpired })
    }

    // Otherwise, fetch authenticated user's sessions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('admin_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sessions })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Create a new session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { session_name, classroom_name, radius, latitude, longitude, duration } = body

    if (!session_name || !classroom_name || !radius || latitude === undefined || longitude === undefined || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const startTime = new Date()
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000)

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        admin_id: user.id,
        session_name,
        classroom_name,
        radius: parseInt(radius),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH: Edit radius or duration of an active session
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, radius, duration, end_now } = body

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const updateData: any = {}

    if (radius !== undefined) {
      updateData.radius = parseInt(radius)
    }

    if (end_now) {
      updateData.end_time = new Date().toISOString()
    } else if (duration !== undefined) {
      // Extend session from start_time or add to current end_time
      const { data: currentSession } = await supabase
        .from('sessions')
        .select('start_time')
        .eq('id', id)
        .single()
      
      if (currentSession) {
        const baseTime = new Date(currentSession.start_time).getTime()
        updateData.end_time = new Date(baseTime + duration * 60 * 1000).toISOString()
      }
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', id)
      .eq('admin_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE: End session (or delete it)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Instead of deleting, we can update end_time to now (Ending it)
    const { error } = await supabase
      .from('sessions')
      .update({ end_time: new Date().toISOString() })
      .eq('id', id)
      .eq('admin_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
