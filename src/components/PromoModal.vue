<script setup>
import { inject } from 'vue'
import { t } from '../i18n'
defineProps({ count: Number })
defineEmits(['close'])
const app = inject('app')
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="promo-modal modal-card">
      <button class="close-button" aria-label="Close" @click="$emit('close')">×</button>
      <div class="trophy-icon">♛</div>
      <span class="eyebrow gold">{{ t('limitedOffer') }}</span>
      <h2>{{ t('promoTitle') }}</h2>
      <h3>{{ t('promoSubtitle') }}</h3>
      <p>{{ t('promoBody') }}</p>
      <div class="benefit-grid">
        <span>✓ {{ t('benefitMonths') }}</span><span>✓ {{ t('benefitFootball') }}</span>
        <span>✓ {{ t('benefitHd') }}</span><span>✓ {{ t('benefitCenter') }}</span>
      </div>
      <div class="spots-chip"><b>{{ count }}</b> {{ t('spotsLeft', { count: '' }).trim() }}</div>
      <button class="primary-button full" @click="app.claimVip">{{ t('registerNow') }}</button>
      <button class="ghost-button" @click="$emit('close')">{{ t('maybeLater') }}</button>
    </div>
  </div>
</template>
