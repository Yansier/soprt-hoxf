<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import TeamMark from './TeamMark.vue'
import { t } from '../i18n'
import { formatKickoff, hasScore } from '../utils/matchDisplay'

const props = defineProps({ matches: { type: Array, default: () => [] } })
const app = inject('app')
const active = ref(0)
const leagueFailed = ref(false)
let timer
const slides = computed(() => props.matches)
const current = computed(() => slides.value[active.value])
const go = (index) => {
  if (!slides.value.length) return
  active.value = (index + slides.value.length) % slides.value.length
}
watch(slides, (list) => { if (active.value >= list.length) active.value = 0 })
watch(() => current.value?.id, () => { leagueFailed.value = false })
const schedule = () => { timer = setInterval(() => go(active.value + 1), 5200) }
onMounted(schedule)
onBeforeUnmount(() => clearInterval(timer))
const bannerStyle = computed(() => ({ '--banner-image': current.value?.banner ? `url(/images/${current.value.banner})` : 'none' }))
const statusLabel = (match) => {
  if (match.status === 'LIVE') return t('liveNow')
  if (match.status === 'HT') return t('halfTime')
  if (match.status === 'FINISHED') return t('fullTime')
  return t('upcoming')
}
</script>

<template>
  <section v-if="current" class="hero" :class="`hero-${(active % 4) + 1}`" :style="bannerStyle">
    <Transition name="hero-slide" mode="out-in">
      <div :key="current.id" class="hero-content">
        <div class="hero-topline">
          <span class="league-kicker">
            <img v-if="current.leagueLogo && !leagueFailed" class="league-logo" :src="current.leagueLogo" alt="" referrerpolicy="no-referrer" @error="leagueFailed = true" />
            {{ current.league }}
          </span>
          <span :class="['status-pill', { live: current.status === 'LIVE' || current.status === 'HT' }]">
            <i v-if="current.status === 'LIVE' || current.status === 'HT'"></i>
            <span>{{ statusLabel(current) }}</span>
            <em v-if="current.status === 'LIVE' && current.minute" class="status-time">{{ current.minute }}</em>
          </span>
        </div>
        <div class="hero-stage" dir="ltr">
          <span class="hero-side">
            <TeamMark class="hero-mark" :name="current.homeTeam" :logo="current.homeLogo" eager />
            <span class="hero-team">{{ current.homeTeam }}</span>
          </span>
          <span class="hero-score" dir="ltr">{{ hasScore(current) ? `${current.homeScore} : ${current.awayScore}` : formatKickoff(current) }}</span>
          <span class="hero-side away">
            <TeamMark class="hero-mark" :name="current.awayTeam" :logo="current.awayLogo" eager />
            <span class="hero-team">{{ current.awayTeam }}</span>
          </span>
        </div>
        <div class="hero-bottom">
          <button class="primary-button watch-button" @click="app.watchMatch(current)"><span class="play-icon" aria-hidden="true">▶</span>{{ current.status === 'LIVE' || current.status === 'HT' ? t('watchLive') : t('enterMatch') }}</button>
        </div>
      </div>
    </Transition>
    <div v-if="slides.length > 1" class="carousel-dots" role="tablist">
      <button v-for="(slide, index) in slides" :key="slide.id" :class="{ active: active === index }" :aria-label="`${slide.homeTeam} ${slide.awayTeam}`" @click="go(index)"></button>
    </div>
  </section>
  <section v-else class="hero hero-empty"><p class="empty-state">{{ t('noMatches') }}</p></section>
</template>
