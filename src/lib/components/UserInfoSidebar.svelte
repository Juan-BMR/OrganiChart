<!--
  UserInfoSidebar.svelte – A highly-polished, accessible sidebar component for displaying
  member information. Slides in from the right, provides multiple close mechanisms, and
  respects the app's CSS custom-property driven dark-first theming system.

  Public API
  ──────────
  • open   (boolean) – whether the sidebar is visible.
  • member (object  ) – the user/member data to display. Expected shape:
      {
        id: string,
        name: string,
        email?: string,
        role?: string,
        department?: string,
        manager?: { id: string, name: string, photoURL?: string },
        directReports?: Array<{ id: string, name: string }>,
        level?: string,
        createdAt?: Date | string,
        phone?: string,
        location?: string,
        timeZone?: string,
        photoURL?: string
      }
  
  Events
  ──────
  • close          – emitted whenever the sidebar requests to close.
  • edit           – emitted when the Edit button is pressed.
  • delete         – emitted when the Delete button is pressed.
  • viewInChart    – emitted when the View in Chart action is pressed.
-->

<script>
  import { createEventDispatcher } from "svelte";
  import { fly, fade } from "svelte/transition";

  export let open = false;
  export let member = null;
  export let members = [];
  export let organizationId = "";
  export let navigationHistory = []; // Array of member objects for back navigation

  const dispatch = createEventDispatcher();

  // Compute initials for avatar fallback
  $: initials = member?.name
    ? member.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n.charAt(0).toUpperCase())
        .join("")
    : "";

  // Find manager
  $: manager = member?.managerId
    ? members.find((m) => m.id === member.managerId)
    : null;

  // Find direct reports
  $: directReports = members.filter((m) => m.managerId === member?.id) || [];

  // Format date
  $: joinDate = member?.createdAt
    ? new Date(
        member.createdAt.toDate ? member.createdAt.toDate() : member.createdAt
      ).toLocaleDateString()
    : "N/A";

  function handleClose() {
    dispatch("close");
  }

  function handleEdit() {
    dispatch("edit", { member });
  }

  function handleDelete() {
    dispatch("delete", { member });
  }

  function handleBack() {
    dispatch("back");
  }

  function handleNavigateToMember(targetMember) {
    dispatch("navigate", { member: targetMember });
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      handleClose();
    }
  }
</script>

