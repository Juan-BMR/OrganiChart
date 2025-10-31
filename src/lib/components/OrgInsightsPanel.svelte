<script>
  import { createEventDispatcher } from "svelte";

  export let open = false;
  export let members = [];
  export let organization = null;

  const dispatch = createEventDispatcher();

  const MS_IN_DAY = 1000 * 60 * 60 * 24;

  const tenureBuckets = [
    { label: "< 1 year", min: 0, max: 1, key: "under1" },
    { label: "1 - 3 years", min: 1, max: 3, key: "oneToThree" },
    { label: "3 - 5 years", min: 3, max: 5, key: "threeToFive" },
    { label: "5+ years", min: 5, max: Infinity, key: "overFive" },
  ];

  const RECENT_HIRE_DAYS = 90;

  const getDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "number" || typeof value === "string") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === "object" && typeof value.toDate === "function") {
      try {
        const converted = value.toDate();
        return converted instanceof Date ? converted : null;
      } catch (err) {
        console.error("Failed to convert Firestore timestamp", err);
        return null;
      }
    }
    return null;
  };

  const computeDerivedData = (membersList) => {
    if (!Array.isArray(membersList) || membersList.length === 0) {
      return {
        totalMembers: 0,
        rootMembers: [],
        managerStats: [],
        managerCount: 0,
        avgSpanOfControl: 0,
        recentHires: [],
        tenureSummary: tenureBuckets.map((bucket) => ({
          ...bucket,
          count: 0,
          percentage: 0,
        })),
        inactiveMembers: [],
        orphanMembers: [],
        longestChain: { depth: 0, chain: [] },
      };
    }

    const memberMap = new Map();
    const directReportMap = new Map();

    membersList.forEach((member) => {
      memberMap.set(member.id, member);
      directReportMap.set(member.id, []);
    });

    const orphanMembers = [];

    membersList.forEach((member) => {
      if (member.managerId) {
        const reports = directReportMap.get(member.managerId);
        if (reports) {
          reports.push(member);
        } else {
          orphanMembers.push(member);
        }
      }
    });

    const managerStats = [];
    let totalDirectReports = 0;

    directReportMap.forEach((reports, managerId) => {
      if (reports.length === 0) return;
      const manager = memberMap.get(managerId);
      const individualContributors = reports.filter(
        (report) => (directReportMap.get(report.id) || []).length === 0,
      ).length;
      managerStats.push({
        manager,
        directReports: reports.length,
        individualContributors,
      });
      totalDirectReports += reports.length;
    });

    managerStats.sort((a, b) => b.directReports - a.directReports);

    const managerCount = managerStats.length;
    const avgSpanOfControl = managerCount
      ? Number((totalDirectReports / managerCount).toFixed(1))
      : 0;

    const now = new Date();
    const tenureCounts = tenureBuckets.map((bucket) => ({ ...bucket, count: 0 }));
    const recentHires = [];
    const inactiveMembers = [];

    membersList.forEach((member) => {
      if (member?.isActive === false) {
        inactiveMembers.push(member);
      }

      const startDate = getDate(member.startDate);
      if (!startDate) return;

      const tenureYears = (now - startDate) / (365.25 * MS_IN_DAY);
      const tenureBucket = tenureCounts.find(
        (bucket) => tenureYears >= bucket.min && tenureYears < bucket.max,
      );
      if (tenureBucket) tenureBucket.count += 1;

      const daysSinceStart = Math.floor((now - startDate) / MS_IN_DAY);
      if (daysSinceStart <= RECENT_HIRE_DAYS) {
        recentHires.push({
          member,
          daysSinceStart,
        });
      }
    });

    const totalMembers = membersList.length;
    const tenureSummary = tenureCounts.map((bucket) => ({
      ...bucket,
      percentage: totalMembers
        ? Math.round((bucket.count / totalMembers) * 100)
        : 0,
    }));

    recentHires.sort((a, b) => a.daysSinceStart - b.daysSinceStart);

    const rootMembers = membersList.filter((member) => !member.managerId);

    const longestChain = (() => {
      if (rootMembers.length === 0) return { depth: 0, chain: [] };

      let best = { depth: 0, chain: [] };
      const visited = new Set();

      const dfs = (member, path) => {
        if (!member || visited.has(member.id)) return;
        visited.add(member.id);

        try {
          const nextPath = [...path, member];
          if (nextPath.length > best.depth) {
            best = { depth: nextPath.length, chain: nextPath };
          }

          const children = directReportMap.get(member.id) || [];
          children.forEach((child) => dfs(child, nextPath));
        } finally {
          visited.delete(member.id);
        }
      };

      rootMembers.forEach((root) => dfs(root, []));
      return best;
    })();

    return {
      totalMembers,
      rootMembers,
      managerStats,
      managerCount,
      avgSpanOfControl,
      recentHires,
      tenureSummary,
      inactiveMembers,
      orphanMembers,
      longestChain,
    };
  };

  $: insights = computeDerivedData(members);

  const closePanel = () => {
    dispatch("close");
  };

  const primaryColor = () => organization?.chartColor || "var(--primary)";
