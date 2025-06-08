<script>
  import { authStore } from "$lib/stores/auth.js";
  import { themeStore } from "$lib/stores/theme.js";
  import { Moon, Sun, Network } from "lucide-svelte";
  import { goto } from "$app/navigation";

  export let user = null;

  let currentTheme = "light";

  // Subscribe to theme changes
  themeStore.subscribe((theme) => {
    currentTheme = theme;
  });

  async function handleSignOut() {
    try {
      await authStore.signOut();
      // Redirect will happen automatically via auth state change
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  }

  function toggleTheme() {
    themeStore.toggle();
  }

  function goToDashboard() {
    goto("/dashboard");
  }
</script>

{#if user}
  <header class="floating-header">
    <div class="user-info">
      <img src={user.photoURL} alt={user.displayName} class="avatar" />
      <span class="user-name">{user.displayName}</span>
    </div>

    <!-- Logo in center -->
    <button
      class="logo-button"
      on:click={goToDashboard}
      title="Go to Dashboard"
    >
      <Network size={28} />
      <span class="logo-text">OrganiChart</span>
    </button>

    <div class="header-actions">
      <button
        class="theme-toggle"
        on:click={toggleTheme}
        title="Toggle {currentTheme === 'light' ? 'dark' : 'light'} mode"
      >
        {#if currentTheme === "light"}
          <Moon size={18} />
        {:else}
          <Sun size={18} />
        {/if}
      </button>
      <button class="logout-btn" on:click={handleSignOut}>Logout</button>
    </div>
  </header>
{/if}

<style>
  .floating-header {
    position: fixed;
    top: var(--spacing-4);
    left: var(--spacing-4);
    right: var(--spacing-4);
    background: var(--primary);
    color: white;
    padding: var(--spacing-3) var(--spacing-6);
    border-radius: var(--radius-xl);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-6);
    box-shadow: var(--shadow-lg);
    z-index: 1000;
    max-width: 1200px;
    margin: 0 auto;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .avatar {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  .user-name {
    font-weight: 500;
    font-size: var(--font-size-sm);
  }

  .logo-button {
    background: none;
    border: none;
    color: white;
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    cursor: pointer;
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
    font-weight: 600;
    font-size: var(--font-size-lg);
  }

  .logo-button:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.02);
  }

  .logo-text {
    font-family:
      "Inter",
      system-ui,
      -apple-system,
      sans-serif;
    letter-spacing: -0.02em;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .theme-toggle {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    padding: var(--spacing-2);
    border-radius: var(--radius-md);
    font-size: 1.2rem;
    cursor: pointer;
    transition: background 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
  }

  .theme-toggle:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .logout-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .logout-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
