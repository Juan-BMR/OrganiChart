import { json } from "@sveltejs/kit";
import { OrganizationAnalyzer } from "$lib/insights/analyzer";
import { AIRecommendationEngine } from "$lib/insights/ai-recommendations";
import { db } from "$lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { COLLECTIONS, createInsightHistoryData } from "$lib/db/collections";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const { organizationId } = await request.json();
    
    if (!organizationId) {
      return json({ error: "organizationId is required" }, { status: 400 });
    }

    // Analyze organization
    const analyzer = new OrganizationAnalyzer(organizationId);
    const metrics = await analyzer.analyzeOrganization();

    // Generate AI recommendations
    const recommendationEngine = new AIRecommendationEngine();
    const recommendations = await recommendationEngine.generateRecommendations(metrics);

    // Store analysis in history
    const historyData = createInsightHistoryData(
      organizationId,
      "fullAnalysis",
      metrics,
      { recommendations }
    );

    const historyRef = doc(db, COLLECTIONS.INSIGHTS_HISTORY);
    await setDoc(historyRef, historyData);

    return json({
      metrics,
      recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to analyze organization:", error);
    return json(
      { error: "Failed to analyze organization" },
      { status: 500 }
    );
  }
};