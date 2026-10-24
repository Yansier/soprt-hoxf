import { detectLanguage } from '../src/i18n/index.js'
import { locales } from '../src/i18n/locales.js'
import { adaptFallbackMatch, adaptFixture, capMatches, selectFeaturedMatches } from '../src/adapters/footballAdapter.js'
import { matches } from '../src/data/matches.js'

const cases = [
  [['en-US'], 'en'],
  [['zh-CN'], 'zh-CN'],
  [['zh-SG'], 'zh-CN'],
  [['zh-HK', 'en-US'], 'zh-TW'],
  [['zh-MO'], 'zh-TW'],
  [['pt-BR'], 'pt'],
  [['de-DE'], 'de'],
  [['ja-JP'], 'ja'],
  [['ar-SA'], 'ar'],
  [['English'], 'en'],
  [['fr-FR', 'en'], 'fr'],
]
let failed = 0
for (const [input, expected] of cases) {
  const got = detectLanguage(input)
  if (got !== expected) {
    console.log('detect fail', input.join(','), got, expected)
    failed += 1
  }
}

const live = adaptFixture({
  fixture: { id: 10, date: '2026-10-24T20:00:00+08:00', status: { short: '2H', elapsed: 90, extra: 3 } },
  league: { id: 39, name: 'Premier League', country: 'England', logo: 'https://league' },
  teams: { home: { id: 1, name: 'Arsenal', logo: 'https://h' }, away: { id: 2, name: 'Chelsea', logo: 'https://a' } },
  goals: { home: 2, away: 1 },
})
if (live.status !== 'LIVE' || live.minute !== "90+3'" || live.homeScore !== 2) {
  console.log('live fail', live)
  failed += 1
}

const upcoming = adaptFixture({
  fixture: { id: 11, date: '2026-10-24T21:00:00+08:00', status: { short: 'NS' } },
  league: { id: 140, name: 'La Liga', logo: '' },
  teams: { home: { name: 'Barcelona', logo: '' }, away: { name: 'Valencia', logo: '' } },
  goals: { home: null, away: null },
})
if (upcoming.status !== 'UPCOMING' || upcoming.homeScore !== null) {
  console.log('upcoming fail', upcoming)
  failed += 1
}

if (adaptFixture({ fixture: { id: 12, status: { short: 'CANC' } }, league: {}, teams: { home: {}, away: {} }, goals: {} }) !== null) {
  console.log('cancel fail')
  failed += 1
}

const ht = adaptFixture({
  fixture: { id: 13, date: '2026-10-24T19:00:00+08:00', status: { short: 'HT', elapsed: 45 } },
  league: { id: 78, name: 'Bundesliga' },
  teams: { home: { name: 'Bayern' }, away: { name: 'Dortmund' } },
  goals: { home: 1, away: 1 },
})
if (ht.status !== 'HT' || ht.minute) {
  console.log('ht fail', ht)
  failed += 1
}

const finished = adaptFixture({
  fixture: { id: 14, date: '2026-10-24T16:00:00+08:00', status: { short: 'FT' } },
  league: { id: 61, name: 'Ligue 1' },
  teams: { home: { name: 'Paris' }, away: { name: 'Lyon' } },
  goals: { home: 0, away: 0 },
})
const other = adaptFixture({
  fixture: { id: 15, date: '2026-10-24T22:00:00+08:00', status: { short: 'NS' } },
  league: { id: 88, name: 'Eredivisie' },
  teams: { home: { name: 'Ajax' }, away: { name: 'PSV' } },
  goals: { home: null, away: null },
})
const featured = selectFeaturedMatches([live, upcoming, ht, finished, other]).map((match) => match.id).join(',')
if (featured !== '13,10,11,15') {
  console.log('featured', featured)
  failed += 1
}

const many = Array.from({ length: 40 }, (_, index) => ({ ...other, id: 100 + index, leagueId: 88 }))
const capped = capMatches(many.concat([live]))
if (capped.length !== 28 || capped[0].id !== 10 || !capped[0].featured) {
  console.log('cap', capped.length, capped[0]?.id)
  failed += 1
}

const fallback = capMatches(matches.map(adaptFallbackMatch))
if (!fallback.length || fallback.some((match) => !match.homeTeam)) {
  console.log('fallback empty')
  failed += 1
}

const leakKeys = ['promoTitle', 'fourScreens', 'noMatches', 'footerTagline', 'errorBody', 'twelveFree', 'updatedAt']
for (const code of ['zh-CN', 'zh-TW', 'de', 'pt', 'fr', 'ja', 'ar']) {
  const leaks = leakKeys.filter((key) => locales[code][key] === locales.en[key])
  if (leaks.length) {
    console.log('leak', code, leaks.join(','))
    failed += 1
  }
}

if (failed) {
  console.log(`football checks failed: ${failed}`)
  process.exit(1)
}
console.log('football checks ok')
