<script lang="ts">
  import type { ToolCall } from '$lib/stores/chat';

  export let toolCall: ToolCall;

  $: args = toolCall.arguments;
  $: result = toolCall.result;
</script>

<div class="remove-user-tool">
  <div class="removal-preview">
    <h4>Removing member:</h4>
    <div class="removal-details">
      <div class="detail-row">
        <span class="label">User ID:</span>
        <span class="value">{args.userId}</span>
      </div>
      <div class="detail-row">
        <span class="label">Organization:</span>
        <span class="value">{args.organizationId}</span>
      </div>
    </div>
  </div>

  {#if toolCall.status === 'complete' && result}
    <div class="success-message">
      <i class="icon icon-check-circle"></i>
      <p>{result.message || 'Successfully removed member'}</p>
      
      {#if result.deletedMember}
        <div class="deleted-info">
          <strong>Removed:</strong> {result.deletedMember.name} ({result.deletedMember.role})
        </div>
      {/if}

      {#if result.reassignedSubordinates && result.reassignedSubordinates.length > 0}
        <div class="reassignment-info">
          <h5>Reassigned subordinates:</h5>
          <ul>
            {#each result.reassignedSubordinates as subordinate}
              <li>{subordinate.name} ({subordinate.role})</li>
            {/each}
          </ul>
          <div class="reassign-target">
            → Reassigned to: {result.newManagerId ? `Manager ID: ${result.newManagerId}` : 'Top level (no manager)'}
          </div>
        </div>
      {/if}
    </div>
  {:else if toolCall.status === 'error'}
    <div class="error-message">
      <i class="icon icon-x-circle"></i>
      <p>{toolCall.error || 'Failed to remove user'}</p>
    </div>
  {/if}
</div>

<style>
  .remove-user-tool {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .removal-details {
    background: #fef2f2;
    border: 1px solid #fecaca;
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
    min-width: 100px;
  }

  .value {
    color: #111827;
    font-family: monospace;
    font-size: 0.875rem;
  }

  .success-message {
    background: #d1fae5;
    color: #065f46;
    padding: 12px;
    border-radius: 6px;
  }

  .deleted-info {
    margin-top: 8px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .reassignment-info {
    margin-top: 12px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }

  .reassignment-info h5 {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .reassignment-info ul {
    margin: 0;
    padding-left: 20px;
    list-style: disc;
  }

  .reassignment-info li {
    font-size: 0.875rem;
    margin: 4px 0;
  }

  .reassign-target {
    margin-top: 8px;
    font-size: 0.875rem;
    font-style: italic;
    color: #047857;
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
    color: #991b1b;
  }
</style>