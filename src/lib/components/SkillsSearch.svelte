<script>
  import { createEventDispatcher } from 'svelte';
  import { membersStore } from '$lib/stores/members';
  
  export let organizationId;
  
  const dispatch = createEventDispatcher();
  
  let searchQuery = '';
  let selectedSkills = [];
  let allSkills = [];
  let filteredSkills = [];
  let showDropdown = false;
  let skillInput;
  
  // Extract all unique skills from members
  $: if ($membersStore.members) {
    const skillsSet = new Set();
    $membersStore.members.forEach(member => {
      if (member.cvExtractedData?.skills) {
        member.cvExtractedData.skills.technical?.forEach(skill => skillsSet.add(skill));
        member.cvExtractedData.skills.soft?.forEach(skill => skillsSet.add(skill));
        member.cvExtractedData.skills.languages?.forEach(skill => skillsSet.add(skill));
      }
    });
    allSkills = Array.from(skillsSet).sort();
  }
  
  // Filter skills based on search query
  $: filteredSkills = searchQuery
    ? allSkills.filter(skill => 
        skill.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !selectedSkills.includes(skill)
      )
    : [];
  
  // Find members with selected skills
  $: filteredMembers = selectedSkills.length > 0
    ? $membersStore.members.filter(member => {
        if (!member.cvExtractedData?.skills) return false;
        const memberSkills = [
          ...(member.cvExtractedData.skills.technical || []),
          ...(member.cvExtractedData.skills.soft || []),
          ...(member.cvExtractedData.skills.languages || [])
        ];
        return selectedSkills.some(skill => memberSkills.includes(skill));
      })
    : [];
  
  function addSkill(skill) {
    if (!selectedSkills.includes(skill)) {
      selectedSkills = [...selectedSkills, skill];
      dispatch('filterChange', { skills: selectedSkills, members: filteredMembers });
    }
    searchQuery = '';
    showDropdown = false;
    skillInput?.focus();
  }
  
  function removeSkill(skill) {
    selectedSkills = selectedSkills.filter(s => s !== skill);
    dispatch('filterChange', { skills: selectedSkills, members: filteredMembers });
  }
  
  function clearAll() {
    selectedSkills = [];
    searchQuery = '';
    dispatch('filterChange', { skills: [], members: [] });
  }
  
  function handleKeyDown(event) {
    if (event.key === 'Enter' && filteredSkills.length > 0) {
      event.preventDefault();
      addSkill(filteredSkills[0]);
    } else if (event.key === 'Escape') {
      showDropdown = false;
      searchQuery = '';
    }
  }
  
  function handleBlur() {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      showDropdown = false;
    }, 200);
  }
</script>

<div class="skills-search">
  <div class="search-header">
    <h3>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      Search by Skills
    </h3>
    {#if selectedSkills.length > 0}
      <button class="clear-all-btn" on:click={clearAll}>
        Clear all
      </button>
    {/if}
  </div>
  
  <div class="search-input-wrapper">
    <input
      type="text"
      bind:value={searchQuery}
      bind:this={skillInput}
      on:focus={() => showDropdown = true}
      on:blur={handleBlur}
      on:keydown={handleKeyDown}
      placeholder="Search for skills..."
      class="search-input"
    />
    
    {#if showDropdown && filteredSkills.length > 0}
      <div class="skills-dropdown">
        {#each filteredSkills.slice(0, 10) as skill}
          <button
            class="skill-option"
            on:click={() => addSkill(skill)}
            type="button"
          >
            {skill}
          </button>
        {/each}
      </div>
    {/if}
  </div>
  
  {#if selectedSkills.length > 0}
    <div class="selected-skills">
      {#each selectedSkills as skill}
        <span class="skill-tag">
          {skill}
          <button
            class="remove-skill-btn"
            on:click={() => removeSkill(skill)}
            aria-label="Remove {skill}"
          >
            ×
          </button>
        </span>
      {/each}
    </div>
    
    <div class="results-summary">
      Found <strong>{filteredMembers.length}</strong> member{filteredMembers.length !== 1 ? 's' : ''} with these skills
    </div>
  {/if}
  
  {#if allSkills.length === 0}
    <div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
      <p>No skills data available yet</p>
      <p class="hint">Upload and parse CVs to enable skills search</p>
    </div>
  {/if}
</div>

<style>
  .skills-search {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-4);
    margin-bottom: var(--spacing-4);
  }
  
  .search-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-3);
  }
  
  .search-header h3 {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin: 0;
    font-size: var(--font-size-base);
    color: var(--text-primary);
  }
  
  .clear-all-btn {
    background: none;
    border: none;
    color: var(--primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-sm);
    transition: background 0.2s;
  }
  
  .clear-all-btn:hover {
    background: var(--primary-light, rgba(99, 102, 241, 0.1));
  }
  
  .search-input-wrapper {
    position: relative;
  }
  
  .search-input {
    width: 100%;
    padding: var(--spacing-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--background);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    transition: border-color 0.2s;
  }
  
  .search-input:focus {
    outline: none;
    border-color: var(--primary);
  }
  
  .skills-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: var(--spacing-1);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    max-height: 300px;
    overflow-y: auto;
    z-index: 100;
  }
  
  .skill-option {
    display: block;
    width: 100%;
    padding: var(--spacing-2) var(--spacing-3);
    text-align: left;
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .skill-option:hover {
    background: var(--background);
  }
  
  .selected-skills {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2);
    margin-top: var(--spacing-3);
  }
  
  .skill-tag {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-1) var(--spacing-3);
    background: var(--primary-light, rgba(99, 102, 241, 0.1));
    color: var(--primary);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
  }
  
  .remove-skill-btn {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    margin-left: var(--spacing-1);
    font-size: 18px;
    line-height: 1;
    opacity: 0.7;
  }
  
  .remove-skill-btn:hover {
    opacity: 1;
  }
  
  .results-summary {
    margin-top: var(--spacing-3);
    padding-top: var(--spacing-3);
    border-top: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }
  
  .results-summary strong {
    color: var(--text-primary);
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-6);
    text-align: center;
    color: var(--text-secondary);
  }
  
  .empty-state svg {
    margin-bottom: var(--spacing-3);
    opacity: 0.3;
  }
  
  .empty-state p {
    margin: 0;
  }
  
  .hint {
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-2);
    opacity: 0.7;
  }
</style>