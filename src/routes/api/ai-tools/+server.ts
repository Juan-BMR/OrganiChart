import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AIToolManager } from '$lib/ai-tools/tool-manager';

export const GET: RequestHandler = async () => {
  try {
    const toolManager = AIToolManager.getInstance();
    const availableTools = toolManager.getAvailableTools();
    
    return json({
      success: true,
      tools: availableTools
    });
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tools'
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { toolId, input, userPermissions } = body;
    
    if (!toolId) {
      return json({
        success: false,
        error: 'Tool ID is required'
      }, { status: 400 });
    }
    
    if (!input) {
      return json({
        success: false,
        error: 'Input is required'
      }, { status: 400 });
    }
    
    const toolManager = AIToolManager.getInstance();
    const result = await toolManager.executeTool(toolId, input, userPermissions);
    
    return json(result);
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute tool'
    }, { status: 500 });
  }
};