/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Logout API Route
 * Destroys the user's session and clears cookies.
 * Supports both GET (redirect) and POST (JSON response) methods.
 */

import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/session'

/**
 * GET /api/auth/logout
 * Logs out user and redirects to home page.
 */
export async function GET() {
  await destroySession()
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/`)
}

/**
 * POST /api/auth/logout
 * Logs out user and returns JSON success response.
 */
export async function POST() {
  await destroySession()
  return NextResponse.json({ success: true })
}
