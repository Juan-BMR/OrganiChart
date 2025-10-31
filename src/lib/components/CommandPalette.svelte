<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { fade, fly } from "svelte/transition";

  // Props
  export let open = false;
  export let members = [];

  // State
  let searchQuery = "";
  let selectedIndex = 0;
  let inputEl = null;

  const dispatch = createEventDispatcher();

  // Fuzzy search function
  function fuzzyMatch(text, query) {
    if (!query) return true;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Simple fuzzy matching - check if all query chars appear in order
    let queryIndex = 0;
    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === lowerQuery.length;
  }

  // Filter members based on search query
  $: filteredMembers = members.filter(member => {
    if (!searchQuery.trim()) return true;
    
    const searchableText = [
      member.name || "",
      member.role || "",
      member.email || ""
    ].join(" ");
    
    return fuzzyMatch(searchableText, searchQuery);
  }).slice(0, 8); // Limit to 8 results

  // Reset selected index when filtered results change
  $: if (filteredMembers.length > 0 && selectedIndex >= filteredMembers.length) {
    selectedIndex = 0;
  }

  // Focus input when opening
  $: if (open && inputEl) {
    setTimeout(() => inputEl?.focus(), 50);
  }

  // Handle keyboard navigation
  function handleKeydown(e) {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredMembers.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === "Enter" && filteredMembers[selectedIndex]) {
      e.preventDefault();
      selectMember(filteredMembers[selectedIndex]);
    }
  }

  function selectMember(member) {
    dispatch("select", { member });
    close();
  }

  function close() {
    open = false;
    searchQuery = "";
    selectedIndex = 0;
    dispatch("close");
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      close();
    }
  }

  // Highlight matching characters
  function highlightMatch(text, query) {
    if (!query) return text;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let result = "";
    let queryIndex = 0;
    
    for (let i = 0; i < text.length; i++) {
      if (queryIndex < lowerQuery.length && lowerText[i] === lowerQuery[queryIndex]) {
        result += `<mark>${text[i]}</mark>`;
        queryIndex++;
      } else {
        result += text[i];
      }
    }
    
    return result;
  }

  // Get member initials for avatar fallback
  function getInitials(name) {
    if (!name) return "?";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
</script>

{#if open}
  <div 
    class="command-palette-backdrop" 
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    transition:fade={{ duration: 150 }}
    role="dialog"
    aria-modal="true"
    aria-label="Quick search"
  >
    <div class="command-palette" transition:fly={{ y: -20, duration: 200 }}>
      <!-- Search Input -->
      <div class="search-container">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          bind:this={inputEl}
          bind:value={searchQuery}
          type="text"
          placeholder="Search members by name, role, or email..."
          class="search-input"
          on:keydown={handleKeydown}
          autocomplete="off"
          spellcheck="false"
        />
        <kbd class="kbd">ESC</kbd>
      </div>

      <!-- Results -->
      <div class="results-container">
        {#if filteredMembers.length > 0}
          {#each filteredMembers as member, index (member.id)}
            <button
              class="result-item"
              class:selected={index === selectedIndex}
              on:click={() => selectMember(member)}
              on:mouseenter={() => selectedIndex = index}
            >
              <!-- Avatar -->
              <div class="result-avatar">
                {#if member.photoURL}
                  <img src={member.photoURL} alt={member.name} />
                {:else}
                  <div class="avatar-placeholder">
                    {getInitials(member.name)}
                  </div>
                {/if}
              </div>

              <!-- Info -->
              <div class="result-info">
                <div class="result-name">
                  {@html highlightMatch(member.name || "Unnamed", searchQuery)}
                </div>
                {#if member.role}
                  <div class="result-role">
                    {@html highlightMatch(member.role, searchQuery)}
                  </div>
                {/if}
              </div>

              <!-- Badge -->
              {#if index === selectedIndex}
                <div class="result-badge">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              {/if}
            </button>
          {/each}
        {:else if searchQuery.trim()}
          <div class="no-results">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No members found</p>
          </div>
        {:else}
          <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>Start typing to search</p>
          </div>
        {/if}
      </div>

      <!-- Footer hint -->
      <div class="footer-hint">
        <span class="hint-group">
          <kbd class="kbd-small">↑</kbd>
          <kbd class="kbd-small">↓</kbd>
          <span>navigate</span>
        </span>
        <span class="hint-group">
          <kbd class="kbd-small">↵</kbd>
          <span>select</span>
        </span>
        <span class="hint-group">
          <kbd class="kbd-small">ESC</kbd>
          <span>close</span>
        </span>
      </div>
    </div>
  </div>
{/if}

<style>
  .command-palette-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    z-index: 1000;
    animation: backdropFadeIn 0.15s ease-out;
  }

  @keyframes backdropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .command-palette {
    width: 90%;
    max-width: 600px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 70vh;
  }

  /* Search Input */
  .search-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    border-bottom: 1px solid var(--border);
    background: var(--background);
  }

  .search-icon {
    width: 20px;
    height: 20px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: var(--font-size-base);
    color: var(--text-primary);
    padding: 0;
  }

  .search-input::placeholder {
    color: var(--text-secondary);
  }

  .kbd {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 2px 8px;
    font-size: var(--font-size-xs);
    font-family: monospace;
    color: var(--text-secondary);
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  /* Results Container */
  .results-container {
    overflow-y: auto;
    max-height: 400px;
    padding: var(--spacing-2);
  }

  .results-container::-webkit-scrollbar {
    width: 8px;
  }

  .results-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .results-container::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
  }

  .results-container::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
  }

  /* Result Item */
  .result-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3);
    border-radius: var(--radius-md);
    border: none;
    background: transparent;
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .result-item:hover,
  .result-item.selected {
    background: var(--primary);
    color: white;
  }

  .result-item.selected .result-role {
    color: rgba(255, 255, 255, 0.8);
  }

  .result-item.selected .result-badge {
    opacity: 1;
  }

  /* Avatar */
  .result-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .result-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);
  }

  .result-item.selected .avatar-placeholder {
    color: white;
  }

  /* Info */
  .result-info {
    flex: 1;
    min-width: 0;
  }

  .result-name {
    font-weight: 500;
    font-size: var(--font-size-base);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-item.selected .result-name {
    color: white;
  }

  .result-name :global(mark) {
    background: var(--primary);
    color: white;
    padding: 0 2px;
    border-radius: 2px;
    font-weight: 600;
  }

  .result-item.selected .result-name :global(mark) {
    background: rgba(255, 255, 255, 0.3);
    color: white;
  }

  .result-role {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  }

  .result-role :global(mark) {
    background: var(--primary);
    color: white;
    padding: 0 2px;
    border-radius: 2px;
    font-weight: 500;
  }

  .result-item.selected .result-role :global(mark) {
    background: rgba(255, 255, 255, 0.3);
  }

  /* Badge */
  .result-badge {
    opacity: 0;
    transition: opacity 0.15s ease;
    color: white;
    display: flex;
    align-items: center;
  }

  /* Empty States */
  .no-results,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-8);
    text-align: center;
    color: var(--text-secondary);
  }

  .no-results svg,
  .empty-state svg {
    margin-bottom: var(--spacing-3);
    opacity: 0.5;
  }

  .no-results p,
  .empty-state p {
    font-size: var(--font-size-sm);
    margin: 0;
  }

  /* Footer Hint */
  .footer-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-4);
    padding: var(--spacing-3);
    border-top: 1px solid var(--border);
    background: var(--background);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .hint-group {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .kbd-small {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 1px 6px;
    font-size: 10px;
    font-family: monospace;
    color: var(--text-secondary);
    font-weight: 500;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
    min-width: 20px;
    text-align: center;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .command-palette-backdrop {
      padding-top: 10vh;
    }

    .command-palette {
      width: 95%;
      max-height: 80vh;
    }

    .footer-hint {
      display: none;
    }
  }
</style>
