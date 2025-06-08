<script>
  import { onMount } from "svelte";
  import { authStore } from "$lib/stores/auth.js";
  import "../app.css";

  // Initialize auth listener when component mounts
  onMount(() => {
    const unsubscribe = authStore.init();

    // Cleanup listener on component destroy
    return unsubscribe;
  });
</script>

<main>
  <slot />
</main>

<style>
  main {
    min-height: 100vh;
    width: 100%;
  }
</style>
