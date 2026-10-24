<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  logo: { type: String, default: '' },
  eager: { type: Boolean, default: false },
})
const failed = ref(false)
watch(() => props.logo, () => { failed.value = false })
const initials = computed(() => props.name.split(/\s+/).filter(Boolean).map((word) => word[0]).slice(0, 2).join('') || '•')
</script>

<template>
  <span class="team-logo">
    <img v-if="logo && !failed" :src="logo" alt="" :loading="eager ? 'eager' : 'lazy'" decoding="async" referrerpolicy="no-referrer" @error="failed = true" />
    <template v-else>{{ initials }}</template>
  </span>
</template>
