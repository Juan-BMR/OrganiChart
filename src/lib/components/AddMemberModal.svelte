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
      await membersStore.addMember(
        organizationId,
        name,
        email,
        role,
        managerId || null,
        photoFile
      );
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
    // Reset state
    name = "";
    email = "";
    role = "";
    managerId = "";
    photoFile = null;
    photoPreviewUrl = null;
    error = "";
    open = false;
    dispatch("close");
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      handleClose();
    }
  }
</script>

{#if open}
  <div class="modal-overlay" on:click|self={handleClose}>
    <div class="modal" on:keydown={handleKeyDown} tabindex="-1">
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
        <select id="member-manager" bind:value={managerId} disabled={loading}>
          <option value="">-- None (top) --</option>
          {#each members as member}
            <option value={member.id}>{member.name}</option>
          {/each}
        </select>

        <label class="input-label" for="photo-upload">Photo</label>
        <div class="upload-area" on:click={() => fileInput.click()}>
          {#if photoPreviewUrl}
            <img src={photoPreviewUrl} alt="Photo preview" />
          {:else}
            <p>Upload photo <span class="upload-hint">(click or drag)</span></p>
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
