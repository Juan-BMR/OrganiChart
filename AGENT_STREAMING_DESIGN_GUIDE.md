# OrganiChart AI Agent Streaming Design Guide

## Overview

This guide provides a step-by-step approach to designing an effective streaming AI agent for OrganiChart based on OpenAI's "A Practical Guide to Building Agents" best practices. The goal is to create a natural, conversational assistant that manages organization charts through multi-step workflows with real-time streaming feedback.

## Core Agent Architecture

### 1. Agent Components (OpenAI Framework)

Based on OpenAI's agent foundations, our agent consists of:

**Model**: GPT-4o-mini for reasoning and decision-making
**Tools**: Organization management functions (getUserInformation, addUser, removeUser, etc.)
**Instructions**: Detailed behavioral guidelines and workflow patterns

### 2. Agent Characteristics

Our agent must possess these core characteristics:

- **Autonomous Workflow Management**: Controls the execution flow and makes decisions
- **Tool Selection**: Dynamically chooses appropriate tools based on context
- **Error Recovery**: Handles failures gracefully and provides meaningful feedback
- **Guardrails**: Operates within defined safety boundaries

## Streaming Agent Design Principles

### 1. Multi-Message Conversation Pattern

**Philosophy**: Think of the agent as a helpful colleague working through tasks step-by-step, providing updates as they progress.

**Implementation Strategy**:

```
User Request → Agent Acknowledgment → Progress Updates → Tool Execution → Result Reporting → Continuation or Completion
```

### 2. Message Flow Architecture

**Message Types**:

- **Acknowledgment**: "I'll help you add John Smith as a Manager"
- **Progress**: "Let me search for existing users first"
- **Tool Execution**: [TOOL CALL with streaming feedback]
- **Results**: "Found 3 existing managers, proceeding with addition"
- **Completion**: "Successfully added John Smith as Manager"

### 3. Streaming Event Types

**Core Events**:

```typescript
type StreamEvent =
  | { type: "message_start" }
  | { type: "content_delta"; content: string }
  | { type: "tool_call_start"; toolName: string; toolId: string }
  | { type: "tool_execution"; toolId: string; result: any }
  | { type: "message_boundary" }
  | { type: "conversation_complete" }
  | { type: "error"; error: string };
```

## Step-by-Step Implementation Guide

### Step 1: System Prompt Design

**Objective**: Create instructions that encourage natural, step-by-step communication

**Key Elements**:

```
COMMUNICATION STYLE:
- Act as a knowledgeable colleague working on organization management
- Break complex tasks into logical steps
- Provide progress updates as you work
- Explain your reasoning and actions
- Use natural, conversational language

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
```

### Step 2: Conversation Loop Architecture

**Design Pattern**: Iterative conversation with continuation logic

```typescript
async function aiAgentStreamMulti(request, response) {
  let conversationMessages = [systemPrompt, userMessage];
  let iterationCount = 0;
  const maxIterations = 10;

  while (iterationCount < maxIterations) {
    // 1. Stream AI response
    const aiResponse = await streamAIResponse(conversationMessages);

    // 2. Check for tool calls
    if (hasToolCalls(aiResponse)) {
      await executeToolsWithStreaming(aiResponse.toolCalls);
      conversationMessages.push(aiResponse, ...toolResults);
    } else {
      conversationMessages.push(aiResponse);
    }

    // 3. Determine if conversation should continue
    const shouldContinue = await evaluateContinuation(conversationMessages);
    if (!shouldContinue) break;

    iterationCount++;
  }
}
```

### Step 3: Streaming Implementation Strategy

**Streaming Phases**:

1. **Message Initiation**

   - Send `message_start` event
   - Begin content streaming

2. **Content Streaming**

   - Stream AI response content in real-time
   - Send `content_delta` events for incremental content

3. **Tool Call Detection**

   - When tool calls are detected, send `tool_call_start` events
   - Execute tools with progress feedback
   - Send `tool_execution` events with results

4. **Message Boundaries**

   - Send `message_boundary` when transitioning between logical steps
   - Allows UI to create separate message bubbles

5. **Continuation Logic**
   - Evaluate if more work is needed
   - Continue conversation loop or send `conversation_complete`

### Step 4: Tool Execution with Streaming

**Tool Execution Pattern**:

```typescript
async function executeToolWithStreaming(toolCall, response) {
  // 1. Announce tool execution
  response.write(
    `data: ${JSON.stringify({
      type: "tool_call_start",
      toolName: toolCall.function.name,
      toolId: toolCall.id,
    })}\n\n`
  );

  // 2. Execute tool
  try {
    const result = await executeTool(toolCall);

    // 3. Stream result
    response.write(
      `data: ${JSON.stringify({
        type: "tool_execution",
        toolId: toolCall.id,
        result: result,
      })}\n\n`
    );

    return result;
  } catch (error) {
    // 4. Handle errors gracefully
    response.write(
      `data: ${JSON.stringify({
        type: "tool_error",
        toolId: toolCall.id,
        error: error.message,
      })}\n\n`
    );

    return { error: error.message };
  }
}
```

