<script>
  import { createEventDispatcher } from "svelte";
  import { membersStore } from "$lib/stores/members.js";
  import { fade } from "svelte/transition";

  export let open = false;
  export let member; // existing member object
  export let organizationId;
  export let members = [];

  const dispatch = createEventDispatcher();

  let name = "";
  let role = "";
  let email = "";
  let managerId = "";
  let file = null;
  let filePreviewUrl = null;
  let fileInput;
  let error = null;

  $: if (member) {
    name = member.name;
    role = member.role;
    email = member.email || "";
    managerId = member.managerId || "";
  }

  function close() {
    // Clean up file preview URL
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      filePreviewUrl = null;
    }
    file = null;
    if (fileInput) {
      fileInput.value = "";
    }
    dispatch("close");
  }

  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      error = "Please upload an image file";
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      error = "File size must be below 2MB";
      return;
    }

    file = selectedFile;
    error = null;
    filePreviewUrl = URL.createObjectURL(selectedFile);
  }

  function handleRemoveFile() {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    file = null;
    filePreviewUrl = null;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  async function handleSubmit() {
    error = null;
    try {
      if (!name.trim()) {
        error = "Name is required";
        return;
      }
      await membersStore.updateMember(
        member.id,
        { name, role, email, managerId, organizationId },
        file
      );
      close();
    } catch (err) {
      error = err.message;
    }
  }
</script>

{#if open}
  <div class="modal-backdrop" transition:fade on:click|self={close}>
    <div class="modal" transition:fade aria-modal="true" role="dialog">
      <h2>Edit Member</h2>

      {#if error}
        <div class="error">{error}</div>
      {/if}

      <div class="field">
        <label>Name</label>
        <input type="text" bind:value={name} />
      </div>
      <div class="field">
        <label>Email</label>
        <input type="email" bind:value={email} />
      </div>
      <div class="field">
        <label>Role / Title</label>
        <input type="text" bind:value={role} />
      </div>
      <div class="field">
        <label>Manager</label>
        <select bind:value={managerId}>
          <option value="">-- None (top) --</option>
          {#each members as m (m.id)}
            {#if m.id !== member.id}
              <option value={m.id}>{m.name}</option>
            {/if}
          {/each}
        </select>
      </div>
      <div class="field">
        <label>Photo</label>
        <div class="photo-upload-container">
          <div class="upload-area" on:click={() => fileInput.click()}>
            {#if filePreviewUrl}
              <img src={filePreviewUrl} alt="Photo preview" />
            {:else}
              <p>
                Upload new photo <span class="upload-hint"
                  >(click to select)</span
                >
              </p>
            {/if}
          </div>
          {#if filePreviewUrl}
            <button
              type="button"
              class="remove-photo-btn"
              on:click={handleRemoveFile}
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
          type="file"
          accept="image/*"
          on:change={handleFileChange}
          bind:this={fileInput}
          style="display:none"
        />
      </div>

      <div class="actions">
        <button type="button" on:click={close}>Cancel</button>
        <button class="primary" on:click={handleSubmit}>Save</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
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
    padding: var(--spacing-6) var(--spacing-8);
    border-radius: var(--radius-lg);
    min-width: 320px;
  }
  .field {
    margin-top: var(--spacing-4);
    display: flex;
    flex-direction: column;
  }
  .actions {
    margin-top: var(--spacing-6);
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-3);
  }
  .primary {
    background: var(--primary);
    color: white;
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-md);
  }
  .error {
    background: var(--error-bg, #fee);
    color: var(--error-text, #c00);
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-3);
  }

  .photo-upload-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .upload-area {
    border: 2px dashed var(--border);
    border-radius: var(--radius-md);
    padding: var(--spacing-4);
    text-align: center;
    cursor: pointer;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
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
    max-height: 60px;
    object-fit: contain;
    border-radius: var(--radius-md);
  }

  .upload-hint {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
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
</style>
