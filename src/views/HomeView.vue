<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import HeroCarousel from '../components/HeroCarousel.vue'
import VipCounter from '../components/VipCounter.vue'
import LeagueTabs from '../components/LeagueTabs.vue'
import CompetitionSchedule from '../components/CompetitionSchedule.vue'
import PromoModal from '../components/PromoModal.vue'
import ActivityToast from '../components/ActivityToast.vue'
import BottomVipBar from '../components/BottomVipBar.vue'
import { activityUsers } from '../data/activityUsers'
import { useFootballData } from '../composables/useFootballData'
import { currentLanguage, t } from '../i18n'
import { randomInt } from '../utils/random'

const app = inject('app')
const { groups, featured, lastUpdated, usingFallback } = useFootballData()
const updatedLabel = computed(() => {
  if (usingFallback.value || !lastUpdated.value) return ''
  const time = new Intl.DateTimeFormat(currentLanguage.value, { hour: '2-digit', minute: '2-digit' }).format(new Date(lastUpdated.value))
  return t('updatedAt', { time })
})
const readCount = () => {
  const stored = Number(sessionStorage.getItem('hoxf_vip_spots'))
  return stored >= 120 ? stored : randomInt(420, 820)
}
const count = ref(readCount())
sessionStorage.setItem('hoxf_vip_spots', String(count.value))
const promoOpen = ref(false)
const activity = ref(null)
let countTimer, activityTimer, activityHideTimer, promoTimer

const scheduleCount = () => {
  countTimer = setTimeout(() => {
    count.value = Math.max(120, count.value - randomInt(1, 3))
    sessionStorage.setItem('hoxf_vip_spots', String(count.value))
    scheduleCount()
  }, randomInt(7000, 20000))
}
const scheduleActivity = (first = false) => {
  activityTimer = setTimeout(() => {
    const [name, country] = activityUsers[randomInt(0, activityUsers.length - 1)]
    const messages = [t('claimedVip'), t('joined'), t('receivedVip')]
    activity.value = { name, country, message: messages[randomInt(0, messages.length - 1)] }
    activityHideTimer = setTimeout(() => { activity.value = null; scheduleActivity() }, randomInt(2500, 4000))
  }, first ? randomInt(4000, 8000) : randomInt(9000, 25000))
}
const closePromo = () => { promoOpen.value = false; sessionStorage.setItem('hoxf_promo_seen', '1') }
const promoBlocked = () => Boolean(app.loggedIn.value || sessionStorage.getItem('hoxf_promo_seen') || app.safariGuardEligible.value)
const clearPromoTimer = () => { clearTimeout(promoTimer); promoTimer = 0 }
const schedulePromo = () => {
  clearPromoTimer()
  if (promoBlocked()) return
  promoTimer = setTimeout(() => {
    promoTimer = 0
    if (promoBlocked()) return
    promoOpen.value = true
    sessionStorage.setItem('hoxf_promo_seen', '1')
  }, 1000)
}

const featureItems = computed(() => [
  { icon: '◫', title: t('hdStream'), text: '1080p' }, { icon: '↯', title: t('lowLatency'), text: '< 3s' },
  { icon: '▣', title: t('multiDevice'), text: t('fourScreens') }, { icon: '◎', title: t('worldwide'), text: '24/7' },
])

onMounted(() => {
  scheduleCount(); scheduleActivity(true)
  schedulePromo()
})
watch(() => app.safariGuardEligible.value, (active) => {
  if (active) {
    clearPromoTimer()
    promoOpen.value = false
    return
  }
  if (!promoOpen.value) schedulePromo()
})
onBeforeUnmount(() => [countTimer, activityTimer, activityHideTimer, promoTimer].forEach(clearTimeout))
</script>

<template>
  <div class="page home-page">
    <AppHeader />
    <main>
      <HeroCarousel :matches="featured" />
      <div class="section-pad vip-wrap"><VipCounter :count="count" /></div>
      <section class="schedule-section section-pad">
        <LeagueTabs :groups="groups" />
        <CompetitionSchedule :groups="groups" :updated-label="updatedLabel" />
      </section>
      <section class="why-section section-pad"><span class="eyebrow">HOXF STANDARD</span><h2>{{ t('why') }}</h2><div class="feature-grid"><article v-for="item in featureItems" :key="item.title"><span>{{ item.icon }}</span><b>{{ item.title }}</b><small>{{ item.text }}</small></article></div></section>
      <section class="final-cta"><span class="stadium-lines"></span><div class="eyebrow">HOXF SPORT TV</div><h2>{{ t('neverMiss') }}</h2><p>{{ t('neverMissBody') }}</p><strong>{{ t('twelveFree') }}</strong><button class="primary-button full" @click="app.claimVip">{{ app.loggedIn.value ? t('vipActive') : t('getFreeVip') }}</button></section>
    </main>
    <footer><div class="brand footer-brand"><span class="brand-mark"><span></span></span><span>HOXF <b>SPORT TV</b></span></div><p>{{ t('footerTagline') }}</p><small>© 2026 HOXF SPORT TV</small></footer>
    <PromoModal v-if="promoOpen" :count="count" @close="closePromo" />
    <ActivityToast :activity="activity" />
    <BottomVipBar :count="count" />
  </div>
</template>
