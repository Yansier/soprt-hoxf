import { randomInt } from './random'

const DEADLINE_KEY = 'hoxf_vip_deadline'

function readDeadline() {
  const value = Number(sessionStorage.getItem(DEADLINE_KEY))
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function refreshOfferDeadline() {
  const deadline = Date.now() + randomInt(90, 210) * 60 * 1000
  sessionStorage.setItem(DEADLINE_KEY, String(deadline))
  return deadline
}

export function getOfferDeadline() {
  return readDeadline() || refreshOfferDeadline()
}

export function getOfferRemaining(now = Date.now()) {
  const deadline = readDeadline()
  if (!deadline) return 0
  return deadline - now
}

export function formatOfferTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value) => String(value).padStart(2, '0')
  return `${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}`
}
