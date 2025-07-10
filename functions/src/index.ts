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

// Function definitions for AI tools
const functionDefs = [
  {
    type: "function" as const,
    function: {
      name: "getUserInformation",
      description: "Advanced search for existing members in the organization by name using fuzzy matching. Returns exact matches and suggestions with confidence scores. Use this when you need to find a user but the name might be misspelled, incomplete, or when you want to verify if someone exists before performing operations.",
      parameters: {
        type: "object",
        properties: {
          organizationId: { type: "string" },
          userName: { type: "string", description: "Name or partial name to search for. Supports fuzzy matching for misspellings and variations." }
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
  },
  {
    type: "function" as const,
    function: {
      name: "getOrganizationInformation",
      description: "Get comprehensive information about the organization including member lists, statistics, and filtered results. Use this to answer questions like 'list all junior members', 'show me all managers', 'who works here', etc.",
      parameters: {
        type: "object",
        properties: {
          organizationId: { type: "string" },
          query: { type: "string", description: "Search term to filter members (e.g., 'junior', 'manager', 'developer')" },
          filterBy: { type: "string", enum: ["role", "level", "manager", "all"], description: "How to filter the results" },
          sortBy: { type: "string", enum: ["name", "role", "level", "joinDate"], description: "How to sort the results" }
        },
        required: ["organizationId"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "removeUser",
      description: "Remove a user from the organization. This will delete the member and automatically reassign their subordinates to their manager (or make them top-level if the removed member had no manager). IMPORTANT: Before using this function, you should ALWAYS first use getUserInformation to search for the user and get their exact ID. If the search doesn't find the user, use the intelligent fuzzy search to double-check they don't exist under a similar name. Only proceed with deletion if you have confirmed the user exists and obtained their exact user ID.",
      parameters: {
        type: "object",
        properties: {
          organizationId: { type: "string" },
          userId: { type: "string", description: "The exact ID of the user to remove from the organization (obtained from getUserInformation search)" }
        },
        required: ["organizationId", "userId"]
      }
    }
  }
];

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

// Helper function to calculate string similarity (Levenshtein distance)
function calculateSimilarity(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j += 1) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength;
}

async function getUserInformation({
  organizationId,
  userName,
}: GetUserInfoArgs) {
  const membersCol = db.collection(COLLECTIONS.MEMBERS);

  // Get all active users in the organization
  const querySnapshot = await membersCol
    .where("organizationId", "==", organizationId)
    .where("isActive", "==", true)
    .get();

  const searchTerm = userName.toLowerCase().trim();
  const allUsers: Array<{
    id: string;
    name: string;
    role: string;
    email: string;
    managerId: string | null;
    level: number;
    isActive: boolean;
    matchScore: number;
    matchType: string;
  }> = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const memberName = data.name.toLowerCase();
    const originalName = data.name;
    
    let matchScore = 0;
    let matchType = "";
    
    // 1. Exact match (highest priority)
    if (memberName === searchTerm) {
      matchScore = 1.0;
      matchType = "exact";
    }
    // 2. Full name contains search term
    else if (memberName.includes(searchTerm)) {
      matchScore = 0.9;
      matchType = "contains";
    }
    // 3. Search term contains full name
    else if (searchTerm.includes(memberName)) {
      matchScore = 0.85;
      matchType = "contained_in_search";
    }
    // 4. First name or last name match
    else {
      const nameParts = memberName.split(' ');
      const searchParts = searchTerm.split(' ');
      
      let bestPartMatch = 0;
      for (const namePart of nameParts) {
        for (const searchPart of searchParts) {
          if (namePart === searchPart) {
            bestPartMatch = Math.max(bestPartMatch, 0.8);
            matchType = "name_part_exact";
          } else if (namePart.includes(searchPart) || searchPart.includes(namePart)) {
            bestPartMatch = Math.max(bestPartMatch, 0.7);
            matchType = "name_part_contains";
          }
        }
      }
      
      if (bestPartMatch > 0) {
        matchScore = bestPartMatch;
      } else {
        // 5. Fuzzy matching using similarity calculation
        const similarity = calculateSimilarity(memberName, searchTerm);
        if (similarity > 0.6) { // 60% similarity threshold
          matchScore = similarity * 0.6; // Scale down fuzzy matches
          matchType = "fuzzy";
        }
      }
    }
    
    // Only include matches above threshold
    if (matchScore > 0.5) {
      allUsers.push({
        id: doc.id,
        name: originalName,
        role: data.role,
        email: data.email,
        managerId: data.managerId,
        level: data.level,
        isActive: data.isActive,
        matchScore,
        matchType,
      });
    }
  });

  // Sort by match score (best matches first)
  allUsers.sort((a, b) => b.matchScore - a.matchScore);

  // Separate exact/high-confidence matches from suggestions
  const exactMatches = allUsers.filter(u => u.matchScore >= 0.8);
  const suggestions = allUsers.filter(u => u.matchScore < 0.8 && u.matchScore > 0.5);

  return {
    searchTerm: userName,
    exactMatches: exactMatches.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
      managerId: u.managerId,
      level: u.level,
      isActive: u.isActive,
      matchType: u.matchType,
      confidence: Math.round(u.matchScore * 100),
    })),
    suggestions: suggestions.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
      managerId: u.managerId,
      level: u.level,
      isActive: u.isActive,
      matchType: u.matchType,
      confidence: Math.round(u.matchScore * 100),
    })),
    totalExactMatches: exactMatches.length,
    totalSuggestions: suggestions.length,
    totalFound: allUsers.length,
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

