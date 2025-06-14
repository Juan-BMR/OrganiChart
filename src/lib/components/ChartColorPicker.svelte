<script>
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  let color = "#6366F1"; // default (matches existing --primary)
  let inputValue = "";
  let isValid = true;
  const STORAGE_KEY = "orgchartPrimaryColor";

  const HEX_REGEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

  onMount(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidHex(stored)) {
      color = normalizeHex(stored);
      inputValue = color;
      applyColor(color);
    } else {
      inputValue = color;
      applyColor(color);
    }
  });

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
    debounceTimeout = setTimeout(() => {
      if (isValid) {
        color = normalizeHex(val);
        applyColor(color);
        localStorage.setItem(STORAGE_KEY, color);
      }
    }, 300);
  }

  function applyColor(hex) {
    if (!isValidHex(hex)) return;
    document.documentElement.style.setProperty("--primary", hex);
    // derive lighter and darker variants
    document.documentElement.style.setProperty("--primary-dark", adjustColor(hex, -15));
    document.documentElement.style.setProperty("--primary-light", adjustColor(hex, 15));
  }

  // Utility: adjust color brightness
  function adjustColor(hex, percent) {
    const h = normalizeHex(hex).slice(1);
    const bigint = parseInt(h.length === 3 ? h.split("").map(c=>c+c).join("") : h, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    const adjust = (c) => {
      const amt = Math.round((percent/100)*255);
      const v = Math.min(255, Math.max(0, c + amt));
      return v;
    };
    r = adjust(r);
    g = adjust(g);
    b = adjust(b);
    const toHex = (v) => v.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  function resetColor() {
    color = "#6366F1";
    inputValue = color;
    applyColor(color);
    localStorage.removeItem(STORAGE_KEY);
    isValid = true;
  }
</script>

<div class="color-picker" in:fade>
  <label>
    <span class="label-text">Chart Color</span>
    <div class="input-wrapper">
      <input
        type="text"
        bind:value={inputValue}
        on:input={handleInput}
        class:is-error={!isValid}
        placeholder="#6366F1"
        maxlength="7"
      />
      <span
        class="swatch"
        style="background:{isValid ? color : '#ccc'};"
        aria-label="current color preview"
      ></span>
    </div>
  </label>
  <button class="reset-btn" on:click={resetColor} title="Reset to default">
    Reset
  </button>
</div>

<style>
  .color-picker {
    position: fixed;
    bottom: 24px;
    left: 24px;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: var(--spacing-4);
    z-index: 1500;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    min-width: 220px;
    animation: fade-in 0.2s ease-out;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  label {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
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
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
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
    border: 1px solid var(--border);
    transition: background 0.2s ease;
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
      padding: var(--spacing-3);
    }
  }
</style>