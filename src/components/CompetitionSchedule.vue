<script setup>
import { ref, watch } from 'vue'
import ScheduleCard from './ScheduleCard.vue'
import { t } from '../i18n'

const props = defineProps({
  groups: { type: Array, default: () => [] },
  updatedLabel: { type: String, default: '' },
})
const hiddenLogos = ref({})
watch(() => props.groups, () => { hiddenLogos.value = {} })
const hideLogo = (id) => { hiddenLogos.value = { ...hiddenLogos.value, [id]: true } }
</script>

<template>
  <section class="competition-schedule">
    <div class="section-title-row">
      <div>
        <span class="eyebrow">{{ t('schedule') }}</span>
        <h2>{{ t('todaysMatches') }}</h2>
        <small v-if="updatedLabel" class="updated-at" dir="ltr">{{ updatedLabel }}</small>
      </div>
    </div>
    <p v-if="!groups.length" class="empty-state">{{ t('noMatches') }}</p>
    <article v-for="group in groups" :id="`league-${group.id}`" :key="group.id" class="league-section">
      <header class="league-heading">
        <img v-if="group.logo && !hiddenLogos[group.id]" class="league-badge" :src="group.logo" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" @error="hideLogo(group.id)" />
        <span v-else class="league-badge league-badge-fallback">{{ group.name.slice(0, 1) }}</span>
        <span class="league-copy">
          <b>{{ group.name }}</b>
          <small v-if="group.country">{{ group.country }}</small>
        </span>
        <em dir="ltr">{{ t('matchesCount', { count: group.matches.length }) }}</em>
      </header>
      <div class="schedule-row">
        <ScheduleCard v-for="match in group.matches" :key="match.id" :match="match" />
      </div>
    </article>
  </section>
</template>
