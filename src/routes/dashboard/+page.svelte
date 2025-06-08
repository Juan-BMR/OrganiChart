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
            <div
              class="org-card existing"
              on:click={() => {
                /* TODO: Navigate to org chart */
              }}
            >
              <div class="org-content">
                {#if org.logoURL}
                  <img src={org.logoURL} alt={org.name} class="org-logo" />
                {:else}
                  <div class="org-logo-placeholder">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                {/if}
                <h3 class="org-name">{org.name}</h3>
                <span class="org-members">{org.memberCount || 0} members</span>
              </div>
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

  /* Create new card styling */
  .org-card.add-new {
    border: 2px dashed var(--border);
  }

  .org-card.add-new:hover {
    border-color: var(--primary);
    background: var(--surface);
  }

  /* Existing organization card styling */
  .org-card.existing {
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    background: var(--background);
  }

  .org-card.existing:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--primary-light);
    transform: translateY(-2px);
  }

  .org-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
    width: 100%;
  }

  .add-icon {
    font-size: var(--font-size-3xl);
    color: var(--text-secondary);
    font-weight: 300;
  }

  .org-card.add-new p {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin: 0;
  }

  .org-logo {
    width: 64px;
    height: 64px;
    object-fit: contain;
    border-radius: var(--radius-md);
  }

  .org-logo-placeholder {
    width: 64px;
    height: 64px;
    background: var(--primary);
    color: white;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-xl);
    font-weight: 600;
  }

  .org-name {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    line-height: 1.2;
  }

  .org-members {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin: 0;
  }
</style>
