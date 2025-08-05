<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/stores/auth.js";
  import Header from "$lib/components/layout/Header.svelte";
  import ChatPanel from "$lib/components/ChatPanel.svelte";

  let user = null;

  // Redirect to /login if not authenticated, otherwise set user
  onMount(() => {
    const unsubscribe = authStore.subscribe(({ user: u, loading }) => {
      if (!loading) {
        if (!u) {
          goto("/login");
        } else {
          user = u;
        }
      }
    });
    return unsubscribe;
  });
</script>

<svelte:head>
  <title>Chat – OrganiChart AI Assistant</title>
</svelte:head>

{#if user}
  <Header {user} />

  <!-- Main chat area; ChatPanel fills the viewport and starts expanded -->
  <div class="chat-page-container">
    <ChatPanel collapsedByDefault={false} />
  </div>
{/if}

<style>
  .chat-page-container {
    height: 100vh;
    width: 100%;
    /* Ensure the ChatPanel is visible (it is fixed to right); we add padding to left */
    padding-top: calc(var(--header-height, 64px) + var(--spacing-8));
  }
</style>