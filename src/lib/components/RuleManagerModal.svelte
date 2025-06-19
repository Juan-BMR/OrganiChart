<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { rulesStore } from "$lib/stores/rules.js";
  import { fly, fade } from "svelte/transition";

  const dispatch = createEventDispatcher();

  // Export the open prop to control visibility
  export let open = false;

  let rules = [];
  let unsubscribe;

  onMount(() => {
    unsubscribe = rulesStore.subscribe((val) => (rules = val));
    return () => unsubscribe();
  });

  // Form state
  let ruleName = "";
  let titleContains = "";
  let caseSensitive = false;
  let profileSize = 90; // Default size
  let loading = false;
  let error = "";
  let modalElement;

  // Focus modal when it becomes visible
  $: if (open && modalElement) {
    modalElement.focus();
  }

  // Predefined size options
  const sizePresets = [
    { label: "Small", value: 60, description: "Junior roles" },
    { label: "Medium", value: 90, description: "Standard size" },
    { label: "Large", value: 120, description: "Senior roles" },
    { label: "Extra Large", value: 150, description: "Leadership" },
  ];

  function selectPreset(size) {
    profileSize = size;
  }

  // Direct reactive validation - more reliable than function call
  $: nameValid = ruleName && ruleName.trim().length > 0;
  $: titleValid = titleContains && titleContains.trim().length > 0;
  $: sizeValid = profileSize >= 40 && profileSize <= 200;
  $: formValid = nameValid && titleValid && sizeValid;

  async function handleSubmit() {
    if (!formValid || loading) return;

    error = "";
    loading = true;

    try {
      const newRule = {
        name: ruleName.trim(),
        enabled: true,
        priority: rules.length,
        conditions: [
          {
            type: "title_contains",
            value: titleContains.trim(),
            caseSensitive,
          },
        ],
        styles: {
          node: {
            diameter: profileSize,
          },
        },
      };

      rulesStore.addRule(newRule);

      // Reset form
      ruleName = "";
      titleContains = "";
      caseSensitive = false;
      profileSize = 90;
    } catch (err) {
      console.error("Failed to add rule:", err);
      error = "Failed to create rule. Please try again.";
    } finally {
      loading = false;
    }
  }

  function toggleRule(rule) {
    rulesStore.updateRule(rule.id, { enabled: !rule.enabled });
  }

  function deleteRule(rule) {
    rulesStore.deleteRule(rule.id);
  }

  function handleClose() {
    // Reset form
    ruleName = "";
    titleContains = "";
    caseSensitive = false;
    profileSize = 90;
    error = "";
    dispatch("close");
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      handleClose();
    }
  }
</script>

