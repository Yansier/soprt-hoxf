<script setup>
import { inject } from 'vue'
import { t } from '../i18n'
import { getVipRemainingDays } from '../utils/auth'
import { useOfferCountdown } from '../composables/useOfferCountdown'

defineProps({ count: { type: Number, required: true } })
const app = inject('app')
const { formatted, checking } = useOfferCountdown()
</script>

<template>
  <section class="vip-counter panel-glow" :class="{ 'is-member': app.loggedIn.value }">
    <template v-if="app.loggedIn.value">
      <div class="eyebrow">{{ t('vipMembership') }}</div>
      <div class="vip-active-seal"><span>{{ t('vipActive') }}</span><b>✓</b></div>
      <p class="counter-label">{{ t('daysRemaining', { count: getVipRemainingDays(app.user.value) }) }}</p>
      <p class="member-note">{{ t('vipEnjoy') }}</p>
    </template>
    <template v-else>
      <div class="eyebrow">{{ t('limitedOffer') }}</div>
      <h2>{{ t('freeAccess') }}</h2>
      <div class="counter-slot"><Transition name="count" mode="out-in"><strong :key="count" class="counter-number">{{ count }}</strong></Transition></div>
      <p class="counter-label">{{ t('passesRemaining') }}</p>
      <p class="offer-label">{{ checking ? t('checkingAvailability') : t('offerEndsIn') }}</p>
      <p class="offer-clock" dir="ltr">{{ formatted }}</p>
      <button class="primary-button full" @click="app.claimVip">{{ t('claimVip') }}</button>
    </template>
  </section>
</template>
