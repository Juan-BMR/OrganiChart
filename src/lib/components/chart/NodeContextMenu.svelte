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
  <button on:click={() => handle('edit')}>Edit</button>
  <button on:click={() => handle('delete')}>Delete</button>
  <button on:click={() => handle('pulse')}>Pulse Metrics</button>
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
</style>