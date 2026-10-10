<template>
  <View :class="{ hidden: ui.showShaderScroll }">
    <!-- <Transition name="fade-up">
      <AccountPill v-if="showMenu || showSources" />
    </Transition> -->

    <Transition name="fade">
      <Menu v-if="showMenu && !forceHide" @open-sources="openSources" @open-designs="openDesigns" />
    </Transition>

    <Transition name="fade">
      <AudioSources v-if="showSources" @close="closeSources" @listen="listen" />
    </Transition>

    <Transition name="fade-down">
      <NowPlaying v-if="isDesktop && showTrack" />
      <TrackDisplay v-else-if="showTrack && sources.source" />
    </Transition>
  </View>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useMagicKeys, useWakeLock } from "@vueuse/core";
import { View, useSources, useViewport, useUI, useSketches, useAudio, useToast, TrackDisplay } from "@wearesage/vue";
import { Menu, AudioSources, NowPlaying } from "../components";
import { AudioSource } from "@wearesage/shared";
import { isDesktop, listenTo } from "../platform";
import { settings } from "../settings";

const toast = useToast();
const wakeLock = useWakeLock();
const viewport = useViewport();
const sources = useSources();
const audio = useAudio();
const sketches = useSketches();
const ui = useUI();
const showSources = ref(!sources.source && !isDesktop);
const showMenu = ref(!showSources.value);
const forceHide = ref(false);
const showTrack = computed(() => (showMenu.value && !forceHide.value) || settings.value.alwaysShowTrack);
const { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } = useMagicKeys();
const showMenuTimeout = ref<any>(null);
const forceHideTimeout = ref<any>(null);
const MOUSE_TIMEOUT = 2000;

onMounted(() => {
  wakeLock.request("screen"); // keep phones (and screensavers) from blanking the visuals

  if (isDesktop && !sources.source) {
    // Start on system audio at launch. kaleidosync holds audio until a click; Electron doesn't need one (desktop.js),
    // so satisfy its gesture check.
    document.dispatchEvent(new Event("mousedown"));
    listen("system");
  }
});

// Starts kaleidosync's "Microphone" source on what platform.ts should hear. Prime audio first: the source switch needs
// it, and kaleidosync otherwise primes on a timer after the first click, racing that same click.
async function listen(to: "system" | "microphone") {
  listenTo.value = to;
  showSources.value = false;
  showMenu.value = false;
  await audio.initializeAudio();
  await sources.selectSource(AudioSource.MICROPHONE);
  if (sources.source === AudioSource.MICROPHONE) return;
  toast.error(to === "system" ? "No audio was shared. Pick a tab or Entire screen, and turn on its audio." : "Couldn't use the microphone.");
  showSources.value = true;
}

watch(
  () => viewport.mouse,
  () => {
    if (forceHide.value || showSources.value || ui.showShaderScroll) return;
    clearTimeout(showMenuTimeout.value);
    showMenu.value = true;
    showMenuTimeout.value = setTimeout(() => {
      showMenu.value = false;
    }, MOUSE_TIMEOUT);
  }
);

watch(
  showMenu,
  val => {
    if (val) {
      sketches.stopMagicInterval();
    } else {
      sketches.startMagicInterval();
    }
  },
  {
    immediate: true
  }
);

watch(
  () => sketches.sketch,
  () => applyForceHide()
);

watch(ArrowLeft, val => {
  if (val) sketches.selectPreviousSketch("keyboard");
});

watch(ArrowUp, val => {
  if (val) sketches.selectPreviousSketch("keyboard");
});

watch(ArrowRight, val => {
  if (val) sketches.selectNextSketch("keyboard");
});

watch(ArrowDown, val => {
  if (val) sketches.selectNextSketch("keyboard");
});

function applyForceHide() {
  clearTimeout(showMenuTimeout.value);
  clearTimeout(forceHideTimeout.value);
  forceHide.value = true;
  showMenu.value = false;
  forceHideTimeout.value = setTimeout(() => {
    forceHide.value = false;
  }, MOUSE_TIMEOUT / 2);
}

function openSources() {
  showMenu.value = false;
  showSources.value = true;
}

function closeSources() {
  showSources.value = false;
  showMenu.value = true;
}

function openDesigns() {
  showMenu.value = false;
  ui.showShaderScroll = true;
}
</script>

<route lang="json">
{
  "name": "Visualizer",
  "meta": {
    "description": "the main visualizer",
    "requiresAuth": true
  }
}
</route>

<style lang="scss" scoped>
.hidden {
  pointer-events: none;
}
</style>
