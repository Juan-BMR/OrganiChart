<script>
  import { createEventDispatcher } from "svelte";
  export let x = 0;
  export let y = 0;
  export let member;
  const dispatch = createEventDispatcher();

  function handle(action) {
    dispatch(action, { member });
  }
</script>

<div class="context-menu" style="left:{x}px; top:{y}px" on:click|stopPropagation>
  <button on:click={() => handle('edit')}>✏️ Edit</button>
  <button on:click={() => handle('skills')}>🧬 DNA & Skills</button>
  <div class="menu-separator"></div>
  <button on:click={() => handle('delete')}" class="delete-btn">🗑️ Delete</button>
</div>

<style>
  .context-menu {
    position: absolute;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    z-index: 3000;
  }
  .context-menu button {
    padding: var(--spacing-2) var(--spacing-4);
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
  }
  .context-menu button:hover {
    background: var(--surface);
  }

  .menu-separator {
    height: 1px;
    background: var(--border);
    margin: var(--spacing-1) 0;
  }

  .delete-btn {
    color: var(--error, #DC2626);
  }

  .delete-btn:hover {
    background: var(--error-background, #FEE2E2);
    color: var(--error, #DC2626);
  }
</style>