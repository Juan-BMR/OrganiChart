<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { membersStore } from "$lib/stores/members.js";
  import { fade } from "svelte/transition";
  import CVPreview from "./CVPreview.svelte";

  export let open = false;
  export let member; // existing member object
  export let organizationId;
  export let members = [];

  const dispatch = createEventDispatcher();
  let modalElement;

  let name = "";
  let role = "";
  let email = "";
  let startDate = "";
  let file = null;
  let filePreviewUrl = null;
  let fileInput;
  let cvFile = null;
  let cvInput;
  let error = null;
  let loading = false;
  let currentMemberId = null; // Track which member we're currently editing

  // CV preview state
  let showCVPreview = false;
  let cvTargetElement = null;

  // Initialize form values when modal opens or when member changes
  $: if (open && member && member.id !== currentMemberId) {
    name = member.name;
    role = member.role;
    email = member.email || "";
    // Format startDate for date input (YYYY-MM-DD)
    startDate = member.startDate
      ? new Date(
          member.startDate.seconds
            ? member.startDate.seconds * 1000
            : member.startDate
        )
          .toISOString()
          .split("T")[0]
      : new Date().toISOString().split("T")[0];
    file = null; // Reset photo state
    filePreviewUrl = null;
    cvFile = null; // Reset CV state
    currentMemberId = member.id;
  }

  // Focus the modal when it opens
  $: if (open && modalElement) {
    modalElement.focus();
  }

  function close() {
    // Clean up file preview URL
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      filePreviewUrl = null;
    }
    file = null;
    if (fileInput) {
      fileInput.value = "";
    }
    cvFile = null;
    if (cvInput) {
      cvInput.value = "";
    }

    // Reset form values
    name = "";
    role = "";
    email = "";
    startDate = "";
    error = null;
    currentMemberId = null;

    dispatch("close");
  }

  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Check if file is an image
    if (!selectedFile.type.startsWith("image/")) {
      error = "Please upload an image file (JPG, PNG, GIF, WebP)";
      // Reset the file input
      if (fileInput) {
        fileInput.value = "";
      }
      return;
    }

    // Check for unsupported image formats (HEIC, HEIF, etc.)
    const unsupportedTypes = ["image/heic", "image/heif"];
    if (unsupportedTypes.includes(selectedFile.type.toLowerCase())) {
      error =
        "HEIC/HEIF files are not supported. Please convert to JPG or PNG first.";
      // Reset the file input
      if (fileInput) {
        fileInput.value = "";
      }
      return;
    }

    // Check file size (2MB limit)
    if (selectedFile.size > 2 * 1024 * 1024) {
      error = "File size must be below 2MB";
      // Reset the file input
      if (fileInput) {
        fileInput.value = "";
      }
      return;
    }

    // File is valid
    file = selectedFile;
    error = null;
    filePreviewUrl = URL.createObjectURL(selectedFile);
  }

  function handleRemoveFile() {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    file = null;
    filePreviewUrl = null;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  function handleRemoveCurrentPhoto() {
    // Set a flag to remove the current photo when saving
    file = "REMOVE_PHOTO"; // Special flag to indicate photo removal
    filePreviewUrl = null;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  function handleCVChange(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Check if file is a valid CV format
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      error = "Please upload a PDF, DOC, or DOCX file";
      if (cvInput) {
        cvInput.value = "";
      }
      return;
    }

    // Check file size (5MB limit for CVs)
    if (selectedFile.size > 5 * 1024 * 1024) {
      error = "CV file size must be below 5MB";
      if (cvInput) {
        cvInput.value = "";
      }
      return;
    }

    // File is valid
    cvFile = selectedFile;
    error = null;
  }

  function handleRemoveCV() {
    cvFile = null;
    if (cvInput) {
      cvInput.value = "";
    }
  }

  function handleRemoveCurrentCV() {
    // Set a flag to remove the current CV when saving
    cvFile = "REMOVE_CV"; // Special flag to indicate CV removal
    if (cvInput) {
      cvInput.value = "";
    }
  }

  function handleCVHover(event) {
    if (member?.cvURL && member?.cvFileName && cvFile !== "REMOVE_CV") {
      showCVPreview = true;
      cvTargetElement = event.currentTarget;
    }
  }

  function handleCVLeave() {
    showCVPreview = false;
    cvTargetElement = null;
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation(); // Prevent ESC from bubbling up to close the sidebar
      close();
    }
  }

  async function handleSubmit() {
    error = null;
    loading = true;

    try {
      if (!name.trim()) {
        error = "Name is required";
        return;
      }

      // Determine if we need to update the photo
      let fileToUpdate = undefined; // undefined means don't change photo

      if (file === "REMOVE_PHOTO") {
        fileToUpdate = null; // null means remove the photo
      } else if (file && file !== "REMOVE_PHOTO") {
        fileToUpdate = file; // file object means upload new photo
      }
      // If file is null/undefined and not "REMOVE_PHOTO", don't pass fileToUpdate (keep existing photo)

      // Determine if we need to update the CV
      let cvToUpdate = undefined; // undefined means don't change CV

      if (cvFile === "REMOVE_CV") {
        cvToUpdate = null; // null means remove the CV
      } else if (cvFile && cvFile !== "REMOVE_CV") {
        cvToUpdate = cvFile; // file object means upload new CV
      }
      // If cvFile is null/undefined and not "REMOVE_CV", don't pass cvToUpdate (keep existing CV)

      // Convert startDate string to Date object
      const startDateObj = startDate ? new Date(startDate) : new Date();

      // Update member with basic information only
      await membersStore.updateMember(
        member.id,
        { name, role, email, startDate: startDateObj, organizationId },
        fileToUpdate,
        cvToUpdate
      );
      close();
    } catch (err) {
      console.error("EditMemberModal submit error:", err);

      if (err.code === "permission-denied") {
        error =
          "Permission denied. You need admin access to update members. Please contact the organization owner.";
      } else {
        error = err.message || "Failed to update member";
      }
    } finally {
      loading = false;
    }
  }
