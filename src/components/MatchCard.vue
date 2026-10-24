<script setup>
import { inject } from 'vue'
import { t } from '../i18n'

defineProps({ match: { type: Object, required: true } })
const app = inject('app')
const initials = (name) => name.split(/\s+/).map((word) => word[0]).slice(0, 2).join('')
</script>

<template>
  <article class="match-card">
    <div class="match-meta">
      <span>{{ match.league }}</span>
      <span :class="['match-status', { live: ['LIVE', 'HT'].includes(match.status) }]">
        <i v-if="['LIVE', 'HT'].includes(match.status)"></i>{{ match.status === 'LIVE' ? `${t('liveNow')} · ${match.minute}` : match.status === 'HT' ? `HT · ${match.minute}` : match.status === 'FINISHED' ? t('finished') : match.kickoff }}
      </span>
    </div>
    <div class="teams-row">
      <div class="team"><span class="team-logo">{{ initials(match.homeTeam) }}</span><b>{{ match.homeTeam }}</b></div>
      <div class="card-score" dir="ltr">
        <strong v-if="match.homeScore !== null">{{ match.homeScore }}<em>:</em>{{ match.awayScore }}</strong>
        <span v-else>VS</span>
      </div>
      <div class="team away"><span class="team-logo">{{ initials(match.awayTeam) }}</span><b>{{ match.awayTeam }}</b></div>
    </div>
    <button class="outline-button" @click="app.watchMatch(match)">{{ ['LIVE', 'HT'].includes(match.status) ? t('watchLive') : t('enterMatch') }}</button>
  </article>
</template>
