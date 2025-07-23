import { adminDb } from "$lib/firebase-admin.js";
import { COLLECTIONS } from "$lib/db/collections.js";

export interface RemoveUserArgs {
  organizationId: string;
  memberId: string;
  reassignSubordinatesTo?: string | null;
}

export async function removeUser({
  organizationId,
  memberId,
  reassignSubordinatesTo = null,
}: RemoveUserArgs) {
  const membersCol = adminDb.collection(COLLECTIONS.MEMBERS);
  const memberRef = membersCol.doc(memberId);
  
  const member = await memberRef.get();
  if (!member.exists) {
    throw new Error(`Member with ID ${memberId} not found`);
  }

  const memberData = member.data();
  if (memberData?.organizationId !== organizationId) {
    throw new Error(`Member ${memberId} does not belong to organization ${organizationId}`);
  }

  // Find subordinates who report to this member
  const subordinatesQuery = await membersCol
    .where("organizationId", "==", organizationId)
    .where("managerId", "==", memberId)
    .get();

  const batch = adminDb.batch();

  // Reassign subordinates
  subordinatesQuery.docs.forEach((doc) => {
    batch.update(doc.ref, {
      managerId: reassignSubordinatesTo,
      updatedAt: new Date(),
    });
  });

  // Delete the member
  batch.delete(memberRef);

  await batch.commit();

  return {
    id: memberId,
    name: memberData.name,
    removedAt: new Date(),
    subordinatesReassigned: subordinatesQuery.size,
    reassignedTo: reassignSubordinatesTo,
  };
}