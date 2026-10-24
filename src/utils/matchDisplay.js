import { currentLanguage, t } from '../i18n'

export function formatKickoff(match) {
  if (!match?.kickoffAt) return match?.kickoff || ''
  const date = new Date(match.kickoffAt)
  if (Number.isNaN(date.getTime())) return match?.kickoff || ''
  const locale = currentLanguage.value || 'en'
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date)
  const today = new Date()
  const dayDiff = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000)
  if (dayDiff === 0) return time
  if (dayDiff === 1) return `${t('tomorrowLabel')} · ${time}`
  const day = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date)
  return `${day} · ${time}`
}

export function hasScore(match) {
  return match?.homeScore !== null && match?.homeScore !== undefined
}

export function statusText(match) {
  if (match?.status === 'LIVE') return match.minute ? `${t('liveNow')} · ${match.minute}` : t('liveNow')
  if (match?.status === 'HT') return t('halfTime')
  if (match?.status === 'FINISHED') return t('fullTime')
  return formatKickoff(match) || t('upcoming')
}
