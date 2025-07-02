import { Timestamp } from "firebase-admin/firestore";
// @ts-ignore - compiled JS module from SvelteKit path alias
import { adminDb } from "$lib/firebase-admin.js";
// @ts-ignore - compiled JS module from SvelteKit path alias
import { COLLECTIONS, createMemberData } from "$lib/db/collections.js";

/**
 * Server-side helper used by AI middleware or other secure routes.
 * Inserts a new member document and (optionally) re-parents subordinates.
 *
 * NOTE: This runs with Admin privileges – make sure to validate/authorize
 * inputs in the caller before invoking.
 */
export interface AddUserArgs {
  organizationId: string;
  name: string;
  email?: string;
  role: string;
  managerId?: string | null;
  /** List of subordinate member IDs that should now report to the new member */
  subordinateIds?: string[];
  startDate?: string | Date | null;
  photoURL?: string | null; // Use a pre-uploaded URL or null
  cvURL?: string | null;
}

export async function addUser({
  organizationId,
  name,
  email = "",
  role,
  managerId = null,
  subordinateIds = [],
  startDate = null,
  photoURL = null,
  cvURL = null,
}: AddUserArgs) {
  const membersCol = adminDb.collection(COLLECTIONS.MEMBERS);

  // 1️⃣  Create member document
  const data = {
    ...createMemberData(
      organizationId,
      name,
      email,
      role,
      photoURL,
      managerId,
      startDate ? new Date(startDate) : null,
    ),
    // Because we're on Admin SDK, Dates will be turned into Timestamps automatically.
  } as Record<string, unknown>;

  const newMemberRef = await membersCol.add(data);
  const newMemberId = newMemberRef.id;

  // 2️⃣  If we need to re-parent existing subordinates, batch update them
  if (subordinateIds.length) {
    const batch = adminDb.batch();
    subordinateIds.forEach((id) => {
      const ref = membersCol.doc(id);
      batch.update(ref, {
        managerId: newMemberId,
        updatedAt: Timestamp.now(),
      });
    });
    await batch.commit();
  }

  return {
    id: newMemberId,
    name,
    role,
    createdAt: Timestamp.now(),
  };
} 