<script>
  import { createEventDispatcher, onMount } from "svelte";

  export let open = false;
  export let member = null; // member to move
  export let members = [];
  export let canReparent = () => true;

  const dispatch = createEventDispatcher();

  let selectedManagerId = ""; // empty for top level
  let modalEl;

  $: if (open) {
    // default selection = current manager
    selectedManagerId = member?.managerId || "";
  }

  function confirm() {
    dispatch("move", {
      employeeId: member.id,
      newManagerId: selectedManagerId || null,
    });
  }

  function close() {
    open = false;
    dispatch("close");
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
    if (e.key === "Enter" && e.target === modalEl) {
      // If focus is on dialog container, do nothing
      e.preventDefault();
    }
  }

  $: eligibleManagers = members.filter(
    (m) => member && canReparent(member.id, m.id)
  );

  // focus trap simple
  onMount(() => {
    if (open && modalEl) {
      modalEl.focus();
    }
  });

  $: if (open && modalEl) {
    setTimeout(() => modalEl.focus(), 0);
  }
</script>

{#if open && member}
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="move-title" on:keydown={handleKeyDown}>
    <div class="modal" tabindex="-1" bind:this={modalEl}>
      <header class="modal-header">
        <h2 id="move-title">Move {member.name}</h2>
        <button class="close-btn" on:click={close} aria-label="Close">×</button>
      </header>

      <div class="modal-body">
        <label for="manager-select" class="input-label">New Manager</label>
        <select id="manager-select" bind:value={selectedManagerId}>
          <option value="">-- None (top level) --</option>
          {#each eligibleManagers as mgr}
            <option value={mgr.id}>{mgr.name} — {mgr.role}</option>
          {/each}
        </select>
      </div>

      <footer class="modal-footer">
        <button class="confirm-btn" on:click={confirm}>Move</button>
        <button class="cancel-btn" on:click={close}>Cancel</button>
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
    justify-content: center;
    align-items: center;
    z-index: 4000;
  }
  .modal {
    background: var(--background);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    width: 360px;
    max-width: 90vw;
    outline: none;
    display: flex;
    flex-direction: column;
  }
  .modal-header {
    padding: var(--spacing-4) var(--spacing-6);
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .close-btn {
    background: transparent;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
  }
  .modal-body {
    padding: var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }
  select {
    padding: var(--spacing-2) var(--spacing-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
  }
  .modal-footer {
    padding: var(--spacing-4) var(--spacing-6);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-3);
  }
  .confirm-btn {
    background: var(--primary);
    color: white;
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-md);
  }
  .cancel-btn {
    background: transparent;
    border: 1px solid var(--border);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-md);
  }
</style>