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
    'facebook-ad': { isHttps: true, hasFbAd: true, isIOS: true, isIPhone: true, isSafari: false, isFacebookIOS: true, isAllowedBrowser: false, facebookAcquisitionEligible: true, businessGuardRequired: true, canAutoHandoffSafari: true },
    'facebook-organic': { isHttps: true, hasFbAd: false, isIOS: true, isIPhone: true, isSafari: false, isFacebookIOS: true, isAllowedBrowser: false, facebookAcquisitionEligible: false, businessGuardRequired: true, canAutoHandoffSafari: false },
    'facebook-http': { isHttps: false, hasFbAd: true, isIOS: true, isIPhone: true, isSafari: false, isFacebookIOS: true, isAllowedBrowser: false, facebookAcquisitionEligible: false, businessGuardRequired: true, canAutoHandoffSafari: false },
    'ios-safari': { isIOS: true, isIPhone: true, isSafari: true, isFacebookIOS: false, isAllowedBrowser: true, facebookAcquisitionEligible: false, businessGuardRequired: false, canAutoHandoffSafari: false },
    'ios-safari-fbad': { hasFbAd: true, isIOS: true, isIPhone: true, isSafari: true, isFacebookIOS: false, isAllowedBrowser: true, facebookAcquisitionEligible: false, businessGuardRequired: false, canAutoHandoffSafari: false },
    'ios-chrome': { isIOS: true, isIPhone: true, isSafari: false, isChromeIOS: true, isFacebookIOS: false, isAllowedBrowser: false, facebookAcquisitionEligible: false, businessGuardRequired: true, canAutoHandoffSafari: false },
    'telegram-explicit': { isIOS: true, isIPhone: true, isSafari: false, isExplicitTelegram: true, knownInAppBrowser: true, isFacebookIOS: false, isAllowedBrowser: false, facebookAcquisitionEligible: false, businessGuardRequired: true, canAutoHandoffSafari: false },
    'telegram-safari-like': { isIOS: true, isIPhone: true, isSafari: true, isSafariLike: true, isExplicitTelegram: false, knownInAppBrowser: false, isFacebookIOS: false, isAllowedBrowser: true, facebookAcquisitionEligible: false, businessGuardRequired: false, canAutoHandoffSafari: false },
    instagram: { isIOS: true, isIPhone: true, isSafari: false, isInstagram: true, knownInAppBrowser: true, isFacebookIOS: false, isAllowedBrowser: false, facebookAcquisitionEligible: false, businessGuardRequired: true, canAutoHandoffSafari: false },
    messenger: { isIOS: true, isIPhone: true, isSafari: false, isMessenger: true, knownInAppBrowser: true, isFacebookIOS: false, isAllowedBrowser: false, facebookAcquisitionEligible: false, businessGuardRequired: true, canAutoHandoffSafari: false },
    android: { isIOS: false, isSafari: false, isFacebookIOS: false, isAllowedBrowser: false, facebookAcquisitionEligible: false, businessGuardRequired: true, canAutoHandoffSafari: false },
    desktop: { isIOS: false, isSafari: false, isFacebookIOS: false, isAllowedBrowser: false, facebookAcquisitionEligible: false, businessGuardRequired: true, canAutoHandoffSafari: false },
  }
  return modes[preview]
    ? { ...detected, isHttps: true, ...modes[preview], preview }
    : { ...detected, preview: '' }
}

export function useSafariGuard() {
  const initialEnvironment = getEnvironment()
  const facebookAcquisitionEligible = ref(initialEnvironment.facebookAcquisitionEligible)
  const businessGuardRequired = ref(initialEnvironment.businessGuardRequired)
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
  const guardActive = computed(() => businessGuardRequired.value)
  let fallbackTimer = 0

  const applyEnvironment = () => {
    const environment = getEnvironment()
    facebookAcquisitionEligible.value = environment.facebookAcquisitionEligible
    businessGuardRequired.value = environment.businessGuardRequired
    canAutoHandoffSafari.value = environment.canAutoHandoffSafari
    isAllowedBrowser.value = environment.isAllowedBrowser
    isIOS.value = environment.isIOS
    previewMode.value = environment.preview
    if (!environment.facebookAcquisitionEligible) miniOpen.value = false
    if (!environment.businessGuardRequired) fullOpen.value = false
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
      if (document.hidden) return
      refreshUrl()
      if (target === 'full') {
        if (!businessGuardRequired.value) return
        fullOpen.value = true
        return
      }
      if (facebookAcquisitionEligible.value && canAutoHandoffSafari.value && !miniDismissed.value) {
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
    if (facebookAcquisitionEligible.value && !miniDismissed.value && !fullOpen.value) scheduleFallback('mini', false, 250)
  }
  const onPageHide = () => clearFallback()
  const onPageShow = (event) => {
    applyEnvironment()
    if (event.persisted && facebookAcquisitionEligible.value && !miniDismissed.value && !fullOpen.value) {
      scheduleFallback('mini', false, 250)
    }
  }

  onMounted(() => {
    document.addEventListener('click', intercept, true)
    document.addEventListener('submit', intercept, true)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    if (!facebookAcquisitionEligible.value) return
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
    facebookAcquisitionEligible,
    businessGuardRequired,
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
