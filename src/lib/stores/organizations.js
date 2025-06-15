// @ts-nocheck
import { writable } from "svelte/store";
import { authStore } from "$lib/stores/auth.js";
import { db, storage } from "$lib/firebase.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  COLLECTIONS,
  createOrganizationData,
  createPermissionData,
  getPermissionDocId,
  PERMISSION_ROLES,
} from "$lib/db/collections.js";

// Helper to extract file extension
const getFileExtension = (file) => {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop() : "";
};

function createOrganizationsStore() {
  const { subscribe, set } = writable({
    organizations: [],
    loading: true,
    error: null,
  });

  let unsubscribePerms = null;
  let currentUser = null;

  // Listen for auth changes
  authStore.subscribe(({ user, loading }) => {
    if (loading) return; // ignore until auth ready

    // Cleanup previous listeners
    if (unsubscribePerms) {
      unsubscribePerms();
      unsubscribePerms = null;
    }

    if (!user) {
      currentUser = null;
      set({ organizations: [], loading: false, error: null });
    } else {
      currentUser = user;
      // Fetch organizations for this user via permissions collection
      const permsQuery = query(
        collection(db, COLLECTIONS.ORGANIZATION_PERMISSIONS),
        where("userId", "==", user.uid),
      );

      // Start loading
      set({ organizations: [], loading: true, error: null });

      unsubscribePerms = onSnapshot(
        permsQuery,
        async (snapshot) => {
          try {
            const orgIds = snapshot.docs.map((d) => d.data().organizationId);
            if (!orgIds.length) {
              set({ organizations: [], loading: false, error: null });
              return;
            }
            // Fetch organizations in parallel using ids
            const orgDocs = await Promise.all(
              orgIds.map((id) => getDoc(doc(db, COLLECTIONS.ORGANIZATIONS, id))),
            );
            const orgsWithoutCount = orgDocs
              .filter((d) => d.exists())
              .map((d) => ({ id: d.id, ...d.data() }));
            
            // Count members for each organization
            const orgsWithMemberCount = await Promise.all(
              orgsWithoutCount.map(async (org) => {
                try {
                  const membersQuery = query(
                    collection(db, COLLECTIONS.MEMBERS),
                    where("organizationId", "==", org.id)
                  );
                  const membersSnapshot = await getDocs(membersQuery);
                  return {
                    ...org,
                    memberCount: membersSnapshot.size
                  };
                } catch (err) {
                  console.error(`Failed to count members for org ${org.id}:`, err);
                  return {
                    ...org,
                    memberCount: 0
                  };
                }
              })
            );
            
            set({ organizations: orgsWithMemberCount, loading: false, error: null });
          } catch (err) {
            console.error("Failed to load organizations", err);
            set({ organizations: [], loading: false, error: err.message });
          }
        },
        (error) => {
          console.error("Permissions listener error", error);
          set({ organizations: [], loading: false, error: error.message });
        },
      );
    }
  });

  // Create organization function
  const createOrganization = async (name, logoFile = null) => {
    if (!currentUser) throw new Error("Not authenticated");
    const trimmedName = name?.trim();
    if (!trimmedName) throw new Error("Organization name is required");

    console.log("Creating organization with user:", currentUser.uid);

    // Check uniqueness
    const existingSnap = await getDocs(
      query(
        collection(db, COLLECTIONS.ORGANIZATIONS),
        where("name", "==", trimmedName),
      ),
    );
    if (!existingSnap.empty) {
      throw new Error("Organization name already exists");
    }

    // Prepare org data
    const orgData = createOrganizationData(trimmedName, null, currentUser.uid);
    console.log("Organization data:", orgData);

    let orgRef;
    try {
    // Create organization document
      console.log("Creating organization document...");
      orgRef = await addDoc(collection(db, COLLECTIONS.ORGANIZATIONS), orgData);
      console.log("Organization created with ID:", orgRef.id);

    // Create permission document with owner role
    const permId = getPermissionDocId(currentUser.uid, orgRef.id);
    const permData = createPermissionData(
      orgRef.id,
      currentUser.uid,
      PERMISSION_ROLES.OWNER,
      null,
    );
      console.log("Permission data:", permData);
      console.log("Permission ID:", permId);
      
      console.log("Creating permission document...");
    await setDoc(doc(db, COLLECTIONS.ORGANIZATION_PERMISSIONS, permId), permData);
      console.log("Permission created successfully");
    } catch (error) {
      console.error("Detailed error during creation:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      throw error;
    }

    // Handle logo upload if provided
    if (logoFile) {
      const ext = getFileExtension(logoFile);
      const path = `organizations/${orgRef.id}/logo.${ext}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, logoFile);
      const downloadURL = await getDownloadURL(fileRef);
      // Update organization with logoURL
      await updateDoc(orgRef, { logoURL: downloadURL, updatedAt: new Date() });
    }

    return orgRef.id;
  };

  return {
    subscribe,
    createOrganization,
    updateChartColor: async (organizationId, chartColor) => {
      if (!currentUser) throw new Error("Not authenticated");
      
      try {
        await updateDoc(doc(db, COLLECTIONS.ORGANIZATIONS, organizationId), {
          chartColor,
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("Failed to update chart color:", error);
        throw error;
      }
    },
  };
}

export const organizationsStore = createOrganizationsStore();