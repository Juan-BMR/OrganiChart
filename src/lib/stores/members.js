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
    ) => {
      const data = createMemberData(
        organizationId,
        name,
        email,
        role,
        null,
        managerId,
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
    ) => {
      // Create the new member
      const data = createMemberData(
        organizationId,
        name,
        email,
        role,
        null,
        newManagerId,
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

    // Update member fields (name, role, managerId, etc.)
    updateMember: async (memberId, updates, photoFile = null) => {
      try {
        const memberRef = doc(db, COLLECTIONS.MEMBERS, memberId);
        await updateDoc(memberRef, {
          ...updates,
          updatedAt: new Date(),
        });

        // handle optional new photo
        if (photoFile) {
          const { organizationId } = updates; // or pass separately
          if (organizationId) {
            const { compressImage } = await import("$lib/utils/image.js");
            const compressed = await compressImage(photoFile, 0.7, 1024);
            const path = `organizations/${organizationId}/members/${memberId}.jpg`;
            const fileRef = storageRef(storage, path);
            await uploadBytes(fileRef, compressed);
            const url = await getDownloadURL(fileRef);
            await updateDoc(memberRef, { photoURL: url });
          }
        }
      } catch (error) {
        console.error("Failed to update member", error);
      }
    },

    deleteMember: async (memberId, organizationId) => {
      try {
        const memberRef = doc(db, COLLECTIONS.MEMBERS, memberId);
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
      } catch (error) {
        console.error("Failed to delete member", error);
      }
    },
  };
}

export const membersStore = createMembersStore();