// Get Organization Information function
interface GetOrgInfoArgs {
  organizationId: string;
  query?: string;
  filterBy?: "role" | "level" | "manager" | "all";
  sortBy?: "name" | "role" | "level" | "joinDate";
}

async function getOrganizationInformation({
  organizationId,
  query = "",
  filterBy = "all",
  sortBy = "name",
}: GetOrgInfoArgs) {
  const membersCol = db.collection(COLLECTIONS.MEMBERS);

  // Get all active members in the organization
  const querySnapshot = await membersCol
    .where("organizationId", "==", organizationId)
    .where("isActive", "==", true)
    .get();

  let members: Array<{
    id: string;
    name: string;
    role: string;
    email: string;
    managerId: string | null;
    level: number;
    isActive: boolean;
    startDate?: any;
    createdAt?: any;
  }> = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    members.push({
      id: doc.id,
      name: data.name,
      role: data.role,
      email: data.email,
      managerId: data.managerId,
      level: data.level,
      isActive: data.isActive,
      startDate: data.startDate,
      createdAt: data.createdAt,
    });
  });

  // Apply filtering based on query and filterBy
  if (query.trim()) {
    const searchTerm = query.toLowerCase().trim();
    members = members.filter((member) => {
      switch (filterBy) {
        case "role":
          return member.role.toLowerCase().includes(searchTerm);
        case "level":
          // For level, check if query contains level-related keywords
          const levelKeywords = ["junior", "senior", "lead", "manager", "director", "vp", "ceo", "cto", "cfo"];
          return levelKeywords.some(keyword => 
            (searchTerm.includes(keyword) && member.role.toLowerCase().includes(keyword)) ||
            (searchTerm.includes("junior") && (member.role.toLowerCase().includes("junior") || member.role.toLowerCase().includes("jr"))) ||
            (searchTerm.includes("senior") && (member.role.toLowerCase().includes("senior") || member.role.toLowerCase().includes("sr")))
          );
        case "manager":
          // Find members who report to someone with the searched name
          const managerMember = members.find(m => m.name.toLowerCase().includes(searchTerm));
          return managerMember ? member.managerId === managerMember.id : false;
        default:
          return (
            member.name.toLowerCase().includes(searchTerm) ||
            member.role.toLowerCase().includes(searchTerm) ||
            member.email.toLowerCase().includes(searchTerm)
          );
      }
    });
  }

  // Apply sorting
  members.sort((a, b) => {
    switch (sortBy) {
      case "role":
        return a.role.localeCompare(b.role);
      case "level":
        return a.level - b.level;
      case "joinDate":
        const aDate = a.startDate || a.createdAt;
        const bDate = b.startDate || b.createdAt;
        return new Date(aDate?.toDate ? aDate.toDate() : aDate).getTime() - 
               new Date(bDate?.toDate ? bDate.toDate() : bDate).getTime();
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Get some statistics
  const roleStats = members.reduce((acc, member) => {
    acc[member.role] = (acc[member.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topLevelMembers = members.filter(m => !m.managerId);
  const managersCount = members.filter(m => 
    members.some(subordinate => subordinate.managerId === m.id)
  ).length;

  return {
    totalMembers: members.length,
    members: members.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      email: m.email,
      hasSubordinates: members.some(sub => sub.managerId === m.id),
      managerName: m.managerId ? members.find(manager => manager.id === m.managerId)?.name : null,
      level: m.level,
    })),
    statistics: {
      totalMembers: members.length,
      topLevelMembers: topLevelMembers.length,
      managersCount,
      roleBreakdown: roleStats,
    },
    query: query || "all members",
    filterBy,
    sortBy,
  };
}

// Remove User function
interface RemoveUserArgs {
  organizationId: string;
  userId: string;
}

async function removeUser({
  organizationId,
  userId,
}: RemoveUserArgs) {
  const membersCol = db.collection(COLLECTIONS.MEMBERS);
  
  try {
    // First, get the member being deleted to know their details and manager
    const memberRef = db.collection(COLLECTIONS.MEMBERS).doc(userId);
    const memberDoc = await memberRef.get();
    
    if (!memberDoc.exists) {
      throw new Error("Member not found");
    }
    
    const memberData = memberDoc.data();
    
    // Verify the member belongs to the correct organization
    if (memberData?.organizationId !== organizationId) {
      throw new Error("Member does not belong to the specified organization");
    }
    
    const deletedMemberManagerId = memberData.managerId;
    const memberName = memberData.name;
    const memberRole = memberData.role;
    
    // Find all subordinates (direct reports) of the member being deleted
    const subordinatesQuery = await membersCol
      .where("managerId", "==", userId)
      .where("organizationId", "==", organizationId)
      .get();
    
    const subordinates: Array<{ id: string; name: string; role: string }> = [];
    subordinatesQuery.forEach(doc => {
      const data = doc.data();
      subordinates.push({
        id: doc.id,
        name: data.name,
        role: data.role,
      });
    });
    
    console.log(`Found ${subordinates.length} subordinates to reassign`);
    
    // Reassign subordinates to the deleted member's manager
    // If deleted member was top-level (no manager), subordinates become top-level too
    const newManagerId = deletedMemberManagerId || null;
    
    // Update all subordinates in parallel
    const updatePromises = subordinates.map(subordinate => {
      return db.collection(COLLECTIONS.MEMBERS).doc(subordinate.id).update({
        managerId: newManagerId,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    });
    
    // Wait for all subordinate updates to complete
    await Promise.all(updatePromises);
    
    console.log(`Successfully reassigned ${subordinates.length} subordinates to manager: ${newManagerId || 'top-level'}`);
    
    // Now delete the member
    await memberRef.delete();
    
    // Note: File cleanup (photos, CVs) would be handled by Cloud Storage rules or separate cleanup functions
    // in a production environment. For now, we'll focus on the database operations.
    
    console.log(`Successfully deleted member ${userId} and reassigned ${subordinates.length} subordinates`);
    
    return {
      success: true,
      deletedMember: {
        id: userId,
        name: memberName,
        role: memberRole,
      },
      reassignedSubordinates: subordinates,
      newManagerId: newManagerId,
      message: subordinates.length > 0 
        ? `Successfully removed ${memberName} (${memberRole}) and reassigned ${subordinates.length} subordinate(s) to ${newManagerId ? 'their manager' : 'top level'}.`
        : `Successfully removed ${memberName} (${memberRole}) from the organization.`
    };
    
  } catch (error) {
    console.error("Failed to remove member", error);
    throw new Error(`Failed to remove member: ${error instanceof Error ? error.message : String(error)}`);
  }
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



  try {
    // Build messages array with conversation context
    const messages = [
      { 
        role: "system" as const, 
        content: `You are OrganiChart Assistant. Help users manage their organization charts by calling the appropriate tools when needed. 

Current organization ID: ${orgId}

When calling functions that require an organizationId, always use: ${orgId}

IMPORTANT WORKFLOW GUIDELINES:
1. BEFORE deleting any user, ALWAYS search for them first using getUserInformation to:
   - Verify they exist
   - Get their exact user ID
   - Handle name variations/misspellings
2. If a user is not found, use fuzzy search to check for similar names
3. Only proceed with deletion if you have confirmed the user exists and obtained their exact ID
4. When adding users between others, search for both the manager and subordinate first
5. Use proper job roles (Developer, Manager, etc.) - never use generic terms like "Subordinate"

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
            case "getOrganizationInformation":
              result = await getOrganizationInformation(args);
              break;
            case "removeUser":
              result = await removeUser(args);
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

// Streaming event types
type StreamEvent =
  | { type: "message_start" }
  | { type: "content_delta"; content: string }
  | { type: "tool_call_start"; toolName: string; toolId: string }
  | { type: "tool_execution"; toolId: string; result: any }
  | { type: "tool_error"; toolId: string; error: string }
  | { type: "message_boundary" }
  | { type: "conversation_complete" }
  | { type: "error"; error: string };

// Helper function to send streaming events
function sendStreamEvent(response: any, event: StreamEvent) {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

// Helper function to stream content incrementally
async function streamContent(response: any, content: string) {
  const chunks = content.split(' ');
  for (const chunk of chunks) {
    sendStreamEvent(response, { type: "content_delta", content: chunk + ' ' });
    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for natural streaming
  }
}

// Execute tool with streaming feedback
async function executeToolWithStreaming(toolCall: any, response: any) {
  // 1. Announce tool execution
  sendStreamEvent(response, {
    type: "tool_call_start",
    toolName: toolCall.function.name,
    toolId: toolCall.id,
  });

  // 2. Execute tool
  try {
    const args = JSON.parse(toolCall.function.arguments);
    let result;

    switch (toolCall.function.name) {
      case "getUserInformation":
        result = await getUserInformation(args);
        break;
      case "addUser":
        result = await addUser(args);
        break;
      case "addUserBetween":
        result = await addUserBetween(args);
        break;
      case "getOrganizationInformation":
        result = await getOrganizationInformation(args);
        break;
      case "removeUser":
        result = await removeUser(args);
        break;
      default:
        throw new Error(`Unknown function: ${toolCall.function.name}`);
    }

    // 3. Stream result
    sendStreamEvent(response, {
      type: "tool_execution",
      toolId: toolCall.id,
      result: result,
    });

    return result;
  } catch (error: any) {
    // 4. Handle errors gracefully
    sendStreamEvent(response, {
      type: "tool_error",
      toolId: toolCall.id,
      error: error.message,
    });

    return { error: error.message };
  }
}

// Evaluate if conversation should continue
function shouldContinueConversation(lastMessage: any, toolResults: any[]): boolean {
  // Continue if:
  // 1. Tool execution revealed new information requiring action
  // 2. User request has multiple parts not yet completed
  // 3. Error occurred that can be recovered from
  // 4. Clarification or follow-up is needed
  
  // Check if any tool results indicate more work is needed
  const hasErrors = toolResults.some(result => result.error);
  const hasIncompleteData = toolResults.some(result => 
    result && typeof result === 'object' && 
    (result.length === 0 || result.message === 'not found')
  );
  
  // Check if the last message suggests continuation
  const content = lastMessage?.content || '';
  const suggestsContinuation = content.includes('now I will') || 
                              content.includes('next') ||
                              content.includes('let me') ||
                              content.includes('proceeding');
  
  return hasErrors || hasIncompleteData || suggestsContinuation;
}

// Multi-message streaming agent implementation
export const aiAgentStreamMulti = onRequest(
  { secrets: [openaiApiKey] },
  async (req, res) => {
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    try {
      const { text, orgId, conversationContext } = req.body;

      if (!text || !orgId) {
        sendStreamEvent(res, { type: "error", error: "Missing required parameters" });
        res.end();
        return;
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: openaiApiKey.value(),
      });

      // Enhanced system prompt for streaming communication
      const systemPrompt = {
        role: "system" as const,
        content: `You are OrganiChart Assistant, a knowledgeable colleague helping manage organization charts. 

COMMUNICATION STYLE:
- Act as a helpful colleague working through tasks step-by-step
- Break complex tasks into logical steps with progress updates
- Explain your reasoning and actions naturally
- Use conversational language and provide status updates
- Communicate what you're doing before doing it

WORKFLOW PATTERN:
1. Acknowledge the user's request and explain your approach
2. If you need information, search for it and report findings
3. Take actions step by step, explaining each one
4. Provide status updates between major steps
5. Confirm completion with summary of what was accomplished

MULTI-MESSAGE GUIDELINES:
- Send separate messages for different logical steps
- Use message boundaries to separate distinct phases
- Don't try to complete everything in one response
- Communicate what you're doing before doing it
- Report results and plan next steps

TOOL USAGE GUIDELINES:
- ALWAYS search before removing users to get exact IDs
- Explain what you're doing when using tools
- If a tool gives unexpected results, adapt your approach
- Use proper role names (Manager, Developer) not generic terms
- Handle fuzzy search results intelligently

Current organization ID: ${orgId}

When calling functions that require an organizationId, always use: ${orgId}

${conversationContext ? `\nRecent conversation:\n${conversationContext}` : ''}`
      };

      let conversationMessages: any[] = [systemPrompt, { role: "user" as const, content: text }];
      let iterationCount = 0;
      const maxIterations = 10;

      while (iterationCount < maxIterations) {
        // Send message start event
        sendStreamEvent(res, { type: "message_start" });

        // Get AI response with streaming
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          tools: functionDefs,
          tool_choice: "auto",
          messages: conversationMessages,
          stream: true,
        });

        let currentContent = "";
        let hasToolCalls = false;

        // Stream the AI response
        for await (const chunk of response) {
          const choice = chunk.choices[0];
          if (choice?.delta?.content) {
            currentContent += choice.delta.content;
            sendStreamEvent(res, { 
              type: "content_delta", 
              content: choice.delta.content 
            });
          }
          
          // Check for tool calls
          if (choice?.delta?.tool_calls) {
            hasToolCalls = true;
          }
        }

        // Add the assistant message to conversation
        const assistantMessage: any = {
          role: "assistant" as const,
          content: currentContent,
          tool_calls: hasToolCalls ? [] : undefined, // Will be populated if needed
        };
        conversationMessages.push(assistantMessage);

        // If no tool calls, check if we should continue
        if (!hasToolCalls) {
          const shouldContinue = shouldContinueConversation(assistantMessage, []);
          if (!shouldContinue) {
            sendStreamEvent(res, { type: "conversation_complete" });
            break;
          }
        }

        // Handle tool calls if present
        if (hasToolCalls) {
          // Get the full response to access tool calls
          const fullResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            tools: functionDefs,
            tool_choice: "auto",
            messages: conversationMessages.slice(0, -1), // Remove the assistant message we just added
          });

          const choice = fullResponse.choices[0];
          if (choice.message.tool_calls) {
            // Update the assistant message with tool calls
            assistantMessage.tool_calls = choice.message.tool_calls;
            
            const toolResults = [];
            
            // Execute all tool calls with streaming
            for (const toolCall of choice.message.tool_calls) {
              const result = await executeToolWithStreaming(toolCall, res);
              toolResults.push(result);
              
              // Add tool result to conversation
              conversationMessages.push({
                role: "tool" as const,
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
              } as any);
            }

            // Send message boundary for next iteration
            sendStreamEvent(res, { type: "message_boundary" });
          }
        }

        iterationCount++;
      }

      res.end();
    } catch (error: any) {
      console.error("Streaming AI agent failed", error);
      sendStreamEvent(res, { type: "error", error: error.message });
      res.end();
    }
  }
);
