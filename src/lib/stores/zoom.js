import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Default zoom sensitivity (8% per scroll - much faster)
const DEFAULT_ZOOM_SENSITIVITY = 1.08;

// Create the store with default value
function createZoomStore() {
  // Initialize with default value
  const { subscribe, set } = writable(DEFAULT_ZOOM_SENSITIVITY);

  return {
    subscribe,
    setSensitivity: (sensitivity) => {
      set(sensitivity);
      // Save to localStorage if in browser
      if (browser) {
        localStorage.setItem('zoomSensitivity', sensitivity.toString());
      }
    },
    loadSensitivity: () => {
      if (browser) {
        const stored = localStorage.getItem('zoomSensitivity');
        if (stored) {
          const sensitivity = parseFloat(stored);
          if (!isNaN(sensitivity) && sensitivity >= 1.02 && sensitivity <= 1.2) {
            set(sensitivity);
          }
        }
      }
    },
    reset: () => {
      set(DEFAULT_ZOOM_SENSITIVITY);
      if (browser) {
        localStorage.removeItem('zoomSensitivity');
      }
    }
  };
}

export const zoomStore = createZoomStore(); 