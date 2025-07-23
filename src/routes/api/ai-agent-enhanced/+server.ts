import { json } from "@sveltejs/kit";
import { openai } from "$lib/openai";
import * as orgTools from "$lib/orgchart";
import type { RequestHandler } from "./$types";

// Define all available tool functions with their schemas
const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "addUser",
      description: "Add a new member to the organization chart. Use this when users want to add, create, or hire someone new.",
      parameters: {
        type: "object",
        properties: {
          organizationId: { type: "string", description: "The organization ID" },
          name: { type: "string", description: "Full name of the new member" },
          email: { type: "string", description: "Email address of the new member" },
          role: { type: "string", description: "Job title or role of the new member" },
          managerId: { type: "string", description: "ID of the manager this person reports to. Use null for top-level positions." },
          startDate: { type: "string", description: "Start date in ISO format (optional)" },
          photoURL: { type: "string", description: "Profile photo URL (optional)" },
        },
        required: ["organizationId", "name", "role"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "updateUser",
      description: "Update an existing member's information. Use this to modify, edit, change, or promote someone.",
      parameters: {
        type: "object",
        properties: {
          organizationId: { type: "string", description: "The organization ID" },
          memberId: { type: "string", description: "ID of the member to update" },
          name: { type: "string", description: "New name (optional)" },
          email: { type: "string", description: "New email (optional)" },
          role: { type: "string", description: "New job title or role (optional)" },
          managerId: { type: "string", description: "New manager ID (optional, use null to remove manager)" },
          startDate: { type: "string", description: "New start date (optional)" },
          photoURL: { type: "string", description: "New profile photo URL (optional)" },
        },
        required: ["organizationId", "memberId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "removeUser",
      description: "Remove a member from the organization chart. Use this when someone leaves, is fired, or should be deleted.",
      parameters: {
        type: "object",
        properties: {
          organizationId: { type: "string", description: "The organization ID" },
          memberId: { type: "string", description: "ID of the member to remove" },
          reassignSubordinatesTo: { type: "string", description: "ID of the member who should manage the removed person's subordinates (optional)" },
        },
        required: ["organizationId", "memberId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getUserInfo",
      description: "Find and get detailed information about a member. Use this to look up, search for, or get details about someone.",
      parameters: {
        type: "object",
        properties: {
          organizationId: { type: "string", description: "The organization ID" },
          query: { type: "string", description: "Search term: member name, email, or ID" },
        },
        required: ["organizationId", "query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getOrgAnalysis",
      description: "Generate comprehensive analysis and insights about the organization structure, hierarchy, and management spans.",
      parameters: {
        type: "object",
        properties: {
          organizationId: { type: "string", description: "The organization ID" },
        },
        required: ["organizationId"],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are OrganiChart AI Assistant, a specialized AI helper for organization chart management and HR insights.

**Your Core Capabilities:**
- Add, update, and remove organization members
- Search for member information and details
- Analyze organizational structure and provide insights
- Suggest improvements to hierarchy and management spans
- Help with HR planning and organizational design

**Context Awareness:**
- You're working within a specific organization context
- Always use the provided organizationId for all operations
- Remember previous conversations in the session for context
- When users refer to "the previous person" or "that member", use conversation history

**Communication Style:**
- Be professional but friendly and conversational
- Provide clear confirmations after actions
- Offer proactive suggestions when appropriate
- Explain analysis results in business-friendly terms
- Ask clarifying questions when requests are ambiguous

**Best Practices:**
- Always confirm member details before making changes
- Suggest organizational improvements based on analysis
- Handle edge cases gracefully (missing managers, orphaned members)
- Provide helpful context about organizational health metrics

**Tool Usage Guidelines:**
- Use getUserInfo first when you need to find someone by name
- Always validate member IDs before update/remove operations
- Provide meaningful feedback about the impact of changes
- Use getOrgAnalysis to provide strategic insights and recommendations

You have access to real-time organization data and can perform all standard HR and organizational management operations.`;

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text, orgId, conversationContext } = await request.json();

    if (!text || typeof text !== "string") {
      return json({ error: "Missing required 'text' parameter" }, { status: 400 });
    }

    if (!orgId || typeof orgId !== "string") {
      return json({ error: "Missing required 'orgId' parameter" }, { status: 400 });
    }

    // Build conversation history with context
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add conversation context if provided
    if (conversationContext) {
      messages.push({
        role: "system",
        content: `Recent conversation context:\n${conversationContext}\n\nCurrent organization ID: ${orgId}`,
      });
    }

    messages.push({ role: "user", content: text });

    // First API call to get the model's response
    let response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: toolDefinitions,
      tool_choice: "auto",
      temperature: 0.1, // Low temperature for more consistent responses
    });

    const firstChoice = response.choices[0];
    
    // Handle tool calls if any
    if (firstChoice.finish_reason === "tool_calls" && firstChoice.message.tool_calls) {
      const toolCall = firstChoice.message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      // Add organization ID to all function calls
      functionArgs.organizationId = orgId;

      let toolResult;
      try {
        // Execute the tool function
        const toolFunction = orgTools[functionName as keyof typeof orgTools];
        if (!toolFunction) {
          throw new Error(`Unknown tool function: ${functionName}`);
        }

        toolResult = await toolFunction(functionArgs);
      } catch (error) {
        toolResult = {
          error: error instanceof Error ? error.message : "Unknown error occurred",
          success: false,
        };
      }

      // Add tool call and result to message history
      messages.push({
        role: "assistant",
        content: firstChoice.message.content,
        tool_calls: firstChoice.message.tool_calls,
      });

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });

      // Get final response from model after tool execution
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.1,
      });
    }

    const finalMessage = response.choices[0].message.content || "I apologize, but I couldn't process your request.";

    return json({
      message: finalMessage,
      success: true,
    });

  } catch (error) {
    console.error("Enhanced AI Agent error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    
    return json(
      { 
        error: errorMessage,
        message: "I'm sorry, I encountered an error while processing your request. Please try again.",
        success: false,
      },
      { status: 500 }
    );
  }
};