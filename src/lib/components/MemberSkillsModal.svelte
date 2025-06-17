<script>
  import { createEventDispatcher } from "svelte";
  import { organizationalDNAStore } from "$lib/stores/organizationalDNA.js";
  import { membersStore } from "$lib/stores/members.js";
  import { fade, scale } from "svelte/transition";

  export let member = null;
  export let organizationId = null;

  const dispatch = createEventDispatcher();

  let isVisible = true;
  let loading = false;
  let error = null;

  // Local form state
  let skills = member?.skills ? [...member.skills] : [];
  let expertise = member?.expertise ? [...member.expertise] : [];
  let interests = member?.interests ? [...member.interests] : [];
  let bio = member?.bio || '';
  let personalityType = member?.personalityType || '';
  let workingStyle = member?.workingStyle ? [...member.workingStyle] : [];

  // New skill/expertise/interest forms
  let newSkill = { name: '', category: 'technical', level: 3 };
  let newExpertise = '';
  let newInterest = '';
  let newWorkingStyle = '';

  // Available skill categories
  const skillCategories = [
    { value: 'technical', label: '🔧 Technical' },
    { value: 'soft', label: '🤝 Soft Skills' },
    { value: 'domain', label: '🏢 Domain Knowledge' },
    { value: 'leadership', label: '👑 Leadership' }
  ];

  // Working style options
  const workingStyleOptions = [
    'Remote-first', 'Office-first', 'Flexible', 'Early bird', 'Night owl',
    'Deep work', 'Collaborative', 'Independent', 'Visual learner', 'Detail-oriented',
    'Big picture', 'Data-driven', 'Creative', 'Analytical', 'Mentoring-focused'
  ];

  function addSkill() {
    if (newSkill.name.trim()) {
      skills = [...skills, { ...newSkill, name: newSkill.name.trim() }];
      newSkill = { name: '', category: 'technical', level: 3 };
    }
  }

  function removeSkill(index) {
    skills = skills.filter((_, i) => i !== index);
  }

  function addExpertise() {
    if (newExpertise.trim() && !expertise.includes(newExpertise.trim())) {
      expertise = [...expertise, newExpertise.trim()];
      newExpertise = '';
    }
  }

  function removeExpertise(index) {
    expertise = expertise.filter((_, i) => i !== index);
  }

  function addInterest() {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      interests = [...interests, newInterest.trim()];
      newInterest = '';
    }
  }

  function removeInterest(index) {
    interests = interests.filter((_, i) => i !== index);
  }

  function addWorkingStyle(style) {
    if (!workingStyle.includes(style)) {
      workingStyle = [...workingStyle, style];
    }
  }

  function removeWorkingStyle(index) {
    workingStyle = workingStyle.filter((_, i) => i !== index);
  }

  async function handleSave() {
    if (!member || !organizationId) return;

    loading = true;
    error = null;

    try {
      const updates = {
        skills,
        expertise,
        interests,
        bio: bio.trim(),
        personalityType: personalityType.trim() || null,
        workingStyle,
        organizationId, // Required for photo operations
      };

      await membersStore.updateMember(member.id, updates);
      
      dispatch('success', { message: 'Skills and profile updated successfully!' });
      close();
    } catch (err) {
      console.error('Failed to update member skills:', err);
      error = err.message || 'Failed to update member skills';
    } finally {
      loading = false;
    }
  }

  function close() {
    isVisible = false;
    setTimeout(() => dispatch('close'), 200);
  }

  function handleKeyPress(event, action) {
    if (event.key === 'Enter') {
      event.preventDefault();
      action();
    }
  }
</script>

