<script>
  // @ts-nocheck
  import { createEventDispatcher } from "svelte";
  import { organizationsStore } from "$lib/stores/organizations.js";
  // import { onMount } from "svelte";

  export let open = false;

  const dispatch = createEventDispatcher();

  let name = "";
  let logoFile = null;
  let logoPreviewUrl = null;
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

    logoFile = file;
    error = "";
    logoPreviewUrl = URL.createObjectURL(file);
  }

  async function handleSubmit() {
    error = "";

    if (!name.trim()) {
      error = "Company name is required";
      return;
    }

    loading = true;
    try {
      await organizationsStore.createOrganization(name, logoFile);
      dispatch("created");
      handleClose();
    } catch (err) {
      console.error(err);
      error = err.message || "Failed to create organization";
    } finally {
      loading = false;
    }
  }

  function handleClose() {
    // Reset state
    name = "";
    logoFile = null;
    logoPreviewUrl = null;
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
        <h2>Create new organization</h2>
        <button class="close-btn" on:click={handleClose}>×</button>
      </header>

      <div class="modal-body">
        <label class="input-label" for="org-name">Company Name</label>
        <input
          id="org-name"
          type="text"
          placeholder="Place your Company's name"
          bind:value={name}
          class:error={error && !name.trim()}
          disabled={loading}
        />

        <label class="input-label" for="logo-upload">Logo (optional)</label>
        <div class="upload-area" on:click={() => fileInput.click()}>
          {#if logoPreviewUrl}
            <img src={logoPreviewUrl} alt="Logo preview" />
          {:else}
            <p>Upload logo <span class="upload-hint">(click or drag)</span></p>
          {/if}
        </div>
        <input
          id="logo-upload"
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
        <button class="create-btn" on:click={handleSubmit} disabled={loading}>
          {#if loading}
            <span class="spinner" /> Creating...
          {:else}
            Create company
          {/if}
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .modal {
    background: var(--background);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 400px;
    box-shadow: var(--shadow-lg);
    padding: var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .close-btn {
    position: absolute;
    top: var(--spacing-4);
    right: var(--spacing-4);
    width: 36px;
    height: 36px;
    background: var(--surface);
    color: var(--text-primary);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 50%;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 
      0 1px 3px rgba(0, 0, 0, 0.12),
      0 1px 2px rgba(0, 0, 0, 0.24),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .close-btn:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 3px 6px rgba(0, 0, 0, 0.16),
      0 3px 6px rgba(0, 0, 0, 0.23),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .input-label {
    font-weight: 500;
    font-size: var(--font-size-sm);
  }

  input[type="text"] {
    padding: var(--spacing-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background: var(--background);
    color: var(--text-primary);
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
  }

  .upload-area img {
    max-width: 100%;
    max-height: 100px;
    object-fit: contain;
  }

  .upload-hint {
    font-size: var(--font-size-xs);
  }

  .error-message {
    color: var(--error);
    font-size: var(--font-size-sm);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
  }

  .create-btn {
    width: 100%;
    padding: var(--spacing-3) var(--spacing-6);
    background: var(--primary);
    color: white;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 50px;
    font-size: var(--font-size-base);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 
      0 2px 4px rgba(0, 0, 0, 0.2),
      0 2px 4px var(--primary-alpha-20),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .create-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .create-btn:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 
      0 4px 8px rgba(0, 0, 0, 0.25),
      0 4px 8px var(--primary-alpha-30),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid color-mix(in srgb, var(--primary-text) 40%, transparent);
    border-top-color: var(--primary-text);
    border-radius: 50%;
    display: inline-block;
    animation: spin 1s linear infinite;
    margin-right: var(--spacing-2);
    vertical-align: middle;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
