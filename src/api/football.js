import { REQUEST_TIMEOUT_MS } from '../config/football.js'

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

export async function fetchFootballFeed() {
  const feedUrl = import.meta.env?.VITE_FOOTBALL_FEED_URL
  if (!feedUrl) throw new FootballRequestError('missing-feed')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(feedUrl, { method: 'GET', signal: controller.signal })
    if (!response.ok) throw new FootballRequestError('http')
    let payload
    try {
      payload = await response.json()
    } catch {
      throw new FootballRequestError('invalid')
    }
    if (!payload || !Array.isArray(payload.fixtures)) throw new FootballRequestError('invalid')
    return { fixtures: payload.fixtures, updatedAt: payload.updatedAt || null }
  } catch (error) {
    if (error instanceof FootballRequestError) throw error
    if (error?.name === 'AbortError') throw new FootballRequestError('timeout')
    throw new FootballRequestError('network')
  } finally {
    clearTimeout(timer)
  }
}
