<template>
  <v-app-bar app color="primary" density="compact">
    <template v-slot:prepend>
      <v-app-bar-nav-icon></v-app-bar-nav-icon>
    </template>

    <v-app-bar-title>
      <div class="d-flex">
        <p class="mr-5">Yondra</p>
        <p>{{ name }}</p>
      </div>
      
    </v-app-bar-title>

    <template v-slot:append>
      <v-btn icon="mdi-dots-vertical"></v-btn>
    </template>
  </v-app-bar>
</template>

<script setup lang="ts">
  import { watch, ref } from 'vue';
import { useRoute } from 'vue-router';

  function getRouteName(route: string) {
    switch (route) {
      case '/':
        return 'Home';
      default:
        return 'Say my name';
    }
  }

  const route = useRoute();
  const name = ref(getRouteName(route.path));

  watch(() => route.path, (newPath) => {
    name.value = getRouteName(newPath)
  })

</script>

<style lang="scss" scoped></style>
