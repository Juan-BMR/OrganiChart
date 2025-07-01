/**
 * Rule Engine – Core store for dynamic styling rules applied to OrganiChart nodes.
 *
 * Now syncs with Firestore for organization-wide rule persistence.
 * Rules are scoped to organizations and shared across all team members.
 */

import { writable } from "svelte/store";
import {
  createRule as dbCreateRule,
  getRulesForOrganization,
  updateRule as dbUpdateRule,
  deleteRule as dbDeleteRule,
  updateRulePriorities,
} from "$lib/db/rules.js";

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

// Store state
let isLoading = false;

function createRulesStore() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,

    /**
     * Load rules for a specific organization
     * @param {string} organizationId
     */
    async loadRules(organizationId) {
      if (!organizationId) {
        set([]);
        return;
      }

                   try {
        isLoading = true;
        const rules = await getRulesForOrganization(organizationId);
        set(rules);
      } catch (error) {
        console.error("[rulesStore] Failed to load rules:", error);
        set([]);
        throw error;
      } finally {
        isLoading = false;
      }
    },

    /**
     * Create a new rule for the current organization
     * @param {string} organizationId
     * @param {Omit<Rule, "id" | "organizationId">} ruleData
     * @returns {Promise<string>} rule document ID
     */
    async addRule(organizationId, ruleData) {
      try {
        const ruleId = await dbCreateRule(
          organizationId,
          ruleData.name,
          ruleData.enabled,
          ruleData.priority,
          ruleData.conditions,
          ruleData.styles,
        );

        // Add to local store
        update((rules) => {
          const newRule = {
            id: ruleId,
            organizationId,
            ...ruleData,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          return [...rules, newRule].sort((a, b) => a.priority - b.priority);
        });

        return ruleId;
      } catch (error) {
        console.error("[rulesStore] Failed to add rule:", error);
        throw error;
      }
    },

    /**
     * Update a rule with optimistic updates
     * @param {string} ruleId
     * @param {Partial<Rule>} updates
     */
    async updateRule(ruleId, updates) {
      // Optimistic update - update UI immediately
      update((rules) =>
        rules.map((r) =>
          r.id === ruleId
            ? { ...r, ...updates, updatedAt: new Date() }
            : r,
        ),
      );

      try {
        // Update database in background
        await dbUpdateRule(ruleId, updates);
      } catch (error) {
        console.error("[rulesStore] Failed to update rule:", error);
        
        // Revert optimistic update on error
        update((rules) =>
          rules.map((r) =>
            r.id === ruleId
              ? { ...r, ...updates, enabled: !updates.enabled } // Revert the main change
              : r,
          ),
        );
        
        throw error;
      }
    },

    /**
     * Delete a rule with optimistic updates
     * @param {string} ruleId
     */
    async deleteRule(ruleId) {
      // Store the rule for potential rollback
      let deletedRule = null;
      
      // Optimistic update - remove from UI immediately
      update((rules) => {
        deletedRule = rules.find((r) => r.id === ruleId);
        return rules.filter((r) => r.id !== ruleId);
      });

      try {
        // Delete from database in background
        await dbDeleteRule(ruleId);
      } catch (error) {
        console.error("[rulesStore] Failed to delete rule:", error);
        
        // Revert optimistic update on error - restore the rule
        if (deletedRule) {
          update((rules) => [...rules, deletedRule].sort((a, b) => a.priority - b.priority));
        }
        
        throw error;
      }
    },

    /**
     * Reorder rules
     * @param {string[]} orderedIds
     */
    async reorderRules(orderedIds) {
      try {
        // Prepare priority updates
        const priorityUpdates = orderedIds.map((id, index) => ({
          id,
          priority: index,
        }));

        await updateRulePriorities(priorityUpdates);

        // Update local store
        update((rules) => {
          const map = new Map(rules.map((r) => [r.id, r]));
          return orderedIds
            .map((id, idx) => {
              const rule = map.get(id);
              return rule ? { ...rule, priority: idx, updatedAt: new Date() } : null;
            })
            .filter(Boolean);
        });
      } catch (error) {
        console.error("[rulesStore] Failed to reorder rules:", error);
        throw error;
      }
    },

    /**
     * Clear all rules (local store only)
     */
    reset: () => set([]),

    /**
     * Get loading state
     */
    isLoading: () => isLoading,
  };
}

export const rulesStore = createRulesStore();