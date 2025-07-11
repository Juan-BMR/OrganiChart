<script>
  // @ts-nocheck
  import { authStore } from "$lib/stores/auth.js";
  import { organizationsStore } from "$lib/stores/organizations.js";
  import CreateOrganizationModal from "$lib/components/CreateOrganizationModal.svelte";
  import EditOrganizationModal from "$lib/components/EditOrganizationModal.svelte";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Header from "$lib/components/layout/Header.svelte";

  let user = null;
  let showCreateModal = false;

  // Organizations data
  let organizations = [];
  let orgsLoading = true;

  // Delete confirmation state
  let showDeleteConfirmation = false;
  let organizationToDelete = null;
  let deleteModalElement;
  let deleteLoading = false;

  // Edit organization state
  let showEditOrganization = false;
  let organizationToEdit = null;

  // Focus delete modal when it opens
  $: if (showDeleteConfirmation && deleteModalElement) {
    deleteModalElement.focus();
  }

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

  function handleEditOrganization(org, event) {
    event.stopPropagation(); // Prevent navigation to the org
    organizationToEdit = org;
    showEditOrganization = true;
  }

  function closeEditOrganization() {
    showEditOrganization = false;
    organizationToEdit = null;
  }

  function handleDeleteOrganization(org, event) {
    event.stopPropagation(); // Prevent navigation to the org
    organizationToDelete = org;
    showDeleteConfirmation = true;
  }

  async function confirmDelete() {
    if (!organizationToDelete || deleteLoading) return;

    deleteLoading = true;
    try {
      await organizationsStore.deleteOrganization(organizationToDelete.id);
      showDeleteConfirmation = false;
      organizationToDelete = null;
    } catch (error) {
      console.error("Failed to delete organization:", error);
      // You could add error handling UI here
    } finally {
      deleteLoading = false;
    }
  }

  function cancelDelete() {
    if (deleteLoading) return; // Prevent canceling during deletion
    showDeleteConfirmation = false;
    organizationToDelete = null;
    deleteLoading = false;
  }

  function handleDeleteModalKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation(); // Prevent ESC from bubbling up
      cancelDelete();
    }
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
                goto(`/org/${org.id}/chart`);
              }}
            >
              <div class="card-actions">
                <button
                  class="action-btn delete-btn"
                  on:click={(e) => handleDeleteOrganization(org, e)}
                  title="Delete organization"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
                <button
                  class="action-btn edit-btn"
                  on:click={(e) => handleEditOrganization(org, e)}
                  title="Edit organization"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              </div>
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

<EditOrganizationModal
  bind:open={showEditOrganization}
  organization={organizationToEdit}
  on:close={closeEditOrganization}
/>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirmation}
  <div class="confirmation-overlay" on:click|self={cancelDelete}>
    <div
      class="confirmation-modal"
      on:keydown={handleDeleteModalKeyDown}
      tabindex="-1"
      bind:this={deleteModalElement}
    >
      <div class="confirmation-header">
        <div class="warning-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3>Delete Organization</h3>
      </div>

      <div class="confirmation-body">
        <p>
          Are you sure you want to delete <strong
            >{organizationToDelete?.name}</strong
          >?
        </p>

        {#if organizationToDelete?.memberCount > 0}
          <div class="members-warning">
            <p class="members-info">
              <strong
                >⚠️ This organization has {organizationToDelete.memberCount} member{organizationToDelete.memberCount ===
                1
                  ? ""
                  : "s"}.</strong
              >
            </p>
            <p class="deletion-info">
              All members and organizational data will be permanently deleted.
            </p>
          </div>
        {/if}

        <p class="warning-text">
          This action cannot be undone. The organization and all its data will
          be permanently removed.
        </p>
      </div>

      <div class="confirmation-footer">
        <button
          class="confirm-delete-btn"
          on:click={confirmDelete}
          disabled={deleteLoading}
        >
          {#if deleteLoading}
            <span class="spinner" /> Deleting...
          {:else}
            Delete Organization
          {/if}
        </button>
        <button
          class="cancel-btn"
          on:click={cancelDelete}
          disabled={deleteLoading}
        >
          Cancel
        </button>
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
    position: relative;
  }

  .org-card.existing:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--primary-light);
    transform: translateY(-2px);
  }

  /* Card actions */
  .card-actions {
    position: absolute;
    top: var(--spacing-3);
    right: var(--spacing-3);
    display: flex;
    gap: var(--spacing-2);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .org-card.existing:hover .card-actions {
    opacity: 1;
  }

  .action-btn {
    width: 36px;
    height: 36px;
    background: var(--surface);
    color: var(--text-primary);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    box-shadow: 
      0 1px 3px rgba(0, 0, 0, 0.12),
      0 1px 2px rgba(0, 0, 0, 0.24),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 3px 6px rgba(0, 0, 0, 0.16),
      0 3px 6px rgba(0, 0, 0, 0.23),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .action-btn:active {
    transform: translateY(0);
  }

  .action-btn svg {
    width: 16px;
    height: 16px;
  }

  .edit-btn:hover {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  .delete-btn:hover {
    background: var(--destructive);
    color: white;
    border-color: var(--destructive);
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

  /* Delete Confirmation Modal */
  .confirmation-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
    backdrop-filter: blur(4px);
  }

  .confirmation-modal {
    background: var(--background);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 400px;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border);
    margin: var(--spacing-4);
    padding: var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .confirmation-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .warning-icon {
    width: 48px;
    height: 48px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--error);
    flex-shrink: 0;
  }

  .warning-icon svg {
    width: 24px;
    height: 24px;
  }

  .confirmation-header h3 {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .confirmation-body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .confirmation-body p {
    margin: 0;
    color: var(--text-primary);
    line-height: 1.5;
  }

  .members-warning {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--radius-md);
    padding: var(--spacing-3);
  }

  .members-info {
    color: var(--error) !important;
    font-weight: 500;
    margin-bottom: var(--spacing-2) !important;
  }

  .deletion-info {
    color: var(--text-secondary) !important;
    font-size: var(--font-size-sm);
  }

  .warning-text {
    color: var(--text-secondary) !important;
    font-size: var(--font-size-sm);
    font-style: italic;
  }

  .confirmation-footer {
    display: flex;
    gap: var(--spacing-3);
    padding-top: var(--spacing-2);
  }

  .cancel-btn {
    padding: var(--spacing-2) var(--spacing-4);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 50px;
    background: var(--surface);
    color: var(--text-primary);
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 
      0 1px 3px rgba(0, 0, 0, 0.12),
      0 1px 2px rgba(0, 0, 0, 0.24),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .cancel-btn:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 3px 6px rgba(0, 0, 0, 0.16),
      0 3px 6px rgba(0, 0, 0, 0.23),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .confirm-delete-btn {
    padding: var(--spacing-2) var(--spacing-4);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 50px;
    background: var(--destructive);
    color: white;
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 
      0 2px 4px rgba(0, 0, 0, 0.2),
      0 2px 4px rgba(212, 33, 61, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .confirm-delete-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 
      0 4px 8px rgba(0, 0, 0, 0.25),
      0 4px 8px rgba(212, 33, 61, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .confirm-delete-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .cancel-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: white;
    border-radius: 50%;
    display: inline-block;
    animation: spin 1s linear infinite;
    margin-right: var(--spacing-2);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive design for modal */
  @media (max-width: 480px) {
    .confirmation-footer {
      flex-direction: column-reverse;
    }

    .cancel-btn,
    .confirm-delete-btn {
      width: 100%;
    }
  }
</style>
