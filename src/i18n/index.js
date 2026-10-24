import { computed, ref } from 'vue'
import { languages, locales } from './locales'

const STORAGE_KEY = 'hoxf_language'
export const currentLanguage = ref('en')
export const currentLanguageMeta = computed(() => languages.find((item) => item.code === currentLanguage.value) || languages[0])

function detectLanguage() {
  const candidates = [...(navigator.languages || []), navigator.language].filter(Boolean)
  for (const candidate of candidates) {
    const value = candidate.toLowerCase()
    if (value.startsWith('zh-tw') || value.startsWith('zh-hk') || value.startsWith('zh-mo')) return 'zh-TW'
    if (value.startsWith('zh')) return 'zh-CN'
    const hit = languages.find(({ code }) => value.startsWith(code.toLowerCase()))
    if (hit) return hit.code
  }
  return 'en'
}

export function setLanguage(code) {
  currentLanguage.value = locales[code] ? code : 'en'
  localStorage.setItem(STORAGE_KEY, currentLanguage.value)
  document.documentElement.lang = currentLanguage.value
  document.documentElement.dir = currentLanguage.value === 'ar' ? 'rtl' : 'ltr'
}

export function initLanguage() {
  let stored = null
  try { stored = localStorage.getItem(STORAGE_KEY) } catch { /* storage unavailable */ }
  setLanguage(stored && locales[stored] ? stored : detectLanguage())
}

export function t(key, values = {}) {
  let text = locales[currentLanguage.value]?.[key] ?? locales.en[key] ?? key
  Object.entries(values).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, value) })
  return text
}

export { languages }
