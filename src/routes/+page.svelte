<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/stores/auth.js";

  onMount(() => {
    // Subscribe to auth state and redirect accordingly
    const unsubscribe = authStore.subscribe(({ user, loading }) => {
      if (!loading) {
        if (user) {
          goto("/dashboard");
        } else {
          goto("/login");
        }
      }
    });

    return unsubscribe;
  });
</script>

<!-- Loading state while checking auth -->
<div class="loading">
  <div class="spinner"></div>
  <p>Loading...</p>
</div>

<style>
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: var(--spacing-4);
  }

  .spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid var(--border);
    border-top: 2px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  p {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }
</style>
