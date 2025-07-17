# AI Tools Development Guide

## Overview

The AI Tools framework provides a flexible and extensible way to create AI-powered tools for the OrganiChart application. This guide will help you understand how to create your own AI tools.

## Architecture

The AI Tools system consists of:

1. **Base Tool Class** (`BaseAITool`) - Abstract class that all tools extend
2. **Tool Manager** (`AIToolManager`) - Singleton that manages all tools
3. **API Endpoints** - RESTful endpoints for tool execution
4. **UI Components** - Svelte components for tool interaction

## Creating a New AI Tool

### Step 1: Define Your Tool Class

Create a new file in `src/lib/ai-tools/` for your tool:

```typescript
import { BaseAITool, ToolResult, ToolConfig } from './base-tool';
import { openai } from '../openai';

export interface MyToolInput {
  // Define your input structure
  data: string;
  options: {
    // Tool-specific options
  };
}

export interface MyToolResult {
  // Define your output structure
  processedData: any;
  insights: string[];
}

export class MyAITool extends BaseAITool {
  private usageStats = {
    // Track usage statistics
  };

  constructor() {
    const config: ToolConfig = {
      name: 'My AI Tool',
      description: 'Description of what your tool does',
      version: '1.0.0',
      capabilities: [
        'Capability 1',
        'Capability 2'
      ],
      requiredPermissions: ['permission:needed']
    };
    super(config);
  }

  protected async validateInput(input: any): Promise<boolean> {
    // Implement input validation
    return true;
  }

  async process(input: MyToolInput): Promise<ToolResult<MyToolResult>> {
    try {
      // Implement your AI processing logic
      const result = await this.performAIProcessing(input);
      
      return {
        success: true,
        data: result,
        metadata: {
          processingTime: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUsageStats(): Promise<Record<string, any>> {
    return this.usageStats;
  }
}
```

### Step 2: Register Your Tool

Add your tool to the Tool Manager in `src/lib/ai-tools/tool-manager.ts`:

```typescript
import { MyAITool } from './my-ai-tool';

private registerDefaultTools(): void {
  // ... existing tools
  
  // Register your new tool
  const myTool = new MyAITool();
  this.registerTool('my-tool', myTool);
}
```

### Step 3: Export Your Tool

Add exports to `src/lib/ai-tools/index.ts`:

```typescript
export { MyAITool, MyToolInput, MyToolResult } from './my-ai-tool';
```

## Tool Design Guidelines

### 1. Input Validation
- Always validate inputs thoroughly
- Provide clear error messages
- Handle edge cases gracefully

### 2. AI Integration
- Use appropriate AI models for your use case
- Consider token limits and costs
- Implement proper error handling for AI API failures

### 3. Performance
- Track processing time
- Implement caching where appropriate
- Consider batch processing for multiple items

### 4. Security
- Implement proper permission checks
- Sanitize user inputs
- Don't expose sensitive information in results

### 5. User Experience
- Provide progress indicators for long-running tasks
- Return meaningful results and insights
- Include helpful metadata in responses

## Example Tools

### Organization Analyzer
- Analyzes organizational structures
- Provides insights on efficiency, skills gaps, etc.
- Generates visualization data

### Text Summarizer
- Summarizes long texts
- Supports different summary types
- Extracts key points

## API Usage

### List Available Tools
```bash
GET /api/ai-tools
```

### Execute a Tool
```bash
POST /api/ai-tools
{
  "toolId": "my-tool",
  "input": {
    // Tool-specific input
  },
  "userPermissions": ["permission:list"]
}
```

### Get Tool Statistics
```bash
GET /api/ai-tools/stats?toolId=my-tool
```

## Testing Your Tool

1. **Unit Tests**: Test input validation and core logic
2. **Integration Tests**: Test API endpoints
3. **UI Tests**: Test the demo component
4. **Performance Tests**: Measure processing time and resource usage

## Best Practices

1. **Error Handling**: Always handle errors gracefully
2. **Documentation**: Document your tool's capabilities and usage
3. **Versioning**: Use semantic versioning for your tools
4. **Monitoring**: Track usage and performance metrics
5. **Feedback**: Collect user feedback and iterate

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**
   - Check API key configuration
   - Verify rate limits
   - Handle timeout errors

2. **Permission Errors**
   - Ensure required permissions are documented
   - Test with different permission sets

3. **Performance Issues**
   - Profile your code
   - Consider caching strategies
   - Optimize AI prompts

## Contributing

When contributing new AI tools:

1. Follow the established patterns
2. Include comprehensive tests
3. Update documentation
4. Submit a pull request with clear description

## Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)