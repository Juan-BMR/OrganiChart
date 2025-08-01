<script lang="ts">
  import { onMount } from "svelte";
  import { fade, slide } from "svelte/transition";
  import PredictiveAlerts from "./PredictiveAlerts.svelte";
  import QueryInterface from "./QueryInterface.svelte";
  import InsightCards from "./InsightCards.svelte";
  import type { OrgHealthMetrics, AIRecommendation } from "$lib/insights/analyzer";

  export let organizationId: string;

  let loading = false;
  let error: string | null = null;
  let metrics: OrgHealthMetrics | null = null;
  let recommendations: AIRecommendation[] = [];
  let activeTab: "overview" | "alerts" | "query" = "overview";

  async function loadInsights() {
    loading = true;
    error = null;

    try {
      const response = await fetch("/api/insights/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId })
      });

      if (!response.ok) {
        throw new Error("Failed to load insights");
      }

      const data = await response.json();
      metrics = data.metrics;
      recommendations = data.recommendations;
    } catch (err) {
      error = err instanceof Error ? err.message : "An error occurred";
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadInsights();
  });
</script>

<div class="insights-panel">
  <div class="panel-header">
    <h2>Organizational Insights</h2>
    <button 
      class="refresh-btn"
      on:click={loadInsights}
      disabled={loading}
    >
      {#if loading}
        <span class="spinner"></span>
      {:else}
        ↻ Refresh
      {/if}
    </button>
  </div>

  <div class="tab-navigation">
    <button
      class="tab"
      class:active={activeTab === "overview"}
      on:click={() => activeTab = "overview"}
    >
      Overview
    </button>
    <button
      class="tab"
      class:active={activeTab === "alerts"}
      on:click={() => activeTab = "alerts"}
    >
      Alerts & Recommendations
    </button>
    <button
      class="tab"
      class:active={activeTab === "query"}
      on:click={() => activeTab = "query"}
    >
      Ask AI
    </button>
  </div>

  <div class="panel-content">
    {#if error}
      <div class="error-message" transition:fade>
        <span class="error-icon">⚠️</span>
        {error}
      </div>
    {:else if loading && !metrics}
      <div class="loading-state">
        <div class="spinner large"></div>
        <p>Analyzing your organization...</p>
      </div>
    {:else if metrics}
      {#if activeTab === "overview"}
        <div transition:fade>
          <InsightCards {metrics} />
        </div>
      {:else if activeTab === "alerts"}
        <div transition:fade>
          <PredictiveAlerts {metrics} {recommendations} />
        </div>
      {:else if activeTab === "query"}
        <div transition:fade>
          <QueryInterface {organizationId} {metrics} />
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .insights-panel {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .panel-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .refresh-btn:hover:not(:disabled) {
    background: #5558e3;
  }

  .refresh-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .tab-navigation {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .tab {
    flex: 1;
    padding: 1rem;
    background: none;
    border: none;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .tab:hover {
    color: #4b5563;
  }

  .tab.active {
    color: #6366f1;
  }

  .tab.active::after {
    content: "";
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: #6366f1;
  }

  .panel-content {
    padding: 1.5rem;
    min-height: 400px;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    color: #dc2626;
    font-size: 0.875rem;
  }

  .error-icon {
    font-size: 1.25rem;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: #6b7280;
  }

  .loading-state p {
    margin-top: 1rem;
    font-size: 0.875rem;
  }

  .spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid #e5e7eb;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .spinner.large {
    width: 2.5rem;
    height: 2.5rem;
    border-width: 3px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>