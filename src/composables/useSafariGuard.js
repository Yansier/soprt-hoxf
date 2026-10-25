import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { detectSafariEnvironment, toSafariHandoffUrl } from '../utils/safariEnvironment.js'

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

function getEnvironment() {
  const detected = detectSafariEnvironment()
  const preview = import.meta.env.DEV ? new URLSearchParams(location.search).get('safari_preview') : ''
  if (!preview) return { ...detected, preview: '' }

  const modes = {
    '1': { isIOS: true, isSafari: false, isFacebookIOS: true, isAllowedBrowser: false, guideRequired: true, canAutoHandoffSafari: true },
    'ios-facebook': { isIOS: true, isSafari: false, isFacebookIOS: true, isAllowedBrowser: false, guideRequired: true, canAutoHandoffSafari: true },
    android: { isIOS: false, isSafari: false, isFacebookIOS: false, isAllowedBrowser: false, guideRequired: true, canAutoHandoffSafari: false },
    desktop: { isIOS: false, isSafari: false, isFacebookIOS: false, isAllowedBrowser: false, guideRequired: true, canAutoHandoffSafari: false },
    'ios-safari': { isIOS: true, isSafari: true, isFacebookIOS: false, isAllowedBrowser: true, guideRequired: false, canAutoHandoffSafari: false },
  }
  return modes[preview]
    ? { ...detected, ...modes[preview], hasFbAd: true, isHttps: true, preview }
    : { ...detected, preview: '' }
}

export function useSafariGuard() {
  const initialEnvironment = getEnvironment()
  const guideRequired = ref(initialEnvironment.guideRequired)
  const canAutoHandoffSafari = ref(initialEnvironment.canAutoHandoffSafari)
  const isAllowedBrowser = ref(initialEnvironment.isAllowedBrowser)
  const isIOS = ref(initialEnvironment.isIOS)
  const previewMode = ref(initialEnvironment.preview)
  const storageKey = `hoxf:safari-guide:${location.pathname}`
  const stored = readState(storageKey)
  const handoffAttempted = ref(Boolean(stored.handoffAttempted))
  const miniDismissed = ref(Boolean(stored.miniDismissed))
  const miniOpen = ref(false)
  const miniExpanded = ref(false)
  const fullOpen = ref(false)
  const httpsUrl = ref(location.href)
  const guardActive = computed(() => guideRequired.value)
  let fallbackTimer = 0

  const applyEnvironment = () => {
    const environment = getEnvironment()
    guideRequired.value = environment.guideRequired
    canAutoHandoffSafari.value = environment.canAutoHandoffSafari
    isAllowedBrowser.value = environment.isAllowedBrowser
    isIOS.value = environment.isIOS
    previewMode.value = environment.preview
    if (!environment.guideRequired) {
      miniOpen.value = false
      fullOpen.value = false
    }
  }

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
      if (canAutoHandoffSafari.value && !miniDismissed.value) {
        miniExpanded.value = miniExpanded.value || expand
        miniOpen.value = true
      }
    }, delay)
  }

  const attemptHandoff = (source = 'mini') => {
    if (!canAutoHandoffSafari.value) return
    refreshUrl()
    handoffAttempted.value = true
    persist()
    if (source === 'full') {
      fullOpen.value = true
      scheduleFallback('full')
    } else {
      miniOpen.value = !miniDismissed.value
      scheduleFallback('mini', source === 'mini')
    }
    if (previewMode.value) return
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
    if (canAutoHandoffSafari.value && !miniDismissed.value && !fullOpen.value) scheduleFallback('mini', false, 250)
  }
  const onPageHide = () => clearFallback()
  const onPageShow = (event) => {
    applyEnvironment()
    if (event.persisted && canAutoHandoffSafari.value && !miniDismissed.value && !fullOpen.value) {
      scheduleFallback('mini', false, 250)
    }
  }

  onMounted(() => {
    if (!guideRequired.value) return
    document.addEventListener('click', intercept, true)
    document.addEventListener('submit', intercept, true)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    if (!canAutoHandoffSafari.value) return
    if (previewMode.value) {
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
    guideRequired,
    canAutoHandoffSafari,
    isAllowedBrowser,
    isIOS,
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
