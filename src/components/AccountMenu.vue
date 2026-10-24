<script setup>
import { inject } from 'vue'
import { useRouter } from 'vue-router'
import { getVipRemainingDays } from '../utils/auth'
import { t } from '../i18n'

const emit = defineEmits(['close'])
const app = inject('app')
const router = useRouter()
const initial = (name = '') => name.trim().charAt(0).toUpperCase()
const maskEmail = (email = '') => {
  const [local, domain] = String(email).split('@')
  if (!domain) return email
  return `${local.slice(0, 1)}***@${domain}`
}
const logout = () => {
  emit('close')
  app.logoutUser()
  router.push('/')
  app.showNotice(t('signedOut'))
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="account-sheet" role="dialog" :aria-label="t('account')">
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <h2>{{ t('account') }}</h2>
        <button class="close-button" :aria-label="t('back')" @click="emit('close')">×</button>
      </div>
      <div class="account-profile">
        <span class="avatar">{{ initial(app.user.value?.name) }}</span>
        <b>{{ app.user.value?.name }}</b>
        <span class="account-email" dir="ltr">{{ maskEmail(app.user.value?.email) }}</span>
      </div>
      <div class="account-status">
        <span>{{ t('accountVip') }}</span>
        <b>{{ t('daysRemaining', { count: getVipRemainingDays(app.user.value) }) }}</b>
      </div>
      <button class="outline-button account-logout" type="button" @click="logout">{{ t('logout') }}</button>
    </div>
  </div>
</template>
