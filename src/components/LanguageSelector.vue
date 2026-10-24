<script setup>
import { languages, currentLanguage, setLanguage, t } from '../i18n'
const emit = defineEmits(['close'])
const choose = (code) => { setLanguage(code); emit('close') }
</script>
<template>
  <div class="modal-backdrop" @click.self="$emit('close')"><div class="language-sheet"><div class="sheet-handle"></div><div class="sheet-head"><h2>{{ t('language') }}</h2><button class="close-button" @click="$emit('close')">×</button></div><div class="language-list"><button v-for="language in languages" :key="language.code" :class="{ active: currentLanguage === language.code }" @click="choose(language.code)"><span>{{ language.short }}</span>{{ language.label }}<b v-if="currentLanguage === language.code">✓</b></button></div></div></div>
</template>
