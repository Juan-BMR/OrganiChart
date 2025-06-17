<script>
  import { onMount, onDestroy } from "svelte";
  import { teamPulseStore } from "$lib/stores/pulse.js";
  import Chart from "chart.js/auto";

  export let organizationId;

  // Store state
  let insights = [];
  let loading = true;
  let error = null;

  const unsub = teamPulseStore.subscribe(($s) => {
    insights = $s.insights;
    loading = $s.loading;
    error = $s.error;
  });

  onMount(() => {
    if (organizationId) teamPulseStore.listen(organizationId);
  });
  onDestroy(() => {
    teamPulseStore.stop();
    unsub();
    chart?.destroy();
  });

  // ----- Categorisation ----------------------------------------------------
  const CATEGORY_DEFS = [
    { id: "dynamics", label: "Team Dynamics", regex: /dynamic|collaboration|communication/i },
    { id: "bottlenecks", label: "Bottlenecks", regex: /bottleneck|blocker|constraint/i },
    { id: "success", label: "Success Patterns", regex: /success|best practice|pattern/i },
    { id: "growth", label: "Growth", regex: /growth|opportun|recommend/i },
    { id: "other", label: "Other", regex: /.*/ },
  ];

  function categorise(insight) {
    const text = `${insight.title} ${insight.description}`;
    return CATEGORY_DEFS.find((c) => c.regex.test(text))?.id ?? "other";
  }

  $: categorised = insights.map((i) => ({ ...i, category: categorise(i) }));

  // Filtering ---------------------------------------------------------------
  let searchTerm = "";
  let activeCategory = "all";

  $: filtered = categorised.filter((i) => {
    const categoryMatch = activeCategory === "all" || i.category === activeCategory;
    const searchMatch = !searchTerm ||
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description.toLowerCase().includes(searchTerm.toLowerCase());
    return categoryMatch && searchMatch;
  });

  // Chart.js category distribution -----------------------------------------
  let chart;
  let canvasEl;

  $: if (canvasEl) {
    const counts = CATEGORY_DEFS.map((c) => categorised.filter((i) => i.category === c.id).length);
    const labels = CATEGORY_DEFS.map((c) => c.label);

    const bg = ["#8b5cf6", "#f87171", "#34d399", "#fbbf24", "#9ca3af"];

    if (!chart) {
      chart = new Chart(canvasEl, {
        type: "doughnut",
        data: { labels, datasets: [{ data: counts, backgroundColor: bg }] },
        options: {
          plugins: {
            legend: {
              position: "right",
              labels: { color: getComputedStyle(document.documentElement).getPropertyValue("--text-secondary") },
            },
          },
        },
      });
    } else {
      chart.data.datasets[0].data = counts;
      chart.update();
    }
  }

  // Expand/collapse
  let expandedId = null;
  function toggleExpand(id) {
    expandedId = expandedId === id ? null : id;
  }
</script>

<style>
  .panel-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
    padding: var(--spacing-6);
  }

  .filters {
    display: flex;
    gap: var(--spacing-3);
    flex-wrap: wrap;
  }

  .category-chip {
    padding: var(--spacing-1) var(--spacing-3);
    border-radius: var(--radius-full, 9999px);
    background: var(--surface);
    border: 1px solid var(--border);
    font-size: var(--font-size-xs);
    cursor: pointer;
    color: var(--text-secondary);
  }
  .category-chip.active {
    background: var(--primary);
    color: #fff;
    border-color: var(--primary);
  }

  .search-input {
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-primary);
  }
  .search-input::placeholder { color: var(--text-secondary); }

  .insights-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .insight-card {
    background: var(--surface);
    border-radius: var(--radius-lg);
    padding: var(--spacing-4);
    box-shadow: var(--shadow-md);
    cursor: pointer;
  }
  .insight-title {
    font-size: var(--font-size-lg);
    font-weight: 500;
    margin-bottom: var(--spacing-1);
    color: var(--primary-light);
  }
  .insight-meta {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-2);
  }
  .insight-desc { font-size: var(--font-size-sm); color: var(--text-primary); }

  .chart-wrapper { max-width: 360px; align-self: center; }
  canvas { width: 100% !important; height: 220px !important; }
</style>

{#if loading}
  <div class="panel-container"><p>Loading insights…</p></div>
{:else if error}
  <div class="panel-container"><p>Error: {error}</p></div>
{:else}
  <div class="panel-container">
    <!-- Filters -->
    <div class="filters">
      <input
        class="search-input"
        type="text"
        placeholder="Search insights…"
        bind:value={searchTerm}
      />
      <div style="display:flex; gap:var(--spacing-2); flex-wrap:wrap;">
        <div
          class="category-chip {activeCategory==='all' ? 'active' : ''}"
          on:click={() => activeCategory = 'all'}
        >All ({categorised.length})</div>
        {#each CATEGORY_DEFS as cat}
          <div
            class="category-chip {activeCategory===cat.id ? 'active' : ''}"
            on:click={() => activeCategory = cat.id}
          >{cat.label} ({categorised.filter(i=>i.category===cat.id).length})</div>
        {/each}
      </div>
    </div>

    <!-- Category distribution chart -->
    <div class="chart-wrapper">
      <canvas bind:this={canvasEl}></canvas>
    </div>

    <!-- Insights list -->
    <div class="insights-list">
      {#each filtered as insight}
        <div class="insight-card" on:click={() => toggleExpand(insight.id)}>
          <div class="insight-title">{insight.title}</div>
          <div class="insight-meta">
            {new Date(insight.createdAt?.toMillis?.() ?? insight.createdAt).toLocaleString()} · {CATEGORY_DEFS.find(c => c.id === insight.category)?.label}
          </div>
          {#if expandedId === insight.id}
            <div class="insight-desc">{insight.description}</div>
          {/if}
        </div>
      {/each}

      {#if !filtered.length}
        <p style="opacity:0.7;">No insights match filters.</p>
      {/if}
    </div>
  </div>
{/if}