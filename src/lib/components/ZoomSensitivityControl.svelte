<script>
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { zoomStore } from "$lib/stores/zoom.js";

    let sensitivity = 1.02;
    let isExpanded = false;

    // Subscribe to zoom store
    const unsubscribe = zoomStore.subscribe((value) => {
        sensitivity = value;
    });

    onMount(() => {
        // Load sensitivity from localStorage on mount
        zoomStore.loadSensitivity();

        return () => {
            unsubscribe();
        };
    });

    function toggleExpanded() {
        isExpanded = !isExpanded;
    }

    function handleSensitivityChange(event) {
        const value = parseFloat(event.target.value);
        sensitivity = value;
        zoomStore.setSensitivity(value);
    }

    function setPreset(value) {
        sensitivity = value;
        zoomStore.setSensitivity(value);
    }

    function resetToDefault() {
        zoomStore.reset();
    }

    // Convert sensitivity to percentage for display
    $: sensitivityPercent = Math.round((sensitivity - 1) * 1000);
</script>

<div class="zoom-sensitivity" class:expanded={isExpanded} in:fade>
    <!-- Collapsed State: Just the icon -->
    {#if !isExpanded}
        <button
            class="sensitivity-toggle"
            on:click={toggleExpanded}
            title="Zoom Sensitivity - Click to adjust"
        >
            <div class="sensitivity-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                    />
                </svg>
            </div>
            <span class="tooltip-text">Zoom Speed</span>
        </button>
    {:else}
        <!-- Expanded State: Full interface -->
        <div class="sensitivity-header">
            <span class="label-text">Zoom Speed</span>
            <button
                class="collapse-btn"
                on:click={toggleExpanded}
                title="Collapse"
            >
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

        <div class="sensitivity-content">
            <!-- Current value display -->
            <div class="current-value">
                <span class="value-text">{sensitivityPercent}%</span>
                <span class="value-label">per scroll</span>
            </div>

            <!-- Slider -->
            <div class="slider-wrapper">
                <input
                    type="range"
                    min="1.02"
                    max="1.2"
                    step="0.01"
                    bind:value={sensitivity}
                    on:input={handleSensitivityChange}
                    class="sensitivity-slider"
                />
                <div class="slider-labels">
                    <span>Slow</span>
                    <span>Fast</span>
                </div>
            </div>

            <!-- Presets -->
            <div class="presets">
                <button
                    class="preset-btn"
                    class:active={sensitivity === 1.05}
                    on:click={() => setPreset(1.05)}
                >
                    Slow
                </button>
                <button
                    class="preset-btn"
                    class:active={sensitivity === 1.08}
                    on:click={() => setPreset(1.08)}
                >
                    Normal
                </button>
                <button
                    class="preset-btn"
                    class:active={sensitivity === 1.15}
                    on:click={() => setPreset(1.15)}
                >
                    Fast
                </button>
            </div>

            <!-- Reset button -->
            <button
                class="reset-btn"
                on:click={resetToDefault}
                title="Reset to default"
            >
                Reset
            </button>
        </div>
    {/if}
</div>

<style>
    .zoom-sensitivity {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
        display: flex;
        flex-direction: column;
        transition: all 0.3s ease;
        animation: fade-in 0.2s ease-out;
    }

    .zoom-sensitivity:hover {
        border-color: var(--primary-light);
        box-shadow: var(--shadow-lg);
    }

    /* Collapsed state */
    .zoom-sensitivity:not(.expanded) {
        padding: var(--spacing-1);
        min-width: auto;
    }

    /* Expanded state */
    .zoom-sensitivity.expanded {
        padding: var(--spacing-4);
        gap: var(--spacing-3);
        min-width: 200px;
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

    .sensitivity-toggle {
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

    .sensitivity-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-primary);
        transition: all 0.2s ease;
    }

    .sensitivity-toggle:hover .sensitivity-icon {
        color: var(--primary);
    }

    .sensitivity-icon svg {
        width: 16px;
        height: 16px;
    }

    .tooltip-text {
        font-size: var(--font-size-sm);
        color: var(--text-primary);
        font-weight: 500;
        transition: all 0.2s ease;
    }

    .sensitivity-toggle:hover .tooltip-text {
        color: var(--text-primary);
        opacity: 1;
    }

    .sensitivity-header {
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
        color: var(--text-primary);
        font-weight: 500;
    }

    .sensitivity-content {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-3);
    }

    .current-value {
        text-align: center;
        padding: var(--spacing-2);
        background: var(--background);
        border-radius: var(--radius-md);
        border: 1px solid var(--border);
    }

    .value-text {
        font-size: var(--font-size-lg);
        font-weight: 600;
        color: var(--primary);
        display: block;
    }

    .value-label {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
    }

    .slider-wrapper {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-1);
    }

    .sensitivity-slider {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: var(--border);
        outline: none;
        appearance: none;
        cursor: pointer;
    }

    .sensitivity-slider::-webkit-slider-thumb {
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--primary);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .sensitivity-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 0 0 4px
            color-mix(in srgb, var(--primary) 20%, transparent);
    }

    .sensitivity-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--primary);
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
    }

    .slider-labels {
        display: flex;
        justify-content: space-between;
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
    }

    .presets {
        display: flex;
        gap: var(--spacing-1);
    }

    .preset-btn {
        flex: 1;
        padding: var(--spacing-2) var(--spacing-3);
        background: var(--background);
        color: var(--text-secondary);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        font-size: var(--font-size-xs);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .preset-btn:hover {
        background: var(--secondary);
        color: var(--text-primary);
    }

    .preset-btn.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
    }

    .reset-btn {
        align-self: center;
        background: var(--surface);
        color: var(--text-secondary);
        font-size: var(--font-size-xs);
        padding: var(--spacing-2) var(--spacing-4);
        border-radius: var(--radius-md);
        border: 1px solid var(--border);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .reset-btn:hover {
        background: var(--secondary);
        color: var(--text-primary);
    }
</style>
