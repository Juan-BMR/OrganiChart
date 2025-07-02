import { writable, get } from "svelte/store";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
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
    { id: crypto.randomUUID(), role, content },
  ]);
}

/**
 * Send a message to the assistant.
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

  // Prepare fetch payload & URL
  const url = useAgent ? AI_AGENT_URL : AI_CHAT_URL;
  const payload: Record<string, any> = useAgent
    ? { text, orgId: resolvedOrgId }
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
      throw new Error(`AI request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // The two endpoints return slightly different shapes
    const assistantText = data.message || data.reply || "(No response)";

    // Persist assistant message in history
    appendMessage("assistant", assistantText);

    // Optional: update memory / context if backend sends it
    if (data.memory?.currentEntity) {
      currentEntity.set(data.memory.currentEntity);
    }

    return assistantText;
  } catch (error: any) {
    console.error("Chat error:", error);
    chatError.set(error.message ?? "Unknown error");
    appendMessage(
      "assistant",
      "Sorry, I ran into a problem. Please try again in a moment.",
    );
    throw error;
  } finally {
    isThinking.set(false);
  }
}

/**
 * Shortcut for simple small-talk requests that should *never* call the tool-enabled agent.
 * Equivalent to `sendMessage(msg, { useAgent: false })`.
 *
 * @param message - The user's chat text.
 * @returns The assistant's reply text.
 */
export async function sendSimpleMessage(message: string) {
  return await sendMessage(message, { useAgent: false });
}

/**
 * Hard-reset the chat UI state: clears history, errors, and loading flags.
 * Call this when leaving an org page or after a logout.
 */
export function clearChat() {
  chatHistory.set([]);
  chatError.set(null);
  isThinking.set(false);
} 