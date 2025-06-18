<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { rulesStore } from "$lib/stores/rules.js";

  const dispatch = createEventDispatcher();

  let rules = [];
  let unsubscribe;

  onMount(() => {
    unsubscribe = rulesStore.subscribe((val) => (rules = val));
    return () => unsubscribe();
  });

  // New rule form fields
  let name = "";
  let substring = "";
  let backgroundColor = "#ffeb3b"; // yellow default

  function addRule() {
    if (!name.trim() || !substring.trim()) return;

    rulesStore.addRule({
      name: name.trim(),
      enabled: true,
      priority: rules.length,
      conditions: [
        {
          type: "title_contains",
          value: substring.trim(),
          caseSensitive: false,
        },
      ],
      styles: {
        node: {
          backgroundColor,
        },
      },
    });

    // Reset form
    name = "";
    substring = "";
  }

  function toggleRule(rule) {
    rulesStore.updateRule(rule.id, { enabled: !rule.enabled });
  }

  function deleteRule(rule) {
    if (confirm(`Delete rule "${rule.name}"?`)) {
      rulesStore.deleteRule(rule.id);
    }
  }
</script>

<div class="overlay" on:click={() => dispatch("close")}></div>
<div class="modal">
  <header>
    <h2>Rule Manager</h2>
    <button class="close-btn" on:click={() => dispatch("close")}>✕</button>
  </header>

  <section class="rule-list">
    {#if rules.length === 0}
      <p class="empty">No rules yet.</p>
    {:else}
      {#each rules as rule (rule.id)}
        <div class="rule-item">
          <input type="checkbox" bind:checked={rule.enabled} on:change={() => toggleRule(rule)} />
          <span class="rule-name">{rule.name}</span>
          <span class="rule-priority">#{rule.priority}</span>
          <button class="delete-btn" on:click={() => deleteRule(rule)}>🗑</button>
        </div>
      {/each}
    {/if}
  </section>

  <form class="new-rule" on:submit|preventDefault={addRule}>
    <h3>Add Quick "Title contains" Rule</h3>
    <input
      type="text"
      placeholder="Rule name"
      bind:value={name}
      required
    />
    <input
      type="text"
      placeholder="Title substring"
      bind:value={substring}
      required
    />
    <label class="color-picker">
      <span>Background</span>
      <input type="color" bind:value={backgroundColor} />
    </label>
    <button type="submit" class="add-btn">Add</button>
  </form>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    z-index: 1000;
  }

  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--background, #ffffff);
    color: var(--text-primary, #111);
    padding: var(--spacing-6, 1.5rem) var(--spacing-8, 2rem);
    border-radius: var(--radius-lg, 12px);
    width: 320px;
    max-width: 90vw;
    z-index: 1001;
    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.15));
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: inherit;
  }

  .rule-list {
    max-height: 180px;
    overflow-y: auto;
    border: 1px solid var(--border, #ddd);
    padding: 0.5rem;
    border-radius: var(--radius-md, 8px);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .rule-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .rule-name {
    flex: 1;
  }

  .rule-priority {
    font-size: 0.75rem;
    color: var(--text-secondary,#666);
  }

  .delete-btn {
    background: none;
    border: none;
    cursor: pointer;
  }

  .empty {
    text-align: center;
    color: var(--text-secondary,#666);
  }

  .new-rule {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .color-picker {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .add-btn {
    align-self: flex-end;
    padding: 0.5rem 1rem;
    background: var(--primary,#6366f1);
    color: #fff;
    border: none;
    border-radius: var(--radius-md,6px);
    cursor: pointer;
    font-size: 0.85rem;
  }
</style>