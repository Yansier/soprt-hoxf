<script setup>
import { nextTick, ref } from 'vue'
import { currentLanguage, t } from '../i18n'

const props = defineProps({ url: { type: String, required: true } })
defineEmits(['close', 'open'])

const copyStatus = ref('')
const showFallback = ref(false)
const urlField = ref(null)

const copyUrl = async () => {
  copyStatus.value = ''
  showFallback.value = false
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(props.url)
    copyStatus.value = t('safariCopied')
  } catch {
    showFallback.value = true
    copyStatus.value = t('safariCopyFailed')
    await nextTick()
    urlField.value?.focus()
    urlField.value?.select()
    urlField.value?.setSelectionRange?.(0, props.url.length)
  }
}
</script>

<template>
  <div class="safari-guide-backdrop" data-safari-guide @click.self="$emit('close')">
    <section
      class="safari-guide-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safari-guide-title"
      :dir="currentLanguage === 'ar' ? 'rtl' : 'ltr'"
    >
      <div class="safari-sheet-handle" aria-hidden="true"></div>
      <button class="safari-close safari-sheet-close" type="button" :aria-label="t('safariClose')" @click="$emit('close')">×</button>
      <span class="safari-guide-kicker">HOXF SPORT TV</span>
      <h2 id="safari-guide-title">{{ t('safariGuideTitle') }}</h2>
      <p class="safari-guide-body">{{ t('safariGuideBody') }}</p>
      <img class="safari-guide-image" src="/images/safari-guide.png" alt="" width="1200" height="900" />
      <ol class="safari-steps safari-guide-steps">
        <li><span dir="ltr">1</span><p>{{ t('safariGuideStep1') }}</p></li>
        <li><span dir="ltr">2</span><p>{{ t('safariGuideStep2') }}</p></li>
        <li><span dir="ltr">3</span><p>{{ t('safariGuideStep3') }}</p></li>
      </ol>
      <div class="safari-guide-actions">
        <button class="safari-open-button" type="button" @click="$emit('open')">{{ t('openInSafari') }}</button>
        <button class="safari-copy-button" type="button" @click="copyUrl">{{ t('copySafariLink') }}</button>
      </div>
      <div class="safari-copy-status" aria-live="polite">{{ copyStatus }}</div>
      <input v-if="showFallback" ref="urlField" class="safari-url-field" dir="ltr" readonly :value="url" :aria-label="t('copySafariLink')" />
    </section>
  </div>
</template>
