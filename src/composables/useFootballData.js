import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { fetchTodayFixtures, FootballRequestError, todayInTimeZone, userTimeZone } from '../api/football'
import { adaptFallbackMatch, adaptFixture, buildLeagues, capMatches } from '../adapters/footballAdapter'
import { CACHE_STORAGE_KEY, CACHE_TTL_IDLE_MS, CACHE_TTL_LIVE_MS, MAX_SESSION_REFRESHES, REFRESH_BLOCK_KEY, REFRESH_COUNT_KEY } from '../config/football'
import { matches as fallbackMatches } from '../data/matches'

const matches = ref([])
const loading = ref(false)
const usingFallback = ref(true)
const lastUpdated = ref(null)
let refreshTimer = 0
let requestSerial = 0
let loopReady = false
let active = false

function fallbackList() {
  return capMatches(fallbackMatches.map(adaptFallbackMatch))
}

function ttlFor(list) {
  return list.some((match) => match.status === 'LIVE' || match.status === 'HT') ? CACHE_TTL_LIVE_MS : CACHE_TTL_IDLE_MS
}

function isMatch(value) {
  return Boolean(value && typeof value.homeTeam === 'string' && typeof value.awayTeam === 'string' && typeof value.status === 'string')
}

function clearCache() {
  try { localStorage.removeItem(CACHE_STORAGE_KEY) } catch { /* storage unavailable */ }
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.matches) || !parsed.matches.every(isMatch) || !parsed.date || !parsed.cachedAt) {
      throw new Error('invalid cache')
    }
    return parsed
  } catch {
    clearCache()
    return null
  }
}

function writeCache(payload) {
  try { localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload)) } catch { /* quota or private mode */ }
}

function sessionFlag(key) {
  try { return sessionStorage.getItem(key) } catch { return null }
}

function sessionSet(key, value) {
  try { sessionStorage.setItem(key, value) } catch { /* storage unavailable */ }
}

function refreshCount() {
  const value = Number(sessionFlag(REFRESH_COUNT_KEY) || 0)
  return Number.isFinite(value) ? value : 0
}

function sessionBlocked() {
  return sessionFlag(REFRESH_BLOCK_KEY) === '1'
}

function blockSession() {
  sessionSet(REFRESH_BLOCK_KEY, '1')
  clearTimeout(refreshTimer)
}

function warn(code) {
  if (import.meta.env?.DEV) console.warn(`HOXF fixtures: ${code}`)
}

function applyFallback() {
  matches.value = fallbackList()
  usingFallback.value = true
  lastUpdated.value = null
}

function showStoredOrFallback() {
  const cache = readCache()
  const today = todayInTimeZone(userTimeZone())
  if (cache && cache.date === today) {
    matches.value = cache.matches
    usingFallback.value = false
    lastUpdated.value = cache.cachedAt
    return { cache, fresh: Date.now() - cache.cachedAt < ttlFor(cache.matches) }
  }
  applyFallback()
  return { cache: null, fresh: false }
}

function schedule(delay) {
  clearTimeout(refreshTimer)
  if (!active || !import.meta.env?.VITE_API_FOOTBALL_KEY || sessionBlocked() || refreshCount() >= MAX_SESSION_REFRESHES) return
  refreshTimer = setTimeout(() => { refresh() }, Math.max(1000, delay))
}

async function refresh() {
  if (sessionBlocked() || refreshCount() >= MAX_SESSION_REFRESHES || loading.value) return
  if (!import.meta.env?.VITE_API_FOOTBALL_KEY) {
    warn('missing-key')
    return
  }

  const serial = ++requestSerial
  loading.value = true
  sessionSet(REFRESH_COUNT_KEY, String(refreshCount() + 1))
  try {
    const result = await fetchTodayFixtures()
    if (serial !== requestSerial) return
    const visible = capMatches(result.fixtures.map(adaptFixture).filter(Boolean))
    const cachedAt = Date.now()
    matches.value = visible
    usingFallback.value = false
    lastUpdated.value = cachedAt
    writeCache({ matches: visible, cachedAt, date: result.date })
    if (active) schedule(ttlFor(visible))
  } catch (error) {
    if (serial !== requestSerial) return
    const code = error instanceof FootballRequestError ? error.code : 'failed'
    warn(code)
    if (code === 'rate-limit' || code === 'missing-key') blockSession()
    if (usingFallback.value) applyFallback()
  } finally {
    if (serial === requestSerial) loading.value = false
  }
}

function ensure() {
  if (loopReady) return
  loopReady = true
  const stored = showStoredOrFallback()
  if (stored.fresh) schedule(ttlFor(stored.cache.matches) - (Date.now() - stored.cache.cachedAt))
  else refresh()
}

export function useFootballData() {
  if (!matches.value.length) showStoredOrFallback()
  onMounted(() => {
    active = true
    ensure()
  })
  onBeforeUnmount(() => {
    active = false
    loopReady = false
    clearTimeout(refreshTimer)
  })
  const featured = computed(() => matches.value.filter((match) => match.featured))
  const leagues = computed(() => buildLeagues(matches.value))
  return { matches, featured, leagues, loading, usingFallback, lastUpdated, refresh }
}
