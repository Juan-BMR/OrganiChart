import { openai } from "$lib/openai";
import type { 
  OrgHealthMetrics, 
  ManagerLoadMetric, 
  SuccessionRisk, 
  TurnoverRisk 
} from "./analyzer";

export interface AIRecommendation {
  type: "immediate" | "short-term" | "long-term";
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  title: string;
  description: string;
  actionItems: string[];
  estimatedImpact: string;
}

export class AIRecommendationEngine {
  async generateRecommendations(
    metrics: OrgHealthMetrics
  ): Promise<AIRecommendation[]> {
    const context = this.buildContext(metrics);
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert organizational consultant analyzing company health metrics. 
            Generate actionable recommendations based on the provided data. 
            Focus on practical, implementable solutions that address the most critical issues first.
            Format your response as a JSON array of recommendations.`
          },
          {
            role: "user",
            content: `Analyze these organizational metrics and provide recommendations:\n\n${context}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      });

      const response = completion.choices[0].message?.content;
      if (!response) return [];

      const parsed = JSON.parse(response);
      return this.validateRecommendations(parsed.recommendations || []);
    } catch (error) {
      console.error("Failed to generate AI recommendations:", error);
      return this.generateFallbackRecommendations(metrics);
    }
  }

  async generateNaturalLanguageInsights(
    query: string,
    metrics: OrgHealthMetrics
  ): Promise<string> {
    const context = this.buildContext(metrics);
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert organizational analyst. Answer questions about the organization
            based on the provided metrics. Be specific, actionable, and data-driven in your responses.`
          },
          {
            role: "user",
            content: `Organization Metrics:\n${context}\n\nQuestion: ${query}`
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      });

      return completion.choices[0].message?.content || "Unable to generate insights.";
    } catch (error) {
      console.error("Failed to generate natural language insights:", error);
      return "I encountered an error analyzing your organization. Please try again.";
    }
  }

  private buildContext(metrics: OrgHealthMetrics): string {
    const overloadedManagers = metrics.managerLoad.filter(m => m.isOverloaded);
    const highSuccessionRisks = metrics.successionRisks.filter(r => r.riskScore > 0.7);
    const highTurnoverRisks = metrics.turnoverRisks.filter(r => r.riskScore > 0.7);

    return `
Organization Health Score: ${metrics.overallHealth}/100

Manager Load Issues:
- ${overloadedManagers.length} managers are overloaded (>8 direct reports)
- Affected managers: ${overloadedManagers.map(m => `${m.managerName} (${m.directReports} reports)`).join(", ")}

Team Size Analysis:
${metrics.teamSizes.map(t => `- ${t.department}: ${t.size} members (variance: ${(t.variance * 100).toFixed(0)}%)`).join("\n")}

Diversity Metrics:
- Overall diversity score: ${(metrics.diversityMetrics.overall * 100).toFixed(0)}%
- By department: ${Object.entries(metrics.diversityMetrics.byDepartment)
  .map(([dept, score]) => `${dept}: ${(score * 100).toFixed(0)}%`)
  .join(", ")}

Succession Risks:
- ${highSuccessionRisks.length} critical positions at risk
${highSuccessionRisks.map(r => `  - ${r.position}: ${r.gaps.join("; ")}`).join("\n")}

Turnover Risks:
- ${highTurnoverRisks.length} employees at high risk of leaving
${highTurnoverRisks.map(r => `  - ${r.memberName}: ${r.factors.join("; ")}`).join("\n")}
    `.trim();
  }

  private validateRecommendations(recommendations: any[]): AIRecommendation[] {
    return recommendations
      .filter(rec => rec && typeof rec === "object")
      .map(rec => ({
        type: rec.type || "short-term",
        priority: rec.priority || "medium",
        category: rec.category || "General",
        title: rec.title || "Untitled Recommendation",
        description: rec.description || "",
        actionItems: Array.isArray(rec.actionItems) ? rec.actionItems : [],
        estimatedImpact: rec.estimatedImpact || "Medium impact"
      }))
      .slice(0, 10); // Limit to 10 recommendations
  }

  private generateFallbackRecommendations(metrics: OrgHealthMetrics): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Manager overload recommendations
    const overloadedManagers = metrics.managerLoad.filter(m => m.isOverloaded);
    if (overloadedManagers.length > 0) {
      recommendations.push({
        type: "immediate",
        priority: "high",
        category: "Manager Load",
        title: "Address Manager Overload",
        description: `${overloadedManagers.length} managers have more than 8 direct reports, which can lead to burnout and reduced effectiveness.`,
        actionItems: [
          "Review organizational structure for these managers",
          "Consider promoting senior team members to team lead roles",
          "Redistribute direct reports more evenly",
          "Implement delegation strategies"
        ],
        estimatedImpact: "High - Improved manager effectiveness and team morale"
      });
    }

    // Succession risk recommendations
    const criticalSuccessionRisks = metrics.successionRisks.filter(r => r.riskScore > 0.8);
    if (criticalSuccessionRisks.length > 0) {
      recommendations.push({
        type: "short-term",
        priority: "critical",
        category: "Succession Planning",
        title: "Develop Succession Plans for Critical Roles",
        description: `${criticalSuccessionRisks.length} critical positions have no identified successors, creating business continuity risk.`,
        actionItems: [
          "Identify high-potential employees for development",
          "Create mentorship programs for succession candidates",
          "Document critical role responsibilities and knowledge",
          "Consider external talent pipeline for hard-to-fill roles"
        ],
        estimatedImpact: "Critical - Ensures business continuity"
      });
    }

    // Turnover risk recommendations
    const highTurnoverRisks = metrics.turnoverRisks.filter(r => r.riskScore > 0.7);
    if (highTurnoverRisks.length > 0) {
      recommendations.push({
        type: "immediate",
        priority: "high",
        category: "Retention",
        title: "Implement Retention Strategies",
        description: `${highTurnoverRisks.length} employees show high turnover risk indicators.`,
        actionItems: [
          "Conduct stay interviews with at-risk employees",
          "Review compensation and benefits competitiveness",
          "Improve manager-employee relationships",
          "Create clear career development paths"
        ],
        estimatedImpact: "High - Reduced turnover costs and knowledge retention"
      });
    }

    // Diversity recommendations
    if (metrics.diversityMetrics.overall < 0.3) {
      recommendations.push({
        type: "long-term",
        priority: "medium",
        category: "Diversity & Inclusion",
        title: "Enhance Diversity and Inclusion Initiatives",
        description: "Current diversity metrics indicate opportunity for improvement in creating a more inclusive workplace.",
        actionItems: [
          "Review and update recruitment practices",
          "Implement unconscious bias training",
          "Establish diversity targets and tracking",
          "Create employee resource groups"
        ],
        estimatedImpact: "Medium - Improved innovation and employee engagement"
      });
    }

    return recommendations;
  }
}