<script lang="ts">
  import { chatHistory, isThinking, sendMessage } from "$lib/stores/chat";
  import { afterUpdate } from "svelte";

  let collapsed = true;
  let input = "";
  let messagesEl: HTMLDivElement | null = null;

  function togglePanel() {
    collapsed = !collapsed;
  }

  async function handleSend(event?: SubmitEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text) return;
    await sendMessage(text);
    input = "";
  }

  // Auto-scroll to bottom when messages update
  afterUpdate(() => {
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });
</script>

<div class="chat-panel {collapsed ? "collapsed" : ""}">
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
        <div class="msg {m.role}">{m.content}</div>
      {/each}

      {#if $isThinking}
        <div class="msg assistant thinking">Typing…</div>
      {/if}
    </div>

    <form class="input-area" on:submit|preventDefault={handleSend}>
      <input
        type="text"
        bind:value={input}
        placeholder="Ask me anything…"
        autocomplete="off"
      />
      <button type="submit" title="Send">Send</button>
    </form>
  </div>
</div>

<style>
  .chat-panel {
    position: fixed;
    top: var(--header-height);
    right: 0;
    height: calc(100vh - var(--header-height));
    width: 320px;
    background: var(--surface);
    border-left: 1px solid var(--border);
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
  }

  .msg {
    margin-bottom: var(--spacing-3);
    font-size: var(--font-size-sm);
    line-height: 1.4;
    word-break: break-word;
  }

  .msg.user {
    text-align: right;
    color: var(--text-primary);
  }

  .msg.assistant {
    text-align: left;
    color: var(--text-secondary);
  }

  .msg.thinking {
    font-style: italic;
    opacity: 0.8;
  }

  .input-area {
    display: flex;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    border-top: 1px solid var(--border);
  }

  .input-area input {
    flex: 1;
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--background);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }

  .input-area button {
    background: var(--primary);
    color: #ffffff;
    padding: 0 var(--spacing-4);
    border-radius: var(--radius-sm);
    transition: background 0.2s ease;
  }

  .input-area button:hover {
    background: var(--primary-dark);
  }
</style>