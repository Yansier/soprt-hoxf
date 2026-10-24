export function isSafariGuideEligible({
  userAgent = navigator.userAgent || '',
  search = location.search,
  protocol = location.protocol,
} = {}) {
  return /iPhone/i.test(userAgent) &&
    /FBAN\/FBIOS|FB_IAB\/FB4A|\bFBAV\//i.test(userAgent) &&
    !/Instagram|Messenger|FBAN\/(?:Messenger|Orca)/i.test(userAgent) &&
    new URLSearchParams(search).get('fb_ad') === '1' &&
    protocol === 'https:'
}

export function toSafariHandoffUrl(url = location.href) {
  return String(url).replace(/^https:/i, 'x-safari-https:')
}
