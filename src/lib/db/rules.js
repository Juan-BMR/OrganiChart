import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "$lib/firebase.js";
import { COLLECTIONS, createRuleData } from "./collections.js";

/**
 * Database operations for organization rules
 */

/**
 * Create a new rule for an organization
 * @param {string} organizationId
 * @param {string} name
 * @param {boolean} enabled
 * @param {number} priority
 * @param {Array} conditions
 * @param {Object} styles
 * @returns {Promise<string>} rule document ID
 */
export async function createRule(
  organizationId,
  name,
  enabled,
  priority,
  conditions,
  styles,
) {
  try {
    const ruleData = createRuleData(
      organizationId,
      name,
      enabled,
      priority,
      conditions,
      styles,
    );

    const docRef = await addDoc(collection(db, COLLECTIONS.RULES), ruleData);
    console.log("Rule created with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating rule:", error);
    throw new Error(`Failed to create rule: ${error.message}`);
  }
}

/**
 * Get all rules for an organization
 * @param {string} organizationId
 * @returns {Promise<Array>} array of rules with IDs
 */
export async function getRulesForOrganization(organizationId) {
  try {
    // Simplified query - just filter by organizationId and sort client-side
    const q = query(
      collection(db, COLLECTIONS.RULES),
      where("organizationId", "==", organizationId),
    );

    const querySnapshot = await getDocs(q);
    const rules = [];

    querySnapshot.forEach((doc) => {
      rules.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort client-side by priority, then by createdAt
    rules.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower priority number = higher precedence
      }
      // If priorities are equal, sort by creation date
      return (a.createdAt?.toDate?.() || a.createdAt || new Date(0)) - 
             (b.createdAt?.toDate?.() || b.createdAt || new Date(0));
    });

    console.log(`Loaded ${rules.length} rules for organization ${organizationId}`);
    return rules;
  } catch (error) {
    console.error("Error getting rules:", error);
    throw new Error(`Failed to get rules: ${error.message}`);
  }
}

/**
 * Get a single rule by ID
 * @param {string} ruleId
 * @returns {Promise<Object|null>} rule data with ID or null if not found
 */
export async function getRule(ruleId) {
  try {
    const docRef = doc(db, COLLECTIONS.RULES, ruleId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting rule:", error);
    throw new Error(`Failed to get rule: ${error.message}`);
  }
}

/**
 * Update a rule
 * @param {string} ruleId
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export async function updateRule(ruleId, updates) {
  try {
    const docRef = doc(db, COLLECTIONS.RULES, ruleId);
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    await updateDoc(docRef, updateData);
    console.log("Rule updated:", ruleId);
  } catch (error) {
    console.error("Error updating rule:", error);
    throw new Error(`Failed to update rule: ${error.message}`);
  }
}

/**
 * Delete a rule
 * @param {string} ruleId
 * @returns {Promise<void>}
 */
export async function deleteRule(ruleId) {
  try {
    const docRef = doc(db, COLLECTIONS.RULES, ruleId);
    await deleteDoc(docRef);
    console.log("Rule deleted:", ruleId);
  } catch (error) {
    console.error("Error deleting rule:", error);
    throw new Error(`Failed to delete rule: ${error.message}`);
  }
}

/**
 * Update rule priorities in batch (for reordering)
 * @param {Array<{id: string, priority: number}>} ruleUpdates
 * @returns {Promise<void>}
 */
export async function updateRulePriorities(ruleUpdates) {
  try {
    const batch = writeBatch(db);

    ruleUpdates.forEach(({ id, priority }) => {
      const docRef = doc(db, COLLECTIONS.RULES, id);
      batch.update(docRef, {
        priority,
        updatedAt: new Date(),
      });
    });

    await batch.commit();
    console.log("Rule priorities updated");
  } catch (error) {
    console.error("Error updating rule priorities:", error);
    throw new Error(`Failed to update rule priorities: ${error.message}`);
  }
}

/**
 * Delete all rules for an organization (cleanup function)
 * @param {string} organizationId
 * @returns {Promise<void>}
 */
export async function deleteAllRulesForOrganization(organizationId) {
  try {
    const q = query(
      collection(db, COLLECTIONS.RULES),
      where("organizationId", "==", organizationId),
    );

    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);

    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted all rules for organization ${organizationId}`);
  } catch (error) {
    console.error("Error deleting organization rules:", error);
    throw new Error(`Failed to delete organization rules: ${error.message}`);
  }
} 