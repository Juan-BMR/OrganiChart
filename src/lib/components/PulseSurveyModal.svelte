<script>
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import { teamPulseStore } from "$lib/stores/pulse.js";

  export let open = false;
  export let organizationId;

  const dispatch = createEventDispatcher();

  let activeTab = "quick"; // quick | feedback | kudos
  let modalEl;

  // Quick pulse variables
  let mood = null; // 1-5
  let workloadLevel = null; // low, balanced, high

  // Structured feedback
  let feedbackText = "";

  // Recognition
  let kudosText = "";

  let loading = false;
  let submitted = false;
  let error = "";

  // Focus accessibility
  $: if (open && modalEl) modalEl.focus();

  function resetForm() {
    mood = null;
    workloadLevel = null;
    feedbackText = "";
    kudosText = "";
    submitted = false;
    error = "";
  }

  async function handleSubmit() {
    if (!organizationId) {
      error = "Organization ID missing";
      return;
    }

    loading = true;
    error = "";
    try {
      if (activeTab === "quick") {
        if (mood == null && workloadLevel == null) {
          error = "Please answer at least one question.";
          loading = false;
          return;
        }
        if (mood != null) {
          await teamPulseStore.addSurveyAnswer(
            organizationId,
            "mood",
            mood,
            { type: "quick" },
          );
        }
        if (workloadLevel != null) {
          await teamPulseStore.addSurveyAnswer(
            organizationId,
            "workload_level",
            workloadLevel,
            { type: "quick" },
          );
        }
      } else if (activeTab === "feedback") {
        const text = feedbackText.trim();
        if (!text) {
          error = "Feedback cannot be empty.";
          loading = false;
          return;
        }
        await teamPulseStore.addSurveyAnswer(
          organizationId,
          "structured_feedback",
          text,
          { type: "feedback" },
        );
      } else if (activeTab === "kudos") {
        const text = kudosText.trim();
        if (!text) {
          error = "Recognition message cannot be empty.";
          loading = false;
          return;
        }
        await teamPulseStore.addSurveyAnswer(
          organizationId,
          "kudos",
          text,
          { type: "recognition" },
        );
      }
      submitted = true;
      resetForm();
    } catch (e) {
      console.error(e);
      error = e.message || "Failed to submit survey.";
    } finally {
      loading = false;
    }
  }

  function handleClose() {
    resetForm();
    open = false;
    dispatch("close");
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") handleClose();
  }
</script>

