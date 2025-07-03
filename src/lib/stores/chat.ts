import { writable, get } from "svelte/store";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export const chatHistory = writable<ChatMessage[]>([]);
export const chatError = writable<string | null>(null);
export const currentEntity = writable<any>(null);
export const isThinking = writable(false);
export const chatModalOpen = writable(false);

// Deployed Cloud-Run endpoints (see Frontend AI Chat Integration instructions)
const AI_CHAT_URL = "https://aichat-usprdmd3na-uc.a.run.app"; // General conversation
const AI_AGENT_URL = "https://aiagent-usprdmd3na-uc.a.run.app"; // Tool-calling agent

// Organization context – set by the chart page so the assistant knows which org it is working with
export const orgIdContext = writable<string | null>(null);

/**
 * Update the organization context used by the AI agent.
 * Pass `null` to clear the context when navigating away.
 *
 * @param orgId - The active organization ID or null.
 */
export function setOrganization(orgId: string | null) {
  orgIdContext.set(orgId);
}

/** Helper that pushes a message to history */
function appendMessage(role: "user" | "assistant", content: string) {
  chatHistory.update((h) => [
    ...h,
    { id: crypto.randomUUID(), role, content, timestamp: new Date() },
  ]);
}

/**
 * Send a message to the assistant with conversation context.
 *
 * Depending on the presence of an organization context (or an explicit `useAgent` flag),
 * the function automatically chooses between the `aiAgent` (tool-calling) endpoint and
 * the simpler `aiChat` endpoint.
 *
 * A user message is immediately appended to `$chatHistory`, `isThinking` is set to `true`,
 * and the assistant's eventual reply (or an error placeholder) is also appended.
 *
 * @param text        The user's plain-text prompt.
 * @param options.useAgent  Force usage of the agent endpoint regardless of context.
 * @param options.orgId    Override the stored organization ID for this call.
 * @returns            The assistant's raw reply text.
 */
export async function sendMessage(
  text: string,
  options: { useAgent?: boolean; orgId?: string | null } = {},
) {
  // Push the user message immediately
  appendMessage("user", text);

  // Resolve which endpoint to hit
  const resolvedOrgId =
    options.orgId !== undefined ? options.orgId : get(orgIdContext);
  const useAgent =
    options.useAgent !== undefined ? options.useAgent : Boolean(resolvedOrgId);

  // Get recent conversation history for context (last 10 messages)
  const currentHistory = get(chatHistory);
  const recentMessages = currentHistory.slice(-10);
  const conversationContext = recentMessages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  // Prepare fetch payload & URL
  const url = useAgent ? AI_AGENT_URL : AI_CHAT_URL;
  const payload: Record<string, any> = useAgent
    ? { 
        text, 
        orgId: resolvedOrgId,
        conversationContext: conversationContext // Add conversation history
      }
    : { message: text };

  // Update UI state
  isThinking.set(true);
  chatError.set(null);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const assistantText = data.message || data.reply || "(no response)";

    // Push the assistant response
    appendMessage("assistant", assistantText);

    // Handle memory updates if present
    if (data.memory) {
      if (data.memory.currentEntity !== undefined) {
        currentEntity.set(data.memory.currentEntity);
      }
    }

    return assistantText;
  } catch (error) {
    console.error("sendMessage error:", error);

    const errorText =
      error instanceof Error ? error.message : "Unknown error occurred";
    appendMessage("assistant", `Error: ${errorText}`);
    chatError.set(errorText);

    throw error;
  } finally {
    isThinking.set(false);
  }
}

/**
 * Send a simple message using the basic chat endpoint (no agent).
 */
export async function sendSimpleMessage(message: string) {
  return sendMessage(message, { useAgent: false });
}

/**
 * Clear the chat history and reset error state.
 */
export function clearChat() {
  chatHistory.set([]);
  chatError.set(null);
  isThinking.set(false);
} 