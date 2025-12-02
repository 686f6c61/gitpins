/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Session Module
 * Handles user session management using JWT tokens stored in HTTP-only cookies.
 * Also manages OAuth state and CSRF protection tokens.
 */

import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

// Cookie names for different purposes
const SESSION_COOKIE = 'gitpins_session'    // JWT session token
const STATE_COOKIE = 'gitpins_oauth_state'  // OAuth state for CSRF protection
const CSRF_COOKIE = 'gitpins_csrf'          // CSRF token for form submissions

/**
 * Session data stored in the JWT token.
 * Note: accessToken is NOT stored here for security - it's encrypted in the database.
 */
export interface Session {
  userId: string
  githubId: number
  username: string
  isAdmin: boolean
}

interface JWTPayload {
  userId: string
  githubId: number
  username: string
  isAdmin: boolean
  iat: number
  exp: number
}

function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return new TextEncoder().encode(secret)
}

// Encode session as JWT
async function encodeSession(session: Session): Promise<string> {
  const secret = getJWTSecret()

  const jwt = await new SignJWT({
    userId: session.userId,
    githubId: session.githubId,
    username: session.username,
    isAdmin: session.isAdmin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)

  return jwt
}

// Decode and verify JWT session
async function decodeSession(token: string): Promise<Session | null> {
  try {
    const secret = getJWTSecret()
    const { payload } = await jwtVerify(token, secret)

    const jwtPayload = payload as unknown as JWTPayload

    return {
      userId: jwtPayload.userId,
      githubId: jwtPayload.githubId,
      username: jwtPayload.username,
      isAdmin: jwtPayload.isAdmin,
    }
  } catch {
    return null
  }
}

// Get current session
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE)

  if (!sessionCookie?.value) {
    return null
  }

  return decodeSession(sessionCookie.value)
}

// Create session
export async function createSession(session: Session): Promise<void> {
  const cookieStore = await cookies()
  const token = await encodeSession(session)

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
}

// Destroy session
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  cookieStore.delete(CSRF_COOKIE)
}

// Generate OAuth state
export async function generateOAuthState(): Promise<string> {
  const state = crypto.randomUUID()
  const cookieStore = await cookies()

  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  return state
}

// Verify OAuth state
export async function verifyOAuthState(state: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stateCookie = cookieStore.get(STATE_COOKIE)

  if (!stateCookie?.value || stateCookie.value !== state) {
    return false
  }

  cookieStore.delete(STATE_COOKIE)
  return true
}

// CSRF Protection
export async function generateCSRFToken(): Promise<string> {
  const token = crypto.randomUUID()
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60, // 1 hour
    path: '/',
  })

  return token
}

export async function verifyCSRFToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const csrfCookie = cookieStore.get(CSRF_COOKIE)

  if (!csrfCookie?.value || csrfCookie.value !== token) {
    return false
  }

  return true
}

export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies()
  const csrfCookie = cookieStore.get(CSRF_COOKIE)
  return csrfCookie?.value || null
}
