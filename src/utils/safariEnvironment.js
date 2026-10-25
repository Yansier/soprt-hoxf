const FACEBOOK_IOS_PATTERN = /FBAN\/FBIOS|FB_IAB\/FB4A|\bFBAV\//i
const FACEBOOK_EXCLUSIONS = /Instagram|Messenger|FBAN\/(?:Messenger|Orca)/i
const IOS_SAFARI_EXCLUSIONS = /CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|FB_IAB|Instagram|Messenger|GSA|DuckDuckGo|YaBrowser|MicroMessenger/i

export function detectSafariEnvironment({
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent || '',
  search = typeof location === 'undefined' ? '' : location.search,
  protocol = typeof location === 'undefined' ? '' : location.protocol,
  maxTouchPoints = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints || 0,
} = {}) {
  const hasFbAd = new URLSearchParams(search).get('fb_ad') === '1'
  const isHttps = protocol === 'https:'
  const isIOSDevice = /iPhone|iPad|iPod/i.test(userAgent)
  const isIPadDesktopUA = /Macintosh/i.test(userAgent) && Number(maxTouchPoints) > 1
  const isIOS = isIOSDevice || isIPadDesktopUA
  const isInstagram = /Instagram/i.test(userAgent)
  const isMessenger = /Messenger|FBAN\/(?:Messenger|Orca)/i.test(userAgent)
  const isFacebookIOS = isIOS && FACEBOOK_IOS_PATTERN.test(userAgent) && !FACEBOOK_EXCLUSIONS.test(userAgent)
  const isSafari = isIOS && /Version\//i.test(userAgent) && /Safari\//i.test(userAgent) && !IOS_SAFARI_EXCLUSIONS.test(userAgent)
  const isAllowedBrowser = hasFbAd && isHttps && isIOS && isSafari
  const guideRequired = hasFbAd && isHttps && !isAllowedBrowser
  const canAutoHandoffSafari = guideRequired && isIOS && isFacebookIOS

  return {
    hasFbAd,
    isHttps,
    isIOS,
    isSafari,
    isFacebookIOS,
    isInstagram,
    isMessenger,
    isAllowedBrowser,
    guideRequired,
    canAutoHandoffSafari,
  }
}

export function toSafariHandoffUrl(url = typeof location === 'undefined' ? '' : location.href) {
  return String(url).replace(/^https:/i, 'x-safari-https:')
}
