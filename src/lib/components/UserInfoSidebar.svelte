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
  import CVPreview from "./CVPreview.svelte";

  export let open = false;
  export let member = null;
  export let members = [];
  export let organizationId = "";
  export let navigationHistory = []; // Array of member objects for back navigation

  const dispatch = createEventDispatcher();

  // Delete confirmation state
  let showDeleteConfirmation = false;
  let deleteModalElement;

  // CV preview state
  let showCVPreview = false;
  let cvTargetElement = null;

  // Focus delete modal when it opens
  $: if (showDeleteConfirmation && deleteModalElement) {
    deleteModalElement.focus();
  }

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

  // Format start date (when they joined the organization)
  $: joinDate = member?.startDate
    ? new Date(
        member.startDate.toDate
          ? member.startDate.toDate()
          : member.startDate.seconds
            ? member.startDate.seconds * 1000
            : member.startDate
      ).toLocaleDateString()
    : member?.createdAt
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
    showDeleteConfirmation = true;
  }

  function confirmDelete() {
    showDeleteConfirmation = false;
    dispatch("delete", { member });
  }

  function cancelDelete() {
    showDeleteConfirmation = false;
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

  function handleDeleteModalKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation(); // Prevent ESC from bubbling up to close the sidebar
      cancelDelete();
    }
  }

  function handleCVHover(event) {
    showCVPreview = true;
    cvTargetElement = event.currentTarget;
  }

  function handleCVLeave() {
    showCVPreview = false;
    cvTargetElement = null;
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

        <!-- CV Section -->
        {#if member?.cvURL && member?.cvFileName}
          <div class="info-section">
            <h4 class="section-title">CV / Resume</h4>
            <div class="cv-info-container">
              <div 
                class="cv-file-display"
                on:mouseenter={handleCVHover}
                on:mouseleave={handleCVLeave}
              >
                <div class="cv-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div class="cv-details">
                  <div class="cv-filename">{member.cvFileName}</div>
                  <div class="cv-uploaded-date">
                    Uploaded {member.cvUploadedAt ? new Date(member.cvUploadedAt.toDate ? member.cvUploadedAt.toDate() : member.cvUploadedAt).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
                <button
                  class="cv-download-btn"
                  on:click={() => window.open(member.cvURL, '_blank')}
                  title="Download CV"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download
                </button>
              </div>
            </div>
          </div>
        {/if}

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
                        <img
                          src={subordinate.photoURL}
                          alt={subordinate.name}
                        />
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
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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
      </div>

      <footer class="modal-footer">
        <div class="action-buttons">
          <button class="edit-btn" on:click={handleEdit}>Edit</button>
          <button class="delete-btn" on:click={handleDelete}>Delete</button>
        </div>
      </footer>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  {#if showDeleteConfirmation}
    <div
      class="confirmation-overlay"
      on:click|self={cancelDelete}
      transition:fade={{ duration: 200 }}
    >
      <div
        class="confirmation-modal"
        on:keydown={handleDeleteModalKeyDown}
        tabindex="-1"
        bind:this={deleteModalElement}
        transition:fly={{ y: -20, duration: 300 }}
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
          <h3>Delete Member</h3>
        </div>

        <div class="confirmation-body">
          <p>
            Are you sure you want to delete <strong>{member?.name}</strong>?
          </p>

          {#if directReports.length > 0}
            <div class="subordinates-warning">
              <p class="subordinates-info">
                <strong
                  >⚠️ This member has {directReports.length} subordinate{directReports.length ===
                  1
                    ? ""
                    : "s"}:</strong
                >
              </p>
              <ul class="subordinates-list-warning">
                {#each directReports as subordinate}
                  <li>{subordinate.name}</li>
                {/each}
              </ul>
              <p class="reassignment-info">
                {#if manager}
                  These subordinates will be reassigned to <strong
                    >{manager.name}</strong
                  >.
                {:else}
                  These subordinates will become top-level members (no manager).
                {/if}
              </p>
            </div>
          {/if}

          <p class="warning-text">
            This action cannot be undone. The member will be permanently removed
            from the organization chart.
          </p>
        </div>

        <div class="confirmation-footer">
          <button class="confirm-delete-btn" on:click={confirmDelete}>
            Delete Member
          </button>
          <button class="cancel-btn" on:click={cancelDelete}> Cancel </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- CV Preview Tooltip -->
  <CVPreview 
    cvURL={member?.cvURL}
    cvFileName={member?.cvFileName}
    show={showCVPreview}
    targetElement={cvTargetElement}
  />
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

  /* CV Section Styles */
  .cv-info-container {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--background);
  }

  .cv-file-display {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .cv-file-display:hover {
    background: var(--secondary);
    cursor: pointer;
    transform: translateX(4px);
    box-shadow: var(--shadow-md);
  }

  .cv-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(99, 102, 241, 0.1);
    border-radius: var(--radius-md);
    color: var(--primary);
    flex-shrink: 0;
  }

  .cv-icon svg {
    width: 24px;
    height: 24px;
    transition: all 0.3s ease;
  }
  
  .cv-file-display:hover .cv-icon svg {
    transform: scale(1.1);
    filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.4));
  }

  .cv-details {
    flex: 1;
    min-width: 0;
  }

  .cv-filename {
    font-weight: 500;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: var(--spacing-1);
  }

  .cv-uploaded-date {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }



  .cv-download-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .cv-download-btn:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
  }

  .cv-download-btn svg {
    width: 14px;
    height: 14px;
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
    padding: 0;
  }

  .confirmation-body p {
    margin: 0 0 var(--spacing-3) 0;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    line-height: 1.5;
  }

  .confirmation-body p:last-child {
    margin-bottom: 0;
  }

  .warning-text {
    color: var(--text-secondary) !important;
    font-size: var(--font-size-xs) !important;
  }

  .subordinates-warning {
    background: rgba(239, 68, 68, 0.05);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--radius-md);
    padding: var(--spacing-3);
    margin: var(--spacing-3) 0;
  }

  .subordinates-info {
    color: var(--error) !important;
    font-size: var(--font-size-sm) !important;
    margin: 0 0 var(--spacing-2) 0 !important;
  }

  .subordinates-list-warning {
    margin: var(--spacing-2) 0;
    padding-left: var(--spacing-4);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .subordinates-list-warning li {
    margin: var(--spacing-1) 0;
  }

  .reassignment-info {
    color: var(--text-primary) !important;
    font-size: var(--font-size-sm) !important;
    margin: var(--spacing-2) 0 0 0 !important;
    font-weight: 500;
  }

  .confirmation-footer {
    display: flex;
    gap: var(--spacing-3);
    padding: 0;
  }

  .cancel-btn {
    background: transparent;
    color: var(--text-secondary);
    padding: var(--spacing-3) var(--spacing-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
  }

  .cancel-btn:hover {
    background: var(--secondary);
    color: var(--text-primary);
    border-color: var(--primary);
  }

  .confirm-delete-btn {
    background: var(--error);
    color: white;
    padding: var(--spacing-3) var(--spacing-4);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
  }

  .confirm-delete-btn:hover {
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

    .confirmation-footer {
      flex-direction: column-reverse;
    }

    .cancel-btn,
    .confirm-delete-btn {
      width: 100%;
    }
  }
</style>
