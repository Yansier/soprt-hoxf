import { computed, ref } from 'vue'
import { languages, locales } from './locales.js'

const MANUAL_KEY = 'hoxf_language_manual'
export const currentLanguage = ref('en')
export const currentLanguageMeta = computed(() => languages.find((item) => item.code === currentLanguage.value) || languages[0])

export function detectLanguage(candidates = [...(navigator.languages || []), navigator.language].filter(Boolean)) {
  for (const candidate of candidates) {
    const value = String(candidate).toLowerCase()
    if (value.startsWith('zh-tw') || value.startsWith('zh-hk') || value.startsWith('zh-mo')) return 'zh-TW'
    if (value.startsWith('zh')) return 'zh-CN'
    const hit = languages.find(({ code }) => value === code.toLowerCase() || value.startsWith(`${code.toLowerCase()}-`))
    if (hit) return hit.code
  }
  return 'en'
}

export function applyLanguage(code) {
  const next = locales[code] ? code : 'en'
  currentLanguage.value = next
  document.documentElement.lang = next
  document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
}

export function setManualLanguage(code) {
  applyLanguage(code)
  try { localStorage.setItem(MANUAL_KEY, currentLanguage.value) } catch { /* storage unavailable */ }
}

export function setLanguage(code, options = {}) {
  if (options.persist === false) applyLanguage(code)
  else setManualLanguage(code)
}

function readManualLanguage() {
  try {
    const value = localStorage.getItem(MANUAL_KEY)
    return value && locales[value] ? value : ''
  } catch {
    return ''
  }
}

export function initLanguage() {
  const manual = readManualLanguage()
  applyLanguage(manual || detectLanguage())
  window.addEventListener('languagechange', () => {
    if (!readManualLanguage()) applyLanguage(detectLanguage())
  })
}

export function t(key, values = {}) {
  let text = locales[currentLanguage.value]?.[key] ?? locales.en[key] ?? key
  Object.entries(values).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, value) })
  return text
}

export { languages }
