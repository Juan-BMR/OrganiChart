<script>
  import { createEventDispatcher } from "svelte";
  import { membersStore } from "$lib/stores/members.js";

  // Constants
  const FILE_CONSTANTS = {
    PHOTO: {
      MAX_SIZE: 2 * 1024 * 1024, // 2MB
      ACCEPTED_TYPES: ["image/"],
      UNSUPPORTED_TYPES: ["image/heic", "image/heif"],
      ERROR_MESSAGES: {
        INVALID_TYPE: "Please upload an image file (JPG, PNG, GIF, WebP)",
        UNSUPPORTED_FORMAT: "HEIC/HEIF files are not supported. Please convert to JPG or PNG first.",
        SIZE_EXCEEDED: "File size must be below 2MB"
      }
    },
    CV: {
      MAX_SIZE: 5 * 1024 * 1024, // 5MB
      ACCEPTED_TYPES: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ],
      ERROR_MESSAGES: {
        INVALID_TYPE: "Please upload a PDF, DOC, or DOCX file",
        SIZE_EXCEEDED: "CV file size must be below 5MB"
      }
    }
  };

  const VALIDATION_MESSAGES = {
    NAME_REQUIRED: "Name is required",
    ROLE_REQUIRED: "Role/Title is required",
    SUBMIT_ERROR: "Failed to add member"
  };

  // Props
  export let open = false;
  export let organizationId;
  export let members = [];

  const dispatch = createEventDispatcher();

  // State
  let name = "";
  let email = "";
  let role = "";
  let managerId = "";
  let photoFile = null;
  let photoPreviewUrl = null;
  let cvFile = null;
  let cvInput;
  let error = "";
  let loading = false;
  let fileInput;
  let subordinateIds = [];
  let dropdownOpen = false;
  let managerDropdownOpen = false;
  let startDate = getTodayDateString();
  let modalElement;

  // Computed values
  $: selectedSubordinates = subordinateIds
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean);

  $: willInsertBetween =
    selectedSubordinates.length > 0 && selectedSubordinates[0]?.managerId;

  $: availableManagers = members.filter((m) => !subordinateIds.includes(m.id));

  $: availableSubordinates = managerId
    ? getDirectReports(managerId)
    : members.filter((m) => !m.managerId);

  $: selectedManager = members.find((m) => m.id === managerId);

  // Auto-set manager when inserting between subordinates
  $: if (willInsertBetween && selectedSubordinates.length > 0) {
    const commonManagerId = selectedSubordinates[0].managerId;
    const allHaveSameManager = selectedSubordinates.every(
      (s) => s.managerId === commonManagerId
    );
    if (allHaveSameManager) {
      managerId = commonManagerId || "";
    }
  }

  // Focus modal when it becomes visible
  $: if (open && modalElement) {
    modalElement.focus();
  }

  // Utility functions
  function getTodayDateString() {
    return new Date().toISOString().split("T")[0];
  }

  function resetFileInput(inputElement) {
    if (inputElement) {
      inputElement.value = "";
    }
  }

  function revokePhotoPreview() {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
  }

  function getDirectReports(memberId) {
    if (!memberId) return [];
    return members.filter((m) => m.managerId === memberId);
  }

  function isDescendantOf(potentialAncestorId, memberId) {
    if (!potentialAncestorId || !memberId) return false;

    let current = members.find((m) => m.id === potentialAncestorId);
    while (current && current.managerId) {
      if (current.managerId === memberId) return true;
      current = members.find((m) => m.id === current.managerId);
    }
    return false;
  }

  // File validation helpers
  function validatePhotoFile(file) {
    if (!file.type.startsWith("image/")) {
      return FILE_CONSTANTS.PHOTO.ERROR_MESSAGES.INVALID_TYPE;
    }

    if (FILE_CONSTANTS.PHOTO.UNSUPPORTED_TYPES.includes(file.type.toLowerCase())) {
      return FILE_CONSTANTS.PHOTO.ERROR_MESSAGES.UNSUPPORTED_FORMAT;
    }

    if (file.size > FILE_CONSTANTS.PHOTO.MAX_SIZE) {
      return FILE_CONSTANTS.PHOTO.ERROR_MESSAGES.SIZE_EXCEEDED;
    }

    return null;
  }

  function validateCVFile(file) {
    if (!FILE_CONSTANTS.CV.ACCEPTED_TYPES.includes(file.type)) {
      return FILE_CONSTANTS.CV.ERROR_MESSAGES.INVALID_TYPE;
    }

    if (file.size > FILE_CONSTANTS.CV.MAX_SIZE) {
      return FILE_CONSTANTS.CV.ERROR_MESSAGES.SIZE_EXCEEDED;
    }

    return null;
  }

  // File handlers
  function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    const validationError = validatePhotoFile(file);
    if (validationError) {
      error = validationError;
      resetFileInput(fileInput);
      return;
    }

    photoFile = file;
    error = "";
    photoPreviewUrl = URL.createObjectURL(file);
  }

  function handleRemovePhoto() {
    revokePhotoPreview();
    photoFile = null;
    photoPreviewUrl = null;
    resetFileInput(fileInput);
  }

  function handleCVChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    const validationError = validateCVFile(file);
    if (validationError) {
      error = validationError;
      resetFileInput(cvInput);
      return;
    }

    cvFile = file;
    error = "";
  }

  function handleRemoveCV() {
    cvFile = null;
    resetFileInput(cvInput);
  }

  // Form handlers
  function validateForm() {
    if (!name.trim()) {
      error = VALIDATION_MESSAGES.NAME_REQUIRED;
      return false;
    }

    if (!role.trim()) {
      error = VALIDATION_MESSAGES.ROLE_REQUIRED;
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    error = "";

    if (!validateForm()) {
      return;
    }

    loading = true;
    try {
      const startDateObj = startDate ? new Date(startDate) : new Date();

      if (willInsertBetween && selectedSubordinates.length > 0) {
        await membersStore.addMemberBetweenMultiple(
          organizationId,
          name,
          email,
          role,
          managerId || null,
          subordinateIds,
          photoFile,
          startDateObj,
          cvFile
        );
      } else {
        await membersStore.addMember(
          organizationId,
          name,
          email,
          role,
          managerId || null,
          photoFile,
          subordinateIds,
          startDateObj,
          cvFile
        );
      }
      dispatch("close");
      handleClose();
    } catch (err) {
      console.error(err);
      error = err.message || VALIDATION_MESSAGES.SUBMIT_ERROR;
    } finally {
      loading = false;
    }
  }

  function resetForm() {
    name = "";
    email = "";
    role = "";
    managerId = "";
    subordinateIds = [];
    dropdownOpen = false;
    managerDropdownOpen = false;
    photoFile = null;
    photoPreviewUrl = null;
    cvFile = null;
    error = "";
    startDate = getTodayDateString();
    resetFileInput(fileInput);
    resetFileInput(cvInput);
  }

  function handleClose() {
    revokePhotoPreview();
    resetForm();
    open = false;
    dispatch("close");
  }

  function handleClickOutside(event) {
    if (dropdownOpen && !event.target.closest(".subordinates-dropdown")) {
      dropdownOpen = false;
    }
    if (managerDropdownOpen && !event.target.closest(".manager-dropdown")) {
      managerDropdownOpen = false;
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      handleClose();
    }
  }

  function toggleSubordinatesDropdown() {
    dropdownOpen = !dropdownOpen;
  }

  function toggleManagerDropdown() {
    managerDropdownOpen = !managerDropdownOpen;
  }

  function selectManager(id) {
    managerId = id;
    managerDropdownOpen = false;
  }

  function formatFileSize(bytes) {
    return (bytes / 1024 / 1024).toFixed(2);
  }
</script>

{#if open}
  <div class="modal-overlay" on:click|self={handleClose}>
    <div
      class="modal"
      on:keydown={handleKeyDown}
      on:click={handleClickOutside}
      tabindex="-1"
      bind:this={modalElement}
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

        <label class="input-label" for="member-start-date">Start Date</label>
        <input
          id="member-start-date"
          type="date"
          bind:value={startDate}
          disabled={loading}
        />

        <label class="input-label" for="member-manager">Manager</label>

        <!-- Custom Manager Dropdown -->
        <div
          class="custom-dropdown manager-dropdown"
          class:open={managerDropdownOpen}
        >
          <button
            type="button"
            class="dropdown-trigger"
            on:click={toggleManagerDropdown}
            disabled={loading || willInsertBetween}
          >
            <span class="selected-text">
              {#if !managerId}
                -- None (top) --
              {:else}
                {selectedManager?.name || "Unknown"}
              {/if}
            </span>
            <svg
              class="dropdown-arrow"
              class:rotated={managerDropdownOpen}
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

          {#if managerDropdownOpen}
            <div class="dropdown-menu">
              <!-- None option -->
              <button
                type="button"
                class="dropdown-item"
                class:selected={!managerId}
                on:click={() => selectManager("")}
              >
                <span class="manager-name">-- None (top) --</span>
              </button>

              <!-- Manager options -->
              {#each availableManagers as member}
                <button
                  type="button"
                  class="dropdown-item"
                  class:selected={managerId === member.id}
                  on:click={() => selectManager(member.id)}
                >
                  <span class="manager-name">{member.name}</span>
                  <span class="manager-role">{member.role}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <label class="input-label" for="member-subordinate">
          Subordinates
          <span class="help-text"
            >Optional: Select who will report to this new member</span
          >
        </label>

        <!-- Custom Dropdown with Checkboxes -->
        <div
          class="custom-dropdown subordinates-dropdown"
          class:open={dropdownOpen}
        >
          <button
            type="button"
            class="dropdown-trigger"
            on:click={toggleSubordinatesDropdown}
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
              {#each availableSubordinates as member}
                {@const currentManager = members.find((mgr) => mgr.id === member.managerId)}
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
                        ? `currently reports to ${currentManager?.name || "Unknown"}`
                        : "top level"}
                    </span>
                  </div>
                </label>
              {:else}
                <div class="no-options">
                  {managerId
                    ? "No subordinates available in this branch"
                    : "No top-level employees available as subordinates"}
                </div>
              {/each}
            </div>
          {/if}
        </div>

        {#if willInsertBetween && selectedSubordinates.length > 0}
          {@const previewManager = members.find(
            (mgr) => mgr.id === selectedSubordinates[0].managerId
          )}
          <div class="insert-preview">
            <p><strong>Hierarchy Preview:</strong></p>
            <p>
              {previewManager?.name || "Top Level"}
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

        <label class="input-label" for="cv-upload">CV / Resume</label>
        <div class="cv-upload-container">
          <div class="upload-area cv-upload" on:click={() => cvInput.click()}>
            {#if cvFile}
              <div class="cv-preview">
                <div class="cv-file-info">
                  <svg
                    class="file-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div class="cv-details">
                    <div class="cv-filename">{cvFile.name}</div>
                    <div class="cv-size">{formatFileSize(cvFile.size)} MB</div>
                  </div>
                </div>
                <div class="cv-overlay">
                  <svg
                    class="document-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Click to change</span>
                </div>
              </div>
            {:else}
              <div class="upload-placeholder">
                <svg
                  class="upload-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p>
                  <strong>Click to upload CV</strong>
                  <span class="upload-hint">PDF, DOC, DOCX up to 5MB</span>
                </p>
              </div>
            {/if}
          </div>
          {#if cvFile}
            <button
              type="button"
              class="remove-cv-btn"
              on:click={handleRemoveCV}
              title="Remove CV"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Remove CV
            </button>
          {/if}
        </div>
        <input
          id="cv-upload"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          on:change={handleCVChange}
          bind:this={cvInput}
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
  input[type="date"],
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

  /* Date input icon styling for dark mode */
  input[type="date"] {
    color-scheme: light dark;
    position: relative;
  }

  input[type="date"]::-webkit-calendar-picker-indicator {
    background: transparent;
    bottom: 0;
    color: transparent;
    cursor: pointer;
    height: auto;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    width: auto;
    opacity: 0;
  }

  /* Custom calendar icon */
  input[type="date"] {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3e%3cpath fill-rule='evenodd' d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' clip-rule='evenodd'/%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 16px 16px;
    padding-right: 40px;
  }

  /* Dark theme calendar icon */
  [data-theme="dark"] input[type="date"] {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%239ca3af'%3e%3cpath fill-rule='evenodd' d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' clip-rule='evenodd'/%3e%3c/svg%3e");
  }

  /* System dark mode */
  @media (prefers-color-scheme: dark) {
    input[type="date"] {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%239ca3af'%3e%3cpath fill-rule='evenodd' d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' clip-rule='evenodd'/%3e%3c/svg%3e");
    }
  }

  /* Light theme override */
  [data-theme="light"] input[type="date"] {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3e%3cpath fill-rule='evenodd' d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' clip-rule='evenodd'/%3e%3c/svg%3e");
  }

  input[type="text"]:focus,
  input[type="email"]:focus,
  input[type="date"]:focus,
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

  /* CV Upload Styles */
  .cv-upload-container {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .cv-upload {
    min-height: 80px;
  }

  .cv-preview {
    position: relative;
    display: flex;
    align-items: center;
    padding: var(--spacing-3);
    background: var(--surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    transition: all 0.2s ease;
  }

  .cv-file-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    flex: 1;
  }

  .file-icon {
    width: 32px;
    height: 32px;
    color: var(--primary);
    flex-shrink: 0;
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
  }

  .cv-size {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-top: var(--spacing-1);
  }

  .cv-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-1);
    opacity: 0;
    transition: opacity 0.2s ease;
    color: white;
    font-size: var(--font-size-xs);
    font-weight: 500;
  }

  .cv-upload:hover .cv-overlay {
    opacity: 1;
  }

  .document-icon {
    width: 20px;
    height: 20px;
  }

  .upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
    color: var(--text-secondary);
  }

  .upload-placeholder p {
    margin: 0;
    text-align: center;
  }

  .upload-placeholder strong {
    display: block;
    color: var(--text-primary);
    margin-bottom: var(--spacing-1);
  }

  .upload-icon {
    width: 32px;
    height: 32px;
    color: var(--text-secondary);
  }

  .remove-cv-btn {
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

  .remove-cv-btn:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }

  .remove-cv-btn svg {
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

  /* Manager dropdown specific styles */
  .dropdown-item {
    width: 100%;
    padding: var(--spacing-3);
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .dropdown-item:hover {
    background: var(--secondary);
  }

  .dropdown-item.selected {
    background: var(--primary);
    color: white;
  }

  .dropdown-item.selected .manager-role {
    color: rgba(255, 255, 255, 0.8);
  }

  .manager-name {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-primary);
  }

  .manager-role {
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
