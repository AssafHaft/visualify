import { useLocalStorage } from "@vueuse/core";

// User settings (pages/settings.vue), saved across restarts.
export const settings = useLocalStorage("settings", { showMenuLabels: true, alwaysShowTrack: false, shuffle: true }, { mergeDefaults: true });

// Variants saved with + on the design page, per design. Designs are keyed by shader source, the only unique thing about one.
export const savedVariants = useLocalStorage<Record<string, any[]>>("variants", {});
