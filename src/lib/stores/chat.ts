import { writable, get } from "svelte/store";

export interface StreamEvent {
  type:
    | "delta"
    | "tool_call"
    | "tool_execution_start"
    | "tool_execution_complete"
    | "tool_execution_error"
    | "done"
    | "error";
  content?: any;
  toolCall?: any;
  toolId?: string;
  toolName?: string;
  result?: any;
  error?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
  status: "pending" | "executing" | "complete" | "error";
  result?: any;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: ToolCall[];
}

export const chatHistory = writable<ChatMessage[]>([]);
export const chatError = writable<string | null>(null);
export const currentEntity = writable<any>(null);
export const isThinking = writable(false);
export const chatModalOpen = writable(false);

// Deployed Cloud-Run endpoints (see Frontend AI Chat Integration instructions)
const AI_CHAT_URL = "https://aichat-usprdmd3na-uc.a.run.app"; // General conversation
const AI_AGENT_URL = "https://aiagent-usprdmd3na-uc.a.run.app"; // Tool-calling agent
const AI_AGENT_STREAM_URL = "https://aiagentstream-usprdmd3na-uc.a.run.app"; // Streaming agent

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

/** Get recent conversation context (last 10 messages) */
function getRecentContext() {
  const currentHistory = get(chatHistory);
  const recentMessages = currentHistory.slice(-10);
  return recentMessages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');
}

// Parse Server-Sent Events
function parseSSEEvents(chunk: string): StreamEvent[] {
  const events: StreamEvent[] = [];
  const lines = chunk.split("\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      try {
        const data = JSON.parse(line.slice(6));
        events.push(data);
      } catch (e) {
        console.error("Failed to parse SSE event:", e);
      }
    }
  }

  return events;
}

// Helper functions for updating messages
function updateMessageById(messageId: string, updates: Partial<ChatMessage>) {
  chatHistory.update((messages) =>
    messages.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
  );
}

function updateToolCallStatus(
  messageId: string,
  toolId: string,
  status: ToolCall["status"]
) {
  chatHistory.update((messages) =>
    messages.map((msg) => {
      if (msg.id === messageId && msg.toolCalls) {
        return {
          ...msg,
          toolCalls: msg.toolCalls.map((tc) =>
            tc.id === toolId ? { ...tc, status } : tc
          ),
        };
      }
      return msg;
    })
  );
}

function updateToolCallResult(
  messageId: string,
  toolId: string,
  result: any,
  status: ToolCall["status"],
  error?: string
) {
  chatHistory.update((messages) =>
    messages.map((msg) => {
      if (msg.id === messageId && msg.toolCalls) {
        return {
          ...msg,
          toolCalls: msg.toolCalls.map((tc) =>
            tc.id === toolId ? { ...tc, status, result, error } : tc
          ),
        };
      }
      return msg;
    })
  );
}

// Process individual stream events
async function processStreamEvent(event: StreamEvent, messageId: string) {
  switch (event.type) {
    case "delta":
      // Append text delta to message
      if (event.content?.content) {
        chatHistory.update((messages) =>
          messages.map((msg) =>
            msg.id === messageId
              ? { ...msg, content: msg.content + event.content.content }
              : msg
          )
        );
      }
      break;

    case "tool_call":
      // Add new tool call
      if (event.toolCall) {
        const toolCall: ToolCall = {
          id: event.toolCall.id,
          name: event.toolCall.function.name,
          arguments: JSON.parse(event.toolCall.function.arguments),
          status: "pending",
        };

        chatHistory.update((messages) =>
          messages.map((msg) =>
            msg.id === messageId
              ? { ...msg, toolCalls: [...(msg.toolCalls || []), toolCall] }
              : msg
          )
        );
      }
      break;

    case "tool_execution_start":
      // Update tool status to executing
      if (event.toolId) {
        updateToolCallStatus(messageId, event.toolId, "executing");
      }
      break;

    case "tool_execution_complete":
      // Update tool with result
      if (event.toolId) {
        updateToolCallResult(messageId, event.toolId, event.result, "complete");
      }
      break;

    case "tool_execution_error":
      // Update tool with error
      if (event.toolId) {
        updateToolCallResult(
          messageId,
          event.toolId,
          null,
          "error",
          event.error
        );
      }
      break;

    case "done":
      // Message complete
      updateMessageById(messageId, { isStreaming: false });
      break;

    case "error":
      // Handle error
      throw new Error(event.error || "Unknown streaming error");
  }
}

/**
 * Send a streaming message using the new SSE endpoint
 */
export async function sendStreamingMessage(
  text: string,
  options: { useAgent?: boolean; orgId?: string | null } = {}
) {
  const messageId = crypto.randomUUID();

  // Add user message
  appendMessage("user", text);

  // Add placeholder assistant message
  const assistantMessage: ChatMessage = {
    id: messageId,
    role: "assistant",
    content: "",
    timestamp: new Date(),
    isStreaming: true,
    toolCalls: [],
  };

  chatHistory.update((h) => [...h, assistantMessage]);
  isThinking.set(true);
  chatError.set(null);

  const resolvedOrgId =
    options.orgId !== undefined ? options.orgId : get(orgIdContext);

  try {
    const response = await fetch(AI_AGENT_STREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        text,
        orgId: resolvedOrgId,
        conversationContext: getRecentContext(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Process stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error("No response body");

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      buffer += chunk;
      
      // Process complete events in the buffer
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || ""; // Keep incomplete event in buffer
      
      for (const eventData of lines) {
        const events = parseSSEEvents(eventData);
        for (const event of events) {
          await processStreamEvent(event, messageId);
        }
      }
    }
  } catch (error: any) {
    console.error("Streaming error:", error);
    updateMessageById(messageId, {
      content: `Error: ${error.message}`,
      isStreaming: false,
    });
    chatError.set(error.message);
  } finally {
    updateMessageById(messageId, { isStreaming: false });
    isThinking.set(false);
  }
}

/**
 * Send a message to the assistant with conversation context.
 * This is the non-streaming version kept for backward compatibility.
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
  const conversationContext = getRecentContext();

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