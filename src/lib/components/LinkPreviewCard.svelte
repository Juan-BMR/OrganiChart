<script>
  export let organization = null;
  export let members = [];
  export let showFullPreview = false;
</script>

{#if organization}
  <div class="link-preview-card" class:full={showFullPreview}>
    <div class="preview-header">
      <div class="org-info">
        {#if organization.logoURL}
          <img 
            src={organization.logoURL} 
            alt="{organization.name} logo" 
            class="org-logo"
          />
        {:else}
          <div class="org-logo-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke-width="2"
                stroke-linejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke-width="2"
                stroke-linejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke-width="2"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        {/if}
        <div class="org-details">
          <h3>{organization.name}</h3>
          <p>{organization.memberCount || 0} team members</p>
        </div>
      </div>
    </div>
    
    {#if members.length > 0}
      <div class="members-preview">
        <div class="members-list">
          {#each members.slice(0, 5) as member, i}
            <div class="member-avatar">
              {#if member.photoURL}
                <img 
                  src={member.photoURL} 
                  alt={member.name}
                  loading="lazy"
                />
              {:else}
                <div 
                  class="avatar-placeholder"
                  style="background-color: {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5]}"
                >
                  {member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
              {/if}
              {#if showFullPreview}
                <span class="member-name">{member.name}</span>
              {/if}
            </div>
          {/each}
          
          {#if organization.memberCount > 5}
            <div class="member-avatar more">
              <div class="avatar-placeholder more-count">
                +{organization.memberCount - 5}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
    
    <div class="preview-footer">
      <div class="branding">
        <svg class="brand-icon" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L2 7L12 12L22 7L12 2Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <path
            d="M2 17L12 22L22 17"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <path
            d="M2 12L12 17L22 12"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
        </svg>
        <span>OrganiChart</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .link-preview-card {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #e5e7eb);
    border-radius: var(--radius-lg, 12px);
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    max-width: 400px;
  }
  
  .link-preview-card.full {
    max-width: 600px;
  }
  
  .preview-header {
    padding: var(--spacing-4, 16px);
    border-bottom: 1px solid var(--border, #e5e7eb);
  }
  
  .org-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-3, 12px);
  }
  
  .org-logo,
  .org-logo-placeholder {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md, 8px);
    object-fit: cover;
    flex-shrink: 0;
  }
  
  .org-logo-placeholder {
    background: var(--primary, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }
  
  .org-logo-placeholder svg {
    width: 24px;
    height: 24px;
  }
  
  .org-details h3 {
    margin: 0;
    font-size: var(--font-size-lg, 18px);
    font-weight: 600;
    color: var(--text-primary, #111827);
  }
  
  .org-details p {
    margin: 0;
    font-size: var(--font-size-sm, 14px);
    color: var(--text-secondary, #6b7280);
  }
  
  .members-preview {
    padding: var(--spacing-4, 16px);
  }
  
  .members-list {
    display: flex;
    gap: var(--spacing-2, 8px);
    flex-wrap: wrap;
  }
  
  .member-avatar {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-1, 4px);
  }
  
  .member-avatar img,
  .avatar-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    object-fit: cover;
  }
  
  .avatar-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: var(--font-size-sm, 14px);
  }
  
  .avatar-placeholder.more-count {
    background: var(--secondary, #f3f4f6);
    color: var(--text-secondary, #6b7280);
  }
  
  .member-name {
    font-size: var(--font-size-xs, 12px);
    color: var(--text-secondary, #6b7280);
    text-align: center;
    max-width: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .preview-footer {
    padding: var(--spacing-3, 12px) var(--spacing-4, 16px);
    background: var(--secondary, #f9fafb);
    border-top: 1px solid var(--border, #e5e7eb);
  }
  
  .branding {
    display: flex;
    align-items: center;
    gap: var(--spacing-2, 8px);
    font-size: var(--font-size-sm, 14px);
    color: var(--text-secondary, #6b7280);
  }
  
  .brand-icon {
    width: 16px;
    height: 16px;
    color: var(--primary, #6366f1);
  }
</style>