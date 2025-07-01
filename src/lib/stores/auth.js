import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { auth } from "$lib/firebase.js";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { googleProvider } from "$lib/firebase.js";

// Create auth store
function createAuthStore() {
  const { subscribe, set, update } = writable({
    user: null,
    loading: true,
    error: null,
  });
//Conflic 1
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
