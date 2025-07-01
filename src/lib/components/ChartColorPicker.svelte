<script>
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { db } from "$lib/firebase.js";
  import { doc, getDoc, updateDoc } from "firebase/firestore";
  import { COLLECTIONS } from "$lib/db/collections.js";

  export let organizationId;

  let color = "#6366F1"; // default fallback
  let inputValue = "";
  let isValid = true;
  let loading = false;
  let isExpanded = false;

  const HEX_REGEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

  onMount(async () => {
    // Initialize chart color variables with defaults
    document.documentElement.style.setProperty("--chart-primary", "#6366F1");
    document.documentElement.style.setProperty(
      "--chart-primary-dark",
      adjustColor("#6366F1", -15),
    );
    document.documentElement.style.setProperty(
      "--chart-primary-light",
      adjustColor("#6366F1", 15),
    );

    if (organizationId) {
      await loadOrganizationColor();
    } else {
      // Fallback to localStorage if no organizationId
      const stored = localStorage.getItem("orgchartPrimaryColor");
      if (stored && isValidHex(stored)) {
        color = normalizeHex(stored);
        inputValue = color;
        applyColor(color);
      } else {
        inputValue = color;
        applyColor(color);
      }
    }
  });

  async function loadOrganizationColor() {
    try {
      const orgDoc = await getDoc(
        doc(db, COLLECTIONS.ORGANIZATIONS, organizationId),
      );
      if (orgDoc.exists()) {
        const orgData = orgDoc.data();
        const orgColor = orgData.chartColor || "#6366F1";
        color = normalizeHex(orgColor);
        inputValue = color;
        applyColor(color);
      }
    } catch (error) {
      console.error("Failed to load organization color:", error);
      // Fallback to default
      inputValue = color;
      applyColor(color);
    }
  }

  function normalizeHex(val) {
    if (!val) return "";
    return val.startsWith("#") ? val.toUpperCase() : `#${val.toUpperCase()}`;
  }

  function isValidHex(val) {
    return HEX_REGEX.test(val.startsWith("#") ? val.slice(1) : val);
  }

  let debounceTimeout;
  function handleInput(event) {
    let val = event.target.value.trim();
    if (!val.startsWith("#")) {
      val = `#${val}`;
    }
    inputValue = val.toUpperCase();
    isValid = isValidHex(val);

    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      if (isValid) {
        color = normalizeHex(val);
        applyColor(color);
        await saveColorToDatabase(color);
      }
    }, 300);
  }

  function handleKeyDown(event) {
    // Prevent arrow keys and other navigation keys from bubbling up to chart controls
    const preventKeys = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "+",
      "=",
      "-",
      "Escape",
    ];
    if (preventKeys.includes(event.key)) {
      event.stopPropagation();
    }
  }

  async function saveColorToDatabase(hex) {
    if (!organizationId) {
      // Fallback to localStorage if no organizationId
      localStorage.setItem("orgchartPrimaryColor", hex);
      return;
    }

    try {
      loading = true;
      await updateDoc(doc(db, COLLECTIONS.ORGANIZATIONS, organizationId), {
        chartColor: hex,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Failed to save color to database:", error);
      // Fallback to localStorage
      localStorage.setItem("orgchartPrimaryColor", hex);
    } finally {
      loading = false;
    }
  }

  function applyColor(hex) {
    if (!isValidHex(hex)) return;
    // Use chart-specific CSS variables instead of global --primary
    document.documentElement.style.setProperty("--chart-primary", hex);
    document.documentElement.style.setProperty(
      "--chart-primary-dark",
      adjustColor(hex, -15),
    );
    document.documentElement.style.setProperty(
      "--chart-primary-light",
      adjustColor(hex, 15),
    );
  }

  // Utility: adjust color brightness
  function adjustColor(hex, percent) {
    const h = normalizeHex(hex).slice(1);
    const bigint = parseInt(
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h,
      16,
    );
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    const adjust = (c) => {
      const amt = Math.round((percent / 100) * 255);
      const v = Math.min(255, Math.max(0, c + amt));
      return v;
    };
    r = adjust(r);
    g = adjust(g);
    b = adjust(b);
    const toHex = (v) => v.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  async function resetColor() {
    color = "#6366F1";
    inputValue = color;
    applyColor(color);
    await saveColorToDatabase(color);
    isValid = true;
  }

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }
</script>

<div class="color-picker" class:expanded={isExpanded} in:fade>
  <!-- Collapsed State: Just the swatch -->
  {#if !isExpanded}
    <button
      class="swatch-toggle"
      on:click={toggleExpanded}
      title="Chart Color Picker - Click to customize"
    >
      <div class="swatch-container">
        <span
          class="swatch"
          style="background:{isValid ? color : '#ccc'};"
          aria-label="current color preview"
        ></span>
        <div class="picker-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3V1m0 20v-2m-4-4h2m12-10a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2V7a2 2 0 012-2h2zm-2 4h2m0 0v2"
            />
          </svg>
        </div>
      </div>
      <span class="tooltip-text">Color Picker</span>
    </button>
  {:else}
    <!-- Expanded State: Full interface -->
    <div class="picker-header">
      <span class="label-text">Chart Color</span>
      <button class="collapse-btn" on:click={toggleExpanded} title="Collapse">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <div class="input-wrapper">
      <button
        class="swatch clickable"
        style="background:{isValid ? color : '#ccc'};"
        on:click={toggleExpanded}
        title="Collapse color picker"
        aria-label="current color preview - click to collapse"
      ></button>
      <input
        type="text"
        bind:value={inputValue}
        on:input={handleInput}
        on:keydown={handleKeyDown}
        class:is-error={!isValid}
        placeholder="#6366F1"
        maxlength="7"
        disabled={loading}
      />
    </div>

    <button
      class="reset-btn"
      on:click={resetColor}
      title="Reset to default"
      disabled={loading}
    >
      {loading ? "Saving..." : "Reset"}
    </button>
  {/if}
</div>

<style>
  .color-picker {
    position: fixed;
    bottom: var(--spacing-4);
    left: var(--spacing-6);
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: 1500;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
    animation: fade-in 0.2s ease-out;
    margin-bottom: var(--spacing-2);
  }
  .color-picker:hover {
    border-color: var(--primary-light);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  /* Collapsed state */
  .color-picker:not(.expanded) {
    padding: var(--spacing-1);
    min-width: auto;
  }

  /* Expanded state */
  .color-picker.expanded {
    padding: var(--spacing-4);
    gap: var(--spacing-3);
    min-width: 220px;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .swatch-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-2);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: var(--spacing-2);
    position: relative;
  }

  /* .swatch-toggle:hover {
    transform: scale(1.05);
    background: rgba(255, 255, 255, 0.1);
  } */

  .swatch-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .swatch-toggle .swatch {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .swatch-toggle:hover .swatch {
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .picker-icon {
    position: absolute;
    bottom: -1px;
    right: -1px;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 12px;
    height: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: all 0.2s ease;
  }

  .swatch-toggle:hover .picker-icon {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }

  .picker-icon svg {
    width: 8px;
    height: 8px;
  }

  .tooltip-text {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-weight: 500;
    opacity: 0.8;
    transition: all 0.2s ease;
  }

  .swatch-toggle:hover .tooltip-text {
    color: var(--text-primary);
    opacity: 1;
  }

  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
  }

  .collapse-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-1);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }

  .collapse-btn:hover {
    background: var(--surface);
    color: var(--text-primary);
  }

  .collapse-btn svg {
    width: 14px;
    height: 14px;
  }

  .label-text {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  input[type="text"] {
    flex: 1;
    padding: var(--spacing-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background: var(--background);
    color: var(--text-primary);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  input[type="text"]:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 30%, transparent);
    outline: none;
  }

  input.is-error {
    border-color: var(--error);
  }

  .swatch {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid var(--border);
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .swatch.clickable {
    cursor: pointer;
    background: none;
    padding: 0;
  }

  .swatch.clickable:hover {
    border-color: var(--primary);
    transform: scale(1.05);
  }

  .reset-btn {
    align-self: flex-end;
    background: var(--surface);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reset-btn:hover {
    background: var(--secondary);
    color: var(--text-primary);
  }

  /* Responsive adjustment on mobile to avoid bottom nav (if any) */
  @media (max-width: 768px) {
    .color-picker {
      bottom: 80px;
      left: 12px;
    }

    .color-picker:not(.expanded) {
      padding: var(--spacing-1);
    }

    .color-picker.expanded {
      padding: var(--spacing-3);
      min-width: 200px;
    }
  }
</style>
