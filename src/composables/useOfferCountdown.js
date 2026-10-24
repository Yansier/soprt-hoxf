import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { formatOfferTime, getOfferDeadline, getOfferRemaining, refreshOfferDeadline } from '../utils/offerCountdown'

const remainingMs = ref(0)
const checking = ref(false)
const formatted = computed(() => formatOfferTime(remainingMs.value))

let timer = null
let renewTimer = null
let consumers = 0
let guestVisible = false
let watchBound = false

function tick() {
  const left = getOfferRemaining()
  remainingMs.value = Math.max(0, left)
  if (left > 0 || !guestVisible || checking.value || renewTimer) return
  if (!Number(sessionStorage.getItem('hoxf_vip_deadline'))) return
  checking.value = true
  renewTimer = setTimeout(() => {
    refreshOfferDeadline()
    checking.value = false
    renewTimer = null
    remainingMs.value = Math.max(0, getOfferRemaining())
  }, 2000)
}

function bindGuestWatch(app) {
  if (watchBound) return
  watchBound = true
  watch(() => app.loggedIn.value, (loggedIn) => {
    guestVisible = !loggedIn
    if (!loggedIn) getOfferDeadline()
    tick()
  })
}

export function useOfferCountdown() {
  const app = inject('app')
  bindGuestWatch(app)
  guestVisible = !app.loggedIn.value
  if (guestVisible) getOfferDeadline()
  consumers += 1
  if (!timer) {
    tick()
    timer = setInterval(tick, 1000)
  }
  onBeforeUnmount(() => {
    consumers -= 1
    if (consumers > 0) return
    clearInterval(timer)
    timer = null
    consumers = 0
  })
  return { formatted, checking }
}
