/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as admin from "firebase-admin";
import OpenAI from "openai";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Define the secret
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Collections constants
const COLLECTIONS = {
  USERS: "users",
  ORGANIZATIONS: "organizations", 
  MEMBERS: "members",
  ORGANIZATION_PERMISSIONS: "organization_permissions",
  RULES: "rules",
};

// Helper function to create member data
const createMemberData = (
  organizationId: string,
  name: string,
  email: string,
  role: string,
  photoURL: string | null = null,
  managerId: string | null = null,
  startDate: Date | null = null,
) => ({
  organizationId,
  name: name.trim(),
  email: email.toLowerCase().trim(),
  role: role.trim(),
  photoURL,
  managerId,
  startDate: startDate || new Date(),
  level: 0,
  position: null,
  cvURL: null,
  cvFileName: null,
  cvUploadedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
});

// Add User function
interface AddUserArgs {
  organizationId: string;
  name: string;
  email?: string;
  role: string;
  managerId?: string | null;
  subordinateIds?: string[];
  startDate?: string | Date | null;
  photoURL?: string | null;
  cvURL?: string | null;
}

async function addUser({
  organizationId,
  name,
  email = "",
  role,
  managerId = null,
  subordinateIds = [],
  startDate = null,
  photoURL = null,
  cvURL = null,
}: AddUserArgs) {
  const membersCol = db.collection(COLLECTIONS.MEMBERS);

  // Create member document
  const data = {
    ...createMemberData(
      organizationId,
      name,
      email,
      role,
      photoURL,
      managerId,
      startDate ? new Date(startDate) : null,
    ),
  };

  const newMemberRef = await membersCol.add(data);
  const newMemberId = newMemberRef.id;

  // Re-parent subordinates if needed
  if (subordinateIds.length) {
    const batch = db.batch();
    subordinateIds.forEach((id) => {
      const ref = membersCol.doc(id);
      batch.update(ref, {
        managerId: newMemberId,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    });
    await batch.commit();
  }

  return {
    id: newMemberId,
    name,
    role,
    createdAt: admin.firestore.Timestamp.now(),
  };
}

// AI Chat Function
export const aiChat = onRequest(
  { secrets: [openaiApiKey] },
  async (req, res) => {
    // Initialize OpenAI with the secret
    const openai = new OpenAI({
      apiKey: openaiApiKey.value(),
    });

    // CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(200).send();
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { message } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "`message` (string) is required" });
      return;
    }

    try {
      const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are OrganiChart's helpful AI assistant. Answer questions or help with tasks.",
        },
        { role: "user", content: message },
      ],
    });

      const reply = completion.choices[0].message?.content ?? "(no content)";
      res.json({ reply });
    } catch (err) {
      console.error("OpenAI request failed", err);
      res.status(500).json({ error: "AI request failed" });
    }
  }
);

// AI Agent Function (with tool calling)
export const aiAgent = onRequest(
  { secrets: [openaiApiKey] },
  async (req, res) => {
    // Initialize OpenAI with the secret
    const openai = new OpenAI({
      apiKey: openaiApiKey.value(),
    });

    // CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(200).send();
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { text } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "`text` (string) is required" });
      return;
    }

  const functionDefs = [
    {
      type: "function" as const,
      function: {
        name: "addUser",
        description: "Add a new member to the org chart",
        parameters: {
          type: "object",
          properties: {
            organizationId: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            role: { type: "string" },
            managerId: { type: "string", nullable: true },
            subordinateIds: { type: "array", items: { type: "string" } }
          },
          required: ["organizationId", "name", "role"]
        }
      }
    }
  ];

  try {
    // Send user message to OpenAI
    let response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      tools: functionDefs,
      tool_choice: "auto",
      messages: [
        { 
          role: "system", 
          content: "You are OrganiChart Assistant. Help users manage their organization charts by calling the appropriate tools when needed." 
        },
        { role: "user", content: text },
      ],
    });

    const choice = response.choices[0];

    // Handle tool call if present
    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      const call = choice.message.tool_calls[0];
      const args = JSON.parse(call.function.arguments);

      let result;
      switch (call.function.name) {
        case "addUser":
          result = await addUser(args);
          break;
        default:
          throw new Error(`Unknown function: ${call.function.name}`);
      }

      // Feed result back to model
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are OrganiChart Assistant." },
          { role: "user", content: text },
          choice.message,
          { 
            role: "tool", 
            tool_call_id: call.id,
            content: JSON.stringify(result) 
          }
        ],
      });
    }

    const finalMsg = response.choices[0].message.content;
    res.json({ message: finalMsg });
  } catch (err) {
    console.error("AI agent failed", err);
    res.status(500).json({ error: "AI agent failed" });
  }
  }
);
