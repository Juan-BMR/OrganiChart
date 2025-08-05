<script>
  import { createEventDispatcher } from 'svelte';
  
  export let extractedData = {
    summary: '',
    skills: {
      technical: [],
      soft: [],
      languages: []
    },
    experience: [],
    education: [],
    certifications: [],
    achievements: []
  };
  export let editable = false;
  export let loading = false;
  
  const dispatch = createEventDispatcher();
  
  let editMode = false;
  let editedData = JSON.parse(JSON.stringify(extractedData));
  
  function toggleEditMode() {
    if (editMode) {
      // Save changes
      dispatch('save', editedData);
      extractedData = JSON.parse(JSON.stringify(editedData));
    } else {
      // Enter edit mode
      editedData = JSON.parse(JSON.stringify(extractedData));
    }
    editMode = !editMode;
  }
  
  function cancelEdit() {
    editedData = JSON.parse(JSON.stringify(extractedData));
    editMode = false;
  }
  
  function addSkill(category) {
    const skill = prompt(`Add ${category} skill:`);
    if (skill) {
      editedData.skills[category] = [...editedData.skills[category], skill];
    }
  }
  
  function removeSkill(category, index) {
    editedData.skills[category] = editedData.skills[category].filter((_, i) => i !== index);
  }
  
  function addExperience() {
    editedData.experience = [...editedData.experience, {
      title: 'New Position',
      company: 'Company Name',
      duration: 'Start - End',
      description: 'Description'
    }];
  }
  
  function removeExperience(index) {
    editedData.experience = editedData.experience.filter((_, i) => i !== index);
  }
</script>

