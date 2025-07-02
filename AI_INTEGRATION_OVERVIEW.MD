# OrganiChart AI Assistant — Integration Guide

> **Goal:** Add a modal-chat AI assistant inside the OrganiChart SvelteKit web-app that can parse natural language commands, call backend helper functions (e.g. `addUser`) via OpenAI **function-calling**, and reply to the user with confirmations or errors while remembering short-term context during the session.

> **Stack Note:** The assistant is implemented **entirely in TypeScript/Node.js** (no Python). All code snippets below compile under a SvelteKit + TypeScript setup and rely on the official `openai` **Node SDK**.

---

## 🗺️ Milestone Overview (build in **large, sequential steps**)

| **Step** | **Milestone Scope**                                                         |
| -------- | --------------------------------------------------------------------------- |
| 1        | **Environment & Packages** – Node/TypeScript setup, OpenAI key, deps        |
| 2        | **Chat UI + Session Memory** – `ChatAssistant.svelte`, `chat.ts`            |
| 3        | **AI Middleware** – SvelteKit API route that calls OpenAI                   |
| 4        | **Backend Tool Functions** – Firestore helpers (`lib/orgchart/*`)           |
| 5        | **Prompt Engineering & Tool Schemas** – define system prompt & JSON schemas |
| 6        | **Testing & QA** – manual flow + Vitest unit tests                          |
| 7        | **Deployment & Cost Controls** – env vars, rate-limit, OpenAI spend         |

⚠️ **Tackle one step at a time.** Each milestone is self-contained; do **not** move on until the current step is stable and code-reviewed.

---

### Why large milestones?

This feature touches every layer of the stack; breaking work into chunky, reviewable units reduces merge conflicts and keeps PRs understandable.

---

## 1 — Environment & Package Prerequisites (Step 1)

1. **Node ≥ 18** (ESM + fetch built-in).
2. **SvelteKit v2** project (already present).
3. **Firebase Admin & Web SDK** configured (already done).
4. **OpenAI API key** in `.env`:

```bash
# .env
OPENAI_API_KEY="sk-..."
```

5. Optional: **pnpm** instead of npm for faster installs.

---

## 2 — Install & Configure Packages (still Step 1)

```bash
# 1 OpenAI Node SDK
pnpm add openai    # or npm i openai

# 2 (Dev) Type support for Web API Response helpers
pnpm add -D @types/node
```

Minimal OpenAI client helper (`src/lib/openai.ts`):

```ts
import OpenAI from "openai";
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

---

## 3 — Recommended File Structure (reference for all steps)

```txt
src/
├─ components/
│  └─ ChatAssistant.svelte  ← UI modal
├─ stores/
│  └─ chat.ts              ← Writable stores (chat history, memory)
├─ routes/
│  └─ api/
│     └─ agent/
│        └─ +server.ts     ← Middleware: user ⇄ OpenAI ⇄ tools
├─ lib/
│  └─ orgchart/
│     ├─ addUser.ts        ← Firestore helpers
│     ├─ updateUser.ts
│     ├─ deleteUser.ts
│     └─ getUserByName.ts
└─ lib/
   └─ openai.ts            ← Re-usable OpenAI client
```

---

## 4 — Chat UI (**Step 2**)

**Features**

1. Floating button to open modal (place in global `+layout.svelte`).
2. Modal with:
   • Scrollable message list  
   • Input box + send icon  
   • Optional avatars & "typing…" indicator.

Skeleton:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { chatHistory, isThinking, sendMessage } from '$stores/chat';
  let input = '';
  async function handleSend() {
    if (!input.trim()) return;
    await sendMessage(input);
    input = '';
  }
</script>

<!-- trigger button omitted for brevity -->

{#if $chatModalOpen}
  <div class="modal-backdrop" on:click={() => $chatModalOpen = false} />
  <div class="modal">
    <div class="messages">
      {#each $chatHistory as m}
        <MessageBubble {m} />
      {/each}
      {#if $isThinking}<TypingDotAnimation />{/if}
    </div>
    <form on:submit|preventDefault={handleSend}>
      <input bind:value={input} placeholder="Ask me anything…" />
      <button type="submit">➤</button>
    </form>
  </div>
{/if}

<style>/* add your styles */</style>
```

---

## 5 — Session Memory Store (**Step 2**)

```ts
import { writable, get } from "svelte/store";
import type { Member } from "$lib/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export const chatHistory = writable<ChatMessage[]>([]);
export const currentEntity = writable<Member | null>(null);
export const isThinking = writable(false);

export async function sendMessage(text: string) {
  chatHistory.update((h) => [
    ...h,
    { id: crypto.randomUUID(), role: "user", content: text },
  ]);
  isThinking.set(true);
  const r = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, context: get(currentEntity) }),
  });
  const data = await r.json();
  // Update memory based on response.metadata if provided
  if (data.memory?.currentEntity) currentEntity.set(data.memory.currentEntity);
  chatHistory.update((h) => [
    ...h,
    { id: crypto.randomUUID(), role: "assistant", content: data.message },
  ]);
  isThinking.set(false);
}
```

> Session memory **lives only in the store**; it resets on reload.

---

## 6 — OpenAI Middleware API (**Step 3**)

Responsibilities:

