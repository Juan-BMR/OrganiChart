<script>
  import {
    chatHistory,
    isThinking,
    sendMessage,
    setOrganization,
    toggleToolMessage,
  } from "$lib/stores/chat";
  import { afterUpdate } from "svelte";

  let collapsed = true;
  let input = "";
  let messagesEl = null;
  export let organizationId = "";

  // Update chat context when organizationId changes
  $: if (organizationId) {
    setOrganization(organizationId);
  }

  function togglePanel() {
    collapsed = !collapsed;
  }

  async function handleSend(event) {
    event?.preventDefault();
    const text = input.trim();
    if (!text) return;

    // Clear input immediately when send button is clicked
    input = "";

    // Reset textarea height to normal
    const textarea = document.querySelector(".input-area textarea");
    if (textarea) {
      textarea.style.height = "auto";
    }

    // Send the message
    await sendMessage(text);
  }

  // Simple markdown renderer for basic formatting
  function renderMarkdown(text) {
    if (!text) return "";

    let result = text
      // Bold text: **text** or __text__
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.*?)__/g, "<strong>$1</strong>")

      // Italic text: *text* or _text_
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/_([^_]+)_/g, "<em>$1</em>")

      // Code: `code`
      .replace(/`(.*?)`/g, "<code>$1</code>")

      // Headers: ### Text
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")

      // Lists: - item or * item
      .replace(/^[\-\*] (.*$)/gm, "<li>$1</li>");

    // Process lists properly - wrap consecutive <li> elements in <ul> and remove extra line breaks
    result = result.replace(/(<li>.*?<\/li>(\n|$))+/gs, (match) => {
      // Remove line breaks between list items
      const cleanedMatch = match.replace(/\n/g, "");
      return "<ul>" + cleanedMatch + "</ul>";
    });

    // Convert remaining line breaks to <br> (but not inside lists)
    result = result.replace(/\n/g, "<br>");

    return result;
  }

  // Enhanced render function to handle tool calls
  function renderMessage(content) {
    return renderMarkdown(content);
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
    <div class="messages" bind:this={messagesEl}>
      {#each $chatHistory as m (m.id)}
        <div class="msg {m.role}">
          {#if m.toolState}
            <div
              class="tool-call {m.toolState.status === 'loading'
                ? 'tool-loading'
                : m.toolState.status === 'success'
                  ? 'tool-success'
                  : 'tool-error'}"
              on:click={() => toggleToolMessage(m.id)}
              role="button"
              tabindex="0"
            >
              <div class="tool-header">
                <span class="tool-name">{m.toolState.name}</span>
                {#if m.toolState.status === "loading"}
                  <span class="tool-status">
                    <svg
                      class="spinner"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                        fill="none"
                      />
                    </svg>
                  </span>
                {:else if m.toolState.status === "success"}
                  <span class="tool-status">
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                {:else}
                  <span class="tool-status">
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4m0 4h.01" />
                    </svg>
                  </span>
                {/if}
              </div>
              {#if m.toolState.expanded && (m.toolState.status === "success" || m.toolState.status === "error")}
                <pre class="tool-result">{JSON.stringify(
                    m.toolState.result || m.toolState.error,
                    null,
                    2
                  )}</pre>
              {/if}
            </div>
          {:else}
            {@html renderMessage(m.content)}
          {/if}
        </div>
      {/each}

      <!-- {#if $isThinking} -->
      {#if $isThinking}
        <div class="msg assistant thinking">
          <div class="typing-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      {/if}
    </div>

    <form class="input-area" on:submit|preventDefault={handleSend}>
      <textarea
        bind:value={input}
        placeholder="Ask me anything…"
        autocomplete="off"
        rows="1"
        on:keydown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        on:input={(e) => {
          // Auto-resize textarea based on content
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
      ></textarea>
      <button type="submit" title="Send">
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          width="16"
          height="16"
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
    transition: transform 0.3s ease;
    display: flex;
    z-index: 250; /* Above floating controls */
  }

  .chat-panel.collapsed {
    transform: translateX(100%);
  }

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
  }

  .panel-inner {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .msg {
    font-size: var(--font-size-sm);
    line-height: 1.5;
    word-break: break-word;
    max-width: 85%;
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-lg);
    position: relative;
  }

  .msg.user {
    align-self: flex-end;
    background: var(--primary);
    color: white;
    border-bottom-right-radius: var(--radius-sm);
  }

  .msg.assistant {
    align-self: flex-start;
    background: var(
      --surface-secondary,
      color-mix(in srgb, var(--surface) 50%, var(--border))
    );
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-bottom-left-radius: var(--radius-sm);
  }

  /* Markdown formatting styles */
  .msg :global(strong) {
    font-weight: 600;
    color: var(--text-primary);
  }

  .msg :global(em) {
    font-style: italic;
    color: var(--text-primary);
  }

  .msg :global(code) {
    background: var(--surface);
    color: var(--primary);
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
    font-size: 0.9em;
    border: 1px solid var(--border);
  }

  .msg :global(h1) {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    margin: var(--spacing-2) 0;
    line-height: 1.3;
  }

  .msg :global(h2) {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
    margin: var(--spacing-2) 0;
    line-height: 1.3;
  }

  .msg :global(h3) {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);
    margin: var(--spacing-2) 0;
    line-height: 1.3;
  }

  .msg :global(ul) {
    margin: 4px 0;
    padding-left: var(--spacing-4);
    line-height: 1.4;
  }

  .msg :global(li) {
    margin: 2px 0;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .msg :global(br) {
    line-height: 1.5;
  }

  .msg.thinking {
    background: var(
      --surface-secondary,
      color-mix(in srgb, var(--surface) 50%, var(--border))
    );
    border: 1px solid var(--border);
    align-self: flex-start;
    padding: var(--spacing-3);
    min-height: 48px;
    display: flex;
    align-items: center;
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

  .input-area {
    display: flex;
    align-items: flex-end;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    border-top: 1px solid var(--border);
  }

  .input-area textarea {
    flex: 1;
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
  }

  .input-area button {
    background: linear-gradient(135deg, var(--primary), #8b5cf6);
    color: #ffffff;
    padding: 0 var(--spacing-4);
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

  .input-area button:hover {
    background: linear-gradient(135deg, #6366f1, #a855f7);
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
  }

  .input-area button:hover::before {
    left: 100%;
  }

  .input-area button:active {
    transform: translateY(0) scale(0.98);
    transition: all 0.1s ease;
  }

  .tool-call {
    cursor: pointer;
    padding: var(--spacing-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background: var(--surface);
    margin: var(--spacing-2) 0;
  }

  .tool-header {
    display: flex;
    justify-content: center;
    gap: var(--spacing-2);
    align-items: center;
    margin-bottom: var(--spacing-2);
  }

  .tool-name {
    font-weight: 600;
  }

  .tool-status {
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
    color: var(--success);
  }

  .tool-error .tool-status svg {
    color: var(--danger);
  }

  .tool-result {
    background: var(--background);
    padding: var(--spacing-2);
    border-radius: var(--radius-sm);
    overflow-x: auto;
    font-size: var(--font-size-xs);
    white-space: pre-wrap;
  }
</style>
