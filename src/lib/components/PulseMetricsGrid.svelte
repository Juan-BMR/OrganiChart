<script>
  import { onMount, onDestroy } from "svelte";
  import { teamPulseStore } from "$lib/stores/pulse.js";
  import Chart from "chart.js/auto";

  // Props
  export let organizationId;

  // Store slices
  let metrics = [];
  let loading = true;
  let error = null;

  const unsub = teamPulseStore.subscribe(($s) => {
    metrics = $s.metrics;
    loading = $s.loading;
    error = $s.error;
  });

  // Manage listeners based on org
  onMount(() => {
    if (organizationId) teamPulseStore.listen(organizationId);
  });
  onDestroy(() => {
    teamPulseStore.stop();
    unsub();
    chart?.destroy();
  });

  // Unique metric keys
  $: metricKeys = Array.from(new Set(metrics.map((m) => m.metricKey))).sort();

  let selectedMetric = null;
  $: if (metricKeys.length && !selectedMetric) selectedMetric = metricKeys[0];

  // Time range filter (in days)
  const RANGE_OPTIONS = [30, 90, 180, 365, "all"];
  let selectedRange = 90;

  // Derived dataset for selected metric
  $: filteredPoints = (() => {
    if (!selectedMetric) return [];
    const now = Date.now();
    return metrics
      .filter((m) => m.metricKey === selectedMetric)
      .filter((m) => {
        if (selectedRange === "all") return true;
        const created = m.createdAt?.toMillis?.() ?? new Date(m.createdAt).getTime();
        return now - created <= selectedRange * 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => a.createdAt?.toMillis?.() - b.createdAt?.toMillis?.() || 0)
      .map((m) => ({ x: m.createdAt?.toDate?.() ?? new Date(m.createdAt), y: m.value }));
  })();

  // Chart.js instance
  let chart;
  let canvasEl;

  function renderChart() {
    if (!canvasEl) return;

    const labels = filteredPoints.map((p) => p.x.toLocaleDateString());
    const data = filteredPoints.map((p) => p.y);

    if (!chart) {
      chart = new Chart(canvasEl, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: selectedMetric,
              data,
              borderColor: "#8b5cf6",
              backgroundColor: "rgba(139,92,246,0.2)",
              tension: 0.2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: getComputedStyle(document.documentElement).getPropertyValue("--text-secondary"),
              },
            },
            tooltip: {
              mode: "index",
              intersect: false,
            },
          },
          scales: {
            x: {
              ticks: {
                color: getComputedStyle(document.documentElement).getPropertyValue("--text-secondary"),
              },
            },
            y: {
              ticks: {
                color: getComputedStyle(document.documentElement).getPropertyValue("--text-secondary"),
              },
            },
          },
        },
      });
    } else {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.data.datasets[0].label = selectedMetric;
      chart.update();
    }
  }

  $: if (canvasEl && filteredPoints) {
    // delay to next microtask to ensure reactive updates don't clash
    Promise.resolve().then(renderChart);
  }

  // Export helpers ----------------------------------------------------------
  function exportPNG() {
    if (!chart) return;
    const imageURL = chart.toBase64Image();
    const link = document.createElement("a");
    link.href = imageURL;
    link.download = `${selectedMetric}.png`;
    link.click();
  }

  function exportCSV() {
    if (!filteredPoints.length) return;
    const csvRows = ["date,value"].concat(
      filteredPoints.map((p) => `${p.x.toISOString()},${p.y}`),
    );
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedMetric}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
</script>

<style>
  .grid-container {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: var(--spacing-6);
    padding: var(--spacing-6);
  }

  .metric-list {
    background: var(--surface);
    border-radius: var(--radius-lg);
    padding: var(--spacing-4);
    box-shadow: var(--shadow-md);
    max-height: 80vh;
    overflow-y: auto;
  }

  .metric-item {
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-1);
  }
  .metric-item.active {
    background: var(--primary);
    color: #fff;
  }

  .chart-card {
    background: var(--surface);
    border-radius: var(--radius-lg);
    padding: var(--spacing-4);
    box-shadow: var(--shadow-md);
    display: flex;
    flex-direction: column;
  }

  .chart-toolbar {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-3);
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }

  .toolbar-group {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
  }

  .toolbar-button {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-primary);
    padding: var(--spacing-1) var(--spacing-3);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    cursor: pointer;
  }
  .toolbar-button:hover {
    background: var(--primary-dark);
    color: #fff;
  }
  .toolbar-button.active {
    background: var(--primary);
    color: #fff;
    border-color: var(--primary);
  }

  .chart-wrapper {
    position: relative;
    flex: 1;
  }

  canvas {
    width: 100% !important;
    height: 400px !important;
  }
</style>

{#if loading}
  <div class="grid-container"><p>Loading metrics…</p></div>
{:else if error}
  <div class="grid-container"><p>Error: {error}</p></div>
{:else}
  <div class="grid-container">
    <!-- Metric list -->
    <div class="metric-list">
      {#each metricKeys as key}
        <div
          class="metric-item {selectedMetric === key ? 'active' : ''}"
          on:click={() => (selectedMetric = key)}
        >
          {key}
        </div>
      {/each}
    </div>

    <!-- Chart area -->
    <div class="chart-card">
      <div class="chart-toolbar">
        <div class="toolbar-group">
          {#each RANGE_OPTIONS as option}
            <button
              class="toolbar-button {selectedRange === option ? 'active' : ''}"
              on:click={() => (selectedRange = option)}
            >
              {option === "all" ? "All" : `${option}d`}
            </button>
          {/each}
        </div>

        <div class="toolbar-group">
          <button class="toolbar-button" on:click={exportPNG}>Export PNG</button>
          <button class="toolbar-button" on:click={exportCSV}>Export CSV</button>
        </div>
      </div>

      <div class="chart-wrapper">
        {#if filteredPoints.length}
          <canvas bind:this={canvasEl}></canvas>
        {:else}
          <p style="opacity:0.7;">No data for this range.</p>
        {/if}
      </div>
    </div>
  </div>
{/if}