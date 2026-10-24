export const REQUEST_TIMEOUT_MS = 8000
export const FEED_REFRESH_LIVE_MS = 5 * 60 * 1000
export const FEED_REFRESH_IDLE_MS = 10 * 60 * 1000
export const MAX_VISIBLE_MATCHES = 28
export const MAX_LEAGUES = 12
export const MAX_MATCHES_PER_LEAGUE = 10

export const FEATURED_LEAGUE_IDS = [39, 2, 140, 135, 78, 61]

export const FEATURED_LEAGUE_NAMES = {
  39: 'Premier League',
  2: 'Champions League',
  140: 'La Liga',
  135: 'Serie A',
  78: 'Bundesliga',
  61: 'Ligue 1',
}

export const FALLBACK_LEAGUE_IDS = {
  'Premier League': 39,
  'Champions League': 2,
  'La Liga': 140,
  'Serie A': 135,
  Bundesliga: 78,
  'Ligue 1': 61,
}

export const LIVE_API_STATUSES = ['1H', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE']
export const FINISHED_API_STATUSES = ['FT', 'AET', 'PEN']
export const UPCOMING_API_STATUSES = ['NS', 'TBD']
export const EXCLUDED_API_STATUSES = ['PST', 'CANC', 'ABD', 'AWD', 'WO']

export const CACHE_STORAGE_KEY = 'hoxf_football_fixtures_cache'
