<!--
  UserInfoSidebar.svelte – A highly-polished, accessible sidebar component for displaying
  member information. Slides in from the right, provides multiple close mechanisms, and
  respects the app's CSS custom-property driven dark-first theming system.

  Public API
  ──────────
  • open   (boolean) – whether the sidebar is visible.
  • member (object  ) – the user/member data to display. Expected shape:
      {
        id: string,
        name: string,
        email?: string,
        role?: string,
        department?: string,
        manager?: { id: string, name: string, photoURL?: string },
        directReports?: Array<{ id: string, name: string }>,
        level?: string,
        createdAt?: Date | string,
        phone?: string,
        location?: string,
        timeZone?: string,
        photoURL?: string
      }
  
  Events
  ──────
  • close          – emitted whenever the sidebar requests to close.
  • edit           – emitted when the Edit button is pressed.
  • delete         – emitted when the Delete button is pressed.
  • viewInChart    – emitted when the View in Chart action is pressed.
-->

<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import { fly, fade } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { browser } from "$app/environment";

  export let open = false;
  export let member: any = null; // loosely-typed – adjust according to your data model
  export let loading: boolean = false; // show skeleton shimmer while loading
  export let error: string | null = null; // non-null means data load failed and retry offered

  const dispatch = createEventDispatcher();

  // Compute member initials for avatar fallback
  $: initials = member?.name
    ? member.name
        .split(" ")
        .slice(0, 2)
        .map((part: string) => part.charAt(0).toUpperCase())
        .join("")
    : "";

  function closeSidebar() {
    dispatch("close");
  }

  // Retry helper – surfaces intent to parent to trigger data fetch again
  function retry() {
    dispatch("retry");
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      closeSidebar();
    }
  }

  // Manage global key listener only while sidebar is open
  onMount(() => {
    if (!browser) return;
    if (open) document.addEventListener("keydown", handleKeyDown);
  });

  $: if (browser) {
    if (open) {
      document.body.style.overflow = "hidden"; // prevent body scroll while sidebar open
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    }
  }

  onDestroy(() => {
    if (browser) {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    }
  });

  /*****************************
   * Swipe-to-close (mobile)
   *****************************/
  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 80;

  function handleTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }

  function handleTouchMove(e: TouchEvent) {
    const t = e.touches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;

    // Horizontal swipe with right direction & dominant over vertical movement
    if (dx > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      closeSidebar();
    }
  }
</script>

