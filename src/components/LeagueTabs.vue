<script setup>
import { t } from '../i18n'

defineProps({ groups: { type: Array, default: () => [] } })
const jump = (id) => {
  document.getElementById(`league-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div v-if="groups.length" class="league-nav">
    <h2 class="subsection-title">{{ t('topLeagues') }}</h2>
    <div class="league-strip">
      <button v-for="group in groups" :key="group.id" @click="jump(group.id)">{{ group.name }}</button>
    </div>
  </div>
</template>
