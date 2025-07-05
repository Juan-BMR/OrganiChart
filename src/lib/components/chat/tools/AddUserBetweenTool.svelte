<script lang="ts">
  import type { ToolCall } from '$lib/stores/chat';

  export let toolCall: ToolCall;

  $: args = toolCall.arguments;
  $: result = toolCall.result;
</script>

<div class="add-between-tool">
  <div class="hierarchy-preview">
    <h4>Inserting member in hierarchy:</h4>
    
    <div class="hierarchy-diagram">
      <div class="hierarchy-node manager">
        <span class="node-label">Manager</span>
        <span class="node-id">{args.managerUserId}</span>
      </div>
      
      <div class="arrow-down">↓</div>
      
      <div class="hierarchy-node new-member">
        <span class="node-label">New Member</span>
        <span class="node-name">{args.name}</span>
        <span class="node-role">{args.role}</span>
      </div>
      
      <div class="arrow-down">↓</div>
      
      <div class="hierarchy-node subordinate">
        <span class="node-label">Subordinate</span>
        <span class="node-id">{args.subordinateUserId}</span>
      </div>
    </div>
  </div>

  {#if toolCall.status === 'complete' && result}
    <div class="success-message">
      <i class="icon icon-check-circle"></i>
      <p>Successfully inserted {result.name} into the hierarchy!</p>
      <div class="result-details">
        <span>New member ID: {result.id}</span>
        <span>Reports to: {result.managerName || result.managerId}</span>
        <span>Manages: {result.subordinateName || result.subordinateUserId}</span>
      </div>
    </div>
  {:else if toolCall.status === 'error'}
    <div class="error-message">
      <i class="icon icon-x-circle"></i>
      <p>{toolCall.error || 'Failed to insert user'}</p>
    </div>
  {/if}
</div>

<style>
  .add-between-tool {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .hierarchy-diagram {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .hierarchy-node {
    padding: 12px 16px;
    border-radius: 6px;
    text-align: center;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .hierarchy-node.manager {
    background: #dbeafe;
    border: 1px solid #3b82f6;
  }

  .hierarchy-node.new-member {
    background: #d1fae5;
    border: 2px solid #10b981;
  }

  .hierarchy-node.subordinate {
    background: #e5e7eb;
    border: 1px solid #6b7280;
  }

  .node-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    opacity: 0.7;
  }

  .node-name {
    font-weight: 600;
    color: #111827;
  }

  .node-role {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .node-id {
    font-family: monospace;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .arrow-down {
    font-size: 1.5rem;
    color: #6b7280;
  }

  .success-message {
    background: #d1fae5;
    color: #065f46;
    padding: 12px;
    border-radius: 6px;
  }

  .result-details {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.875rem;
  }

  .error-message {
    background: #fee2e2;
    color: #dc2626;
    padding: 12px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .icon::before {
    font-size: 16px;
  }

  .icon-check-circle::before {
    content: "✅";
  }

  .icon-x-circle::before {
    content: "❌";
  }

  h4 {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
    color: #374151;
  }
</style>