### Step 5: Conversation Continuation Logic

**Continuation Evaluation**:

```typescript
function shouldContinueConversation(lastMessage, toolResults) {
  // Continue if:
  // 1. Tool execution revealed new information requiring action
  // 2. User request has multiple parts not yet completed
  // 3. Error occurred that can be recovered from
  // 4. Clarification or follow-up is needed
  // Stop if:
  // 1. User request is fully satisfied
  // 2. Maximum iterations reached
  // 3. Unrecoverable error occurred
  // 4. No clear next action
}
```

### Step 6: Error Handling and Guardrails

**Error Recovery Strategy**:

- **Tool Failures**: Explain what went wrong, suggest alternatives
- **User Not Found**: Use fuzzy search, provide suggestions
- **Permission Issues**: Gracefully explain limitations
- **System Errors**: Provide helpful error messages, offer to retry

**Guardrails Implementation**:

- **Input Validation**: Verify organization access before operations
- **Safety Checks**: Confirm destructive operations
- **Rate Limiting**: Prevent excessive tool calls
- **Context Preservation**: Maintain conversation history for continuity

## Prompt Engineering Best Practices

### 1. Clear Action Instructions

```
TOOL USAGE GUIDELINES:
- ALWAYS search before removing users to get exact IDs
- Explain what you're doing when using tools
- If a tool gives unexpected results, adapt your approach
- Use proper role names (Manager, Developer) not generic terms
- Handle fuzzy search results intelligently
```

### 2. Workflow Patterns

```
COMMON WORKFLOWS:

Adding Users:
1. "I'll add [Name] as [Role] to the organization"
2. [Execute addUser tool]
3. "Successfully added [Name]. They're now part of the team."

Removing Users:
1. "I need to find [Name] in the organization first"
2. [Execute getUserInformation]
3. "Found [Name], proceeding with removal"
4. [Execute removeUser]
5. "Successfully removed [Name] and handled their subordinates"

Complex Operations:
1. "This requires multiple steps. Let me start by..."
2. [Execute first tool]
3. "Now I'll proceed with..."
4. [Execute second tool]
5. "All steps completed successfully"
```

### 3. Natural Communication Patterns

```
COMMUNICATION EXAMPLES:

Acknowledgment:
- "I'll help you add John Smith as a Manager"
- "Let me remove Maria from the organization"
- "I'll search for all developers in the company"

Progress Updates:
- "Searching for existing users..."
- "Found the user, now proceeding with removal..."
- "Let me check the current organization structure..."

Result Reporting:
- "Successfully added John Smith as Manager"
- "Found 5 developers currently in the organization"
- "Maria has been removed and her team reassigned"
```

## Implementation Checklist

### Backend Implementation

- [ ] Create `aiAgentStreamMulti` function with conversation loop
- [ ] Implement streaming event types and handlers
- [ ] Add tool execution with progress feedback
- [ ] Create continuation evaluation logic
- [ ] Add comprehensive error handling
- [ ] Implement guardrails and safety checks

### Frontend Integration

- [ ] Handle multiple message types in streaming
- [ ] Create message boundary processing
- [ ] Implement progressive UI updates
- [ ] Add tool execution indicators
- [ ] Handle conversation completion

### Testing Strategy

- [ ] Test single-step operations (add user)
- [ ] Test multi-step operations (remove user with search)
- [ ] Test error scenarios and recovery
- [ ] Test conversation boundaries and flow
- [ ] Test tool execution feedback

## Success Metrics

**User Experience**:

- Natural, conversational interaction
- Clear progress feedback during operations
- Appropriate error handling and recovery
- Efficient task completion

**Technical Performance**:

- Responsive streaming with minimal latency
- Reliable tool execution and error handling
- Proper conversation flow management
- Scalable architecture for complex workflows

## Key Principles Summary

1. **Think Like a Colleague**: The agent should communicate naturally, explaining what it's doing and why
2. **Progressive Disclosure**: Break complex tasks into steps with progress updates
3. **Robust Error Handling**: Gracefully handle failures and provide helpful guidance
4. **Tool Mastery**: Use tools effectively while explaining their purpose and results
5. **Conversation Flow**: Maintain natural dialogue flow with appropriate boundaries
6. **User-Centric Design**: Always prioritize clear communication and user understanding

This design creates an agent that feels like working with a knowledgeable team member who keeps you informed as they help manage your organization chart.
