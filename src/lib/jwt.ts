import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'classtrack-default-super-secret-key-change-me'

export interface AdminJwtPayload {
  id: string
  email: string
  name: string
}

/**
 * Signs a JWT token for the admin session.
 */
export function signToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Verifies a JWT token and returns the decoded payload if valid.
 */
export function verifyToken(token: string): AdminJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminJwtPayload
  } catch (err) {
    return null
  }
}
