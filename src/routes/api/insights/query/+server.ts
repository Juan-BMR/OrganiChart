import { json } from "@sveltejs/kit";
import { OrganizationAnalyzer } from "$lib/insights/analyzer";
import { AIRecommendationEngine } from "$lib/insights/ai-recommendations";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { organizationId, query } = await request.json();
    
    if (!organizationId || !query) {
      return json(
        { error: "organizationId and query are required" },
        { status: 400 }
      );
    }

    // Analyze organization
    const analyzer = new OrganizationAnalyzer(organizationId);
    const metrics = await analyzer.analyzeOrganization();

    // Generate natural language response
    const recommendationEngine = new AIRecommendationEngine();
    const response = await recommendationEngine.generateNaturalLanguageInsights(
      query,
      metrics
    );

    return json({
      query,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to process query:", error);
    return json(
      { error: "Failed to process query" },
      { status: 500 }
    );
  }
};