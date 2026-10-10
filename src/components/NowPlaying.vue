<template>
  <Row v-if="track?.title" class="now-playing" align="center" gap=".5">
    <IconButton icon="previous" @click="send('previous')" />
    <IconButton :icon="track.playing ? 'pause' : 'play'" @click="send('toggle')" />
    <IconButton icon="next" @click="send('next')" />
    <h3>
      {{ track.title }}<template v-if="track.artist"><em> | </em>{{ track.artist }}</template>
    </h3>
  </Row>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useIntervalFn } from "@vueuse/core";
import { Row, IconButton } from "@wearesage/vue";

// What Spotify (or the current media app) is playing, with its controls. desktop.js serves both from media.ps1.
const track = ref<{ title: string; artist: string; playing: boolean } | null>(null);
useIntervalFn(async () => (track.value = await fetch("/now-playing").then(r => r.json())), 500, { immediateCallback: true });
const send = (command: string) => fetch(`/now-playing/${command}`, { method: "POST" });
</script>

<style lang="scss" scoped>
.now-playing {
  @include position(fixed, null null 1rem 1rem, 500);
}

h3 {
  @include shadow;
  @include box(0.25 0.5);
  font-family: "Space Mono", monospace;
}
</style>
