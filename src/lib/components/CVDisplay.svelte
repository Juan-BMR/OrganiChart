<script>
  export let cvURL = null;
  export let memberName = "";
  export let size = "medium"; // "small", "medium", "large"

  function downloadCV() {
    if (cvURL) {
      const link = document.createElement('a');
      link.href = cvURL;
      link.download = `${memberName}_CV.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  function getFileName(url) {
    if (!url) return "";
    const urlPath = new URL(url).pathname;
    const fileName = urlPath.split('/').pop();
    const extension = fileName.split('.').pop().toLowerCase();
    
    // Return appropriate file type display
    switch (extension) {
      case 'pdf':
        return 'PDF';
      case 'doc':
        return 'DOC';
      case 'docx':
        return 'DOCX';
      default:
        return 'Document';
    }
  }
</script>

{#if cvURL}
  <div class="cv-display" class:small={size === 'small'} class:large={size === 'large'}>
    <button 
      class="cv-button" 
      on:click={downloadCV}
      title="Download {memberName}'s CV"
    >
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        class="cv-icon"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <div class="cv-info">
        <span class="cv-label">CV</span>
        <span class="cv-type">{getFileName(cvURL)}</span>
      </div>
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        class="download-icon"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </button>
  </div>
{/if}

<style>
  .cv-display {
    display: inline-flex;
  }

  .cv-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: var(--font-size-sm);
  }

  .cv-button:hover {
    background: var(--secondary);
    border-color: var(--primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .cv-icon {
    width: 18px;
    height: 18px;
    color: var(--primary);
    flex-shrink: 0;
  }

  .cv-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }

  .cv-label {
    font-weight: 500;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
  }

  .cv-type {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .download-icon {
    width: 16px;
    height: 16px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  /* Size variants */
  .cv-display.small .cv-button {
    padding: var(--spacing-1) var(--spacing-2);
    font-size: var(--font-size-xs);
  }

  .cv-display.small .cv-icon {
    width: 14px;
    height: 14px;
  }

  .cv-display.small .download-icon {
    width: 12px;
    height: 12px;
  }

  .cv-display.small .cv-info {
    display: none; /* Hide text in small size */
  }

  .cv-display.large .cv-button {
    padding: var(--spacing-3) var(--spacing-4);
    font-size: var(--font-size-base);
  }

  .cv-display.large .cv-icon {
    width: 24px;
    height: 24px;
  }

  .cv-display.large .download-icon {
    width: 20px;
    height: 20px;
  }
</style>