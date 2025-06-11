<script>
  import { createEventDispatcher } from "svelte";
  import { membersStore } from "$lib/stores/members.js";

  export let open = false;
  export let organizationId;
  export let members = [];

  const dispatch = createEventDispatcher();

  let name = "";
  let email = "";
  let role = "";
  let managerId = "";
  let photoFile = null;
  let photoPreviewUrl = null;
  let error = "";
  let loading = false;
  let fileInput;
  let subordinateIds = [];
  let dropdownOpen = false;

  // Computed properties for subordinate functionality
  $: selectedSubordinates = subordinateIds
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean);
  $: willInsertBetween =
    selectedSubordinates.length > 0 && selectedSubordinates[0]?.managerId;

  // If subordinates are selected and have a common manager, auto-set the manager
  $: if (willInsertBetween && selectedSubordinates.length > 0) {
    const commonManagerId = selectedSubordinates[0].managerId;
    // Verify all selected subordinates have the same manager
    const allHaveSameManager = selectedSubordinates.every(
      (s) => s.managerId === commonManagerId
    );
    if (allHaveSameManager) {
      managerId = commonManagerId || "";
    }
  }

  // Helper function to check if memberId is a descendant of potentialAncestorId
  function isDescendantOf(potentialAncestorId, memberId) {
    if (!potentialAncestorId || !memberId) return false;

    let current = members.find((m) => m.id === potentialAncestorId);
    while (current && current.managerId) {
      if (current.managerId === memberId) return true;
      current = members.find((m) => m.id === current.managerId);
    }
    return false;
  }

  // Helper function to get direct reports of a member (one level down only)
  function getDirectReports(memberId) {
    if (!memberId) return [];
    return members.filter((m) => m.managerId === memberId);
  }

  // Handle file selection
  function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      error = "Please upload an image file";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      error = "File size must be below 2MB";
      return;
    }

    photoFile = file;
    error = "";
    photoPreviewUrl = URL.createObjectURL(file);
  }

  // Handle removing selected photo
  function handleRemovePhoto() {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    photoFile = null;
    photoPreviewUrl = null;
    // Reset the file input
    if (fileInput) {
      fileInput.value = "";
    }
  }

  async function handleSubmit() {
    error = "";

    if (!name.trim()) {
      error = "Name is required";
      return;
    }

    if (!role.trim()) {
      error = "Role/Title is required";
      return;
    }

    loading = true;
    try {
      if (willInsertBetween && selectedSubordinates.length > 0) {
        // Adding member "in between" - use special method with multiple subordinates
        await membersStore.addMemberBetweenMultiple(
          organizationId,
          name,
          email,
          role,
          managerId || null,
          subordinateIds,
          photoFile
        );
      } else {
        // Regular add member (now with subordinate support)
        await membersStore.addMember(
          organizationId,
          name,
          email,
          role,
          managerId || null,
          photoFile,
          subordinateIds
        );
      }
      dispatch("close");
      handleClose();
    } catch (err) {
      console.error(err);
      error = err.message || "Failed to add member";
    } finally {
      loading = false;
    }
  }

  function handleClose() {
    // Clean up photo URL to prevent memory leaks
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    // Reset state
    name = "";
    email = "";
    role = "";
    managerId = "";
    subordinateIds = [];
    dropdownOpen = false;
    photoFile = null;
    photoPreviewUrl = null;
    error = "";
    open = false;

    // Reset file input
    if (fileInput) {
      fileInput.value = "";
    }

    dispatch("close");
  }

  function handleClickOutside(event) {
    if (dropdownOpen && !event.target.closest(".custom-dropdown")) {
      dropdownOpen = false;
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      handleClose();
    }
  }
</script>

