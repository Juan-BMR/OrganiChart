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

  /* ----------------- Builder state ---------------- */
  // General
  let name = "";
  // Condition
  let conditionType = "title_contains";
  let condSubstring = "";
  let condCaseSensitive = false;
  let condLevel = 0;
  let condDirectReports = 0;
  // Styles
  let styleBackgroundColor = "";
  let styleBorderColor = "";
  let styleBorderWidth = ""; // px
  let styleFontWeight = "";

  /* ----------------- Helpers ---------------- */
  function buildConditions() {
    switch (conditionType) {
      case "title_contains":
        return [
          {
            type: "title_contains",
            value: condSubstring.trim(),
            caseSensitive: condCaseSensitive,
          },
        ];
      case "level_equals":
        return [
          {
            type: "level_equals",
            value: Number(condLevel),
          },
        ];
      case "direct_reports_gte":
        return [
          {
            type: "direct_reports_gte",
            value: Number(condDirectReports),
          },
        ];
    }
  }

  function buildStyles() {
    const style = {};
    if (styleBackgroundColor) {
      style.node = { ...(style.node || {}), backgroundColor: styleBackgroundColor };
    }
    if (styleBorderColor) {
      style.node = { ...(style.node || {}), borderColor: styleBorderColor };
    }
    if (styleBorderWidth && !isNaN(styleBorderWidth)) {
      style.node = {
        ...(style.node || {}),
        borderWidth: Number(styleBorderWidth),
      };
    }
    if (styleFontWeight) {
      style.text = { ...(style.text || {}), fontWeight: styleFontWeight };
    }
    return style;
  }

  function validateForm() {
    if (!name.trim()) return false;

    // Validate condition-specific values
    switch (conditionType) {
      case "title_contains":
        if (!condSubstring.trim()) return false;
        break;
      case "level_equals":
        if (isNaN(condLevel)) return false;
        break;
      case "direct_reports_gte":
        if (isNaN(condDirectReports) || condDirectReports < 0) return false;
        break;
    }

    // Validate style – at least one property chosen
    const styles = buildStyles();
    if (Object.keys(styles).length === 0) return false;

    return true;
  }

  $: formValid = validateForm();

  function addRule() {
    if (!formValid) return;

    const newRule = {
      name: name.trim(),
      enabled: true,
      priority: rules.length,
      conditions: buildConditions(),
      styles: buildStyles(),
    };

    rulesStore.addRule(newRule);

    // Reset form fields
    name = "";
    condSubstring = "";
    condLevel = 0;
    condDirectReports = 0;
    styleBackgroundColor = "";
    styleBorderColor = "";
    styleBorderWidth = "";
    styleFontWeight = "";
  }

  function toggleRule(rule) {
    rulesStore.updateRule(rule.id, { enabled: !rule.enabled });
  }

  function deleteRule(rule) {
    if (confirm(`Delete rule "${rule.name}"?`)) {
      rulesStore.deleteRule(rule.id);
    }
  }

  function moveRule(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= rules.length) return;
    const ordered = [...rules];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(newIndex, 0, moved);
    rulesStore.reorderRules(ordered.map((r) => r.id));
  }

  // ----------------- End builder -----------------
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
      {#each rules as rule, i (rule.id)}
        <div class="rule-item">
          <button class="move-btn" title="Move up" disabled={i === 0} on:click={() => moveRule(i, -1)}>▲</button>
          <button class="move-btn" title="Move down" disabled={i === rules.length - 1} on:click={() => moveRule(i, 1)}>▼</button>
          <input type="checkbox" bind:checked={rule.enabled} on:change={() => toggleRule(rule)} />
          <span class="rule-name">{rule.name}</span>
          <span class="rule-priority">#{rule.priority}</span>
          <button class="delete-btn" on:click={() => deleteRule(rule)}>🗑</button>
        </div>
      {/each}
    {/if}
  </section>

  <form class="new-rule" on:submit|preventDefault={addRule}>
    <h3>Create Rule</h3>
    <label>
      <span>Name</span>
      <input type="text" bind:value={name} required />
    </label>

    <fieldset class="condition-section">
      <legend>Condition</legend>
      <select bind:value={conditionType}>
        <option value="title_contains">Title contains</option>
        <option value="level_equals">Level equals</option>
        <option value="direct_reports_gte">Direct reports ≥</option>
      </select>

      {#if conditionType === 'title_contains'}
        <input type="text" placeholder="Substring" bind:value={condSubstring} required />
        <label class="inline"><input type="checkbox" bind:checked={condCaseSensitive}/> Case sensitive</label>
      {:else if conditionType === 'level_equals'}
        <input type="number" min="0" step="1" bind:value={condLevel} required />
      {:else}
        <input type="number" min="0" step="1" bind:value={condDirectReports} required />
      {/if}
    </fieldset>

    <fieldset class="style-section">
      <legend>Styles (any)</legend>
      <label class="color-picker">
        <span>Background</span>
        <input type="color" bind:value={styleBackgroundColor} />
      </label>
      <label class="color-picker">
        <span>Border color</span>
        <input type="color" bind:value={styleBorderColor} />
      </label>
      <label class="inline">
        Border width <input type="number" min="0" max="10" style="width:60px" bind:value={styleBorderWidth}/> px
      </label>
      <label class="inline">
        Font weight
        <select bind:value={styleFontWeight}>
          <option value="">—</option>
          <option value="400">Normal</option>
          <option value="500">500</option>
          <option value="600">600</option>
          <option value="700">Bold</option>
        </select>
      </label>
    </fieldset>

    <button type="submit" class="add-btn" disabled={!formValid}>Add Rule</button>
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
    gap: 0.3rem;
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

  .move-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-size: 0.8rem;
    line-height: 1;
    color: var(--text-secondary,#666);
  }
  .move-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .inline {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .condition-section, .style-section {
    border: 1px solid var(--border,#ddd);
    padding: 0.5rem;
    border-radius: var(--radius-md,8px);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-block: 0.5rem;
  }

  .condition-section select {
    width: 100%;
  }

  .new-rule label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .new-rule input[type="text"],
  .new-rule input[type="number"],
  .new-rule select {
    width: 100%;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border,#ddd);
    border-radius: var(--radius-md,6px);
  }

  .add-btn[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>