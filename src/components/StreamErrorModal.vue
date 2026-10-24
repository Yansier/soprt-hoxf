<script setup>
import { t } from '../i18n'
defineProps({ message: String })
defineEmits(['retry', 'close', 'relogin'])
</script>
<template>
  <div class="modal-backdrop blur">
    <div class="modal-card error-modal">
      <div class="error-icon">!</div>
      <span class="eyebrow live-text">{{ t('liveNow') }}</span>
      <h2>{{ t('interrupted') }}</h2>
      <p>{{ message || t('errorBody') }}</p>
      <p class="relogin-hint">{{ t('reloginHint') }}</p>
      <button class="primary-button full" @click="$emit('retry')">{{ t('tryAgain') }}</button>
      <button class="outline-button relogin-button" @click="$emit('relogin')">{{ t('signOutRelogin') }}</button>
      <button class="ghost-button" @click="$emit('close')">{{ t('back') }}</button>
    </div>
  </div>
</template>
