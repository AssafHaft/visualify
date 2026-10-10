<template>
  <nav>
    <MenuHeader @close="$emit('close')" title="choose your audio source" />
    <!-- Phones can't share other apps' audio with a web page at all, so they only get the mic. Firefox and Safari show
         the share picker but share no audio; the toast in pages/visualizer.vue covers that. -->
    <IconButton v-if="canShareAudio" icon="sound" @click="$emit('listen', 'system')" label="System Audio" />
    <IconButton icon="microphone" @click="$emit('listen', 'microphone')" label="Microphone" />
  </nav>
</template>

<script setup lang="ts">
import { IconButton } from "@wearesage/vue";
import MenuHeader from "./MenuHeader.vue";
import { canShareAudio } from "../platform";

defineEmits(["close", "listen"]);
</script>

<style lang="scss" scoped>
nav {
  @include fixed-menu;
}
</style>
