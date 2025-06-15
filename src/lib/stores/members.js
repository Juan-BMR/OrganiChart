import { writable } from "svelte/store";
import { db } from "$lib/firebase.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { COLLECTIONS, createMemberData } from "$lib/db/collections.js";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "$lib/firebase.js";

function createMembersStore() {
  const { subscribe, set } = writable({
    members: [],
    loading: true,
    error: null,
  });

  let unsubscribe = null;

  return {
    subscribe,

    // Start listening for members of given organizationId
    listen: (organizationId) => {
      // Cleanup previous listener if exists
      if (unsubscribe) unsubscribe();
      if (!organizationId) {
        set({ members: [], loading: false, error: null });
        return;
      }
      set({ members: [], loading: true, error: null });
      const q = query(
        collection(db, COLLECTIONS.MEMBERS),
        where("organizationId", "==", organizationId)
      );
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const members = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          set({ members, loading: false, error: null });
        },
        (error) => {
          console.error("Members listener error", error);
          set({ members: [], loading: false, error: error.message });
        }
      );
    },

    // Stop the active listener
    stop: () => {
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
    },

    // Add new member (basic implementation)
    addMember: async (
      organizationId,
      name,
      email,
      role,
      managerId = null,
      photoFile = null,
      subordinateIds = [],
      startDate = null,
    ) => {
      const data = createMemberData(
        organizationId,
        name,
        email,
        role,
        null,
        managerId,
        startDate,
      );
      const ref = await addDoc(collection(db, COLLECTIONS.MEMBERS), data);
      const newMemberId = ref.id;

      // If subordinates are specified, update them to report to the new member
      if (subordinateIds.length > 0) {
        const updatePromises = subordinateIds.map(subordinateId => {
          const subordinateRef = doc(db, COLLECTIONS.MEMBERS, subordinateId);
          return updateDoc(subordinateRef, {
            managerId: newMemberId,
            updatedAt: new Date(),
          });
        });
        
        await Promise.all(updatePromises);
      }

      // handle photo upload if provided
      if (photoFile) {
        try {
          const { compressImage } = await import("$lib/utils/image.js");
          const compressed = await compressImage(photoFile, 0.7, 1024);
          const path = `organizations/${organizationId}/members/${newMemberId}.jpg`;
          const fileRef = storageRef(storage, path);
          await uploadBytes(fileRef, compressed);
          const url = await getDownloadURL(fileRef);
          await updateDoc(ref, { photoURL: url });
        } catch (err) {
          console.error("Photo upload failed", err);
        }
      }

      return newMemberId;
    },

    // Add member "in between" existing hierarchy
    addMemberBetween: async (
      organizationId,
      name,
      email,
      role,
      newManagerId,
      subordinateId,
      photoFile = null,
      startDate = null,
    ) => {
      // We don't need to check the subordinate here since we trust the UI validation
      // The key operation is: new member gets newManagerId, subordinate gets new member as manager

      // Create the new member
      const data = createMemberData(
        organizationId,
        name,
        email,
        role,
        null,
        newManagerId, // Manager ID passed or subordinate's current manager
        startDate,
      );
      const newMemberRef = await addDoc(collection(db, COLLECTIONS.MEMBERS), data);
      const newMemberId = newMemberRef.id;

      // Update the subordinate to report to the new member
      const subordinateRef = doc(db, COLLECTIONS.MEMBERS, subordinateId);
      await updateDoc(subordinateRef, {
        managerId: newMemberId,
        updatedAt: new Date(),
      });

      // Handle photo upload if provided
      if (photoFile) {
        try {
          const { compressImage } = await import("$lib/utils/image.js");
          const compressed = await compressImage(photoFile, 0.7, 1024);
          const path = `organizations/${organizationId}/members/${newMemberId}.jpg`;
          const fileRef = storageRef(storage, path);
          await uploadBytes(fileRef, compressed);
          const url = await getDownloadURL(fileRef);
          await updateDoc(newMemberRef, { photoURL: url });
        } catch (err) {
          console.error("Photo upload failed", err);
        }
      }

      return newMemberId;
    },

    // Add member "in between" existing hierarchy with multiple subordinates
    addMemberBetweenMultiple: async (
      organizationId,
      name,
      email,
      role,
      newManagerId,
      subordinateIds,
      photoFile = null,
      startDate = null,
    ) => {
      // Create the new member
      const data = createMemberData(
        organizationId,
        name,
        email,
        role,
        null,
        newManagerId,
        startDate,
      );
      const newMemberRef = await addDoc(collection(db, COLLECTIONS.MEMBERS), data);
      const newMemberId = newMemberRef.id;

      // Update all subordinates to report to the new member
      const updatePromises = subordinateIds.map(subordinateId => {
        const subordinateRef = doc(db, COLLECTIONS.MEMBERS, subordinateId);
        return updateDoc(subordinateRef, {
          managerId: newMemberId,
          updatedAt: new Date(),
        });
      });
      
      await Promise.all(updatePromises);

      // Handle photo upload if provided
      if (photoFile) {
        try {
          const { compressImage } = await import("$lib/utils/image.js");
          const compressed = await compressImage(photoFile, 0.7, 1024);
          const path = `organizations/${organizationId}/members/${newMemberId}.jpg`;
          const fileRef = storageRef(storage, path);
          await uploadBytes(fileRef, compressed);
          const url = await getDownloadURL(fileRef);
          await updateDoc(newMemberRef, { photoURL: url });
        } catch (err) {
          console.error("Photo upload failed", err);
        }
      }

      return newMemberId;
    },

    // Update node position (x,y values)
    updatePosition: async (memberId, position) => {
      try {
        const memberRef = doc(db, COLLECTIONS.MEMBERS, memberId);
        await updateDoc(memberRef, {
          position,
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("Failed to update member position", error);
      }
    },

    // Update member fields (name, role, email, etc.)
    updateMember: async (memberId, updates, photoFile = undefined) => {
      try {
        const memberRef = doc(db, COLLECTIONS.MEMBERS, memberId);
        await updateDoc(memberRef, {
          ...updates,
          updatedAt: new Date(),
        });

        // Handle photo operations
        const { organizationId } = updates;
        if (organizationId) {
          if (photoFile === null) {
            // Remove existing photo
            try {
              const path = `organizations/${organizationId}/members/${memberId}.jpg`;
              const fileRef = storageRef(storage, path);
              await deleteObject(fileRef);
              // Remove photoURL from member document
              await updateDoc(memberRef, { photoURL: null });
            } catch (e) {
              // Ignore if photo doesn't exist
              console.debug("Photo removal - file not found:", e.code);
              // Still remove photoURL from document even if file doesn't exist
              await updateDoc(memberRef, { photoURL: null });
            }
          } else if (photoFile) {
            // Upload new photo
            const { compressImage } = await import("$lib/utils/image.js");
            const compressed = await compressImage(photoFile, 0.7, 1024);
            const path = `organizations/${organizationId}/members/${memberId}.jpg`;
            const fileRef = storageRef(storage, path);
            await uploadBytes(fileRef, compressed);
            const url = await getDownloadURL(fileRef);
            await updateDoc(memberRef, { photoURL: url });
          }
          // If photoFile is undefined, don't change the photo
        }
      } catch (error) {
        console.error("Failed to update member", error);
        throw error; // Re-throw to let the UI handle the error
      }
    },

    deleteMember: async (memberId, organizationId) => {
      try {
        // First, get the member being deleted to know their manager
        const memberRef = doc(db, COLLECTIONS.MEMBERS, memberId);
        const memberDoc = await getDoc(memberRef);
        
        if (!memberDoc.exists()) {
          throw new Error("Member not found");
        }
        
        const memberData = memberDoc.data();
        const deletedMemberManagerId = memberData.managerId;
        
        // Find all subordinates (direct reports) of the member being deleted
        const subordinatesQuery = query(
          collection(db, COLLECTIONS.MEMBERS),
          where("managerId", "==", memberId),
          where("organizationId", "==", organizationId)
        );
        
        const subordinatesSnapshot = await getDocs(subordinatesQuery);
        const subordinates = subordinatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`Found ${subordinates.length} subordinates to reassign`);
        
        // Reassign subordinates to the deleted member's manager
        // If deleted member was top-level (no manager), subordinates become top-level too
        const newManagerId = deletedMemberManagerId || null;
        
        // Update all subordinates in parallel
        const updatePromises = subordinates.map(subordinate => {
          const subordinateRef = doc(db, COLLECTIONS.MEMBERS, subordinate.id);
          return updateDoc(subordinateRef, {
            managerId: newManagerId,
            updatedAt: new Date(),
          });
        });
        
        // Wait for all subordinate updates to complete
        await Promise.all(updatePromises);
        
        console.log(`Successfully reassigned ${subordinates.length} subordinates to manager: ${newManagerId || 'top-level'}`);
        
        // Now delete the member
        await deleteDoc(memberRef);
        
        // Remove picture
        if (organizationId) {
          const path = `organizations/${organizationId}/members/${memberId}.jpg`;
          const fileRef = storageRef(storage, path);
          try {
            await deleteObject(fileRef);
          } catch (e) {
            // ignore if doesn't exist
            console.debug("ignore missing photo", e.code);
          }
        }
        
        console.log(`Successfully deleted member ${memberId} and reassigned ${subordinates.length} subordinates`);
        
      } catch (error) {
        console.error("Failed to delete member", error);
        throw error; // Re-throw to let the UI handle the error
      }
    },
  };
}

export const membersStore = createMembersStore();