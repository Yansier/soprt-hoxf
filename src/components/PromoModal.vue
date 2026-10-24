<script setup>
import { inject } from 'vue'
import { t } from '../i18n'
import { useOfferCountdown } from '../composables/useOfferCountdown'
defineProps({ count: Number })
defineEmits(['close'])
const app = inject('app')
const { formatted, checking } = useOfferCountdown()
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="promo-modal modal-card">
      <button class="close-button" aria-label="Close" @click="$emit('close')">×</button>
      <div class="trophy-icon">♛</div>
      <span class="eyebrow gold">{{ t('limitedOffer') }}</span>
      <h2>{{ t('promoTitle') }}</h2>
      <div class="spots-chip"><b>{{ count }}</b> <span>{{ t('spotsLeft', { count: '' }).trim() }}</span></div>
      <p class="promo-deadline"><span>{{ checking ? t('checkingAvailability') : t('offerClosesIn') }}</span><b dir="ltr">{{ formatted }}</b></p>
      <h3>{{ t('promoSubtitle') }}</h3>
      <p>{{ t('promoBody') }}</p>
      <div class="benefit-grid">
        <span><i>✓</i>{{ t('benefitMonths') }}</span><span><i>✓</i>{{ t('benefitFootball') }}</span>
        <span><i>✓</i>{{ t('benefitHd') }}</span><span><i>✓</i>{{ t('benefitCenter') }}</span>
      </div>
      <button class="primary-button full" @click="app.claimVip">{{ t('registerNow') }}</button>
      <button class="ghost-button" @click="$emit('close')">{{ t('maybeLater') }}</button>
    </div>
  </div>
</template>
