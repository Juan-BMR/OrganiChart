import { json } from "@sveltejs/kit";
import { openai } from "$lib/openai";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { organizationId, members } = await request.json();

    if (!organizationId || !members || !Array.isArray(members)) {
      return json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    // Calculate basic metrics
    const totalMembers = members.length;
    const hierarchyDepth = calculateHierarchyDepth(members);
    const averageSpanOfControl = calculateAverageSpanOfControl(members);
    const uniqueRoles = new Set(members.map(m => m.role)).size;
    const roleDistribution = calculateRoleDistribution(members);

    // Generate AI insights using OpenAI
    const insights = await generateAIInsights(members, {
      totalMembers,
      hierarchyDepth,
      averageSpanOfControl,
      uniqueRoles,
      roleDistribution
    });

    return json({
      insights: {
        overview: {
          totalMembers,
          hierarchyDepth,
          averageSpanOfControl,
          uniqueRoles
        },
        roleDistribution,
        analysis: insights
      }
    });

  } catch (error) {
    console.error("Error generating AI insights:", error);
    return json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
};

function calculateHierarchyDepth(members) {
  if (members.length === 0) return 0;

  const memberMap = new Map(members.map(m => [m.id, m]));
  const depths = new Map();

  function getDepth(memberId) {
    if (depths.has(memberId)) return depths.get(memberId);

    const member = memberMap.get(memberId);
    if (!member || !member.managerId) {
      depths.set(memberId, 0);
      return 0;
    }

    const managerDepth = getDepth(member.managerId);
    const depth = managerDepth + 1;
    depths.set(memberId, depth);
    return depth;
  }

  members.forEach(member => getDepth(member.id));
  return Math.max(...depths.values()) + 1;
}

function calculateAverageSpanOfControl(members) {
  if (members.length === 0) return 0;

  const managerCounts = {};
  members.forEach(member => {
    if (member.managerId) {
      managerCounts[member.managerId] = (managerCounts[member.managerId] || 0) + 1;
    }
  });

  const spans = Object.values(managerCounts);
  if (spans.length === 0) return 0;

  return spans.reduce((sum, span) => sum + span, 0) / spans.length;
}

function calculateRoleDistribution(members) {
  const distribution = {};
  members.forEach(member => {
    const role = member.role || 'Unspecified';
    distribution[role] = (distribution[role] || 0) + 1;
  });
  return distribution;
}

async function generateAIInsights(members, metrics) {
  try {
    const systemPrompt = `You are an expert organizational analyst. Analyze the provided organization structure and provide 3-5 key insights and recommendations.

Organization Metrics:
- Total Members: ${metrics.totalMembers}
- Hierarchy Depth: ${metrics.hierarchyDepth} levels
- Average Span of Control: ${metrics.averageSpanOfControl.toFixed(1)} direct reports per manager
- Unique Roles: ${metrics.uniqueRoles}
- Role Distribution: ${JSON.stringify(metrics.roleDistribution)}

Provide insights in this JSON format:
[
  {
    "type": "positive" | "warning" | "suggestion",
    "title": "Brief title",
    "description": "Detailed explanation",
    "metrics": { "optional": "metric data" }
  }
]

Focus on:
1. Structure efficiency and potential improvements
2. Management span of control analysis
3. Role distribution and specialization
4. Growth patterns and scalability
5. Communication flow effectiveness

Be specific, actionable, and professional.`;

    const userPrompt = `Analyze this organization structure with ${members.length} members. Provide key insights about the organizational design, potential improvements, and recommendations for optimal structure.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    const insights = JSON.parse(content);

    // Validate the response format
    if (!Array.isArray(insights)) {
      throw new Error("Invalid response format");
    }

    return insights;

  } catch (error) {
    console.error("Error generating AI insights:", error);

    // Fallback insights if AI fails
    return [
      {
        type: "suggestion",
        title: "Organization Structure Analysis",
        description: `Your organization has ${metrics.totalMembers} members across ${metrics.hierarchyDepth} levels with an average span of control of ${metrics.averageSpanOfControl.toFixed(1)}. Consider reviewing management spans and role distribution for optimal efficiency.`,
        metrics: {
          "Total Members": metrics.totalMembers,
          "Hierarchy Levels": metrics.hierarchyDepth,
          "Avg Span of Control": metrics.averageSpanOfControl.toFixed(1)
        }
      },
      {
        type: "positive",
        title: "Role Diversity",
        description: `The organization maintains ${metrics.uniqueRoles} different roles, indicating good specialization and division of responsibilities.`,
        metrics: {
          "Unique Roles": metrics.uniqueRoles
        }
      }
    ];
  }
}