import { writable } from "svelte/store";
import { db } from "$lib/firebase.js";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import {
  COLLECTIONS,
  createPulseMetricData,
  createPulseSurveyData,
  createPulseInsightData,
} from "$lib/db/collections.js";

/**
 * Team-Pulse store – centralised state & helpers around the PULSE_* collections.
 *
 * This first iteration focuses on 🔹real-time metrics listening‚ 🔹survey aggregation and 🔹insight stub generation.
 * More sophisticated AI / visualisation logic will be layered on later phases.
 */
function createTeamPulseStore() {
  const { subscribe, update } = writable({
    metrics: [],
    surveys: [],
    insights: [],
    loading: true,
    error: null,
  });

  // Firestore unsubscribe references
  let metricsUnsub = null;
  let surveysUnsub = null;
  let insightsUnsub = null;

  /**
   * Activate live listeners for a given organisation.
   */
  const listen = (organizationId) => {
    // Clean-up previous listeners
    metricsUnsub?.();
    surveysUnsub?.();
    insightsUnsub?.();

    if (!organizationId) {
      update((s) => ({ ...s, metrics: [], surveys: [], insights: [], loading: false }));
      return;
    }

    update((s) => ({ ...s, loading: true, error: null }));

    // Metrics listener (ordered by createdAt DESC)
    const metricsQ = query(
      collection(db, COLLECTIONS.PULSE_METRICS),
      where("organizationId", "==", organizationId),
      orderBy("createdAt", "desc"),
    );
    metricsUnsub = onSnapshot(
      metricsQ,
      (snap) => {
        const metrics = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        update((s) => ({ ...s, metrics, loading: false }));
      },
      (err) => {
        console.error("[TeamPulse] metrics listener", err);
        update((s) => ({ ...s, error: err.message, loading: false }));
      },
    );

    // Surveys listener (we purposely do NOT order for performance; UI will sort when needed)
    const surveysQ = query(
      collection(db, COLLECTIONS.PULSE_SURVEYS),
      where("organizationId", "==", organizationId),
    );
    surveysUnsub = onSnapshot(
      surveysQ,
      (snap) => {
        const surveys = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        update((s) => ({ ...s, surveys, loading: false }));
      },
      (err) => {
        console.error("[TeamPulse] surveys listener", err);
        update((s) => ({ ...s, error: err.message, loading: false }));
      },
    );

    // Insights listener
    const insightsQ = query(
      collection(db, COLLECTIONS.PULSE_INSIGHTS),
      where("organizationId", "==", organizationId),
      orderBy("createdAt", "desc"),
    );
    insightsUnsub = onSnapshot(
      insightsQ,
      (snap) => {
        const insights = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        update((s) => ({ ...s, insights, loading: false }));
      },
      (err) => {
        console.error("[TeamPulse] insights listener", err);
        update((s) => ({ ...s, error: err.message, loading: false }));
      },
    );
  };

  const stop = () => {
    metricsUnsub?.();
    surveysUnsub?.();
    insightsUnsub?.();
  };

  /**
   * Metric creation helper.
   */
  const addMetric = async (organizationId, metricKey, value, meta = {}) => {
    try {
      const data = createPulseMetricData(organizationId, metricKey, value, meta);
      await addDoc(collection(db, COLLECTIONS.PULSE_METRICS), data);
    } catch (err) {
      console.error("[TeamPulse] addMetric", err);
      throw err;
    }
  };

  /**
   * Survey answer creation helper.
   */
  const addSurveyAnswer = async (organizationId, questionId, answer, meta = {}) => {
    try {
      const data = createPulseSurveyData(organizationId, questionId, answer, meta);
      await addDoc(collection(db, COLLECTIONS.PULSE_SURVEYS), data);
    } catch (err) {
      console.error("[TeamPulse] addSurveyAnswer", err);
      throw err;
    }
  };

  /**
   * Creates an AI-generated insight document.
   * At this stage this method simply writes the provided text. Later it may fetch OpenAI / cloud-function results.
   */
  const addInsight = async (organizationId, title, description, relatedData = {}) => {
    try {
      const data = createPulseInsightData(organizationId, title, description, relatedData);
      await addDoc(collection(db, COLLECTIONS.PULSE_INSIGHTS), data);
    } catch (err) {
      console.error("[TeamPulse] addInsight", err);
      throw err;
    }
  };

  return {
    subscribe,
    listen,
    stop,
    addMetric,
    addSurveyAnswer,
    addInsight,
  };
}

export const teamPulseStore = createTeamPulseStore();