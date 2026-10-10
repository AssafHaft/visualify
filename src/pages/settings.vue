<template>
  <View>
    <nav>
      <MenuHeader title="settings" @close="router.push('/visualizer')" />
      <Column align="end" cascade>
        <Toggle label="Show Menu Labels" v-model="settings.showMenuLabels" />
        <Toggle label="Always Show Track" v-model="settings.alwaysShowTrack" />
        <Toggle label="Shuffle Designs" v-model="settings.shuffle" />
      </Column>
    </nav>
  </View>
</template>

<script setup lang="ts">
import { View, Column, Toggle, useRouter } from "@wearesage/vue";
import { MenuHeader } from "../components";
import { settings } from "../settings";

const router = useRouter();
</script>

<style lang="scss" scoped>
nav {
  @include fixed-menu;
}
</style>

<route lang="json">
{
  "name": "Settings",
  "meta": {
    "description": "configure the visualizer",
    "requiresAuth": true
  }
}
</route>
