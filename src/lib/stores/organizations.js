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
  deleteDoc,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
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
  let unsubscribeOrgs = [];
  let currentUser = null;

  // Listen for auth changes
  authStore.subscribe(({ user, loading }) => {
    if (loading) return; // ignore until auth ready

    // Cleanup previous listeners
    if (unsubscribePerms) {
      unsubscribePerms();
      unsubscribePerms = null;
    }
    unsubscribeOrgs.forEach(unsub => unsub());
    unsubscribeOrgs = [];

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

            // Clean up existing organization listeners
            unsubscribeOrgs.forEach(unsub => unsub());
            unsubscribeOrgs = [];

            // Set up real-time listeners for each organization
            const organizationsMap = new Map();
            const processedOrgs = new Set();

            const updateOrganizations = () => {
              const orgsArray = Array.from(organizationsMap.values());
              set({ organizations: orgsArray, loading: false, error: null });
            };

            orgIds.forEach(orgId => {
              const orgUnsubscribe = onSnapshot(
                doc(db, COLLECTIONS.ORGANIZATIONS, orgId),
                async (orgDoc) => {
                  if (orgDoc.exists()) {
                    try {
                      // Count members for this organization
                      const membersQuery = query(
                        collection(db, COLLECTIONS.MEMBERS),
                        where("organizationId", "==", orgId)
                      );
                      const membersSnapshot = await getDocs(membersQuery);
                      
                      const orgData = {
                        id: orgDoc.id,
                        ...orgDoc.data(),
                        memberCount: membersSnapshot.size
                      };
                      
                      organizationsMap.set(orgId, orgData);
                      processedOrgs.add(orgId);
                      
                      // Update immediately for real-time updates
                      updateOrganizations();
                    } catch (err) {
                      console.error(`Failed to count members for org ${orgId}:`, err);
                      const orgData = {
                        id: orgDoc.id,
                        ...orgDoc.data(),
                        memberCount: 0
                      };
                      organizationsMap.set(orgId, orgData);
                      processedOrgs.add(orgId);
                      
                      // Update immediately for real-time updates
                      updateOrganizations();
                    }
                  } else {
                    // Organization was deleted
                    organizationsMap.delete(orgId);
                    processedOrgs.delete(orgId);
                    updateOrganizations();
                  }
                },
                (error) => {
                  console.error(`Organization listener error for ${orgId}:`, error);
                }
              );
              unsubscribeOrgs.push(orgUnsubscribe);
            });
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
    updateOrganization: async (organizationId, updates, logoFile = undefined) => {
      if (!currentUser) throw new Error("Not authenticated");
      
      try {
        const updateData = { ...updates, updatedAt: new Date() };

        // Handle logo update
        if (logoFile !== undefined) {
          if (logoFile === null) {
            // Remove logo - delete from storage and remove URL from document
            const orgDoc = await getDoc(doc(db, COLLECTIONS.ORGANIZATIONS, organizationId));
            if (orgDoc.exists() && orgDoc.data().logoURL) {
                           try {
               // Delete from storage using common extensions
               const logoPath = `organizations/${organizationId}/logo`;
               // Try to delete with common extensions
               const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
               for (const ext of extensions) {
                 try {
                   await deleteObject(storageRef(storage, `${logoPath}.${ext}`));
                   break; // If successful, stop trying other extensions
                 } catch {
                   // Continue to next extension
                 }
               }
              } catch (error) {
                console.warn("Failed to delete logo from storage:", error);
                // Continue with update even if storage deletion fails
              }
            }
            updateData.logoURL = null;
          } else if (logoFile) {
            // Upload new logo
            const ext = getFileExtension(logoFile);
            const path = `organizations/${organizationId}/logo.${ext}`;
            const fileRef = storageRef(storage, path);
            await uploadBytes(fileRef, logoFile);
            const downloadURL = await getDownloadURL(fileRef);
            updateData.logoURL = downloadURL;
          }
        }

        // Update organization document
        await updateDoc(doc(db, COLLECTIONS.ORGANIZATIONS, organizationId), updateData);
      } catch (error) {
        console.error("Failed to update organization:", error);
        throw error;
      }
    },
    deleteOrganization: async (organizationId) => {
      if (!currentUser) throw new Error("Not authenticated");
      
      try {
        // Delete all members in the organization
        const membersQuery = query(
          collection(db, COLLECTIONS.MEMBERS),
          where("organizationId", "==", organizationId)
        );
        const membersSnapshot = await getDocs(membersQuery);
        const memberDeletePromises = membersSnapshot.docs.map(memberDoc => 
          deleteDoc(memberDoc.ref)
        );
        await Promise.all(memberDeletePromises);

        // Delete all organization permissions
        const permsQuery = query(
          collection(db, COLLECTIONS.ORGANIZATION_PERMISSIONS),
          where("organizationId", "==", organizationId)
        );
        const permsSnapshot = await getDocs(permsQuery);
        const permDeletePromises = permsSnapshot.docs.map(permDoc => 
          deleteDoc(permDoc.ref)
        );
        await Promise.all(permDeletePromises);

        // Finally, delete the organization itself
        await deleteDoc(doc(db, COLLECTIONS.ORGANIZATIONS, organizationId));
      } catch (error) {
        console.error("Failed to delete organization:", error);
        throw error;
      }
    },
  };
}

export const organizationsStore = createOrganizationsStore();