<div class="cv-extracted-info">
  <div class="header">
    <h3>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
      Extracted Information
    </h3>
    {#if editable}
      <div class="actions">
        {#if editMode}
          <button class="btn-sm btn-primary" on:click={toggleEditMode}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Save
          </button>
          <button class="btn-sm btn-secondary" on:click={cancelEdit}>Cancel</button>
        {:else}
          <button class="btn-sm btn-secondary" on:click={toggleEditMode}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
        {/if}
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Analyzing CV content...</p>
    </div>
  {:else if extractedData.summary || editMode}
    <div class="content">
      <!-- Summary Section -->
      <div class="section">
        <h4>Professional Summary</h4>
        {#if editMode}
          <textarea 
            bind:value={editedData.summary} 
            rows="3"
            placeholder="Enter professional summary..."
          />
        {:else}
          <p class="summary">{extractedData.summary || 'No summary available'}</p>
        {/if}
      </div>

      <!-- Skills Section -->
      <div class="section">
        <h4>Skills</h4>
        <div class="skills-grid">
          <!-- Technical Skills -->
          <div class="skill-category">
            <h5>Technical Skills</h5>
            <div class="skill-tags">
              {#each editMode ? editedData.skills.technical : extractedData.skills.technical as skill, i}
                <span class="skill-tag">
                  {skill}
                  {#if editMode}
                    <button class="remove-btn" on:click={() => removeSkill('technical', i)}>×</button>
                  {/if}
                </span>
              {/each}
              {#if editMode}
                <button class="add-skill-btn" on:click={() => addSkill('technical')}>+ Add</button>
              {/if}
            </div>
          </div>

          <!-- Soft Skills -->
          <div class="skill-category">
            <h5>Soft Skills</h5>
            <div class="skill-tags">
              {#each editMode ? editedData.skills.soft : extractedData.skills.soft as skill, i}
                <span class="skill-tag">
                  {skill}
                  {#if editMode}
                    <button class="remove-btn" on:click={() => removeSkill('soft', i)}>×</button>
                  {/if}
                </span>
              {/each}
              {#if editMode}
                <button class="add-skill-btn" on:click={() => addSkill('soft')}>+ Add</button>
              {/if}
            </div>
          </div>

          <!-- Languages -->
          <div class="skill-category">
            <h5>Languages</h5>
            <div class="skill-tags">
              {#each editMode ? editedData.skills.languages : extractedData.skills.languages as language, i}
                <span class="skill-tag">
                  {language}
                  {#if editMode}
                    <button class="remove-btn" on:click={() => removeSkill('languages', i)}>×</button>
                  {/if}
                </span>
              {/each}
              {#if editMode}
                <button class="add-skill-btn" on:click={() => addSkill('languages')}>+ Add</button>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Experience Section -->
      <div class="section">
        <h4>Experience</h4>
        <div class="experience-list">
          {#each editMode ? editedData.experience : extractedData.experience as exp, i}
            <div class="experience-item">
              {#if editMode}
                <div class="edit-experience">
                  <input type="text" bind:value={exp.title} placeholder="Job Title" />
                  <input type="text" bind:value={exp.company} placeholder="Company" />
                  <input type="text" bind:value={exp.duration} placeholder="Duration" />
                  <textarea bind:value={exp.description} rows="2" placeholder="Description" />
                  <button class="remove-btn" on:click={() => removeExperience(i)}>Remove</button>
                </div>
              {:else}
                <h5>{exp.title} at {exp.company}</h5>
                <span class="duration">{exp.duration}</span>
                <p>{exp.description}</p>
              {/if}
            </div>
          {/each}
          {#if editMode}
            <button class="add-btn" on:click={addExperience}>+ Add Experience</button>
          {/if}
        </div>
      </div>

      <!-- Education Section -->
      <div class="section">
        <h4>Education</h4>
        <div class="education-list">
          {#each extractedData.education as edu}
            <div class="education-item">
              <h5>{edu.degree} in {edu.field}</h5>
              <span>{edu.institution}, {edu.year}</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Certifications Section -->
      {#if extractedData.certifications.length > 0}
        <div class="section">
          <h4>Certifications</h4>
          <div class="cert-list">
            {#each extractedData.certifications as cert}
              <div class="cert-item">
                <span class="cert-name">{cert.name}</span>
                <span class="cert-details">{cert.issuer}, {cert.year}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Achievements Section -->
      {#if extractedData.achievements.length > 0}
        <div class="section">
          <h4>Key Achievements</h4>
          <ul class="achievements">
            {#each extractedData.achievements as achievement}
              <li>{achievement}</li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {:else}
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <path d="M13 3v5a1 1 0 001 1h5" />
      </svg>
      <p>No CV data extracted yet</p>
      <p class="hint">Upload a CV to automatically extract information</p>
    </div>
  {/if}
</div>

<style>
  .cv-extracted-info {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4);
    border-bottom: 1px solid var(--border);
    background: var(--background);
  }

  .header h3 {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin: 0;
    color: var(--text-primary);
    font-size: var(--font-size-lg);
  }

  .header svg {
    color: var(--success);
  }

  .actions {
    display: flex;
    gap: var(--spacing-2);
  }

  .btn-sm {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
  }

  .btn-secondary {
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .btn-secondary:hover {
    background: var(--background);
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-8);
    gap: var(--spacing-4);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .content {
    padding: var(--spacing-4);
  }

  .section {
    margin-bottom: var(--spacing-6);
  }

  .section:last-child {
    margin-bottom: 0;
  }

  .section h4 {
    color: var(--text-primary);
    font-size: var(--font-size-base);
    font-weight: 600;
    margin-bottom: var(--spacing-3);
  }

  .summary {
    color: var(--text-secondary);
    line-height: 1.6;
  }

  textarea {
    width: 100%;
    padding: var(--spacing-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--background);
    color: var(--text-primary);
    font-family: inherit;
    resize: vertical;
  }

  .skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-4);
  }

  .skill-category h5 {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
    margin-bottom: var(--spacing-2);
  }

  .skill-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2);
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

  .remove-btn {
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

  .remove-btn:hover {
    opacity: 1;
  }

  .add-skill-btn, .add-btn {
    background: transparent;
    border: 1px dashed var(--border);
    color: var(--text-secondary);
    padding: var(--spacing-1) var(--spacing-3);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .add-skill-btn:hover, .add-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  .experience-list, .education-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .experience-item, .education-item {
    padding: var(--spacing-3);
    background: var(--background);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
  }

  .experience-item h5, .education-item h5 {
    color: var(--text-primary);
    font-size: var(--font-size-base);
    margin: 0 0 var(--spacing-1) 0;
  }

  .duration {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .experience-item p {
    margin-top: var(--spacing-2);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .edit-experience {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .edit-experience input {
    padding: var(--spacing-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text-primary);
  }

  .cert-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .cert-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-2);
    background: var(--background);
    border-radius: var(--radius-sm);
  }

  .cert-name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .cert-details {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .achievements {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .achievements li {
    position: relative;
    padding-left: var(--spacing-6);
    margin-bottom: var(--spacing-2);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .achievements li::before {
    content: "✓";
    position: absolute;
    left: 0;
    color: var(--success);
    font-weight: bold;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-8);
    text-align: center;
    color: var(--text-secondary);
  }

  .empty-state svg {
    margin-bottom: var(--spacing-4);
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