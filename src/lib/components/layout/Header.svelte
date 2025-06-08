<script>
  import { authStore } from "$lib/stores/auth.js";

  export let user = null;

  async function handleSignOut() {
    try {
      await authStore.signOut();
      // Redirect will happen automatically via auth state change
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  }
</script>

{#if user}
  <header class="floating-header">
    <div class="user-info">
      <img src={user.photoURL} alt={user.displayName} class="avatar" />
      <span class="user-name">{user.displayName}</span>
    </div>
    <button class="logout-btn" on:click={handleSignOut}>Logout</button>
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
