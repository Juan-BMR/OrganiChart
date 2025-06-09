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

<div class="login-page">
  <div class="content">
    <!-- Logo/Brand section -->
    <div class="brand-section">
      <div class="logo-container">
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
      </div>
      <h1 class="brand-title">OrganiChart</h1>
      <p class="brand-subtitle">Visualize your organization</p>
    </div>

    <!-- Login Card -->
    <div class="login-card">
      <div class="card-header">
        <h2>Welcome back</h2>
        <p>Sign in to manage your organization charts</p>
      </div>

      <button
        class="google-signin-btn"
        on:click={handleGoogleSignIn}
        disabled={loading}
      >
        {#if loading}
          <div class="loading-spinner"></div>
          <span>Signing in...</span>
        {:else}
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
          <span>Continue with Google</span>
        {/if}
      </button>

      <div class="security-note">
        <svg
          class="shield-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span>Your data is secure and encrypted</span>
      </div>
    </div>
  </div>

  <!-- Background decoration -->
  <div class="background-decoration">
    <div class="decoration-circle circle-1"></div>
    <div class="decoration-circle circle-2"></div>
    <div class="decoration-circle circle-3"></div>
  </div>
</div>

<style>
  .login-page {
    min-height: 100vh;
    background: linear-gradient(
      135deg,
      var(--background) 0%,
      color-mix(in srgb, var(--background) 95%, var(--primary)) 100%
    );
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    padding: var(--spacing-4);
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-8);
    z-index: 2;
    text-align: center;
    animation: fadeInUp 0.8s ease-out;
    width: 100%;
    max-width: 420px;
  }

  .brand-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-4);
  }

  .logo-container {
    width: 80px;
    height: 80px;
    background: var(--primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
    animation: logoFloat 3s ease-in-out infinite;
  }

  .logo-icon {
    width: 40px;
    height: 40px;
    color: white;
  }

  .brand-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--text-primary), var(--primary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .brand-subtitle {
    font-size: var(--font-size-lg);
    color: var(--text-secondary);
    margin: 0;
    font-weight: 400;
  }

  .login-card {
    background: var(--surface);
    border-radius: var(--radius-xl);
    padding: var(--spacing-8);
    box-shadow: var(--shadow-xl);
    border: 1px solid var(--border);
    width: 100%;
    backdrop-filter: blur(10px);
    animation: cardSlideIn 0.6s ease-out 0.2s both;
  }

  .card-header {
    margin-bottom: var(--spacing-6);
  }

  .card-header h2 {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--spacing-2) 0;
  }

  .card-header p {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin: 0;
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
    box-shadow: var(--shadow-sm);
    margin-bottom: var(--spacing-4);
  }

  .google-signin-btn:hover:not(:disabled) {
    background: var(--secondary);
    border-color: var(--primary);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }

  .google-signin-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .google-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Enhance Google icon visibility in dark mode while preserving brand colors */
  :root:not([data-theme="light"]) .google-icon svg {
    filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.3));
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border);
    border-top: 2px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .security-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    padding: var(--spacing-3);
    background: color-mix(in srgb, var(--primary) 5%, transparent);
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--primary) 10%, transparent);
  }

  .shield-icon {
    width: 16px;
    height: 16px;
    color: var(--primary);
  }

  .background-decoration {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .decoration-circle {
    position: absolute;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.1),
      rgba(99, 102, 241, 0.05)
    );
    animation: float 6s ease-in-out infinite;
  }

  .circle-1 {
    width: 200px;
    height: 200px;
    top: 10%;
    right: 10%;
    animation-delay: 0s;
  }

  .circle-2 {
    width: 150px;
    height: 150px;
    bottom: 20%;
    left: 10%;
    animation-delay: 2s;
  }

  .circle-3 {
    width: 100px;
    height: 100px;
    top: 60%;
    right: 20%;
    animation-delay: 4s;
  }

  /* Animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes cardSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes logoFloat {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0px) rotate(0deg);
      opacity: 0.3;
    }
    50% {
      transform: translateY(-20px) rotate(180deg);
      opacity: 0.1;
    }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .brand-title {
      font-size: 2rem;
    }

    .logo-container {
      width: 60px;
      height: 60px;
    }

    .logo-icon {
      width: 30px;
      height: 30px;
    }

    .decoration-circle {
      display: none;
    }

    .login-card {
      padding: var(--spacing-6);
    }
  }

  @media (max-width: 480px) {
    .content {
      gap: var(--spacing-6);
    }

    .brand-title {
      font-size: 1.75rem;
    }

    .brand-subtitle {
      font-size: var(--font-size-base);
    }

    .login-card {
      padding: var(--spacing-5);
    }
  }
</style>
