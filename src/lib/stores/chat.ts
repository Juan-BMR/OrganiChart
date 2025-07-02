import { writable, get } from "svelte/store";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export const chatHistory = writable<ChatMessage[]>([]);
export const currentEntity = writable<any>(null);
export const isThinking = writable(false);
export const chatModalOpen = writable(false);

// Update URLs to point to Firebase Functions
const AI_CHAT_URL = "https://us-central1-organichart-c9ce4.cloudfunctions.net/aiChat";
const AI_AGENT_URL = "https://us-central1-organichart-c9ce4.cloudfunctions.net/aiAgent";

export async function sendMessage(text: string) {
  chatHistory.update((h) => [
    ...h,
    { id: crypto.randomUUID(), role: "user", content: text },
  ]);
  isThinking.set(true);

  try {
    const response = await fetch(AI_AGENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, context: get(currentEntity) }),
    });

    const data = await response.json();
    
    // Update memory based on response.metadata if provided
    if (data.memory?.currentEntity) {
      currentEntity.set(data.memory.currentEntity);
    }
    
    chatHistory.update((h) => [
      ...h,
      { id: crypto.randomUUID(), role: "assistant", content: data.message },
    ]);
  } catch (error) {
    console.error("Chat error:", error);
    chatHistory.update((h) => [
      ...h,
      { id: crypto.randomUUID(), role: "assistant", content: "Sorry, I encountered an error." },
    ]);
  } finally {
    isThinking.set(false);
  }
}

export async function sendSimpleMessage(message: string) {
  try {
    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    return data.reply;
  } catch (error) {
    console.error("Simple chat error:", error);
    return "Sorry, I encountered an error.";
  }
} 