import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { fetchFootballFeed, FootballRequestError, userTimeZone } from '../api/football.js'
import { adaptFallbackMatch, adaptFeedFixture, groupByLeague, selectFeaturedMatches } from '../adapters/footballAdapter.js'
import { CACHE_STORAGE_KEY, FEED_REFRESH_IDLE_MS, FEED_REFRESH_LIVE_MS } from '../config/football.js'
import { matches as fallbackMatches } from '../data/matches.js'

const matches = ref([])
const loading = ref(false)
const usingFallback = ref(true)
const lastUpdated = ref(null)
let refreshTimer = 0
let requestSerial = 0
let loopReady = false
let active = false

function fallbackList() {
  return fallbackMatches.map(adaptFallbackMatch)
}

function decorateFeatured(list) {
  return selectFeaturedMatches(list).map((match, index) => ({
    ...match,
    featured: true,
    banner: match.banner || `banner-0${index + 1}.jpg`,
  }))
}

function refreshDelay(list) {
  return list.some((match) => match.status === 'LIVE' || match.status === 'HT') ? FEED_REFRESH_LIVE_MS : FEED_REFRESH_IDLE_MS
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
    if (!parsed || !Array.isArray(parsed.matches) || !parsed.matches.every(isMatch)) throw new Error('invalid cache')
    return parsed
  } catch {
    clearCache()
    return null
  }
}

function writeCache(payload) {
  try { localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload)) } catch { /* quota or private mode */ }
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
  if (cache?.updatedAt && cache.matches?.length) {
    matches.value = cache.matches
    usingFallback.value = false
    lastUpdated.value = cache.updatedAt || cache.cachedAt
    return
  }
  applyFallback()
}

function schedule(delay) {
  clearTimeout(refreshTimer)
  if (!active || !import.meta.env?.VITE_FOOTBALL_FEED_URL) return
  refreshTimer = setTimeout(() => { refresh() }, Math.max(1000, delay))
}

async function refresh() {
  if (loading.value) return
  if (!import.meta.env?.VITE_FOOTBALL_FEED_URL) {
    warn('missing-feed')
    return
  }
  const serial = ++requestSerial
  loading.value = true
  try {
    const result = await fetchFootballFeed()
    if (serial !== requestSerial) return
    const ready = result.updatedAt || result.fixtures.length
    if (!ready) {
      if (usingFallback.value) applyFallback()
      return
    }
    const visible = result.fixtures.map(adaptFeedFixture).filter(Boolean)
    matches.value = visible
    usingFallback.value = false
    lastUpdated.value = result.updatedAt || Date.now()
    writeCache({ matches: visible, cachedAt: Date.now(), updatedAt: lastUpdated.value })
    if (active) schedule(refreshDelay(visible))
  } catch (error) {
    if (serial !== requestSerial) return
    warn(error instanceof FootballRequestError ? error.code : 'failed')
    if (usingFallback.value) applyFallback()
  } finally {
    if (serial === requestSerial) loading.value = false
  }
}

function ensure() {
  if (loopReady) return
  loopReady = true
  showStoredOrFallback()
  refresh()
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
  const timeZone = userTimeZone()
  const groups = computed(() => groupByLeague(matches.value, timeZone))
  const featured = computed(() => decorateFeatured(groups.value.flatMap((group) => group.matches)))
  return { matches, groups, featured, loading, usingFallback, lastUpdated, refresh }
}
