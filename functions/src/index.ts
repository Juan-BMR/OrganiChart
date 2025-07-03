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

// Get User Information function
interface GetUserInfoArgs {
  organizationId: string;
  userName: string;
}

async function getUserInformation({
  organizationId,
  userName,
}: GetUserInfoArgs) {
  const membersCol = db.collection(COLLECTIONS.MEMBERS);

  // Search for users by name (case-insensitive partial match)
  const querySnapshot = await membersCol
    .where("organizationId", "==", organizationId)
    .where("isActive", "==", true)
    .get();

  const searchTerm = userName.toLowerCase().trim();
  const matchingUsers: Array<{
    id: string;
    name: string;
    role: string;
    email: string;
    managerId: string | null;
    level: number;
    isActive: boolean;
  }> = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const memberName = data.name.toLowerCase();
    
    // Check for partial name matches (first name, last name, or full name)
    if (memberName.includes(searchTerm) || searchTerm.includes(memberName)) {
      matchingUsers.push({
        id: doc.id,
        name: data.name,
        role: data.role,
        email: data.email,
        managerId: data.managerId,
        level: data.level,
        isActive: data.isActive,
      });
    }
  });

  return {
    searchTerm: userName,
    foundUsers: matchingUsers,
    totalFound: matchingUsers.length,
  };
}

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

// Add User Between function - adds a member between a manager and subordinate
interface AddUserBetweenArgs {
  organizationId: string;
  name: string;
  email?: string;
  role: string;
  managerUserId: string;
  subordinateUserId: string;
  startDate?: string | Date | null;
  photoURL?: string | null;
  cvURL?: string | null;
}

async function addUserBetween({
  organizationId,
  name,
  email = "",
  role,
  managerUserId,
  subordinateUserId,
  startDate = null,
  photoURL = null,
  cvURL = null,
}: AddUserBetweenArgs) {
  const membersCol = db.collection(COLLECTIONS.MEMBERS);

  // First, get the subordinate to verify they exist and get their current manager
  const subordinateDoc = await membersCol.doc(subordinateUserId).get();
  if (!subordinateDoc.exists) {
    throw new Error(`Subordinate user with ID ${subordinateUserId} not found`);
  }

  const subordinateData = subordinateDoc.data();
  if (subordinateData?.organizationId !== organizationId) {
    throw new Error(`Subordinate user is not in the specified organization`);
  }

  // Verify the manager exists
  const managerDoc = await membersCol.doc(managerUserId).get();
  if (!managerDoc.exists) {
    throw new Error(`Manager user with ID ${managerUserId} not found`);
  }

  const managerData = managerDoc.data();
  if (managerData?.organizationId !== organizationId) {
    throw new Error(`Manager user is not in the specified organization`);
  }

  // Create the new member with the manager as their manager
  const data = {
    ...createMemberData(
      organizationId,
      name,
      email,
      role,
      photoURL,
      managerUserId, // The new member reports to the specified manager
      startDate ? new Date(startDate) : null,
    ),
  };

  const newMemberRef = await membersCol.add(data);
  const newMemberId = newMemberRef.id;

  // Update the subordinate to report to the new member
  await membersCol.doc(subordinateUserId).update({
    managerId: newMemberId,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  return {
    id: newMemberId,
    name,
    role,
    insertedBetween: {
      manager: { id: managerUserId, name: managerData?.name },
      subordinate: { id: subordinateUserId, name: subordinateData?.name }
    },
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

    const { text, orgId, conversationContext } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "`text` (string) is required" });
      return;
    }

    if (!orgId || typeof orgId !== "string") {
      res.status(400).json({ error: "`orgId` (string) is required" });
      return;
    }

  const functionDefs = [
    {
      type: "function" as const,
      function: {
        name: "getUserInformation",
        description: "Search for existing members in the organization by name to get their IDs and information. You could need this to add a new member to the org chart that has the searched member as a manager.",
        parameters: {
          type: "object",
          properties: {
            organizationId: { type: "string" },
            userName: { type: "string", description: "Name or partial name to search for" }
          },
          required: ["organizationId", "userName"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "addUser",
        description: "Add a new member to the org chart with an optional manager and subordinates",
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
    },
    {
      type: "function" as const,
      function: {
        name: "addUserBetween",
        description: "Add a new member between two existing members in the hierarchy. The new member will report to the manager and the subordinate will report to the new member. Use this when user says 'add X between Y and Z' or 'insert X between Y and Z'.",
        parameters: {
          type: "object",
          properties: {
            organizationId: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            role: { type: "string" },
            managerUserId: { type: "string", description: "ID of the user who will be the manager of the new member" },
            subordinateUserId: { type: "string", description: "ID of the user who will become subordinate to the new member" }
          },
          required: ["organizationId", "name", "role", "managerUserId", "subordinateUserId"]
        }
      }
    }
  ];

  try {
    // Build messages array with conversation context
    const messages = [
      { 
        role: "system" as const, 
        content: `You are OrganiChart Assistant. Help users manage their organization charts by calling the appropriate tools when needed. 

Current organization ID: ${orgId}

When calling functions that require an organizationId, always use: ${orgId}

${conversationContext ? `\nRecent conversation:\n${conversationContext}` : ''}` 
      },
      { role: "user" as const, content: text },
    ];

    // Send user message to OpenAI
    let response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      tools: functionDefs,
      tool_choice: "auto",
      messages,
    });

        // Handle multiple sequential tool calls in a loop
    let currentMessages: any[] = [...messages];
    let maxToolCalls = 5; // Prevent infinite loops
    let toolCallCount = 0;

    while (toolCallCount < maxToolCalls) {
      const choice = response.choices[0];

      // If no tool calls, we're done
      if (choice.finish_reason !== "tool_calls" || !choice.message.tool_calls) {
        break;
      }

      // Add the assistant message first (before tool results)
      currentMessages = [
        ...currentMessages,
        choice.message
      ];

      // Process ALL tool calls in this message
      for (const call of choice.message.tool_calls) {
        const args = JSON.parse(call.function.arguments);

        let result;
        try {
          switch (call.function.name) {
            case "getUserInformation":
              result = await getUserInformation(args);
              break;
            case "addUser":
              result = await addUser(args);
              break;
            case "addUserBetween":
              result = await addUserBetween(args);
              break;
            default:
              throw new Error(`Unknown function: ${call.function.name}`);
          }
        } catch (functionError: any) {
          console.error(`Function ${call.function.name} failed:`, functionError);
          result = { 
            error: `Function failed: ${functionError?.message || 'Unknown error'}`,
            functionName: call.function.name 
          };
        }

        // Add the tool result to message history
        currentMessages = [
          ...currentMessages,
          { 
            role: "tool" as const, 
            tool_call_id: call.id,
            content: JSON.stringify(result) 
          }
        ];
      }

      // Send updated messages back to OpenAI
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        tools: functionDefs,
        messages: currentMessages,
      });

      toolCallCount++;
    }

    const finalMsg = response.choices[0].message.content;
    res.json({ message: finalMsg });
  } catch (err) {
    console.error("AI agent failed", err);
    res.status(500).json({ error: "AI agent failed" });
  }
  }
);