{#if open}
  <div class="modal-overlay" on:click|self={handleClose}>
    <div
      class="modal"
      on:keydown={handleKeyDown}
      on:click={handleClickOutside}
      tabindex="-1"
    >
      <header class="modal-header">
        <h2>Add Member</h2>
        <button class="close-btn" on:click={handleClose}>×</button>
      </header>

      <div class="modal-body">
        <label class="input-label" for="member-name">Name</label>
        <input
          id="member-name"
          type="text"
          placeholder="Enter full name"
          bind:value={name}
          class:error={error && !name.trim()}
          disabled={loading}
        />

        <label class="input-label" for="member-email">Email</label>
        <input
          id="member-email"
          type="email"
          placeholder="Enter email address"
          bind:value={email}
          disabled={loading}
        />

        <label class="input-label" for="member-role">Role / Title</label>
        <input
          id="member-role"
          type="text"
          placeholder="Enter job title or role"
          bind:value={role}
          class:error={error && !role.trim()}
          disabled={loading}
        />

        <label class="input-label" for="member-manager">Manager</label>
        <select
          id="member-manager"
          bind:value={managerId}
          disabled={loading || willInsertBetween}
        >
          <option value="">-- None (top) --</option>
          {#each members.filter((m) => !subordinateIds.includes(m.id)) as member}
            <option value={member.id}>{member.name}</option>
          {/each}
        </select>

        <label class="input-label" for="member-subordinate">
          Subordinates
          <span class="help-text"
            >Optional: Select who will report to this new member</span
          >
        </label>

        <!-- Custom Dropdown with Checkboxes -->
        <div class="custom-dropdown" class:open={dropdownOpen}>
          <button
            type="button"
            class="dropdown-trigger"
            on:click={() => (dropdownOpen = !dropdownOpen)}
            disabled={loading}
          >
            <span class="selected-text">
              {#if subordinateIds.length === 0}
                Select subordinates...
              {:else if subordinateIds.length === 1}
                {selectedSubordinates[0]?.name}
              {:else}
                {subordinateIds.length} selected
              {/if}
            </span>
            <svg
              class="dropdown-arrow"
              class:rotated={dropdownOpen}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>

          {#if dropdownOpen}
            <div class="dropdown-menu">
              {#each managerId ? getDirectReports(managerId) : members.filter((m) => !m.managerId) as member}
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    value={member.id}
                    bind:group={subordinateIds}
                  />
                  <span class="checkbox-custom"></span>
                  <div class="member-details">
                    <span class="member-name">{member.name}</span>
                    <span class="member-status">
                      {member.managerId
                        ? `currently reports to ${
                            members.find((mgr) => mgr.id === member.managerId)
                              ?.name || "Unknown"
                          }`
                        : "top level"}
                    </span>
                  </div>
                </label>
              {:else}
                {#if managerId}
                  <div class="no-options">
                    No subordinates available in this branch
                  </div>
                {:else}
                  <div class="no-options">
                    No top-level employees available as subordinates
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>

        {#if willInsertBetween && selectedSubordinates.length > 0}
          <div class="insert-preview">
            <p><strong>Hierarchy Preview:</strong></p>
            <p>
              {members.find(
                (mgr) => mgr.id === selectedSubordinates[0].managerId
              )?.name || "Top Level"}
              → <strong>{name || "New Member"}</strong>
              → {selectedSubordinates.map((s) => s.name).join(", ")}
            </p>
          </div>
        {/if}

        <label class="input-label" for="photo-upload">Photo</label>
        <div class="photo-upload-container">
          <div class="upload-area" on:click={() => fileInput.click()}>
            {#if photoPreviewUrl}
              <img src={photoPreviewUrl} alt="Photo preview" />
            {:else}
              <p>
                Upload photo <span class="upload-hint">(click or drag)</span>
              </p>
            {/if}
          </div>
          {#if photoPreviewUrl}
            <button
              type="button"
              class="remove-photo-btn"
              on:click={handleRemovePhoto}
              title="Remove photo"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Remove Photo
            </button>
          {/if}
        </div>
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          on:change={handleFileChange}
          bind:this={fileInput}
          style="display:none"
        />

        {#if error}
          <p class="error-message">{error}</p>
        {/if}
      </div>

      <footer class="modal-footer">
        <button class="add-btn" on:click={handleSubmit} disabled={loading}>
          {#if loading}
            <span class="spinner" /> Adding...
          {:else}
            Add
          {/if}
        </button>
        <button class="cancel-btn" on:click={handleClose} disabled={loading}>
          Cancel
        </button>
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
    justify-content: center;
    z-index: 2000;
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
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
    gap: var(--spacing-3);
  }

  .input-label {
    font-weight: 500;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    margin-bottom: var(--spacing-1);
  }

  input[type="text"],
  input[type="email"],
  select {
    padding: var(--spacing-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background: var(--background);
    color: var(--text-primary);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  input[type="text"]:focus,
  input[type="email"]:focus,
  select:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    outline: none;
  }

  input.error {
    border-color: var(--error);
  }

  select {
    cursor: pointer;
  }

  .upload-area {
    border: 2px dashed var(--border);
    border-radius: var(--radius-md);
    padding: var(--spacing-6) var(--spacing-4);
    text-align: center;
    cursor: pointer;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
    font-size: var(--font-size-sm);
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease;
  }

  .upload-area:hover {
    border-color: var(--primary);
    background: var(--surface);
  }

  .upload-area img {
    max-width: 100%;
    max-height: 80px;
    object-fit: contain;
    border-radius: var(--radius-md);
  }

  .upload-hint {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .photo-upload-container {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .remove-photo-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--error);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    align-self: flex-start;
  }

  .remove-photo-btn:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }

  .remove-photo-btn svg {
    width: 14px;
    height: 14px;
  }

  .help-text {
    display: block;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-weight: 400;
    margin-top: var(--spacing-1);
  }

  /* Custom Dropdown Styles */
  .custom-dropdown {
    position: relative;
  }

  .dropdown-trigger {
    width: 100%;
    padding: var(--spacing-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background: var(--background);
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .dropdown-trigger:hover {
    border-color: var(--primary);
  }

  .dropdown-trigger:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    outline: none;
  }

  .dropdown-trigger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .selected-text {
    flex: 1;
    text-align: left;
    color: var(--text-primary);
  }

  .dropdown-arrow {
    width: 20px;
    height: 20px;
    color: var(--text-secondary);
    transition: transform 0.2s ease;
  }

  .dropdown-arrow.rotated {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
    margin-top: 4px;
  }

  .checkbox-item {
    display: flex;
    align-items: center;
    padding: var(--spacing-3);
    cursor: pointer;
    transition: background-color 0.2s ease;
    border: none;
  }

  .checkbox-item:hover {
    background: var(--surface);
  }

  .checkbox-item input[type="checkbox"] {
    display: none;
  }

  .checkbox-custom {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border);
    border-radius: var(--radius-sm);
    margin-right: var(--spacing-3);
    position: relative;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .checkbox-item input[type="checkbox"]:checked + .checkbox-custom {
    background: var(--primary);
    border-color: var(--primary);
  }

  .checkbox-item input[type="checkbox"]:checked + .checkbox-custom::after {
    content: "✓";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 12px;
    font-weight: bold;
  }

  .member-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .member-name {
    font-weight: 500;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .member-status {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .no-options {
    padding: var(--spacing-3);
    text-align: center;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-style: italic;
  }

  .insert-preview {
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: var(--radius-md);
    padding: var(--spacing-3);
    font-size: var(--font-size-sm);
  }

  .insert-preview p {
    margin: 0;
    color: var(--text-primary);
  }

  .insert-preview p:first-child {
    margin-bottom: var(--spacing-2);
  }

  .error-message {
    color: var(--error);
    font-size: var(--font-size-sm);
    padding: var(--spacing-2);
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--radius-md);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .modal-footer {
    display: flex;
    gap: var(--spacing-3);
    padding-top: var(--spacing-2);
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

  .cancel-btn:hover:not(:disabled) {
    background: var(--secondary);
    color: var(--text-primary);
  }

  .add-btn {
    background: var(--primary);
    color: white;
    padding: var(--spacing-3) var(--spacing-5);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    flex: 1;
  }

  .add-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .add-btn:not(:disabled):hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: white;
    border-radius: 50%;
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive design */
  @media (max-width: 480px) {
    .modal {
      margin: var(--spacing-4);
      max-width: none;
      width: auto;
    }

    .modal-footer {
      flex-direction: column-reverse;
    }

    .cancel-btn,
    .add-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
