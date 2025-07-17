// Base classes and interfaces
export { BaseAITool, ToolResult, ToolConfig } from './base-tool';

// Tool Manager
export { AIToolManager } from './tool-manager';

// Individual Tools
export { OrgAnalyzerTool, OrgAnalysisInput, OrgAnalysisResult } from './org-analyzer';
export { TextSummarizerTool, TextSummarizerInput, TextSummarizerResult } from './text-summarizer';

// Convenience function to get tool manager instance
export function getAIToolManager(): AIToolManager {
  return AIToolManager.getInstance();
}