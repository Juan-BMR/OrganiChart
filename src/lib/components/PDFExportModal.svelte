<script>
  export let isVisible = false;
  export let progress = 0; // 0-100
  export let currentStage = "";
  export let totalStages = 6;
  export let currentStageNumber = 0;

  $: progressPercentage = Math.min(100, Math.max(0, progress));
</script>

{#if isVisible}
  <div class="modal-overlay">
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <div class="icon-container">
          <svg
            class="pdf-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 class="modal-title">Generating PDF Export</h3>
        <p class="modal-subtitle">
          Please wait while we prepare your organization chart...
        </p>
      </div>

      <!-- Progress Bar -->
      <div class="progress-container">
        <div class="progress-header">
          <span>Progress</span>
          <span>{progressPercentage.toFixed(0)}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar" style="width: {progressPercentage}%"></div>
        </div>
      </div>

      <!-- Current Stage -->
      <div class="stage-info">
        <div class="stage-counter">
          Step {currentStageNumber} of {totalStages}
        </div>
        <div class="stage-description">
          {currentStage}
        </div>
      </div>

      <!-- Animated spinner -->
      <div class="spinner-container">
        <div class="spinner"></div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-8);
    max-width: 400px;
    width: 100%;
    margin: var(--spacing-4);
    box-shadow: var(--shadow-xl);
    animation: modalEnter 0.2s ease-out;
  }

  @keyframes modalEnter {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .modal-header {
    text-align: center;
    margin-bottom: var(--spacing-6);
  }

  .icon-container {
    width: 64px;
    height: 64px;
    margin: 0 auto var(--spacing-4);
    background: rgba(99, 102, 241, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pdf-icon {
    width: 32px;
    height: 32px;
    color: var(--primary);
  }

  .modal-title {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-2);
  }

  .modal-subtitle {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .progress-container {
    margin-bottom: var(--spacing-6);
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-2);
  }

  .progress-track {
    width: 100%;
    height: 12px;
    background: var(--secondary);
    border-radius: 6px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(to right, var(--primary), #4f46e5);
    border-radius: 6px;
    transition: width 0.3s ease-out;
    min-width: 12px;
  }

  .stage-info {
    text-align: center;
    margin-bottom: var(--spacing-6);
  }

  .stage-counter {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-1);
  }

  .stage-description {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-primary);
  }

  .spinner-container {
    display: flex;
    justify-content: center;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border);
    border-radius: 50%;
    border-top-color: var(--primary);
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive */
  @media (max-width: 480px) {
    .modal-content {
      margin: var(--spacing-2);
      padding: var(--spacing-6);
    }
  }
</style>
