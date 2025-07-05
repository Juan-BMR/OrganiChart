<script lang="ts">
  import type { ToolCall } from '$lib/stores/chat';

  export let toolCall: ToolCall;

  $: searchQuery = toolCall.arguments?.userName || '';
  $: result = toolCall.result;
  $: hasExactMatches = result?.exactMatches?.length > 0;
  $: hasSuggestions = result?.suggestions?.length > 0;
</script>

<div class="search-tool">
  <div class="search-query">
    <i class="icon icon-search"></i>
    <span>Searching for: <strong>{searchQuery}</strong></span>
  </div>

  {#if toolCall.status === 'complete' && result}
    {#if hasExactMatches}
      <div class="matches-section">
        <h4>Found {result.exactMatches.length} match{result.exactMatches.length > 1 ? 'es' : ''}:</h4>
        <div class="user-list">
          {#each result.exactMatches as match}
            <div class="user-card">
              <div class="user-avatar">
                {match.name.charAt(0).toUpperCase()}
              </div>
              <div class="user-info">
                <div class="user-name">{match.name}</div>
                <div class="user-role">{match.role}</div>
                {#if match.email}
                  <div class="user-email">{match.email}</div>
                {/if}
              </div>
              <div class="match-confidence">
                <span class="confidence-badge {match.confidence === 100 ? 'perfect' : 'good'}">
                  {match.confidence}% match
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else if hasSuggestions}
      <div class="suggestions-section">
        <h4>No exact matches. Did you mean:</h4>
        <div class="suggestion-list">
          {#each result.suggestions as suggestion}
            <div class="suggestion-item">
              <span class="suggestion-name">{suggestion.name}</span>
              <span class="suggestion-confidence">({suggestion.confidence}% similar)</span>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="no-results">
        <i class="icon icon-user-x"></i>
        <p>No users found matching "{searchQuery}"</p>
      </div>
    {/if}
  {:else if toolCall.status === 'error'}
    <div class="error-message">
      <i class="icon icon-alert-circle"></i>
      <p>{toolCall.error || 'Failed to search for user'}</p>
    </div>
  {/if}
</div>

<style>
  .search-tool {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .search-query {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #6b7280;
  }

  .icon-search::before {
    content: "🔍";
  }

  .icon-user-x::before {
    content: "👤❌";
  }

  .icon-alert-circle::before {
    content: "⚠️";
  }

  .user-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #3b82f6;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }

  .user-info {
    flex: 1;
  }

  .user-name {
    font-weight: 600;
    color: #111827;
  }

  .user-role {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .user-email {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .confidence-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .confidence-badge.perfect {
    background: #d1fae5;
    color: #065f46;
  }

  .confidence-badge.good {
    background: #dbeafe;
    color: #1e40af;
  }

  .suggestion-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .suggestion-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background: #f9fafb;
    border-radius: 6px;
  }

  .suggestion-name {
    font-weight: 500;
  }

  .suggestion-confidence {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .no-results {
    text-align: center;
    padding: 24px;
    color: #6b7280;
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
  }

  .user-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
</style>