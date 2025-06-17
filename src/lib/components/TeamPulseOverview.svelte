<script>
  import { onMount, onDestroy } from "svelte";
  import { teamPulseStore } from "$lib/stores/pulse.js";
  import Chart from "chart.js/auto";

  export let organizationId;

  // Local copies of store slices
  let metrics = [];
  let insights = [];
  let loading = true;
  let error = null;

  // Chart.js instances
  let workloadChart;
  let trendChart;
  let workloadCanvas;
  let trendCanvas;

  // Subscribe to store
  const unsub = teamPulseStore.subscribe(($s) => {
    metrics = $s.metrics;
    insights = $s.insights;
    loading = $s.loading;
    error = $s.error;
  });

  // Manage listeners based on organisation
  onMount(() => {
    if (organizationId) teamPulseStore.listen(organizationId);
  });

  // Clean-up on component destroy
  onDestroy(() => {
    teamPulseStore.stop();
    unsub();
    workloadChart?.destroy();
    trendChart?.destroy();
  });

  // Derived values ----------------------------------------------------------
  $: healthScore = (() => {
    const latest = metrics.find((m) => m.metricKey === "engagement_score");
    return latest?.value ?? null;
  })();

  // Workload distribution data – expects object { low: n, normal: n, high: n }
  $: workloadData = (() => {
    const m = metrics.find((m) => m.metricKey === "workload_distribution");
    return m?.value ?? null;
  })();

  // Engagement trend (array sorted oldest->newest)
  $: trendPoints = (() => {
    return metrics
      .filter((m) => m.metricKey === "engagement_score")
      .sort((a, b) => a.createdAt?.toMillis?.() - b.createdAt?.toMillis?.() || 0)
      .map((m) => ({ x: m.createdAt?.toDate?.() ?? new Date(m.createdAt), y: m.value }));
  })();

  // Critical alerts – simple heuristic for now (insight titles containing "!" or risk keywords)
  $: criticalAlerts = insights.filter((i) => /risk|alert|critical|burnout/i.test(i.title));

  // Chart rendering ---------------------------------------------------------
  $: if (workloadCanvas && workloadData) {
    const labels = Object.keys(workloadData);
    const data = Object.values(workloadData);
    const bg = ["#34d399", "#8b5cf6", "#f87171", "#fbbf24"]; // success, primary, error, warning

    if (!workloadChart) {
      workloadChart = new Chart(workloadCanvas, {
        type: "doughnut",
        data: {
          labels,
          datasets: [
            {
              data,
              backgroundColor: bg.slice(0, data.length),
            },
          ],
        },
        options: {
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: getComputedStyle(document.documentElement).getPropertyValue("--text-secondary"),
              },
            },
          },
        },
      });
    } else {
      workloadChart.data.labels = labels;
      workloadChart.data.datasets[0].data = data;
      workloadChart.update();
    }
  }

  $: if (trendCanvas && trendPoints.length) {
    const labels = trendPoints.map((p) => p.x.toLocaleDateString());
    const data = trendPoints.map((p) => p.y);

    if (!trendChart) {
      trendChart = new Chart(trendCanvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Engagement",
              data,
              borderColor: "#8b5cf6",
              backgroundColor: "rgba(139,92,246,0.2)",
              tension: 0.3,
            },
          ],
        },
        options: {
          scales: {
            y: {
              suggestedMin: 0,
              suggestedMax: 100,
              ticks: {
                color: getComputedStyle(document.documentElement).getPropertyValue("--text-secondary"),
              },
            },
            x: {
              ticks: {
                color: getComputedStyle(document.documentElement).getPropertyValue("--text-secondary"),
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      });
    } else {
      trendChart.data.labels = labels;
      trendChart.data.datasets[0].data = data;
      trendChart.update();
    }
  }
</script>

<style>
  .overview-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--spacing-6);
    padding: var(--spacing-6);
  }

  .card {
    background: var(--surface);
    border-radius: var(--radius-lg);
    padding: var(--spacing-5);
    box-shadow: var(--shadow-md);
  }

  .card h3 {
    font-size: var(--font-size-lg);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-2);
  }

  .health-score {
    font-size: var(--font-size-3xl);
    font-weight: 600;
    color: var(--primary);
  }

  .alerts-list {
    max-height: 150px;
    overflow-y: auto;
    padding-right: var(--spacing-1);
  }

  .alert-item {
    background: var(--error);
    color: #fff;
    padding: var(--spacing-2);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-2);
    font-size: var(--font-size-sm);
  }

  canvas {
    width: 100% !important;
    height: 180px !important;
  }
</style>

{#if loading}
  <div class="overview-container"><p>Loading pulse data…</p></div>
{:else if error}
  <div class="overview-container"><p>Error: {error}</p></div>
{:else}
  <div class="overview-container">
    <!-- Health score card -->
    <div class="card">
      <h3>Team Health Score</h3>
      {#if healthScore !== null}
        <div class="health-score">{Math.round(healthScore)}%</div>
      {:else}
        <p>No data</p>
      {/if}
    </div>

    <!-- Workload distribution chart -->
    <div class="card">
      <h3>Workload Distribution</h3>
      {#if workloadData}
        <canvas bind:this={workloadCanvas}></canvas>
      {:else}
        <p>No data</p>
      {/if}
    </div>

    <!-- Engagement trend chart -->
    <div class="card" style="grid-column: span 2;">
      <h3>Engagement Trend</h3>
      {#if trendPoints.length}
        <canvas bind:this={trendCanvas}></canvas>
      {:else}
        <p>No data</p>
      {/if}
    </div>

    <!-- Critical alerts -->
    <div class="card" style="grid-column: span 2;">
      <h3>Critical Alerts</h3>
      {#if criticalAlerts.length}
        <div class="alerts-list">
          {#each criticalAlerts as alert}
            <div class="alert-item">{alert.title}</div>
          {/each}
        </div>
      {:else}
        <p>No critical alerts 🎉</p>
      {/if}
    </div>
  </div>
{/if}