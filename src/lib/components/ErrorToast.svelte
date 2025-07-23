<script>
  import { aiErrors, removeError, isRetrying } from "$lib/stores/aiErrors";
  import { fade, fly } from "svelte/transition";

  $: visibleErrors = $aiErrors.slice(0, 3); // Show max 3 errors at once

  function formatTimeAgo(date) {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  function getErrorIcon(type) {
    switch (type) {
      case 'network': return '🌐';
      case 'timeout': return '⏱️';
      case 'quota': return '⚠️';
      case 'api': return '🔧';
      case 'validation': return '❌';
      default: return '⚠️';
    }
  }

  function getErrorColor(type) {
    switch (type) {
      case 'network': return 'var(--warning)';
      case 'timeout': return 'var(--warning)';
      case 'quota': return 'var(--error)';
      case 'api': return 'var(--error)';
      case 'validation': return 'var(--error)';
      default: return 'var(--error)';
    }
  }
</script>

<div class="error-container">
  {#if $isRetrying}
    <div class="retry-indicator" in:fade={{ duration: 200 }}>
      <div class="spinner"></div>
      <span>Retrying...</span>
    </div>
  {/if}

  {#each visibleErrors as error (error.id)}
    <div 
      class="error-toast"
      style="border-left-color: {getErrorColor(error.type)}"
      in:fly={{ x: 300, duration: 300 }}
      out:fly={{ x: 300, duration: 200 }}
    >
      <div class="error-header">
        <span class="error-icon">{getErrorIcon(error.type)}</span>
        <span class="error-type">{error.type.toUpperCase()}</span>
        <span class="error-time">{formatTimeAgo(error.timestamp)}</span>
        <button 
          class="close-btn" 
          on:click={() => removeError(error.id)}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
      
      <div class="error-message">
        {error.message}
      </div>
      
      {#if error.context}
        <div class="error-context">
          {error.context}
        </div>
      {/if}
      
      {#if error.retryCount > 0}
        <div class="retry-info">
          Retry {error.retryCount}/{error.maxRetries}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .error-container {
    position: fixed;
    top: calc(var(--header-height, 60px) + 20px);
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    max-width: 400px;
  }

  .retry-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    background: var(--primary);
    color: white;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    box-shadow: var(--shadow-lg);
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-toast {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 4px solid var(--error);
    border-radius: var(--radius-md);
    padding: var(--spacing-3);
    box-shadow: var(--shadow-lg);
    font-size: var(--font-size-sm);
    max-width: 100%;
  }

  .error-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-2);
  }

  .error-icon {
    font-size: var(--font-size-base);
  }

  .error-type {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .error-time {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    margin-left: auto;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 2px;
    border-radius: var(--radius-sm);
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--surface-variant);
    color: var(--text-primary);
  }

  .error-message {
    color: var(--text-primary);
    line-height: 1.4;
    margin-bottom: var(--spacing-1);
  }

  .error-context {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-style: italic;
    margin-bottom: var(--spacing-1);
  }

  .retry-info {
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    font-weight: 500;
  }
</style>