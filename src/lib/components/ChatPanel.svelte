<script>
  import {
    chatHistory,
    isThinking,
    sendMessage,
    setOrganization,
    toggleToolMessage,
    chatError,
  } from "$lib/stores/chat";
  import { afterUpdate, createEventDispatcher, onMount } from "svelte";

  // Component props
  export let organizationId = "";

  // ===== COMPONENT STATE =====
  let collapsed = true;
  let input = "";
  let messagesEl = null;
  let textareaEl = null;

  // ===== EVENT DISPATCHER =====
  const dispatch = createEventDispatcher();

  // ===== REACTIVE STATEMENTS =====
  $: if (organizationId) {
    setOrganization(organizationId);
  }

  // Panel management
  function togglePanel() {
    collapsed = !collapsed;
    dispatch("panelToggle", { collapsed });
  }

  // ===== MESSAGE HANDLING =====
  async function handleSend(event) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || $isThinking) return;

    try {
      // Clear input immediately and reset textarea
      input = "";
      resetTextareaHeight();

      // Send the message
      await sendMessage(text);
      dispatch("messageSent", { text });
    } catch (error) {
      console.error("Failed to send message:", error);
      dispatch("messageError", { error: error.message });
    }
  }

  // ===== TEXTAREA MANAGEMENT =====
  function resetTextareaHeight() {
    if (textareaEl) {
      textareaEl.style.height = "auto";
    }
  }

  function handleTextareaInput(event) {
    const target = event.target;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  }

  function handleKeydown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    } else if (event.key === "Escape") {
      textareaEl?.blur();
    }
  }

  // ===== MARKDOWN RENDERING =====
  function renderMarkdown(text) {
    if (!text || typeof text !== "string") return "";

    try {
      // Escape HTML to prevent XSS, but preserve intentional markdown
      const escapeHtml = (str) =>
        str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

      let result = escapeHtml(text);

      // Process markdown in order of complexity
      result = result
        // Code blocks (must come before inline code)
        .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")

        // Inline code
        .replace(/`([^`]+)`/g, "<code>$1</code>")

        // Bold text: **text** or __text__
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.*?)__/g, "<strong>$1</strong>")

        // Italic text: *text* or _text_ (avoid conflicts with bold)
        .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
        .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>")

        // Headers
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")

        // Links: [text](url)
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
        )

        // Lists: - item or * item or numbered
        .replace(/^(\d+)\. (.+)$/gm, '<li data-type="ordered">$2</li>')
        .replace(/^[\-\*] (.+)$/gm, '<li data-type="unordered">$1</li>');

      // Process lists properly - wrap consecutive <li> elements in <ul>
      result = result.replace(/(<li>.*?<\/li>(\n|$))+/gs, (match) => {
        const cleanedMatch = match.replace(/\n/g, "");
        return "<ul>" + cleanedMatch + "</ul>";
      });

      // Convert remaining line breaks to <br>
      result = result.replace(/\n/g, "<br>");

      return result;
    } catch (error) {
      console.error("Markdown rendering error:", error);
      return text; // Return original text if rendering fails
    }
  }

  // Tool call status helpers
  function getToolStatusIcon(status) {
    switch (status) {
      case "loading":
        return `<svg class="spinner" viewBox="0 0 24 24" width="16" height="16">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
        </svg>`;
      case "success":
        return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12l5 5L20 7" />
        </svg>`;
      case "error":
        return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" />
        </svg>`;
      default:
        return "";
    }
  }

  function handleToolClick(messageId) {
    toggleToolMessage(messageId);
  }

  // Auto-scroll to bottom when messages update
  afterUpdate(() => {
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });
</script>

<div class="chat-panel {collapsed ? 'collapsed' : ''}">
  <button class="toggle-btn" on:click={togglePanel} aria-label="Toggle chat">
    {#if collapsed}
      &#x2190;
    {:else}
      &#x2192;
    {/if}
  </button>

  <div class="panel-inner">
    <!-- Messages Area -->
    <div
      class="messages"
      bind:this={messagesEl}
      role="log"
      aria-label="Chat messages"
    >
      {#each $chatHistory as message (message.id)}
        <div
          class="msg {message.role}"
          role="article"
          aria-label="{message.role} message"
        >
          {#if message.toolState}
            <!-- Tool Call Display -->
            <div
              class="tool-call tool-{message.toolState.status}"
              on:click={() => handleToolClick(message.id)}
              on:keydown={(e) =>
                e.key === "Enter" && handleToolClick(message.id)}
              role="button"
              tabindex="0"
              aria-label="Tool call: {message.toolState.name}"
              aria-expanded={message.toolState.expanded}
            >
              <div class="tool-header">
                <span class="tool-name" aria-label="Tool name">
                  {message.toolState.name}
                </span>
                <span
                  class="tool-status"
                  aria-label="Tool status: {message.toolState.status}"
                >
                  {@html getToolStatusIcon(message.toolState.status)}
                </span>
              </div>

              {#if message.toolState.expanded && (message.toolState.status === "success" || message.toolState.status === "error")}
                <pre
                  class="tool-result"
                  aria-label="Tool result">{JSON.stringify(
                    message.toolState.result || message.toolState.error,
                    null,
                    2,
                  )}</pre>
              {/if}
            </div>
          {:else}
            <!-- Regular Message -->
            <div class="message-content">
              {@html renderMarkdown(message.content)}
            </div>
          {/if}
        </div>
      {/each}

      <!-- Thinking Indicator -->
      {#if $isThinking}
        <div
          class="msg assistant thinking"
          role="status"
          aria-label="Assistant is thinking"
        >
          <div class="typing-indicator">
            <span class="dot" aria-hidden="true"></span>
            <span class="dot" aria-hidden="true"></span>
            <span class="dot" aria-hidden="true"></span>
          </div>
          <span class="sr-only">Assistant is typing...</span>
        </div>
      {/if}
    </div>

    <!-- Input Area -->
    <form
      class="input-area"
      on:submit|preventDefault={handleSend}
      aria-label="Send message"
    >
      <div class="textarea-container">
        <textarea
          bind:this={textareaEl}
          bind:value={input}
          placeholder="Ask me anything…"
          autocomplete="off"
          rows="1"
          disabled={$isThinking}
          aria-label="Type your message"
          on:keydown={handleKeydown}
          on:input={handleTextareaInput}
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={!input.trim() || $isThinking}
        aria-label="Send message"
        title="Send (Enter)"
      >
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="m3 3 18 9-18 9v-7l9-2-9-2V3z"
          />
        </svg>
      </button>
    </form>
  </div>
</div>

<style>
  /* ===== MAIN PANEL ===== */
  .chat-panel {
    position: fixed;
    top: calc(var(--header-height) + 10vh);
    right: 0px;
    height: calc(75vh - var(--header-height));
    width: 320px;
    background: var(--surface);
    border-left: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: -2px 0 4px rgb(0 0 0 / 0.1);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    z-index: 250; /* Above floating controls */
  }

  .chat-panel.collapsed {
    transform: translateX(100%);
  }

  /* ===== TOGGLE BUTTON ===== */
  .toggle-btn {
    position: absolute;
    left: -32px;
    top: 16px;
    width: 32px;
    height: 32px;
    background: var(--surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-right: none;
    border-top-left-radius: var(--radius-md);
    border-bottom-left-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: all 0.2s ease;
  }

  .toggle-btn:hover {
    background: var(
      --surface-secondary,
      color-mix(in srgb, var(--surface) 95%, var(--primary))
    );
    transform: translateX(-2px);
  }

  .toggle-btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* ===== PANEL LAYOUT ===== */
  .panel-inner {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; /* Allow flex children to shrink */
  }

  /* ===== MESSAGES AREA ===== */
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    scroll-behavior: smooth;
  }

  .messages::-webkit-scrollbar {
    width: 6px;
  }

  .messages::-webkit-scrollbar-track {
    background: transparent;
  }

  .messages::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
  }

  .messages::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
  }

  /* ===== MESSAGE STYLES ===== */
  .msg {
    font-size: var(--font-size-sm);
    line-height: 1.5;
    word-break: break-word;
    max-width: 85%;
    position: relative;
    animation: messageSlideIn 0.3s ease-out;
  }

  @keyframes messageSlideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .msg.user {
    align-self: flex-end;
  }

  .msg.assistant {
    align-self: flex-start;
  }

  .message-content {
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-lg);
  }

  .msg.user .message-content {
    background: var(--primary);
    color: white;
    border-bottom-right-radius: var(--radius-sm);
  }

  .msg.assistant .message-content {
    background: var(
      --surface-secondary,
      color-mix(in srgb, var(--surface) 50%, var(--border))
    );
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-bottom-left-radius: var(--radius-sm);
  }

  /* ===== ACCESSIBILITY ===== */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* ===== MARKDOWN STYLES ===== */
  .message-content :global(strong) {
    font-weight: 600;
    color: var(--text-primary);
  }

  .message-content :global(em) {
    font-style: italic;
    color: var(--text-primary);
  }

  .message-content :global(code) {
    background: var(--surface);
    color: var(--primary);
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
    font-size: 0.9em;
    border: 1px solid var(--border);
  }

  .message-content :global(h1) {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    margin: var(--spacing-2) 0;
    line-height: 1.3;
  }

  .message-content :global(h2) {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
    margin: var(--spacing-2) 0;
    line-height: 1.3;
  }

  .message-content :global(h3) {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);
    margin: var(--spacing-2) 0;
    line-height: 1.3;
  }

  .message-content :global(ul) {
    margin: 4px 0;
    padding-left: var(--spacing-4);
    line-height: 1.4;
  }

  .message-content :global(li) {
    margin: 2px 0;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .message-content :global(br) {
    line-height: 1.5;
  }

  /* ===== THINKING INDICATOR ===== */
  .msg.thinking {
    align-self: flex-start;
    min-height: 48px;
    display: flex;
    align-items: center;
    padding: var(--spacing-3);
  }

  .msg.thinking .message-content {
    background: var(
      --surface-secondary,
      color-mix(in srgb, var(--surface) 50%, var(--border))
    );
    border: 1px solid var(--border);
    border-bottom-left-radius: var(--radius-sm);
  }

  .typing-indicator {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .typing-indicator .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-secondary);
    animation: typing 1.4s ease-in-out infinite;
    opacity: 0.4;
  }

  .typing-indicator .dot:nth-child(1) {
    animation-delay: 0ms;
  }

  .typing-indicator .dot:nth-child(2) {
    animation-delay: 200ms;
  }

  .typing-indicator .dot:nth-child(3) {
    animation-delay: 400ms;
  }

  @keyframes typing {
    0%,
    60%,
    100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-10px);
      opacity: 1;
    }
  }

  /* ===== INPUT AREA ===== */
  .input-area {
    display: none;
    align-items: flex-end;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    border-top: 1px solid var(--border);
  }

  .textarea-container {
    flex: 1;
    position: relative;
  }

  .textarea-container textarea {
    width: 100%;
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--background);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    resize: none;
    font-family: inherit;
    font-size: inherit;
    line-height: 1.4;
    min-height: 36px;
    max-height: 120px;
    overflow-y: auto;
    transition: border-color 0.2s ease;
  }

  .textarea-container textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }

  .textarea-container textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .input-area button {
    background: linear-gradient(135deg, var(--primary), #8b5cf6);
    color: #ffffff;
    border: none;
    border-radius: var(--radius-sm);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
    height: 36px;
    width: 48px;
    flex-shrink: 0;
    cursor: pointer;
  }

  .input-area button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .input-area button::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    transition: left 0.6s ease;
  }

  .input-area button:not(:disabled):hover {
    background: linear-gradient(135deg, #6366f1, #a855f7);
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
  }

  .input-area button:not(:disabled):hover::before {
    left: 100%;
  }

  .input-area button:not(:disabled):active {
    transform: translateY(0) scale(0.98);
    transition: all 0.1s ease;
  }

  .input-area button:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* ===== TOOL CALLS ===== */
  .tool-call {
    cursor: pointer;
    padding: var(--spacing-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background: var(--surface);
    margin: var(--spacing-2) 0;
    transition: all 0.2s ease;
    max-width: 100%;
  }

  .tool-call:hover {
    background: var(
      --surface-secondary,
      color-mix(in srgb, var(--surface) 95%, var(--primary))
    );
    border-color: var(--primary);
  }

  .tool-call:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .tool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-2);
  }

  .tool-name {
    font-weight: 600;
    font-size: var(--font-size-sm);
  }

  .tool-status {
    display: flex;
    align-items: center;
    font-size: var(--font-size-xs);
  }

  .tool-status svg {
    vertical-align: middle;
  }

  .spinner {
    animation: rotate 1s linear infinite;
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .tool-loading .tool-status svg {
    color: var(--primary);
  }

  .tool-success .tool-status svg {
    color: var(--success, #22c55e);
  }

  .tool-error .tool-status svg {
    color: var(--danger, #ef4444);
  }

  .tool-result {
    background: var(--background);
    padding: var(--spacing-2);
    border-radius: var(--radius-sm);
    overflow-x: auto;
    font-size: var(--font-size-xs);
    white-space: pre-wrap;
    margin-top: var(--spacing-2);
    border: 1px solid var(--border);
    max-height: 200px;
    overflow-y: auto;
  }

  /* ===== RESPONSIVE DESIGN ===== */
  @media (max-width: 768px) {
    .chat-panel {
      width: 100vw;
      right: 0;
      top: var(--header-height);
      height: calc(100vh - var(--header-height));
      border-radius: 0;
      border-left: none;
    }

    .chat-panel.collapsed {
      transform: translateX(100%);
    }

    .toggle-btn {
      left: -40px;
      width: 40px;
    }
  }
</style>
