<script>
  import { analyzeOrgHealth } from "$lib/orgchart/analyzeOrgHealth";
  import { membersStore } from "$lib/stores/members";
  import { isThinking } from "$lib/stores/chat";
  
  export let open = false;
  export let organizationId = "";
  
  let metrics = null;
  let aiInsights = "";
  let activeTab = "overview";
  let loading = false;
  let error = null;
  
  $: members = $membersStore.members || [];
  
  async function runAnalysis() {
    if (!members.length) return;
    
    loading = true;
    error = null;
    
    try {
      // Run local analysis
      metrics = analyzeOrgHealth(members);
      
      // Get AI insights
      await getAIInsights();
    } catch (err) {
      console.error("Analysis failed:", err);
      error = err.message || "Analysis failed";
    } finally {
      loading = false;
    }
  }
  
  async function getAIInsights() {
    if (!metrics) return;
    
    $isThinking = true;
    
    try {
      const response = await fetch("/api/ai-org-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics, organizationId })
      });
      
      if (!response.ok) throw new Error("Failed to get AI insights");
      
      const data = await response.json();
      aiInsights = data.insights;
    } catch (err) {
      console.error("AI insights failed:", err);
      aiInsights = "Unable to generate AI insights at this time.";
    } finally {
      $isThinking = false;
    }
  }
  
  function close() {
    open = false;
    metrics = null;
    aiInsights = "";
    activeTab = "overview";
  }
  
  function formatPercentage(value) {
    return value.toFixed(1) + "%";
  }
  
  function getRiskBadgeClass(risk) {
    const classes = {
      critical: "badge-critical",
      high: "badge-high",
      medium: "badge-medium",
      low: "badge-low"
    };
    return classes[risk] || "";
  }
  
  $: if (open && members.length > 0) {
    runAnalysis();
  }
</script>

