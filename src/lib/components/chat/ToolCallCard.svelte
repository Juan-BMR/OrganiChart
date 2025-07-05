<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ToolCall } from '$lib/stores/chat';

  export let toolCall: ToolCall;

  const dispatch = createEventDispatcher();

  // Map tool names to icons
  const toolIcons: Record<string, string> = {
    getUserInformation: 'search',
    addUser: 'user-plus',
    addUserBetween: 'link',
    getOrganizationInformation: 'building',
    removeUser: 'trash'
  };

  // Map tool names to friendly titles
  const toolTitles: Record<string, string> = {
    getUserInformation: 'Searching for User',
    addUser: 'Adding New Member',
    addUserBetween: 'Inserting Member in Hierarchy',
    getOrganizationInformation: 'Fetching Organization Info',
    removeUser: 'Removing Member'
  };

  $: icon = toolIcons[toolCall.name] || 'tool';
  $: title = toolTitles[toolCall.name] || toolCall.name;
  $: isExpanded = toolCall.status !== 'pending';
</script>

<div class="tool-card {toolCall.status}" class:expanded={isExpanded}>
  <div class="tool-header" on:click={() => isExpanded = !isExpanded}>
    <div class="tool-info">
      <i class="icon icon-{icon}"></i>
      <span class="tool-title">{title}</span>
    </div>

    <div class="tool-status">
      {#if toolCall.status === 'pending'}
        <span class="status-text">Waiting...</span>
      {:else if toolCall.status === 'executing'}
        <div class="spinner"></div>
        <span class="status-text">Running...</span>
      {:else if toolCall.status === 'complete'}
        <i class="icon icon-check"></i>
        <span class="status-text">Complete</span>
      {:else if toolCall.status === 'error'}
        <i class="icon icon-x"></i>
        <span class="status-text">Failed</span>
      {/if}
    </div>
  </div>

  {#if isExpanded}
    <div class="tool-content">
      <slot {toolCall}>
        <!-- Default content if no specific component -->
        <div class="tool-details">
          <pre>{JSON.stringify(toolCall.arguments, null, 2)}</pre>
          {#if toolCall.result}
            <div class="tool-result">
              <h4>Result:</h4>
              <pre>{JSON.stringify(toolCall.result, null, 2)}</pre>
            </div>
          {/if}
          {#if toolCall.error}
            <div class="tool-error">
              <h4>Error:</h4>
              <p>{toolCall.error}</p>
            </div>
          {/if}
        </div>
      </slot>
    </div>
  {/if}
</div>

<style>
  .tool-card {
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s ease;
    margin: 4px 0;
    animation: toolSlideIn 0.3s ease-out;
  }

  @keyframes toolSlideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .tool-card.pending {
    opacity: 0.6;
    border-color: #9ca3af;
  }

  .tool-card.executing {
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
    animation: toolPulse 2s ease-in-out infinite;
  }

  @keyframes toolPulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .tool-card.complete {
    border-color: #10b981;
  }

  .tool-card.error {
    border-color: #ef4444;
    background-color: rgba(239, 68, 68, 0.05);
  }

  .tool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.02);
  }

  .tool-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .icon {
    width: 20px;
    height: 20px;
    display: inline-block;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }

  /* Tool icons using CSS instead of SVG files for now */
  .icon-search::before {
    content: "🔍";
    font-size: 16px;
  }

  .icon-user-plus::before {
    content: "👤+";
    font-size: 16px;
  }

  .icon-link::before {
    content: "🔗";
    font-size: 16px;
  }

  .icon-building::before {
    content: "🏢";
    font-size: 16px;
  }

  .icon-trash::before {
    content: "🗑️";
    font-size: 16px;
  }

  .icon-check::before {
    content: "✓";
    color: #10b981;
    font-size: 16px;
  }

  .icon-x::before {
    content: "✗";
    color: #ef4444;
    font-size: 16px;
  }

  .tool-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.875rem;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #f3f4f6;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .tool-content {
    padding: 16px;
    border-top: 1px solid var(--border);
  }

  .tool-details pre {
    background-color: #f9fafb;
    padding: 8px;
    border-radius: 4px;
    font-size: 0.875rem;
    overflow-x: auto;
  }

  .tool-result, .tool-error {
    margin-top: 12px;
  }

  .tool-result h4, .tool-error h4 {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .tool-error {
    color: #dc2626;
  }

  .tool-error p {
    background: #fee2e2;
    padding: 8px;
    border-radius: 4px;
  }
</style>