{#if open}
  <div class="modal-overlay" on:click|self={handleClose}>
    <div class="modal" tabindex="-1" bind:this={modalEl} on:keydown={handleKeyDown}>
      <header class="modal-header">
        <h2>Team Pulse Survey</h2>
        <button class="close-btn" on:click={handleClose}>×</button>
      </header>

      {#if submitted}
        <div class="modal-body" style="text-align:center; padding: var(--spacing-6);">
          <h3 style="margin-bottom:var(--spacing-4); color:var(--success);">Thank you for your input! 🎉</h3>
          <button class="primary-btn" on:click={handleClose}>Close</button>
        </div>
      {:else}
        <div class="tab-bar">
          <button class:active-tab={activeTab === 'quick'} on:click={() => activeTab='quick'}>Quick Check</button>
          <button class:active-tab={activeTab === 'feedback'} on:click={() => activeTab='feedback'}>Feedback</button>
          <button class:active-tab={activeTab === 'kudos'} on:click={() => activeTab='kudos'}>Recognition</button>
        </div>

        <div class="modal-body">
          {#if activeTab === 'quick'}
            <div class="question-block">
              <p>How is your overall mood today?</p>
              <div class="scale-btns">
                {#each [1,2,3,4,5] as n}
                  <button class:selected={mood===n} on:click={() => mood=n}>{n}</button>
                {/each}
              </div>
            </div>

            <div class="question-block">
              <p>How would you describe your workload?</p>
              <div class="choice-btns">
                {#each [
                  {id:'low', label:'Light'},
                  {id:'balanced', label:'Balanced'},
                  {id:'high', label:'Heavy'}
                ] as opt}
                  <button class:selected={workloadLevel===opt.id} on:click={() => workloadLevel=opt.id}>{opt.label}</button>
                {/each}
              </div>
            </div>
          {:else if activeTab === 'feedback'}
            <label class="input-label">Your feedback</label>
            <textarea rows="6" bind:value={feedbackText} placeholder="Share your thoughts…"></textarea>
          {:else if activeTab === 'kudos'}
            <label class="input-label">Send recognition / kudos</label>
            <textarea rows="5" bind:value={kudosText} placeholder="Give a shout-out…"></textarea>
          {/if}

          {#if error}
            <p class="error-msg">{error}</p>
          {/if}
        </div>

        <footer class="modal-footer">
          <button class="primary-btn" disabled={loading} on:click={handleSubmit}>
            {loading ? 'Submitting…' : 'Submit'}
          </button>
          <button class="secondary-btn" disabled={loading} on:click={handleClose}>Cancel</button>
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:1000;
  }
  .modal {
    background: var(--surface);
    width: 480px;
    max-width: 96vw;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    display:flex;
    flex-direction:column;
    max-height: 90vh;
  }
  .modal-header {
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding: var(--spacing-4);
    border-bottom:1px solid var(--border);
  }
  .close-btn {
    font-size:1.5rem;
    background:none;
    border:none;
    color:var(--text-secondary);
    cursor:pointer;
  }
  .tab-bar {
    display:flex;
    border-bottom:1px solid var(--border);
  }
  .tab-bar button {
    flex:1;
    padding: var(--spacing-3) 0;
    background:none;
    border:none;
    cursor:pointer;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
  .tab-bar button.active-tab {
    color: var(--primary);
    font-weight:600;
    border-bottom:3px solid var(--primary);
  }
  .modal-body {
    padding: var(--spacing-4) var(--spacing-6);
    overflow-y: auto;
    flex:1;
  }
  .modal-footer {
    padding: var(--spacing-4);
    border-top:1px solid var(--border);
    display:flex;
    justify-content:flex-end;
    gap: var(--spacing-3);
  }
  .primary-btn {
    background: var(--primary);
    color:#fff;
    padding: var(--spacing-2) var(--spacing-5);
    border:none;
    border-radius: var(--radius-sm);
    cursor:pointer;
  }
  .primary-btn:disabled { opacity:0.6; cursor: default; }
  .secondary-btn {
    background:none;
    border:1px solid var(--border);
    padding: var(--spacing-2) var(--spacing-5);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    cursor:pointer;
  }
  .question-block { margin-bottom: var(--spacing-5); }
  .scale-btns button {
    background:none;
    border:1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: var(--spacing-2) var(--spacing-3);
    margin-right: var(--spacing-2);
    cursor:pointer;
    color: var(--text-primary);
  }
  .scale-btns button.selected {
    background: var(--primary);
    color:#fff;
    border-color: var(--primary);
  }
  .choice-btns button {
    background:none;
    border:1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: var(--spacing-2) var(--spacing-3);
    margin-right: var(--spacing-2);
    cursor:pointer;
    color: var(--text-primary);
  }
  .choice-btns button.selected {
    background: var(--primary);
    color:#fff;
    border-color: var(--primary);
  }
  textarea {
    width:100%;
    resize:vertical;
    min-height:120px;
    background: var(--surface);
    color: var(--text-primary);
    border:1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: var(--spacing-3);
    font-size:var(--font-size-sm);
  }
  .input-label { font-size:var(--font-size-sm); margin-bottom: var(--spacing-2); display:block; color: var(--text-secondary); }
  .error-msg { color: var(--error); margin-top:var(--spacing-2); }
</style>