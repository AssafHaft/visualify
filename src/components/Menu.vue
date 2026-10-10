<template>
  <nav>
    <!-- Desktop has a single source, system audio (src/desktop.ts), so there's nothing to pick. -->
    <AudioSourceButton v-if="!isDesktop" @click="$emit('open-sources')" />

    <IconButton
      v-if="sources.source === AudioSource.AUDIUS"
      to="/audius"
      :label="settings.showMenuLabels ? 'Library' : undefined"
      icon="vinyl" />

    <IconButton icon="eye" :label="settings.showMenuLabels ? 'Designs' : undefined" @click="$emit('open-designs')" />

    <IconButton to="/design" icon="sliders" :label="settings.showMenuLabels ? 'Customize' : undefined" />

    <IconButton to="/settings" icon="settings" :label="settings.showMenuLabels ? 'Settings' : undefined" />

    <!-- Web Share doesn't exist in Electron. -->
    <IconButton v-if="!isDesktop" @click="share" icon="share" :label="settings.showMenuLabels ? 'Share' : undefined" />

    <IconButton
      v-if="viewport.fullscreenSupported"
      @click="viewport.toggleFullscreen"
      icon="fullscreen"
      :label="settings.showMenuLabels ? 'Fullscreen' : undefined" />
  </nav>
</template>

<script setup lang="ts">
import { IconButton, useViewport, useSources, useNativeShare, AudioSourceButton } from "@wearesage/vue";
import { AudioSource } from "@wearesage/shared";
import { isDesktop } from "../desktop";
import { settings } from "../settings";

defineEmits(["open-sources", "open-designs"]);

const viewport = useViewport();
const sources = useSources();
const share = useNativeShare();
</script>

<style lang="scss" scoped>
nav {
  @include fixed-menu;
}
</style>
