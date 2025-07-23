import { adminDb } from "$lib/firebase-admin.js";
import { COLLECTIONS } from "$lib/db/collections.js";

export interface GetUserInfoArgs {
  organizationId: string;
  query: string; // Can be member ID, name, or email
}

export async function getUserInfo({ organizationId, query }: GetUserInfoArgs) {
  const membersCol = adminDb.collection(COLLECTIONS.MEMBERS);
  
  // First try to find by ID
  if (query.length > 10) { // Firestore IDs are typically longer
    try {
      const memberRef = membersCol.doc(query);
      const member = await memberRef.get();
      if (member.exists && member.data()?.organizationId === organizationId) {
        return formatMemberInfo(member.id, member.data());
      }
    } catch (e) {
      // Not a valid ID, continue with other searches
    }
  }

  // Search by name or email
  const nameQuery = await membersCol
    .where("organizationId", "==", organizationId)
    .where("name", ">=", query)
    .where("name", "<=", query + '\uf8ff')
    .limit(5)
    .get();

  const emailQuery = await membersCol
    .where("organizationId", "==", organizationId)
    .where("email", "==", query.toLowerCase())
    .limit(1)
    .get();

  const results = [];
  
  nameQuery.docs.forEach(doc => {
    results.push(formatMemberInfo(doc.id, doc.data()));
  });

  emailQuery.docs.forEach(doc => {
    if (!results.find(r => r.id === doc.id)) {
      results.push(formatMemberInfo(doc.id, doc.data()));
    }
  });

  if (results.length === 0) {
    throw new Error(`No member found matching "${query}" in this organization`);
  }

  return results.length === 1 ? results[0] : results;
}

function formatMemberInfo(id: string, data: any) {
  return {
    id,
    name: data.name,
    email: data.email,
    role: data.role,
    managerId: data.managerId,
    startDate: data.startDate?.toDate?.() || data.startDate,
    photoURL: data.photoURL,
    cvURL: data.cvURL,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
  };
}