{#if open}
  <!-- Backdrop overlay -->
  <div
    class="overlay"
    on:click|self={closeSidebar}
    transition:fade={{ duration: 200 }}
  ></div>

  <!-- Sidebar panel -->
  <aside
    class="sidebar"
    role="dialog"
    aria-labelledby="sidebar-title"
    tabindex="-1"
    transition:fly={{ x: 460, duration: 250, easing: cubicOut }}
    on:touchstart={handleTouchStart}
    on:touchmove={handleTouchMove}
  >
    <!-- Close button -->
    <button class="close-btn" aria-label="Close sidebar" on:click={closeSidebar}>
      ×
    </button>

    {#if loading}
      <!-- Loading skeleton -->
      <div class="skeleton-wrapper">
        <div class="avatar-skeleton shimmer"></div>
        <div class="line-skeleton name shimmer"></div>
        <div class="line-skeleton role shimmer"></div>
        <div class="skeleton-list">
          {#each Array(6) as _}
            <div class="line-skeleton shimmer"></div>
          {/each}
        </div>
      </div>
    {:else if error}
      <!-- Error state with retry -->
      <div class="error-state">
        <p>{error}</p>
        <button class="primary" on:click={retry}>Retry</button>
      </div>
    {:else}
      <!-- Header section -->
      <div class="header">
        <div class="avatar">
          {#if member?.photoURL}
            <img src={member.photoURL} alt={member.name} />
          {:else if initials}
            <span>{initials}</span>
          {/if}
        </div>
        <h2 id="sidebar-title" class="name">{member?.name}</h2>
        {#if member?.role}
          <p class="role">{member.role}</p>
        {/if}
      </div>

      <div class="content">
        <!-- Personal Details -->
        <section>
          <h3>Personal Details</h3>
          <ul>
            {#if member?.email}
              <li><span>Email:</span><a href={`mailto:${member.email}`}>{member.email}</a></li>
            {/if}
            {#if member?.department}
              <li><span>Department:</span>{member.department}</li>
            {/if}
            {#if member?.phone}
              <li><span>Phone:</span><a href={`tel:${member.phone}`}>{member.phone}</a></li>
            {/if}
            {#if member?.location}
              <li><span>Location:</span>{member.location}</li>
            {/if}
            {#if member?.timeZone}
              <li><span>Time Zone:</span>{member.timeZone}</li>
            {/if}
          </ul>
        </section>

        <!-- Organizational context -->
        {#if member?.manager || member?.directReports?.length || member?.level || member?.createdAt}
          <section>
            <h3>Organizational Context</h3>
            <ul>
              {#if member?.manager}
                <li>
                  <span>Manager:</span>
                  <div class="manager-info">
                    {#if member.manager.photoURL}
                      <img src={member.manager.photoURL} alt={member.manager.name} />
                    {/if}
                    {member.manager.name}
                  </div>
                </li>
              {/if}
              {#if member?.directReports?.length}
                <li>
                  <span>Direct Reports:</span>
                  {member.directReports.length}
                </li>
              {/if}
              {#if member?.level}
                <li><span>Level:</span>{member.level}</li>
              {/if}
              {#if member?.createdAt}
                <li>
                  <span>Member Since:</span>
                  {new Date(member.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </li>
              {/if}
            </ul>
          </section>
        {/if}
      </div>

      <!-- Action buttons -->
      <div class="actions">
        <button class="primary" on:click={() => dispatch("edit", { member })}>Edit</button>
        <button class="danger" on:click={() => dispatch("delete", { member })}>Delete</button>
        <button class="secondary" on:click={() => dispatch("viewInChart", { member })}>
          View in Chart
        </button>
      </div>
    {/if}
  </aside>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    z-index: 3000; /* above modals (2000) */
  }

  .sidebar {
    position: fixed;
    right: 0;
    top: 0;
    height: 100vh;
    width: min(420px, 100%);
    background: var(--surface);
    box-shadow: -4px 0 10px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    z-index: 3001;
    overflow-y: auto;
    padding: var(--spacing-6) var(--spacing-6) var(--spacing-8);
  }

  /* Close button */
  .close-btn {
    position: absolute;
    top: var(--spacing-4);
    right: var(--spacing-4);
    font-size: 1.5rem;
    color: var(--text-secondary);
    background: none;
    border: none;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s ease, transform 0.2s ease;
  }

  .close-btn:hover {
    background: color-mix(in srgb, var(--primary) 20%, transparent);
    transform: scale(1.05);
  }

  /* Header */
  .header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-6);
  }

  .avatar {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    overflow: hidden;
    border: 4px solid var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background);
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar span {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--primary);
  }

  .name {
    font-size: var(--font-size-3xl);
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
  }

  .role {
    font-size: var(--font-size-base);
    color: var(--text-secondary);
    text-align: center;
  }

  /* Sections */
  section {
    margin-bottom: var(--spacing-6);
  }

  section h3 {
    font-size: var(--font-size-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-2);
  }

  ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  li {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
  }

  li span {
    font-weight: 600;
    min-width: 130px;
    color: var(--text-secondary);
  }

  li a:hover {
    text-decoration: underline;
    color: var(--primary-light);
  }

  /* Manager info */
  .manager-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .manager-info img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
  }

  /* Action buttons */
  .actions {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .actions button {
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 600;
    transition: background-color 0.2s ease, transform 0.1s ease;
  }

  .actions button:hover {
    transform: translateY(-1px);
  }

  .primary {
    background: var(--primary);
    color: #fff;
  }

  .primary:hover {
    background: var(--primary-dark);
  }

  .secondary {
    background: color-mix(in srgb, var(--primary) 12%, transparent);
    color: var(--primary-light);
  }

  .secondary:hover {
    background: color-mix(in srgb, var(--primary) 20%, transparent);
  }

  .danger {
    background: var(--error);
    color: #fff;
  }

  .danger:hover {
    background: color-mix(in srgb, var(--error) 80%, #000 20%);
  }

  /************* Shimmer Skeleton *************/
  @keyframes shimmer {
    0% {
      background-position: -400px 0;
    }
    100% {
      background-position: 400px 0;
    }
  }

  .shimmer {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--surface) 80%, transparent) 0%,
      color-mix(in srgb, var(--surface) 60%, var(--primary-light) 20%) 50%,
      color-mix(in srgb, var(--surface) 80%, transparent) 100%
    );
    background-size: 400px 100%;
    animation: shimmer 1.2s infinite;
  }

  .skeleton-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-4);
  }

  .avatar-skeleton {
    width: 96px;
    height: 96px;
    border-radius: 50%;
  }

  .line-skeleton {
    height: 16px;
    width: 80%;
    border-radius: var(--radius-md);
  }

  .line-skeleton.name {
    height: 24px;
  }

  .skeleton-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    margin-top: var(--spacing-4);
  }

  /************* Error State *************/
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-4);
    text-align: center;
    padding: var(--spacing-6);
    color: var(--error);
  }
  .error-state p {
    font-size: var(--font-size-base);
  }

  @media (max-width: 600px) {
    .sidebar {
      width: 100%;
      padding-left: var(--spacing-4);
      padding-right: var(--spacing-4);
    }
  }
</style>