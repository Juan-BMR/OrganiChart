import { BaseAITool, ToolResult } from './base-tool';
import { OrgAnalyzerTool } from './org-analyzer';
import { TextSummarizerTool } from './text-summarizer';

export class AIToolManager {
  private static instance: AIToolManager;
  private tools: Map<string, BaseAITool> = new Map();
  
  private constructor() {
    // Register default tools
    this.registerDefaultTools();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AIToolManager {
    if (!AIToolManager.instance) {
      AIToolManager.instance = new AIToolManager();
    }
    return AIToolManager.instance;
  }

  /**
   * Register default tools
   */
  private registerDefaultTools(): void {
    // Register Organization Analyzer
    const orgAnalyzer = new OrgAnalyzerTool();
    this.registerTool('org-analyzer', orgAnalyzer);
    
    // Register Text Summarizer
    const textSummarizer = new TextSummarizerTool();
    this.registerTool('text-summarizer', textSummarizer);
  }

  /**
   * Register a new tool
   */
  registerTool(id: string, tool: BaseAITool): void {
    this.tools.set(id, tool);
  }

  /**
   * Get a tool by ID
   */
  getTool(id: string): BaseAITool | undefined {
    return this.tools.get(id);
  }

  /**
   * Get all available tools
   */
  getAvailableTools(): Array<{ id: string; config: ReturnType<BaseAITool['getConfig']> }> {
    return Array.from(this.tools.entries()).map(([id, tool]) => ({
      id,
      config: tool.getConfig()
    }));
  }

  /**
   * Execute a tool
   */
  async executeTool(toolId: string, input: any, userPermissions?: string[]): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    
    if (!tool) {
      return {
        success: false,
        error: `Tool with ID '${toolId}' not found`
      };
    }

    // Check permissions
    const isAvailable = await tool.checkAvailability(userPermissions);
    if (!isAvailable) {
      return {
        success: false,
        error: 'Insufficient permissions to use this tool'
      };
    }

    // Execute the tool
    return await tool.process(input);
  }

  /**
   * Get tool status
   */
  async getToolStatus(toolId: string): Promise<any> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return null;
    }
    
    return await tool.getStatus();
  }

  /**
   * Get usage statistics for all tools
   */
  async getAllToolsStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const [id, tool] of this.tools.entries()) {
      stats[id] = await tool.getUsageStats();
    }
    
    return stats;
  }

  /**
   * Find tools by capability
   */
  findToolsByCapability(capability: string): Array<{ id: string; tool: BaseAITool }> {
    const results: Array<{ id: string; tool: BaseAITool }> = [];
    
    this.tools.forEach((tool, id) => {
      const config = tool.getConfig();
      if (config.capabilities.some(cap => 
        cap.toLowerCase().includes(capability.toLowerCase())
      )) {
        results.push({ id, tool });
      }
    });
    
    return results;
  }

  /**
   * Clear all registered tools (useful for testing)
   */
  clearTools(): void {
    this.tools.clear();
    this.registerDefaultTools();
  }
}