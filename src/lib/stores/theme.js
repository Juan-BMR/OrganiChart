import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Get initial theme from localStorage or default to 'dark'
const getInitialTheme = () => {
  if (browser) {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    
    // Default to dark mode (ignoring system preference)
    // Users can manually switch to light if they prefer
  }
  return 'dark';
};

function createThemeStore() {
  const { subscribe, set, update } = writable(getInitialTheme());

  return {
    subscribe,
    toggle: () => update(theme => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      if (browser) {
        localStorage.setItem('theme', newTheme);
        // Only set data-theme attribute if theme is light (since dark is default CSS)
        if (newTheme === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
      return newTheme;
    }),
    set: (theme) => {
      if (browser) {
        localStorage.setItem('theme', theme);
        // Only set data-theme attribute if theme is light (since dark is default CSS)
        if (theme === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
      set(theme);
    }
  };
}

export const themeStore = createThemeStore();

// Initialize theme on page load
if (browser) {
  themeStore.subscribe(theme => {
    // Only set data-theme attribute if theme is light (since dark is default CSS)
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  });
} 