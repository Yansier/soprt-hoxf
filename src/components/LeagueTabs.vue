<script setup>
import { computed, ref, watch } from 'vue'
import { t } from '../i18n'
import MatchCard from './MatchCard.vue'

const props = defineProps({
  matches: { type: Array, default: () => [] },
  leagues: { type: Array, default: () => [] },
  updatedLabel: { type: String, default: '' },
})
const status = ref('TODAY')
const league = ref('All')
const pickedStatus = ref(false)
const tabs = ['LIVE', 'TODAY', 'UPCOMING', 'RESULTS']
const tabLabel = (tab) => ({ LIVE: t('liveNow'), TODAY: t('today'), UPCOMING: t('upcoming'), RESULTS: t('results') }[tab])
watch(() => props.matches, (list) => {
  if (pickedStatus.value) return
  status.value = (list || []).some((match) => match.status === 'LIVE' || match.status === 'HT') ? 'LIVE' : 'TODAY'
}, { immediate: true })
watch(() => props.leagues, (list) => {
  if (!(list || []).some((item) => item.id === league.value)) league.value = 'All'
})
const chooseStatus = (tab) => { pickedStatus.value = true; status.value = tab }
const visibleMatches = computed(() => props.matches.filter((match) => {
  const leagueOk = league.value === 'All' || match.leagueId === league.value
  const statusOk = status.value === 'LIVE' ? ['LIVE', 'HT'].includes(match.status)
    : status.value === 'UPCOMING' ? match.status === 'UPCOMING'
      : status.value === 'RESULTS' ? match.status === 'FINISHED' : match.status !== 'FINISHED'
  return leagueOk && statusOk
}))
</script>

<template>
  <section class="matches-section section-pad">
    <div class="section-title-row">
      <div><span class="eyebrow">{{ t('matchCenter') }}</span><h2>{{ t('liveMatches') }}</h2><small v-if="updatedLabel" class="updated-at" dir="ltr">{{ updatedLabel }}</small></div>
      <span class="live-count">{{ visibleMatches.length }}</span>
    </div>
    <div class="status-tabs">
      <button v-for="tab in tabs" :key="tab" :class="{ active: status === tab }" @click="chooseStatus(tab)">{{ tabLabel(tab) }}</button>
    </div>
    <div class="match-list">
      <MatchCard v-for="match in visibleMatches" :key="match.id" :match="match" />
      <p v-if="!visibleMatches.length" class="empty-state">{{ t('noMatches') }}</p>
    </div>
    <h2 class="subsection-title">{{ t('topLeagues') }}</h2>
    <div class="league-strip">
      <button v-for="item in leagues" :key="item.id" :class="{ active: league === item.id }" @click="league = item.id">{{ item.id === 'All' ? t('all') : item.name }}</button>
    </div>
  </section>
</template>
