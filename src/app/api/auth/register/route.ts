import { NextRequest, NextResponse } from 'next/server'
import { db, runWithRetry } from '@/lib/db'
import bcrypt from 'bcrypt'
import { signToken } from '@/lib/jwt'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { name, email, password } = parsed.data

    // Verify unique email
    const existing = await runWithRetry(() => db.admin.findUnique({
      where: { email }
    }))

    if (existing) {
      return NextResponse.json({ error: 'Email already exists. Please login instead.' }, { status: 400 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Save Admin
    const admin = await runWithRetry(() => db.admin.create({
      data: {
        name,
        email,
        passwordHash
      }
    }))

    // Sign JWT authentication token
    const token = signToken({
      id: admin.id,
      email: admin.email,
      name: admin.name
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name
      }
    })

    // Set HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
