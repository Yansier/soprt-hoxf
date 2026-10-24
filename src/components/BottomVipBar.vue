<script setup>
import { inject } from 'vue'
import { t } from '../i18n'
defineProps({ count: Number })
const app = inject('app')
</script>
<template>
  <div class="bottom-vip-bar" :class="{ 'is-member': app.loggedIn.value }"><div><span>{{ app.loggedIn.value ? t('vipActive') : t('spotsLeft', { count }) }}</span><b v-if="app.loggedIn.value">HOXF SPORT TV</b><b v-else>{{ count }}</b></div><button @click="app.loggedIn.value ? app.watchMatch() : app.claimVip()">{{ app.loggedIn.value ? t('watchLive') : t('joinNow') }}</button></div>
</template>
