<script setup>
import { inject } from 'vue'
import { t } from '../i18n'
import { getVipRemainingDays } from '../utils/auth'

defineProps({ count: { type: Number, required: true } })
const app = inject('app')
</script>

<template>
  <section class="vip-counter panel-glow">
    <div class="eyebrow">{{ app.loggedIn.value ? t('vipActive') : t('limitedOffer') }}</div>
    <h2>{{ app.loggedIn.value ? t('twelveFree') : t('freeAccess') }}</h2>
    <template v-if="app.loggedIn.value">
      <div class="vip-active-seal"><span>VIP</span><b>✓</b></div>
      <p class="counter-label">{{ t('daysRemaining', { count: getVipRemainingDays(app.user.value) }) }}</p>
    </template>
    <template v-else>
      <Transition name="count" mode="out-in"><strong :key="count" class="counter-number">{{ count }}</strong></Transition>
      <p class="counter-label">{{ t('passesRemaining') }}</p>
    </template>
    <button class="primary-button full" @click="app.claimVip">{{ app.loggedIn.value ? t('vipActive') : t('claimVip') }}</button>
  </section>
</template>
