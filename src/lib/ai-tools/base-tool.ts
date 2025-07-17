/**
 * Base class for AI tools
 * Provides a foundation for creating various AI-powered tools
 */

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ToolConfig {
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  requiredPermissions?: string[];
}

export abstract class BaseAITool {
  protected config: ToolConfig;

  constructor(config: ToolConfig) {
    this.config = config;
  }

  /**
   * Get tool configuration
   */
  getConfig(): ToolConfig {
    return this.config;
  }

  /**
   * Validate input before processing
   */
  protected abstract validateInput(input: any): Promise<boolean>;

  /**
   * Process the input and return results
   */
  abstract process(input: any): Promise<ToolResult>;

  /**
   * Get tool usage statistics
   */
  abstract getUsageStats(): Promise<Record<string, any>>;

  /**
   * Check if the tool is available based on permissions
   */
  async checkAvailability(userPermissions: string[] = []): Promise<boolean> {
    if (!this.config.requiredPermissions || this.config.requiredPermissions.length === 0) {
      return true;
    }

    return this.config.requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  }

  /**
   * Get tool status
   */
  async getStatus(): Promise<{
    available: boolean;
    lastUsed?: Date;
    errorRate?: number;
  }> {
    const stats = await this.getUsageStats();
    return {
      available: true,
      lastUsed: stats.lastUsed,
      errorRate: stats.errorRate || 0
    };
  }
}