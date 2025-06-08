<script>
  import { authStore } from "$lib/stores/auth.js";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let loading = false;

  // Redirect if already authenticated
  onMount(() => {
    const unsubscribe = authStore.subscribe(
      ({ user, loading: authLoading }) => {
        if (!authLoading && user) {
          goto("/dashboard");
        }
      }
    );

    return unsubscribe;
  });

  async function handleGoogleSignIn() {
    try {
      loading = true;
      await authStore.signInWithGoogle();
      // Redirect will happen automatically via auth state change
    } catch (error) {
      console.error("Sign in failed:", error);
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign In - OrganiChart</title>
</svelte:head>

<div class="login-container">
  <div class="login-card">
    <div class="logo">
      <h1>OrganiChart</h1>
    </div>

    <button
      class="google-signin-btn"
      on:click={handleGoogleSignIn}
      disabled={loading}
    >
      <div class="google-icon">
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      </div>
      {loading ? "Signing in..." : "Sign In"}
    </button>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: var(--surface);
    padding: var(--spacing-4);
  }

  .login-card {
    background: var(--background);
    border-radius: var(--radius-xl);
    padding: var(--spacing-12);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border);
    text-align: center;
    max-width: 400px;
    width: 100%;
  }

  .logo h1 {
    font-size: var(--font-size-3xl);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-8);
  }

  .google-signin-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-3);
    width: 100%;
    padding: var(--spacing-4) var(--spacing-6);
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .google-signin-btn:hover:not(:disabled) {
    background: var(--surface);
    border-color: var(--primary);
    box-shadow: var(--shadow-md);
  }

  .google-signin-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .google-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
