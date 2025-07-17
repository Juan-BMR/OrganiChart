import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AIToolManager } from '$lib/ai-tools/tool-manager';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const toolManager = AIToolManager.getInstance();
    const toolId = url.searchParams.get('toolId');
    
    if (toolId) {
      // Get stats for a specific tool
      const status = await toolManager.getToolStatus(toolId);
      if (!status) {
        return json({
          success: false,
          error: 'Tool not found'
        }, { status: 404 });
      }
      
      return json({
        success: true,
        toolId,
        status
      });
    } else {
      // Get stats for all tools
      const stats = await toolManager.getAllToolsStats();
      
      return json({
        success: true,
        stats
      });
    }
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get statistics'
    }, { status: 500 });
  }
};