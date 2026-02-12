import jwt from 'jsonwebtoken'
import { UserRole } from '@prisma/client'

const JWT_EXPIRES_IN = '7d'

// Lazy load and validate JWT_SECRET only when needed (runtime, not build time)
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long')
  }

  return secret
}

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  branchId?: string | null
  iat?: number
  exp?: number
}

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJWTSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  })
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, getJWTSecret()) as JWTPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch {
    return null
  }
}
