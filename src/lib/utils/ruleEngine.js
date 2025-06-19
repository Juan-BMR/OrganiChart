// Rule evaluation engine – Phase 1
// Calculates computed style for a single org-chart node based on an array of
// rule objects (see `rulesStore.js` typedef).

/**
 * @typedef {import("$lib/stores/rules.js").Rule} Rule
 * @typedef {import("$lib/stores/rules.js").StyleDefinition} StyleDefinition
 * @typedef {import("$lib/stores/rules.js").RuleCondition} RuleCondition
 */

/**
 * Deep-merge helper where values from `incoming` overwrite those in `base`.
 * We only recurse for plain objects; arrays & primitives are replaced.
 * @param {Record<string, any>} base
 * @param {Record<string, any>} incoming
 * @returns {Record<string, any>}
 */
function deepMerge(base, incoming) {
  const result = { ...base };
  for (const key in incoming) {
    if (
      incoming[key] !== null &&
      typeof incoming[key] === "object" &&
      !Array.isArray(incoming[key])
    ) {
      result[key] = deepMerge(base[key] ?? {}, incoming[key]);
    } else {
      result[key] = incoming[key];
    }
  }
  return result;
}

/**
 * Check whether a node matches every condition in a rule.
 * @param {any} node – Member data object.
 * @param {RuleCondition[]} conditions
 * @returns {boolean}
 */
function matchConditions(node, conditions) {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((cond) => {
    switch (cond.type) {
      case "title_contains": {
        const value = node?.role ?? "";
        if (cond.caseSensitive) {
          return value.includes(cond.value);
        }
        return value.toLowerCase().includes(cond.value.toLowerCase());
      }
      case "level_equals": {
        const level = node?.level ?? -1;
        return level === cond.value;
      }
      case "direct_reports_gte": {
        const directReports = node?.directReports ?? 0;
        return directReports >= cond.value;
      }
      default:
        console.warn("[rulesEngine] Unknown condition type", cond);
        return false;
    }
  });
}

/**
 * Evaluate rules against a single node and produce the final StyleDefinition.
 * High-priority rules (lower `priority` number) override lower priority ones.
 *
 * @param {any} node – Member data object.
 * @param {Rule[]} rules – list (can include disabled rules).
 * @returns {StyleDefinition}
 */
export function evaluateStyles(node, rules) {
  if (!Array.isArray(rules) || rules.length === 0) return {};

  // Filter & sort so that we process lowest-priority first and highest last.
  const active = rules
    .filter((r) => r.enabled !== false) // treat undefined as enabled
    .sort((a, b) => b.priority - a.priority); // descending number

  let aggregated = {};

  for (const rule of active) {
    if (matchConditions(node, rule.conditions)) {
      aggregated = deepMerge(aggregated, rule.styles ?? {});
    }
  }

  return aggregated;
}

/**
 * Get the profile picture diameter for a member based on rules.
 * @param {any} member – Member data object
 * @param {Rule[]} rules – Array of rules
 * @returns {number} Diameter in pixels (defaults to 90)
 */
export function getMemberDiameter(member, rules) {
  const styles = evaluateStyles(member, rules);
  return styles?.node?.diameter ?? 90;
}