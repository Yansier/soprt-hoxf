<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { matches } from '../data/matches'
import { t } from '../i18n'

const app = inject('app')
const slides = matches.filter((match) => match.featured)
const active = ref(0)
let timer
const current = computed(() => slides[active.value])
const go = (index) => { active.value = (index + slides.length) % slides.length }
const schedule = () => { timer = setInterval(() => go(active.value + 1), 5200) }
onMounted(schedule)
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <section class="hero" :class="`hero-${active + 1}`" :style="{ '--banner-image': `url(/images/${current.banner})` }">
    <Transition name="hero-slide" mode="out-in">
      <div :key="current.id" class="hero-content">
        <div class="hero-topline">
          <span class="league-kicker">{{ current.league }}</span>
          <span :class="['status-pill', { live: current.status === 'LIVE' }]">
            <i v-if="current.status === 'LIVE'"></i>
            <span>{{ current.status === 'LIVE' ? t('liveNow') : t('upcoming') }}</span>
            <em v-if="current.minute" class="status-time">{{ current.minute }}</em>
          </span>
        </div>
        <div class="hero-stage" dir="ltr">
          <span class="hero-team">{{ current.homeTeam }}</span>
          <span class="hero-score" dir="ltr">{{ current.homeScore === null ? current.kickoff : `${current.homeScore} : ${current.awayScore}` }}</span>
          <span class="hero-team">{{ current.awayTeam }}</span>
        </div>
        <div class="hero-bottom">
          <button class="primary-button watch-button" @click="app.watchMatch(current)"><span class="play-icon" aria-hidden="true">▶</span>{{ current.status === 'LIVE' ? t('watchLive') : t('enterMatch') }}</button>
        </div>
      </div>
    </Transition>
    <div class="carousel-dots" role="tablist">
      <button v-for="(_, index) in slides" :key="index" :class="{ active: active === index }" :aria-label="`Slide ${index + 1}`" @click="go(index)"></button>
    </div>
  </section>
</template>
