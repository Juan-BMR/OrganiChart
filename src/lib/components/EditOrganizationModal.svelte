<script>
  import { createEventDispatcher } from "svelte";
  import { organizationsStore } from "$lib/stores/organizations.js";

  export let open = false;
  export let organization; // existing organization object

  const dispatch = createEventDispatcher();
  let modalElement;

  let name = "";
  let logoFile = null;
  let logoPreviewUrl = null;
  let fileInput;
  let error = null;
  let loading = false;
  let currentOrganizationId = null; // Track which organization we're currently editing

  // Initialize form values when modal opens or when organization changes
  $: if (open && organization && organization.id !== currentOrganizationId) {
    name = organization.name;
    logoFile = null; // Reset photo state
    logoPreviewUrl = null;
    currentOrganizationId = organization.id;
    error = null;
  }

  // Focus the modal when it opens
  $: if (open && modalElement) {
    modalElement.focus();
  }

  function close() {
    // Clean up file preview URL
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
      logoPreviewUrl = null;
    }
    logoFile = null;
    if (fileInput) {
      fileInput.value = "";
    }

    // Reset form values
    name = "";
    error = null;
    currentOrganizationId = null;

    dispatch("close");
  }

  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Check if file is an image
    if (!selectedFile.type.startsWith("image/")) {
      error = "Please upload an image file (JPG, PNG, GIF, WebP)";
      // Reset the file input
      if (fileInput) {
        fileInput.value = "";
      }
      return;
    }

    // Check file size (2MB limit)
    if (selectedFile.size > 2 * 1024 * 1024) {
      error = "File size must be below 2MB";
      // Reset the file input
      if (fileInput) {
        fileInput.value = "";
      }
      return;
    }

    // File is valid
    logoFile = selectedFile;
    error = null;
    logoPreviewUrl = URL.createObjectURL(selectedFile);
  }

  function handleRemoveFile() {
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    logoFile = null;
    logoPreviewUrl = null;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  function handleRemoveCurrentLogo() {
    // Set a flag to remove the current logo when saving
    logoFile = "REMOVE_LOGO"; // Special flag to indicate logo removal
    logoPreviewUrl = null;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation(); // Prevent ESC from bubbling up
      close();
    }
  }

  async function handleSubmit() {
    error = null;
    loading = true;

    try {
      if (!name.trim()) {
        error = "Organization name is required";
        return;
      }

      // Determine if we need to update the logo
      let logoToUpdate = undefined; // undefined means don't change logo

      if (logoFile === "REMOVE_LOGO") {
        logoToUpdate = null; // null means remove the logo
      } else if (logoFile && logoFile !== "REMOVE_LOGO") {
        logoToUpdate = logoFile; // file object means upload new logo
      }
      // If logoFile is null/undefined and not "REMOVE_LOGO", don't pass logoToUpdate (keep existing logo)

      // Update organization
      await organizationsStore.updateOrganization(
        organization.id,
        { name: name.trim() },
        logoToUpdate
      );
      close();
    } catch (err) {
      console.error("EditOrganizationModal submit error:", err);
      error = err.message || "Failed to update organization";
    } finally {
      loading = false;
    }
  }
</script>

{#if open}
  <div class="modal-overlay" on:click|self={close}>
    <div
      class="modal scrollbar-custom"
      on:keydown={handleKeyDown}
      tabindex="-1"
      bind:this={modalElement}
    >
      <header class="modal-header">
        <h2>Edit Organization</h2>
        <button class="close-btn" on:click={close}>×</button>
      </header>

      <div class="modal-body">
        {#if error}
          <p class="error-message">{error}</p>
        {/if}

        <label class="input-label" for="edit-org-name">Company Name</label>
        <input
          id="edit-org-name"
          type="text"
          placeholder="Enter company name"
          bind:value={name}
          class:error={error && !name.trim()}
          disabled={loading}
        />

        <label class="input-label" for="edit-logo-upload">Logo</label>
        <div class="logo-upload-container">
          <div class="upload-area" on:click={() => fileInput.click()}>
            {#if logoFile === "REMOVE_LOGO"}
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p>
                  <strong>Click to upload logo</strong>
                  <span class="upload-hint">JPG, PNG, GIF, WebP up to 2MB</span>
                </p>
              </div>
            {:else if logoPreviewUrl}
              <div class="logo-preview">
                <img src={logoPreviewUrl} alt="Logo preview" />
                <div class="logo-overlay">
                  <svg
                    class="camera-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>Click to change</span>
                </div>
              </div>
            {:else if organization?.logoURL}
              <div class="logo-preview">
                <img src={organization.logoURL} alt="Current logo" />
                <div class="logo-overlay">
                  <svg
                    class="camera-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p>
                  <strong>Click to upload logo</strong>
                  <span class="upload-hint">JPG, PNG, GIF, WebP up to 2MB</span>
                </p>
              </div>
            {/if}
          </div>

          <div class="logo-actions">
            {#if logoPreviewUrl}
              <button
                type="button"
                class="logo-action-btn remove"
                on:click={handleRemoveFile}
                title="Cancel new logo"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Cancel
              </button>
            {:else if organization?.logoURL && logoFile !== "REMOVE_LOGO"}
              <button
                type="button"
                class="logo-action-btn remove"
                on:click={handleRemoveCurrentLogo}
                title="Remove current logo"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Remove Logo
              </button>
            {/if}

            <button
              type="button"
              class="logo-action-btn change"
              on:click={() => fileInput.click()}
              title="Change logo"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {logoPreviewUrl ||
              (organization?.logoURL && logoFile !== "REMOVE_LOGO")
                ? "Change Logo"
                : "Add Logo"}
            </button>
          </div>
        </div>
        <input
          id="edit-logo-upload"
          type="file"
          accept="image/*"
          on:change={handleFileChange}
          bind:this={fileInput}
          style="display:none"
        />
      </div>

      <footer class="modal-footer">
        <button class="save-btn" on:click={handleSubmit} disabled={loading}>
          {#if loading}
            <span class="spinner" /> Saving...
          {:else}
            Save Changes
          {/if}
        </button>
        <button class="cancel-btn" on:click={close} disabled={loading}>
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
    z-index: 2200;
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

  input[type="text"] {
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

  input[type="text"]:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    outline: none;
  }

  input.error {
    border-color: var(--error);
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
    min-height: 120px;
    font-size: var(--font-size-sm);
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease;
  }

  .upload-area:hover {
    border-color: var(--primary);
    background: var(--surface);
  }

  .logo-upload-container {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
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

  .upload-hint {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .logo-preview {
    position: relative;
    display: inline-block;
  }

  .logo-preview img {
    max-width: 100%;
    max-height: 100px;
    object-fit: contain;
    border-radius: var(--radius-md);
    transition: opacity 0.2s ease;
  }

  .logo-overlay {
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

  .upload-area:hover .logo-overlay {
    opacity: 1;
  }

  .camera-icon {
    width: 20px;
    height: 20px;
  }

  .logo-actions {
    display: flex;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .logo-action-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-2) var(--spacing-3);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .logo-action-btn.remove {
    background: var(--error);
    color: white;
  }

  .logo-action-btn.remove:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }

  .logo-action-btn.change {
    background: var(--primary);
    color: white;
  }

  .logo-action-btn.change:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
  }

  .logo-action-btn svg {
    width: 14px;
    height: 14px;
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
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .save-btn {
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

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .save-btn:not(:disabled):hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
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
    .save-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