{#if open}
  <div
    class="modal-overlay"
    on:click|self={handleClose}
    transition:fade={{ duration: 200 }}
  >
    <div
      class="modal"
      on:keydown={handleKeyDown}
      tabindex="-1"
      transition:fly={{ x: 400, duration: 300 }}
    >
      <header class="modal-header">
        <div class="header-left">
          {#if navigationHistory.length > 0}
            <button class="back-btn" on:click={handleBack} title="Go back">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          {/if}
          <h2>Member Information</h2>
        </div>
        <button class="close-btn" on:click={handleClose}>×</button>
      </header>

      <div class="modal-body">
        <!-- User Header -->
        <div class="user-header">
          <div class="avatar">
            {#if member?.photoURL}
              <img src={member.photoURL} alt={member.name} />
            {:else}
              <span>{initials}</span>
            {/if}
          </div>
          <div class="user-info">
            <h3 class="user-name">{member?.name || "Unknown"}</h3>
            <p class="user-role">{member?.role || "No role specified"}</p>
          </div>
        </div>

        <!-- Personal Details Section -->
        <div class="info-section">
          <h4 class="section-title">Personal Details</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Full Name:</span>
              <span class="info-value">{member?.name || "N/A"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Email:</span>
              <span class="info-value">
                {#if member?.email}
                  <a href="mailto:{member.email}" class="email-link"
                    >{member.email}</a
                  >
                {:else}
                  N/A
                {/if}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Role:</span>
              <span class="info-value">{member?.role || "N/A"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Member Since:</span>
              <span class="info-value">{joinDate}</span>
            </div>
          </div>
        </div>

        <!-- Reports To Section -->
        {#if manager}
          <div class="info-section">
            <h4 class="section-title">Reports To</h4>
            <div class="reports-to-container">
              <button
                class="manager-item"
                on:click={() => handleNavigateToMember(manager)}
                title="View {manager.name}'s details"
              >
                <div class="manager-avatar">
                  {#if manager.photoURL}
                    <img src={manager.photoURL} alt={manager.name} />
                  {:else}
                    <span
                      >{manager.name
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n.charAt(0).toUpperCase())
                        .join("")}</span
                    >
                  {/if}
                </div>
                <div class="manager-info">
                  <div class="manager-name">{manager.name}</div>
                  <div class="manager-role">
                    {manager.role || "No role specified"}
                  </div>
                </div>
                <div class="manager-arrow">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Subordinates Section -->
      {#if directReports.length > 0}
        <div class="info-section">
          <h4 class="section-title">Subordinates ({directReports.length})</h4>
          <div class="subordinates-container">
            <div class="subordinates-list">
              {#each directReports as subordinate}
                <button
                  class="subordinate-item"
                  on:click={() => handleNavigateToMember(subordinate)}
                  title="View {subordinate.name}'s details"
                >
                  <div class="subordinate-avatar">
                    {#if subordinate.photoURL}
                      <img src={subordinate.photoURL} alt={subordinate.name} />
                    {:else}
                      <span
                        >{subordinate.name
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n.charAt(0).toUpperCase())
                          .join("")}</span
                      >
                    {/if}
                  </div>
                  <div class="subordinate-info">
                    <div class="subordinate-name">{subordinate.name}</div>
                    <div class="subordinate-role">
                      {subordinate.role || "No role specified"}
                    </div>
                  </div>
                  <div class="subordinate-arrow">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <footer class="modal-footer">
        <div class="action-buttons">
          <button class="edit-btn" on:click={handleEdit}>Edit</button>
          <button class="delete-btn" on:click={handleDelete}>Delete</button>
        </div>
      </footer>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    z-index: 2000;
    padding-right: 24px;
  }

  .modal {
    background: var(--background);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 420px;
    box-shadow: var(--shadow-lg);
    padding: var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    height: 85vh;
    max-height: 85vh;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .back-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-1);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
  }

  .back-btn:hover {
    background: var(--secondary);
    color: var(--text-primary);
  }

  .back-btn svg {
    width: 18px;
    height: 18px;
  }

  .modal-header h2 {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .close-btn {
    font-size: var(--font-size-xl);
    color: var(--text-secondary);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1);
    border-radius: var(--radius-md);
    transition: background-color 0.2s ease;
  }

  .close-btn:hover {
    background: var(--secondary);
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
    flex: 1;
    overflow-y: auto;
    padding-right: var(--spacing-1);
  }

  .user-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    padding: var(--spacing-4);
    background: var(--surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
  }

  .avatar {
    width: 80px;
    height: 80px;
    background: var(--background);
    border: 4px solid var(--primary);
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar span {
    color: var(--primary);
    font-weight: 600;
    font-size: var(--font-size-xl);
  }

  .user-info {
    flex: 1;
  }

  .user-name {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--spacing-1) 0;
  }

  .user-role {
    font-size: var(--font-size-base);
    color: var(--text-secondary);
    margin: 0;
  }

  .info-section {
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: var(--spacing-4);
    border: 1px solid var(--border);
  }

  .section-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--spacing-3) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .info-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-2) 0;
    border-bottom: 1px solid var(--border);
  }

  .info-item:last-child {
    border-bottom: none;
  }

  .info-label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-secondary);
    min-width: 120px;
  }

  .info-value {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    text-align: right;
  }

  .email-link {
    color: var(--primary);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .email-link:hover {
    color: var(--primary-dark);
    text-decoration: underline;
  }

  .reports-to-container {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--background);
  }

  .manager-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3);
    background: var(--background);
    border: none;
    transition: all 0.2s ease;
    cursor: pointer;
    text-align: left;
    width: 100%;
    border-radius: var(--radius-md);
  }

  .manager-item:hover {
    background: var(--secondary);
  }

  .manager-item:active {
    background: var(--primary);
    color: white;
  }

  .manager-item:active .manager-name,
  .manager-item:active .manager-role {
    color: white;
  }

  .manager-avatar {
    width: 40px;
    height: 40px;
    background: var(--background);
    border: 2px solid var(--primary);
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .manager-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .manager-avatar span {
    color: var(--primary);
    font-weight: 600;
    font-size: var(--font-size-xs);
  }

  .manager-info {
    flex: 1;
  }

  .manager-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-1);
  }

  .manager-role {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .manager-arrow {
    margin-left: auto;
    color: var(--text-secondary);
    transition: all 0.2s ease;
  }

  .manager-arrow svg {
    width: 16px;
    height: 16px;
  }

  .manager-item:hover .manager-arrow {
    color: var(--primary);
    transform: translateX(2px);
  }

  .subordinates-container {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--background);
  }

  .subordinates-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .subordinate-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3);
    background: var(--background);
    border: none;
    border-bottom: 1px solid var(--border);
    transition: all 0.2s ease;
    cursor: pointer;
    text-align: left;
    width: 100%;
  }

  .subordinate-item:last-child {
    border-bottom: none;
  }

  .subordinate-item:hover {
    background: var(--secondary);
  }

  .subordinate-item:active {
    background: var(--primary);
    color: white;
  }

  .subordinate-item:active .subordinate-name,
  .subordinate-item:active .subordinate-role {
    color: white;
  }

  .subordinate-arrow {
    margin-left: auto;
    color: var(--text-secondary);
    transition: all 0.2s ease;
  }

  .subordinate-arrow svg {
    width: 16px;
    height: 16px;
  }

  .subordinate-item:hover .subordinate-arrow {
    color: var(--primary);
    transform: translateX(2px);
  }

  .subordinate-avatar {
    width: 40px;
    height: 40px;
    background: var(--background);
    border: 2px solid var(--primary);
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .subordinate-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .subordinate-avatar span {
    color: var(--primary);
    font-weight: 600;
    font-size: var(--font-size-xs);
  }

  .subordinate-info {
    flex: 1;
  }

  .subordinate-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-1);
  }

  .subordinate-role {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .modal-footer {
    padding-top: var(--spacing-2);
    flex-shrink: 0;
  }

  .action-buttons {
    display: flex;
    gap: var(--spacing-3);
  }

  .edit-btn {
    background: var(--primary);
    color: white;
    padding: var(--spacing-3) var(--spacing-5);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
  }

  .edit-btn:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .delete-btn {
    background: var(--error);
    color: white;
    padding: var(--spacing-3) var(--spacing-5);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
  }

  .delete-btn:hover {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .modal-overlay {
      padding-right: 16px;
      padding-left: 16px;
    }

    .modal {
      max-width: none;
    }

    .user-header {
      flex-direction: column;
      text-align: center;
      gap: var(--spacing-3);
    }

    .info-item {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-1);
    }

    .info-value {
      text-align: left;
    }

    .manager-info {
      justify-content: flex-start;
    }
  }
</style>
