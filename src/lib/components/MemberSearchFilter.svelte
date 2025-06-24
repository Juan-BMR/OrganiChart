<script>
  import { createEventDispatcher } from 'svelte';
  import { onMount, onDestroy } from 'svelte';

  const dispatch = createEventDispatcher();

  // Props
  export let members = [];
  export let isVisible = false;

  // Search and filter state
  let searchQuery = '';
  let selectedDepartment = '';
  let selectedRole = '';
  let selectedManager = '';
  let showFilters = false;

  // Derived data
  let filteredMembers = [];
  let departments = [];
  let roles = [];
  let managers = [];

  // Search input element
  let searchInput;

  // Focus search when component becomes visible
  $: if (isVisible && searchInput) {
    setTimeout(() => searchInput.focus(), 100);
  }

  // Update derived data when members change
  $: {
    updateDerivedData();
    filterMembers();
  }

  // Filter members when search/filter criteria change
  $: {
    searchQuery, selectedDepartment, selectedRole, selectedManager;
    filterMembers();
  }

  function updateDerivedData() {
    // Extract unique departments
    departments = [...new Set(members
      .map(m => m.department)
      .filter(Boolean)
    )].sort();

    // Extract unique roles
    roles = [...new Set(members
      .map(m => m.role)
      .filter(Boolean)
    )].sort();

    // Extract managers (members who have direct reports)
    const managerIds = new Set(members
      .map(m => m.managerId)
      .filter(Boolean)
    );
    
    managers = members
      .filter(m => managerIds.has(m.id))
      .map(m => ({ id: m.id, name: m.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function filterMembers() {
    filteredMembers = members.filter(member => {
      // Text search across multiple fields
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        member.name.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        (member.role && member.role.toLowerCase().includes(searchLower)) ||
        (member.department && member.department.toLowerCase().includes(searchLower));

      // Department filter
      const matchesDepartment = !selectedDepartment || 
        member.department === selectedDepartment;

      // Role filter
      const matchesRole = !selectedRole || 
        member.role === selectedRole;

      // Manager filter
      const matchesManager = !selectedManager || 
        member.managerId === selectedManager;

      return matchesSearch && matchesDepartment && matchesRole && matchesManager;
    });

    // Dispatch filtered results
    dispatch('filter', {
      members: filteredMembers,
      query: searchQuery,
      filters: {
        department: selectedDepartment,
        role: selectedRole,
        manager: selectedManager
      }
    });
  }

  function clearSearch() {
    searchQuery = '';
    selectedDepartment = '';
    selectedRole = '';
    selectedManager = '';
    showFilters = false;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      clearSearch();
      dispatch('close');
    }
  }

  function highlightMember(memberId) {
    dispatch('highlight', { memberId });
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if isVisible}
  <div class="search-filter-container">
    <div class="search-header">
      <div class="search-input-container">
        <div class="search-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          bind:this={searchInput}
          bind:value={searchQuery}
          type="text"
          placeholder="Search members by name, email, role, or department..."
          class="search-input"
        />
        {#if searchQuery || selectedDepartment || selectedRole || selectedManager}
          <button class="clear-button" on:click={clearSearch}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}
      </div>

      <div class="search-actions">
        <button 
          class="filter-toggle {showFilters ? 'active' : ''}"
          on:click={() => showFilters = !showFilters}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
          </svg>
          Filters
        </button>
        
        <button class="close-button" on:click={() => dispatch('close')}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    {#if showFilters}
      <div class="filters-container">
        <div class="filter-row">
          <div class="filter-group">
            <label for="department-filter">Department</label>
            <select id="department-filter" bind:value={selectedDepartment}>
              <option value="">All Departments</option>
              {#each departments as dept}
                <option value={dept}>{dept}</option>
              {/each}
            </select>
          </div>

          <div class="filter-group">
            <label for="role-filter">Role</label>
            <select id="role-filter" bind:value={selectedRole}>
              <option value="">All Roles</option>
              {#each roles as role}
                <option value={role}>{role}</option>
              {/each}
            </select>
          </div>

          <div class="filter-group">
            <label for="manager-filter">Manager</label>
            <select id="manager-filter" bind:value={selectedManager}>
              <option value="">All Managers</option>
              {#each managers as manager}
                <option value={manager.id}>{manager.name}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>
    {/if}

    <div class="search-results">
      <div class="results-header">
        <span class="results-count">
          {filteredMembers.length} of {members.length} members
        </span>
      </div>

      <div class="results-list">
        {#each filteredMembers as member}
          <div 
            class="result-item"
            on:click={() => highlightMember(member.id)}
          >
            <div class="member-avatar">
              {#if member.photoURL}
                <img src={member.photoURL} alt={member.name} />
              {:else}
                <div class="avatar-placeholder">
                  {member.name.charAt(0).toUpperCase()}
                </div>
              {/if}
            </div>
            
            <div class="member-info">
              <div class="member-name">{member.name}</div>
              <div class="member-role">{member.role || 'No role specified'}</div>
              <div class="member-email">{member.email}</div>
              {#if member.department}
                <div class="member-department">{member.department}</div>
              {/if}
            </div>
          </div>
        {/each}

        {#if filteredMembers.length === 0}
          <div class="no-results">
            <div class="no-results-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
              </svg>
            </div>
            <p>No members match your search criteria</p>
            <button class="clear-filters-btn" on:click={clearSearch}>
              Clear all filters
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .search-filter-container {
    position: absolute;
    top: var(--spacing-4);
    right: var(--spacing-4);
    width: 400px;
    max-height: 80vh;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .search-header {
    padding: var(--spacing-4);
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .search-input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: var(--spacing-3);
    color: var(--text-secondary);
    pointer-events: none;
  }

  .search-icon svg {
    width: 20px;
    height: 20px;
  }

  .search-input {
    width: 100%;
    padding: var(--spacing-3) var(--spacing-10) var(--spacing-3) var(--spacing-10);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background: var(--surface);
    color: var(--text-primary);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-light);
  }

  .clear-button {
    position: absolute;
    right: var(--spacing-3);
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-1);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-button:hover {
    background: var(--surface);
    color: var(--text-primary);
  }

  .clear-button svg {
    width: 16px;
    height: 16px;
  }

  .search-actions {
    display: flex;
    gap: var(--spacing-2);
  }

  .filter-toggle {
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
    transition: all 0.2s ease;
  }

  .filter-toggle:hover,
  .filter-toggle.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  .filter-toggle svg {
    width: 16px;
    height: 16px;
  }

  .close-button {
    padding: var(--spacing-2);
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    background: var(--surface);
    color: var(--text-primary);
  }

  .close-button svg {
    width: 16px;
    height: 16px;
  }

  .filters-container {
    padding: var(--spacing-4);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  .filter-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--spacing-3);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .filter-group label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-weight: 500;
  }

  .filter-group select {
    padding: var(--spacing-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--background);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .filter-group select:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary-light);
  }

  .search-results {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .results-header {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  .results-count {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-weight: 500;
  }

  .results-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-2);
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .result-item:hover {
    background: var(--surface);
  }

  .member-avatar {
    flex-shrink: 0;
  }

  .member-avatar img {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 40px;
    height: 40px;
    background: var(--primary);
    color: white;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: var(--font-size-sm);
  }

  .member-info {
    flex: 1;
    min-width: 0;
  }

  .member-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    margin-bottom: var(--spacing-1);
  }

  .member-role {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    margin-bottom: var(--spacing-1);
  }

  .member-email {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-family: monospace;
  }

  .member-department {
    color: var(--primary);
    font-size: var(--font-size-xs);
    font-weight: 500;
    margin-top: var(--spacing-1);
  }

  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-8);
    text-align: center;
  }

  .no-results-icon {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-4);
  }

  .no-results-icon svg {
    width: 48px;
    height: 48px;
  }

  .no-results p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-4);
  }

  .clear-filters-btn {
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: background-color 0.2s ease;
  }

  .clear-filters-btn:hover {
    background: var(--primary-dark);
  }

  @media (max-width: 768px) {
    .search-filter-container {
      position: fixed;
      top: 0;
      right: 0;
      left: 0;
      bottom: 0;
      width: auto;
      max-height: none;
      border-radius: 0;
    }

    .filter-row {
      grid-template-columns: 1fr;
    }
  }
</style>