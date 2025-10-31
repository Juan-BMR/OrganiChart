<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import Header from "$lib/components/layout/Header.svelte";
  import { authStore } from "$lib/stores/auth.js";
  import { organizationsStore } from "$lib/stores/organizations.js";
  import { membersStore } from "$lib/stores/members.js";
  import { insightsStore } from "$lib/stores/insights.js";

  let user = null;
  let organizationId = null;
  let organization = null;
  let members = [];
  let membersLoading = true;
  let insights = null;
  let insightsLoading = false;

  // Subscribe to auth and organization param
  onMount(() => {
    const authUnsub = authStore.subscribe(({ user: u, loading }) => {
      if (!loading) {
        if (!u) {
          goto("/login");
        } else {
          user = u;
        }
      }
    });

    // Get param
    const pageUnsub = page.subscribe(($page) => {
      organizationId = $page.params.id;
    });

    // Also fetch organization details
    const orgUnsub = organizationsStore.subscribe(({ organizations }) => {
      organization = organizations.find((o) => o.id === organizationId);
    });

    // Subscribe to members
    const membersUnsub = membersStore.subscribe(({ members: m, loading }) => {
      members = m;
      membersLoading = loading;
    });

    // Subscribe to insights
    const insightsUnsub = insightsStore.subscribe((data) => {
      insights = data.insights;
      insightsLoading = data.loading;
    });

    // Cleanup
    return () => {
      authUnsub();
      pageUnsub();
      orgUnsub();
      membersUnsub();
      insightsUnsub();
      membersStore.stop();
    };
  });

  // Reactive: Load insights when organizationId and members change
  $: if (organizationId && members.length > 0 && !insightsLoading && !insights) {
    generateInsights();
  }

  async function generateInsights() {
    if (!organizationId || members.length === 0) return;
    await insightsStore.generateInsights(organizationId, members);
  }

  function refreshInsights() {
    insightsStore.clearInsights();
    generateInsights();
  }
</script>

<svelte:head>
  <title>{organization ? organization.name + " Insights" : "Org Insights"} - OrganiChart</title>
</svelte:head>

<Header {user} />