{#if open}
  <div
    class="modal-overlay"
    on:click|self={handleClose}
    transition:fade={{ duration: 200 }}
  >
    <div
      class="modal"
      on:keydown={handleKeyDown}
      tabindex="-1"
      bind:this={modalElement}
      transition:fly={{ x: 400, duration: 300 }}
    >
      <header class="modal-header">
        <h2>Profile Size Rules</h2>
        <button class="close-btn" on:click={handleClose}>×</button>
      </header>

      <div class="modal-body">
        <!-- Existing Rules -->
        {#if rules.length > 0}
          <div class="rules-section">
            <h3>Active Rules</h3>
            <div class="rules-list">
              {#each rules as rule (rule.id)}
                <div class="rule-item" class:disabled={!rule.enabled}>
                  <div class="rule-info">
                    <div class="rule-name">{rule.name}</div>
                    <div class="rule-condition">
                      "{rule.conditions[0]?.value}" → {rule.styles?.node
                        ?.diameter || 90}px diameter
                    </div>
                  </div>
                  <div class="rule-actions">
                    <button
                      class="toggle-btn"
                      class:enabled={rule.enabled}
                      on:click={() => toggleRule(rule)}
                      title={rule.enabled ? "Disable rule" : "Enable rule"}
                    >
                      {rule.enabled ? "ON" : "OFF"}
                    </button>
                    <button
                      class="delete-btn"
                      on:click={() => deleteRule(rule)}
                      title="Delete rule"
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Create New Rule -->
        <div class="create-section">
          <h3>Create New Rule</h3>

          <div class="form-group">
            <label class="input-label" for="rule-name">Rule Name</label>
            <input
              id="rule-name"
              type="text"
              placeholder="e.g., Manager Size Rule"
              bind:value={ruleName}
              disabled={loading}
            />
          </div>

          <div class="form-group">
            <label class="input-label" for="title-contains"
              >When job title contains</label
            >
            <input
              id="title-contains"
              type="text"
              placeholder="e.g., Manager, Director, CEO"
              bind:value={titleContains}
              disabled={loading}
            />
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={caseSensitive}
                disabled={loading}
              />
              <span class="checkbox-text">Case sensitive</span>
            </label>
          </div>

          <div class="form-group last-form-group">
            <label class="input-label">Profile Picture Size</label>

            <!-- Size Presets -->
            <div class="size-presets">
              {#each sizePresets as preset}
                <button
                  type="button"
                  class="preset-btn"
                  class:selected={profileSize === preset.value}
                  on:click={() => selectPreset(preset.value)}
                  disabled={loading}
                >
                  <div
                    class="preset-circle"
                    style="width: {preset.value *
                      0.3}px; height: {preset.value * 0.3}px;"
                  ></div>
                  <div class="preset-info">
                    <div class="preset-label">{preset.label}</div>
                    <div class="preset-size">{preset.value}px</div>
                  </div>
                </button>
              {/each}
            </div>

            <!-- Custom Size Input -->
            <div class="custom-size">
              <label class="input-label" for="custom-size"
                >Custom size (40-200px)</label
              >
              <input
                id="custom-size"
                type="range"
                min="40"
                max="200"
                step="10"
                bind:value={profileSize}
                disabled={loading}
              />
              <div class="size-display">
                <div
                  class="size-preview"
                  style="width: {profileSize * 0.4}px; height: {profileSize *
                    0.4}px;"
                ></div>
                <span class="size-value">{profileSize}px</span>
              </div>
            </div>
          </div>

          {#if error}
            <div class="error-message">{error}</div>
          {/if}
        </div>
      </div>

      <footer class="modal-footer">
        <button
          class="create-btn"
          on:click={handleSubmit}
          disabled={!formValid || loading}
        >
          {#if loading}
            <span class="spinner" />
            Creating...
          {:else}
            Create Rule
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
    justify-content: flex-end;
    z-index: 2000;
    padding-right: 24px;
  }

  .modal {
    background: var(--background);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 500px;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border);
    padding: var(--spacing-6);
    max-height: 85vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
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
    background: none;
    border: none;
    font-size: var(--font-size-xl);
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-2);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--surface);
    color: var(--text-primary);
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .rules-section {
    margin-bottom: var(--spacing-6);
  }

  .rules-section h3 {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--spacing-4) 0;
  }

  .create-section h3 {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--spacing-4) 0;
  }

  .rules-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: var(--spacing-4);
  }

  .rule-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-3);
    background: var(--background);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    transition: all 0.2s ease;
  }

  .rule-item.disabled {
    opacity: 0.6;
  }

  .rule-info {
    flex: 1;
  }

  .rule-name {
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: var(--spacing-1);
  }

  .rule-condition {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .rule-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .toggle-btn {
    background: var(--surface);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    padding: var(--spacing-1) var(--spacing-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-btn.enabled {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  .delete-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-2);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
  }

  .delete-btn:hover {
    background: var(--error);
    color: white;
  }

  .delete-btn svg {
    width: 16px;
    height: 16px;
  }

  .form-group {
    margin-bottom: var(--spacing-4);
  }

  .form-group.last-form-group {
    margin-bottom: 0;
  }

  .input-label {
    display: block;
    font-weight: 500;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    margin-bottom: var(--spacing-2);
  }

  input[type="text"] {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--spacing-3) var(--spacing-4);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    transition: all 0.2s ease;
  }

  input[type="text"]:focus {
    border-color: var(--primary);
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  input[type="text"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-top: var(--spacing-2);
    cursor: pointer;
  }

  .checkbox-text {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .size-presets {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-4);
  }

  .preset-btn {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--spacing-3);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .preset-btn:hover {
    border-color: var(--primary-light);
  }

  .preset-btn.selected {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 10%, transparent);
  }

  .preset-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .preset-circle {
    background: var(--primary);
    border-radius: 50%;
    border: 2px solid var(--background);
    box-shadow: 0 0 0 1px var(--primary);
  }

  .preset-info {
    text-align: left;
  }

  .preset-label {
    font-weight: 500;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .preset-size {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .custom-size {
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: var(--spacing-4);
    border: 1px solid var(--border);
  }

  input[type="range"] {
    width: 100%;
    margin: var(--spacing-3) 0;
  }

  .size-display {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    justify-content: center;
  }

  .size-preview {
    background: var(--primary);
    border-radius: 50%;
    border: 2px solid var(--background);
    box-shadow: 0 0 0 1px var(--primary);
  }

  .size-value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .error-message {
    background: color-mix(in srgb, var(--error) 10%, transparent);
    border: 1px solid var(--error);
    border-radius: var(--radius-md);
    padding: var(--spacing-3);
    color: var(--error);
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-3);
  }

  .modal-footer {
    display: flex;
    gap: var(--spacing-3);
  }

  .create-btn {
    background: var(--primary);
    color: white;
    border: none;
    padding: var(--spacing-3) var(--spacing-6);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    flex: 1;
  }

  .create-btn:hover:not(:disabled) {
    background: var(--primary-dark);
    transform: translateY(-1px);
  }

  .create-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .cancel-btn {
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border);
    padding: var(--spacing-3) var(--spacing-6);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cancel-btn:hover:not(:disabled) {
    background: var(--surface);
    border-color: var(--text-secondary);
  }

  .cancel-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .modal-overlay {
      padding-right: 16px;
      padding-left: 16px;
    }

    .modal {
      max-width: none;
    }

    .size-presets {
      grid-template-columns: 1fr;
    }

    .modal-footer {
      flex-direction: column-reverse;
    }

    .create-btn,
    .cancel-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
