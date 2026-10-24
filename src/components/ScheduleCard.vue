<script setup>
import { inject } from 'vue'
import TeamMark from './TeamMark.vue'
import { t } from '../i18n'
import { formatKickoff, hasScore } from '../utils/matchDisplay.js'

const props = defineProps({ match: { type: Object, required: true } })
const app = inject('app')
const playable = () => props.match.status === 'LIVE' || props.match.status === 'HT' || props.match.status === 'UPCOMING'
const open = () => { if (playable()) app.watchMatch(props.match) }
</script>

<template>
  <article class="schedule-card" :class="{ 'is-live': match.status === 'LIVE' || match.status === 'HT', 'is-finished': match.status === 'FINISHED', 'is-playable': playable() }" @click="open">
    <div class="schedule-status" dir="ltr">
      <template v-if="match.status === 'LIVE'">{{ t('liveNow') }}<em v-if="match.minute"> · {{ match.minute }}</em></template>
      <template v-else-if="match.status === 'HT'">{{ t('halfTime') }}</template>
      <template v-else-if="match.status === 'FINISHED'">{{ t('fullTime') }}</template>
      <template v-else>{{ formatKickoff(match) }}</template>
    </div>
    <div class="schedule-side" dir="ltr">
      <TeamMark :name="match.homeTeam" :logo="match.homeLogo" />
      <b>{{ match.homeTeam }}</b>
    </div>
    <div class="schedule-score" dir="ltr">
      <strong v-if="hasScore(match)">{{ match.homeScore }}<em>:</em>{{ match.awayScore }}</strong>
      <span v-else>VS</span>
    </div>
    <div class="schedule-side" dir="ltr">
      <TeamMark :name="match.awayTeam" :logo="match.awayLogo" />
      <b>{{ match.awayTeam }}</b>
    </div>
    <button v-if="playable()" class="outline-button schedule-action" @click.stop="open">{{ match.status === 'UPCOMING' ? t('enterMatch') : t('watchLive') }}</button>
    <span v-else class="schedule-ended">{{ t('matchEnded') }}</span>
  </article>
</template>
