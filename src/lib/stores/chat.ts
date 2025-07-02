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
 * Set / update the organization that subsequent AI requests should act on.
 * The chart page should call this whenever the route param changes.
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
 * Send a message to either the general chat endpoint (aiChat) or the tool-calling agent (aiAgent).
 * By default we use the agent when we have an org context; otherwise fall back to plain chat.
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
 * Convenience wrapper for plain small-talk conversations that should never hit the agent.
 */
export async function sendSimpleMessage(message: string) {
  return await sendMessage(message, { useAgent: false });
}

/**
 * Clear chat history and errors (useful when switching organizations)
 */
export function clearChat() {
  chatHistory.set([]);
  chatError.set(null);
  isThinking.set(false);
} 