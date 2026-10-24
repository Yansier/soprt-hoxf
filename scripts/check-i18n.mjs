import { en, languages, localeSources } from '../src/i18n/locales.js'

const { translated, phase12, gaps, phase25, safariGuide } = localeSources
const keys = Object.keys(en)
let failed = false

for (const { code } of languages) {
  if (code === 'en') continue
  const bag = { ...(translated[code] || {}), ...(phase12[code] || {}), ...(gaps[code] || {}), ...(phase25?.[code] || {}), ...(safariGuide?.[code] || {}) }
  for (const key of keys) {
    if (!(key in bag)) {
      console.log(`[${code}] missing: ${key}`)
      failed = true
    }
  }
}

if (failed) process.exit(1)
console.log(`i18n coverage ok (${keys.length} keys)`)