</script>

{#if open}
  <div class="insights-backdrop" role="presentation" on:click={closePanel}>
    <aside class="insights-panel" role="dialog" aria-label="Org insights" on:click|stopPropagation>
      <header class="panel-header">
        <div class="header-content">
          <h2>{organization?.name || "Organization"} insights</h2>
          <p>Automatic snapshot of your team structure.</p>
        </div>
        <button class="close-btn" on:click={closePanel} aria-label="Close insights">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      </header>

      <section class="highlight-grid">
        <article class="stat-card">
          <span class="stat-label">Team size</span>
          <span class="stat-value">{insights.totalMembers}</span>
          <span class="stat-footnote">{insights.rootMembers.length} top-level leaders</span>
        </article>

        <article class="stat-card">
          <span class="stat-label">Managers</span>
          <span class="stat-value">{insights.managerCount}</span>
          <span class="stat-footnote">Avg span of control {insights.avgSpanOfControl}</span>
        </article>

        <article class="stat-card">
          <span class="stat-label">Recent hires</span>
          <span class="stat-value">{insights.recentHires.length}</span>
          <span class="stat-footnote">Last {RECENT_HIRE_DAYS} days</span>
        </article>

        <article class="stat-card">
          <span class="stat-label">Org depth</span>
          <span class="stat-value">{insights.longestChain.depth}</span>
          <span class="stat-footnote">Longest chain of reporting</span>
        </article>
      </section>

      {#if insights.longestChain.chain.length > 0}
        <section class="panel-section">
          <h3>Deepest reporting chain</h3>
          <ol class="chain-list">
            {#each insights.longestChain.chain as member, index}
              <li>
                <span class="chain-index" style={`background:${primaryColor()}`}>{index + 1}</span>
                <div class="chain-meta">
                  <span class="chain-name">{member.name}</span>
                  <span class="chain-role">{member.role}</span>
                </div>
              </li>
            {/each}
          </ol>
        </section>
      {/if}

      <section class="panel-section">
        <h3>Tenure mix</h3>
        <div class="tenure-grid">
          {#each insights.tenureSummary as bucket}
            <div class="tenure-row">
              <div class="tenure-label">{bucket.label}</div>
              <div class="tenure-bar">
                <div
                  class="tenure-fill"
                  style={`width:${bucket.percentage}%; background:${primaryColor()}`}
                  aria-hidden="true"
                ></div>
                <span class="tenure-count">{bucket.count}</span>
              </div>
              <span class="tenure-percentage">{bucket.percentage}%</span>
            </div>
          {/each}
        </div>
      </section>

      {#if insights.managerStats.length > 0}
        <section class="panel-section">
          <h3>Top managers by team size</h3>
          <ul class="manager-list">
            {#each insights.managerStats.slice(0, 5) as entry}
              <li>
                <div class="manager-meta">
                  <span class="manager-name">{entry.manager?.name || "Unknown"}</span>
                  <span class="manager-role">{entry.manager?.role}</span>
                </div>
                <div class="manager-stats">
                  <span class="manager-chip" style={`background:${primaryColor()}20; color:${primaryColor()}`}>
                    {entry.directReports} reports
                  </span>
                  <span class="manager-chip neutral">
                    {entry.individualContributors} ICs
                  </span>
                </div>
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      <section class="panel-section subtle">
        <h3>Data quality checks</h3>
        <ul class="quality-list">
          <li class:ok={insights.orphanMembers.length === 0}>
            <span class="dot"></span>
            {#if insights.orphanMembers.length === 0}
              All managers referenced by team members exist.
            {:else}
              {insights.orphanMembers.length} member(s) reference a missing manager.
            {/if}
          </li>
          <li class:ok={insights.inactiveMembers.length === 0}>
            <span class="dot"></span>
            {#if insights.inactiveMembers.length === 0}
              No inactive members in this organization.
            {:else}
              {insights.inactiveMembers.length} member(s) marked inactive.
            {/if}
          </li>
        </ul>
      </section>
    </aside>
  </div>
{/if}

<style>
  :global(:root) {
    --insights-backdrop: rgba(15, 23, 42, 0.45);
    --insights-panel-bg: var(--surface, #0f172a);
    --insights-border: color-mix(in srgb, var(--border) 70%, transparent);
    --insights-text-primary: var(--text-primary, #f8fafc);
    --insights-text-secondary: var(--text-secondary, #94a3b8);
  }

  .insights-backdrop {
    position: fixed;
    inset: 0;
    background: var(--insights-backdrop);
    display: flex;
    justify-content: flex-end;
    z-index: 2200;
    backdrop-filter: blur(2px);
    animation: fadeIn 0.2s ease-out;
  }

  .insights-panel {
    width: min(420px, 90vw);
    height: 100vh;
    background: var(--insights-panel-bg);
    border-left: 1px solid var(--insights-border);
    padding: var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
    color: var(--insights-text-primary);
    animation: slideIn 0.24s cubic-bezier(0.25, 0.8, 0.25, 1);
    overflow-y: auto;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--spacing-4);
  }

  .header-content h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .header-content p {
    margin: var(--spacing-1) 0 0 0;
    color: var(--insights-text-secondary);
    font-size: 0.9rem;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--insights-border);
    display: grid;
    place-items: center;
    background: transparent;
    color: var(--insights-text-secondary);
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    color: var(--insights-text-primary);
    border-color: var(--insights-text-primary);
    transform: scale(1.05);
  }

  .highlight-grid {
    display: grid;
    gap: var(--spacing-3);
  }

  .stat-card {
    background: color-mix(in srgb, var(--insights-panel-bg) 85%, transparent);
    border: 1px solid color-mix(in srgb, var(--insights-border) 70%, transparent);
    border-radius: var(--radius-lg);
    padding: var(--spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .stat-label {
    color: var(--insights-text-secondary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 600;
    letter-spacing: -0.03em;
  }

  .stat-footnote {
    color: var(--insights-text-secondary);
    font-size: 0.85rem;
  }

  .panel-section h3 {
    margin: 0 0 var(--spacing-3) 0;
    font-size: 1.1rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .chain-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .chain-list li {
    display: flex;
    gap: var(--spacing-3);
    align-items: center;
    background: color-mix(in srgb, var(--insights-panel-bg) 80%, transparent);
    border-radius: var(--radius-md);
    padding: var(--spacing-3);
    border: 1px solid color-mix(in srgb, var(--insights-border) 60%, transparent);
  }

  .chain-index {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: 600;
    color: var(--insights-text-primary);
    text-shadow: 0 1px 2px rgba(15, 23, 42, 0.35);
  }

  .chain-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .chain-name {
    font-weight: 600;
  }

  .chain-role {
    font-size: 0.85rem;
    color: var(--insights-text-secondary);
  }

  .tenure-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .tenure-row {
    display: grid;
    grid-template-columns: 1fr 3fr auto;
    gap: var(--spacing-3);
    align-items: center;
  }

  .tenure-label {
    color: var(--insights-text-secondary);
    font-size: 0.9rem;
  }

  .tenure-bar {
    background: color-mix(in srgb, var(--insights-panel-bg) 75%, transparent);
    border-radius: 999px;
    position: relative;
    display: flex;
    align-items: center;
    padding: 2px;
    border: 1px solid color-mix(in srgb, var(--insights-border) 60%, transparent);
    min-height: 18px;
  }

  .tenure-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.25s ease-out;
  }

  .tenure-count {
    position: absolute;
    right: 10px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--insights-text-primary);
    background: rgba(15, 23, 42, 0.4);
    border-radius: 10px;
    padding: 2px 6px;
  }

  .tenure-percentage {
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }

  .manager-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .manager-list li {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--insights-border) 60%, transparent);
    background: color-mix(in srgb, var(--insights-panel-bg) 82%, transparent);
  }

  .manager-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .manager-name {
    font-weight: 600;
  }

  .manager-role {
    font-size: 0.85rem;
    color: var(--insights-text-secondary);
  }

  .manager-stats {
    display: flex;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .manager-chip {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--primary) 15%, transparent);
  }

  .manager-chip.neutral {
    background: color-mix(in srgb, var(--insights-panel-bg) 70%, transparent);
    color: var(--insights-text-secondary);
  }

  .panel-section.subtle {
    background: color-mix(in srgb, var(--insights-panel-bg) 88%, transparent);
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--insights-border) 60%, transparent);
    padding: var(--spacing-4);
  }

  .panel-section.subtle h3 {
    margin-bottom: var(--spacing-2);
  }

  .quality-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .quality-list li {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    color: var(--insights-text-secondary);
    font-size: 0.9rem;
  }

  .quality-list li.ok {
    color: #10b981;
  }

  .quality-list .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideIn {
    from {
      transform: translateX(24px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @media (max-width: 640px) {
    .insights-panel {
      width: 100%;
      border-left: none;
    }
  }
</style>
