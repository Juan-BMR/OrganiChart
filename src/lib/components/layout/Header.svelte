<script>
  import { authStore } from "$lib/stores/auth.js";
  import { themeStore } from "$lib/stores/theme.js";
  import { Moon, Sun } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import RuleManagerModal from "$lib/components/RuleManagerModal.svelte";

  export let user = null;

  let currentTheme = "light";
  let imageLoadError = false;
  let showRules = false;

  // Subscribe to theme changes
  themeStore.subscribe((theme) => {
    currentTheme = theme;
  });

  // Compute initials if no photo (similar to MemberNode.svelte)
  $: initials = user?.displayName
    ? user.displayName
        .split(" ")
        .slice(0, 2)
        .map((n) => n.charAt(0).toUpperCase())
        .join("")
    : "";

  // Google-like avatar colors
  const avatarColors = [
    "#1a73e8", // Google Blue
    "#137333", // Google Green
    "#d93025", // Google Red
    "#f9ab00", // Google Yellow
    "#9aa0a6", // Google Grey
    "#673ab7", // Purple
    "#ff6d00", // Orange
    "#00acc1", // Cyan
    "#689f38", // Light Green
    "#e91e63", // Pink
  ];

  // Generate consistent color based on user email
  function getAvatarColor(user) {
    if (!user?.email) return avatarColors[0];

    let hash = 0;
    for (let i = 0; i < user.email.length; i++) {
      const char = user.email.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return avatarColors[Math.abs(hash) % avatarColors.length];
  }

  $: avatarColor = getAvatarColor(user);

  // Reset image error when user changes
  $: if (user) {
    imageLoadError = false;
  }

  function handleImageError() {
    imageLoadError = true;
  }

  async function handleSignOut() {
    try {
      await authStore.signOut();
      // Redirect will happen automatically via auth state change
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  }

  function toggleTheme() {
    themeStore.toggle();
  }

  function goToDashboard() {
    goto("/dashboard");
  }
</script>

{#if user}
  <header class="floating-header">
    <div class="user-info">
      <div class="avatar" style="background-color: {avatarColor};">
        {#if user.photoURL && !imageLoadError}
          <img
            src={user.photoURL}
            alt={user.displayName}
            on:error={handleImageError}
          />
        {:else}
          <span class="initials">{initials}</span>
        {/if}
      </div>
      <span class="user-name">{user.displayName}</span>
    </div>

    <!-- Logo in center -->
    <button
      class="logo-button"
      on:click={goToDashboard}
      title="Go to Dashboard"
    >
      <svg
        class="logo-icon"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2L2 7L12 12L22 7L12 2Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path
          d="M2 17L12 22L22 17"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path
          d="M2 12L12 17L22 12"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
      </svg>
      <span class="logo-text">OrganiChart</span>
    </button>

    <div class="header-actions">
      <button
        class="theme-toggle"
        on:click={toggleTheme}
        title="Toggle {currentTheme === 'light' ? 'dark' : 'light'} mode"
      >
        {#if currentTheme === "light"}
          <Moon size={18} />
        {:else}
          <Sun size={18} />
        {/if}
      </button>
      <button class="rules-btn" on:click={() => (showRules = true)}>Rules</button>
      <button class="logout-btn" on:click={handleSignOut}>Logout</button>
    </div>
  </header>
{/if}

{#if showRules}
  <RuleManagerModal on:close={() => (showRules = false)} />
{/if}

<style>
  .floating-header {
    position: fixed;
    top: var(--spacing-4);
    left: var(--spacing-4);
    right: var(--spacing-4);
    background: var(--primary);
    color: white;
    padding: var(--spacing-3) var(--spacing-6);
    border-radius: var(--radius-xl);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-6);
    box-shadow: var(--shadow-lg);
    z-index: 1000;
    max-width: 1200px;
    margin: 0 auto;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .avatar {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    /* Background color set dynamically via style attribute */
    overflow: hidden;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .initials {
    color: white;
    font-weight: 600;
    font-size: 0.75rem;
    line-height: 1;
  }

  .user-name {
    font-weight: 500;
    font-size: var(--font-size-sm);
  }

  .logo-button {
    background: none;
    border: none;
    color: white;
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    cursor: pointer;
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
    font-weight: 600;
    font-size: var(--font-size-lg);
  }

  .logo-button:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.02);
  }

  .logo-icon {
    width: 28px;
    height: 28px;
    color: white;
  }

  .logo-text {
    font-family:
      "Inter",
      system-ui,
      -apple-system,
      sans-serif;
    letter-spacing: -0.02em;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .theme-toggle {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    padding: var(--spacing-2);
    border-radius: var(--radius-md);
    font-size: 1.2rem;
    cursor: pointer;
    transition: background 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
  }

  .theme-toggle:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .rules-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .rules-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .logout-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .logout-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
