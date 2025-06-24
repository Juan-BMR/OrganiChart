<script>
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  
  export let members = [];
  export let placeholder = "Search by name, email, or role...";
  
  const dispatch = createEventDispatcher();
  
  let searchQuery = '';
  let searchResults = [];
  let showResults = false;
  let selectedFilters = {
    role: '',
    department: ''
  };
  
  // Extract unique roles and departments
  $: uniqueRoles = [...new Set(members.map(m => m.role).filter(Boolean))];
  $: uniqueDepartments = [...new Set(members.map(m => m.department).filter(Boolean))];
  
  function searchMembers() {
    if (!searchQuery.trim() && !selectedFilters.role && !selectedFilters.department) {
      searchResults = [];
      showResults = false;
      dispatch('search', { results: [], query: '', filters: selectedFilters });
      return;
    }
    
    searchResults = members.filter(member => {
      // Text search
      const matchesSearch = !searchQuery.trim() || 
        member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter matches
      const matchesRole = !selectedFilters.role || member.role === selectedFilters.role;
      const matchesDepartment = !selectedFilters.department || member.department === selectedFilters.department;
      
      return matchesSearch && matchesRole && matchesDepartment;
    });
    
    showResults = true;
    dispatch('search', { results: searchResults, query: searchQuery, filters: selectedFilters });
  }
  
  function clearSearch() {
    searchQuery = '';
    selectedFilters = { role: '', department: '' };
    searchResults = [];
    showResults = false;
    dispatch('clear');
  }
  
  function selectMember(member) {
    dispatch('select', member);
  }
  
  function exportResults() {
    dispatch('export', searchResults);
  }
</script>

<div class="member-search">
  <div class="search-controls">
    <div class="search-input-wrapper">
      <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M9 17A8 8 0 109 1a8 8 0 000 16zM19 19l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <input
        type="text"
        bind:value={searchQuery}
        on:input={searchMembers}
        {placeholder}
        class="search-input"
      />
      {#if searchQuery || selectedFilters.role || selectedFilters.department}
        <button class="clear-btn" on:click={clearSearch} transition:fade={{ duration: 200 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      {/if}
    </div>
    
    <div class="filters">
      {#if uniqueRoles.length > 0}
        <select bind:value={selectedFilters.role} on:change={searchMembers} class="filter-select">
          <option value="">All Roles</option>
          {#each uniqueRoles as role}
            <option value={role}>{role}</option>
          {/each}
        </select>
      {/if}
      
      {#if uniqueDepartments.length > 0}
        <select bind:value={selectedFilters.department} on:change={searchMembers} class="filter-select">
          <option value="">All Departments</option>
          {#each uniqueDepartments as dept}
            <option value={dept}>{dept}</option>
          {/each}
        </select>
      {/if}
    </div>
  </div>
  
  {#if showResults}
    <div class="search-results" transition:fade={{ duration: 200 }}>
      <div class="results-header">
        <span class="results-count">
          {searchResults.length} {searchResults.length === 1 ? 'member' : 'members'} found
        </span>
        {#if searchResults.length > 0}
          <button class="export-btn" on:click={exportResults}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 12V3m0 0L5 6m3-3l3 3M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Export
          </button>
        {/if}
      </div>
      
      {#if searchResults.length > 0}
        <div class="results-list">
          {#each searchResults as member}
            <button class="member-result" on:click={() => selectMember(member)}>
              <div class="member-avatar">
                {#if member.photoURL}
                  <img src={member.photoURL} alt={member.name} />
                {:else}
                  <div class="avatar-placeholder">
                    {member.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                {/if}
              </div>
              <div class="member-info">
                <div class="member-name">{member.name}</div>
                <div class="member-details">
                  {member.role || 'No role'} • {member.email}
                </div>
              </div>
            </button>
          {/each}
        </div>
      {:else}
        <div class="no-results">
          No members found matching your search criteria.
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .member-search {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }
  
  .search-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .search-icon {
    position: absolute;
    left: 1rem;
    color: #6b7280;
    pointer-events: none;
  }
  
  .search-input {
    width: 100%;
    padding: 0.75rem 3rem 0.75rem 3rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: all 0.2s;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .clear-btn {
    position: absolute;
    right: 1rem;
    padding: 0.25rem;
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    transition: color 0.2s;
  }
  
  .clear-btn:hover {
    color: #374151;
  }
  
  .filters {
    display: flex;
    gap: 0.75rem;
  }
  
  .filter-select {
    flex: 1;
    padding: 0.5rem 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background-color: white;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .filter-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .search-results {
    margin-top: 1.5rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
  }
  
  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    background-color: #f9fafb;
  }
  
  .results-count {
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  .export-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background-color: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .export-btn:hover {
    background-color: #f3f4f6;
  }
  
  .results-list {
    max-height: 400px;
    overflow-y: auto;
  }
  
  .member-result {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    padding: 1rem;
    background: none;
    border: none;
    border-bottom: 1px solid #f3f4f6;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .member-result:hover {
    background-color: #f9fafb;
  }
  
  .member-result:last-child {
    border-bottom: none;
  }
  
  .member-avatar {
    flex-shrink: 0;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    overflow: hidden;
  }
  
  .member-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #3b82f6;
    color: white;
    font-weight: 600;
    font-size: 1.125rem;
  }
  
  .member-info {
    flex: 1;
    min-width: 0;
  }
  
  .member-name {
    font-weight: 600;
    color: #111827;
    margin-bottom: 0.125rem;
  }
  
  .member-details {
    font-size: 0.875rem;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .no-results {
    padding: 3rem;
    text-align: center;
    color: #6b7280;
  }
</style>