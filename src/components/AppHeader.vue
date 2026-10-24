<script setup>
import { inject } from 'vue'
import { useRouter } from 'vue-router'
import { currentLanguageMeta, t } from '../i18n'

const app = inject('app')
const router = useRouter()
</script>

<template>
  <header class="app-header">
    <button class="brand" aria-label="HOXF SPORT TV home" @click="router.push('/')">
      <span class="brand-mark"><span></span></span>
      <span>HOXF <b>SPORT TV</b></span>
    </button>
    <div class="header-actions">
      <button v-if="!app.loggedIn.value" class="text-button" @click="router.push('/register')">{{ t('signIn') }}</button>
      <div v-else class="user-chip">
        <span class="avatar">{{ app.user.value.name.charAt(0).toUpperCase() }}</span>
        <span class="user-name">{{ app.user.value.name.split(' ')[0] }}</span>
        <span class="vip-mini">VIP</span>
      </div>
      <button class="lang-button" :aria-label="t('language')" @click="app.languageOpen.value = true">◎ {{ currentLanguageMeta.short }}</button>
    </div>
  </header>
</template>
