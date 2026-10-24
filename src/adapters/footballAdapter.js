import {
  EXCLUDED_API_STATUSES,
  FALLBACK_LEAGUE_IDS,
  FEATURED_LEAGUE_IDS,
  FEATURED_LEAGUE_NAMES,
  FINISHED_API_STATUSES,
  LIVE_API_STATUSES,
  MAX_LEAGUES,
  MAX_MATCHES_PER_LEAGUE,
  MAX_VISIBLE_MATCHES,
  UPCOMING_API_STATUSES,
} from '../config/football.js'

function kickoffTime(match) {
  const value = Date.parse(match?.kickoffAt || '')
  return Number.isFinite(value) ? value : 0
}

export function mapApiStatus(short) {
  if (LIVE_API_STATUSES.includes(short)) return 'LIVE'
  if (short === 'HT') return 'HT'
  if (UPCOMING_API_STATUSES.includes(short)) return 'UPCOMING'
  if (FINISHED_API_STATUSES.includes(short)) return 'FINISHED'
  return ''
}

function minuteLabel(status, elapsed, extra) {
  if (status !== 'LIVE' || !Number.isFinite(elapsed)) return ''
  return extra ? `${elapsed}+${extra}'` : `${elapsed}'`
}

export function adaptFixture(fixture) {
  const info = fixture?.fixture
  const short = info?.status?.short || ''
  if (!info?.id || EXCLUDED_API_STATUSES.includes(short)) return null
  const status = mapApiStatus(short)
  if (!status) return null

  const scored = status === 'LIVE' || status === 'HT' || status === 'FINISHED'
  const homeGoals = fixture.goals?.home
  const awayGoals = fixture.goals?.away
  return {
    id: info.id,
    externalId: info.id,
    leagueId: fixture.league?.id ?? null,
    league: fixture.league?.name || '',
    leagueLogo: fixture.league?.logo || '',
    country: fixture.league?.country || '',
    homeTeam: fixture.teams?.home?.name || '',
    homeTeamId: fixture.teams?.home?.id ?? null,
    homeLogo: fixture.teams?.home?.logo || '',
    awayTeam: fixture.teams?.away?.name || '',
    awayTeamId: fixture.teams?.away?.id ?? null,
    awayLogo: fixture.teams?.away?.logo || '',
    homeScore: scored && homeGoals !== null && homeGoals !== undefined ? homeGoals : null,
    awayScore: scored && awayGoals !== null && awayGoals !== undefined ? awayGoals : null,
    status,
    apiStatus: short,
    minute: minuteLabel(status, info.status?.elapsed, info.status?.extra),
    kickoff: '',
    kickoffAt: info.date || '',
    featured: false,
    source: 'api',
  }
}

export function adaptFeedFixture(item) {
  if (!item?.id || !item.homeTeam || !item.awayTeam) return null
  const short = item.apiStatus || ''
  if (EXCLUDED_API_STATUSES.includes(short)) return null
  const status = mapApiStatus(short)
  if (!status) return null
  const elapsed = Number.isFinite(item.elapsed) ? item.elapsed : null
  const extra = Number.isFinite(item.extra) ? item.extra : null
  const scored = status === 'LIVE' || status === 'HT' || status === 'FINISHED'
  return {
    id: item.id,
    externalId: item.id,
    leagueId: item.leagueId ?? null,
    league: item.league || '',
    leagueLogo: item.leagueLogo || '',
    country: item.country || '',
    homeTeam: item.homeTeam,
    homeTeamId: item.homeTeamId ?? null,
    homeLogo: item.homeLogo || '',
    awayTeam: item.awayTeam,
    awayTeamId: item.awayTeamId ?? null,
    awayLogo: item.awayLogo || '',
    homeScore: scored && item.homeScore !== null && item.homeScore !== undefined ? item.homeScore : null,
    awayScore: scored && item.awayScore !== null && item.awayScore !== undefined ? item.awayScore : null,
    status,
    apiStatus: short,
    minute: minuteLabel(status, elapsed, extra),
    kickoff: '',
    kickoffAt: item.kickoffAt || '',
    featured: false,
    source: 'feed',
  }
}

function calendarDay(date, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  }
}

export function isLocalToday(match, timeZone = 'UTC', now = new Date()) {
  if (!match?.kickoffAt) return true
  const date = new Date(match.kickoffAt)
  if (Number.isNaN(date.getTime())) return true
  return calendarDay(date, timeZone) === calendarDay(now, timeZone)
}

