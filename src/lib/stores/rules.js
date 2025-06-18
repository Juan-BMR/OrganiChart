/**
 * Rule Engine – Core store for dynamic styling rules applied to OrganiChart nodes.
 *
 * Phase-1 scope: purely client-side persistence via localStorage. When the app
 * eventually syncs rules to Firestore we can swap the `loadInitialRules`/`persist`
 * helpers with async versions without touching the public store API.
 *
 * The design intentionally mirrors the other stores (authStore, themeStore, …)
 * so that Svelte components interact with `rulesStore` in a familiar way.
 */

import { writable } from "svelte/store";
import { browser } from "$app/environment";

/**
 * @typedef {object} TitleContainsCondition
 * @property {"title_contains"} type
 * @property {string} value             The substring to search for.
 * @property {boolean} [caseSensitive]  Optional — default false.
 *
 * @typedef {object} LevelEqualsCondition
 * @property {"level_equals"} type
 * @property {number} value             The hierarchy level to match (root = 0).
 *
 * @typedef {object} DirectReportsGteCondition
 * @property {"direct_reports_gte"} type
 * @property {number} value             Minimum number of direct reports.
 *
 * @typedef {TitleContainsCondition | LevelEqualsCondition | DirectReportsGteCondition} RuleCondition
 *
 * @typedef {object} NodeStyle
 * @property {string} [backgroundColor]
 * @property {string} [borderColor]
 * @property {number} [borderWidth]
 *
 * @typedef {object} TextStyle
 * @property {string} [fontWeight]
 * @property {string|number} [fontSize]
 * @property {string} [color]
 *
 * @typedef {object} ConnectionStyle
 * @property {string} [stroke]
 * @property {number} [strokeWidth]
 *
 * @typedef {object} StyleDefinition
 * @property {NodeStyle} [node]
 * @property {TextStyle} [text]
 * @property {ConnectionStyle} [connection]
 *
 * @typedef {object} Rule
 * @property {string} id                Stable UUID.
 * @property {string} name              Friendly label.
 * @property {boolean} enabled          Toggle on/off.
 * @property {number} priority          Lower number = higher precedence.
 * @property {RuleCondition[]} conditions
 * @property {StyleDefinition} styles
 */

/**
 * Very light-weight UUID – good enough for local use. When we move to Firestore
 * we can rely on document IDs instead.
 * @returns {string}
 */
const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const STORAGE_KEY = "chartRules";

/**
 * Read rules from localStorage (client only). Returns empty array if none.
 * @returns {Rule[]}
 */
function loadInitialRules() {
  if (!browser) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    console.error("[rulesStore] Failed to parse stored rules", err);
  }
  return [];
}

/**
 * Persist rules array to localStorage (client only).
 * @param {Rule[]} rules
 */
function persist(rules) {
  if (!browser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch (err) {
    console.error("[rulesStore] Failed to persist rules", err);
  }
}

function createRulesStore() {
  // Initial load.
  const { subscribe, set, update } = writable(loadInitialRules());

  // Keep a live subscription for persistence.
  subscribe((current) => persist(current));

  return {
    subscribe,

    /**
     * Replace entire rules collection (rarely used).
     * @param {Rule[]} rules
     */
    set: (rules) => set(rules),

    /**
     * Create a new rule.
     * @param {Omit<Rule, "id">} ruleWithoutId – caller provides everything except `id`.
     * @returns {string} id of the newly created rule
     */
    addRule: (ruleWithoutId) => {
      const id = generateId();
      update((rules) => {
        const newRules = [...rules, { id, ...ruleWithoutId }].sort(
          (a, b) => a.priority - b.priority
        );
        return newRules;
      });
      return id;
    },

    /**
     * Update partial fields of a rule.
     * @param {string} id
     * @param {Partial<Rule>} updates
     */
    updateRule: (id, updates) =>
      update((rules) =>
        rules.map((r) => (r.id === id ? { ...r, ...updates } : r))
      ),

    /**
     * Remove a rule.
     * @param {string} id
     */
    deleteRule: (id) =>
      update((rules) => rules.filter((r) => r.id !== id)),

    /**
     * Re-order rules according to the supplied ordered array of ids. Also
     * rewrites `priority` to match the new ordering.
     * @param {string[]} orderedIds
     */
    reorderRules: (orderedIds) =>
      update((rules) => {
        const map = new Map(rules.map((r) => [r.id, r]));
        const reordered = orderedIds
          .map((id, idx) => ({ ...map.get(id), priority: idx }))
          .filter(Boolean);
        return reordered;
      }),

    /**
     * Clear every stored rule.
     */
    reset: () => set([]),
  };
}

export const rulesStore = createRulesStore();