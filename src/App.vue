<script setup>
import { computed, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import LoadingOverlay from './components/LoadingOverlay.vue'
import StreamErrorModal from './components/StreamErrorModal.vue'
import LanguageSelector from './components/LanguageSelector.vue'
import AccountMenu from './components/AccountMenu.vue'
import { getCurrentUser, logout } from './utils/auth'
import { randomInt } from './utils/random'
import { t } from './i18n'

const router = useRouter()
const user = ref(getCurrentUser())
const loading = ref(false)
const loadingText = ref('')
const streamError = ref(null)
const languageOpen = ref(false)
const accountOpen = ref(false)
const notice = ref('')
let noticeTimer

const loggedIn = computed(() => Boolean(user.value?.loggedIn))
const showNotice = (message) => {
  notice.value = message
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = '' }, 2600)
}
const setUser = (nextUser) => { user.value = nextUser }
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const connectStream = async (match = null) => {
  streamError.value = null
  loadingText.value = t('connecting')
  loading.value = true
  await wait(randomInt(800, 1300))
  loading.value = false
  const errors = ['errorBusy', 'errorNetwork', 'errorStable']
  streamError.value = { match, message: t(errors[randomInt(0, errors.length - 1)]) }
}
const watchMatch = async (match = null) => {
  if (!loggedIn.value) return router.push('/register')
  await connectStream(match)
}
const claimVip = () => loggedIn.value ? showNotice(t('vipActive')) : router.push('/register')
const logoutUser = () => {
  logout()
  user.value = null
  streamError.value = null
}
const reloginFromError = () => {
  logoutUser()
  router.push('/register')
}

provide('app', { user, loggedIn, setUser, watchMatch, claimVip, languageOpen, accountOpen, showNotice, logoutUser })
</script>

<template>
  <div class="app-shell">
    <RouterView />
    <Transition name="fade"><LoadingOverlay v-if="loading" :message="loadingText" /></Transition>
    <StreamErrorModal v-if="streamError" :message="streamError.message" @retry="connectStream(streamError.match)" @relogin="reloginFromError" @close="streamError = null" />
    <LanguageSelector v-if="languageOpen" @close="languageOpen = false" />
    <AccountMenu v-if="accountOpen && loggedIn" @close="accountOpen = false" />
    <Transition name="notice"><div v-if="notice" class="global-notice">{{ notice }}</div></Transition>
  </div>
</template>
