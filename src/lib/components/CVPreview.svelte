<script>
  import { onMount, onDestroy } from 'svelte';
  
  export let cvURL = '';
  export let cvFileName = '';
  export let show = false;
  export let x = 0;
  export let y = 0;
  
  let previewContainer;
  let loading = true;
  let error = false;
  let previewContent = '';
  let fileType = '';
  
  // Determine file type from filename or URL
  $: if (cvFileName) {
    const extension = cvFileName.split('.').pop()?.toLowerCase();
    fileType = extension || 'unknown';
  }
  
  // Load preview when component shows
  $: if (show && cvURL) {
    loadPreview();
  }
  
  async function loadPreview() {
    loading = true;
    error = false;
    
    try {
      if (fileType === 'pdf') {
        await loadPDFPreview();
      } else {
        // For DOC/DOCX, we'll show a document icon with metadata
        loadDocumentInfo();
      }
    } catch (err) {
      console.error('Failed to load CV preview:', err);
      error = true;
    } finally {
      loading = false;
    }
  }
  
  async function loadPDFPreview() {
    try {
      // Try to use PDF.js if available
      if (typeof window !== 'undefined' && window.pdfjsLib) {
        await loadPDFWithPDFJS();
      } else {
        // Fallback to iframe
        previewContent = cvURL;
      }
    } catch (err) {
      console.warn('PDF.js failed, falling back to iframe:', err);
      previewContent = cvURL;
    }
  }

  async function loadPDFWithPDFJS() {
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const pdf = await pdfjsLib.getDocument(cvURL).promise;
    const page = await pdf.getPage(1);
    
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    previewContent = canvas.toDataURL();
  }
  
  function loadDocumentInfo() {
    // For non-PDF documents, show document info and icon
    previewContent = 'document-info';
  }
  
  function getFileIcon(type) {
    switch (type) {
      case 'pdf':
        return 'M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H19C19.55 4 20 4.45 20 5S19.55 6 19 6H17V20C17 21.1 16.1 22 15 22H9C7.9 22 7 21.1 7 20V6H5C4.45 6 4 5.55 4 5S4.45 4 5 4H7ZM9 8V18H15V8H9Z';
      case 'doc':
      case 'docx':
        return 'M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z';
      default:
        return 'M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z';
    }
  }
  
  function formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  // Position the preview near the cursor but keep it in viewport
  function updatePosition() {
    if (!previewContainer) return;
    
    const rect = previewContainer.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let newX = x + 20; // Offset from cursor
    let newY = y + 20;
    
    // Adjust if preview would go off-screen
    if (newX + rect.width > viewportWidth) {
      newX = x - rect.width - 20;
    }
    
    if (newY + rect.height > viewportHeight) {
      newY = y - rect.height - 20;
    }
    
    // Ensure preview stays within viewport bounds
    newX = Math.max(10, Math.min(newX, viewportWidth - rect.width - 10));
    newY = Math.max(10, Math.min(newY, viewportHeight - rect.height - 10));
    
    previewContainer.style.left = `${newX}px`;
    previewContainer.style.top = `${newY}px`;
  }
  
  $: if (show && previewContainer && x !== undefined && y !== undefined) {
    updatePosition();
  }
</script>

{#if show}
  <div 
    class="cv-preview-tooltip" 
    bind:this={previewContainer}
    style="left: {x + 20}px; top: {y + 20}px;"
  >
    <div class="preview-header">
      <div class="file-info">
        <svg class="file-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d={getFileIcon(fileType)} />
        </svg>
        <div class="file-details">
          <div class="filename">{cvFileName}</div>
          <div class="filetype">{fileType.toUpperCase()} Document</div>
        </div>
      </div>
    </div>
    
    <div class="preview-content">
      {#if loading}
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Loading preview...</span>
        </div>
      {:else if error}
        <div class="error-state">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
          </svg>
          <span>Preview not available</span>
          <small>Click download to view file</small>
        </div>
      {:else if fileType === 'pdf'}
        <div class="pdf-preview">
          {#if previewContent && previewContent.startsWith('data:image')}
            <!-- PDF.js rendered canvas -->
            <img src={previewContent} alt="PDF Preview" class="pdf-canvas" />
          {:else}
            <!-- Fallback iframe -->
            <iframe 
              src="{cvURL}#toolbar=0&navpanes=0&scrollbar=0" 
              title="PDF Preview"
              frameborder="0"
            ></iframe>
          {/if}
          <div class="pdf-overlay">
            <span>PDF Preview - First Page</span>
            <small>Click download for full document</small>
          </div>
        </div>
      {:else}
        <div class="document-preview">
          <div class="document-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d={getFileIcon(fileType)} />
            </svg>
          </div>
          <div class="document-info">
            <h4>{fileType.toUpperCase()} Document</h4>
            <p>Preview not available for this file type</p>
            <small>Click download to open in default application</small>
          </div>
        </div>
      {/if}
    </div>
    
    <div class="preview-footer">
      <small>Hover to preview • Click to download</small>
    </div>
  </div>
{/if}

<style>
  .cv-preview-tooltip {
    position: fixed;
    z-index: 10000;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    width: 320px;
    max-height: 400px;
    overflow: hidden;
    pointer-events: none;
    backdrop-filter: blur(8px);
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .preview-header {
    padding: var(--spacing-3);
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  
  .file-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }
  
  .file-icon {
    width: 32px;
    height: 32px;
    color: var(--primary);
    flex-shrink: 0;
  }
  
  .file-details {
    flex: 1;
    min-width: 0;
  }
  
  .filename {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .filetype {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-top: 2px;
  }
  
  .preview-content {
    height: 240px;
    position: relative;
    background: var(--background);
  }
  
  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--spacing-2);
    color: var(--text-secondary);
    text-align: center;
    padding: var(--spacing-4);
  }
  
  .loading-state .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .error-state svg {
    width: 32px;
    height: 32px;
    color: var(--error);
  }
  
  .error-state small {
    font-size: var(--font-size-xs);
    opacity: 0.8;
  }
  
  .pdf-preview {
    position: relative;
    height: 100%;
  }
  
  .pdf-preview iframe,
  .pdf-canvas {
    width: 100%;
    height: 100%;
    border: none;
    object-fit: contain;
  }
  
  .pdf-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
    color: white;
    padding: var(--spacing-3);
    text-align: center;
  }
  
  .pdf-overlay small {
    font-size: var(--font-size-xs);
    opacity: 0.9;
  }
  
  .document-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    text-align: center;
  }
  
  .document-icon svg {
    width: 64px;
    height: 64px;
    color: var(--primary);
    opacity: 0.6;
  }
  
  .document-info h4 {
    margin: 0;
    color: var(--text-primary);
    font-size: var(--font-size-base);
  }
  
  .document-info p {
    margin: var(--spacing-1) 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }
  
  .document-info small {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    opacity: 0.8;
  }
  
  .preview-footer {
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--surface);
    border-top: 1px solid var(--border);
    text-align: center;
  }
  
  .preview-footer small {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }
  
  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    .cv-preview-tooltip {
      background: rgba(var(--background-rgb), 0.95);
    }
  }
  
  /* Responsive design */
  @media (max-width: 768px) {
    .cv-preview-tooltip {
      width: 280px;
      max-height: 350px;
    }
    
    .preview-content {
      height: 200px;
    }
  }
</style>