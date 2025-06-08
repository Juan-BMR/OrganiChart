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
  let error = null;

  $: if (member) {
    name = member.name;
    role = member.role;
    email = member.email || "";
    managerId = member.managerId || "";
  }

  function close() {
    dispatch("close");
  }

  function handleFileChange(e) {
    file = e.target.files[0];
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
        file,
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
        <input type="file" accept="image/*" on:change={handleFileChange} />
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
</style>