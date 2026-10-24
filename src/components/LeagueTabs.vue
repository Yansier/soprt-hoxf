<script setup>
import { computed, ref } from 'vue'
import { leagues, matches } from '../data/matches'
import { t } from '../i18n'
import MatchCard from './MatchCard.vue'

const status = ref('LIVE')
const league = ref('All')
const tabs = ['LIVE', 'TODAY', 'UPCOMING', 'RESULTS']
const tabLabel = (tab) => ({ LIVE: t('liveNow'), TODAY: t('today'), UPCOMING: t('upcoming'), RESULTS: t('results') }[tab])
const visibleMatches = computed(() => matches.filter((match) => {
  const leagueOk = league.value === 'All' || match.league === league.value
  const statusOk = status.value === 'LIVE' ? ['LIVE', 'HT'].includes(match.status)
    : status.value === 'UPCOMING' ? match.status === 'UPCOMING'
      : status.value === 'RESULTS' ? match.status === 'FINISHED' : match.status !== 'FINISHED'
  return leagueOk && statusOk
}))
</script>

<template>
  <section class="matches-section section-pad">
    <div class="section-title-row"><div><span class="eyebrow">{{ t('matchCenter') }}</span><h2>{{ t('liveMatches') }}</h2></div><span class="live-count">{{ visibleMatches.length }}</span></div>
    <div class="status-tabs">
      <button v-for="tab in tabs" :key="tab" :class="{ active: status === tab }" @click="status = tab">{{ tabLabel(tab) }}</button>
    </div>
    <div class="match-list">
      <MatchCard v-for="match in visibleMatches" :key="match.id" :match="match" />
      <p v-if="!visibleMatches.length" class="empty-state">{{ t('noMatches') }}</p>
    </div>
    <h2 class="subsection-title">{{ t('topLeagues') }}</h2>
    <div class="league-strip">
      <button v-for="item in leagues" :key="item" :class="{ active: league === item }" @click="league = item">{{ item === 'All' ? t('all') : item }}</button>
    </div>
  </section>
</template>
