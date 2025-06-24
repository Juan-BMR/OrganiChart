<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  // Props
  export let memberCount = 0;
  export let canAddMember = true;
  export let canExportPDF = true;
  export let canManageRules = true;
  export let isSearchVisible = false;

  function handleSearchToggle() {
    dispatch('toggleSearch');
  }

  function handleAddMember() {
    dispatch('addMember');
  }

  function handleExportPDF() {
    dispatch('exportPDF');
  }

  function handleManageRules() {
    dispatch('manageRules');
  }

  function handleResetView() {
    dispatch('resetView');
  }

  function handleFitToScreen() {
    dispatch('fitToScreen');
  }
</script>

<div class="chart-toolbar">
  <div class="toolbar-section">
    <div class="member-count">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
      <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
    </div>
  </div>

  <div class="toolbar-section">
    <div class="view-controls">
      <button 
        class="toolbar-btn"
        on:click={handleFitToScreen}
        title="Fit to screen"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
        <span>Fit to Screen</span>
      </button>

      <button 
        class="toolbar-btn"
        on:click={handleResetView}
        title="Reset view"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Reset View</span>
      </button>
    </div>
  </div>

  <div class="toolbar-section">
    <div class="action-controls">
      <button 
        class="toolbar-btn search-btn {isSearchVisible ? 'active' : ''}"
        on:click={handleSearchToggle}
        title="Search members"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Search</span>
      </button>

      {#if canAddMember}
        <button 
          class="toolbar-btn primary-btn"
          on:click={handleAddMember}
          title="Add new member"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Member</span>
        </button>
      {/if}

      {#if canExportPDF}
        <button 
          class="toolbar-btn"
          on:click={handleExportPDF}
          title="Export as PDF"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export PDF</span>
        </button>
      {/if}

      {#if canManageRules}
        <button 
          class="toolbar-btn"
          on:click={handleManageRules}
          title="Manage chart rules"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Rules</span>
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .chart-toolbar {
    position: absolute;
    top: var(--spacing-4);
    left: var(--spacing-4);
    right: var(--spacing-4);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-3) var(--spacing-4);
    box-shadow: var(--shadow-sm);
    z-index: 100;
    backdrop-filter: blur(8px);
    background: rgba(255, 255, 255, 0.95);
  }

  .toolbar-section {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
  }

  .member-count {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .member-count svg {
    width: 18px;
    height: 18px;
  }

  .view-controls,
  .action-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .toolbar-btn:hover {
    background: var(--background);
    color: var(--text-primary);
    border-color: var(--primary-light);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .toolbar-btn.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  .toolbar-btn.primary-btn {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  .toolbar-btn.primary-btn:hover {
    background: var(--primary-dark);
    border-color: var(--primary-dark);
    color: white;
  }

  .toolbar-btn svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .toolbar-btn span {
    display: block;
  }

  /* Responsive design */
  @media (max-width: 1024px) {
    .chart-toolbar {
      flex-direction: column;
      gap: var(--spacing-3);
      align-items: stretch;
    }

    .toolbar-section {
      justify-content: center;
    }

    .toolbar-section:first-child {
      order: 3;
    }

    .toolbar-section:nth-child(2) {
      order: 1;
    }

    .toolbar-section:last-child {
      order: 2;
    }
  }

  @media (max-width: 768px) {
    .chart-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      border-radius: 0;
      border-left: none;
      border-right: none;
      border-top: none;
    }

    .toolbar-btn span {
      display: none;
    }

    .toolbar-btn {
      padding: var(--spacing-2);
      min-width: 40px;
      justify-content: center;
    }

    .view-controls,
    .action-controls {
      gap: var(--spacing-1);
    }

    .member-count span {
      display: none;
    }
  }

  @media (max-width: 480px) {
    .chart-toolbar {
      padding: var(--spacing-2);
    }

    .toolbar-section {
      gap: var(--spacing-2);
    }

    .view-controls,
    .action-controls {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
</style>