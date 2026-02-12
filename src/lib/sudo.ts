/**
 * GitPins - Sudo Mode Helpers
 * Provides short-lived re-auth ("sudo") checks for destructive actions.
 *
 * We use cookies so we don't need to change the long-lived session JWT.
 */

import { cookies } from 'next/headers'

const SUDO_COOKIE = 'gitpins_sudo'
const SUDO_INTENT_COOKIE = 'gitpins_sudo_intent'

// Keep this small: long enough to complete a dangerous action, short enough to reduce risk.
const SUDO_TTL_SECONDS = 10 * 60

function nowMs(): number {
  return Date.now()
}

export async function setSudoIntent(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SUDO_INTENT_COOKIE, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes to complete OAuth round-trip
    path: '/',
  })
}

export async function consumeSudoIntent(): Promise<boolean> {
  const cookieStore = await cookies()
  const intent = cookieStore.get(SUDO_INTENT_COOKIE)?.value
  cookieStore.delete(SUDO_INTENT_COOKIE)
  return intent === '1'
}

export async function setSudoCookie(): Promise<{ untilMs: number }> {
  const cookieStore = await cookies()
  const untilMs = nowMs() + SUDO_TTL_SECONDS * 1000

  cookieStore.set(SUDO_COOKIE, String(untilMs), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SUDO_TTL_SECONDS,
    path: '/',
  })

  return { untilMs }
}

export async function getSudoUntilMs(): Promise<number | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SUDO_COOKIE)?.value
  if (!raw) return null

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return null
  return parsed
}

export async function isSudoActive(): Promise<boolean> {
  const untilMs = await getSudoUntilMs()
  if (!untilMs) return false
  return untilMs > nowMs()
}

export async function clearSudoCookies(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SUDO_COOKIE)
  cookieStore.delete(SUDO_INTENT_COOKIE)
}

export const sudo = {
  SUDO_TTL_SECONDS,
}

