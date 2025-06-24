<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { rulesStore } from "$lib/stores/rules.js";
  import { fly, fade } from "svelte/transition";

  const dispatch = createEventDispatcher();

  // Export the open prop to control visibility
  export let open = false;
  export let organizationId = null;

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
  let fontSize = 14; // Default font size
  let loading = false;
  let error = "";
  let modalElement;

  // Delete confirmation state
  let showDeleteConfirmation = false;
  let ruleToDelete = null;
  let deleteModalElement;

  // Focus modal when it becomes visible
  $: if (open && modalElement) {
    modalElement.focus();
  }

  // Focus delete modal when it opens
  $: if (showDeleteConfirmation && deleteModalElement) {
    deleteModalElement.focus();
  }

  // Predefined size options
  const sizePresets = [
    { label: "Small", value: 60, description: "Junior roles" },
    { label: "Medium", value: 90, description: "Standard size" },
    { label: "Large", value: 120, description: "Senior roles" },
    { label: "Extra Large", value: 150, description: "Leadership" },
  ];

  // Predefined font size options
  const fontSizePresets = [
    { label: "Small", value: 12, description: "Subtle text" },
    { label: "Medium", value: 14, description: "Standard size" },
    { label: "Large", value: 16, description: "Emphasized" },
    { label: "Extra Large", value: 18, description: "Leadership" },
  ];

  function selectPreset(size) {
    profileSize = size;
  }

  function selectFontPreset(size) {
    fontSize = size;
  }

  // Direct reactive validation - more reliable than function call
  $: nameValid = ruleName && ruleName.trim().length > 0;
  $: titleValid = titleContains && titleContains.trim().length > 0;
  $: sizeValid = profileSize >= 40 && profileSize <= 200;
  $: fontSizeValid = fontSize >= 10 && fontSize <= 24;
  $: formValid = nameValid && titleValid && sizeValid && fontSizeValid;

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
          text: {
            fontSize: fontSize + "px",
          },
        },
      };

      await rulesStore.addRule(organizationId, newRule);

      // Reset form
      ruleName = "";
      titleContains = "";
      caseSensitive = false;
      profileSize = 90;
      fontSize = 14;
    } catch (err) {
      console.error("Failed to add rule:", err);
      error = "Failed to create rule. Please try again.";
    } finally {
      loading = false;
    }
  }

  function toggleRule(rule) {
    // Optimistic update - no need to await or handle errors in UI
    rulesStore.updateRule(rule.id, { enabled: !rule.enabled });
  }

  function deleteRule(rule) {
    ruleToDelete = rule;
    showDeleteConfirmation = true;
  }

  function confirmDelete() {
    if (ruleToDelete) {
      // Optimistic update - no need to await or handle errors in UI
      rulesStore.deleteRule(ruleToDelete.id);
    }
    showDeleteConfirmation = false;
    ruleToDelete = null;
  }

  function cancelDelete() {
    showDeleteConfirmation = false;
    ruleToDelete = null;
  }

  function handleClose() {
    // Reset form
    ruleName = "";
    titleContains = "";
    caseSensitive = false;
    profileSize = 90;
    fontSize = 14;
    error = "";
    dispatch("close");
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      handleClose();
    }
  }

  function handleDeleteModalKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation(); // Prevent ESC from bubbling up to close the main modal
      cancelDelete();
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
      class="modal scrollbar-custom"
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
                        ?.diameter || 90}px diameter, {rule.styles?.text
                        ?.fontSize || "14px"} font
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

          <div class="form-group">
            <label class="input-label"
              >Profile Picture Size <span class="default-note"
                >(Default: 90px)</span
              ></label
            >

            <!-- Size Presets -->
            <div class="size-presets">
              {#each sizePresets as preset}
                <button
                  type="button"
                  class="preset-btn"
                  class:selected={profileSize === preset.value}
                  class:default={preset.value === 90}
                  on:click={() => selectPreset(preset.value)}
                  disabled={loading}
                >
                  <div
                    class="preset-circle"
                    style="width: {preset.value *
                      0.3}px; height: {preset.value * 0.3}px;"
                  ></div>
                  <div class="preset-info">
                    <div class="preset-label">
                      {preset.label}
                      {#if preset.value === 90}
                        <span class="default-badge">Default</span>
                      {/if}
                    </div>
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

          <!-- Font Size Section -->
          <div class="form-group">
            <label class="input-label"
              >Font Size <span class="default-note">(Default: 14px)</span
              ></label
            >

            <!-- Font Size Presets -->
            <div class="size-presets">
              {#each fontSizePresets as preset}
                <button
                  type="button"
                  class="preset-btn"
                  class:selected={fontSize === preset.value}
                  class:default={preset.value === 14}
                  on:click={() => selectFontPreset(preset.value)}
                  disabled={loading}
                >
                  <div
                    class="font-preview"
                    style="font-size: {preset.value}px;"
                  >
                    Aa
                  </div>
                  <div class="preset-info">
                    <div class="preset-label">
                      {preset.label}
                      {#if preset.value === 14}
                        <span class="default-badge">Default</span>
                      {/if}
                    </div>
                    <div class="preset-size">{preset.value}px</div>
                  </div>
                </button>
              {/each}
            </div>

            <!-- Custom Font Size Input -->
            <div class="custom-size">
              <label class="input-label" for="custom-font-size"
                >Custom size (10-24px)</label
              >
              <input
                id="custom-font-size"
                type="range"
                min="10"
                max="24"
                step="1"
                bind:value={fontSize}
                disabled={loading}
              />
              <div class="size-display">
                <div
                  class="font-preview-large"
                  style="font-size: {fontSize}px;"
                >
                  Sample Text
                </div>
                <span class="size-value">{fontSize}px</span>
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

  <!-- Delete Confirmation Modal -->
  {#if showDeleteConfirmation && ruleToDelete}
    <div
      class="confirmation-overlay"
      on:click|self={cancelDelete}
      transition:fade={{ duration: 200 }}
    >
      <div
        class="confirmation-modal"
        on:keydown={handleDeleteModalKeyDown}
        tabindex="-1"
        bind:this={deleteModalElement}
        transition:fly={{ y: -20, duration: 300 }}
      >
        <div class="confirmation-header">
          <div class="warning-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3>Delete Rule</h3>
        </div>

        <div class="confirmation-body">
          <p>
            Are you sure you want to delete the rule <strong
              >"{ruleToDelete.name}"</strong
            >?
          </p>
          <p class="rule-details">
            This rule applies to job titles containing <strong
              >"{ruleToDelete.conditions[0]?.value}"</strong
            >
            and sets profile pictures to
            <strong>{ruleToDelete.styles?.node?.diameter || 90}px</strong>
            and font size to
            <strong>{ruleToDelete.styles?.text?.fontSize || "14px"}</strong>.
          </p>
          <p class="warning-text">
            This action cannot be undone. The rule will be permanently removed
            and affected elements will return to their default styling.
          </p>
        </div>

        <div class="confirmation-footer">
          <button class="confirm-delete-btn" on:click={confirmDelete}>
            Delete Rule
          </button>
          <button class="cancel-delete-btn" on:click={cancelDelete}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}
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

  .default-note {
    font-weight: 400;
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
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

  .preset-btn.default {
    /* No special styling - keep it subtle */
  }

  .preset-btn.selected.default {
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
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    flex-wrap: wrap;
  }

  .default-badge {
    font-size: var(--font-size-xs);
    font-weight: 400;
    color: var(--text-tertiary);
    background: none;
    padding: 0;
    border-radius: 0;
    line-height: 1;
    opacity: 0.7;
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

  /* Font preview styles */
  .font-preview {
    width: 24px;
    height: 24px;
    background: var(--primary);
    color: white;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-family: var(--font-family);
  }

  .font-preview-large {
    color: var(--text-primary);
    font-weight: 500;
    font-family: var(--font-family);
    white-space: nowrap;
  }

  .modal-footer {
    display: flex;
    gap: var(--spacing-3);
    padding-top: var(--spacing-4);
    border-top: 1px solid var(--border);
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

  /* Delete Confirmation Modal */
  .confirmation-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
    backdrop-filter: blur(4px);
  }

  .confirmation-modal {
    background: var(--background);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 400px;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border);
    margin: var(--spacing-4);
    padding: var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .confirmation-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .warning-icon {
    width: 48px;
    height: 48px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--error);
    flex-shrink: 0;
  }

  .warning-icon svg {
    width: 24px;
    height: 24px;
  }

  .confirmation-header h3 {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .confirmation-body {
    padding: 0;
  }

  .confirmation-body p {
    margin: 0 0 var(--spacing-3) 0;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    line-height: 1.5;
  }

  .confirmation-body p:last-child {
    margin-bottom: 0;
  }

  .rule-details {
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: var(--radius-md);
    padding: var(--spacing-3);
    color: var(--text-primary) !important;
    font-size: var(--font-size-sm) !important;
  }

  .warning-text {
    color: var(--text-secondary) !important;
    font-size: var(--font-size-xs) !important;
  }

  .confirmation-footer {
    display: flex;
    gap: var(--spacing-3);
    padding: 0;
  }

  .cancel-delete-btn {
    background: transparent;
    color: var(--text-secondary);
    padding: var(--spacing-3) var(--spacing-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
  }

  .cancel-delete-btn:hover {
    background: var(--secondary);
    color: var(--text-primary);
    border-color: var(--primary);
  }

  .confirm-delete-btn {
    background: var(--error);
    color: white;
    padding: var(--spacing-3) var(--spacing-4);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
  }

  .confirm-delete-btn:hover {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
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

    .confirmation-footer {
      flex-direction: column-reverse;
    }

    .cancel-delete-btn,
    .confirm-delete-btn {
      width: 100%;
    }
  }
</style>
