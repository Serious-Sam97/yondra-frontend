<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import MenuBar from './components/MenuBar.vue'
</script>

<template>
  <v-app>
    <MenuBar />

    <v-main class="bg-transparent">
      <RouterView />
    </v-main>
  </v-app>
</template>

<style scoped></style>
