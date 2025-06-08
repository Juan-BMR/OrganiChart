<script>
  import { createEventDispatcher } from "svelte";
  import { membersStore } from "$lib/stores/members.js";
  import { fade } from "svelte/transition";

  export let open = false;
  export let organizationId;
  export let members = [];

  const dispatch = createEventDispatcher();

  let name = "";
  let role = "";
  let managerId = "";
  let email = "";
  let file = null;
  let error = null;

  function close() {
    dispatch("close");
  }

  async function handleSubmit() {
    error = null;
    try {
      if (!name.trim() || !role.trim()) {
        error = "Name and role are required";
        return;
      }
      await membersStore.addMember(
        organizationId,
        name,
        email,
        role,
        managerId || null,
        file,
      );
      close();
    } catch (err) {
      error = err.message;
    }
  }

  function handleFileChange(e) {
    file = e.target.files[0];
  }
</script>

{#if open}
  <div class="modal-backdrop" transition:fade on:click|self={close}>
    <div class="modal" transition:fade>
      <h2>Add Member</h2>
      {#if error}
        <p class="error">{error}</p>
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
          {#each members as m}
            <option value={m.id}>{m.name}</option>
          {/each}
        </select>
      </div>
      <div class="field">
        <label>Photo</label>
        <input type="file" accept="image/*" on:change={handleFileChange} />
      </div>
      <div class="actions">
        <button class="primary" on:click={handleSubmit}>Add</button>
        <button class="secondary" on:click={close}>Cancel</button>
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
    padding: var(--spacing-8);
    border-radius: var(--radius-lg);
    width: 320px;
    max-width: 90vw;
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  h2 {
    margin: 0 0 var(--spacing-2) 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .field input,
  .field select {
    padding: var(--spacing-2) var(--spacing-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }

  .actions {
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

  .secondary {
    background: transparent;
    border: 1px solid var(--border);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-md);
  }

  .error {
    color: var(--danger);
    font-size: 0.85rem;
  }
</style>