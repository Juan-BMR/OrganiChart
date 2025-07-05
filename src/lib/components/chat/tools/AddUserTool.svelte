<script lang="ts">
  import type { ToolCall } from '$lib/stores/chat';

  export let toolCall: ToolCall;

  $: args = toolCall.arguments;
  $: result = toolCall.result;
</script>

<div class="add-user-tool">
  <div class="user-preview">
    <h4>Adding new member:</h4>
    <div class="user-details">
      <div class="detail-row">
        <span class="label">Name:</span>
        <span class="value">{args.name}</span>
      </div>
      <div class="detail-row">
        <span class="label">Role:</span>
        <span class="value">{args.role}</span>
      </div>
      {#if args.email}
        <div class="detail-row">
          <span class="label">Email:</span>
          <span class="value">{args.email}</span>
        </div>
      {/if}
      {#if args.managerId}
        <div class="detail-row">
          <span class="label">Reports to:</span>
          <span class="value">Manager ID: {args.managerId}</span>
        </div>
      {/if}
    </div>
  </div>

  {#if toolCall.status === 'complete' && result}
    <div class="success-message">
      <i class="icon icon-check-circle"></i>
      <p>Successfully added {result.name} to the organization!</p>
      <span class="member-id">Member ID: {result.id}</span>
    </div>
  {:else if toolCall.status === 'error'}
    <div class="error-message">
      <i class="icon icon-x-circle"></i>
      <p>{toolCall.error || 'Failed to add user'}</p>
    </div>
  {/if}
</div>

<style>
  .add-user-tool {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .user-details {
    background: #f9fafb;
    padding: 12px;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .detail-row {
    display: flex;
    gap: 8px;
  }

  .label {
    font-weight: 500;
    color: #6b7280;
    min-width: 80px;
  }

  .value {
    color: #111827;
  }

  .success-message {
    background: #d1fae5;
    color: #065f46;
    padding: 12px;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .member-id {
    font-size: 0.75rem;
    font-family: monospace;
    opacity: 0.8;
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