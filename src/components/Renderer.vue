<template>
  <figure class="renderer" :style="styles" :class="{ show: ui.showShaderScroll }">
    <TresCanvas
      :width="width"
      :height="height"
      :dpr="dpr"
      class="canvas"
      render-mode="manual"
      :antialias="false"
      :alpha="false"
      :premultiplied-alpha="false"
      :preserve-drawing-buffer="false"
      power-preference="high-performance"
      ref="context">
      <TresPerspectiveCamera :position="[0, 0, 1]" />
      <SketchMesh
        ref="sketch"
        :key="renderIndex"
        :width="width"
        :height="height"
        :shader="sketches.shader"
        :uniforms="sketches.uniforms"
        :volume="sources.volume"
        :stream="sources.stream"
        :time="raf.time" />
      <ShaderScroll
        @select="selectSketch"
        ref="scroll"
        :scrollY="viewport.scrollY"
        :width="viewport.width"
        :height="viewport.height"
        :dpr="dpr"
        :visible="ui.showShaderScroll"
        :sketches="sketches.iterations"
        :volume="sources.volume"
        :stream="sources.stream"
        :time="raf.time" />
    </TresCanvas>
    <!-- Shuffle's dissolve: the outgoing design's last frame, fading out over the incoming one. -->
    <canvas ref="fade" class="fade" />
  </figure>
</template>

<script setup lang="ts">
import { computed, shallowRef, ref, watch, toRef } from "vue";
import {
  ShaderScroll,
  SketchMesh,
  useRAF,
  useSketches,
  useSources,
  useAnimation,
  useViewport,
  useDevice,
  useShaderErrorDetection,
  useRoute,
  useUI,
  audioSystem
} from "@wearesage/vue";
import { settings, savedVariants } from "../settings";
import { shuffleTimer } from "../shuffle";
import { simpleDesigns } from "../simple-designs";

const raf = useRAF();
const sketches = useSketches();
const sources = useSources();
const route = useRoute();
const device = useDevice();
const ui = useUI();
const viewport = useViewport();
const width = computed(() => viewport.width);
const height = computed(() => viewport.height);
const dpr = computed(() => (1 ? 1 : device.isMobile ? 1 : 1));
const context = shallowRef();
const sketch = shallowRef();
const scroll = shallowRef();
const { error, setup, isSetup } = useShaderErrorDetection(toRef(sketches.shader));
const renderIndex = ref(0);
const fade = shallowRef<HTMLCanvasElement>();
let shuffleDue = shuffleTimer();
let lastFrame = 0;

const styles = computed(() => {
  return {
    width: width.value + "px",
    height: height.value + "px",
    opacity: 1
  };
});

watch(
  () => route.value.path,
  () => {
    sketches.magicTween(1000);
  }
);

watch(error, val => {
  sketches.shaderError = val?.message ? val : null;
});

watch(
  () => [sketches.shader, sketches.uniformKeysSerialized],
  () => {
    renderIndex.value++;
  },
  {
    immediate: true,
    deep: true
  }
);

// A new uniforms object (saving or re-picking a variant) needs a fresh mesh too: three.js reads material.uniforms
// once per program, so for the same shader it would keep drawing the old values and frozen time.
watch(
  () => sketches.uniforms,
  () => renderIndex.value++
);

// Every design gets a fresh wait, whether picked by hand or by shuffle.
watch(
  () => sketches.sketch,
  () => (shuffleDue = shuffleTimer())
);

function selectSketch(s: any) {
  sketches.selectSketch(s);
  ui.showShaderScroll = false;
}

// Shuffle: freeze the outgoing design's last frame over the canvas, switch to another design underneath, and dissolve.
function shuffle(canvas: HTMLCanvasElement) {
  const freeze = fade.value!;
  freeze.width = canvas.width;
  freeze.height = canvas.height;
  freeze.getContext("2d")!.drawImage(canvas, 0, 0);
  freeze.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 3000, easing: "ease-in-out" });
  const n = sketches.iterations.length;
  sketches.selectSketchByIndex((sketches.index + 1 + Math.floor(Math.random() * (n - 1))) % n);
}

useAnimation(now => {
  if (!context.value?.context) return;
  const { renderer, scene, camera } = context.value?.context;
  if (!isSetup.value && route.value.path === "/design") setup(renderer.value);
  sketch.value?.update?.(now);
  scroll.value?.update?.(now);
  renderer.value.render(scene.value, camera.value);

  const seconds = (raf.time - lastFrame) / 1000; // not `now`: the RAF store hands this callback a ref, not a timestamp
  lastFrame = raf.time;
  const shuffling = settings.value.shuffle && route.value.path === "/visualizer" && !ui.showShaderScroll;
  if (shuffling && shuffleDue(seconds, audioSystem.rawVolume)) shuffle(renderer.value.domElement);
});

// The simple designs (simple-designs.ts) go first in the Designs browser; saved variants (pages/design.vue) apply to all.
sketches.iterations.unshift(...simpleDesigns);
for (const s of sketches.iterations) s.variants = savedVariants.value[s.shader] ?? s.variants;
if (!sketches.sketch) sketches.sampleSketches();

document.body.addEventListener("wheel", e => {
  raf.preFrame.push(() => {
    viewport.onScroll(e.deltaY);
  });
});

// Phones have no wheel: a vertical swipe scrolls the Designs browser instead, following the finger. 500 scroll units
// are one world unit (useShaderLayout), and the 50° camera at z = 1 shows 2·tan(25°) ≈ 0.93 of them, so a swipe the
// height of the screen is ~466 units.
let touchY = 0;
document.body.addEventListener("touchstart", e => (touchY = e.touches[0].clientY), { passive: true });
document.body.addEventListener(
  "touchmove",
  e => {
    const dy = touchY - e.touches[0].clientY;
    touchY = e.touches[0].clientY;
    if (ui.showShaderScroll) raf.preFrame.push(() => viewport.onScroll((dy * 466) / window.innerHeight));
  },
  { passive: true }
);
</script>

<style lang="scss" scoped>
figure {
  @include position(fixed, 0 0 null null, 1);
  @include size(100%);
  transition: all 1000ms $transition-easing;
}

.fade {
  @include position(absolute, 0 null null 0, 1);
  @include size(100%);
  opacity: 0;
  pointer-events: none;
}
</style>
