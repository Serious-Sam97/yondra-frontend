<script setup lang="ts">
import { RouterView } from 'vue-router'
import MenuBar from './components/MenuBar.vue'
</script>

<template>
  <v-app class="bg-transparent">
    <MenuBar />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<style scoped></style>
