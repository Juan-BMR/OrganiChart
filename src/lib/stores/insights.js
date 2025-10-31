import { writable } from "svelte/store";

export const insightsStore = (() => {
  const { subscribe, set, update } = writable({
    insights: null,
    loading: false,
    error: null
  });

  return {
    subscribe,

    async generateInsights(organizationId, members) {
      if (!organizationId || !members || members.length === 0) {
        return;
      }

      update(state => ({ ...state, loading: true, error: null }));

      try {
        const response = await fetch("/api/ai-insights", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organizationId,
            members
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to generate insights: ${response.statusText}`);
        }

        const data = await response.json();

        update(state => ({
          ...state,
          insights: data.insights,
          loading: false
        }));

      } catch (error) {
        console.error("Failed to generate insights:", error);
        update(state => ({
          ...state,
          loading: false,
          error: error.message
        }));
      }
    },

    clearInsights() {
      update(state => ({
        ...state,
        insights: null,
        error: null
      }));
    }
  };
})();