1. Accept `{ text, context }` from front-end.
2. Send chat history + tools to OpenAI (Chat Completions) with **function calling** (`tool_choice: "auto"`).
3. Detect if model invokes a function.  
   • If yes → call internal helper → feed function result back to the model → get final answer.  
   • If no → return model's reply.
4. Reply `{ message, memory }` JSON to UI.

```ts
import { json } from "@sveltejs/kit";
import { openai } from "$lib/openai";
import * as tools from "$lib/orgchart";
import type { RequestHandler } from "./$types";

const functionDefs = [
  {
    name: "addUser",
    description: "Add a new member to the org chart",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        role: { type: "string" },
        manager: { type: "string", description: "Name of the manager" },
      },
      required: ["name", "role"],
    },
  },
  // …other tool schemas
] satisfies OpenAI.Chat.Completions.ChatCompletionTool[];

export const POST: RequestHandler = async ({ request }) => {
  const { text } = await request.json();

  // 1️⃣  Send user message to model
  let response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    tool_choice: "auto",
    tools: functionDefs,
    messages: [
      { role: "system", content: "You are OrganiChart Assistant. …" },
      { role: "user", content: text },
    ],
  });

  const first = response.choices[0];

  if (first.finish_reason === "tool_calls") {
    const call = first.message.tool_calls![0];
    const { name, arguments: args } = call;
    // 2️⃣  Execute matching helper
    // @ts-ignore – indexing by string ok
    const result = await tools[name as keyof typeof tools](JSON.parse(args));

    // 3️⃣  Feed result back to model for a final user-facing reply
    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      tool_choice: "none",
      messages: [
        ...response.choices[0].message_log!,
        { role: "tool", name, content: JSON.stringify(result) },
      ],
    });
  }

  const finalMsg = response.choices[0].message.content;
  return json({ type: "success", message: finalMsg });
};
```

---

## 7 — Backend Tool Functions (**Step 4**)

Example `addUser.ts`:

```ts
import { db } from "$lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

interface Args {
  name: string;
  email?: string;
  role: string;
  manager?: string;
}

export async function addUser({ name, email = "", role, manager }: Args) {
  const doc = await db.collection("members").add({
    name,
    email,
    role,
    managerName: manager ?? null,
    createdAt: Timestamp.now(),
  });
  return { id: doc.id, name };
}
```

Repeat for `updateUser`, `deleteUser`, `getUserByName`, etc.  
**Important:** Export each function for dynamic invocation by name.

---

## 8 — Prompt Engineering & Tool Definitions (**Step 5**)

1. **System prompt** – keep it short but explicit about tool usage rules.
2. **Few-shot Examples** –

```text
User: Add Juan Martinez as a Developer under Gitana
Assistant: (calls addUser)
User: Under the previous user, add Maria as his assistant
Assistant: (calls addUser with manager = "Juan Martinez")
```

3. Include a **memory rubric** in the prompt:

   > "If the user says _previous user_ assume they refer to the last added or mentioned member."

4. **Docs worth reading:**
   • Function Calling guide 🔗 <https://platform.openai.com/docs/guides/function-calling>  
   • Chat Completions API 🔗 <https://platform.openai.com/docs/api-reference/chat>  
   • Assistants tools reference 🔗 <https://platform.openai.com/docs/assistants/tools>  
   • OpenAI Node SDK 🔗 <https://github.com/openai/openai-node>  
   • Function-calling examples 🔗 <https://github.com/openai/function-calling-examples>

---

## 9 — Testing & QA (**Step 6**)

1. Run `pnpm dev`.
2. In app, open chat and enter:
   _"Add Juan Martinez as a Developer under Gitana"_
3. Confirm Firestore has new member.
4. Enter follow-up: _"Under the previous user, add Maria as his assistant."_
5. Edge cases: invalid manager, duplicate names.
6. Write unit tests with **Vitest** for helper functions.

---

## 10 — Deployment & Security (**Step 7**)

✅ **Keep `OPENAI_API_KEY` server-side only.**  
✅ Set a monthly usage limit in OpenAI dashboard.  
✅ Return sanitized error messages to UI.  
✅ Rate-limit `/api/agent` (e.g., 3 req/s per IP).

### Cost Awareness

- `gpt-4o-mini` ≈ $0.60 / 1 M input tokens → prefer mini model in dev.

---

## 11 — Future Enhancements (post-MVP)

• Switch to **Assistants API** for persistent threads.  
• Multilingual detection / translate queries.  
• "Undo last action" by storing inverse ops.  
• Streaming responses + typing animation.  
• Voice input via Web Speech API.

---

## 12 — Appendix — Key Documentation Links

| Topic                     | Link                                                       |
| ------------------------- | ---------------------------------------------------------- |
| Function Calling Guide    | <https://platform.openai.com/docs/guides/function-calling> |
| Chat Completions API      | <https://platform.openai.com/docs/api-reference/chat>      |
| Assistants Tools Overview | <https://platform.openai.com/docs/assistants/tools>        |
| Node SDK (npm)            | <https://www.npmjs.com/package/openai>                     |
| Function-Calling Examples | <https://github.com/openai/function-calling-examples>      |
| Prompt Engineering Guide  | <https://www.promptingguide.ai/>                           |

---

**You now have a step-by-step blueprint to integrate the AI assistant into OrganiChart.**
