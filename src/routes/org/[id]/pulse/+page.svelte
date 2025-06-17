<script>
  // @ts-nocheck
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/stores/auth.js";
  import Header from "$lib/components/layout/Header.svelte";
  import TeamPulseOverview from "$lib/components/TeamPulseOverview.svelte";
  import PulseMetricsGrid from "$lib/components/PulseMetricsGrid.svelte";
  import TeamInsightsPanel from "$lib/components/TeamInsightsPanel.svelte";
  import PulseSurveyModal from "$lib/components/PulseSurveyModal.svelte";

  let user = null;
  let organizationId = null;

  let surveyOpen = false;

  onMount(() => {
    const unsubAuth = authStore.subscribe(({ user: u, loading }) => {
      if (!loading) {
        if (!u) goto("/login");
        else user = u;
      }
    });

    const unsubPage = page.subscribe(($p) => {
      organizationId = $p.params.id;
    });

    return () => {
      unsubAuth();
      unsubPage();
    };
  });
</script>

<svelte:head>
  <title>Team Pulse Dashboard - OrganiChart</title>
</svelte:head>

<Header {user} orgId={organizationId} />

{#if user && organizationId}
  <div class="pulse-dashboard">
    <section class="overview-section">
      <TeamPulseOverview organizationId={organizationId} />
      <button class="survey-btn" on:click={() => surveyOpen = true}>Quick Pulse Check</button>
    </section>

    <section class="grid-section">
      <PulseMetricsGrid organizationId={organizationId} />
    </section>

    <section class="insights-section">
      <TeamInsightsPanel organizationId={organizationId} />
    </section>
  </div>
{/if}

<PulseSurveyModal bind:open={surveyOpen} organizationId={organizationId} />

<style>
  .pulse-dashboard { padding-top: calc(var(--header-height) + var(--spacing-16)); }
  .overview-section { position:relative; }
  .survey-btn {
    position: absolute;
    top: var(--spacing-6);
    right: var(--spacing-6);
    background: var(--primary);
    color:#fff;
    border:none;
    border-radius: var(--radius-md);
    padding: var(--spacing-3) var(--spacing-5);
    cursor:pointer;
    box-shadow: var(--shadow-md);
  }
  .survey-btn:hover { background: var(--primary-dark); }
  .grid-section { margin-top: var(--spacing-16); }
  .insights-section { margin-top: var(--spacing-16); }
</style>