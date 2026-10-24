<script setup>
import { inject, ref, watch } from 'vue'
import TeamMark from './TeamMark.vue'
import { formatKickoff, hasScore, statusText } from '../utils/matchDisplay'
import { t } from '../i18n'

const props = defineProps({ match: { type: Object, required: true } })
const app = inject('app')
const leagueFailed = ref(false)
watch(() => props.match.leagueLogo, () => { leagueFailed.value = false })
</script>

<template>
  <article class="match-card" :class="{ 'is-live': ['LIVE', 'HT'].includes(match.status) }">
    <div class="match-meta">
      <span class="league-name">
        <img v-if="match.leagueLogo && !leagueFailed" class="league-logo" :src="match.leagueLogo" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" @error="leagueFailed = true" />
        <b>{{ match.league }}</b>
      </span>
      <span :class="['match-status', { live: ['LIVE', 'HT'].includes(match.status) }]" dir="ltr">
        <i v-if="['LIVE', 'HT'].includes(match.status)"></i>{{ statusText(match) }}
      </span>
    </div>
    <div class="teams-row" dir="ltr">
      <div class="team"><TeamMark :name="match.homeTeam" :logo="match.homeLogo" /><b>{{ match.homeTeam }}</b></div>
      <div class="card-score" dir="ltr">
        <strong v-if="hasScore(match)">{{ match.homeScore }}<em>:</em>{{ match.awayScore }}</strong>
        <span v-else>{{ formatKickoff(match) || t('upcoming') }}</span>
      </div>
      <div class="team away"><TeamMark :name="match.awayTeam" :logo="match.awayLogo" /><b>{{ match.awayTeam }}</b></div>
    </div>
    <button class="outline-button" @click="app.watchMatch(match)">{{ ['LIVE', 'HT'].includes(match.status) ? t('watchLive') : t('enterMatch') }}</button>
  </article>
</template>