{#if open}
  <div class="modal-backdrop" on:click={close} />
  <div class="modal">
    <div class="modal-header">
      <h2>Organization Health Analysis</h2>
      <button class="close-btn" on:click={close}>×</button>
    </div>
    
    {#if loading}
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Analyzing organization structure...</p>
      </div>
    {:else if error}
      <div class="error-container">
        <p>Error: {error}</p>
      </div>
    {:else if metrics}
      <div class="tabs">
        <button 
          class="tab {activeTab === 'overview' ? 'active' : ''}"
          on:click={() => activeTab = 'overview'}
        >
          Overview
        </button>
        <button 
          class="tab {activeTab === 'management' ? 'active' : ''}"
          on:click={() => activeTab = 'management'}
        >
          Management
        </button>
        <button 
          class="tab {activeTab === 'risks' ? 'active' : ''}"
          on:click={() => activeTab = 'risks'}
        >
          Risks & Gaps
        </button>
        <button 
          class="tab {activeTab === 'ai-insights' ? 'active' : ''}"
          on:click={() => activeTab = 'ai-insights'}
        >
          AI Insights
        </button>
      </div>
      
      <div class="content">
        {#if activeTab === "overview"}
          <div class="metrics-grid">
            <div class="metric-card">
              <h3>Total Members</h3>
              <div class="metric-value">{metrics.totalMembers}</div>
            </div>
            
            <div class="metric-card">
              <h3>Organization Depth</h3>
              <div class="metric-value">{metrics.maxDepth} levels</div>
              {#if metrics.maxDepth > 5}
                <p class="warning">Deep hierarchy may slow communication</p>
              {/if}
            </div>
            
            <div class="metric-card">
              <h3>Avg Span of Control</h3>
              <div class="metric-value">{metrics.averageSpanOfControl.toFixed(1)}</div>
              <p class="info">Optimal: 5-7 direct reports</p>
            </div>
            
            <div class="metric-card">
              <h3>Orphaned Members</h3>
              <div class="metric-value {metrics.orphanedMembers.length > 0 ? 'error' : 'success'}">
                {metrics.orphanedMembers.length}
              </div>
              {#if metrics.orphanedMembers.length > 0}
                <p class="warning">Members with invalid managers</p>
              {/if}
            </div>
          </div>
          
          <div class="distribution-section">
            <h3>Team Distribution by Level</h3>
            <div class="distribution-bars">
              {#each metrics.teamDistribution as level}
                <div class="level-row">
                  <span class="level-label">Level {level.level + 1}</span>
                  <div class="bar-container">
                    <div 
                      class="bar"
                      style="width: {level.percentage}%"
                    >
                      {level.count}
                    </div>
                  </div>
                  <span class="percentage">{formatPercentage(level.percentage)}</span>
                </div>
              {/each}
            </div>
          </div>
        
        {:else if activeTab === "management"}
          <div class="issues-list">
            {#if metrics.managersWithIssues.length === 0}
              <p class="success-message">✓ All managers have optimal team sizes</p>
            {:else}
              {#each metrics.managersWithIssues as issue}
                <div class="issue-card">
                  <div class="issue-header">
                    <h4>{issue.manager.name}</h4>
                    <span class="badge {issue.issue === 'too_many' ? 'badge-high' : 'badge-medium'}">
                      {issue.directReports} direct reports
                    </span>
                  </div>
                  <p class="recommendation">{issue.recommendation}</p>
                </div>
              {/each}
            {/if}
          </div>
          
          {#if metrics.orphanedMembers.length > 0}
            <div class="orphaned-section">
              <h3>Orphaned Members</h3>
              <p class="warning">These members have invalid or missing managers:</p>
              <ul>
                {#each metrics.orphanedMembers as member}
                  <li>{member.name} ({member.role})</li>
                {/each}
              </ul>
            </div>
          {/if}
        
        {:else if activeTab === "risks"}
          <div class="risks-section">
            <h3>Communication Risks</h3>
            {#if metrics.communicationRisk.length === 0}
              <p class="success-message">✓ No significant communication risks identified</p>
            {:else}
              {#each metrics.communicationRisk as risk}
                <div class="risk-card">
                  <div class="risk-header">
                    <h4>{risk.member.name}</h4>
                    <span class="badge {getRiskBadgeClass(risk.riskLevel)}">
                      {risk.riskLevel} risk
                    </span>
                  </div>
                  <p>{risk.reason}</p>
                </div>
              {/each}
            {/if}
          </div>
          
          <div class="succession-section">
            <h3>Succession Planning Gaps</h3>
            {#each metrics.successionGaps as gap}
              <div class="succession-card">
                <div class="succession-header">
                  <h4>{gap.position.name} - {gap.position.role}</h4>
                  <span class="badge {getRiskBadgeClass(gap.risk)}">
                    {gap.risk} priority
                  </span>
                </div>
                <p>
                  {#if gap.hasSuccessor}
                    ✓ Has potential successor identified
                  {:else}
                    ⚠️ No clear successor identified
                  {/if}
                </p>
              </div>
            {/each}
          </div>
        
        {:else if activeTab === "ai-insights"}
          <div class="ai-insights">
            {#if $isThinking}
              <div class="thinking-indicator">
                <div class="spinner small"></div>
                <p>Generating AI insights...</p>
              </div>
            {:else if aiInsights}
              <div class="insights-content">
                {@html aiInsights.replace(/\n/g, '<br>')}
              </div>
            {:else}
              <p>Click "Analyze" to generate AI insights about your organization.</p>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }
  
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    z-index: 1000;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-6);
    border-bottom: 1px solid var(--border);
  }
  
  .modal-header h2 {
    margin: 0;
    color: var(--text-primary);
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    color: var(--text-secondary);
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background: var(--surface-secondary);
    color: var(--text-primary);
  }
  
  .tabs {
    display: flex;
    gap: var(--spacing-2);
    padding: 0 var(--spacing-6);
    border-bottom: 1px solid var(--border);
  }
  
  .tab {
    background: none;
    border: none;
    padding: var(--spacing-3) var(--spacing-4);
    color: var(--text-secondary);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  
  .tab:hover {
    color: var(--text-primary);
  }
  
  .tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }
  
  .content {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-6);
  }
  
  .loading-container,
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    color: var(--text-secondary);
  }
  
  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .spinner.small {
    width: 24px;
    height: 24px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-8);
  }
  
  .metric-card {
    background: var(--surface-secondary);
    padding: var(--spacing-4);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
  }
  
  .metric-card h3 {
    margin: 0 0 var(--spacing-2) 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
  
  .metric-value {
    font-size: var(--font-size-2xl);
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .metric-value.error {
    color: var(--danger);
  }
  
  .metric-value.success {
    color: var(--success);
  }
  
  .warning {
    color: var(--warning);
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-2);
  }
  
  .info {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-2);
  }
  
  .distribution-section {
    margin-top: var(--spacing-6);
  }
  
  .distribution-section h3 {
    margin-bottom: var(--spacing-4);
  }
  
  .level-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-3);
  }
  
  .level-label {
    width: 80px;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
  
  .bar-container {
    flex: 1;
    height: 32px;
    background: var(--surface-secondary);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  
  .bar {
    height: 100%;
    background: linear-gradient(135deg, var(--primary), #8b5cf6);
    display: flex;
    align-items: center;
    padding: 0 var(--spacing-2);
    color: white;
    font-size: var(--font-size-sm);
    transition: width 0.3s ease;
  }
  
  .percentage {
    width: 50px;
    text-align: right;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
  
  .issues-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }
  
  .issue-card,
  .risk-card,
  .succession-card {
    background: var(--surface-secondary);
    padding: var(--spacing-4);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
  }
  
  .issue-header,
  .risk-header,
  .succession-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-2);
  }
  
  .issue-header h4,
  .risk-header h4,
  .succession-header h4 {
    margin: 0;
    color: var(--text-primary);
  }
  
  .badge {
    padding: var(--spacing-1) var(--spacing-3);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }
  
  .badge-critical {
    background: var(--danger);
    color: white;
  }
  
  .badge-high {
    background: var(--warning);
    color: white;
  }
  
  .badge-medium {
    background: #f59e0b;
    color: white;
  }
  
  .badge-low {
    background: var(--success);
    color: white;
  }
  
  .recommendation {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin: 0;
  }
  
  .success-message {
    color: var(--success);
    font-size: var(--font-size-base);
    padding: var(--spacing-4);
    background: color-mix(in srgb, var(--success) 10%, transparent);
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--success) 20%, transparent);
  }
  
  .orphaned-section,
  .risks-section,
  .succession-section {
    margin-top: var(--spacing-6);
  }
  
  .orphaned-section h3,
  .risks-section h3,
  .succession-section h3 {
    margin-bottom: var(--spacing-4);
  }
  
  .orphaned-section ul {
    list-style: none;
    padding: 0;
  }
  
  .orphaned-section li {
    padding: var(--spacing-2) 0;
    color: var(--text-secondary);
  }
  
  .ai-insights {
    min-height: 300px;
  }
  
  .thinking-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    color: var(--text-secondary);
  }
  
  .insights-content {
    line-height: 1.6;
    color: var(--text-primary);
  }
</style>