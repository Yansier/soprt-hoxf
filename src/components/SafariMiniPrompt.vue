<script setup>
import { nextTick, ref } from 'vue'
import { currentLanguage, t } from '../i18n'

const props = defineProps({
  expanded: { type: Boolean, default: false },
  url: { type: String, required: true },
})
defineEmits(['close', 'expand', 'open'])

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
  <aside
    class="safari-mini"
    data-safari-guide
    role="dialog"
    aria-modal="false"
    aria-labelledby="safari-mini-title"
    :dir="currentLanguage === 'ar' ? 'rtl' : 'ltr'"
  >
    <button class="safari-close" type="button" :aria-label="t('safariClose')" @click="$emit('close')">×</button>
    <div class="safari-mini-heading">
      <span class="safari-compass" aria-hidden="true">↗</span>
      <div>
        <strong id="safari-mini-title">{{ t('safariMiniTitle') }}</strong>
        <p>{{ t('safariMiniBody') }}</p>
      </div>
    </div>
    <button class="safari-open-button" type="button" @click="$emit('open')">{{ t('openInSafari') }}</button>
    <button v-if="!expanded" class="safari-methods-toggle" type="button" @click="$emit('expand')">
      <span aria-hidden="true">›</span>{{ t('safariOtherMethods') }}
    </button>
    <div v-else class="safari-mini-details">
      <strong>{{ t('safariInstructions') }}</strong>
      <ol class="safari-steps">
        <li><span dir="ltr">1</span><p>{{ t('safariGuideStep1') }}</p></li>
        <li><span dir="ltr">2</span><p>{{ t('safariGuideStep2') }}</p></li>
        <li><span dir="ltr">3</span><p>{{ t('safariGuideStep3') }}</p></li>
      </ol>
      <button class="safari-copy-button" type="button" @click="copyUrl">{{ t('copySafariLink') }}</button>
      <div class="safari-copy-status" aria-live="polite">{{ copyStatus }}</div>
      <input v-if="showFallback" ref="urlField" class="safari-url-field" dir="ltr" readonly :value="url" :aria-label="t('copySafariLink')" />
    </div>
  </aside>
</template>
