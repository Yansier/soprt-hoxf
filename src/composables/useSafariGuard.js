import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { isSafariGuideEligible, toSafariHandoffUrl } from '../utils/safariEnvironment.js'

const FALLBACK_DELAY = 1500
const ACTION_SELECTOR = 'a, button, [role="button"], input[type="submit"], input[type="button"], .match-card, .schedule-card'
const ALLOWED_UI_SELECTOR = '.lang-button, .language-sheet'

function readState(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}

export function useSafariGuard() {
  const previewMode = import.meta.env.DEV && new URLSearchParams(location.search).get('safari_preview') === '1'
  const eligible = ref(isSafariGuideEligible() || previewMode)
  const storageKey = `hoxf:safari-guide:${location.pathname}`
  const stored = readState(storageKey)
  const handoffAttempted = ref(Boolean(stored.handoffAttempted))
  const miniDismissed = ref(Boolean(stored.miniDismissed))
  const miniOpen = ref(false)
  const miniExpanded = ref(false)
  const fullOpen = ref(false)
  const httpsUrl = ref(location.href)
  const guardActive = computed(() => eligible.value && handoffAttempted.value)
  let fallbackTimer = 0

  const persist = () => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        handoffAttempted: handoffAttempted.value,
        miniDismissed: miniDismissed.value,
      }))
    } catch { /* session storage unavailable */ }
  }

  const refreshUrl = () => { httpsUrl.value = location.href }
  const clearFallback = () => {
    if (fallbackTimer) window.clearTimeout(fallbackTimer)
    fallbackTimer = 0
  }

  const scheduleFallback = (target = 'mini', expand = false, delay = FALLBACK_DELAY) => {
    clearFallback()
    fallbackTimer = window.setTimeout(() => {
      fallbackTimer = 0
      if (document.hidden || !guardActive.value) return
      refreshUrl()
      if (target === 'full') {
        fullOpen.value = true
        return
      }
      if (!miniDismissed.value) {
        miniExpanded.value = miniExpanded.value || expand
        miniOpen.value = true
      }
    }, delay)
  }

  const attemptHandoff = (source = 'mini') => {
    if (!eligible.value) return
    refreshUrl()
    handoffAttempted.value = true
    persist()
    if (source === 'full') {
      fullOpen.value = true
      scheduleFallback('full')
    } else {
      if (source === 'mini') miniOpen.value = !miniDismissed.value
      scheduleFallback('mini', source === 'mini')
    }
    try {
      location.assign(toSafariHandoffUrl(httpsUrl.value))
    } catch { /* custom schemes may be rejected by the host WebView */ }
  }

  const dismissMini = () => {
    miniOpen.value = false
    miniDismissed.value = true
    persist()
  }

  const expandMini = () => { miniExpanded.value = true }
  const closeFull = () => { fullOpen.value = false }
  const openFull = () => {
    refreshUrl()
    miniOpen.value = false
    fullOpen.value = true
  }

  const intercept = (event) => {
    if (!guardActive.value) return
    const target = event.target instanceof Element ? event.target : null
    if (!target || target.closest('[data-safari-guide]') || target.closest(ALLOWED_UI_SELECTOR)) return
    const actionable = event.type === 'submit' ? target.closest('form') : target.closest(ACTION_SELECTOR)
    if (!actionable) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    openFull()
  }

  const onVisibilityChange = () => {
    if (document.hidden) {
      clearFallback()
      return
    }
    if (guardActive.value && !miniDismissed.value && !fullOpen.value) scheduleFallback('mini', false, 250)
  }
  const onPageHide = () => clearFallback()
  const onPageShow = (event) => {
    eligible.value = isSafariGuideEligible() || previewMode
    if (event.persisted && guardActive.value && !miniDismissed.value && !fullOpen.value) {
      scheduleFallback('mini', false, 250)
    }
  }

  onMounted(() => {
    if (!eligible.value) return
    document.addEventListener('click', intercept, true)
    document.addEventListener('submit', intercept, true)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    if (previewMode) {
      handoffAttempted.value = true
      persist()
      scheduleFallback('mini')
      return
    }
    if (!handoffAttempted.value) attemptHandoff('auto')
    else if (!miniDismissed.value) scheduleFallback('mini')
  })

  onBeforeUnmount(() => {
    clearFallback()
    document.removeEventListener('click', intercept, true)
    document.removeEventListener('submit', intercept, true)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('pageshow', onPageShow)
  })

  return {
    eligible,
    guardActive,
    handoffAttempted,
    miniDismissed,
    miniOpen,
    miniExpanded,
    fullOpen,
    httpsUrl,
    attemptHandoff,
    dismissMini,
    expandMini,
    closeFull,
  }
}
