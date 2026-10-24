import { API_BASE, REQUEST_TIMEOUT_MS } from '../config/football'

export class FootballRequestError extends Error {
  constructor(code) {
    super(code)
    this.name = 'FootballRequestError'
    this.code = code
  }
}

export function userTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function todayInTimeZone(timeZone) {
  const zone = timeZone || 'UTC'
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  }
}

function hasApiErrors(errors) {
  if (!errors) return false
  if (Array.isArray(errors)) return errors.length > 0
  if (typeof errors === 'object') return Object.keys(errors).length > 0
  return Boolean(errors)
}

function errorText(errors) {
  if (!errors) return ''
  if (Array.isArray(errors)) return errors.join(' ')
  if (typeof errors === 'object') return Object.values(errors).join(' ')
  return String(errors)
}

export async function fetchTodayFixtures() {
  const key = import.meta.env?.VITE_API_FOOTBALL_KEY
  if (!key) throw new FootballRequestError('missing-key')

  const timezone = userTimeZone()
  const date = todayInTimeZone(timezone)
  const url = new URL('/fixtures', API_BASE)
  url.searchParams.set('date', date)
  url.searchParams.set('timezone', timezone)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'x-apisports-key': key },
      signal: controller.signal,
    })
    if (response.status === 429) throw new FootballRequestError('rate-limit')
    if (!response.ok) throw new FootballRequestError('http')

    let payload
    try {
      payload = await response.json()
    } catch {
      throw new FootballRequestError('invalid')
    }

    if (hasApiErrors(payload?.errors)) {
      const text = errorText(payload.errors).toLowerCase()
      if (text.includes('rate') || text.includes('request limit') || text.includes('too many')) {
        throw new FootballRequestError('rate-limit')
      }
      throw new FootballRequestError('api')
    }
    if (!Array.isArray(payload?.response)) throw new FootballRequestError('invalid')
    return { fixtures: payload.response, date, timezone, fetchedAt: Date.now() }
  } catch (error) {
    if (error instanceof FootballRequestError) throw error
    if (error?.name === 'AbortError') throw new FootballRequestError('timeout')
    throw new FootballRequestError('network')
  } finally {
    clearTimeout(timer)
  }
}
