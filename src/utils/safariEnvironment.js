const FACEBOOK_IOS_PATTERN = /FBAN\/FBIOS|FB_IAB\/FB4A|\bFBAV\//i
const FACEBOOK_EXCLUSIONS = /Instagram|Messenger|FBAN\/(?:Messenger|Orca)/i

export function detectTelegramBridge(browserWindow = typeof window === 'undefined' ? null : window) {
  return Boolean(browserWindow && (
    typeof browserWindow.TelegramWebviewProxy !== 'undefined' ||
    typeof browserWindow.TelegramWebviewProxyProto !== 'undefined' ||
    typeof browserWindow.TelegramWebview !== 'undefined'
  ))
}

export function detectSafariEnvironment({
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent || '',
  search = typeof location === 'undefined' ? '' : location.search,
  protocol = typeof location === 'undefined' ? '' : location.protocol,
  maxTouchPoints = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints || 0,
  telegramBridge = detectTelegramBridge(),
} = {}) {
  const hasFbAd = new URLSearchParams(search).get('fb_ad') === '1'
  const isHttps = protocol === 'https:'
  const isIOSDevice = /iPhone|iPad|iPod/i.test(userAgent)
  const isIPadDesktopUA = /Macintosh/i.test(userAgent) && Number(maxTouchPoints) > 1
  const isIOS = isIOSDevice || isIPadDesktopUA
  const isInstagram = /Instagram/i.test(userAgent)
  const isMessenger = /Messenger|FBAN\/(?:Messenger|Orca)/i.test(userAgent)
  const isFacebookIOS = isIOS && FACEBOOK_IOS_PATTERN.test(userAgent) && !FACEBOOK_EXCLUSIONS.test(userAgent)
  const isChromeIOS = isIOS && /CriOS/i.test(userAgent)
  const isFirefoxIOS = isIOS && /FxiOS/i.test(userAgent)
  const isEdgeIOS = isIOS && /EdgiOS/i.test(userAgent)
  const isOperaIOS = isIOS && /OPiOS/i.test(userAgent)
  const isGoogleApp = /\bGSA\//i.test(userAgent)
  const isWeChat = /MicroMessenger/i.test(userAgent)
  const isTikTok = /TikTok|Bytedance/i.test(userAgent)
  const hasTelegramUa = /Telegram/i.test(userAgent)
  const isExplicitTelegram = hasTelegramUa || Boolean(telegramBridge)
  const isKnownIOSAlternativeBrowser = isChromeIOS || isFirefoxIOS || isEdgeIOS || isOperaIOS
  const isKnownInAppBrowser = isFacebookIOS || isInstagram || isMessenger || isGoogleApp || isWeChat || isTikTok || isExplicitTelegram
  const definitelyBlockedBrowser = !isIOS || isKnownIOSAlternativeBrowser || isKnownInAppBrowser
  const isSafariLike = isIOS && /Version\//i.test(userAgent) && /Safari\//i.test(userAgent)
  const isSafari = isSafariLike && !definitelyBlockedBrowser
  const guideRequired = definitelyBlockedBrowser
  const isAllowedBrowser = !guideRequired
  const canAutoHandoffSafari = guideRequired && isIOS && isFacebookIOS && isHttps

  return {
    hasFbAd,
    isHttps,
    isIOS,
    isSafari,
    isFacebookIOS,
    isInstagram,
    isMessenger,
    isChromeIOS,
    isFirefoxIOS,
    isEdgeIOS,
    isOperaIOS,
    isGoogleApp,
    isWeChat,
    isTikTok,
    hasTelegramUa,
    hasTelegramBridge: Boolean(telegramBridge),
    isExplicitTelegram,
    isKnownIOSAlternativeBrowser,
    isKnownInAppBrowser,
    definitelyBlockedBrowser,
    isSafariLike,
    isAllowedBrowser,
    guideRequired,
    canAutoHandoffSafari,
  }
}

export function toSafariHandoffUrl(url = typeof location === 'undefined' ? '' : location.href) {
  return String(url).replace(/^https:/i, 'x-safari-https:')
}