{#if user}
  <div class="insights-page">
    <div class="insights-header">
      <div class="header-content">
        <h1>{organization?.name} Organization Insights</h1>
        <p>AI-powered analysis of your organizational structure</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" on:click={refreshInsights} disabled={insightsLoading}>
          {#if insightsLoading}
            <div class="spinner"></div>
            Analyzing...
          {:else}
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Refresh Analysis
          {/if}
        </button>
        <button class="btn-primary" on:click={() => goto(`/org/${organizationId}/chart`)}>
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          View Chart
        </button>
      </div>
    </div>

    {#if membersLoading}
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading organization data...</p>
      </div>
    {:else if insightsLoading}
      <div class="loading-state">
        <div class="ai-thinking">
          <div class="ai-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
          </div>
          <div class="thinking-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
        <p>AI is analyzing your organization structure...</p>
        <p class="loading-subtitle">This may take a few moments</p>
      </div>
    {:else if insights}
      <div class="insights-content">
        <!-- Overview Cards -->
        <div class="insights-grid">
          <div class="insight-card">
            <div class="card-header">
              <div class="card-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <div class="card-title">Team Size</div>
            </div>
            <div class="card-value">{insights.overview.totalMembers}</div>
            <div class="card-description">Total team members</div>
          </div>

          <div class="insight-card">
            <div class="card-header">
              <div class="card-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
              </div>
              <div class="card-title">Management Levels</div>
            </div>
            <div class="card-value">{insights.overview.hierarchyDepth}</div>
            <div class="card-description">Levels of management</div>
          </div>

          <div class="insight-card">
            <div class="card-header">
              <div class="card-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>
              <div class="card-title">Span of Control</div>
            </div>
            <div class="card-value">{insights.overview.averageSpanOfControl.toFixed(1)}</div>
            <div class="card-description">Average direct reports per manager</div>
          </div>

          <div class="insight-card">
            <div class="card-header">
              <div class="card-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div class="card-title">Role Diversity</div>
            </div>
            <div class="card-value">{insights.overview.uniqueRoles}</div>
            <div class="card-description">Different job roles</div>
          </div>
        </div>

        <!-- AI Insights Section -->
        <div class="insights-section">
          <h2>AI Analysis & Recommendations</h2>

          <div class="insights-cards">
            {#each insights.analysis as analysis}
              <div class="analysis-card" class:positive={analysis.type === 'positive'} class:warning={analysis.type === 'warning'} class:suggestion={analysis.type === 'suggestion'}>
                <div class="analysis-header">
                  <div class="analysis-icon">
                    {#if analysis.type === 'positive'}
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    {:else if analysis.type === 'warning'}
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>
                    {:else}
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                      </svg>
                    {/if}
                  </div>
                  <div class="analysis-title">{analysis.title}</div>
                </div>
                <div class="analysis-content">
                  <p>{analysis.description}</p>
                  {#if analysis.metrics}
                    <div class="analysis-metrics">
                      {#each Object.entries(analysis.metrics) as [key, value]}
                        <div class="metric">
                          <span class="metric-label">{key}:</span>
                          <span class="metric-value">{value}</span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Role Distribution Chart -->
        <div class="insights-section">
          <h2>Role Distribution</h2>
          <div class="chart-container">
            <div class="role-chart">
              {#each Object.entries(insights.roleDistribution) as [role, count]}
                <div class="role-bar">
                  <div class="role-name">{role}</div>
                  <div class="role-bar-container">
                    <div
                      class="role-bar-fill"
                      style="width: {(count / Math.max(...Object.values(insights.roleDistribution))) * 100}%"
                    ></div>
                  </div>
                  <div class="role-count">{count}</div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div class="empty-state">
        <div class="empty-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
        </div>
        <h3>No insights available</h3>
        <p>Unable to analyze the organization structure at this time.</p>
        <button class="btn-primary" on:click={refreshInsights}>Try Again</button>
      </div>
    {/if}
  </div>
{:else}
  <div class="loading-state">
    <div class="loading-spinner"></div>
    <p>Authenticating...</p>
  </div>
{/if}

<style>
  .insights-page {
    min-height: 100vh;
    background: var(--background);
    padding: 0;
  }

  .insights-header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: var(--spacing-6) var(--spacing-8);
  }

  .header-content h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 var(--spacing-2) 0;
  }

  .header-content p {
    color: var(--text-secondary);
    margin: 0;
    font-size: var(--font-size-base);
  }

  .header-actions {
    display: flex;
    gap: var(--spacing-3);
    margin-top: var(--spacing-4);
  }

  .btn-primary, .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-4);
    font-size: var(--font-size-sm);
    font-weight: 500;
    border-radius: var(--radius-lg);
    transition: all 0.2s ease;
    cursor: pointer;
    border: none;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .btn-secondary {
    background: var(--surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--secondary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .icon {
    width: 16px;
    height: 16px;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-radius: 50%;
    border-top-color: var(--primary);
    animation: spin 1s ease-in-out infinite;
    margin-bottom: var(--spacing-4);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-state p {
    color: var(--text-secondary);
    margin: var(--spacing-2) 0;
  }

  .loading-subtitle {
    font-size: var(--font-size-sm);
    color: var(--text-tertiary);
  }

  .ai-thinking {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: var(--spacing-4);
  }

  .ai-icon {
    width: 48px;
    height: 48px;
    color: var(--primary);
    margin-bottom: var(--spacing-3);
  }

  .thinking-dots {
    display: flex;
    gap: var(--spacing-1);
  }

  .dot {
    width: 8px;
    height: 8px;
    background: var(--primary);
    border-radius: 50%;
    animation: thinking 1.4s ease-in-out infinite;
  }

  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes thinking {
    0%, 80%, 100% {
      opacity: 0.3;
      transform: scale(0.8);
    }
    40% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .insights-content {
    padding: var(--spacing-8);
    max-width: 1200px;
    margin: 0 auto;
  }

  .insights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-6);
    margin-bottom: var(--spacing-8);
  }

  .insight-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-6);
    transition: all 0.2s ease;
  }

  .insight-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-4);
  }

  .card-icon {
    width: 40px;
    height: 40px;
    background: var(--primary);
    color: white;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-icon svg {
    width: 20px;
    height: 20px;
  }

  .card-title {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .card-value {
    font-size: var(--font-size-3xl);
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--spacing-2);
  }

  .card-description {
    font-size: var(--font-size-sm);
    color: var(--text-tertiary);
  }

  .insights-section {
    margin-bottom: var(--spacing-8);
  }

  .insights-section h2 {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-6);
  }

  .insights-cards {
    display: grid;
    gap: var(--spacing-4);
  }

  .analysis-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-6);
    transition: all 0.2s ease;
  }

  .analysis-card:hover {
    box-shadow: var(--shadow-sm);
  }

  .analysis-card.positive {
    border-left: 4px solid #10b981;
  }

  .analysis-card.positive .analysis-icon {
    background: #d1fae5;
    color: #065f46;
  }

  .analysis-card.warning {
    border-left: 4px solid #f59e0b;
  }

  .analysis-card.warning .analysis-icon {
    background: #fef3c7;
    color: #92400e;
  }

  .analysis-card.suggestion {
    border-left: 4px solid #3b82f6;
  }

  .analysis-card.suggestion .analysis-icon {
    background: #dbeafe;
    color: #1e40af;
  }

  .analysis-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-3);
  }

  .analysis-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .analysis-icon svg {
    width: 16px;
    height: 16px;
  }

  .analysis-title {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
  }

  .analysis-content p {
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-3) 0;
    line-height: 1.6;
  }

  .analysis-metrics {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
  }

  .metric {
    background: var(--background);
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }

  .metric-label {
    color: var(--text-secondary);
    margin-right: var(--spacing-1);
  }

  .metric-value {
    font-weight: 500;
    color: var(--text-primary);
  }

  .chart-container {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-6);
  }

  .role-chart {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .role-bar {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .role-name {
    min-width: 120px;
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-primary);
  }

  .role-bar-container {
    flex: 1;
    height: 24px;
    background: var(--background);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .role-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--primary-dark));
    border-radius: var(--radius-sm);
    transition: width 0.5s ease;
  }

  .role-count {
    min-width: 40px;
    text-align: right;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    padding: var(--spacing-8);
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    color: var(--text-tertiary);
    margin-bottom: var(--spacing-4);
  }

  .empty-state h3 {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-2);
  }

  .empty-state p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-6);
    max-width: 400px;
  }

  @media (max-width: 768px) {
    .insights-header {
      padding: var(--spacing-4);
    }

    .header-content h1 {
      font-size: var(--font-size-xl);
    }

    .header-actions {
      flex-direction: column;
      width: 100%;
    }

    .btn-primary, .btn-secondary {
      justify-content: center;
      width: 100%;
    }

    .insights-content {
      padding: var(--spacing-4);
    }

    .insights-grid {
      grid-template-columns: 1fr;
      gap: var(--spacing-4);
    }

    .role-name {
      min-width: 80px;
      font-size: var(--font-size-xs);
    }

    .role-count {
      min-width: 30px;
      font-size: var(--font-size-xs);
    }
  }
</style>