</script>

{#if open}
  <div class="modal-overlay" on:click|self={close}>
    <div
      class="modal"
      on:keydown={handleKeyDown}
      tabindex="-1"
      bind:this={modalElement}
    >
      <header class="modal-header">
        <h2>Edit Member</h2>
        <button class="close-btn" on:click={close}>×</button>
      </header>

      <div class="modal-body">
        {#if error}
          <p class="error-message">{error}</p>
        {/if}

        <label class="input-label" for="edit-member-name">Name</label>
        <input
          id="edit-member-name"
          type="text"
          placeholder="Enter full name"
          bind:value={name}
          class:error={error && !name.trim()}
          disabled={loading}
        />

        <label class="input-label" for="edit-member-email">Email</label>
        <input
          id="edit-member-email"
          type="email"
          placeholder="Enter email address"
          bind:value={email}
          disabled={loading}
        />

        <label class="input-label" for="edit-member-role">Role / Title</label>
        <input
          id="edit-member-role"
          type="text"
          placeholder="Enter job title or role"
          bind:value={role}
          disabled={loading}
        />

        <label class="input-label" for="edit-member-start-date"
          >Start Date</label
        >
        <input
          id="edit-member-start-date"
          type="date"
          bind:value={startDate}
          disabled={loading}
        />

        <label class="input-label" for="edit-photo-upload">Photo</label>
        <div class="photo-upload-container">
          <div class="upload-area" on:click={() => fileInput.click()}>
            {#if file === "REMOVE_PHOTO"}
              <div class="upload-placeholder">
                <svg
                  class="upload-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p>
                  <strong>Click to upload photo</strong>
                  <span class="upload-hint">JPG, PNG, GIF, WebP up to 2MB</span>
                </p>
              </div>
            {:else if filePreviewUrl}
              <div class="photo-preview">
                <img src={filePreviewUrl} alt="Photo preview" />
                <div class="photo-overlay">
                  <svg
                    class="camera-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>Click to change</span>
                </div>
              </div>
            {:else if member?.photoURL}
              <div class="photo-preview">
                <img src={member.photoURL} alt="Current photo" />
                <div class="photo-overlay">
                  <svg
                    class="camera-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>Click to change</span>
                </div>
              </div>
            {:else}
              <div class="upload-placeholder">
                <svg
                  class="upload-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p>
                  <strong>Click to upload photo</strong>
                  <span class="upload-hint">JPG, PNG, GIF, WebP up to 2MB</span>
                </p>
              </div>
            {/if}
          </div>

          <div class="photo-actions">
            {#if filePreviewUrl}
              <button
                type="button"
                class="photo-action-btn remove"
                on:click={handleRemoveFile}
                title="Cancel new photo"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Cancel
              </button>
            {:else if member?.photoURL && file !== "REMOVE_PHOTO"}
              <button
                type="button"
                class="photo-action-btn remove"
                on:click={handleRemoveCurrentPhoto}
                title="Remove current photo"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Remove Photo
              </button>
            {/if}

            <button
              type="button"
              class="photo-action-btn change"
              on:click={() => fileInput.click()}
              title="Change photo"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {filePreviewUrl || (member?.photoURL && file !== "REMOVE_PHOTO")
                ? "Change Photo"
                : "Add Photo"}
            </button>
          </div>
        </div>
        <input
          id="edit-photo-upload"
          type="file"
          accept="image/*"
          on:change={handleFileChange}
          bind:this={fileInput}
          style="display:none"
        />

        <label class="input-label" for="edit-cv-upload">CV / Resume</label>
        <div class="cv-upload-container">
          <div class="upload-area cv-upload" on:click={() => cvInput.click()}>
            {#if cvFile === "REMOVE_CV"}
              <div class="upload-placeholder">
                <svg
                  class="upload-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p>
                  <strong>Click to upload CV</strong>
                  <span class="upload-hint">PDF, DOC, DOCX up to 5MB</span>
                </p>
              </div>
            {:else if cvFile && cvFile !== "REMOVE_CV"}
              <div class="cv-preview">
                <div class="cv-file-info">
                  <svg
                    class="file-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div class="cv-details">
                    <div class="cv-filename">{cvFile.name}</div>
                    <div class="cv-size">{(cvFile.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                </div>
                <div class="cv-overlay">
                  <svg
                    class="document-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Click to change</span>
                </div>
              </div>
            {:else if member?.cvURL && member?.cvFileName}
              <div 
                class="cv-preview"
                on:mouseenter={handleCVHover}
                on:mouseleave={handleCVLeave}
              >
                <div class="cv-file-info">
                  <svg
                    class="file-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div class="cv-details">
                    <div class="cv-filename">{member.cvFileName}</div>
                    <div class="cv-uploaded">
                      Uploaded {member.cvUploadedAt ? new Date(member.cvUploadedAt.toDate ? member.cvUploadedAt.toDate() : member.cvUploadedAt).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
                <div class="cv-overlay">
                  <svg
                    class="document-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Hover to preview • Click to change</span>
                </div>
              </div>
            {:else}
              <div class="upload-placeholder">
                <svg
                  class="upload-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p>
                  <strong>Click to upload CV</strong>
                  <span class="upload-hint">PDF, DOC, DOCX up to 5MB</span>
                </p>
              </div>
            {/if}
          </div>

          <div class="cv-actions">
            {#if cvFile && cvFile !== "REMOVE_CV"}
              <button
                type="button"
                class="cv-action-btn remove"
                on:click={handleRemoveCV}
                title="Cancel new CV"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Cancel
              </button>
            {:else if member?.cvURL && cvFile !== "REMOVE_CV"}
              <button
                type="button"
                class="cv-action-btn remove"
                on:click={handleRemoveCurrentCV}
                title="Remove current CV"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Remove CV
              </button>
            {/if}

            {#if member?.cvURL && cvFile !== "REMOVE_CV"}
              <button
                type="button"
                class="cv-action-btn download"
                on:click={() => window.open(member.cvURL, '_blank')}
                title="Download current CV"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download
              </button>
            {/if}

            <button
              type="button"
              class="cv-action-btn change"
              on:click={() => cvInput.click()}
              title="Upload CV"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {cvFile || member?.cvURL ? "Change CV" : "Upload CV"}
            </button>
          </div>
        </div>
        <input
          id="edit-cv-upload"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          on:change={handleCVChange}
          bind:this={cvInput}
          style="display:none"
        />
      </div>

      <footer class="modal-footer">
        <button class="save-btn" on:click={handleSubmit} disabled={loading}>
          {#if loading}
            <span class="spinner" /> Saving...
          {:else}
            Save Changes
          {/if}
        </button>
        <button class="cancel-btn" on:click={close} disabled={loading}>
          Cancel
        </button>
      </footer>
    </div>
  </div>

  <!-- CV Preview Tooltip -->
  <CVPreview 
    cvURL={member?.cvURL}
    cvFileName={member?.cvFileName}
    show={showCVPreview}
    targetElement={cvTargetElement}
  />
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2200;
  }

  .modal {
    background: var(--background);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 420px;
    box-shadow: var(--shadow-lg);
    padding: var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-header h2 {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .close-btn {
    font-size: var(--font-size-xl);
    color: var(--text-secondary);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-1);
    border-radius: var(--radius-md);
    transition: background-color 0.2s ease;
  }

  .close-btn:hover {
    background: var(--secondary);
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .input-label {
    font-weight: 500;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    margin-bottom: var(--spacing-1);
  }

  input[type="text"],
  input[type="email"],
  input[type="date"] {
    padding: var(--spacing-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background: var(--background);
    color: var(--text-primary);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  input[type="text"]:focus,
  input[type="email"]:focus,
  input[type="date"]:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    outline: none;
  }

  /* Date input icon styling for dark mode */
  input[type="date"] {
    color-scheme: light dark;
    position: relative;
  }

  input[type="date"]::-webkit-calendar-picker-indicator {
    background: transparent;
    bottom: 0;
    color: transparent;
    cursor: pointer;
    height: auto;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    width: auto;
    opacity: 0;
  }

  /* Custom calendar icon */
  input[type="date"] {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3e%3cpath fill-rule='evenodd' d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' clip-rule='evenodd'/%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 16px 16px;
    padding-right: 40px;
  }

  /* Dark theme calendar icon */
  [data-theme="dark"] input[type="date"] {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%239ca3af'%3e%3cpath fill-rule='evenodd' d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' clip-rule='evenodd'/%3e%3c/svg%3e");
  }

  /* System dark mode */
  @media (prefers-color-scheme: dark) {
    input[type="date"] {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%239ca3af'%3e%3cpath fill-rule='evenodd' d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' clip-rule='evenodd'/%3e%3c/svg%3e");
    }
  }

  /* Light theme override */
  [data-theme="light"] input[type="date"] {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3e%3cpath fill-rule='evenodd' d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' clip-rule='evenodd'/%3e%3c/svg%3e");
  }

  input.error {
    border-color: var(--error);
  }

  .upload-area {
    border: 2px dashed var(--border);
    border-radius: var(--radius-md);
    padding: var(--spacing-6) var(--spacing-4);
    text-align: center;
    cursor: pointer;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
    font-size: var(--font-size-sm);
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease;
  }

  .upload-area:hover {
    border-color: var(--primary);
    background: var(--surface);
  }

  .upload-area img {
    max-width: 100%;
    max-height: 80px;
    object-fit: contain;
    border-radius: var(--radius-md);
  }

  .upload-hint {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .photo-upload-container {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
    color: var(--text-secondary);
  }

  .upload-placeholder p {
    margin: 0;
    text-align: center;
  }

  .upload-placeholder strong {
    display: block;
    color: var(--text-primary);
    margin-bottom: var(--spacing-1);
  }

  .upload-icon {
    width: 32px;
    height: 32px;
    color: var(--text-secondary);
  }

  .photo-preview {
    position: relative;
    display: inline-block;
  }

  .photo-preview img {
    max-width: 100%;
    max-height: 80px;
    object-fit: contain;
    border-radius: var(--radius-md);
    transition: opacity 0.2s ease;
  }

  .photo-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-1);
    opacity: 0;
    transition: opacity 0.2s ease;
    color: white;
    font-size: var(--font-size-xs);
    font-weight: 500;
  }

  .upload-area:hover .photo-overlay {
    opacity: 1;
  }

  .camera-icon {
    width: 20px;
    height: 20px;
  }

  .photo-actions {
    display: flex;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .photo-action-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-2) var(--spacing-3);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .photo-action-btn.remove {
    background: var(--error);
    color: white;
  }

  .photo-action-btn.remove:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }

  .photo-action-btn.change {
    background: var(--primary);
    color: white;
  }

  .photo-action-btn.change:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
  }

  .photo-action-btn svg {
    width: 14px;
    height: 14px;
  }

  /* CV Upload Styles */
  .cv-upload-container {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .cv-upload {
    min-height: 80px;
  }

  .cv-preview {
    position: relative;
    display: flex;
    align-items: center;
    padding: var(--spacing-3);
    background: var(--surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    transition: all 0.2s ease;
  }

  .cv-file-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    flex: 1;
  }

  .file-icon {
    width: 32px;
    height: 32px;
    color: var(--primary);
    flex-shrink: 0;
  }

  .cv-details {
    flex: 1;
    min-width: 0;
  }

  .cv-filename {
    font-weight: 500;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cv-size {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-top: var(--spacing-1);
  }

  .cv-uploaded {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-top: var(--spacing-1);
  }

  .cv-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-1);
    opacity: 0;
    transition: opacity 0.2s ease;
    color: white;
    font-size: var(--font-size-xs);
    font-weight: 500;
  }

  .cv-upload:hover .cv-overlay {
    opacity: 1;
  }

  .document-icon {
    width: 20px;
    height: 20px;
  }

  .cv-actions {
    display: flex;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .cv-action-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-2) var(--spacing-3);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cv-action-btn.remove {
    background: var(--error);
    color: white;
  }

  .cv-action-btn.remove:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }

  .cv-action-btn.download {
    background: var(--secondary);
    color: var(--text-primary);
  }

  .cv-action-btn.download:hover {
    background: var(--surface);
    transform: translateY(-1px);
  }

  .cv-action-btn.change {
    background: var(--primary);
    color: white;
  }

  .cv-action-btn.change:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
  }

  .cv-action-btn svg {
    width: 14px;
    height: 14px;
  }

  .error-message {
    color: var(--error);
    font-size: var(--font-size-sm);
    padding: var(--spacing-2);
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--radius-md);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .modal-footer {
    display: flex;
    gap: var(--spacing-3);
    padding-top: var(--spacing-2);
  }

  .cancel-btn {
    background: transparent;
    color: var(--text-secondary);
    padding: var(--spacing-3) var(--spacing-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
  }

  .cancel-btn:hover:not(:disabled) {
    background: var(--secondary);
    color: var(--text-primary);
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: white;
    border-radius: 50%;
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .save-btn {
    background: var(--primary);
    color: white;
    padding: var(--spacing-3) var(--spacing-5);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    flex: 1;
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .save-btn:not(:disabled):hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  /* Responsive design */
  @media (max-width: 480px) {
    .modal {
      margin: var(--spacing-4);
      max-width: none;
      width: auto;
    }

    .modal-footer {
      flex-direction: column-reverse;
    }

    .cancel-btn,
    .save-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
