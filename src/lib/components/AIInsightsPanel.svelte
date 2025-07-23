<script>
  import { sendMessage } from "$lib/stores/chat";
  import { onMount } from "svelte";

  export let organizationId = "";
  
  let insights = null;
  let loading = false;
  let error = null;

  async function generateInsights() {
    if (!organizationId) return;
    
    loading = true;
    error = null;
    
    try {
      // Use the AI agent to generate org analysis
      const response = await sendMessage("Generate a comprehensive analysis and insights about this organization structure", {
        useAgent: true,
        orgId: organizationId
      });
      
      // Also call the analysis endpoint directly for structured data
      await analyzeOrganization();
    } catch (err) {
      error = err.message || "Failed to generate insights";
    } finally {
      loading = false;
    }
  }

  async function analyzeOrganization() {
    try {
      const response = await fetch("/api/ai-agent-enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Analyze the current organization structure and provide insights",
          orgId: organizationId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Analysis completed:", data);
      }
    } catch (err) {
      console.error("Analysis error:", err);
    }
  }

  onMount(() => {
    if (organizationId) {
      generateInsights();
    }
  });
</script>

<div class="insights-panel">
  <div class="panel-header">
    <h3>🤖 AI Insights</h3>
    <button class="refresh-btn" on:click={generateInsights} disabled={loading}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M8 12l4-4 4 4"/>
        <path d="M16 16l-4 4-4-4"/>
      </svg>
      {loading ? 'Analyzing...' : 'Refresh'}
    </button>
  </div>

  <div class="panel-content">
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>AI is analyzing your organization structure...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <p>Error: {error}</p>
        <button on:click={generateInsights}>Try Again</button>
      </div>
    {:else}
      <div class="insights-grid">
        <div class="quick-actions">
          <h4>Quick AI Actions</h4>
          <div class="action-buttons">
            <button class="action-btn" on:click={() => sendMessage("What organizational improvements would you recommend?", { useAgent: true, orgId: organizationId })}>
              🎯 Get Recommendations
            </button>
            <button class="action-btn" on:click={() => sendMessage("Analyze the management structure and spans of control", { useAgent: true, orgId: organizationId })}>
              📊 Management Analysis
            </button>
            <button class="action-btn" on:click={() => sendMessage("Identify potential bottlenecks in the organization", { useAgent: true, orgId: organizationId })}>
              ⚠️ Find Bottlenecks
            </button>
            <button class="action-btn" on:click={() => sendMessage("Suggest role clarifications and improvements", { useAgent: true, orgId: organizationId })}>
              🔍 Role Analysis
            </button>
          </div>
        </div>

        <div class="ai-suggestions">
          <h4>AI Suggestions</h4>
          <div class="suggestion-list">
            <div class="suggestion-item">
              <span class="suggestion-icon">💡</span>
              <div>
                <strong>Smart Restructuring</strong>
                <p>Ask AI to suggest optimal team structures based on current workload and reporting patterns.</p>
              </div>
            </div>
            <div class="suggestion-item">
              <span class="suggestion-icon">🎯</span>
              <div>
                <strong>Gap Analysis</strong>
                <p>Identify missing roles or redundancies in your current structure.</p>
              </div>
            </div>
            <div class="suggestion-item">
              <span class="suggestion-icon">📈</span>
              <div>
                <strong>Growth Planning</strong>
                <p>Get recommendations for scaling your team effectively.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="quick-commands">
          <h4>Try These Commands</h4>
          <div class="command-list">
            <code>"Add a new developer under John Smith"</code>
            <code>"Who reports to Sarah Wilson?"</code>
            <code>"Move Mike to the engineering team"</code>
            <code>"What's the current team structure?"</code>
            <code>"Suggest improvements for management spans"</code>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .insights-panel {
    background: var(--surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4);
    border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, var(--primary), #8b5cf6);
    color: white;
  }

  .panel-header h3 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: all 0.2s ease;
  }

  .refresh-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .panel-content {
    padding: var(--spacing-4);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-6);
    text-align: center;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-top: 3px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-state {
    text-align: center;
    padding: var(--spacing-6);
    color: var(--error);
  }

  .insights-grid {
    display: grid;
    gap: var(--spacing-6);
  }

  .quick-actions h4,
  .ai-suggestions h4,
  .quick-commands h4 {
    margin: 0 0 var(--spacing-3) 0;
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
  }

  .action-buttons {
    display: grid;
    gap: var(--spacing-2);
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    transition: all 0.2s ease;
    text-align: left;
  }

  .action-btn:hover {
    background: var(--surface-variant);
    border-color: var(--primary);
    transform: translateY(-1px);
  }

  .suggestion-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .suggestion-item {
    display: flex;
    gap: var(--spacing-3);
    padding: var(--spacing-3);
    background: var(--surface-variant);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
  }

  .suggestion-icon {
    font-size: var(--font-size-lg);
    flex-shrink: 0;
  }

  .suggestion-item strong {
    display: block;
    margin-bottom: var(--spacing-1);
    color: var(--text-primary);
    font-weight: 600;
  }

  .suggestion-item p {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .command-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .command-list code {
    display: block;
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--surface-variant);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .command-list code:hover {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }
</style>