export function groupByLeague(matches, timeZone = 'UTC', now = new Date()) {
  const buckets = new Map()
  matches.filter((match) => isLocalToday(match, timeZone, now)).forEach((match) => {
    const key = match.leagueId ?? match.league
    if (!buckets.has(key)) {
      buckets.set(key, {
        id: key,
        name: match.league,
        logo: match.leagueLogo || '',
        country: match.country || '',
        matches: [],
      })
    }
    const group = buckets.get(key)
    group.matches.push(match)
    if (!group.logo && match.leagueLogo) group.logo = match.leagueLogo
    if (!group.country && match.country) group.country = match.country
  })
  const rank = (id) => {
    const index = FEATURED_LEAGUE_IDS.indexOf(id)
    return index === -1 ? FEATURED_LEAGUE_IDS.length : index
  }
  return [...buckets.values()]
    .map((group) => ({ ...group, matches: sortMatches(group.matches).slice(0, MAX_MATCHES_PER_LEAGUE) }))
    .sort((left, right) => rank(left.id) - rank(right.id) || left.name.localeCompare(right.name))
    .slice(0, MAX_LEAGUES)
}

function fallbackKickoffAt(kickoff) {
  const found = /^Tomorrow\s·\s(\d{2}):(\d{2})$/.exec(kickoff || '')
  if (!found) return ''
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(Number(found[1]), Number(found[2]), 0, 0)
  return date.toISOString()
}

export function adaptFallbackMatch(match) {
  const kickoffAt = fallbackKickoffAt(match.kickoff)
  return {
    id: match.id,
    externalId: match.id,
    leagueId: FALLBACK_LEAGUE_IDS[match.league] ?? null,
    league: match.league,
    leagueLogo: '',
    country: '',
    homeTeam: match.homeTeam,
    homeTeamId: null,
    homeLogo: '',
    awayTeam: match.awayTeam,
    awayTeamId: null,
    awayLogo: '',
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    apiStatus: match.status,
    minute: match.minute || '',
    kickoff: kickoffAt ? '' : (match.kickoff || ''),
    kickoffAt,
    featured: Boolean(match.featured),
    banner: match.banner || '',
    source: 'fallback',
  }
}

function byKickoff(left, right) {
  return kickoffTime(left) - kickoffTime(right)
}

export function sortMatches(matches) {
  const rank = { LIVE: 0, HT: 1, UPCOMING: 2, FINISHED: 3 }
  return [...matches].sort((left, right) => {
    const phase = (rank[left.status] ?? 9) - (rank[right.status] ?? 9)
    return phase || byKickoff(left, right)
  })
}

export function selectFeaturedMatches(matches) {
  const top = (match) => FEATURED_LEAGUE_IDS.includes(match.leagueId)
  const live = (match) => match.status === 'LIVE' || match.status === 'HT'
  const groups = [
    matches.filter((match) => live(match) && top(match)).sort(byKickoff),
    matches.filter((match) => live(match) && !top(match)).sort(byKickoff),
    matches.filter((match) => match.status === 'UPCOMING' && top(match)).sort(byKickoff),
    matches.filter((match) => match.status === 'UPCOMING' && !top(match)).sort(byKickoff),
    matches.filter((match) => match.status === 'FINISHED').sort((left, right) => byKickoff(right, left)),
  ]
  const picked = []
  const seen = new Set()
  for (const group of groups) {
    for (const match of group) {
      if (seen.has(match.id)) continue
      seen.add(match.id)
      picked.push(match)
      if (picked.length === 4) return picked
    }
  }
  return picked
}

export function capMatches(matches) {
  const featured = selectFeaturedMatches(matches)
  const featuredIds = new Set(featured.map((match) => match.id))
  const rest = sortMatches(matches).filter((match) => !featuredIds.has(match.id))
  return [...featured, ...rest].slice(0, MAX_VISIBLE_MATCHES).map((match) => {
    const index = featured.findIndex((item) => item.id === match.id)
    if (index === -1) return { ...match, featured: false, banner: '' }
    return { ...match, featured: true, banner: match.banner || `banner-0${index + 1}.jpg` }
  })
}

export function buildLeagues(matches) {
  const present = new Map()
  matches.forEach((match) => {
    if (match.leagueId != null && !present.has(match.leagueId)) present.set(match.leagueId, match.league)
  })
  const core = FEATURED_LEAGUE_IDS.map((id) => ({ id, name: present.get(id) || FEATURED_LEAGUE_NAMES[id] }))
  const extras = [...present.entries()]
    .filter(([id]) => !FEATURED_LEAGUE_IDS.includes(id))
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name))
  return [{ id: 'All', name: 'All' }, ...core, ...extras]
}
