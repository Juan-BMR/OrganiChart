<script lang="ts">
  import type { ToolCall } from '$lib/stores/chat';

  export let toolCall: ToolCall;

  $: args = toolCall.arguments;
  $: result = toolCall.result;
  $: stats = result?.statistics;
</script>

<div class="org-info-tool">
  {#if args?.query}
    <div class="search-params">
      <i class="icon icon-filter"></i>
      <span>Filter: <strong>{args.query}</strong></span>
      {#if args.filterBy && args.filterBy !== 'all'}
        <span class="filter-type">by {args.filterBy}</span>
      {/if}
    </div>
  {/if}

  {#if toolCall.status === 'complete' && result}
    <div class="org-stats">
      <div class="stat-card">
        <div class="stat-value">{stats.totalMembers}</div>
        <div class="stat-label">Total Members</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{stats.topLevelMembers}</div>
        <div class="stat-label">Top Level</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{stats.managersCount}</div>
        <div class="stat-label">Managers</div>
      </div>
    </div>

    {#if result.members && result.members.length > 0}
      <div class="members-preview">
        <h4>Members ({result.members.length}):</h4>
        <div class="member-grid">
          {#each result.members.slice(0, 5) as member}
            <div class="member-item">
              <div class="member-name">{member.name}</div>
              <div class="member-role">{member.role}</div>
              {#if member.hasSubordinates}
                <span class="has-reports">Has reports</span>
              {/if}
            </div>
          {/each}
          {#if result.members.length > 5}
            <div class="more-members">
              +{result.members.length - 5} more...
            </div>
          {/if}
        </div>
      </div>
    {/if}

    {#if stats?.roleBreakdown && Object.keys(stats.roleBreakdown).length > 0}
      <div class="role-breakdown">
        <h4>Role Distribution:</h4>
        <div class="role-list">
          {#each Object.entries(stats.roleBreakdown) as [role, count]}
            <div class="role-item">
              <span class="role-name">{role}</span>
              <span class="role-count">{count}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {:else if toolCall.status === 'error'}
    <div class="error-message">
      <i class="icon icon-alert-triangle"></i>
      <p>{toolCall.error || 'Failed to fetch organization info'}</p>
    </div>
  {/if}
</div>

<style>
  .org-info-tool {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .search-params {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .filter-type {
    background: #e5e7eb;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .icon-filter::before {
    content: "🔽";
  }

  .icon-alert-triangle::before {
    content: "⚠️";
  }

  .org-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .stat-card {
    background: #f3f4f6;
    padding: 16px;
    border-radius: 8px;
    text-align: center;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 4px;
  }

  .member-grid {
    display: grid;
    gap: 8px;
  }

  .member-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: #f9fafb;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .member-name {
    font-weight: 500;
    color: #111827;
  }

  .member-role {
    color: #6b7280;
    flex: 1;
  }

  .has-reports {
    background: #dbeafe;
    color: #1e40af;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .more-members {
    text-align: center;
    color: #6b7280;
    font-size: 0.875rem;
    padding: 8px;
    font-style: italic;
  }

  .role-breakdown {
    background: #f9fafb;
    padding: 12px;
    border-radius: 8px;
  }

  .role-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
  }

  .role-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
  }

  .role-count {
    background: #e5e7eb;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #dc2626;
    padding: 12px;
    background: #fee2e2;
    border-radius: 6px;
  }

  h4 {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
    color: #374151;
  }
</style>