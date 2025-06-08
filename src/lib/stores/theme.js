import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Get initial theme from localStorage or default to 'light'
const getInitialTheme = () => {
  if (browser) {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
};

function createThemeStore() {
  const { subscribe, set, update } = writable(getInitialTheme());

  return {
    subscribe,
    toggle: () => update(theme => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      if (browser) {
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      }
      return newTheme;
    }),
    set: (theme) => {
      if (browser) {
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
      }
      set(theme);
    }
  };
}

export const themeStore = createThemeStore();

// Initialize theme on page load
if (browser) {
  themeStore.subscribe(theme => {
    document.documentElement.setAttribute('data-theme', theme);
  });
} 