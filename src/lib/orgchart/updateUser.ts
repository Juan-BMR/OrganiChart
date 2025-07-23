import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "$lib/firebase-admin.js";
import { COLLECTIONS } from "$lib/db/collections.js";

export interface UpdateUserArgs {
  organizationId: string;
  memberId: string;
  name?: string;
  email?: string;
  role?: string;
  managerId?: string | null;
  startDate?: string | Date | null;
  photoURL?: string | null;
  cvURL?: string | null;
}

export async function updateUser({
  organizationId,
  memberId,
  name,
  email,
  role,
  managerId,
  startDate,
  photoURL,
  cvURL,
}: UpdateUserArgs) {
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

  const updateData: Record<string, any> = {
    updatedAt: Timestamp.now(),
  };

  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  if (managerId !== undefined) updateData.managerId = managerId;
  if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
  if (photoURL !== undefined) updateData.photoURL = photoURL;
  if (cvURL !== undefined) updateData.cvURL = cvURL;

  await memberRef.update(updateData);

  return {
    id: memberId,
    ...updateData,
    name: name || memberData.name,
    role: role || memberData.role,
  };
}