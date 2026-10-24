<script setup>
import { computed, inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import { currentLanguage, t } from '../i18n'
import { generateCaptcha } from '../utils/captcha'
import { registerUser } from '../utils/auth'

const app = inject('app')
const router = useRouter()
const form = ref({ name: '', email: '', captcha: '' })
const captcha = ref(generateCaptcha())
const error = ref('')
const submitting = ref(false)
const success = ref(null)
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const expiry = computed(() => success.value ? new Intl.DateTimeFormat(currentLanguage.value, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(success.value.vipExpireAt)) : '')

const submit = async () => {
  error.value = ''
  if (!form.value.name.trim() || !form.value.email.trim() || !form.value.captcha.trim()) return error.value = t('required')
  if (!isValidEmail(form.value.email)) return error.value = t('invalidEmail')
  if (form.value.captcha.toUpperCase() !== captcha.value) { captcha.value = generateCaptcha(); form.value.captcha = ''; return error.value = t('invalidCode') }
  submitting.value = true
  await new Promise((resolve) => setTimeout(resolve, 1000))
  success.value = registerUser(form.value.name, form.value.email)
  app.setUser(success.value)
  submitting.value = false
}
</script>

<template>
  <div class="page register-page">
    <AppHeader />
    <main class="register-main">
      <button class="back-link" @click="router.back()"><span aria-hidden="true">←</span> {{ t('back') }}</button>
      <Transition name="hero-slide" mode="out-in">
        <section v-if="!success" key="form" class="register-card">
          <div class="register-orbit"><span>12</span><small>MONTHS</small></div>
          <span class="eyebrow">HOXF SPORT TV VIP</span><h1>{{ t('createAccount') }}</h1><p>{{ t('claimSubtitle') }}</p>
          <form @submit.prevent="submit">
            <label>{{ t('name') }}<input v-model="form.name" autocomplete="name" :placeholder="t('name')" /></label>
            <label>{{ t('email') }}<input v-model="form.email" type="email" autocomplete="email" placeholder="name@example.com" /></label>
            <label>{{ t('verification') }}<div class="captcha-row"><input v-model="form.captcha" maxlength="4" autocapitalize="characters" :placeholder="t('verification')" /><button type="button" class="captcha" :title="t('refreshCode')" @click="captcha = generateCaptcha()">{{ captcha }}</button></div></label>
            <p v-if="error" class="form-error">{{ error }}</p>
            <button class="primary-button full" type="submit">{{ t('registerClaim') }}</button>
          </form>
          <div class="existing"><span>{{ t('alreadyRegistered') }}</span><button @click="app.showNotice(t('accountNote'))">{{ t('continueExisting') }}</button></div>
        </section>
        <section v-else key="success" class="register-card success-card">
          <div class="success-check">✓</div><span class="eyebrow">{{ t('welcome') }}</span><h1>{{ t('activated') }}</h1><p>{{ t('activatedBody') }}</p><div class="valid-card"><span>{{ t('validUntil') }}</span><b>{{ expiry }}</b></div><button class="primary-button full" @click="router.push('/')">{{ t('enterHoxf') }}</button>
        </section>
      </Transition>
    </main>
    <LoadingOverlay v-if="submitting" :message="t('creating')" />
  </div>
</template>
