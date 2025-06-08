<script>
  import { authStore } from "$lib/stores/auth.js";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Header from "$lib/components/layout/Header.svelte";

  let user = null;

  // Redirect if not authenticated
  onMount(() => {
    const unsubscribe = authStore.subscribe(
      ({ user: currentUser, loading }) => {
        if (!loading) {
          if (!currentUser) {
            goto("/login");
          } else {
            user = currentUser;
          }
        }
      }
    );

    return unsubscribe;
  });
</script>

<svelte:head>
  <title>Dashboard - OrganiChart</title>
</svelte:head>

<Header {user} />

{#if user}
  <!-- Main Content -->
  <div class="dashboard-container">
    <div class="content">
      <h1>Your organizations</h1>

      <div class="organizations-grid">
        <!-- Placeholder for organizations -->
        <div class="org-card add-new">
          <div class="add-icon">+</div>
          <p>Create new organization</p>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .dashboard-container {
    min-height: 100vh;
    background-color: var(--surface);
    padding: calc(var(--spacing-16) + var(--spacing-4) + 48px) var(--spacing-4)
      var(--spacing-8);
  }

  .content {
    max-width: 1200px;
    margin: 0 auto;
  }

  h1 {
    font-size: var(--font-size-2xl);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-8);
  }

  .organizations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--spacing-6);
  }

  .org-card {
    background: var(--background);
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-8);
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 150px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-3);
  }

  .org-card.add-new:hover {
    border-color: var(--primary);
    background: var(--surface);
  }

  .add-icon {
    font-size: var(--font-size-3xl);
    color: var(--text-secondary);
    font-weight: 300;
  }

  .org-card p {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin: 0;
  }
</style>
