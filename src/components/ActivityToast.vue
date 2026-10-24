<script setup>
defineProps({ activity: Object })
</script>
<template>
  <Transition name="activity"><div v-if="activity" class="activity-toast"><span class="activity-check">✓</span><div><b>{{ activity.name }} <small v-if="activity.country">· {{ activity.country }}</small></b><p>{{ activity.message }}</p></div></div></Transition>
</template>
