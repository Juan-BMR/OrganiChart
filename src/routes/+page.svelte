<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/stores/auth.js";

  onMount(() => {
    // Subscribe to auth state and redirect accordingly
    const unsubscribe = authStore.subscribe(({ user, loading }) => {
      if (!loading) {
        if (user) {
          goto("/dashboard");
        } else {
          goto("/login");
        }
      }
    });

    return unsubscribe;
  });
</script>

<!-- Branded loading page -->
<div class="landing-page">
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

    <!-- Loading section -->
    <div class="loading-section">
      <div class="loading-container">
        <div class="spinner-rings">
          <div class="ring ring-1"></div>
          <div class="ring ring-2"></div>
          <div class="ring ring-3"></div>
        </div>
        <div class="loading-dots">
          <span class="dot dot-1">•</span>
          <span class="dot dot-2">•</span>
          <span class="dot dot-3">•</span>
        </div>
      </div>
      <p class="loading-text">Preparing your workspace</p>
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
  .landing-page {
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
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-8);
    z-index: 2;
    text-align: center;
    animation: fadeInUp 0.8s ease-out;
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

  .loading-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-4);
  }

  .loading-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spinner-rings {
    position: relative;
    width: 60px;
    height: 60px;
  }

  .ring {
    position: absolute;
    border: 2px solid transparent;
    border-radius: 50%;
    animation: spin 2s linear infinite;
  }

  .ring-1 {
    width: 60px;
    height: 60px;
    border-top-color: var(--primary);
    animation-duration: 2s;
  }

  .ring-2 {
    width: 45px;
    height: 45px;
    top: 7.5px;
    left: 7.5px;
    border-right-color: rgba(99, 102, 241, 0.6);
    animation-duration: 1.5s;
    animation-direction: reverse;
  }

  .ring-3 {
    width: 30px;
    height: 30px;
    top: 15px;
    left: 15px;
    border-bottom-color: rgba(99, 102, 241, 0.3);
    animation-duration: 1s;
  }

  .loading-dots {
    position: absolute;
    bottom: -30px;
    display: flex;
    gap: 4px;
  }

  .dot {
    color: var(--primary);
    font-size: 1.2rem;
    animation: bounce 1.4s ease-in-out infinite both;
  }

  .dot-2 {
    animation-delay: 0.16s;
  }

  .dot-3 {
    animation-delay: 0.32s;
  }

  .loading-text {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
    margin: 0;
    animation: pulse 2s ease-in-out infinite;
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

  @keyframes bounce {
    0%,
    80%,
    100% {
      transform: scale(0);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
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
  }

  @media (max-width: 480px) {
    .content {
      gap: var(--spacing-6);
      padding: var(--spacing-4);
    }

    .brand-title {
      font-size: 1.75rem;
    }

    .brand-subtitle {
      font-size: var(--font-size-base);
    }
  }
</style>
