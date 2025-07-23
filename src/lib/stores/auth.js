import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { auth } from "$lib/firebase.js";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { googleProvider } from "$lib/firebase.js";
import { db } from "$lib/firebase.js";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, createUserData } from "$lib/db/collections.js";

// Create auth store
function createAuthStore() {
  const { subscribe, set, update } = writable({
    user: null,
    loading: true,
    error: null,
  });

  return {
    subscribe,

    // Initialize auth listener
    init: () => {
      if (!browser || !auth) return;

      return onAuthStateChanged(auth, (user) => {
        set({
          user,
          loading: false,
          error: null,
        });
        // Ensure a user profile document exists / is updated
        ensureUserDocument(user);
      });
    },

    // Sign in with Google
    signInWithGoogle: async () => {
      if (!browser || !auth) return;

      try {
        update((state) => ({ ...state, loading: true, error: null }));

        const result = await signInWithPopup(auth, googleProvider);

        // User will be set automatically by onAuthStateChanged
        return result.user;
      } catch (error) {
        console.error("Sign in error:", error);
        update((state) => ({
          ...state,
          loading: false,
          error: error.message,
        }));
        throw error;
      }
    },

    // Sign out
    signOut: async () => {
      if (!browser || !auth) return;

      try {
        await signOut(auth);
        // User will be set to null automatically by onAuthStateChanged
      } catch (error) {
        console.error("Sign out error:", error);
        update((state) => ({ ...state, error: error.message }));
        throw error;
      }
    },

    // Clear error
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },
  };
}

export const authStore = createAuthStore();

// Helper to create or update user profile in Firestore
async function ensureUserDocument(user) {
  if (!user) return;
  try {
    const userRef = doc(db, COLLECTIONS.USERS, user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, createUserData(user));
    } else {
      const data = snap.data();
      const updates = {};
      if (user.displayName && user.displayName !== data.displayName)
        updates.displayName = user.displayName;
      if (user.photoURL && user.photoURL !== data.photoURL)
        updates.photoURL = user.photoURL;
      if (user.email && user.email !== data.email) updates.email = user.email;
      updates.lastLoginAt = new Date();
      updates.updatedAt = new Date();
      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
      }
    }
  } catch (err) {
    console.error("Failed to ensure user document", err);
  }
}
