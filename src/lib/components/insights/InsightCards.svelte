<script lang="ts">
  import type { OrgHealthMetrics } from "$lib/insights/analyzer";
  
  export let metrics: OrgHealthMetrics;
  
  function getHealthColor(score: number): string {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  }
  
  function getHealthLabel(score: number): string {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Attention";
  }
</script>

<div class="metrics-grid">
  <!-- Overall Health Card -->
  <div class="metric-card highlight">
    <div class="metric-header">
      <h3>Overall Health Score</h3>
      <span class="health-badge" style="background-color: {getHealthColor(metrics.overallHealth)}">
        {getHealthLabel(metrics.overallHealth)}
      </span>
    </div>
    <div class="metric-value">
      <span class="score" style="color: {getHealthColor(metrics.overallHealth)}">
        {metrics.overallHealth}
      </span>
      <span class="score-max">/100</span>
    </div>
    <div class="metric-chart">
      <div class="progress-bar">
        <div 
          class="progress-fill"
          style="width: {metrics.overallHealth}%; background-color: {getHealthColor(metrics.overallHealth)}"
        ></div>
      </div>
    </div>
  </div>

  <!-- Manager Load Card -->
  <div class="metric-card">
    <div class="metric-header">
      <h3>Manager Load</h3>
      {#if metrics.managerLoad.filter(m => m.isOverloaded).length > 0}
        <span class="alert-badge">Alert</span>
      {/if}
    </div>
    <div class="metric-stats">
      <div class="stat">
        <span class="stat-value">{metrics.managerLoad.length}</span>
        <span class="stat-label">Total Managers</span>
      </div>
      <div class="stat">
        <span class="stat-value warn">
          {metrics.managerLoad.filter(m => m.isOverloaded).length}
        </span>
        <span class="stat-label">Overloaded</span>
      </div>
    </div>
    {#if metrics.managerLoad.filter(m => m.isOverloaded).length > 0}
      <div class="metric-detail">
        <p class="detail-text">
          Managers with >8 direct reports need support
        </p>
      </div>
    {/if}
  </div>

  <!-- Succession Risk Card -->
  <div class="metric-card">
    <div class="metric-header">
      <h3>Succession Planning</h3>
      {#if metrics.successionRisks.filter(r => r.riskScore > 0.7).length > 0}
        <span class="alert-badge critical">Critical</span>
      {/if}
    </div>
    <div class="metric-stats">
      <div class="stat">
        <span class="stat-value">
          {metrics.successionRisks.filter(r => r.riskScore > 0.7).length}
        </span>
        <span class="stat-label">High Risk Roles</span>
      </div>
      <div class="stat">
        <span class="stat-value">
          {metrics.successionRisks.filter(r => r.potentialSuccessors.length > 0).length}
        </span>
        <span class="stat-label">With Successors</span>
      </div>
    </div>
  </div>

  <!-- Turnover Risk Card -->
  <div class="metric-card">
    <div class="metric-header">
      <h3>Retention Risk</h3>
      {#if metrics.turnoverRisks.length > 0}
        <span class="alert-badge">Monitor</span>
      {/if}
    </div>
    <div class="metric-stats">
      <div class="stat">
        <span class="stat-value warn">{metrics.turnoverRisks.length}</span>
        <span class="stat-label">At Risk</span>
      </div>
      <div class="stat">
        <span class="stat-value">
          {Math.round(metrics.turnoverRisks.reduce((sum, r) => sum + r.riskScore, 0) / metrics.turnoverRisks.length * 100) || 0}%
        </span>
        <span class="stat-label">Avg Risk Score</span>
      </div>
    </div>
  </div>

  <!-- Diversity Card -->
  <div class="metric-card">
    <div class="metric-header">
      <h3>Diversity Score</h3>
    </div>
    <div class="metric-value small">
      <span class="score">{Math.round(metrics.diversityMetrics.overall * 100)}</span>
      <span class="score-max">%</span>
    </div>
    <div class="metric-detail">
      <p class="detail-text">
        Across {Object.keys(metrics.diversityMetrics.byDepartment).length} departments
      </p>
    </div>
  </div>

  <!-- Team Balance Card -->
  <div class="metric-card">
    <div class="metric-header">
      <h3>Team Balance</h3>
    </div>
    <div class="metric-stats">
      <div class="stat">
        <span class="stat-value">{metrics.teamSizes.length}</span>
        <span class="stat-label">Departments</span>
      </div>
      <div class="stat">
        <span class="stat-value">
          {Math.round(metrics.teamSizes.reduce((sum, t) => sum + t.size, 0) / metrics.teamSizes.length)}
        </span>
        <span class="stat-label">Avg Size</span>
      </div>
    </div>
  </div>
</div>

<style>
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .metric-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    transition: all 0.2s;
  }

  .metric-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .metric-card.highlight {
    grid-column: span 2;
    background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
    border: 2px solid #e5e7eb;
  }

  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .metric-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
  }

  .health-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    color: white;
  }

  .alert-badge {
    padding: 0.25rem 0.5rem;
    background: #fbbf24;
    color: #78350f;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .alert-badge.critical {
    background: #ef4444;
    color: white;
  }

  .metric-value {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }

  .metric-value.small {
    margin-bottom: 0.5rem;
  }

  .score {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
  }

  .metric-value.small .score {
    font-size: 2rem;
  }

  .score-max {
    font-size: 1.5rem;
    font-weight: 400;
    color: #9ca3af;
  }

  .metric-chart {
    margin-top: 1rem;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    transition: width 0.5s ease;
  }

  .metric-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .stat {
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }

  .stat-value.warn {
    color: #f59e0b;
  }

  .stat-label {
    display: block;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .metric-detail {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .detail-text {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
  }

  @media (max-width: 768px) {
    .metric-card.highlight {
      grid-column: span 1;
    }
  }
</style>