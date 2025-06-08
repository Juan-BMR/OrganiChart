<script>
  // @ts-nocheck
  import { authStore } from "$lib/stores/auth.js";
  import { organizationsStore } from "$lib/stores/organizations.js";
  import CreateOrganizationModal from "$lib/components/CreateOrganizationModal.svelte";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Header from "$lib/components/layout/Header.svelte";

  let user = null;
  let showCreateModal = false;

  // Organizations data
  let organizations = [];
  let orgsLoading = true;

  const unsubscribeOrgs = organizationsStore.subscribe(
    ({ organizations: orgs, loading }) => {
      organizations = orgs;
      orgsLoading = loading;
    }
  );

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

    return () => {
      unsubscribe();
      unsubscribeOrgs();
    };
  });

  async function handleSignOut() {
    try {
      await authStore.signOut();
      // Redirect will happen automatically via auth state change
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  }

  function openCreateModal() {
    showCreateModal = true;
  }

  function closeCreateModal() {
    showCreateModal = false;
  }
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

      {#if orgsLoading}
        <p>Loading...</p>
      {:else}
        <div class="organizations-grid">
          <!-- Add new organization card -->
          <div class="org-card add-new" on:click={openCreateModal}>
            <div class="add-icon">+</div>
            <p>Create new organization</p>
          </div>

          <!-- Existing organizations -->
          {#each organizations as org}
            <div class="org-card">
              {#if org.logoURL}
                <img src={org.logoURL} alt={org.name} class="org-logo" />
              {/if}
              <p>{org.name}</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<CreateOrganizationModal
  bind:open={showCreateModal}
  on:close={closeCreateModal}
/>

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

  .org-logo {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }
</style>