{#if isVisible}
  <div class="modal-backdrop" transition:fade={{ duration: 200 }} on:click={close}>
    <div class="modal-container" transition:scale={{ duration: 300 }} on:click|stopPropagation>
      <div class="modal-header">
        <h2>🧬 {member?.name}'s Organizational DNA</h2>
        <button class="close-btn" on:click={close}>&times;</button>
      </div>

      <div class="modal-content">
        {#if error}
          <div class="error-message">
            <span>⚠️ {error}</span>
          </div>
        {/if}

        <!-- Skills Section -->
        <div class="section">
          <h3>🎯 Skills & Competencies</h3>
          
          <div class="add-item-form">
            <input
              type="text"
              placeholder="Skill name"
              bind:value={newSkill.name}
              on:keypress={(e) => handleKeyPress(e, addSkill)}
            />
            <select bind:value={newSkill.category}>
              {#each skillCategories as category}
                <option value={category.value}>{category.label}</option>
              {/each}
            </select>
            <div class="level-input">
              <label>Level: {newSkill.level}</label>
              <input type="range" min="1" max="5" bind:value={newSkill.level} />
            </div>
            <button class="add-btn" on:click={addSkill}>Add</button>
          </div>

          <div class="items-list">
            {#each skills as skill, index}
              <div class="skill-item">
                <span class="skill-name">{skill.name}</span>
                <span class="skill-category {skill.category}">{skillCategories.find(c => c.value === skill.category)?.label || skill.category}</span>
                <div class="skill-level">
                  {'★'.repeat(skill.level)}{'☆'.repeat(5 - skill.level)}
                </div>
                <button class="remove-btn" on:click={() => removeSkill(index)}>×</button>
              </div>
            {/each}
          </div>
        </div>

        <!-- Expertise Section -->
        <div class="section">
          <h3>🏆 Known Expertise</h3>
          <p class="section-desc">Areas where you're recognized as an expert or go-to person</p>
          
          <div class="add-item-form simple">
            <input
              type="text"
              placeholder="e.g., React Architecture, Team Leadership, Data Analysis"
              bind:value={newExpertise}
              on:keypress={(e) => handleKeyPress(e, addExpertise)}
            />
            <button class="add-btn" on:click={addExpertise}>Add</button>
          </div>

          <div class="items-list simple">
            {#each expertise as item, index}
              <div class="simple-item expertise">
                <span>{item}</span>
                <button class="remove-btn" on:click={() => removeExpertise(index)}>×</button>
              </div>
            {/each}
          </div>
        </div>

        <!-- Interests Section -->
        <div class="section">
          <h3>🌱 Learning Interests</h3>
          <p class="section-desc">Areas you want to learn about or develop skills in</p>
          
          <div class="add-item-form simple">
            <input
              type="text"
              placeholder="e.g., Machine Learning, Public Speaking, UX Design"
              bind:value={newInterest}
              on:keypress={(e) => handleKeyPress(e, addInterest)}
            />
            <button class="add-btn" on:click={addInterest}>Add</button>
          </div>

          <div class="items-list simple">
            {#each interests as item, index}
              <div class="simple-item interest">
                <span>{item}</span>
                <button class="remove-btn" on:click={() => removeInterest(index)}>×</button>
              </div>
            {/each}
          </div>
        </div>

        <!-- Bio Section -->
        <div class="section">
          <h3>💫 Bio & Personality</h3>
          
          <div class="form-group">
            <label>Short Bio</label>
            <textarea
              placeholder="Tell us a bit about yourself, your background, and what drives you..."
              bind:value={bio}
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Personality Type (optional)</label>
            <input
              type="text"
              placeholder="e.g., ENFP, DISC-D, Enneagram 7"
              bind:value={personalityType}
            />
          </div>
        </div>

        <!-- Working Style Section -->
        <div class="section">
          <h3>⚡ Working Style</h3>
          <p class="section-desc">How you prefer to work and collaborate</p>
          
          <div class="working-style-options">
            {#each workingStyleOptions as style}
              <button 
                class="style-option {workingStyle.includes(style) ? 'selected' : ''}"
                on:click={() => workingStyle.includes(style) ? removeWorkingStyle(workingStyle.indexOf(style)) : addWorkingStyle(style)}
              >
                {style}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="cancel-btn" on:click={close} disabled={loading}>
          Cancel
        </button>
        <button class="save-btn" on:click={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save DNA Profile'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-container {
    background: var(--background);
    border-radius: 16px;
    width: 90%;
    max-width: 700px;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, var(--primary), var(--primary-light));
    color: white;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .modal-content {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .error-message {
    background: #FEE2E2;
    border: 1px solid #FECACA;
    color: #DC2626;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
  }

  .section {
    margin-bottom: 30px;
  }

  .section h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .section-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 15px 0;
  }

  .add-item-form {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    align-items: center;
    flex-wrap: wrap;
  }

  .add-item-form.simple {
    flex-wrap: nowrap;
  }

  .add-item-form input,
  .add-item-form select {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 14px;
    background: var(--background);
    color: var(--text-primary);
  }

  .add-item-form input[type="text"] {
    flex: 1;
    min-width: 200px;
  }

  .level-input {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .level-input input[type="range"] {
    width: 80px;
  }

  .add-btn {
    background: var(--primary);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .add-btn:hover {
    background: var(--primary-dark);
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .skill-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background: var(--background-secondary);
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  .skill-name {
    font-weight: 500;
    flex: 1;
  }

  .skill-category {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 500;
  }

  .skill-category.technical { background: #DBEAFE; color: #1E40AF; }
  .skill-category.soft { background: #D1FAE5; color: #065F46; }
  .skill-category.domain { background: #FEF3C7; color: #92400E; }
  .skill-category.leadership { background: #FEE2E2; color: #991B1B; }

  .skill-level {
    font-size: 14px;
    color: #F59E0B;
  }

  .simple-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--background-secondary);
    border-radius: 6px;
    border: 1px solid var(--border);
  }

  .simple-item.expertise {
    border-left: 3px solid #10B981;
  }

  .simple-item.interest {
    border-left: 3px solid #3B82F6;
  }

  .remove-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 16px;
    padding: 2px 6px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .remove-btn:hover {
    background: #FEE2E2;
    color: #DC2626;
  }

  .form-group {
    margin-bottom: 15px;
  }

  .form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    font-size: 14px;
    color: var(--text-primary);
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 14px;
    background: var(--background);
    color: var(--text-primary);
    resize: vertical;
  }

  .working-style-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .style-option {
    padding: 6px 12px;
    border: 1px solid var(--border);
    background: var(--background);
    color: var(--text-secondary);
    border-radius: 20px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  .style-option:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  .style-option.selected {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px;
    border-top: 1px solid var(--border);
    background: var(--background-secondary);
  }

  .cancel-btn,
  .save-btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
  }

  .cancel-btn:hover {
    background: var(--background-secondary);
  }

  .save-btn {
    background: var(--primary);
    border: 1px solid var(--primary);
    color: white;
  }

  .save-btn:hover {
    background: var(--primary-dark);
  }

  .save-btn:disabled,
  .cancel-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>