<template>
  <nav>
    <!-- Desktop has a single source, system audio. In a browser, name what kaleidosync's "Microphone" source is really
         hearing (src/platform.ts); these attrs override the package button's own label and icon. -->
    <AudioSourceButton
      v-if="!isDesktop"
      v-bind="sources.source === AudioSource.MICROPHONE && listenTo === 'system' ? { label: 'System Audio', icon: 'sound' } : {}"
      @click="$emit('open-sources')" />

    <IconButton icon="eye" :label="settings.showMenuLabels ? 'Designs' : undefined" @click="$emit('open-designs')" />

    <IconButton to="/design" icon="sliders" :label="settings.showMenuLabels ? 'Customize' : undefined" />

    <IconButton to="/settings" icon="settings" :label="settings.showMenuLabels ? 'Settings' : undefined" />

    <IconButton
      v-if="viewport.fullscreenSupported"
      @click="viewport.toggleFullscreen"
      icon="fullscreen"
      :label="settings.showMenuLabels ? 'Fullscreen' : undefined" />
  </nav>
</template>

<script setup lang="ts">
import { IconButton, useViewport, useSources, AudioSourceButton } from "@wearesage/vue";
import { AudioSource } from "@wearesage/shared";
import { isDesktop, listenTo } from "../platform";
import { settings } from "../settings";

defineEmits(["open-sources", "open-designs"]);

const viewport = useViewport();
const sources = useSources();
</script>

<style lang="scss" scoped>
nav {
  @include fixed-menu;
}
</style>
